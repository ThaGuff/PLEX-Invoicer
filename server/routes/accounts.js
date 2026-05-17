import { Router } from 'express';
import { db } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET all accounts
router.get('/', async (req, res) => {
  try {
    const result = await db.execute(`SELECT * FROM accounts ORDER BY created_at ASC`);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single account with custom catalog
router.get('/:id', async (req, res) => {
  try {
    const acc = await db.execute(`SELECT * FROM accounts WHERE id = ?`, [req.params.id]);
    if (!acc.rows.length) return res.status(404).json({ error: 'Not found' });

    const sections = await db.execute(
      `SELECT * FROM custom_sections WHERE account_id = ? ORDER BY sort_order`, [req.params.id]
    );
    const items = await db.execute(
      `SELECT * FROM custom_items WHERE account_id = ? ORDER BY sort_order`, [req.params.id]
    );

    res.json({ ...acc.rows[0], customSections: sections.rows, customItems: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create account
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, website, logo_initial, primary_color, plan } = req.body;
    const id = `acc-${uuid()}`;
    await db.execute(
      `INSERT INTO accounts (id, name, email, phone, website, logo_initial, primary_color, plan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email || '', phone || '', website || '',
       logo_initial || (name?.[0]?.toUpperCase() || 'A'),
       primary_color || '#13B5EA', plan || 'starter']
    );
    const created = await db.execute(`SELECT * FROM accounts WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH update account
router.patch('/:id', async (req, res) => {
  try {
    const fields = ['name', 'email', 'phone', 'website', 'logo_initial', 'primary_color', 'plan'];
    const updates = [];
    const vals = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    if (!updates.length) return res.json({ ok: true });
    vals.push(req.params.id);
    await db.execute(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM accounts WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE account (not plex-master)
router.delete('/:id', async (req, res) => {
  if (req.params.id === 'plex-master') return res.status(403).json({ error: 'Cannot delete master account' });
  try {
    await db.execute(`DELETE FROM accounts WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Custom catalog — sections
router.post('/:id/sections', async (req, res) => {
  try {
    const id = `sec-${uuid()}`;
    await db.execute(
      `INSERT INTO custom_sections (id, account_id, label, sort_order) VALUES (?, ?, ?, ?)`,
      [id, req.params.id, req.body.label || 'New Section', req.body.sort_order || 0]
    );
    res.json({ id, label: req.body.label, account_id: req.params.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/sections/:sid', async (req, res) => {
  try {
    await db.execute(`UPDATE custom_sections SET label = ? WHERE id = ? AND account_id = ?`,
      [req.body.label, req.params.sid, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/sections/:sid', async (req, res) => {
  try {
    await db.execute(`DELETE FROM custom_sections WHERE id = ? AND account_id = ?`,
      [req.params.sid, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Custom catalog — items
router.post('/:id/items', async (req, res) => {
  try {
    const id = `item-${uuid()}`;
    const { section_id, name, description, setup_price, monthly_price } = req.body;
    await db.execute(
      `INSERT INTO custom_items (id, account_id, section_id, name, description, setup_price, monthly_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, section_id, name, description || '', setup_price || 0, monthly_price || 0]
    );
    res.json({ id, account_id: req.params.id, section_id, name, description, setup_price, monthly_price });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/items/:iid', async (req, res) => {
  try {
    const fields = ['name', 'description', 'setup_price', 'monthly_price'];
    const updates = [];
    const vals = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); } });
    if (!updates.length) return res.json({ ok: true });
    vals.push(req.params.iid, req.params.id);
    await db.execute(`UPDATE custom_items SET ${updates.join(', ')} WHERE id = ? AND account_id = ?`, vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/items/:iid', async (req, res) => {
  try {
    await db.execute(`DELETE FROM custom_items WHERE id = ? AND account_id = ?`,
      [req.params.iid, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
