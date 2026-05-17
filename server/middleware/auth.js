import { createClient } from '@supabase/supabase-js';

let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return null;
    supabase = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabase;
}

export async function requireAuth(req, res, next) {
  const sb = getSupabase();
  if (!sb) {
    req.user = { id: 'dev-user', email: 'dev@localhost' };
    return next();
  }
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
}

export async function optionalAuth(req, res, next) {
  const sb = getSupabase();
  if (!sb) { req.user = null; return next(); }
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) { req.user = null; return next(); }
  try {
    const { data: { user } } = await sb.auth.getUser(token);
    req.user = user || null;
  } catch { req.user = null; }
  next();
}
