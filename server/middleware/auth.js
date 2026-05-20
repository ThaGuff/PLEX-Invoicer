// NOTE: We do NOT use createClient() on the server.
// @supabase/supabase-js initialises Realtime (WebSocket) in its constructor
// which crashes on Node 20 (no native WebSocket). Instead we call the
// Supabase REST API directly to verify JWT tokens — simpler and faster.

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

// Verify Supabase JWT by calling REST API directly — no SDK, no WebSocket
async function verifyToken(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null; // dev mode

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': key,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function requireAuth(req, res, next) {
  const SUPABASE_CONFIGURED = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

  if (!SUPABASE_CONFIGURED) {
    req.user = { id: 'dev-user', email: 'dev@localhost' };
    return next();
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const user = await verifyToken(token);
    if (!user || !user.id) return res.status(401).json({ error: 'Invalid or expired token' });
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
