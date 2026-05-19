/**
 * Stripe Connect — per-account payment routing
 *
 * Each business connects their own Stripe account via OAuth.
 * Payments go directly to the connected account.
 * PLEX optionally takes a platform application fee.
 *
 * Flow:
 *  1. Merchant clicks "Connect Stripe" in Account Settings
 *  2. GET /api/stripe-connect/oauth-link  → redirect to Stripe OAuth
 *  3. Stripe redirects back to /api/stripe-connect/callback?code=xxx&state=account_id
 *  4. Server exchanges code for connected account ID, stores it
 *  5. All future payment links for that account use the connected account
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return { key, clientId: process.env.STRIPE_CLIENT_ID };
}

// ── GET /api/stripe-connect/status/:accountId ─────────────────────
// Returns current connection status for the account
router.get('/status/:accountId', requireAuth, async (req, res) => {
  try {
    const acc = await db.execute(
      `SELECT stripe_account_id, stripe_onboarded, stripe_charges_enabled,
              stripe_payouts_enabled, stripe_connect_email, platform_fee_pct
       FROM accounts WHERE id = ?`, [req.params.accountId]
    );
    if (!acc.rows.length) return res.status(404).json({ error: 'Account not found' });
    const a = acc.rows[0];

    // If connected, refresh status from Stripe
    if (a.stripe_account_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const stripeAcc = await stripe.accounts.retrieve(a.stripe_account_id);
        const chargesEnabled = stripeAcc.charges_enabled ? 1 : 0;
        const payoutsEnabled = stripeAcc.payouts_enabled ? 1 : 0;
        await db.execute(
          `UPDATE accounts SET stripe_charges_enabled = ?, stripe_payouts_enabled = ?,
           stripe_connect_email = ?, stripe_onboarded = ? WHERE id = ?`,
          [chargesEnabled, payoutsEnabled, stripeAcc.email || null,
           chargesEnabled ? 1 : 0, req.params.accountId]
        );
        return res.json({
          connected:       true,
          account_id:      a.stripe_account_id,
          charges_enabled: !!chargesEnabled,
          payouts_enabled: !!payoutsEnabled,
          email:           stripeAcc.email,
          display_name:    stripeAcc.display_name || stripeAcc.business_profile?.name,
          country:         stripeAcc.country,
          platform_fee_pct: a.platform_fee_pct || 0,
          dashboard_url:   `https://dashboard.stripe.com/${a.stripe_account_id}`,
        });
      } catch (e) {
        // Stripe account may have been disconnected
        if (e.code === 'account_invalid' || e.statusCode === 404) {
          await db.execute(
            `UPDATE accounts SET stripe_account_id = NULL, stripe_onboarded = 0,
             stripe_charges_enabled = 0, stripe_payouts_enabled = 0 WHERE id = ?`,
            [req.params.accountId]
          );
          return res.json({ connected: false, reason: 'Account disconnected from Stripe' });
        }
      }
    }

    res.json({
      connected: !!(a.stripe_account_id && a.stripe_onboarded),
      account_id: a.stripe_account_id || null,
      charges_enabled: !!a.stripe_charges_enabled,
      payouts_enabled: !!a.stripe_payouts_enabled,
      email: a.stripe_connect_email || null,
      platform_fee_pct: a.platform_fee_pct || 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/stripe-connect/oauth-link?account_id=xxx ────────────
// Generates the Stripe OAuth URL for connecting an account
router.get('/oauth-link', requireAuth, async (req, res) => {
  const { key, clientId } = getStripe() || {};
  if (!key) return res.status(503).json({ error: 'STRIPE_SECRET_KEY not configured' });
  if (!clientId) return res.status(503).json({ error: 'STRIPE_CLIENT_ID not configured. Get it from Stripe Dashboard → Connect → Settings.' });

  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });

  const appUrl = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';
  const redirectUri = `${appUrl}/api/stripe-connect/callback`;

  const params = new URLSearchParams({
    response_type:  'code',
    client_id:      clientId,
    scope:          'read_write',
    redirect_uri:   redirectUri,
    state:          account_id,
    'suggested_capabilities[]': 'transfers',
    'stripe_user[email]': req.user?.email || '',
    'stripe_user[country]': 'US',
  });

  const url = `https://connect.stripe.com/oauth/authorize?${params}`;
  res.json({ url });
});

// ── GET /api/stripe-connect/callback ─────────────────────────────
// Stripe redirects here after merchant completes OAuth
router.get('/callback', async (req, res) => {
  const { code, state: accountId, error, error_description } = req.query;
  const appUrl = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';

  if (error) {
    return res.redirect(`${appUrl}/dashboard?stripe_error=${encodeURIComponent(error_description || error)}`);
  }
  if (!code || !accountId) {
    return res.redirect(`${appUrl}/dashboard?stripe_error=missing_params`);
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Exchange authorization code for access token + connected account ID
    const response = await stripe.oauth.token({
      grant_type:   'authorization_code',
      code,
    });

    const connectedAccountId = response.stripe_user_id;

    // Retrieve full account details
    const stripeAcc = await stripe.accounts.retrieve(connectedAccountId);

    await db.execute(
      `UPDATE accounts SET
         stripe_account_id      = ?,
         stripe_onboarded       = 1,
         stripe_charges_enabled = ?,
         stripe_payouts_enabled = ?,
         stripe_connect_email   = ?
       WHERE id = ?`,
      [connectedAccountId,
       stripeAcc.charges_enabled ? 1 : 0,
       stripeAcc.payouts_enabled ? 1 : 0,
       stripeAcc.email || null,
       accountId]
    );

    res.redirect(`${appUrl}/dashboard?stripe_connected=1`);
  } catch (e) {
    console.error('Stripe Connect callback error:', e.message);
    res.redirect(`${appUrl}/dashboard?stripe_error=${encodeURIComponent(e.message)}`);
  }
});

// ── POST /api/stripe-connect/disconnect ──────────────────────────
// Disconnects the Stripe account (deauthorize)
router.post('/disconnect', requireAuth, async (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });

  try {
    const acc = await db.execute(`SELECT stripe_account_id FROM accounts WHERE id = ?`, [account_id]);
    const stripeAccId = acc.rows[0]?.stripe_account_id;

    if (stripeAccId && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CLIENT_ID) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.oauth.deauthorize({
          client_id: process.env.STRIPE_CLIENT_ID,
          stripe_user_id: stripeAccId,
        });
      } catch (e) {
        // If already disconnected on Stripe side, just clear our DB
        console.warn('Stripe deauthorize warning:', e.message);
      }
    }

    await db.execute(
      `UPDATE accounts SET stripe_account_id = NULL, stripe_onboarded = 0,
       stripe_charges_enabled = 0, stripe_payouts_enabled = 0,
       stripe_connect_email = NULL WHERE id = ?`, [account_id]
    );

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/stripe-connect/set-platform-fee ────────────────────
// Set the platform application fee % for an account (admin only or owner)
router.post('/set-platform-fee', requireAuth, async (req, res) => {
  const { account_id, fee_pct } = req.body;
  if (fee_pct < 0 || fee_pct > 100) return res.status(400).json({ error: 'fee_pct must be 0-100' });
  try {
    await db.execute(`UPDATE accounts SET platform_fee_pct = ? WHERE id = ?`, [fee_pct || 0, account_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/stripe-connect/create-payment-link ─────────────────
// Create a Stripe payment link routed through the connected account
router.post('/create-payment-link', requireAuth, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'STRIPE_SECRET_KEY not configured' });
  }

  const { invoice_id } = req.body;
  if (!invoice_id) return res.status(400).json({ error: 'invoice_id required' });

  try {
    const inv = await db.execute(
      `SELECT i.*, a.stripe_account_id, a.stripe_onboarded, a.stripe_charges_enabled,
              a.platform_fee_pct, a.name as agency_name
       FROM invoices i JOIN accounts a ON i.account_id = a.id WHERE i.id = ?`, [invoice_id]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = inv.rows[0];

    const amountDue = Math.round((invoice.amount_due || invoice.setup_total || 0) * 100);
    if (amountDue < 50) return res.status(400).json({ error: 'Amount too small for Stripe (minimum $0.50)' });

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const appUrl = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';

    // Build Stripe options
    const stripeOptions = {};
    let usingConnected = false;

    if (invoice.stripe_account_id && invoice.stripe_charges_enabled) {
      // Route through connected account
      stripeOptions.stripeAccount = invoice.stripe_account_id;
      usingConnected = true;
    }

    // Create a Price object first (required for payment links)
    const price = await stripe.prices.create({
      currency:     'usd',
      unit_amount:  amountDue,
      product_data: {
        name:        `Invoice ${invoice.number}`,
        description: `${invoice.agency_name} — ${invoice.client_name || invoice.client_biz || 'Client'}`,
      },
    }, stripeOptions);

    // Build payment link params
    const linkParams = {
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: {
        type:     'redirect',
        redirect: { url: `${appUrl}/portal/invoice/${invoice.public_token}?paid=1` },
      },
      metadata: {
        invoice_id:  invoice.id,
        invoice_num: invoice.number,
        account_id:  invoice.account_id,
      },
      payment_method_types: ['card'],
    };

    // Add ACH if applicable
    if (invoice.amount_due >= 1) {
      linkParams.payment_method_types.push('us_bank_account');
    }

    // Platform application fee (if connected account)
    if (usingConnected && invoice.platform_fee_pct > 0) {
      const feePct = invoice.platform_fee_pct / 100;
      linkParams.application_fee_amount = Math.round(amountDue * feePct);
    }

    const paymentLink = await stripe.paymentLinks.create(linkParams, stripeOptions);

    // Store on invoice
    await db.execute(
      `UPDATE invoices SET stripe_payment_link = ?, status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
       sent_at = COALESCE(sent_at, NOW()) WHERE id = ?`,
      [paymentLink.url, invoice_id]
    );

    res.json({
      url:             paymentLink.url,
      payment_link_id: paymentLink.id,
      connected:       usingConnected,
      account_id:      invoice.stripe_account_id,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Stripe Connect webhook ────────────────────────────────────────
// Handles account.updated events to keep connection status fresh
router.post('/webhook', async (req, res) => {
  res.json({ received: true });
  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (event.type === 'account.updated') {
      const acc = event.data.object;
      await db.execute(
        `UPDATE accounts SET
           stripe_charges_enabled = ?,
           stripe_payouts_enabled = ?
         WHERE stripe_account_id = ?`,
        [acc.charges_enabled ? 1 : 0, acc.payouts_enabled ? 1 : 0, acc.id]
      );
    }
  } catch (e) { console.warn('Connect webhook error:', e.message); }
});

export default router;
