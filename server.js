import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4173;

app.use(express.json({ limit: '1mb' }));

// ── Anthropic proxy ───────────────────────────────────────────────────────────
// Receives requests from the frontend and forwards them to Anthropic
// with the API key injected server-side. The key never reaches the browser.
app.post('/api/scrape', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY is not set on the server. Add it as a Railway environment variable.',
    });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  // Normalize
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
        messages: [
          {
            role: 'user',
            content: `Visit this business website and extract their information: ${normalized}

Search for and visit the page. Then return ONLY a valid JSON object — no markdown fences, no explanation, just raw JSON.

{
  "businessName": "string or null",
  "phone": "string or null",
  "email": "string or null",
  "address": "string or null",
  "services": [
    {
      "name": "service or package name",
      "description": "one sentence, under 120 chars",
      "setupPrice": number or null,
      "monthlyPrice": number or null,
      "oneTimePrice": number or null
    }
  ],
  "pricingFound": true or false,
  "notes": "brief note on what was or wasn't found"
}

Rules:
- Include ALL services or packages listed on the site
- Extract dollar amounts as plain numbers (no $ signs)
- If no pricing shown, set price fields to null and pricingFound to false
- Return raw JSON only — absolutely no markdown`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errBody?.error?.message || `Anthropic API error ${response.status}`,
      });
    }

    const data = await response.json();

    // Find the last text block — Claude outputs it after tool use completes
    const textBlock = [...(data.content || [])].reverse().find(b => b.type === 'text');

    if (!textBlock?.text) {
      return res.status(500).json({ error: 'No text response from Claude.' });
    }

    // Strip accidental markdown fences, extract JSON object
    const raw = textBlock.text
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({ error: 'Could not parse JSON from Claude response.' });
    }

    const parsed = JSON.parse(match[0]);
    return res.json({ success: true, data: parsed });

  } catch (err) {
    console.error('Scrape proxy error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ── Static files ──────────────────────────────────────────────────────────────
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PLEX Invoicer running on port ${PORT}`);
  console.log(`API key: ${process.env.ANTHROPIC_API_KEY ? 'SET ✓' : 'NOT SET — scraping disabled'}`);
});
