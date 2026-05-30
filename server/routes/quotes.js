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

// Helper: verify quote belongs to account
async function getQuoteForAccount(quoteId, accountId) {
  const result = await db.execute(
    `SELECT * FROM quotes WHERE id = ? AND account_id = ?`, [quoteId, accountId]
  );
  return result.rows[0] || null;
}

// ── GET all quotes for account ────────────────────────────────────
router.get('/', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const quotes = await db.execute(
      `SELECT q.*, c.name as contact_name
       FROM quotes q LEFT JOIN contacts c ON q.contact_id = c.id
       WHERE q.account_id = ? ORDER BY q.created_at DESC`, [account_id]
    );
    res.json(quotes.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET public quote by token — MUST be before /:id ──────────────
router.get('/public/:token', async (req, res) => {
  try {
    const quote = await db.execute(
      `SELECT q.*, a.name as agency_name, a.email as agency_email,
              a.phone as agency_phone, a.website as agency_website,
              a.primary_color, a.logo_initial, a.logo_url
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
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET single quote with items — scoped to account ───────────────
router.get('/:id', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const quote = await db.execute(
      `SELECT * FROM quotes WHERE id = ? AND account_id = ?`, [req.params.id, account_id]
    );
    if (!quote.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await db.execute(
      `SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [req.params.id]
    );
    res.json({ ...quote.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST create quote ─────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      account_id, contact_id, client_name, client_biz, client_email, client_phone,
      billing_mode, yearly_discount, disc_type, disc_value, disc_setup, disc_monthly,
      notes, valid_days, setup_total, monthly_total, tax_rate = 0, tax_amount = 0, items = []
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
        disc_setup, disc_monthly, notes, valid_days, setup_total, monthly_total, tax_rate, tax_amount, public_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, number, contact_id || null, client_name || '', client_biz || '',
       client_email || '', client_phone || '', billing_mode || 'monthly',
       yearly_discount || 15, disc_type || 'pct', disc_value || 0,
       disc_setup ? 1 : 0, disc_monthly ? 1 : 0,
       notes || '', valid_days || 30, setup_total || 0, monthly_total || 0,
       tax_rate || 0, tax_amount || 0, public_token]
    );

    await Promise.all(items.map((item, i) => db.execute(
      `INSERT INTO quote_items (id, quote_id, section_id, section_label, service_id, name,
        description, setup_price, monthly_price, is_included, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`qi-${uuid()}`, id, item.section_id || '', item.section_label || '',
       item.service_id || '', item.name || '', item.description || '',
       item.setup_price || 0, item.monthly_price || 0, item.is_included ? 1 : 0, i]
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH update quote — scoped to account ────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    // Verify ownership first
    const owned = await getQuoteForAccount(req.params.id, account_id);
    if (!owned) return res.status(404).json({ error: 'Not found' });

    const allowed = ['status','client_name','client_biz','client_email','client_phone',
      'billing_mode','yearly_discount','disc_type','disc_value','notes',
      'setup_total','monthly_total','tax_rate','tax_amount','sent_at','accepted_at'];
    const updates = [`updated_at = NOW()`];
    const vals = [];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    vals.push(req.params.id, account_id);
    await db.execute(`UPDATE quotes SET ${updates.join(', ')} WHERE id = ? AND account_id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM quotes WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/quotes/:id/send — email quote to client ─────────────
router.post('/:id/send', requireAuth, async (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const q = await db.execute(
      `SELECT q.*, a.name as agency_name, a.email as agency_email
       FROM quotes q JOIN accounts a ON q.account_id = a.id
       WHERE q.id = ? AND q.account_id = ?`,
      [req.params.id, account_id]
    );
    if (!q.rows.length) return res.status(404).json({ error: 'Not found' });
    const quote = q.rows[0];
    if (!quote.client_email) return res.status(400).json({ error: 'No client email on this quote' });
    if (!isEmailConfigured()) return res.status(503).json({ error: 'Email not configured' });

    const origin = process.env.APP_URL || 'https://revanew.io';
    const portalUrl = `${origin}/portal/quote/${quote.public_token}`;

    await sendEmail({
      to: quote.client_email,
      subject: `Quote ${quote.number} from ${quote.agency_name || 'Revanew'}`,
      html: buildQuoteHtml({
        clientName: quote.client_name,
        agencyName: quote.agency_name || 'Revanew',
        quoteNum: quote.number,
        amount: `$${Math.round(quote.amount_due || quote.setup_total || 0).toLocaleString()}`,
        expiryDate: quote.expiry_date,
        portalUrl,
      }),
      text: `Hi ${quote.client_name || 'there'},\n\nYour quote ${quote.number} is ready to review.\n\nView and sign: ${portalUrl}\n\n${quote.agency_name || 'Revanew'}`,
    });

    await db.execute(
      `UPDATE quotes SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = ? AND account_id = ?`,
      [req.params.id, account_id]
    );
    res.json({ ok: true, email_sent: true, to: quote.client_email });
  } catch (e) {
    console.error('[Quote send]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST convert quote to invoice — scoped to account ─────────────
router.post('/:id/convert', requireAuth, async (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const quote = await db.execute(
      `SELECT * FROM quotes WHERE id = ? AND account_id = ?`, [req.params.id, account_id]
    );
    if (!quote.rows.length) return res.status(404).json({ error: 'Quote not found' });
    const q = quote.rows[0];

    // Idempotency: return existing invoice if already converted
    const alreadyConverted = await db.execute(
      `SELECT * FROM invoices WHERE quote_id = ? AND account_id = ? ORDER BY created_at DESC LIMIT 1`,
      [q.id, account_id]
    );
    if (alreadyConverted.rows.length) {
      const existing = alreadyConverted.rows[0];
      const existingItems = await db.execute(
        `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`, [existing.id]
      );
      return res.json({ ...existing, items: existingItems.rows });
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
    const due_date = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const amount_due = q.setup_total || 0;

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
        setup_price, monthly_price, is_included, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`ii-${uuid()}`, invId, item.section_label, item.name, item.description,
       item.setup_price, item.monthly_price, item.is_included, i]
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE quote — scoped to account ─────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const owned = await getQuoteForAccount(req.params.id, account_id);
    if (!owned) return res.status(404).json({ error: 'Not found' });
    await db.execute(`DELETE FROM quotes WHERE id = ? AND account_id = ?`, [req.params.id, account_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
