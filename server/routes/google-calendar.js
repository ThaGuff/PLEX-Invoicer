/**
 * Google Calendar OAuth + Event Sync
 * Imports events from user's Google Calendar into the app's calendar
 *
 * Setup: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Railway Variables
 * Add redirect URI: https://revanew.io/api/google-calendar/callback
 * in Google Cloud Console > APIs > Credentials > OAuth 2.0 Client
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
const REDIRECT = (process.env.APP_URL || 'https://revanew.io') + '/api/google-calendar/callback';

// ── GET /api/google-calendar/auth-url ────────────────────────────
router.get('/auth-url', requireAuth, (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: 'Google Calendar not configured. Set GOOGLE_CLIENT_ID in Railway Variables.' });
  const state = Buffer.from(JSON.stringify({ userId: req.user.id, accountId: req.query.account_id })).toString('base64');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT)}&` +
    `response_type=code&scope=${encodeURIComponent(SCOPES)}&` +
    `access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  res.json({ url });
});

// ── GET /api/google-calendar/callback ────────────────────────────
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const APP_URL = process.env.APP_URL || 'https://revanew.io';
  if (error) return res.redirect(`${APP_URL}/calendar?error=google_denied`);
  if (!code) return res.redirect(`${APP_URL}/calendar?error=no_code`);

  try {
    const { userId, accountId } = JSON.parse(Buffer.from(state, 'base64').toString());
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    // Store tokens
    await db.execute(
      `INSERT INTO google_calendar_tokens (user_id, account_id, access_token, refresh_token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON CONFLICT (user_id) DO UPDATE SET access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token, expires_at = EXCLUDED.expires_at`,
      [userId, accountId, tokens.access_token, tokens.refresh_token || '', new Date(Date.now() + tokens.expires_in * 1000).toISOString()]
    );

    res.redirect(`${APP_URL}/calendar?google=connected`);
  } catch (e) {
    console.error('Google Calendar OAuth error:', e.message);
    res.redirect(`${APP_URL}/calendar?error=oauth_failed`);
  }
});

// ── POST /api/google-calendar/sync ───────────────────────────────
// Imports events from Google Calendar into the app's calendar_events table
router.post('/sync', requireAuth, async (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });

  try {
    // Get stored tokens
    const tokenRow = await db.execute(
      `SELECT * FROM google_calendar_tokens WHERE user_id = ? AND account_id = ?`,
      [req.user.id, account_id]
    );
    if (!tokenRow.rows.length) return res.status(401).json({ error: 'Google Calendar not connected', connected: false });

    let { access_token, refresh_token, expires_at } = tokenRow.rows[0];

    // Refresh token if expired
    if (new Date(expires_at) < new Date()) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ refresh_token, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token' }),
      });
      const newTokens = await refreshRes.json();
      if (newTokens.error) return res.status(401).json({ error: 'Google token expired, please reconnect', connected: false });
      access_token = newTokens.access_token;
      await db.execute(
        `UPDATE google_calendar_tokens SET access_token = ?, expires_at = ? WHERE user_id = ?`,
        [access_token, new Date(Date.now() + newTokens.expires_in * 1000).toISOString(), req.user.id]
      );
    }

    // Fetch events from Google Calendar (next 30 days)
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 86400000).toISOString();
    const gcalRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const gcalData = await gcalRes.json();
    if (gcalData.error) throw new Error(gcalData.error.message);

    let imported = 0, skipped = 0;
    const { v4: uuid } = await import('uuid');

    for (const event of (gcalData.items || [])) {
      const dateStr = event.start?.date || event.start?.dateTime?.split('T')[0];
      const timeStr = event.start?.dateTime?.split('T')[1]?.slice(0,5) || null;
      if (!dateStr) { skipped++; continue; }

      // Skip if already imported (check by google_event_id)
      const existing = await db.execute(
        `SELECT id FROM calendar_events WHERE account_id = ? AND google_event_id = ?`,
        [account_id, event.id]
      );
      if (existing.rows.length) { skipped++; continue; }

      await db.execute(
        `INSERT INTO calendar_events (id, account_id, title, date, time, notes, status, google_event_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [`ev-${uuid()}`, account_id,
         (event.summary || 'Google Calendar Event').slice(0, 200),
         dateStr, timeStr,
         (event.description || '').slice(0, 1000),
         'scheduled', event.id]
      );
      imported++;
    }

    res.json({ ok: true, imported, skipped, total: gcalData.items?.length || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/google-calendar/status ──────────────────────────────
router.get('/status', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  try {
    const row = await db.execute(
      `SELECT expires_at, created_at FROM google_calendar_tokens WHERE user_id = ? AND account_id = ?`,
      [req.user.id, account_id]
    );
    res.json({ connected: row.rows.length > 0, expires_at: row.rows[0]?.expires_at });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
