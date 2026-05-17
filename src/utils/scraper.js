/**
 * Calls the server-side /api/scrape proxy, which holds the Anthropic API key
 * and uses Claude's web_search tool to visit and analyze the target URL.
 * The API key never touches the browser.
 */
export async function scrapeWebsite(url) {
  if (!url) return { success: false, error: 'Please enter a URL.' };

  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  try {
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalized }),
      signal: AbortSignal.timeout(45000), // Claude + web search can take 30s+
    });

    const body = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: body.error || `Server error ${res.status}. Please enter your details manually.`,
      };
    }

    return body; // { success: true, data: { businessName, services, ... } }

  } catch (err) {
    if (err.name === 'TimeoutError') {
      return { success: false, error: 'Scan timed out — the site may be slow. Please enter your details manually.' };
    }
    return { success: false, error: 'Could not reach the server. Please enter your details manually.' };
  }
}
