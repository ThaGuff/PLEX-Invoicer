import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { initDB } from './server/db/schema.js';
import accountsRouter from './server/routes/accounts.js';
import contactsRouter from './server/routes/contacts.js';
import quotesRouter from './server/routes/quotes.js';
import invoicesRouter from './server/routes/invoices.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4173;

// Ensure data directory exists
mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const app = express();
app.use(express.json({ limit: '2mb' }));

// ── API routes ────────────────────────────────────────────────────
app.use('/api/accounts',  accountsRouter);
app.use('/api/contacts',  contactsRouter);
app.use('/api/quotes',    quotesRouter);
app.use('/api/invoices',  invoicesRouter);

// ── Anthropic proxy (scraper) ─────────────────────────────────────
app.post('/api/scrape', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set on server.' });
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-1',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Visit ${normalized} and extract business info and services. Return ONLY raw JSON — no markdown:\n{"businessName":string,"phone":string,"email":string,"address":string,"services":[{"name":string,"description":string,"setupPrice":number|null,"monthlyPrice":number|null,"oneTimePrice":number|null}],"pricingFound":boolean,"notes":string}`,
        }],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.error?.message || `API error ${response.status}` });
    }
    const data = await response.json();
    const textBlock = [...(data.content || [])].reverse().find(b => b.type === 'text');
    if (!textBlock?.text) return res.status(500).json({ error: 'No text response from Claude.' });
    const raw = textBlock.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Could not parse JSON from response.' });
    res.json({ success: true, data: JSON.parse(match[0]) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Static files ──────────────────────────────────────────────────
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

// ── Start ─────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PLEX Invoicer running on :${PORT}`);
    console.log(`Stripe: ${process.env.STRIPE_SECRET_KEY ? '✓' : '✗ not set'}`);
    console.log(`SMTP: ${process.env.SMTP_HOST ? '✓' : '✗ not set'}`);
    console.log(`Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗ not set'}`);
  });
}).catch(e => { console.error('DB init failed:', e); process.exit(1); });
