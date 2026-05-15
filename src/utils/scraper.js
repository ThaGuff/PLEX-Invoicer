/**
 * Scrapes a business website by passing the URL directly to Claude
 * with web_search tool enabled — Claude fetches and analyzes the page
 * natively, bypassing all CORS restrictions entirely.
 */
export async function scrapeWebsite(url) {
  if (!url) return { success: false, error: 'Please enter a URL.' };

  // Normalize URL
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url.replace(/^\/+/, '');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Visit this business website and extract their information: ${url}

Use web search to fetch the page content. Then return ONLY a valid JSON object with NO markdown fences, NO explanation — just raw JSON.

JSON structure to return:
{
  "businessName": "string or null",
  "phone": "string or null",
  "email": "string or null",
  "address": "string or null",
  "services": [
    {
      "name": "service or package name",
      "description": "one sentence description",
      "setupPrice": number or null,
      "monthlyPrice": number or null,
      "oneTimePrice": number or null
    }
  ],
  "pricingFound": true or false,
  "notes": "brief note on what was or wasn't found"
}

Rules:
- Include ALL services or packages you find listed on the site
- If pricing is shown, extract the numbers (numbers only, no $ signs)
- If no pricing is shown, set all price fields to null and pricingFound to false
- Keep descriptions under 120 characters
- Return raw JSON only, absolutely no markdown`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `API error ${response.status}: ${err?.error?.message || 'Unknown error'}. Please enter your details manually.`,
      };
    }

    const data = await response.json();

    // Find the last text block — Claude outputs text after tool use
    const textBlock = [...(data.content || [])]
      .reverse()
      .find(b => b.type === 'text');

    if (!textBlock?.text) {
      return {
        success: false,
        error: 'No content returned from the website scan. Please enter your details manually.',
      };
    }

    // Strip any accidental markdown fences
    const raw = textBlock.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    // Extract JSON object if there's surrounding text
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        error: 'Could not parse website data. Please enter your details manually.',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return { success: true, data: parsed };

  } catch (err) {
    console.error('Scraper error:', err);
    return {
      success: false,
      error: 'Something went wrong during the website scan. Please enter your details manually.',
    };
  }
}
