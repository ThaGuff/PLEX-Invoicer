/**
 * Push Notifications API
 * VAPID-based Web Push — works on Chrome/Edge/Firefox/Android PWA
 * iOS 16.4+ supported when installed as PWA
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ── VAPID setup ───────────────────────────────────────────────────
let webpush = null;
async function getWebPush() {
  if (webpush) return webpush;
  const wp = await import('web-push');
  webpush = wp.default || wp;

  const publicKey  = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email      = process.env.VAPID_EMAIL || process.env.SMTP_FROM || 'admin@revanew.io';

  if (publicKey && privateKey) {
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    console.log('✓ VAPID configured — push notifications enabled');
  } else {
    console.warn('⚠ VAPID keys not set — push notifications disabled');
    console.warn('  Run: node -e "require(\'web-push\').generateVAPIDKeys()" to generate keys');
    console.warn('  Then set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL in Railway Variables');
  }
  return webpush;
}

// Initialize on startup
getWebPush().catch(() => {});

// ── GET /api/notifications/vapid-public-key ───────────────────────
router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push notifications not configured', configured: false });
  res.json({ publicKey: key, configured: true });
});

// ── POST /api/notifications/subscribe ────────────────────────────
router.post('/subscribe', requireAuth, async (req, res) => {
  const { subscription, account_id } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'subscription required' });

  try {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    await db.execute(
      `INSERT INTO push_subscriptions (id, user_id, account_id, endpoint, p256dh, auth, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, updated_at = NOW()`,
      [id, req.user.id, account_id || null,
       subscription.endpoint,
       subscription.keys?.p256dh || '',
       subscription.keys?.auth   || '']
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/notifications/subscribe ──────────────────────────
router.delete('/subscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  try {
    await db.execute(`DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?`, [endpoint, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/notifications/send (internal — called by automation runner) ──
router.post('/send', requireAuth, async (req, res) => {
  const { user_id, account_id, title, body, url, tag } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  try {
    const wp = await getWebPush();
    if (!process.env.VAPID_PUBLIC_KEY) return res.status(503).json({ error: 'VAPID not configured' });

    // Get subscriptions for this user/account
    const query = user_id
      ? `SELECT * FROM push_subscriptions WHERE user_id = ?`
      : `SELECT * FROM push_subscriptions WHERE account_id = ?`;
    const subs = await db.execute(query, [user_id || account_id]);

    const payload = JSON.stringify({ title, body: body || '', url: url || '/', tag: tag || 'revanew' });
    const results = { sent: 0, failed: 0, expired: 0 };

    for (const sub of subs.rows) {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400, urgency: 'normal' }
        );
        results.sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          // Subscription expired — clean up
          await db.execute(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [sub.endpoint]);
          results.expired++;
        } else {
          results.failed++;
        }
      }
    }

    res.json({ ok: true, ...results, total: subs.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export { getWebPush };
export default router;
