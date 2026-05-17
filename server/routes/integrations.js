/**
 * F2: Deep workflow triggers — incoming webhook receiver
 * F8: Fee pass-through rules
 * F6: Line-item split payments
 * F9: Invoice versioning
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// ── F2: Incoming webhook receiver ────────────────────────────────
// POST /api/v1/integrations/webhook?account_id=xxx&secret=yyy
router.post('/webhook', async (req, res) => {
  res.json({ received: true }); // always ack immediately

  const { account_id, secret } = req.query;
  if (!account_id) return;

  try {
    const payload = req.body;
    // Load active rules for this account
    const rules = await db.execute(
      `SELECT * FROM webhook_rules WHERE account_id = ? AND active = 1`, [account_id]
    );

    for (const rule of rules.rows) {
      // Check if payload matches rule
      let matches = true;
      if (rule.match_field && rule.match_value) {
        const fieldVal = rule.match_field.split('.').reduce((o, k) => o?.[k], payload);
        matches = String(fieldVal) === String(rule.match_value);
      }
      if (!matches) continue;

      // Execute action
      if (rule.action === 'create_draft_invoice') {
        const template = rule.template_json ? JSON.parse(rule.template_json) : {};
        const id = `inv-${uuid()}`;
        const number = `INV-${Date.now().toString(36).toUpperCase()}`;
        const token = uuid().replace(/-/g, '');

        await db.execute(`
          INSERT INTO invoices (id, account_id, number, client_name, client_email,
                                status, notes, public_token, amount_due)
          VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, 0)
        `, [id, account_id, number,
            payload.client_name || template.client_name || null,
            payload.client_email || template.client_email || null,
            `Auto-generated from webhook: ${rule.name}. Payload: ${JSON.stringify(payload).slice(0, 200)}`,
            token]);
      }
    }
  } catch (e) { console.error('Webhook rule error:', e.message); }
});

// GET/POST /api/v1/integrations/rules — manage webhook rules
router.get('/rules', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const rules = await db.execute(`SELECT * FROM webhook_rules WHERE account_id = ? ORDER BY created_at DESC`, [account_id]);
    res.json(rules.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rules', async (req, res) => {
  const { account_id, name, event_key, match_field, match_value, action, template_json } = req.body;
  if (!account_id || !name) return res.status(400).json({ error: 'account_id and name required' });
  try {
    const id = `rule-${uuid()}`;
    await db.execute(
      `INSERT INTO webhook_rules (id, account_id, name, event_key, match_field, match_value, action, template_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, name, event_key || 'any', match_field || null, match_value || null, action || 'create_draft_invoice', template_json || null]
    );
    res.json({ id, ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/rules/:id', async (req, res) => {
  try {
    const fields = ['name', 'event_key', 'match_field', 'match_value', 'action', 'template_json', 'active'];
    const updates = [], vals = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); } });
    if (updates.length) { vals.push(req.params.id); await db.execute(`UPDATE webhook_rules SET ${updates.join(', ')} WHERE id = ?`, vals); }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/rules/:id', async (req, res) => {
  try { await db.execute(`DELETE FROM webhook_rules WHERE id = ?`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── F8: Fee pass-through rules ────────────────────────────────────
router.get('/fee-rules/:account_id', async (req, res) => {
  try {
    const r = await db.execute(`SELECT * FROM fee_rules WHERE account_id = ?`, [req.params.account_id]);
    res.json(r.rows[0] || {
      account_id: req.params.account_id,
      early_pay_hours: 48, waive_fee_if_early: 0,
      ach_only_above: 0, ach_only_enabled: 0,
      processing_fee_pct: 2.9, processing_fee_flat: 0.30,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/fee-rules', async (req, res) => {
  const { account_id, early_pay_hours, waive_fee_if_early, ach_only_above, ach_only_enabled, processing_fee_pct, processing_fee_flat } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const id = `fr-${uuid()}`;
    await db.execute(`
      INSERT INTO fee_rules (id, account_id, early_pay_hours, waive_fee_if_early, ach_only_above, ach_only_enabled, processing_fee_pct, processing_fee_flat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        early_pay_hours = excluded.early_pay_hours,
        waive_fee_if_early = excluded.waive_fee_if_early,
        ach_only_above = excluded.ach_only_above,
        ach_only_enabled = excluded.ach_only_enabled,
        processing_fee_pct = excluded.processing_fee_pct,
        processing_fee_flat = excluded.processing_fee_flat
    `, [id, account_id, early_pay_hours ?? 48, waive_fee_if_early ? 1 : 0,
        ach_only_above ?? 0, ach_only_enabled ? 1 : 0,
        processing_fee_pct ?? 2.9, processing_fee_flat ?? 0.30]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── F6: Line-item split payments ──────────────────────────────────
router.get('/split-payment/:token', async (req, res) => {
  try {
    const inv = await db.execute(
      `SELECT i.*, a.name as agency_name, a.primary_color FROM invoices i
       JOIN accounts a ON i.account_id = a.id WHERE i.public_token = ?`, [req.params.token]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await db.execute(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`, [inv.rows[0].id]
    );
    res.json({ ...inv.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create Stripe payment intent for selected line items
router.post('/split-payment/:token/pay', async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(503).json({ error: 'Stripe not configured' });

  const { item_ids } = req.body; // array of invoice_item IDs to pay
  if (!item_ids?.length) return res.status(400).json({ error: 'item_ids required' });

  try {
    const inv = await db.execute(
      `SELECT * FROM invoices WHERE public_token = ?`, [req.params.token]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Invoice not found' });

    const items = await db.execute(
      `SELECT * FROM invoice_items WHERE invoice_id = ? AND id IN (${item_ids.map(() => '?').join(',')})`,
      [inv.rows[0].id, ...item_ids]
    );

    const total = items.rows.reduce((s, i) => {
      return s + (i.setup_price || 0) + (i.monthly_price || 0);
    }, 0);

    if (total <= 0) return res.status(400).json({ error: 'Total must be greater than 0' });

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'usd',
      metadata: {
        invoice_id:  inv.rows[0].id,
        invoice_num: inv.rows[0].number,
        item_ids:    item_ids.join(','),
        partial:     'true',
      },
    });

    // Mark items as in-progress
    for (const itemId of item_ids) {
      await db.execute(
        `UPDATE invoice_items SET line_status = 'processing', stripe_payment_intent = ? WHERE id = ?`,
        [intent.id, itemId]
      );
    }

    res.json({
      client_secret: intent.client_secret,
      amount:        total,
      item_count:    items.rows.length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mark line items paid after successful payment intent
router.post('/split-payment/:token/confirm', async (req, res) => {
  const { payment_intent_id } = req.body;
  try {
    const items = await db.execute(
      `SELECT ii.id FROM invoice_items ii
       JOIN invoices i ON ii.invoice_id = i.id
       WHERE i.public_token = ? AND ii.stripe_payment_intent = ?`,
      [req.params.token, payment_intent_id]
    );
    for (const item of items.rows) {
      await db.execute(
        `UPDATE invoice_items SET line_status = 'paid', line_paid_at = datetime('now') WHERE id = ?`, [item.id]
      );
    }
    res.json({ ok: true, paid_count: items.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── F9: Invoice versioning ────────────────────────────────────────
// Create new version of an invoice (immutable — old version preserved)
router.post('/invoice-version/:id', async (req, res) => {
  try {
    const orig = await db.execute(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    if (!orig.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const o = orig.rows[0];

    const groupId = o.invoice_group_id || o.id;
    const newVersion = (o.version || 1) + 1;
    const newId = `inv-${uuid()}`;
    const { change_summary } = req.body;

    // Mark all previous versions as not-latest
    await db.execute(`UPDATE invoices SET is_latest = 0 WHERE invoice_group_id = ? OR id = ?`, [groupId, groupId]);

    // Copy the invoice with new version
    await db.execute(`
      INSERT INTO invoices (id, account_id, quote_id, number, contact_id, client_name, client_biz,
                            client_email, client_phone, status, billing_mode, setup_total, monthly_total,
                            amount_due, due_date, notes, public_token, version, invoice_group_id,
                            is_latest, parent_invoice_id, change_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [newId, o.account_id, o.quote_id, o.number, o.contact_id, o.client_name, o.client_biz,
        o.client_email, o.client_phone, o.status, o.billing_mode, o.setup_total, o.monthly_total,
        req.body.amount_due ?? o.amount_due, req.body.due_date ?? o.due_date,
        req.body.notes ?? o.notes, uuid().replace(/-/g, ''), newVersion, groupId, o.id,
        change_summary || `Version ${newVersion}`]);

    // Copy items from original
    const origItems = await db.execute(`SELECT * FROM invoice_items WHERE invoice_id = ?`, [o.id]);
    for (const item of origItems.rows) {
      const newItemId = `ii-${uuid()}`;
      await db.execute(`
        INSERT INTO invoice_items (id, invoice_id, section_label, name, description, setup_price, monthly_price, is_included, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [newItemId, newId, item.section_label, item.name, item.description, item.setup_price, item.monthly_price, item.is_included, item.sort_order]);
    }

    // Update group_id on original if first version
    if (!o.invoice_group_id) {
      await db.execute(`UPDATE invoices SET invoice_group_id = ? WHERE id = ?`, [groupId, o.id]);
    }

    res.json({ ok: true, new_id: newId, version: newVersion, group_id: groupId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET version history for an invoice
router.get('/invoice-history/:id', async (req, res) => {
  try {
    const inv = await db.execute(`SELECT invoice_group_id, id FROM invoices WHERE id = ?`, [req.params.id]);
    if (!inv.rows.length) return res.status(404).json({ error: 'Not found' });
    const groupId = inv.rows[0].invoice_group_id || inv.rows[0].id;
    const versions = await db.execute(`
      SELECT id, version, is_latest, status, amount_due, change_summary, created_at
      FROM invoices WHERE invoice_group_id = ? OR id = ? ORDER BY version ASC
    `, [groupId, groupId]);
    res.json(versions.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
