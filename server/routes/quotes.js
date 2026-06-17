import { Router } from 'express';
import { db } from '../db/schema.js';
import { sendEmail, isEmailConfigured, buildQuoteHtml } from '../utils/email.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

function nextNumber(rows, prefix) {
  if (!rows.length) return `${prefix}-0001`;
  const nums = rows.map(r => parseInt((r.number || '0').split('-').pop()) || 0);
  return `${prefix}-${String(Math.max(...nums) + 1).padStart(4, '0')}`;
}

async function safeNextNumber(db, table, account_id, prefix) {
  // Retry up to 3 times to handle concurrent saves
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await db.execute(`SELECT number FROM ${table} WHERE account_id = ?`, [account_id]);
    return nextNumber(rows.rows, prefix);
  }
  // Fallback: timestamp-based number
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

// Helper: verify quote belongs to account
async function getQuoteForAccount(quoteId, accountId) {
  const result = await db.execute(
    `SELECT * FROM quotes WHERE id = ? AND account_id = ?`, [quoteId, accountId]
  );
  return result.rows[0] || null;
}

// ── GET all quotes for account — requires auth + account ownership ─
router.get('/', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    // Verify requesting user actually owns or is a member of this account
    const _isOwner = req.user.email === (process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com');
    if (req.user.id !== 'dev-user' && !_isOwner) {
      const access = await db.execute(
        `SELECT id FROM accounts WHERE id = ? AND (
          owner_id = ?
          OR id IN (SELECT account_id FROM account_members WHERE user_id = ? AND status = 'active')
        )`, [account_id, req.user.id, req.user.id]
      );
      if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });
    }
    const quotes = await db.execute(
      `SELECT q.*, c.name as contact_name
       FROM quotes q LEFT JOIN contacts c ON q.contact_id = c.id
       WHERE q.account_id = ? ORDER BY q.created_at DESC`, [account_id]
    );
    res.json(quotes.rows);
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── GET public quote by token — MUST be before /:id ──────────────
router.get('/public/:token', async (req, res) => {
  try {
    const quote = await db.execute(
      `SELECT q.*, a.name as agency_name, a.email as agency_email,
              a.phone as agency_phone, a.website as agency_website,
              a.primary_color, a.logo_initial, a.logo_url, a.plan as agency_plan
       FROM quotes q JOIN accounts a ON q.account_id = a.id
       WHERE q.public_token = ?`, [req.params.token]
    );
    if (!quote.rows.length) return res.status(404).json({ error: 'Quote not found' });
    const items = await db.execute(
      `SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [quote.rows[0].id]
    );
    if (!quote.rows[0].viewed_at) {
      await db.execute(`UPDATE quotes SET viewed_at = NOW() WHERE id = ?`, [quote.rows[0].id]);
    }
    res.json({ ...quote.rows[0], items: items.rows });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── POST accept quote (public) — MUST be before /:id ─────────────
router.post('/public/:token/accept', async (req, res) => {
  try {
    const quote = await db.execute(`SELECT * FROM quotes WHERE public_token = ?`, [req.params.token]);
    if (!quote.rows.length) return res.status(404).json({ error: 'Not found' });
    if (quote.rows[0].status === 'accepted') return res.json({ already: true });

    const { signature_data, signer_name, selected_package } = req.body;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const now = new Date().toISOString();

    await db.execute(
      `UPDATE quotes SET status = 'accepted', accepted_at = NOW()::text,
       signature_data = ?, signer_name = ?, signer_ip = ?, signed_at = ?, selected_package = ?
       WHERE public_token = ?`,
      [signature_data || null, signer_name || null, clientIp, now, selected_package || null, req.params.token]
    );
    res.json({ ok: true, signed_at: now });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── GET single quote with items — verify user owns the account ────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Fetch quote, then verify requesting user owns or is member of the account
    const quote = await db.execute(`SELECT * FROM quotes WHERE id = ?`, [req.params.id]);
    if (!quote.rows.length) return res.status(404).json({ error: 'Not found' });

    const q = quote.rows[0];
    // Verify access: user must own or be a member of the account
    // dev-user has full access in development
    const _isOwner = req.user.email === (process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com');
    if (req.user.id !== 'dev-user' && !_isOwner) {
      const access = await db.execute(
        `SELECT a.id FROM accounts a
         WHERE a.id = ? AND (
           a.owner_id = ?
           OR EXISTS (SELECT 1 FROM account_members m WHERE m.account_id = a.id AND m.user_id = ?)
         )`, [q.account_id, req.user.id, req.user.id]
      );
      if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });
    }

    const items = await db.execute(
      `SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [req.params.id]
    );
    res.json({ ...q, items: items.rows });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── POST create quote ─────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      account_id, contact_id, client_name, client_biz, client_email, client_phone,
      billing_mode, yearly_discount, disc_type, disc_value, disc_setup, disc_monthly,
      notes, valid_days, due_date, setup_total, monthly_total, tax_rate = 0, tax_amount = 0, items = []
    } = req.body;
    if (!account_id) return res.status(400).json({ error: 'account_id required' });

    const existingQuotes = await db.execute(`SELECT number FROM quotes WHERE account_id = ?`, [account_id]);
    const acc = await db.execute(`SELECT name FROM accounts WHERE id = ?`, [account_id]);
    const prefix = (acc.rows[0]?.name || 'Q').substring(0, 1).toUpperCase() + 'Q';
    const number = nextNumber(existingQuotes.rows, prefix);
    const id = `q-${uuid()}`;
    const public_token = uuid().replace(/-/g, '');

    await db.execute(
      `INSERT INTO quotes (id, account_id, number, contact_id, client_name, client_biz,
        client_email, client_phone, billing_mode, yearly_discount, disc_type, disc_value,
        disc_setup, disc_monthly, notes, valid_days, due_date, setup_total, monthly_total, tax_rate, tax_amount, public_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, number, contact_id || null, client_name || '', client_biz || '',
       client_email || '', client_phone || '', billing_mode || 'monthly',
       yearly_discount || 15, disc_type || 'pct', disc_value || 0,
       disc_setup ? 1 : 0, disc_monthly ? 1 : 0,
       notes || '', valid_days || 30, due_date || null, setup_total || 0, monthly_total || 0,
       tax_rate || 0, tax_amount || 0, public_token]
    );

    await Promise.all(items.map((item, i) => db.execute(
      `INSERT INTO quote_items (id, quote_id, section_id, section_label, service_id, name,
        description, setup_price, monthly_price, quantity, is_included, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`qi-${uuid()}`, id, item.section_id || '', item.section_label || '',
       item.service_id || '', item.name || '', item.description || '',
       item.setup_price || 0, item.monthly_price || 0, item.quantity || 1, item.is_included ? 1 : 0, i]
    )));

    // Auto-create or link contact if email provided
    let finalContactId = contact_id || null;
    if (!finalContactId && (client_email || client_name) && account_id) {
      try {
        if (client_email) {
          const existing = await db.execute(
            `SELECT id FROM contacts WHERE account_id = ? AND email = ? LIMIT 1`,
            [account_id, client_email]
          );
          if (existing.rows.length > 0) finalContactId = existing.rows[0].id;
        }
        if (!finalContactId && (client_name || client_email)) {
          const { v4: uuid2 } = await import('uuid');
          const conId = `con-${uuid2()}`;
          await db.execute(
            `INSERT INTO contacts (id, account_id, name, business, email, phone) VALUES (?, ?, ?, ?, ?, ?)`,
            [conId, account_id, client_name || '', client_biz || '', client_email || '', client_phone || '']
          );
          finalContactId = conId;
        }
        if (finalContactId) {
          await db.execute(`UPDATE quotes SET contact_id = ? WHERE id = ?`, [finalContactId, id]);
        }
      } catch (e) { console.warn('Auto-create contact failed:', e.message); }
    }

    const [created, createdItems] = await Promise.all([
      db.execute(`SELECT * FROM quotes WHERE id = ?`, [id]),
      db.execute(`SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [id]),
    ]);
    res.json({ ...created.rows[0], items: createdItems.rows });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── PATCH update quote — verify via auth ─────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    // Fetch quote and verify the requesting user actually owns the account
    const quote = await db.execute(`SELECT * FROM quotes WHERE id = ?`, [req.params.id]);
    if (!quote.rows.length) return res.status(404).json({ error: 'Not found' });
    const q = quote.rows[0];
    const { account_id } = req.body;

    // Ensure body account_id matches the actual record (prevent spoofing)
    if (account_id && account_id !== q.account_id) {
      return res.status(403).json({ error: 'account_id mismatch' });
    }

    // Verify user owns the account
    const _isOwner = req.user.email === (process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com');
    if (req.user.id !== 'dev-user' && !_isOwner) {
      const access = await db.execute(
        `SELECT id FROM accounts WHERE id = ? AND (owner_id = ? OR id IN (SELECT account_id FROM account_members WHERE user_id = ?))`,
        [q.account_id, req.user.id, req.user.id]
      );
      if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });
    }

    const allowed = ['status','client_name','client_biz','client_email','client_phone',
      'billing_mode','yearly_discount','disc_type','disc_value','disc_setup','disc_monthly',
      'notes','valid_days','setup_total','monthly_total','tax_rate','tax_amount',
      'due_date','sent_at','accepted_at'];
    const updates = [`updated_at = NOW()`];
    const vals = [];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        // Convert boolean disc_setup/disc_monthly to integers for SQLite
        if (f === 'disc_setup' || f === 'disc_monthly') {
          vals.push(req.body[f] ? 1 : 0);
        } else {
          vals.push(req.body[f]);
        }
      }
    });
    vals.push(q.id, q.account_id);
    await db.execute(`UPDATE quotes SET ${updates.join(', ')} WHERE id = ? AND account_id = ?`, vals);

    // Re-save items if provided (delete old, insert new)
    if (Array.isArray(req.body.items) && req.body.items.length >= 0) {
      await db.execute(`DELETE FROM quote_items WHERE quote_id = ?`, [q.id]);
      if (req.body.items.length > 0) {
        await Promise.all(req.body.items.map((item, i) => db.execute(
          `INSERT INTO quote_items (id, quote_id, section_id, section_label, service_id, name,
            description, setup_price, monthly_price, quantity, is_included, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`qi-${uuid()}`, q.id,
           item.section_id || '', item.section_label || '',
           item.service_id || '', item.name || '', item.description || '',
           item.setup_price || 0, item.monthly_price || 0, item.quantity || 1, item.is_included ? 1 : 0, i]
        )));
      }
    }

    const [updated, updatedItems] = await Promise.all([
      db.execute(`SELECT * FROM quotes WHERE id = ?`, [req.params.id]),
      db.execute(`SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [req.params.id]),
    ]);
    res.json({ ...updated.rows[0], items: updatedItems.rows });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── POST /api/quotes/:id/send — email quote to client ─────────────
router.post('/:id/send', requireAuth, async (req, res) => {
  try {
    const { account_id } = req.body;
    const q = await db.execute(
      `SELECT q.*, a.name as agency_name, a.email as agency_email, a.phone as agency_phone,
              a.business_address as agency_address, a.logo_url as agency_logo_url,
              a.primary_color as agency_color, a.plan as agency_plan
       FROM quotes q JOIN accounts a ON q.account_id = a.id
       WHERE q.id = ?`,
      [req.params.id]
    );
    if (!q.rows.length) return res.status(404).json({ error: 'Not found' });
    const quote = q.rows[0];
    if (!quote.client_email) return res.status(400).json({ error: 'No client email on this quote' });
    if (!isEmailConfigured()) return res.status(503).json({ error: 'Email not configured' });

    const origin = process.env.APP_URL || 'https://invoiceking.app';
    const portalUrl = `${origin}/portal/quote/${quote.public_token}`;
    // Grand total must include tax, matching the totals shown on the PDF and portal —
    // previously this used quote.amount_due || quote.setup_total with no tax added,
    // and was also passed under the wrong key ("amount" instead of "totalAmount"),
    // so buildQuoteHtml never received a usable value and every email showed $0.00.
    const grandTotal = (quote.setup_total || 0) + (quote.tax_amount || 0);
    const whiteLabelPlan = quote.agency_plan === 'agency';

    await sendEmail({
      to: quote.client_email,
      type: 'invoice',
      subject: `Quote ${quote.number} from ${quote.agency_name || 'Invoice King'}`,
      html: buildQuoteHtml({
        clientName: quote.client_name,
        agencyName: quote.agency_name || 'Invoice King',
        quoteNum: quote.number,
        totalAmount: grandTotal,
        expiryDate: quote.expiry_date,
        portalUrl,
        logoUrl: quote.agency_logo_url || null,
        accentColor: quote.agency_color || '#C6E404',
        agencyPhone: quote.agency_phone || '',
        agencyEmail: quote.agency_email || '',
        agencyAddress: quote.agency_address || '',
        notes: quote.notes || '',
        whiteLabelPlan,
      }),
      text: `Hi ${quote.client_name || 'there'},\n\nYour quote ${quote.number} is ready to review. Total: $${grandTotal.toLocaleString()}\n\nView and sign: ${portalUrl}\n\n${quote.agency_name || 'Invoice King'}`,
    });

    // Previously account_id was never destructured from req.body, so this
    // UPDATE statement referenced an undefined variable and threw a
    // ReferenceError on every single call — meaning the email above always
    // sent successfully, but the quote's status was silently never updated
    // to 'sent' because the whole route fell into the catch block right after.
    if (account_id) {
      await db.execute(
        `UPDATE quotes SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = ? AND account_id = ?`,
        [req.params.id, account_id]
      );
    } else {
      await db.execute(
        `UPDATE quotes SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [req.params.id]
      );
    }
    res.json({ ok: true, email_sent: true, to: quote.client_email });
  } catch (e) {
    console.error('[Quote send]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST convert quote to invoice — verify via auth ───────────────
router.post('/:id/convert', requireAuth, async (req, res) => {
  try {
    const quote = await db.execute(`SELECT * FROM quotes WHERE id = ?`, [req.params.id]);
    if (!quote.rows.length) return res.status(404).json({ error: 'Quote not found' });
    const q = quote.rows[0];
    // Verify ownership (dev-user bypasses)
    const _isOwner = req.user.email === (process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com');
    if (req.user.id !== 'dev-user' && !_isOwner) {
      const access = await db.execute(
        `SELECT id FROM accounts WHERE id = ? AND (owner_id = ? OR id IN (SELECT account_id FROM account_members WHERE user_id = ?))`,
        [q.account_id, req.user.id, req.user.id]
      );
      if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });
    }
    const account_id = q.account_id;

    // If invoice already exists for this quote, UPDATE it with latest quote data
    const alreadyConverted = await db.execute(
      `SELECT * FROM invoices WHERE quote_id = ? AND account_id = ? ORDER BY created_at DESC LIMIT 1`,
      [q.id, account_id]
    );
    if (alreadyConverted.rows.length) {
      const existing = alreadyConverted.rows[0];
      // Only update if invoice isn't already paid
      if (existing.status !== 'paid' && existing.status !== 'partial') {
        const due_date_up = q.due_date || existing.due_date;
        const amount_due_up = (q.setup_total || 0) + (q.tax_amount || 0);
        await db.execute(
          `UPDATE invoices SET
            client_name = ?, client_biz = ?, client_email = ?, client_phone = ?,
            billing_mode = ?, setup_total = ?, monthly_total = ?, amount_due = ?,
            due_date = ?, notes = ?, tax_rate = ?, tax_amount = ?,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [q.client_name, q.client_biz, q.client_email, q.client_phone,
           q.billing_mode, q.setup_total, q.monthly_total, amount_due_up,
           due_date_up, q.notes, q.tax_rate || 0, q.tax_amount || 0, existing.id]
        );
        // Rebuild line items from updated quote
        const updatedItems = await db.execute(
          `SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [q.id]
        );
        await db.execute(`DELETE FROM invoice_items WHERE invoice_id = ?`, [existing.id]);
        await Promise.all(updatedItems.rows.map((item, i) => db.execute(
          `INSERT INTO invoice_items (id, invoice_id, section_label, name, description,
            setup_price, monthly_price, quantity, is_included, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`ii-${uuid()}`, existing.id, item.section_label, item.name, item.description,
           item.setup_price, item.monthly_price, item.quantity || 1, item.is_included, i]
        )));
      }
      const refreshed = await db.execute(`SELECT * FROM invoices WHERE id = ?`, [existing.id]);
      const refreshedItems = await db.execute(
        `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`, [existing.id]
      );
      return res.json({ ...refreshed.rows[0], items: refreshedItems.rows });
    }

    const items = await db.execute(
      `SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [q.id]
    );

    const existingInv = await db.execute(`SELECT number FROM invoices WHERE account_id = ?`, [q.account_id]);
    const acc = await db.execute(`SELECT name FROM accounts WHERE id = ?`, [q.account_id]);
    const prefix = (acc.rows[0]?.name || 'I').substring(0, 1).toUpperCase() + 'INV';
    const number = nextNumber(existingInv.rows, prefix);
    const invId = `inv-${uuid()}`;
    const public_token = uuid().replace(/-/g, '');
    // Use quote's due_date if set, otherwise default to 30 days
    const due_date = q.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const amount_due = (q.setup_total || 0) + (q.tax_amount || 0);

    await db.execute(
      `INSERT INTO invoices (id, account_id, quote_id, number, contact_id, client_name, client_biz,
        client_email, client_phone, billing_mode, setup_total, monthly_total, amount_due, due_date,
        notes, public_token, tax_rate, tax_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invId, q.account_id, q.id, number, q.contact_id, q.client_name, q.client_biz,
       q.client_email, q.client_phone, q.billing_mode, q.setup_total, q.monthly_total,
       amount_due, due_date, q.notes, public_token, q.tax_rate || 0, q.tax_amount || 0, 'generated']
    );

    await Promise.all(items.rows.map((item, i) => db.execute(
      `INSERT INTO invoice_items (id, invoice_id, section_label, name, description,
        setup_price, monthly_price, quantity, is_included, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`ii-${uuid()}`, invId, item.section_label, item.name, item.description,
       item.setup_price, item.monthly_price, item.quantity || 1, item.is_included, i]
    )));

    await db.execute(
      `UPDATE quotes SET status = 'invoiced', invoiced_at = CURRENT_TIMESTAMP WHERE id = ? AND account_id = ?`,
      [q.id, account_id]
    );

    const inv = await db.execute(`SELECT * FROM invoices WHERE id = ?`, [invId]);
    const invItems = await db.execute(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`, [invId]
    );
    res.json({ ...inv.rows[0], items: invItems.rows });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── DELETE quote — auth-based ownership check ────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const quote = await db.execute(`SELECT * FROM quotes WHERE id = ?`, [req.params.id]);
    if (!quote.rows.length) return res.status(404).json({ error: 'Not found' });
    const q = quote.rows[0];
    if (q.account_id === 'plex-master' && req.user.email !== process.env.PLEX_OWNER_EMAIL) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const _isOwner = req.user.email === (process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com');
    if (req.user.id !== 'dev-user' && !_isOwner) {
      const access = await db.execute(
        `SELECT id FROM accounts WHERE id = ? AND (owner_id = ? OR id IN (SELECT account_id FROM account_members WHERE user_id = ?))`,
        [q.account_id, req.user.id, req.user.id]
      );
      if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });
    }
    await db.execute(`DELETE FROM quote_items WHERE quote_id = ?`, [req.params.id]);
    await db.execute(`DELETE FROM quotes WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── POST /api/quotes/:id/send-email — send HTML quote via Resend ─
router.post('/:id/send-email', requireAuth, async (req, res) => {
  try {
    const { account_id, recipient_email, recipient_name, custom_message } = req.body;
    if (!account_id || !recipient_email) return res.status(400).json({ error: 'account_id and recipient_email required' });

    const [quote, account, items] = await Promise.all([
      db.execute(`SELECT * FROM quotes WHERE id = ? AND account_id = ?`, [req.params.id, account_id]),
      db.execute(`SELECT * FROM accounts WHERE id = ?`, [account_id]),
      db.execute(`SELECT * FROM quote_items WHERE quote_id = ? AND is_included = 0 ORDER BY sort_order LIMIT 10`, [req.params.id]),
    ]);
    if (!quote.rows.length) return res.status(404).json({ error: 'Quote not found' });
    const q = quote.rows[0];
    const a = account.rows[0];
    const lineItems = items.rows;

    const { buildQuoteHtml } = await import('../utils/email.js');
    const { sendEmail } = await import('../utils/email.js');

    const portalUrl = `${process.env.APP_URL || 'https://invoiceking.app'}/portal/quote/${q.public_token}`;
    const logoUrl = a.logo_url ? `${process.env.APP_URL || 'https://invoiceking.app'}${a.logo_url}` : null;

    const html = buildQuoteHtml({
      clientName: recipient_name || q.client_name || 'there',
      agencyName: a.name,
      quoteNum: q.number,
      totalAmount: (q.setup_total || 0) + (q.tax_amount || 0),  // grand total incl. tax
      portalUrl,
      logoUrl,
      accentColor: a.primary_color || '#C6E404',
      agencyPhone: a.phone || '',
      agencyEmail: a.email || '',
      agencyAddress: a.business_address || '',
      lineItems,
      notes: custom_message || q.notes || '',
      whiteLabelPlan: a.plan === 'agency',
    });

    const fromName = a.email_from_name || a.name || 'Invoice King';
    const from = `${fromName} <invoices@invoiceking.app>`;

    const result = await sendEmail({
      to: recipient_email,
      from,
      subject: `Your Quote ${q.number} from ${a.name || 'us'} — ${portalUrl ? 'Ready to Review' : ''}`,
      html,
    });

    // Update quote status to 'sent'
    if (q.status === 'draft') {
      await db.execute(`UPDATE quotes SET status = 'sent', sent_at = NOW() WHERE id = ?`, [q.id]);
    }

    res.json({ ok: true, messageId: result?.id });
  } catch (e) {
    console.error('send-email error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
