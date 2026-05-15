/**
 * Scrapes a business website via the Anthropic API and extracts:
 * - Business name, tagline, contact info
 * - Services / pricing if publicly listed
 * - Returns structured data to pre-populate account + catalog
 */
export async function scrapeWebsite(url) {
  if (!url || !url.startsWith('http')) {
    url = 'https://' + url.replace(/^\/+/, '');
  }

  // First fetch the page text via a CORS proxy
  let pageText = '';
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
    if (res.ok) {
      const data = await res.json();
      // Strip HTML tags and collapse whitespace
      pageText = (data.contents || '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000); // cap at 8k chars
    }
  } catch {
    pageText = '';
  }

  if (!pageText) {
    return {
      success: false,
      error: 'Could not fetch the page. The site may block external requests. You can enter your information manually below.',
    };
  }

  // Send to Claude to extract structured info
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Extract business and pricing information from this website text. Return ONLY valid JSON, no markdown, no explanation.

Website URL: ${url}
Website text: ${pageText}

Return this exact JSON structure:
{
  "businessName": "string or null",
  "tagline": "string or null",
  "phone": "string or null",
  "email": "string or null",
  "address": "string or null",
  "services": [
    {
      "name": "service name",
      "description": "brief description",
      "setupPrice": number or null,
      "monthlyPrice": number or null,
      "oneTimePrice": number or null
    }
  ],
  "pricingFound": true or false,
  "notes": "any relevant notes about what was or wasn't found"
}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: 'Could not parse website content. Please enter your information manually.',
    };
  }
}
