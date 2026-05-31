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
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // Stub WebSocket to prevent Node 20 crash during createClient construction
  const hadWS = !!globalThis.WebSocket;
  if (!hadWS) {
    globalThis.WebSocket = class StubWS {
      constructor() { this.readyState = 3; }
      close() {} addEventListener() {} removeEventListener() {}
      static get CLOSED() { return 3; }
    };
  }
  let client = null;
  try {
    client = createClient(url, key, { auth: { persistSession: false } });
    try { client.realtime.disconnect(); } catch (_) {}
  } finally {
    if (!hadWS) delete globalThis.WebSocket;
  }
  return client;
}

// GET /api/auth/me — returns current user + their primary account
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const account = await db.execute(
      `SELECT * FROM accounts WHERE owner_id = ? ORDER BY created_at ASC LIMIT 1`, [user.id]
    );
    // Account creation is handled by accounts.list() on first load
    res.json({ user, account: account.rows[0] || null });
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
