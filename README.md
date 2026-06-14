# Invoice King

Professional invoicing and quoting platform for service businesses.  
**Invoicing. Simplified. Own Your Cash Flow.**

🌐 **Live:** https://invoiceking.app  
📱 **PWA:** Install from browser on iOS/Android or [Google Play Store](https://play.google.com/store)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Payments | Stripe (subscriptions + invoicing) |
| Email | Resend |
| Hosting | Railway |
| AI | OpenAI GPT-4o-mini |

## Features

- **Smart quoting** — Build professional quotes in under 2 minutes
- **Invoice management** — Convert quotes to invoices in one click
- **Stripe payments** — Embedded payment links, automatic reminders
- **Time keeping** — Log hours against jobs, bill to invoices
- **Client CRM** — Contact history, AI lead scoring, follow-up sequences
- **Automations** — Set-and-forget payment reminders and follow-ups
- **Analytics** — Revenue tracking, cashflow forecasting, conversion rates
- **PWA** — Installs on iOS/Android, works offline

## Local Development

```bash
npm install
npm run dev        # frontend on http://localhost:5173
node server.js     # backend on http://localhost:3001
```

## Deploy to Railway

1. Push this repo to GitHub (`ThaGuff/PLEX-Invoicer`)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables (see **Environment Variables** below)
4. Railway auto-detects build config from `railway.toml`
5. Add custom domain `invoiceking.app` in Railway → Settings → Networking

## Environment Variables

```env
# App
APP_URL=https://invoiceking.app
PORT=3001

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_AGENCY=

# Resend (email)
RESEND_API_KEY=
RESEND_FROM=invoices@invoiceking.app

# Push notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=admin@invoiceking.app

# Owner
PLEX_OWNER_EMAIL=your@email.com
```

## Domain Setup

After deploying to Railway:
1. Add `invoiceking.app` in Railway → Networking → Custom Domain
2. Point DNS: `invoiceking.app CNAME your-railway-app.up.railway.app`
3. Railway auto-provisions SSL certificate

## Android / Google Play

The app is packaged as a TWA (Trusted Web Activity) for Google Play.  
See [Google Play Guide](docs/GOOGLE_PLAY_GUIDE.md) for submission steps.

Package name: `app.invoiceking.invoiceking`  
Digital Asset Links: `/.well-known/assetlinks.json`

---

© 2026 Invoice King. All rights reserved.
