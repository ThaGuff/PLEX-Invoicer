/**
 * PLEX Automation — Stripe product & price creation script
 * Run: node scripts/create-stripe-products.mjs
 *
 * Creates every PLEX service as a Stripe Product with appropriate prices:
 *   - One-time setup fee → price with type: 'one_time'
 *   - Monthly recurring  → price with type: 'recurring', interval: 'month'
 *
 * Safe to run multiple times — checks for existing products by metadata.
 * Does NOT charge anyone. Does NOT create payment intents.
 * Only creates Products and Prices in your Stripe catalog.
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌  STRIPE_SECRET_KEY not set. Add it to your .env file or environment.');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

// ── Full PLEX service catalog ────────────────────────────────────
const CATALOG = [

  // Website design & management
  { id: 'web-starter',      section: 'Website',    name: 'Starter website (5 pages)',               desc: 'Mobile-responsive brochure site: Home, About, Services, Contact, and FAQ. Built and hosted by PLEX on your custom domain.',                                                                         setup: 1800, monthly: 0 },
  { id: 'web-pro',          section: 'Website',    name: 'Pro website (8–12 pages)',                 desc: 'Full business site with custom design, on-page SEO foundation, contact forms, appointment booking widget, and blog structure — built by PLEX.',                                                       setup: 3200, monthly: 0 },
  { id: 'web-premium',      section: 'Website',    name: 'Premium website (12+ pages)',              desc: 'Multi-section site with custom graphics, case studies, testimonials, advanced on-page SEO, and full PLEX automation integration.',                                                                    setup: 5500, monthly: 0 },
  { id: 'web-ecomm',        section: 'Website',    name: 'E-commerce website',                       desc: 'Online store with product catalog, Stripe payments, order management, and mobile-optimized checkout — built and launched by PLEX.',                                                                   setup: 6500, monthly: 0 },
  { id: 'web-mgmt-basic',   section: 'Website',    name: 'Website management — Basic',               desc: 'Up to 3 content changes per month, security and plugin updates, uptime monitoring, and a monthly site performance report.',                                                                           setup: 0, monthly: 147 },
  { id: 'web-mgmt-pro',     section: 'Website',    name: 'Website management — Pro',                 desc: 'Unlimited content edits, one new blog post per month, hosting oversight, load speed optimization, and priority PLEX support.',                                                                        setup: 0, monthly: 297 },
  { id: 'web-mgmt-premium', section: 'Website',    name: 'Website management — Premium',             desc: 'Everything in Pro plus new landing page builds, monthly technical SEO audit (site health, crawl errors, Core Web Vitals), and a dedicated PLEX account manager.',                                    setup: 0, monthly: 497 },

  // Core automations
  { id: 'mctb',             section: 'Core Automations', name: 'Missed call text-back',             desc: 'Every missed call triggers an automatic text within 60 seconds — re-engages the caller before they dial a competitor. Built and managed by PLEX.',                                                    setup: 297, monthly: 147 },
  { id: 'stl',              section: 'Core Automations', name: 'Speed-to-lead follow-up',           desc: 'Fires an instant SMS and email the moment a new lead submits a web form — responds in minutes, not hours. PLEX builds and manages the sequence.',                                                    setup: 397, monthly: 147 },
  { id: 'rep',              section: 'Core Automations', name: 'Reputation automation',             desc: 'Automatically requests a review after every completed job. 4–5 star responses route to Google; 1–3 star go to a private feedback form.',                                                             setup: 297, monthly: 147 },
  { id: 'appt',             section: 'Core Automations', name: 'Appointment reminder & confirmation',desc: 'Multi-step SMS and email reminders before every appointment, with 2-way confirmation. Reduces no-shows by up to 40%.',                                                                               setup: 297, monthly: 127 },
  { id: 'nosh',             section: 'Core Automations', name: 'No-show reactivation',             desc: 'When an appointment is missed, an automated re-booking sequence goes out within 24–72 hours — recovers lost revenue without any manual follow-up.',                                                  setup: 247, monthly: 97  },
  { id: 'leadnurture',      section: 'Core Automations', name: 'Lead nurture drip sequence',        desc: 'Multi-touch SMS and email campaign for new leads who haven\'t booked yet — 7 to 14 steps over 30 to 60 days. Built and managed by PLEX.',                                                          setup: 497, monthly: 197 },

  // AI & Voice
  { id: 'voiceai',          section: 'AI & Voice', name: 'Voice AI receptionist',                   desc: '24/7 AI phone agent that answers inbound calls, handles FAQs, qualifies leads, and books appointments — even after hours and on weekends.',                                                           setup: 997, monthly: 397 },
  { id: 'chatbot',          section: 'AI & Voice', name: 'AI website chatbot',                      desc: 'GPT-powered chat widget on your website that captures lead info, answers common questions, and drops booking links — trained on your specific business.',                                              setup: 697, monthly: 247 },
  { id: 'aisms',            section: 'AI & Voice', name: 'AI SMS conversation agent',               desc: 'Handles two-way text conversations with leads — qualifies, answers objections, and schedules appointments automatically without a fixed script.',                                                      setup: 797, monthly: 297 },
  { id: 'summ',             section: 'AI & Voice', name: 'AI call summary & logging',               desc: 'Every inbound call is transcribed and summarized by AI, then automatically logged to the contact record in your PLEX dashboard.',                                                                     setup: 597, monthly: 197 },
  { id: 'intent',           section: 'AI & Voice', name: 'AI lead intent scoring',                  desc: 'AI evaluates lead behavior signals to classify each contact as hot, warm, or cold — then routes them automatically into the right follow-up sequence.',                                               setup: 697, monthly: 247 },

  // Marketing & Content
  { id: 'seo',              section: 'Marketing',  name: 'SEO content automation',                  desc: 'AI-assisted monthly blog posts targeting local search terms, plus meta tag updates, schema markup, and directory/citation submissions.',                                                               setup: 497, monthly: 497 },
  { id: 'social',           section: 'Marketing',  name: 'Social media management',                 desc: '12 to 16 posts per month to Facebook and Instagram — written, designed, and scheduled by PLEX. Covers captions, graphics, and hashtag strategy.',                                                   setup: 297, monthly: 347 },
  { id: 'email-mkt',        section: 'Marketing',  name: 'Email newsletter',                        desc: 'One branded newsletter per month designed, written, and sent to your existing contact list — broadcast to your audience, not a lead drip sequence.',                                                  setup: 297, monthly: 197 },
  { id: 'gmb',              section: 'Marketing',  name: 'Google Business Profile management',      desc: 'Weekly posts, Q&A responses, and monthly photo updates to your Google listing — keeps your profile active and ranking.',                                                                               setup: 247, monthly: 197 },
  { id: 'fbads',            section: 'Marketing',  name: 'Paid ads retargeting',                    desc: 'Your PLEX contact list synced to Meta custom audiences, with automated ad triggers when leads take key actions — managed setup and monthly optimization.',                                            setup: 597, monthly: 297 },

  // CRM & Pipeline
  { id: 'crmsetup',         section: 'CRM',        name: 'PLEX CRM full setup',                    desc: 'One-time build of your complete CRM: pipeline stages, custom fields, tags, contact import, team access, and a live walkthrough with your owner.',                                                    setup: 1197, monthly: 0 },
  { id: 'pipeline',         section: 'CRM',        name: 'Sales pipeline automation',              desc: 'Automates what happens at each pipeline stage — stage-change triggers, task assignments, deal scoring, and follow-up routing inside your PLEX dashboard.',                                           setup: 597, monthly: 197 },
  { id: 'onboard',          section: 'CRM',        name: 'New client onboarding workflow',          desc: 'Automates your own new client experience — welcome messages, intake forms, document collection, and a kickoff call scheduler.',                                                                        setup: 497, monthly: 127 },
  { id: 'reactivate',       section: 'CRM',        name: 'Past client reactivation',               desc: 'Win-back campaign targeting dormant contacts — AI-personalized SMS and email to bring them back.',                                                                                                   setup: 397, monthly: 97  },
  { id: 'reporting',        section: 'CRM',        name: 'Automated performance reporting',        desc: 'Monthly summary delivered to your inbox covering leads captured, reviews sent, appointments booked, and revenue — pulled from your PLEX dashboard.',                                                  setup: 347, monthly: 97  },

  // Add-ons & one-time
  { id: 'lp',               section: 'Add-ons',    name: 'Landing page & funnel build',            desc: 'A single conversion-focused page built for a specific campaign or offer — includes lead form, calendar embed, and automation trigger.',                                                                setup: 797, monthly: 0 },
  { id: 'training',         section: 'Add-ons',    name: 'Team training session',                  desc: '90-minute live Zoom session for your staff — covers your PLEX dashboard, contact management, pipeline, and day-to-day workflows. Recorded for future reference.',                                    setup: 397, monthly: 0 },
  { id: 'retainer',         section: 'Add-ons',    name: 'Managed services retainer',              desc: 'Dedicated PLEX support each month — optimization, bug fixes, new automation builds, and direct account team access. Up to 5 hours of active work per month.',                                       setup: 0, monthly: 597 },
  { id: 'audit',            section: 'Add-ons',    name: 'Marketing & automation audit',           desc: 'A full written review of your current funnels, CRM setup, and marketing tools — delivered by PLEX with a prioritized list of what to fix or improve.',                                              setup: 597, monthly: 0 },
];

// ── Helpers ──────────────────────────────────────────────────────
function cents(dollars) { return Math.round(dollars * 100); }

function pad(str, len = 45) { return str.padEnd(len); }

// ── Main ─────────────────────────────────────────────────────────
console.log('\n🚀  PLEX Automation — Stripe product creation\n');
console.log('   Mode: LIVE (creating real Stripe products)\n');
console.log('   ' + '─'.repeat(65) + '\n');

let created = 0, skipped = 0, errors = 0;
const results = [];

for (const svc of CATALOG) {
  try {
    // Check if product already exists by our plex_id metadata
    const existing = await stripe.products.search({
      query: `metadata['plex_id']:'${svc.id}'`,
      limit: 1,
    });

    let product;
    if (existing.data.length > 0) {
      product = existing.data[0];
      skipped++;
      console.log(`  ⏭   ${pad(svc.name)} already exists`);
    } else {
      // Create the product
      product = await stripe.products.create({
        name: svc.name,
        description: svc.desc,
        metadata: {
          plex_id:   svc.id,
          section:   svc.section,
          plex_app:  'plex-invoicer',
        },
      });
      created++;

      // Create setup/one-time price
      if (svc.setup > 0) {
        await stripe.prices.create({
          product:     product.id,
          currency:    'usd',
          unit_amount: cents(svc.setup),
          metadata:    { plex_id: svc.id, type: 'setup' },
        });
      }

      // Create monthly recurring price
      if (svc.monthly > 0) {
        await stripe.prices.create({
          product:     product.id,
          currency:    'usd',
          unit_amount: cents(svc.monthly),
          recurring:   { interval: 'month' },
          metadata:    { plex_id: svc.id, type: 'monthly' },
        });
      }

      const priceStr = [
        svc.setup   > 0 ? `$${svc.setup} setup`    : null,
        svc.monthly > 0 ? `$${svc.monthly}/mo` : null,
      ].filter(Boolean).join(' + ') || 'custom pricing';

      console.log(`  ✅  ${pad(svc.name)} — ${priceStr}`);
    }

    results.push({ id: svc.id, stripe_product_id: product.id, name: svc.name });

  } catch (e) {
    errors++;
    console.log(`  ❌  ${pad(svc.name)} ERROR: ${e.message}`);
  }
}

console.log('\n  ' + '─'.repeat(65));
console.log(`\n  Created: ${created}   Skipped (already existed): ${skipped}   Errors: ${errors}`);
console.log(`  Total products in Stripe: ${created + skipped}`);

if (results.length > 0) {
  console.log('\n  Product ID map (for reference):');
  results.forEach(r => {
    console.log(`    ${r.id.padEnd(20)} → ${r.stripe_product_id}`);
  });
}

console.log('\n  ✅  Done. View your products at: https://dashboard.stripe.com/products\n');
