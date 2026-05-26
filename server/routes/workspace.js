/**
 * Slack-style Team Workspace API
 * Security: requireAuth, account ownership, message length limit, XSS sanitization
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CHANNEL_NAME_LENGTH = 80;

function sanitizeText(str, maxLen) {
  if (!str) return '';
  return String(str).trim().slice(0, maxLen)
    .replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Basic XSS prevention
}

async function assertAccountAccess(accountId, userId) {
  const r = await db.execute(`SELECT id FROM accounts WHERE id = ? AND owner_id = ?`, [accountId, userId]);
  if (!r.rows.length) throw Object.assign(new Error('Access denied'), { status: 403 });
}

// ── GET /api/workspace/channels/:channelId/messages ───────────────
router.get('/channels/:channelId/messages', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  // Validate channelId format (alphanumeric + hyphens only)
  if (!/^[a-zA-Z0-9_-]+$/.test(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    const msgs = await db.execute(
      `SELECT id, channel_id, content, sender_name, sender_id, created_at
       FROM workspace_messages
       WHERE account_id = ? AND channel_id = ?
       ORDER BY created_at ASC
       LIMIT 200`,
      [account_id, req.params.channelId]
    );
    res.json(msgs.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/workspace/channels/:channelId/messages ─────────────
router.post('/channels/:channelId/messages', requireAuth, async (req, res) => {
  const { account_id, content, sender_name } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });
  if (!/^[a-zA-Z0-9_-]+$/.test(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID' });
  const cleanContent = sanitizeText(content, MAX_MESSAGE_LENGTH);
  const cleanSender  = sanitizeText(sender_name || req.user.email?.split('@')[0] || 'Team member', 100);
  try {
    await assertAccountAccess(account_id, req.user.id);
    const { v4: uuid } = await import('uuid');
    const id = `msg-${uuid()}`;
    await db.execute(
      `INSERT INTO workspace_messages (id, account_id, channel_id, content, sender_name, sender_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, account_id, req.params.channelId, cleanContent, cleanSender, req.user.id]
    );
    const msg = await db.execute(`SELECT * FROM workspace_messages WHERE id = ?`, [id]);
    res.status(201).json(msg.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /api/workspace/channels?account_id= ───────────────────────
router.get('/channels', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    const channels = await db.execute(
      `SELECT * FROM workspace_channels WHERE account_id = ? ORDER BY created_at ASC`,
      [account_id]
    );
    res.json(channels.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/workspace/channels ──────────────────────────────────
router.post('/channels', requireAuth, async (req, res) => {
  const { account_id, name, private: isPrivate = false, desc = '' } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!name?.trim()) return res.status(400).json({ error: 'channel name required' });
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, MAX_CHANNEL_NAME_LENGTH);
  try {
    await assertAccountAccess(account_id, req.user.id);
    const { v4: uuid } = await import('uuid');
    const id = `ch-${uuid()}`;
    await db.execute(
      `INSERT INTO workspace_channels (id, account_id, name, private, desc, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, account_id, safeName, isPrivate ? 1 : 0, sanitizeText(desc, 500), req.user.id]
    );
    const ch = await db.execute(`SELECT * FROM workspace_channels WHERE id = ?`, [id]);
    res.status(201).json(ch.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

export default router;
