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
const ALLOWED_FIELDS = ['title', 'date', 'time', 'end_time', 'duration', 'location', 'notes', 'status', 'client_name', 'client_email', 'client_phone', 'contact_id', 'quote_id', 'invoice_id', 'type', 'color', 'assigned_to', 'tags', 'estimated_revenue', 'deposit_amount', 'deposit_paid', 'priority', 'equipment_needed', 'job_confirmed', 'recurrence'];

function sanitize(str, maxLen = 500) {
  if (str == null) return null;
  return String(str).trim().slice(0, maxLen);
}

async function assertAccountAccess(accountId, userId) {
  // dev-user has full access
  if (userId === 'dev-user') return;
  // Allow owner OR active members
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

// ── GET /api/calendar/events — date range query (for dashboard widget) ──
router.get('/events', requireAuth, async (req, res) => {
  const { account_id, start, end } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    let sql = `SELECT * FROM calendar_events WHERE account_id = ? ORDER BY date ASC, time ASC LIMIT 20`;
    const params = [account_id];
    if (start && end) {
      // Extract just the date portion from ISO timestamps
      const startDate = start.split('T')[0];
      const endDate   = end.split('T')[0];
      sql = `SELECT * FROM calendar_events WHERE account_id = ? AND date >= ? AND date <= ? ORDER BY date ASC, time ASC LIMIT 20`;
      params.push(startDate, endDate);
    } else {
      // Default: next 14 days
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
      sql = `SELECT * FROM calendar_events WHERE account_id = ? AND date >= ? AND date <= ? ORDER BY date ASC, time ASC LIMIT 20`;
      params.push(today, future);
    }
    const result = await db.execute(sql, params);
    res.json(result.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/calendar ────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { account_id, title, date, time, end_time, duration, location, notes, status, type, color, assigned_to, tags } = req.body;
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
    const { client_phone, contact_id, quote_id, invoice_id, estimated_revenue, deposit_amount, deposit_paid, priority, equipment_needed, job_confirmed, recurrence } = req.body;
    await db.execute(
      `INSERT INTO calendar_events (id, account_id, title, date, time, end_time, duration, location, notes, status, type, color, assigned_to, tags, client_name, client_email, client_phone, contact_id, quote_id, invoice_id, estimated_revenue, deposit_amount, deposit_paid, priority, equipment_needed, job_confirmed, recurrence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, sanitize(title, 200), date, sanitize(time, 10), sanitize(end_time, 10), duration || 60, sanitize(location, 300), sanitize(notes), status || 'scheduled', sanitize(type, 50), sanitize(color, 20), sanitize(assigned_to, 200), sanitize(tags, 500), sanitize(req.body.client_name, 200), sanitize(req.body.client_email, 200), sanitize(client_phone, 30), contact_id || null, quote_id || null, invoice_id || null, parseFloat(estimated_revenue) || 0, parseFloat(deposit_amount) || 0, deposit_paid ? 1 : 0, priority || 'normal', sanitize(equipment_needed, 500), job_confirmed ? 1 : 0, sanitize(recurrence, 100)]
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

// ── GET /api/calendar/ai-summary — AI operations command center ───
router.get('/ai-summary', requireAuth, async (req, res) => {
  const { account_id, date } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    const targetDate = date || new Date().toISOString().split('T')[0];
    const weekStart = new Date(targetDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [dayEvents, weekEvents, overdueInvoices] = await Promise.all([
      db.execute(`SELECT * FROM calendar_events WHERE account_id = ? AND date = ? ORDER BY time ASC`, [account_id, targetDate]),
      db.execute(`SELECT * FROM calendar_events WHERE account_id = ? AND date >= ? AND date < ? ORDER BY date ASC, time ASC`,
        [account_id, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]),
      db.execute(`SELECT id, number, amount_due, client_name, due_date FROM invoices WHERE account_id = ? AND status NOT IN ('paid','void') AND due_date < ? ORDER BY due_date ASC LIMIT 5`,
        [account_id, targetDate]),
    ]);

    const dayEvs = dayEvents.rows;
    const weekEvs = weekEvents.rows;

    // Detect conflicts (same assignee, overlapping times)
    const conflicts = [];
    for (let i = 0; i < dayEvs.length; i++) {
      for (let j = i + 1; j < dayEvs.length; j++) {
        const a = dayEvs[i], b = dayEvs[j];
        if (a.assigned_to && b.assigned_to && a.assigned_to === b.assigned_to && a.time && b.time) {
          const aEnd = a.end_time || a.time;
          const bStart = b.time;
          if (aEnd > bStart) {
            conflicts.push({ event1: a.title, event2: b.title, assignee: a.assigned_to, time: a.time });
          }
        }
      }
    }

    // Detect gaps (unscheduled blocks > 2 hours between 8am-6pm)
    const gaps = [];
    if (dayEvs.length > 0) {
      const times = dayEvs.filter(e => e.time).map(e => ({ start: e.time, end: e.end_time || e.time })).sort((a, b) => a.start.localeCompare(b.start));
      let lastEnd = '08:00';
      for (const t of times) {
        const gapMins = (parseInt(t.start.split(':')[0]) * 60 + parseInt(t.start.split(':')[1])) - (parseInt(lastEnd.split(':')[0]) * 60 + parseInt(lastEnd.split(':')[1]));
        if (gapMins >= 120) gaps.push({ from: lastEnd, to: t.start, minutes: gapMins });
        if (t.end > lastEnd) lastEnd = t.end;
      }
    }

    // Revenue metrics
    const todayRevenue = dayEvs.reduce((s, e) => s + parseFloat(e.estimated_revenue || 0), 0);
    const weekRevenue = weekEvs.reduce((s, e) => s + parseFloat(e.estimated_revenue || 0), 0);
    const unconfirmed = dayEvs.filter(e => !e.job_confirmed).length;

    // Team utilization
    const assignees = {};
    weekEvs.forEach(e => {
      if (e.assigned_to) {
        if (!assignees[e.assigned_to]) assignees[e.assigned_to] = { jobs: 0, revenue: 0 };
        assignees[e.assigned_to].jobs++;
        assignees[e.assigned_to].revenue += parseFloat(e.estimated_revenue || 0);
      }
    });

    // Risk score for the day (0-100)
    let riskScore = 0;
    if (conflicts.length > 0) riskScore += conflicts.length * 15;
    if (unconfirmed > 0) riskScore += unconfirmed * 10;
    if (dayEvs.length > 8) riskScore += 20; // overloaded
    riskScore = Math.min(100, riskScore);

    // Generate AI recommendations
    const recommendations = [];
    if (conflicts.length > 0) {
      conflicts.forEach(c => recommendations.push({ type: 'conflict', priority: 'high', text: `Scheduling conflict: ${c.event1} and ${c.event2} overlap for ${c.assignee}` }));
    }
    if (gaps.length > 0) {
      gaps.forEach(g => recommendations.push({ type: 'gap', priority: 'medium', text: `${Math.round(g.minutes/60)}hr gap available ${g.from}-${g.to} — consider booking a follow-up or maintenance call` }));
    }
    if (unconfirmed > 0) recommendations.push({ type: 'confirm', priority: 'medium', text: `${unconfirmed} appointment${unconfirmed > 1 ? 's' : ''} not yet confirmed — contact customers to confirm` });
    if (overdueInvoices.rows.length > 0) recommendations.push({ type: 'invoice', priority: 'high', text: `${overdueInvoices.rows.length} overdue invoice${overdueInvoices.rows.length > 1 ? 's' : ''} — send payment reminders` });

    res.json({
      date: targetDate,
      today: {
        total_events: dayEvs.length,
        projected_revenue: Math.round(todayRevenue * 100) / 100,
        conflicts: conflicts.length,
        gaps: gaps.length,
        unconfirmed,
        risk_score: riskScore,
        risk_label: riskScore >= 60 ? 'High Risk' : riskScore >= 30 ? 'Moderate' : 'On Track',
      },
      week: {
        total_events: weekEvs.length,
        projected_revenue: Math.round(weekRevenue * 100) / 100,
        team_utilization: Object.keys(assignees).length,
      },
      conflicts,
      gaps,
      recommendations,
      overdue_invoices: overdueInvoices.rows,
      team: assignees,
    });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── PATCH /api/calendar/:id/confirm — quick-confirm a job ─────────
router.patch('/:id/confirm', requireAuth, async (req, res) => {
  try {
    const ev = await db.execute(`SELECT * FROM calendar_events WHERE id = ?`, [req.params.id]);
    if (!ev.rows.length) return res.status(404).json({ error: 'Not found' });
    await assertAccountAccess(ev.rows[0].account_id, req.user.id);
    await db.execute(`UPDATE calendar_events SET job_confirmed = 1, status = 'scheduled' WHERE id = ?`, [req.params.id]);
    const updated = await db.execute(`SELECT * FROM calendar_events WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

export default router;
