/**
 * Calendar & Job Scheduling API
 * Secured: requireAuth on all routes
 * Ownership: account_id verified against authenticated user
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────
const VALID_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];
const ALLOWED_FIELDS = ['title', 'date', 'time', 'duration', 'location', 'notes', 'status', 'client_name', 'client_email'];

function sanitize(str, maxLen = 500) {
  if (str == null) return null;
  return String(str).trim().slice(0, maxLen);
}

async function assertAccountAccess(accountId, userId) {
  // Allow owner OR members
  const r = await db.execute(
    `SELECT a.id FROM accounts a
     WHERE a.id = ? AND (
       a.owner_id = ?
       OR EXISTS (SELECT 1 FROM account_members m WHERE m.account_id = a.id AND m.user_id = ? AND m.status = 'active')
     )`, [accountId, userId, userId]
  );
  if (!r.rows.length) throw Object.assign(new Error('Account not found or access denied'), { status: 403 });
}

// ── GET /api/calendar?account_id=&year=&month= ────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { account_id, year, month } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    // Build date range for month if provided
    let sql = `SELECT * FROM calendar_events WHERE account_id = ? ORDER BY date ASC, time ASC`;
    const params = [account_id];
    if (year && month) {
      const y = parseInt(year), m = parseInt(month).toString().padStart(2, '0');
      sql = `SELECT * FROM calendar_events WHERE account_id = ? AND date >= ? AND date < ? ORDER BY date ASC, time ASC`;
      params.push(`${y}-${m}-01`, m === '12' ? `${y+1}-01-01` : `${y}-${(parseInt(month)+1).toString().padStart(2,'0')}-01`);
    }
    const result = await db.execute(sql, params);
    res.json(result.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/calendar ────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { account_id, title, date, time, duration, location, notes, status } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  if (!date) return res.status(400).json({ error: 'date required' });
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    const { v4: uuid } = await import('uuid');
    const id = `ev-${uuid()}`;
    await db.execute(
      `INSERT INTO calendar_events (id, account_id, title, date, time, duration, location, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, sanitize(title, 200), date, sanitize(time, 10), duration || 60, sanitize(location, 300), sanitize(notes), status || 'scheduled']
    );
    const ev = await db.execute(`SELECT * FROM calendar_events WHERE id = ?`, [id]);
    res.status(201).json(ev.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── PATCH /api/calendar/:id ───────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const ev = await db.execute(`SELECT * FROM calendar_events WHERE id = ?`, [req.params.id]);
    if (!ev.rows.length) return res.status(404).json({ error: 'Event not found' });
    await assertAccountAccess(ev.rows[0].account_id, req.user.id);
    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'invalid status' });
    const updates = [], vals = [];
    ALLOWED_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(sanitize(req.body[f])); }
    });
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await db.execute(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM calendar_events WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── DELETE /api/calendar/:id ──────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const ev = await db.execute(`SELECT * FROM calendar_events WHERE id = ?`, [req.params.id]);
    if (!ev.rows.length) return res.status(404).json({ error: 'Event not found' });
    await assertAccountAccess(ev.rows[0].account_id, req.user.id);
    await db.execute(`DELETE FROM calendar_events WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

export default router;
