import { Router } from 'express';
import { db } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET all accounts for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    let result;
    if (userId === 'dev-user') {
      result = await db.execute(`SELECT * FROM accounts ORDER BY created_at ASC`);
    } else {
      // Users see their own accounts + plex-master (if they are Ryan)
      result = await db.execute(
        `SELECT * FROM accounts WHERE owner_id = ? OR id = 'plex-master' ORDER BY created_at ASC`,
        [userId]
      );
    }
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single account with full custom catalog
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
    const { name, email, phone, website, logo_initial, logo_url, primary_color, plan } = req.body;
    const id = `acc-${uuid()}`;
    const owner_id = req.user?.id && req.user.id !== 'dev-user' ? req.user.id : null;
    await db.execute(
      `INSERT INTO accounts (id, owner_id, name, email, phone, website, logo_initial, logo_url, primary_color, plan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, owner_id, name, email || '', phone || '', website || '',
       logo_initial || (name?.[0]?.toUpperCase() || 'A'),
       logo_url || null,
       primary_color || '#13B5EA', plan || 'starter']
    );
    const created = await db.execute(`SELECT * FROM accounts WHERE id = ?`, [id]);
    res.json({ ...created.rows[0], customSections: [], customItems: [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH update account
router.patch('/:id', async (req, res) => {
  try {
    const fields = ['name', 'email', 'phone', 'website', 'logo_initial', 'logo_url', 'primary_color', 'plan'];
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

// DELETE account
router.delete('/:id', async (req, res) => {
  if (req.params.id === 'plex-master') return res.status(403).json({ error: 'Cannot delete master account' });
  try {
    await db.execute(`DELETE FROM accounts WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Custom catalog: sections ──────────────────────────────────────
router.post('/:id/sections', async (req, res) => {
  try {
    const id = `sec-${uuid()}`;
    const maxOrder = await db.execute(
      `SELECT COALESCE(MAX(sort_order),0) as m FROM custom_sections WHERE account_id = ?`, [req.params.id]
    );
    await db.execute(
      `INSERT INTO custom_sections (id, account_id, label, sort_order) VALUES (?, ?, ?, ?)`,
      [id, req.params.id, req.body.label || 'New Section', (maxOrder.rows[0].m || 0) + 1]
    );
    res.json({ id, label: req.body.label, account_id: req.params.id, sort_order: (maxOrder.rows[0].m || 0) + 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/sections/:sid', async (req, res) => {
  try {
    const updates = []; const vals = [];
    if (req.body.label !== undefined) { updates.push('label = ?'); vals.push(req.body.label); }
    if (req.body.sort_order !== undefined) { updates.push('sort_order = ?'); vals.push(req.body.sort_order); }
    if (updates.length) {
      vals.push(req.params.sid, req.params.id);
      await db.execute(`UPDATE custom_sections SET ${updates.join(', ')} WHERE id = ? AND account_id = ?`, vals);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/sections/:sid', async (req, res) => {
  try {
    await db.execute(`DELETE FROM custom_sections WHERE id = ? AND account_id = ?`, [req.params.sid, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Custom catalog: items ─────────────────────────────────────────
router.post('/:id/items', async (req, res) => {
  try {
    const id = `item-${uuid()}`;
    const { section_id, name, description, setup_price, monthly_price } = req.body;
    const maxOrder = await db.execute(
      `SELECT COALESCE(MAX(sort_order),0) as m FROM custom_items WHERE account_id = ? AND section_id = ?`,
      [req.params.id, section_id]
    );
    await db.execute(
      `INSERT INTO custom_items (id, account_id, section_id, name, description, setup_price, monthly_price, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, section_id, name, description || '',
       setup_price ?? 0, monthly_price ?? 0, (maxOrder.rows[0].m || 0) + 1]
    );
    const created = await db.execute(`SELECT * FROM custom_items WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/items/:iid', async (req, res) => {
  try {
    const fields = ['name', 'description', 'setup_price', 'monthly_price', 'sort_order'];
    const updates = []; const vals = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); } });
    if (updates.length) {
      vals.push(req.params.iid, req.params.id);
      await db.execute(`UPDATE custom_items SET ${updates.join(', ')} WHERE id = ? AND account_id = ?`, vals);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/items/:iid', async (req, res) => {
  try {
    await db.execute(`DELETE FROM custom_items WHERE id = ? AND account_id = ?`, [req.params.iid, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Logo upload ───────────────────────────────────────────────────
// Accepts base64 data URL, stores reference in logo_url field
// For production, swap this to upload to S3/Cloudflare R2
router.post('/:id/logo', async (req, res) => {
  try {
    const { logo_data_url } = req.body;
    if (!logo_data_url) return res.status(400).json({ error: 'logo_data_url required' });
    if (!logo_data_url.startsWith('data:image/')) return res.status(400).json({ error: 'Must be an image data URL' });
    // For now store the data URL directly (works, but large — production should use R2/S3)
    await db.execute(`UPDATE accounts SET logo_url = ? WHERE id = ?`, [logo_data_url, req.params.id]);
    res.json({ ok: true, logo_url: logo_data_url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
