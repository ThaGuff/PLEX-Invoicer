import { Router } from 'express';
import { db } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

function nextNumber(rows, prefix) {
  if (!rows.length) return `${prefix}-0001`;
  const nums = rows.map(r => parseInt((r.number || '0').split('-').pop()) || 0);
  return `${prefix}-${String(Math.max(...nums) + 1).padStart(4, '0')}`;
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
      await db.execute(`UPDATE quotes SET viewed_at = datetime('now') WHERE id = ?`, [quote.rows[0].id]);
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
    await db.execute(
      `UPDATE quotes SET status = 'accepted', accepted_at = datetime('now') WHERE public_token = ?`,
      [req.params.token]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET single quote with items ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const quote = await db.execute(`SELECT * FROM quotes WHERE id = ?`, [req.params.id]);
    if (!quote.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await db.execute(
      `SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [req.params.id]
    );
    res.json({ ...quote.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST create quote ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      account_id, contact_id, client_name, client_biz, client_email, client_phone,
      billing_mode, yearly_discount, disc_type, disc_value, disc_setup, disc_monthly,
      notes, valid_days, setup_total, monthly_total, items = []
    } = req.body;

    const existingQuotes = await db.execute(`SELECT number FROM quotes WHERE account_id = ?`, [account_id]);
    const acc = await db.execute(`SELECT name FROM accounts WHERE id = ?`, [account_id]);
    const prefix = (acc.rows[0]?.name || 'Q').substring(0, 1).toUpperCase() + 'Q';
    const number = nextNumber(existingQuotes.rows, prefix);
    const id = `q-${uuid()}`;
    const public_token = uuid().replace(/-/g, '');

    await db.execute(
      `INSERT INTO quotes (id, account_id, number, contact_id, client_name, client_biz,
        client_email, client_phone, billing_mode, yearly_discount, disc_type, disc_value,
        disc_setup, disc_monthly, notes, valid_days, setup_total, monthly_total, public_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, number, contact_id || null, client_name || '', client_biz || '',
       client_email || '', client_phone || '', billing_mode || 'monthly',
       yearly_discount || 15, disc_type || 'pct', disc_value || 0,
       disc_setup ? 1 : 0, disc_monthly ? 1 : 0,
       notes || '', valid_days || 30, setup_total || 0, monthly_total || 0, public_token]
    );

    // Batch insert items in parallel
    await Promise.all(items.map((item, i) => db.execute(
      `INSERT INTO quote_items (id, quote_id, section_id, section_label, service_id, name,
        description, setup_price, monthly_price, is_included, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`qi-${uuid()}`, id, item.section_id || '', item.section_label || '',
       item.service_id || '', item.name || '', item.description || '',
       item.setup_price || 0, item.monthly_price || 0, item.is_included ? 1 : 0, i]
    )));

    const [created, createdItems] = await Promise.all([
      db.execute(`SELECT * FROM quotes WHERE id = ?`, [id]),
      db.execute(`SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [id]),
    ]);
    res.json({ ...created.rows[0], items: createdItems.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH update quote ────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['status','client_name','client_biz','client_email','client_phone',
      'billing_mode','yearly_discount','disc_type','disc_value','notes',
      'setup_total','monthly_total','sent_at','accepted_at'];
    const updates = [`updated_at = datetime('now')`];
    const vals = [];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    vals.push(req.params.id);
    await db.execute(`UPDATE quotes SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM quotes WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST convert quote to invoice ─────────────────────────────────
router.post('/:id/convert', async (req, res) => {
  try {
    const quote = await db.execute(`SELECT * FROM quotes WHERE id = ?`, [req.params.id]);
    if (!quote.rows.length) return res.status(404).json({ error: 'Quote not found' });
    const q = quote.rows[0];
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
    const amount_due = q.setup_total || 0; // setup total only; monthly is recurring

    await db.execute(
      `INSERT INTO invoices (id, account_id, quote_id, number, contact_id, client_name, client_biz,
        client_email, client_phone, billing_mode, setup_total, monthly_total, amount_due, due_date,
        notes, public_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invId, q.account_id, q.id, number, q.contact_id, q.client_name, q.client_biz,
       q.client_email, q.client_phone, q.billing_mode, q.setup_total, q.monthly_total,
       amount_due, due_date, q.notes, public_token]
    );

    // Batch insert invoice items
    await Promise.all(items.rows.map((item, i) => db.execute(
      `INSERT INTO invoice_items (id, invoice_id, section_label, name, description,
        setup_price, monthly_price, is_included, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`ii-${uuid()}`, invId, item.section_label, item.name, item.description,
       item.setup_price, item.monthly_price, item.is_included, i]
    )));

    await db.execute(
      `UPDATE quotes SET status = 'accepted', accepted_at = datetime('now') WHERE id = ?`, [q.id]
    );

    const inv = await db.execute(`SELECT * FROM invoices WHERE id = ?`, [invId]);
    const invItems = await db.execute(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`, [invId]
    );
    res.json({ ...inv.rows[0], items: invItems.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE quote ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.execute(`DELETE FROM quotes WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
