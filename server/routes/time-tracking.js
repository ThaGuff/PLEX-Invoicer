/**
 * Time Tracking API
 * GET    /api/time?account_id=    — list entries
 * POST   /api/time                — create entry
 * PATCH  /api/time/:id            — update entry (stop timer, edit)
 * DELETE /api/time/:id            — delete
 * POST   /api/time/:id/start      — start timer
 * POST   /api/time/:id/stop       — stop timer
 * POST   /api/time/invoice        — convert entries to invoice
 * GET    /api/time/projects       — list projects
 * POST   /api/time/projects       — create project
 * GET    /api/time/summary        — summary stats for account
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

async function assertAccess(accountId, userId) {
  const r = await db.execute(
    `SELECT id FROM accounts WHERE id = ? AND (owner_id = ? OR id IN (SELECT account_id FROM account_members WHERE user_id = ? AND status='active'))`,
    [accountId, userId, userId]
  );
  if (!r.rows.length) throw Object.assign(new Error('Access denied'), { status: 403 });
}

// ── GET /api/time — list time entries ─────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { account_id, project, invoiced, limit = 100 } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);
    let sql = `SELECT t.*, p.name as project_name_ref FROM time_entries t LEFT JOIN time_projects p ON p.id = t.project_name WHERE t.account_id = ?`;
    const params = [account_id];
    if (invoiced !== undefined) { sql += ` AND t.is_invoiced = ?`; params.push(invoiced === 'true' ? 1 : 0); }
    sql += ` ORDER BY t.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));
    const result = await db.execute(sql, params);
    res.json(result.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/time — create entry ─────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { account_id, project_name, description, contact_id, quote_id, assigned_to, start_time, end_time, duration_minutes, is_billable = 1, hourly_rate = 0, tags } = req.body;
  if (!account_id || !project_name) return res.status(400).json({ error: 'account_id and project_name required' });
  try {
    await assertAccess(account_id, req.user.id);
    const id = `te-${uuid()}`;
    let dur = duration_minutes;
    if (!dur && start_time && end_time) {
      dur = Math.round((new Date(end_time) - new Date(start_time)) / 60000);
    }
    const billedAmount = (dur || 0) / 60 * parseFloat(hourly_rate || 0);
    await db.execute(
      `INSERT INTO time_entries (id, account_id, project_name, description, contact_id, quote_id, assigned_to, start_time, end_time, duration_minutes, is_billable, hourly_rate, billed_amount, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, account_id, project_name, description||'', contact_id||null, quote_id||null, assigned_to||null, start_time||null, end_time||null, dur||0, is_billable?1:0, parseFloat(hourly_rate)||0, billedAmount, tags||'']
    );
    const created = await db.execute(`SELECT * FROM time_entries WHERE id = ?`, [id]);
    res.status(201).json(created.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── PATCH /api/time/:id ────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const entry = await db.execute(`SELECT * FROM time_entries WHERE id = ?`, [req.params.id]);
    if (!entry.rows.length) return res.status(404).json({ error: 'Not found' });
    await assertAccess(entry.rows[0].account_id, req.user.id);
    const allowed = ['project_name','description','contact_id','start_time','end_time','duration_minutes','is_billable','hourly_rate','status','is_invoiced','tags','assigned_to'];
    const updates = [], vals = [];
    allowed.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); } });
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    // Recalculate billed amount if hourly rate or duration changed
    const e = entry.rows[0];
    const dur = req.body.duration_minutes !== undefined ? parseInt(req.body.duration_minutes) : e.duration_minutes;
    const rate = req.body.hourly_rate !== undefined ? parseFloat(req.body.hourly_rate) : e.hourly_rate;
    updates.push('billed_amount = ?');
    vals.push(Math.round((dur / 60 * rate) * 100) / 100);
    vals.push(req.params.id);
    await db.execute(`UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM time_entries WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── DELETE /api/time/:id ───────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const entry = await db.execute(`SELECT * FROM time_entries WHERE id = ?`, [req.params.id]);
    if (!entry.rows.length) return res.status(404).json({ error: 'Not found' });
    await assertAccess(entry.rows[0].account_id, req.user.id);
    await db.execute(`DELETE FROM time_entries WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/time/:id/start — start live timer ────────────────────
router.post('/:id/start', requireAuth, async (req, res) => {
  try {
    const entry = await db.execute(`SELECT * FROM time_entries WHERE id = ?`, [req.params.id]);
    if (!entry.rows.length) return res.status(404).json({ error: 'Not found' });
    await assertAccess(entry.rows[0].account_id, req.user.id);
    const now = new Date().toISOString();
    await db.execute(`UPDATE time_entries SET start_time = ?, timer_running = 1, end_time = NULL WHERE id = ?`, [now, req.params.id]);
    const updated = await db.execute(`SELECT * FROM time_entries WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/time/:id/stop — stop live timer ──────────────────────
router.post('/:id/stop', requireAuth, async (req, res) => {
  try {
    const entry = await db.execute(`SELECT * FROM time_entries WHERE id = ?`, [req.params.id]);
    if (!entry.rows.length) return res.status(404).json({ error: 'Not found' });
    const e = entry.rows[0];
    await assertAccess(e.account_id, req.user.id);
    const now = new Date();
    const start = new Date(e.start_time);
    const dur = Math.round((now - start) / 60000);
    const totalDur = (e.duration_minutes || 0) + dur;
    const billed = Math.round((totalDur / 60 * e.hourly_rate) * 100) / 100;
    await db.execute(
      `UPDATE time_entries SET end_time = ?, duration_minutes = ?, billed_amount = ?, timer_running = 0, status = 'logged' WHERE id = ?`,
      [now.toISOString(), totalDur, billed, req.params.id]
    );
    const updated = await db.execute(`SELECT * FROM time_entries WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /api/time/summary ──────────────────────────────────────────
router.get('/summary', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);
    const [all, billable, notInvoiced] = await Promise.all([
      db.execute(`SELECT COALESCE(SUM(duration_minutes),0) as total_mins, COUNT(*) as total_entries FROM time_entries WHERE account_id = ?`, [account_id]),
      db.execute(`SELECT COALESCE(SUM(billed_amount),0) as total_billed FROM time_entries WHERE account_id = ? AND is_billable = 1`, [account_id]),
      db.execute(`SELECT COALESCE(SUM(billed_amount),0) as unbilled FROM time_entries WHERE account_id = ? AND is_billable = 1 AND is_invoiced = 0`, [account_id]),
    ]);
    res.json({
      total_hours: Math.round(all.rows[0].total_mins / 60 * 10) / 10,
      total_entries: all.rows[0].total_entries,
      total_billed: Math.round(all.rows[0].total_billed || billable.rows[0].total_billed),
      unbilled_amount: Math.round(notInvoiced.rows[0].unbilled || 0),
    });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── Projects ───────────────────────────────────────────────────────
router.get('/projects', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);
    const r = await db.execute(`SELECT * FROM time_projects WHERE account_id = ? ORDER BY created_at DESC`, [account_id]);
    res.json(r.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.post('/projects', requireAuth, async (req, res) => {
  const { account_id, name, contact_id, hourly_rate = 0, budget_hours, billing_method = 'hourly' } = req.body;
  if (!account_id || !name) return res.status(400).json({ error: 'account_id and name required' });
  try {
    await assertAccess(account_id, req.user.id);
    const id = `tp-${uuid()}`;
    await db.execute(
      `INSERT INTO time_projects (id, account_id, name, contact_id, hourly_rate, budget_hours, billing_method) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, name, contact_id||null, parseFloat(hourly_rate)||0, budget_hours||null, billing_method]
    );
    const created = await db.execute(`SELECT * FROM time_projects WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

export default router;
