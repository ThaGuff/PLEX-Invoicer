import { Router } from 'express';
import { db } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET all invoices for account
router.get('/', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const result = await db.execute(
      `SELECT i.*, c.name as contact_name
       FROM invoices i LEFT JOIN contacts c ON i.contact_id = c.id
       WHERE i.account_id = ? ORDER BY i.created_at DESC`, [account_id]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single invoice with items
router.get('/:id', async (req, res) => {
  try {
    const inv = await db.execute(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    if (!inv.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await db.execute(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`, [req.params.id]
    );
    res.json({ ...inv.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET public invoice by token
router.get('/public/:token', async (req, res) => {
  try {
    const inv = await db.execute(
      `SELECT i.*, a.name as agency_name, a.email as agency_email,
              a.phone as agency_phone, a.website as agency_website,
              a.primary_color, a.logo_initial
       FROM invoices i JOIN accounts a ON i.account_id = a.id
       WHERE i.public_token = ?`, [req.params.token]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const items = await db.execute(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`, [inv.rows[0].id]
    );
    if (!inv.rows[0].viewed_at) {
      await db.execute(`UPDATE invoices SET viewed_at = datetime('now') WHERE id = ?`, [inv.rows[0].id]);
    }
    res.json({ ...inv.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH update invoice
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['status', 'amount_paid', 'paid_at', 'due_date', 'sent_at',
      'stripe_payment_link', 'notes', 'client_email'];
    const updates = [`updated_at = datetime('now')`];
    const vals = [];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    // Auto-set paid_at when status → paid
    if (req.body.status === 'paid' && !req.body.paid_at) {
      updates.push(`paid_at = datetime('now')`);
    }
    vals.push(req.params.id);
    await db.execute(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create Stripe payment link for invoice
router.post('/:id/payment-link', async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY env var.' });

  try {
    const inv = await db.execute(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    if (!inv.rows.length) return res.status(404).json({ error: 'Not found' });
    const invoice = inv.rows[0];

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const amountCents = Math.round((invoice.amount_due || 0) * 100);
    if (amountCents < 50) return res.status(400).json({ error: 'Amount too low for Stripe (min $0.50)' });

    const acc = await db.execute(`SELECT * FROM accounts WHERE id = ?`, [invoice.account_id]);
    const agency = acc.rows[0];

    const session = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `Invoice ${invoice.number}`,
            description: `${agency?.name || 'Invoice'} — ${invoice.client_name || ''}`.trim(),
          },
        },
        quantity: 1,
      }],
      after_completion: { type: 'redirect', redirect: { url: `${req.headers.origin || 'https://plexautomation.io'}/invoice/${invoice.public_token}?paid=1` } },
      metadata: { invoice_id: invoice.id },
    });

    await db.execute(`UPDATE invoices SET stripe_payment_link = ?, status = 'sent', sent_at = datetime('now') WHERE id = ?`,
      [session.url, req.params.id]);

    res.json({ payment_link: session.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST mark as sent
router.post('/:id/send', async (req, res) => {
  try {
    await db.execute(`UPDATE invoices SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST mark as paid (manual)
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { amount } = req.body;
    const inv = await db.execute(`SELECT amount_due FROM invoices WHERE id = ?`, [req.params.id]);
    const paid = amount || inv.rows[0]?.amount_due || 0;
    await db.execute(
      `UPDATE invoices SET status = 'paid', amount_paid = ?, paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [paid, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST send payment reminder email
router.post('/:id/remind', async (req, res) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  try {
    const inv = await db.execute(`SELECT i.*, a.name as agency_name, a.email as agency_email, a.website as agency_website
      FROM invoices i JOIN accounts a ON i.account_id = a.id WHERE i.id = ?`, [req.params.id]);
    if (!inv.rows.length) return res.status(404).json({ error: 'Not found' });
    const invoice = inv.rows[0];

    if (!invoice.client_email) return res.status(400).json({ error: 'No client email on invoice' });

    const publicUrl = `${req.headers.origin || process.env.APP_URL || 'https://plexautomation.io'}/invoice/${invoice.public_token}`;

    if (SMTP_HOST && SMTP_USER) {
      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransporter({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT) || 587,
        secure: false,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: invoice.client_email,
        subject: `Payment reminder — Invoice ${invoice.number} from ${invoice.agency_name}`,
        html: `
          <p>Hi ${invoice.client_name || 'there'},</p>
          <p>This is a friendly reminder that Invoice <strong>${invoice.number}</strong>
          for <strong>$${Math.round(invoice.amount_due).toLocaleString()}</strong> is outstanding.</p>
          <p><a href="${publicUrl}" style="background:#13B5EA;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0;">
            View &amp; Pay Invoice
          </a></p>
          ${invoice.stripe_payment_link ? `<p>Or pay directly: <a href="${invoice.stripe_payment_link}">${invoice.stripe_payment_link}</a></p>` : ''}
          <p style="color:#666;font-size:12px;">${invoice.agency_name} · ${invoice.agency_website || invoice.agency_email}</p>
        `,
      });
    }

    // Log reminder
    await db.execute(
      `INSERT INTO reminders (id, invoice_id, type) VALUES (?, ?, 'manual')`,
      [`rem-${uuid()}`, req.params.id]
    );

    res.json({ ok: true, email_sent: !!(SMTP_HOST && SMTP_USER) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET dashboard stats for account
router.get('/stats/dashboard', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const [quotes, invoices, paid, overdue, thisMonth] = await Promise.all([
      db.execute(`SELECT COUNT(*) as cnt FROM quotes WHERE account_id = ?`, [account_id]),
      db.execute(`SELECT COUNT(*) as cnt FROM invoices WHERE account_id = ?`, [account_id]),
      db.execute(`SELECT COALESCE(SUM(amount_paid),0) as total FROM invoices WHERE account_id = ? AND status = 'paid'`, [account_id]),
      db.execute(`SELECT COUNT(*) as cnt FROM invoices WHERE account_id = ? AND status NOT IN ('paid','cancelled') AND due_date < date('now')`, [account_id]),
      db.execute(`SELECT COALESCE(SUM(amount_due),0) as total FROM invoices WHERE account_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`, [account_id]),
    ]);
    const outstanding = await db.execute(
      `SELECT COALESCE(SUM(amount_due - amount_paid),0) as total FROM invoices WHERE account_id = ? AND status NOT IN ('paid','cancelled')`, [account_id]
    );
    const recentInvoices = await db.execute(
      `SELECT * FROM invoices WHERE account_id = ? ORDER BY created_at DESC LIMIT 5`, [account_id]
    );
    const recentQuotes = await db.execute(
      `SELECT * FROM quotes WHERE account_id = ? ORDER BY created_at DESC LIMIT 5`, [account_id]
    );
    res.json({
      total_quotes: quotes.rows[0].cnt,
      total_invoices: invoices.rows[0].cnt,
      total_collected: paid.rows[0].total,
      total_outstanding: outstanding.rows[0].total,
      overdue_count: overdue.rows[0].cnt,
      this_month_invoiced: thisMonth.rows[0].total,
      recent_invoices: recentInvoices.rows,
      recent_quotes: recentQuotes.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    await db.execute(`DELETE FROM invoices WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
