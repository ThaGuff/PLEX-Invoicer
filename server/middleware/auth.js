import { createClient } from '@supabase/supabase-js';

// ── Input sanitization ────────────────────────────────────────────
// Strip dangerous characters from string inputs to prevent injection
export function sanitizeString(str, maxLen = 1000) {
  if (typeof str !== 'string') return str;
  return str
    .slice(0, maxLen)
    .replace(/<script[^>]*>.*?<\/script>/gi, '')  // remove script tags
    .replace(/javascript:/gi, '')                   // remove js: protocol
    .replace(/on\w+\s*=/gi, '')                    // remove event handlers
    .trim();
}

// Recursively sanitize all string values in an object
export function sanitizeBody(obj, maxLen = 1000) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') clean[k] = sanitizeString(v, maxLen);
    else if (typeof v === 'object' && v !== null && !Array.isArray(v)) clean[k] = sanitizeBody(v, maxLen);
    else if (Array.isArray(v)) clean[k] = v.map(i => typeof i === 'string' ? sanitizeString(i, maxLen) : i);
    else clean[k] = v;
  }
  return clean;
}

// Middleware: sanitize request body on all API routes
export function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeBody(req.body);
  }
  next();
}

let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return null;
    supabase = createClient(url, key, {
      auth:     { persistSession: false },
      realtime: { params: { eventsPerSecond: 0 } },
      global:   { headers: {} },
    });
    // Disconnect Realtime immediately — server only needs JWT auth, not WebSockets
    try { supabase.realtime.disconnect(); } catch (_) {}
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
