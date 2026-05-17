import { Router } from 'express';
import { db } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const result = await db.execute(
      `SELECT * FROM contacts WHERE account_id = ? ORDER BY name ASC`, [account_id]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { account_id, name, business, email, phone, address, notes } = req.body;
    const id = `con-${uuid()}`;
    await db.execute(
      `INSERT INTO contacts (id, account_id, name, business, email, phone, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, name, business || '', email || '', phone || '', address || '', notes || '']
    );
    const created = await db.execute(`SELECT * FROM contacts WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const fields = ['name', 'business', 'email', 'phone', 'address', 'notes'];
    const updates = ['updated_at = datetime(\'now\')'];
    const vals = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); } });
    vals.push(req.params.id);
    await db.execute(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM contacts WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute(`DELETE FROM contacts WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
