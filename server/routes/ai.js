/**
 * F5: AI hands-free invoice generation
 * Parses raw text/transcripts into structured invoice JSON
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/parse-invoice', requireAuth, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });

  const { text, account_id } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  const prompt = `You are an invoice data extractor for a service business invoicing tool.

Extract structured invoice data from this text or transcript. Handle natural language, shorthand, spoken numbers, abbreviations.

Input: "${text.trim()}"

Return ONLY valid JSON, no markdown, no explanation:
{
  "client_name": "string or null",
  "client_biz": "string or null",
  "client_email": "string or null",
  "notes": "string or null",
  "billing_mode": "one-time or monthly",
  "items": [
    {
      "section_label": "category/section name or null",
      "name": "line item name",
      "description": "brief description or null",
      "setup_price": number (one-time amount, 0 if none),
      "monthly_price": number (recurring amount, 0 if none),
      "quantity": number (default 1),
      "is_included": false
    }
  ],
  "discount_type": "pct or fixed or null",
  "discount_value": number or 0,
  "parsing_notes": "brief note on any ambiguities or assumptions made"
}

Rules:
- "5 hours at $50/hr" = one item, name="Design work", setup_price=250
- "plus $100 flat fee for X" = separate item, setup_price=100
- "monthly retainer of $500" = monthly_price=500, billing_mode="monthly"
- If the person isn't named, set client_name to null
- Quantities multiply into setup_price (5 × $50 = $250 in setup_price)
- Round all prices to 2 decimal places`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0,
        messages: [
          { role: 'system', content: 'You extract invoice data from natural language. Always respond with raw JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(502).json({ error: `OpenAI error: ${err?.error?.message || response.status}` });
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content || '')
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Could not parse AI response' });

    const parsed = JSON.parse(match[0]);
    res.json({ success: true, invoice: parsed });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});


// ── AI Chat Assistant — proxy to Anthropic (keeps API key server-side) ─
router.post('/chat', requireAuth, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY not configured in Railway Variables' });

  const { messages, system } = req.body;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    // Build OpenAI messages format - include system as first message if provided
    const openAiMessages = [];
    if (system) openAiMessages.push({ role: 'system', content: system });
    openAiMessages.push(...messages.slice(-10).map(m => ({ role: m.role, content: m.content })));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 800,
        messages: openAiMessages,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data.error?.message || 'AI error' });
    res.json({ content: data.choices?.[0]?.message?.content || '' });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

export default router;
