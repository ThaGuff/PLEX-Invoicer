/**
 * User Profile & Presence System
 * Full active-directory-style user management across the platform
 * 
 * Routes:
 *   GET    /api/profiles/me           — get own profile
 *   PATCH  /api/profiles/me           — update own profile  
 *   GET    /api/profiles/:userId       — get any user's profile
 *   POST   /api/profiles/presence      — heartbeat / update presence
 *   GET    /api/profiles/presence/:accountId — get all presence for account
 *   GET    /api/notifications          — get notification inbox
 *   PATCH  /api/notifications/:id/read — mark notification read
 *   PATCH  /api/notifications/read-all — mark all read
 * 
 *   GET    /api/workspace/accept/:token — accept invite (public, no auth needed)
 *   POST   /api/workspace/decline/:token — decline invite
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail, buildMentionHtml } from '../utils/email.js';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────
function sanitize(str, max = 200) {
  if (!str) return null;
  return String(str).trim().slice(0, max);
}

async function ensureProfile(userId, email, displayName) {
  const existing = await db.execute(`SELECT id FROM user_profiles WHERE user_id = ?`, [userId]);
  if (existing.rows.length) return existing.rows[0];
  
  const id = `prof-${userId}`;
  await db.execute(
    `INSERT INTO user_profiles (id, user_id, display_name, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [id, userId, displayName || email?.split('@')[0] || 'User']
  );
  return { id };
}

async function getProfile(userId) {
  // Returns profile including username
  const r = await db.execute(
    `SELECT up.*, am.role, am.account_id, am.status as member_status
     FROM user_profiles up
     LEFT JOIN account_members am ON am.user_id = up.user_id AND am.status = 'active'
     WHERE up.user_id = ?
     LIMIT 1`,
    [userId]
  );
  return r.rows[0] || null;
}

async function sendNotification({ userId, accountId, type, title, body, url }) {
  try {
    const { v4: uuid } = await import('uuid');
    await db.execute(
      `INSERT INTO notification_log (id, user_id, account_id, type, title, body, url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [`notif-${uuid()}`, userId, accountId, type, title, body, url]
    );
  } catch (e) {
    console.warn('[Notification] Log failed:', e.message);
  }
}

// ── GET /me ───────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    await ensureProfile(req.user.id, req.user.email, req.user.user_metadata?.full_name);
    const profile = await getProfile(req.user.id);
    const presence = await db.execute(
      `SELECT status, custom_status, last_seen FROM user_presence WHERE user_id = ?`,
      [req.user.id]
    );
    const accounts = await db.execute(
      `SELECT a.id, a.name, a.logo_url, a.primary_color, am.role, am.status
       FROM accounts a
       JOIN account_members am ON am.account_id = a.id
       WHERE am.user_id = ? AND am.status = 'active'
       UNION
       SELECT id, name, logo_url, primary_color, 'owner' as role, 'active' as status
       FROM accounts WHERE owner_id = ?`,
      [req.user.id, req.user.id]
    );
    
    res.json({
      ...req.user,
      profile: profile || {},
      presence: presence.rows[0] || { status: 'online' },
      accounts: accounts.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /me ─────────────────────────────────────────────────────
router.patch('/me', requireAuth, async (req, res) => {
  try {
    await ensureProfile(req.user.id, req.user.email, req.user.user_metadata?.full_name);
    const { display_name, username, avatar_url, title, phone, bio, timezone, notification_email, notification_push, notification_mentions } = req.body;
    
    // Validate username: alphanumeric + underscore only, 3-30 chars
    if (username !== undefined && username !== null) {
      const uname = username.trim();
      if (uname && !/^[a-zA-Z0-9_]{3,30}$/.test(uname)) {
        return res.status(400).json({ error: 'Username must be 3-30 characters (letters, numbers, underscore only)' });
      }
    }
    
    await db.execute(
      `UPDATE user_profiles SET
        display_name = COALESCE(?, display_name),
        username = COALESCE(?, username),
        avatar_url = COALESCE(?, avatar_url),
        title = COALESCE(?, title),
        phone = COALESCE(?, phone),
        bio = COALESCE(?, bio),
        timezone = COALESCE(?, timezone),
        notification_email = COALESCE(?, notification_email),
        notification_push = COALESCE(?, notification_push),
        notification_mentions = COALESCE(?, notification_mentions),
        updated_at = NOW()
       WHERE user_id = ?`,
      [
        sanitize(display_name), username?.trim() || null, sanitize(avatar_url, 2000), sanitize(title, 100),
        sanitize(phone, 30), sanitize(bio, 500), sanitize(timezone, 50),
        notification_email !== undefined ? (notification_email ? 1 : 0) : null,
        notification_push !== undefined ? (notification_push ? 1 : 0) : null,
        notification_mentions !== undefined ? (notification_mentions ? 1 : 0) : null,
        req.user.id,
      ]
    );
    const updated = await getProfile(req.user.id);
    res.json({ ok: true, profile: updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /:userId ──────────────────────────────────────────────────
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.params.userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const presence = await db.execute(
      `SELECT status, custom_status, last_seen FROM user_presence WHERE user_id = ?`,
      [req.params.userId]
    );
    // Don't expose sensitive notification prefs to other users
    const { notification_email, notification_push, notification_mentions, ...publicProfile } = profile;
    res.json({ ...publicProfile, presence: presence.rows[0] || { status: 'offline' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /presence — heartbeat ────────────────────────────────────
router.post('/presence', requireAuth, async (req, res) => {
  try {
    const { account_id, status = 'online', custom_status } = req.body;
    await db.execute(
      `INSERT INTO user_presence (user_id, account_id, status, custom_status, last_seen, last_active, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         status = EXCLUDED.status,
         custom_status = COALESCE(EXCLUDED.custom_status, user_presence.custom_status),
         account_id = COALESCE(EXCLUDED.account_id, user_presence.account_id),
         last_seen = NOW(),
         last_active = NOW(),
         updated_at = NOW()`,
      [req.user.id, account_id || null, status, custom_status || null]
    );
    res.json({ ok: true, status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /presence/:accountId — all members' presence ─────────────
router.get('/presence/:accountId', requireAuth, async (req, res) => {
  try {
    // Mark users as away if last_seen > 5 min, offline if > 30 min
    await db.execute(
      `UPDATE user_presence SET status = 'away' 
       WHERE status = 'online' AND last_seen < NOW() - INTERVAL '5 minutes'`
    ).catch(() => {});
    await db.execute(
      `UPDATE user_presence SET status = 'offline' 
       WHERE status IN ('online','away') AND last_seen < NOW() - INTERVAL '30 minutes'`
    ).catch(() => {});
    
    const presence = await db.execute(
      `SELECT up.user_id, up.status, up.custom_status, up.last_seen,
              prof.display_name, prof.avatar_url, prof.title,
              am.role, am.invited_email as email
       FROM user_presence up
       LEFT JOIN user_profiles prof ON prof.user_id = up.user_id
       LEFT JOIN account_members am ON am.user_id = up.user_id AND am.account_id = ?
       WHERE up.account_id = ? AND up.status != 'offline'`,
      [req.params.accountId, req.params.accountId]
    );
    res.json(presence.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /notifications — notification inbox ───────────────────────
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    // Ensure profile exists (auto-create on first access)
    await ensureProfile(req.user.id, req.user.email, req.user.user_metadata?.full_name);
    const notifs = await db.execute(
      `SELECT * FROM notification_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = notifs.rows.filter(n => !n.read_at).length;
    res.json({ notifications: notifs.rows, unread });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /notifications/read-all — MUST be before /:id/read ─────
router.patch('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await db.execute(
      `UPDATE notification_log SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /notifications/:id/read ────────────────────────────────
router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await db.execute(
      `UPDATE notification_log SET read_at = NOW() WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export { ensureProfile, getProfile, sendNotification };
export default router;
