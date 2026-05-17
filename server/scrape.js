/**
 * Website scraper using OpenAI GPT-4o with browsing capability.
 * Called server-side so the OPENAI_API_KEY never reaches the browser.
 */
export async function scrapeWithOpenAI(url) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'OPENAI_API_KEY is not configured on the server.' };
  }

  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  // Step 1: fetch page text server-side (no CORS issue here)
  let pageText = '';
  try {
    const res = await fetch(normalized, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PLEXInvoicer/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const html = await res.text();
      pageText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 12000);
    }
  } catch { /* site may block — fall through to GPT with just the URL */ }

  // Step 2: send to GPT-4o for structured extraction
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1200,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You are a business data extractor. Always respond with raw JSON only — no markdown fences, no explanation.',
          },
          {
            role: 'user',
            content: `Extract business information from this website.
URL: ${normalized}
${pageText ? `Page content (first 12000 chars):\n${pageText}` : 'No page content available — infer from URL if possible.'}

Return ONLY this JSON structure, no markdown:
{
  "businessName": "string or null",
  "phone": "string or null",
  "email": "string or null",
  "address": "string or null",
  "services": [
    {
      "name": "service name",
      "description": "one sentence under 120 chars",
      "setupPrice": number or null,
      "monthlyPrice": number or null,
      "oneTimePrice": number or null
    }
  ],
  "pricingFound": true or false,
  "notes": "brief note on what was or wasn't found"
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: `OpenAI error ${response.status}: ${err?.error?.message || 'Unknown'}` };
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content || '')
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { success: false, error: 'Could not parse response from OpenAI.' };

    return { success: true, data: JSON.parse(match[0]) };
  } catch (e) {
    return { success: false, error: e.message || 'OpenAI request failed.' };
  }
}
