/**
 * Calls the server-side /api/scrape proxy, which uses OpenAI GPT-4o
 * to visit and analyze the target URL. The OPENAI_API_KEY lives on
 * the server only — it never reaches the browser.
 */
export async function scrapeWebsite(url) {
  if (!url) return { success: false, error: 'Please enter a URL.' };
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url: normalized }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    return { success: false, error: data.error || `Server error ${res.status}. Please enter details manually.` };
  } catch (e) {
    if (e.name === 'TimeoutError') return { success: false, error: 'Scan timed out — enter details manually.' };
    return { success: false, error: 'Could not reach the server.' };
  }
}
