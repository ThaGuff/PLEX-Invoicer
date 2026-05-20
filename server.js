import express       from 'express';
import path           from 'path';
import { fileURLToPath } from 'url';
import helmet         from 'helmet';
import rateLimit      from 'express-rate-limit';
import { initDB, initSchemaV2, initStripeConnect } from './server/db/schema.js';
import { requireAuth, sanitizeRequest } from './server/middleware/auth.js';
import accountsRouter from './server/routes/accounts.js';
import contactsRouter from './server/routes/contacts.js';
import quotesRouter  from './server/routes/quotes.js';
import invoicesRouter from './server/routes/invoices.js';
import authRouter from './server/routes/auth.js';
import adminRouter       from './server/routes/admin.js';
import trackingRouter    from './server/routes/tracking.js';
import aiRouter          from './server/routes/ai.js';
import analyticsRouter   from './server/routes/analytics.js';
import integrationsRouter from './server/routes/integrations.js';
import stripeConnectRouter from './server/routes/stripe-connect.js';
import { scrapeWithOpenAI } from './server/scrape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4173;

const app = express();

// Trust Railway's proxy so X-Forwarded-For headers are used correctly
// by express-rate-limit and other middleware.
app.set('trust proxy', true);

// ── Security headers (helmet) ─────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://cdn.jsdelivr.net"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc:  ["'self'", "https://*.supabase.co", "https://api.openai.com", "https://api.stripe.com", "https://js.stripe.com"],
      frameSrc:    ["'self'", "https://js.stripe.com"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // needed for Stripe embedded
  hsts: {
    maxAge: 31536000,           // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// Remove fingerprinting header
app.disable('x-powered-by');

// ── Rate limiting ────────────────────────────────────────────────
// General API rate limit
const apiLimiter = rateLimit({
  windowMs:  15 * 60 * 1000, // 15 minutes
  max:       300,             // 300 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders:  false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.ip === '127.0.0.1', // skip localhost
});

// Strict limit for auth-adjacent routes
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      20,              // 20 attempts per hour per IP
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders:  false,
});

// Email/reminder endpoints (prevent spam)
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      10,              // 10 emails per hour per IP
  message: { error: 'Email rate limit exceeded. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders:  false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', strictLimiter);
app.use('/api/invoices/*/remind', emailLimiter);
app.use('/api/invoices/*/send',   emailLimiter);
app.use('/api/analytics/run-reminders', emailLimiter);

// ── Request security ─────────────────────────────────────────────
// Block requests with suspicious content types
app.use((req, res, next) => {
  // Enforce JSON content-type for API POST/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.path.startsWith('/api/')) {
    const ct = req.headers['content-type'] || '';
    if (req.path !== '/api/stripe-connect/webhook' && !ct.includes('application/json') && !ct.includes('multipart/')) {
      // Allow missing content-type for empty bodies
      const hasBody = parseInt(req.headers['content-length'] || '0') > 0;
      if (hasBody && !ct.includes('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
      }
    }
  }
  next();
});

// ── CORS ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.APP_URL,
  'https://plex-invoicer.up.railway.app',
  'http://localhost:4173',
  'http://localhost:5173',
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Same-origin request — allow
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});


// Raw body needed for Stripe webhook signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));
app.use(sanitizeRequest); // strip XSS and injection from all request bodies

// ── Public routes (no auth) ───────────────────────────────────────
app.use('/api/auth', authRouter);

// Public quote/invoice portals — accessed by clients, no login
app.get('/api/quotes/public/:token', async (req, res) => {
  const { db } = await import('./server/db/schema.js');
  try {
    const quote = await db.execute(
      `SELECT q.*, a.name as agency_name, a.email as agency_email,
              a.phone as agency_phone, a.website as agency_website,
              a.primary_color, a.logo_initial, a.logo_url
       FROM quotes q JOIN accounts a ON q.account_id = a.id
       WHERE q.public_token = ?`, [req.params.token]
    );
    if (!quote.rows.length) return res.status(404).json({ error: 'Quote not found' });
    const items = await db.execute(
      `SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`, [quote.rows[0].id]
    );
    if (!quote.rows[0].viewed_at) {
      await db.execute(`UPDATE quotes SET viewed_at = datetime('now') WHERE id = ?`, [quote.rows[0].id]);
    }
    res.json({ ...quote.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quotes/public/:token/accept', async (req, res) => {
  const { db } = await import('./server/db/schema.js');
  try {
    const quote = await db.execute(`SELECT * FROM quotes WHERE public_token = ?`, [req.params.token]);
    if (!quote.rows.length) return res.status(404).json({ error: 'Not found' });
    if (quote.rows[0].status === 'accepted') return res.json({ already: true });
    await db.execute(
      `UPDATE quotes SET status = 'accepted', accepted_at = datetime('now') WHERE public_token = ?`,
      [req.params.token]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/invoices/public/:token', async (req, res) => {
  const { db } = await import('./server/db/schema.js');
  try {
    const inv = await db.execute(
      `SELECT i.*, a.name as agency_name, a.email as agency_email,
              a.phone as agency_phone, a.website as agency_website,
              a.primary_color, a.logo_initial, a.logo_url
       FROM invoices i JOIN accounts a ON i.account_id = a.id
       WHERE i.public_token = ?`, [req.params.token]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const items = await db.execute(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`, [inv.rows[0].id]
    );
    if (!inv.rows[0].viewed_at) {
      await db.execute(`UPDATE invoices SET viewed_at = datetime('now') WHERE id = ?`, [inv.rows[0].id]);
    }
    res.json({ ...inv.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Stripe webhook (public — verified by signature) ───────────────
app.post('/api/webhooks/stripe', async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey) return res.status(503).send('Stripe not configured');
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    let event = req.body;
    if (webhookSecret) {
      const sig = req.headers['stripe-signature'];
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (e) {
        return res.status(400).send(`Webhook signature failed: ${e.message}`);
      }
    } else {
      event = JSON.parse(req.body);
    }
    const { db } = await import('./server/db/schema.js');
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const sub = event.data.object;
      await db.execute(
        `UPDATE accounts SET stripe_subscription_id = ?, subscription_status = ? WHERE stripe_customer_id = ?`,
        [sub.id, sub.status, sub.customer]
      );
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      await db.execute(
        `UPDATE accounts SET subscription_status = 'cancelled' WHERE stripe_customer_id = ?`,
        [sub.customer]
      );
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      if (userId) {
        await db.execute(
          `UPDATE accounts SET stripe_customer_id = ?, stripe_subscription_id = ?, subscription_status = 'active' WHERE owner_id = ?`,
          [session.customer, session.subscription, userId]
        );
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(500).send(e.message);
  }
});

// ── OpenAI scraper proxy (no auth required — uses server API key only) ───
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  const result = await scrapeWithOpenAI(url);
  if (result.success) {
    res.json(result);
  } else {
    res.status(503).json({ error: result.error });
  }
});

// ── Stripe subscription checkout ──────────────────────────────────
app.post('/api/billing/create-checkout', requireAuth, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY.' });
  const { plan = 'pro' } = req.body;
  const origin = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';
  const PLANS = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro:     process.env.STRIPE_PRICE_PRO,
    agency:  process.env.STRIPE_PRICE_AGENCY,
  };
  const priceId = PLANS[plan];
  if (!priceId) return res.status(400).json({ error: `Unknown plan "${plan}" or price not configured` });
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?subscribed=1`,
      cancel_url:  `${origin}/dashboard?cancelled=1`,
      metadata: { user_id: req.user.id },
      allow_promotion_codes: true,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Billing portal — let users manage their subscription
app.post('/api/billing/portal', requireAuth, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(503).json({ error: 'Stripe not configured' });
  const { db } = await import('./server/db/schema.js');
  try {
    const acc = await db.execute(`SELECT stripe_customer_id FROM accounts WHERE owner_id = ?`, [req.user.id]);
    const customerId = acc.rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No Stripe customer found' });
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    const origin = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard`,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Protected API routes ──────────────────────────────────────────
app.use('/api/track',        trackingRouter);
app.use('/api/admin',        requireAuth, adminRouter);
app.use('/api/stripe-connect', stripeConnectRouter); // callback is public
app.use('/api/ai',           requireAuth, aiRouter);
app.use('/api/analytics',    requireAuth, analyticsRouter);
app.use('/api/v1/integrations', requireAuth, integrationsRouter);
app.use('/api/accounts',     requireAuth, accountsRouter);
app.use('/api/contacts', requireAuth, contactsRouter);
app.use('/api/quotes',   requireAuth, quotesRouter);
app.use('/api/invoices', requireAuth, invoicesRouter);

// ── Static files ──────────────────────────────────────────────────
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

// ── Start ─────────────────────────────────────────────────────────
// Start HTTP server FIRST so Railway healthcheck passes immediately.
// DB schema init runs after server is accepting requests.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 PLEX Invoicer running on :${PORT}`);
  console.log(`   OpenAI:    ${process.env.OPENAI_API_KEY         ? '✓ set' : '✗ not set — website scraping disabled'}`);
  console.log(`   Supabase:  ${process.env.SUPABASE_URL           ? '✓ set' : '✗ not set — running in dev mode (no auth)'}`);
  console.log(`   Stripe:    ${process.env.STRIPE_SECRET_KEY      ? '✓ set' : '✗ not set — payments disabled'}`);
  console.log(`   SMTP:      ${process.env.SMTP_HOST              ? '✓ set' : '✗ not set — email reminders disabled'}`);
  console.log(`   App URL:   ${process.env.APP_URL                || 'not set (using relative URLs)'}\n`);
});

// Init DB schema in background with retries — never crashes the server
async function initDBWithRetry(attempts = 5, delayMs = 3000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await initDB();
      await initSchemaV2();
      await initStripeConnect();
      console.log('✓ Database schema ready');
      return;
    } catch (e) {
      console.error(`DB init attempt ${i}/${attempts} failed: ${e.message}`);
      if (i < attempts) {
        console.log(`  Retrying in ${delayMs/1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  console.error('⚠️  DB schema init failed after all attempts — app running with limited DB functionality');
}

initDBWithRetry();
