/**
 * Auth routes — Supabase handles the OAuth flow itself.
 * These endpoints let the frontend exchange tokens, get the current user,
 * and manage subscriptions. Supabase's Google/Apple providers are
 * configured in the Supabase dashboard — no code needed for the OAuth
 * redirect flow. These routes handle pre/post-auth tasks.
 */
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/schema.js';

const router = Router();

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/auth/me — returns current user + their account
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    // Find or create an account tied to this user
    let account = await db.execute(
      `SELECT * FROM accounts WHERE owner_id = ?`, [user.id]
    );
    if (!account.rows.length) {
      // Auto-create account on first login
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Business';
      const initial = name[0]?.toUpperCase() || 'A';
      const id = `acc-${user.id.replace(/-/g, '').slice(0, 12)}`;
      await db.execute(
        `INSERT OR IGNORE INTO accounts (id, owner_id, name, email, logo_initial, primary_color, plan)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, user.id, name, user.email, initial, '#13B5EA', 'starter']
      );
      account = await db.execute(`SELECT * FROM accounts WHERE owner_id = ?`, [user.id]);
    }
    res.json({ user, account: account.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/signout — server-side signout (mostly informational, client handles it)
router.post('/signout', requireAuth, (req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/session-check — lightweight ping to verify token validity
router.get('/session-check', requireAuth, (req, res) => {
  res.json({ valid: true, user_id: req.user.id });
});

export default router;
