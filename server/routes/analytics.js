/**
 * F10: Predictive cash-flow analytics
 * F3: Behavioral reminder scheduling
 */
import { Router } from 'express';
import { db } from '../db/schema.js';

const router = Router();

// ── F10: Predictive cashflow ─────────────────────────────────────
router.get('/predictive-cashflow', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });

  try {
    // Get all outstanding invoices
    const outstanding = await db.execute(`
      SELECT i.id, i.client_name, i.client_email, i.contact_id,
             i.amount_due, i.amount_paid, i.due_date, i.sent_at, i.created_at
      FROM invoices i
      WHERE i.account_id = ? AND i.status NOT IN ('paid','cancelled','draft')
      ORDER BY i.due_date ASC
    `, [account_id]);

    // Historical avg days-to-pay per client
    const paid = await db.execute(`
      SELECT client_email, client_name,
             AVG(CAST(julianday(paid_at) - julianday(sent_at) AS REAL)) as avg_dtp,
             COUNT(*) as payment_count
      FROM invoices
      WHERE account_id = ? AND status = 'paid' AND paid_at IS NOT NULL AND sent_at IS NOT NULL
      GROUP BY COALESCE(client_email, client_name)
    `, [account_id]);

    // Build DTP lookup
    const dtpMap = {};
    paid.rows.forEach(r => {
      const key = r.client_email || r.client_name;
      if (key) dtpMap[key] = { avg_dtp: Math.round(r.avg_dtp || 30), count: r.payment_count };
    });

    // Overall account avg DTP (fallback)
    const globalDtp = paid.rows.length > 0
      ? Math.round(paid.rows.reduce((s, r) => s + (r.avg_dtp || 30), 0) / paid.rows.length)
      : 30;

    const today = new Date();
    const buckets = { d30: 0, d60: 0, d90: 0, overdue: 0 };
    const predictions = [];

    outstanding.rows.forEach(inv => {
      const clientKey = inv.client_email || inv.client_name;
      const clientData = dtpMap[clientKey];
      const dtp = clientData?.avg_dtp ?? globalDtp;
      const remaining = inv.amount_due - (inv.amount_paid || 0);
      if (remaining <= 0) return;

      const sentAt = inv.sent_at ? new Date(inv.sent_at) : new Date(inv.created_at);
      const predictedPayDate = new Date(sentAt.getTime() + dtp * 24 * 60 * 60 * 1000);
      const daysFromNow = Math.round((predictedPayDate - today) / (24 * 60 * 60 * 1000));

      if (daysFromNow < 0) {
        buckets.overdue += remaining;
      } else if (daysFromNow <= 30) {
        buckets.d30 += remaining;
      } else if (daysFromNow <= 60) {
        buckets.d60 += remaining;
      } else if (daysFromNow <= 90) {
        buckets.d90 += remaining;
      }

      predictions.push({
        invoice_id:        inv.id,
        client:            inv.client_name,
        amount:            remaining,
        predicted_pay_date: predictedPayDate.toISOString().split('T')[0],
        days_from_now:     daysFromNow,
        dtp_used:          dtp,
        dtp_source:        clientData ? `${clientData.count} past payments` : 'account average',
        due_date:          inv.due_date,
      });
    });

    predictions.sort((a, b) => a.days_from_now - b.days_from_now);

    // Weekly buckets for the chart (12 weeks)
    const weekly = [];
    for (let w = 0; w < 12; w++) {
      const weekStart = new Date(today.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const weekEnd   = new Date(today.getTime() + (w + 1) * 7 * 24 * 60 * 60 * 1000);
      const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      const amount = predictions
        .filter(p => {
          const d = new Date(p.predicted_pay_date);
          return d >= weekStart && d < weekEnd;
        })
        .reduce((s, p) => s + p.amount, 0);
      weekly.push({ label, amount: Math.round(amount), week: w + 1 });
    }

    res.json({
      summary: {
        overdue:     Math.round(buckets.overdue),
        next_30:     Math.round(buckets.d30),
        next_60:     Math.round(buckets.d60),
        next_90:     Math.round(buckets.d90),
        total:       Math.round(buckets.overdue + buckets.d30 + buckets.d60 + buckets.d90),
        global_dtp:  globalDtp,
      },
      weekly,
      predictions,
      client_profiles: paid.rows.map(r => ({
        client:    r.client_name || r.client_email,
        avg_dtp:   Math.round(r.avg_dtp || 0),
        payments:  r.payment_count,
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── F3: Schedule smart reminder for an invoice ───────────────────
router.post('/schedule-reminder', async (req, res) => {
  const { invoice_id, account_id } = req.body;
  if (!invoice_id) return res.status(400).json({ error: 'invoice_id required' });

  try {
    const inv = await db.execute(
      `SELECT client_email, client_name, sent_at FROM invoices WHERE id = ? AND account_id = ?`,
      [invoice_id, account_id]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const { client_email, client_name, sent_at } = inv.rows[0];

    // Get client payment history (hour of day distribution)
    const history = await db.execute(`
      SELECT hour_of_day, COUNT(*) as cnt
      FROM payment_behavior
      WHERE account_id = ? AND (client_email = ? OR client_email IS NULL)
      GROUP BY hour_of_day ORDER BY cnt DESC LIMIT 1
    `, [account_id, client_email || '']);

    let scheduledFor, basis;
    if (history.rows.length > 0) {
      const bestHour = history.rows[0].hour_of_day;
      // Schedule for tomorrow at their best hour, minus 1hr (= 1hr before)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(Math.max(0, bestHour - 1), 0, 0, 0);
      scheduledFor = tomorrow.toISOString();
      basis = `client's highest-probability payment hour (${bestHour}:00)`;
    } else {
      // Fallback: schedule for 9am tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      scheduledFor = tomorrow.toISOString();
      basis = 'default (9am — no payment history available)';
    }

    const { v4: uuid } = await import('uuid');
    const id = `sr-${uuid()}`;
    await db.execute(
      `INSERT INTO smart_reminders (id, invoice_id, scheduled_for, status, basis) VALUES (?, ?, ?, 'pending', ?)`,
      [id, invoice_id, scheduledFor, basis]
    );

    res.json({ ok: true, id, scheduled_for: scheduledFor, basis });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── F3: Run pending smart reminders (call from cron or manually) ──
router.post('/run-reminders', async (req, res) => {
  try {
    const pending = await db.execute(`
      SELECT sr.id, sr.invoice_id, i.client_name, i.client_email,
             i.number, i.amount_due, i.public_token, a.name as agency_name
      FROM smart_reminders sr
      JOIN invoices i ON sr.invoice_id = i.id
      JOIN accounts a ON i.account_id = a.id
      WHERE sr.status = 'pending' AND sr.scheduled_for <= datetime('now')
        AND i.status NOT IN ('paid','cancelled')
    `);

    let sent = 0;
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL } = process.env;

    for (const r of pending.rows) {
      try {
        if (SMTP_HOST && SMTP_USER) {
          const nodemailer = (await import('nodemailer')).default;
          const transporter = nodemailer.createTransport({
            host: SMTP_HOST, port: parseInt(SMTP_PORT) || 587, secure: false,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
          });
          const portalUrl = `${APP_URL || 'https://plex-invoicer.up.railway.app'}/portal/invoice/${r.public_token}`;
          await transporter.sendMail({
            from: SMTP_FROM || SMTP_USER,
            to: r.client_email,
            subject: `Friendly reminder: Invoice ${r.number} from ${r.agency_name}`,
            html: `<p>Hi ${r.client_name || 'there'},</p>
                   <p>Just a friendly reminder that invoice <strong>${r.number}</strong> for <strong>$${r.amount_due}</strong> is still outstanding.</p>
                   <p><a href="${portalUrl}" style="background:#13B5EA;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">View &amp; Pay Invoice →</a></p>
                   <p>Thank you,<br>${r.agency_name}</p>`,
          });
        }
        await db.execute(
          `UPDATE smart_reminders SET status = 'sent', sent_at = datetime('now') WHERE id = ?`, [r.id]
        );
        sent++;
      } catch (e) {
        await db.execute(`UPDATE smart_reminders SET status = 'failed' WHERE id = ?`, [r.id]);
      }
    }

    res.json({ ok: true, processed: pending.rows.length, sent });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
