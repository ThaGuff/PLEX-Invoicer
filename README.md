# PLEX Automation — Quote Builder

An interactive quote builder and invoicing tool for PLEX Automation clients. Built with React + Vite + Tailwind CSS. Deployable to Railway in one click.

## Features

- **Service build-sheet** — 25+ automation services organized across 5 tiers (Core, AI & Voice, Marketing, CRM, Add-ons)
- **Billing mode toggle** — Month-to-month or Annual plan with editable yearly discount (default 15% off)
- **Per-line price editing** — Adjust setup fee and monthly rate per service inline
- **Include toggle** — Mark services as "included" (no charge) for bundle deals
- **Discount controls** — Apply % or flat $ discounts to setup, monthly, or both
- **Agency settings** — Editable agency name, email, phone, and website in the UI
- **PDF export** — Branded professional quote PDF downloaded locally
- **Email quote** — Pre-fills a mailto with full quote summary for the client
- **Live totals** — Real-time calculation of all fees, discounts, and annual commitments

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select `ThaGuff/PLEX-Invoicer`
4. Railway auto-detects the build config via `railway.toml`
5. Set environment variable `PORT` (Railway sets this automatically)
6. Deploy — your quote builder is live

## Project Structure

```
src/
  data/
    services.js        # All service definitions and pricing
  utils/
    exportPDF.js       # jsPDF-based quote PDF generation
    exportEmail.js     # mailto quote email builder
  pages/
    QuoteBuilder.jsx   # Main application page
  components/          # (reserved for future components)
  App.jsx
  main.jsx
  index.css
```

## Customizing Services

Edit `src/data/services.js` to add, remove, or rename services and adjust default pricing. Each service object:

```js
{
  id: 'unique_id',
  name: 'Service Name',
  desc: 'Short description shown to clients',
  setup: 497,      // default setup fee in USD
  monthly: 197,    // default monthly retainer in USD
  badge: 'popular' // optional: 'popular' | 'new' | 'addon'
}
```

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS 3
- jsPDF + jsPDF-AutoTable
- Lucide React icons
- React Router v6

---

Built by [PLEX Automation](https://plexautomation.io) · Birmingham, AL
