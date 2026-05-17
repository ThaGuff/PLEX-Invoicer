/**
 * F1: Granular read status tracking
 * - 1x1 pixel GIF endpoint (email open tracking)
 * - Heartbeat endpoint (time-on-page)
 * - Engagement timeline API for dashboard
 */
import { Router } from 'express';
import { db } from '../db/schema.js';

const router = Router();

// Transparent 1×1 GIF — email open pixel
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'
);

// GET /api/track/:token/open.gif — fires when client opens email
router.get('/:token/open.gif', async (req, res) => {
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store', 'Content-Length': PIXEL.length });
  res.send(PIXEL);
  try {
    const inv = await db.execute(`SELECT id, opened_at, read_status FROM invoices WHERE public_token = ?`, [req.params.token]);
    if (!inv.rows.length) return;
    const id = inv.rows[0].id;
    const now = new Date().toISOString();
    if (!inv.rows[0].opened_at) {
      await db.execute(
        `UPDATE invoices SET opened_at = ?, delivered_at = COALESCE(delivered_at, ?), read_status = 'opened' WHERE id = ?`,
        [now, now, id]
      );
    }
    await db.execute(
      `INSERT INTO invoice_engagement (invoice_id, event, ip, ua) VALUES (?, 'opened', ?, ?)`,
      [id, req.ip, req.headers['user-agent']?.slice(0, 200) || null]
    );
  } catch (e) { console.warn('Tracking pixel error:', e.message); }
});

// POST /api/track/:token/view — client portal loaded (viewed)
router.post('/:token/view', async (req, res) => {
  res.json({ ok: true });
  try {
    const inv = await db.execute(`SELECT id, first_viewed_at, view_count FROM invoices WHERE public_token = ?`, [req.params.token]);
    if (!inv.rows.length) return;
    const { id, first_viewed_at, view_count } = inv.rows[0];
    const now = new Date().toISOString();
    await db.execute(
      `UPDATE invoices SET
         first_viewed_at = COALESCE(first_viewed_at, ?),
         viewed_at = ?,
         view_count = ?,
         read_status = CASE WHEN read_status IN ('sent','delivered','opened') THEN 'viewed' ELSE read_status END
       WHERE id = ?`,
      [now, now, (view_count || 0) + 1, id]
    );
    await db.execute(
      `INSERT INTO invoice_engagement (invoice_id, event, ip, ua) VALUES (?, 'viewed', ?, ?)`,
      [id, req.ip, req.headers['user-agent']?.slice(0, 200) || null]
    );
  } catch (e) { console.warn('View track error:', e.message); }
});

// POST /api/track/:token/heartbeat — called every 30s while portal is open
router.post('/:token/heartbeat', async (req, res) => {
  res.json({ ok: true });
  try {
    const { seconds = 30 } = req.body;
    const inv = await db.execute(`SELECT id FROM invoices WHERE public_token = ?`, [req.params.token]);
    if (!inv.rows.length) return;
    const id = inv.rows[0].id;
    await db.execute(
      `UPDATE invoices SET total_view_seconds = COALESCE(total_view_seconds, 0) + ? WHERE id = ?`,
      [Math.min(seconds, 60), id] // cap at 60s per heartbeat (tab focus sanity check)
    );
    await db.execute(
      `INSERT INTO invoice_engagement (invoice_id, event, duration_seconds) VALUES (?, 'heartbeat', ?)`,
      [id, seconds]
    );
  } catch (e) { console.warn('Heartbeat error:', e.message); }
});

// POST /api/track/:token/click-pay — client clicked the pay button
router.post('/:token/click-pay', async (req, res) => {
  res.json({ ok: true });
  try {
    const inv = await db.execute(`SELECT id FROM invoices WHERE public_token = ?`, [req.params.token]);
    if (!inv.rows.length) return;
    const id = inv.rows[0].id;
    const now = new Date().toISOString();
    await db.execute(
      `UPDATE invoices SET clicked_pay_at = COALESCE(clicked_pay_at, ?), read_status = 'clicked' WHERE id = ?`,
      [now, id]
    );
    await db.execute(
      `INSERT INTO invoice_engagement (invoice_id, event) VALUES (?, 'clicked_pay')`, [id]
    );
  } catch (e) { console.warn('Click-pay track error:', e.message); }
});

// GET /api/track/:invoiceId/timeline — engagement timeline for merchant dashboard
router.get('/:invoiceId/timeline', async (req, res) => {
  try {
    const inv = await db.execute(
      `SELECT id, read_status, sent_at, delivered_at, opened_at,
              first_viewed_at, viewed_at, view_count, total_view_seconds, clicked_pay_at, paid_at
       FROM invoices WHERE id = ?`, [req.params.invoiceId]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Not found' });
    const events = await db.execute(
      `SELECT event, ts, duration_seconds FROM invoice_engagement WHERE invoice_id = ? ORDER BY ts ASC`,
      [req.params.invoiceId]
    );
    res.json({ ...inv.rows[0], events: events.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
