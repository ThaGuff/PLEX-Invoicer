import { Router } from 'express';
import { sendEmail, isEmailConfigured, buildInvoiceHtml } from '../utils/email.js';
import { db } from '../db/schema.js';
import { requirePlanFeature } from '../middleware/planGuard.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// ── GET all invoices for account ──────────────────────────────────
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

// ── Dashboard stats — MUST be before /:id ────────────────────────
router.get('/stats/dashboard', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const [quotesR, invoicesR, paidR, overdueR, thisMonthR, outstandingR, recentInv, recentQ] =
      await Promise.all([
        db.execute(`SELECT COUNT(*) as cnt FROM quotes WHERE account_id = ?`, [account_id]),
        db.execute(`SELECT COUNT(*) as cnt FROM invoices WHERE account_id = ?`, [account_id]),
        db.execute(`SELECT COALESCE(SUM(amount_paid),0) as total FROM invoices WHERE account_id = ? AND status = 'paid'`, [account_id]),
        db.execute(`SELECT COUNT(*) as cnt FROM invoices WHERE account_id = ? AND status NOT IN ('paid','cancelled') AND due_date IS NOT NULL AND due_date < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')`, [account_id]),
        db.execute(`SELECT COALESCE(SUM(amount_due),0) as total FROM invoices WHERE account_id = ? AND TO_CHAR(created_at::timestamp, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')`, [account_id]),
        db.execute(`SELECT COALESCE(SUM(amount_due - amount_paid),0) as total FROM invoices WHERE account_id = ? AND status NOT IN ('paid','cancelled')`, [account_id]),
        db.execute(`SELECT * FROM invoices WHERE account_id = ? ORDER BY created_at DESC LIMIT 5`, [account_id]),
        db.execute(`SELECT * FROM quotes WHERE account_id = ? ORDER BY created_at DESC LIMIT 5`, [account_id]),
      ]);
    res.json({
      total_quotes:       quotesR.rows[0].cnt,
      total_invoices:     invoicesR.rows[0].cnt,
      total_collected:    paidR.rows[0].total,
      total_outstanding:  outstandingR.rows[0].total,
      overdue_count:      overdueR.rows[0].cnt,
      this_month_invoiced: thisMonthR.rows[0].total,
      recent_invoices:    recentInv.rows,
      recent_quotes:      recentQ.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET public invoice by token — MUST be before /:id ────────────
router.get('/public/:token', async (req, res) => {
  try {
    const inv = await db.execute(
      `SELECT i.*, a.name as agency_name, a.email as agency_email,
              a.phone as agency_phone, a.website as agency_website,
              a.primary_color, a.logo_initial, a.logo_url
       FROM invoices i JOIN accounts a ON i.account_id = a.id
       WHERE i.public_token = ?`, [req.params.token]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const items = await db.execute(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`, [inv.rows[0].id]
    );
    if (!inv.rows[0].viewed_at) {
      await db.execute(`UPDATE invoices SET viewed_at = NOW() WHERE id = ?`, [inv.rows[0].id]);
    }
    res.json({ ...inv.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET single invoice with items ─────────────────────────────────
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

// ── PATCH update invoice ──────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['status','amount_paid','paid_at','due_date','sent_at',
      'stripe_payment_link','notes','client_email'];
    const updates = [`updated_at = NOW()`];
    const vals = [];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    if (req.body.status === 'paid' && !req.body.paid_at) updates.push(`paid_at = NOW()`);
    vals.push(req.params.id);
    await db.execute(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST generate Stripe payment link (Connect-aware) ────────────
router.post('/:id/payment-link', async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(503).json({ error: 'Stripe not configured.' });
  try {
    // Join invoice with account to get Stripe Connect fields
    const inv = await db.execute(
      `SELECT i.*, a.name as agency_name, a.stripe_account_id,
              a.stripe_charges_enabled, a.platform_fee_pct
       FROM invoices i JOIN accounts a ON i.account_id = a.id WHERE i.id = ?`,
      [req.params.id]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Not found' });
    const invoice = inv.rows[0];

    const amountCents = Math.round((invoice.amount_due || 0) * 100);
    if (amountCents < 50) return res.status(400).json({ error: 'Amount too low (min $0.50)' });

    const origin = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    // Use connected account if available and enabled
    const connectedId = (invoice.stripe_account_id && invoice.stripe_charges_enabled)
      ? invoice.stripe_account_id : null;
    const stripeOpts = connectedId ? { stripeAccount: connectedId } : {};

    // Platform fee (only applies when routing through a connected account)
    const feePct = (invoice.platform_fee_pct || 0) / 100;
    const applicationFeeAmount = (connectedId && feePct > 0)
      ? Math.round(amountCents * feePct) : undefined;

    const linkParams = {
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `Invoice ${invoice.number}`,
            description: `${invoice.agency_name || ''} · ${invoice.client_name || ''}`.trim(),
          },
        },
        quantity: 1,
      }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${origin}/portal/invoice/${invoice.public_token}?paid=1` },
      },
      metadata: { invoice_id: invoice.id, account_id: invoice.account_id },
      ...(applicationFeeAmount ? { application_fee_amount: applicationFeeAmount } : {}),
    };

    const link = await stripe.paymentLinks.create(linkParams, stripeOpts);

    await db.execute(
      `UPDATE invoices SET stripe_payment_link = ?,
       status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
       sent_at = COALESCE(sent_at, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) WHERE id = ?`,
      [link.url, req.params.id]
    );

    res.json({
      payment_link:    link.url,
      connected:       !!connectedId,
      stripe_account:  connectedId || null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST mark as sent ─────────────────────────────────────────────
router.post('/:id/send', async (req, res) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  try {
    const inv = await db.execute(
      `SELECT i.*, a.name as agency_name, a.email as agency_email,
              a.website as agency_website, a.phone as agency_phone
       FROM invoices i JOIN accounts a ON i.account_id = a.id WHERE i.id = ?`,
      [req.params.id]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Not found' });
    const invoice = inv.rows[0];

    // Mark as sent first
    await db.execute(
      `UPDATE invoices SET status = 'sent', sent_at = NOW(), updated_at = NOW(),
       delivered_at = NOW() WHERE id = ?`,
      [req.params.id]
    );

    // Send email to client if email is set
    let email_sent = false;
    let email_error = null;

    if (invoice.client_email && SMTP_HOST && SMTP_USER) {
      try {
        const port = parseInt(SMTP_PORT) || 587;
        const secure = port === 465;
        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST, port, secure,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
        const origin = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';
        const portalUrl = `${origin}/portal/invoice/${invoice.public_token}`;
        const trackingPixel = `${origin}/api/track/${invoice.public_token}/open.gif`;

        await transporter.sendMail({
          from: SMTP_FROM || SMTP_USER,
          to: invoice.client_email,
          subject: `Invoice ${invoice.number} from ${invoice.agency_name}`,
          html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;margin:0;padding:0;background:#f5f7f8">
            <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
              <div style="background:#1a1a1a;padding:24px 36px">
                <p style="color:#fff;font-size:16px;font-weight:700;margin:0">${invoice.agency_name}</p>
              </div>
              <div style="padding:32px 36px">
                <h2 style="font-size:22px;font-weight:700;margin:0 0 8px">Invoice ${invoice.number}</h2>
                <p style="color:#6b7280;margin:0 0 20px">Hi ${invoice.client_name || 'there'},</p>
                <p style="color:#374151;margin:0 0 8px">
                  You have a new invoice for <strong>$${Math.round(invoice.amount_due || 0).toLocaleString()}</strong>
                  ${invoice.due_date ? ` due <strong>${new Date(invoice.due_date).toLocaleDateString()}</strong>` : ''}.
                </p>
                <p style="color:#374151;margin:0 0 24px">Click the button below to view your invoice and pay securely online.</p>
                <a href="${portalUrl}" style="display:inline-block;background:#13B5EA;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;margin-bottom:24px">
                  View &amp; Pay Invoice →
                </a>
                ${invoice.stripe_payment_link ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280">Pay directly: <a href="${invoice.stripe_payment_link}" style="color:#13B5EA">${invoice.stripe_payment_link}</a></p>` : ''}
              </div>
              <div style="padding:16px 36px;background:#f9fafb;border-top:1px solid #f0f0f0">
                <p style="font-size:12px;color:#9ca3af;margin:0">${invoice.agency_name}${invoice.agency_email ? ' · ' + invoice.agency_email : ''}${invoice.agency_website ? ' · ' + invoice.agency_website : ''}</p>
              </div>
            </div>
            <img src="${trackingPixel}" width="1" height="1" style="display:none" alt="" />
          </body></html>`,
        });
        email_sent = true;
      } catch (smtpErr) {
        email_error = smtpErr.message;
        console.error('Send invoice email failed:', smtpErr.message);
      }
    }

    res.json({
      ok: true,
      email_sent,
      email_error: email_error || null,
      smtp_configured: !!(SMTP_HOST && SMTP_USER),
      has_client_email: !!invoice.client_email,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST mark as paid ─────────────────────────────────────────────
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const inv = await db.execute(
      `SELECT i.*, a.id as acc_id, a.default_tax_rate FROM invoices i JOIN accounts a ON i.account_id = a.id WHERE i.id = ?`,
      [req.params.id]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Not found' });
    const invoice = inv.rows[0];
    const paid = req.body.amount || invoice.amount_due || 0;
    const paymentMethod  = req.body.payment_method  || 'stripe';
    const paymentRef     = req.body.payment_reference || null;
    const taxRate        = req.body.tax_rate   ?? invoice.tax_rate   ?? invoice.default_tax_rate ?? 0;
    const taxAmount      = req.body.tax_amount ?? (paid * taxRate / 100);
    const processingFee  = req.body.processing_fee ?? 0;
    const netAmount      = paid - taxAmount - processingFee;
    const now = new Date();
    await db.execute(
      `UPDATE invoices SET status = 'paid', amount_paid = ?, paid_at = NOW(), updated_at = NOW(),
       payment_method = ?, payment_reference = ?, tax_rate = ?, tax_amount = ?,
       processing_fee = ?, net_amount = ? WHERE id = ?`,
      [paid, paymentMethod, paymentRef, taxRate, taxAmount, processingFee, netAmount, req.params.id]
    );
    // Record payment behavior for smart reminder scheduling (F3)
    if (invoice.sent_at) {
      const sentDate = new Date(invoice.sent_at);
      const dtp = Math.max(0, Math.round((now - sentDate) / 86400000));
      await db.execute(
        `INSERT INTO payment_behavior (account_id, contact_id, client_email, paid_at, day_of_week, hour_of_day, days_to_pay, invoice_id)
         VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
        [invoice.account_id, invoice.contact_id || null, invoice.client_email || null,
         now.getDay(), now.getHours(), dtp, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST send payment reminder ────────────────────────────────────
router.post('/:id/remind', async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email not configured. Set RESEND_API_KEY or SMTP_HOST in Railway Variables.' });
    }

    const invResult = await db.execute('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invResult.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = invResult.rows[0];

    if (!invoice.client_email) return res.status(400).json({ error: 'Invoice has no client email' });

    const accResult = await db.execute('SELECT name FROM accounts WHERE id = ?', [invoice.account_id]);
    const agencyName = accResult.rows[0]?.name || 'Revanew';
    const origin = process.env.APP_URL || 'https://revanew.io';
    const portalUrl = `${origin}/portal/invoice/${invoice.public_token}`;

    await sendEmail({
      to: invoice.client_email,
      subject: `Reminder: Invoice ${invoice.number} from ${agencyName}`,
      html: buildInvoiceHtml({
        clientName: invoice.client_name,
        agencyName,
        invoiceNum: invoice.number,
        amount: `$${Math.round(invoice.amount_due||0).toLocaleString()}`,
        dueDate: invoice.due_date,
        portalUrl,
      }),
      text: `Hi ${invoice.client_name},\n\nThis is a reminder about invoice ${invoice.number} for $${Math.round(invoice.amount_due||0).toLocaleString()}.\n\nView and pay: ${portalUrl}\n\n${agencyName}`,
    });

    await db.execute('UPDATE invoices SET reminded_at = NOW() WHERE id = ?', [invoice.id]);
    try {
      await db.execute(
        `INSERT INTO reminders (id, invoice_id, type) VALUES (?, ?, 'manual')`,
        [`rem-${uuid()}`, req.params.id]
      );
    } catch {} // reminders table may not exist yet

    res.json({ ok: true, email_sent: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE invoice ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.execute(`DELETE FROM invoices WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/invoices/public/:token/accept — E-sign invoice ──────
router.post('/public/:token/accept', async (req, res) => {
  try {
    const { signature_data, signer_name, typed_signature, signed_at } = req.body;
    if (!signer_name) return res.status(400).json({ error: 'signer_name required' });

    const result = await db.execute(
      `SELECT id, status FROM invoices WHERE public_token = ?`, [req.params.token]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const inv = result.rows[0];
    if (inv.status === 'paid') return res.json({ already: true });

    const signerIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';

    await db.execute(
      `UPDATE invoices SET
         status          = 'accepted',
         accepted_at     = ?,
         signature_data  = ?,
         signer_name     = ?,
         typed_signature = ?,
         signer_ip       = ?
       WHERE id = ?`,
      [signed_at || new Date().toISOString(), signature_data || null, signer_name, typed_signature || null, signerIp, inv.id]
    );

    res.json({ ok: true, signed_at, signer_name });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/invoices/deduplicate — remove duplicate quote invoices ──
// Called once to clean up existing duplicates
router.post('/deduplicate', async (req, res) => {
  try {
    const { account_id } = req.body;
    if (!account_id) return res.status(400).json({ error: 'account_id required' });

    // Find all quotes that have more than 1 invoice
    const dupes = await db.execute(
      `SELECT quote_id, COUNT(*) as cnt, MIN(created_at) as first_created
       FROM invoices
       WHERE account_id = ? AND quote_id IS NOT NULL
       GROUP BY quote_id
       HAVING COUNT(*) > 1`,
      [account_id]
    );

    let deleted = 0;
    for (const row of dupes.rows) {
      // Keep the earliest invoice, delete the rest
      const all = await db.execute(
        `SELECT id FROM invoices WHERE quote_id = ? ORDER BY created_at ASC`,
        [row.quote_id]
      );
      const toDelete = all.rows.slice(1).map(r => r.id);
      for (const id of toDelete) {
        await db.execute(`DELETE FROM invoice_items WHERE invoice_id = ?`, [id]);
        await db.execute(`DELETE FROM invoices WHERE id = ?`, [id]);
        deleted++;
      }
    }

    res.json({ ok: true, deleted, dupes_found: dupes.rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

export default router;
