import express       from 'express';
import path           from 'path';
import { fileURLToPath } from 'url';
import helmet         from 'helmet';
import rateLimit      from 'express-rate-limit';
import { initDB, initSchemaV2, initStripeConnect } from './server/db/schema.js';
import { startDbHealthMonitor, getDbHealth } from './server/db/healthcheck.js';
import { requireAuth, sanitizeRequest } from './server/middleware/auth.js';
import { requirePlanFeature } from './server/middleware/planGuard.js';
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
import taxRouter          from './server/routes/tax.js';
import automationsRouter  from './server/routes/automations.js';
import { scrapeWithOpenAI } from './server/scrape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4173;

const app = express();

// Trust Railway's proxy so X-Forwarded-For headers are used correctly
// by express-rate-limit and other middleware.
app.set('trust proxy', 1); // 1 = trust exactly Railway's single nginx proxy hop

// ── Security headers (helmet) ─────────────────────────────────────
// ── Security headers ─────────────────────────────────────────────
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

// ── System health endpoint ───────────────────────────────────────
app.get('/health', (req, res) => {
  const dbHealth = getDbHealth();
  const status = dbHealth.healthy ? 200 : 503;
  res.status(status).json({
    status: dbHealth.healthy ? 'ok' : 'degraded',
    db: dbHealth,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

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
app.post('/api/scrape', requireAuth, requirePlanFeature('ai_parse'), strictLimiter, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  // SSRF prevention: only allow http/https public URLs
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only http/https URLs allowed' });
    }
    const hostname = parsed.hostname;
    // Block internal/private addresses
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname)) {
      return res.status(400).json({ error: 'Internal URLs not allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
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
  const { plan = 'pro', winback = false } = req.body;
  const origin = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';

  // Plan config — uses STRIPE_PRICE_* env vars if set (real Stripe price IDs),
  // otherwise creates a one-time price dynamically for trial/checkout
  const PLAN_AMOUNTS = { starter: 1900, pro: 4900, agency: 9900 }; // cents/month
  const PLAN_NAMES   = { starter: 'Revanew Starter', pro: 'Revanew Pro', agency: 'Revanew Agency' };
  const PLAN_ENV     = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro:     process.env.STRIPE_PRICE_PRO,
    agency:  process.env.STRIPE_PRICE_AGENCY,
  };

  if (!PLAN_AMOUNTS[plan]) return res.status(400).json({ error: `Unknown plan: ${plan}` });

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    // Use configured price ID if valid (not a placeholder)
    let priceId = PLAN_ENV[plan];
    const isValidPriceId = priceId && priceId.startsWith('price_') && priceId.length > 10 && !priceId.includes('...');

    if (!isValidPriceId) {
      // Create a recurring price dynamically
      const price = await stripe.prices.create({
        currency:   'usd',
        unit_amount: PLAN_AMOUNTS[plan],
        recurring:  { interval: 'month' },
        product_data: { name: PLAN_NAMES[plan] },
      });
      priceId = price.id;
    }

    const { db } = await import('./server/db/schema.js');
    // Get or create Stripe customer for this user
    const accRows = await db.execute(
      `SELECT id, stripe_customer_id, email, name FROM accounts WHERE owner_id = ? LIMIT 1`,
      [req.user.id]
    );
    const acc = accRows.rows[0];
    let customerId = acc?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name:  acc?.name || req.user.user_metadata?.full_name || req.user.email,
        metadata: { user_id: req.user.id, account_id: acc?.id || '' },
      });
      customerId = customer.id;
      if (acc?.id) {
        await db.execute(
          `UPDATE accounts SET stripe_customer_id = ? WHERE id = ?`,
          [customerId, acc.id]
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: winback ? 0 : 7,
        metadata: { plan, user_id: req.user.id, account_id: acc?.id || '', winback: winback ? '1' : '0' },
        ...(winback ? {
          // 50% off first month for win-back customers
          coupon: await (async () => {
            const coupon = await stripe.coupons.create({
              percent_off: 50, duration: 'once',
              name: 'Revanew Welcome Back — 50% off',
              max_redemptions: 1,
            });
            return coupon.id;
          })(),
        } : {}),
      },
      success_url: `${origin}/dashboard?subscribed=1&plan=${plan}`,
      cancel_url:  `${origin}/billing?cancelled=1`,
      metadata: { user_id: req.user.id, plan, account_id: acc?.id || '' },
      allow_promotion_codes: true,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('Billing checkout error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Billing portal — let users manage their subscription
app.post('/api/billing/portal', requireAuth, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(503).json({ error: 'Stripe not configured' });
  const { db } = await import('./server/db/schema.js');
  try {
    const acc = await db.execute(`SELECT stripe_customer_id, email, name FROM accounts WHERE owner_id = ?`, [req.user.id]);
    let customerId = acc.rows[0]?.stripe_customer_id;

    // Create Stripe customer if they don't have one yet
    if (!customerId) {
      const Stripe2 = (await import('stripe')).default;
      const stripe2 = new Stripe2(stripeKey);
      const cust = await stripe2.customers.create({
        email: req.user.email,
        name:  acc.rows[0]?.name || req.user.user_metadata?.full_name || req.user.email,
        metadata: { user_id: req.user.id },
      });
      customerId = cust.id;
      if (acc.rows[0]) {
        await db.execute(
          `UPDATE accounts SET stripe_customer_id = ? WHERE owner_id = ?`,
          [customerId, req.user.id]
        );
      }
    }
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

// ── AI Insights Summary ─────────────────────────────────────────
app.post('/api/ai/insights-summary', requireAuth, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ summary: 'Connect your OpenAI key in Railway variables to enable AI analysis.' });
  const { insights } = req.body;
  try {
    const prompt = `You are a business revenue advisor for a service business using Revanew. 
Analyze this data and give 2-3 actionable insights in 80 words max. Be direct, specific, and encouraging.

Data:
- Quote acceptance rate: ${insights.accRate}%
- Predicted revenue (next 30 days): $${insights.predicted30}
- Revenue at risk (ghosting): $${insights.atRisk}
- Overdue invoices: $${insights.overdueTotal} (${insights.overdueCount} invoices)
- Quotes showing ghosting risk: ${insights.ghostingRisk?.length || 0}
- High-probability closes: ${insights.highProbability}

Write 2-3 specific next actions the owner should take today.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    res.json({ summary: data.choices?.[0]?.message?.content || 'Unable to generate summary.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.use('/api/analytics',    requireAuth, analyticsRouter);
app.use('/api/v1/integrations', requireAuth, integrationsRouter);
app.use('/api/tax',            requireAuth, taxRouter);
app.use('/api/automations',    requireAuth, automationsRouter);
app.use('/api/accounts',     requireAuth, accountsRouter);
app.use('/api/contacts', requireAuth, contactsRouter);
app.use('/api/quotes',   requireAuth, quotesRouter);
app.use('/api/invoices', requireAuth, invoicesRouter);

// ── Static files ──────────────────────────────────────────────────
const distDir = path.join(__dirname, 'dist');

// Service Worker — must be served with correct MIME type and no-cache headers
// so the browser always gets the latest version
app.get('/sw.js', (req, res) => {
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Service-Worker-Allowed': '/',
  });
  res.sendFile(path.join(distDir, 'sw.js'));
});

// Manifest — no cache so icon/name changes propagate
app.get('/manifest.json', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, 'manifest.json'));
});
// Serve PWA verification files — dotfiles must be explicitly allowed
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow' }));
app.use(express.static(distDir, { dotfiles: 'allow' }));
// SPA catch-all — must come AFTER static
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

initDBWithRetry().then(() => {
  startDbHealthMonitor();

  // ── Automation cron — runs every 5 minutes ──────────────────
  // Processes pending automation_runs and smart_reminders
  const runAutomationQueue = async () => {
    try {
      const { db } = await import('./server/db/schema.js');
      const now = new Date().toISOString();

      // Get pending automation runs due now
      const pending = await db.execute(`
        SELECT r.id, r.sequence_id, r.step_id, r.invoice_id, r.quote_id, r.contact_id,
               s.channel, s.subject, s.body, s.discount_pct,
               seq.account_id,
               COALESCE(i.client_name, q.client_name, c.name) as client_name,
               COALESCE(i.client_email, q.client_email, c.email) as client_email,
               COALESCE(i.number, q.number) as doc_number,
               acc.name as agency_name
        FROM automation_runs r
        JOIN automation_steps s  ON r.step_id = s.id
        JOIN automation_sequences seq ON r.sequence_id = seq.id
        JOIN accounts acc ON seq.account_id = acc.id
        LEFT JOIN invoices i  ON r.invoice_id = i.id
        LEFT JOIN quotes q    ON r.quote_id = q.id
        LEFT JOIN contacts c  ON r.contact_id = c.id
        WHERE r.status = 'pending' AND r.scheduled_at <= ?
        LIMIT 20
      `, [now]);

      for (const run of pending.rows) {
        if (!run.client_email) {
          await db.execute(`UPDATE automation_runs SET status = 'skipped', error = 'no_email' WHERE id = ?`, [run.id]);
          continue;
        }

        // Personalize message
        const body = (run.body || '')
          .replace('{client_name}', run.client_name || 'there')
          .replace('{agency_name}', run.agency_name || 'us')
          .replace('{doc_number}', run.doc_number || '')
          .replace('{discount_pct}', run.discount_pct || '10');

        // Send email
        const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_PORT } = process.env;
        if (SMTP_HOST && SMTP_USER) {
          try {
            const nodemailer = (await import('nodemailer')).default;
            const port = parseInt(SMTP_PORT) || 587;
            const transporter = nodemailer.createTransport({
              host: SMTP_HOST, port, secure: port === 465,
              auth: { user: SMTP_USER, pass: SMTP_PASS },
            });
            await transporter.sendMail({
              from:    SMTP_FROM || SMTP_USER,
              to:      run.client_email,
              subject: (run.subject || 'Following up').replace('{client_name}', run.client_name || 'there'),
              text:    body,
              html:    '<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><p>' + body.split('\n').join('<br>') + '</p><hr><p style="color:#999;font-size:11px">Powered by Revanew · Unsubscribe</p></div>',
            });
            await db.execute(`UPDATE automation_runs SET status = 'sent', sent_at = ? WHERE id = ?`, [new Date().toISOString(), run.id]);
            console.log(`✅ Automation run ${run.id} sent to ${run.client_email}`);
          } catch (emailErr) {
            await db.execute(`UPDATE automation_runs SET status = 'error', error = ? WHERE id = ?`, [emailErr.message.slice(0,200), run.id]);
          }
        } else {
          await db.execute(`UPDATE automation_runs SET status = 'skipped', error = 'smtp_not_configured' WHERE id = ?`, [run.id]);
        }
      }
    } catch (e) {
      console.error('Automation cron error:', e.message);
    }
  };

  // Run immediately then every 5 minutes
  setTimeout(runAutomationQueue, 10000); // 10s after startup
  setInterval(runAutomationQueue, 5 * 60 * 1000); // every 5min
});
