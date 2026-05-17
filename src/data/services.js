// ─── Pricing rationale — updated May 2026 ─────────────────────────────────────
//
// WEBSITE TIER: Anchored to Huntsville local market.
//   - SEOteric WaaS: $249/mo. Hughes, Zellus, IG Webs: custom quotes, ~$2,500–$5,000 builds.
//   - WordPress starts at $3,000 locally (Huntsville Web Designers benchmark).
//   - PLEX sites include automation integration — justifies 10–20% premium over local comps.
//   - Management plans benchmarked to SEOteric add-ons ($250–$500/mo local).
//
// CORE AUTOMATIONS: Priced to outcome value, not tool cost.
//   - Industry data: missed call recovery worth $100K+/yr for a busy service biz.
//   - Local GHL agencies charge $297–$497/mo for basic automation packages.
//   - Each automation sold separately; bundle discount encouraged via annual plan.
//   - Setup fees reflect real build time (1–4 hrs) at $150/hr agency rate.
//
// AI & VOICE: National-level pricing applies even locally.
//   - AI receptionist platforms retail at $99–$500/mo (end-user).
//   - PLEX adds build, training, monitoring, and ongoing optimization on top.
//   - Voice AI setup reflects 4–8 hrs build + custom training time.
//
// MARKETING & CONTENT: Benchmarked to SEOteric local comps.
//   - SEOteric Local SEO add-on: $500/mo. Foundational SEO add-on: $250/mo.
//   - Social media management: $250–$500/mo locally (Zellus, Strottner).
//   - PLEX adds AI-assisted production speed — slight premium justified.
//
// CRM & PIPELINE: Outcome-based. A working CRM prevents $50K+/yr in lost follow-up.
//   - Setup fees reflect real build time. Monthly fees reflect ongoing management.
//
// ADD-ONS: Priced at standard North Alabama agency rates for comparable deliverables.
//
// ─────────────────────────────────────────────────────────────────────────────

export const YEARLY_DISCOUNT_DEFAULT = 15;

export const SECTIONS = [
  { id: 'web',   label: 'Website design & management',  icon: 'Globe' },
  { id: 'core',  label: 'Tier 1 — Core automations',    icon: 'Zap' },
  { id: 'ai',    label: 'Tier 2 — AI & voice',          icon: 'Bot' },
  { id: 'mkt',   label: 'Tier 3 — Marketing & content', icon: 'Megaphone' },
  { id: 'crm',   label: 'Tier 4 — CRM & pipeline',      icon: 'LayoutDashboard' },
  { id: 'addon', label: 'Add-ons & one-time services',  icon: 'PlusCircle' },
];

export const SERVICES = {

  // ── Website design & management ─────────────────────────────────────────────
  // Local Huntsville builds: $2,500–$5,000+. SEOteric WaaS at $249/mo.
  // PLEX includes automation integration — priced 15–20% above bare-bones local comps.
  web: [
    {
      id: 'web-starter',
      name: 'Starter website (5 pages)',
      desc: 'Mobile-responsive brochure site: Home, About, Services, Contact, and FAQ. Built and hosted by PLEX on your custom domain.',
      setup: 1800,
      monthly: 0,
      badge: 'popular',
    },
    {
      id: 'web-pro',
      name: 'Pro website (8–12 pages)',
      desc: 'Full business site with custom design, on-page SEO foundation, contact forms, appointment booking widget, and blog structure — built by PLEX.',
      setup: 3200,
      monthly: 0,
      badge: 'popular',
    },
    {
      id: 'web-premium',
      name: 'Premium website (12+ pages)',
      desc: 'Multi-section site with custom graphics, case studies, testimonials, advanced on-page SEO, and full PLEX automation integration.',
      setup: 5500,
      monthly: 0,
    },
    {
      id: 'web-ecomm',
      name: 'E-commerce website',
      desc: 'Online store with product catalog, Stripe payments, order management, and mobile-optimized checkout — built and launched by PLEX.',
      setup: 6500,
      monthly: 0,
    },
    {
      id: 'web-mgmt-basic',
      name: 'Website management — Basic',
      desc: 'Up to 3 content changes per month, security and plugin updates, uptime monitoring, and a monthly site performance report.',
      setup: 0,
      monthly: 147,
    },
    {
      id: 'web-mgmt-pro',
      name: 'Website management — Pro',
      desc: 'Unlimited content edits, one new blog post per month, hosting oversight, load speed optimization, and priority PLEX support.',
      setup: 0,
      monthly: 297,
      badge: 'popular',
    },
    {
      id: 'web-mgmt-premium',
      name: 'Website management — Premium',
      desc: 'Everything in Pro plus new landing page builds, monthly technical SEO audit (site health, crawl errors, Core Web Vitals), and a dedicated PLEX account manager.',
      setup: 0,
      monthly: 497,
    },
  ],

  // ── Core automations ─────────────────────────────────────────────────────────
  // Local GHL agencies: $297–$497/mo bundled. PLEX sells à la carte with outcome framing.
  // Setup fees at $150/hr agency rate: ~2 hrs per workflow.
  core: [
    {
      id: 'mctb',
      name: 'Missed call text-back',
      desc: 'Every missed call triggers an automatic text within 60 seconds — re-engages the caller before they dial a competitor. Built and managed by PLEX.',
      setup: 297,
      monthly: 147,
      badge: 'popular',
    },
    {
      id: 'stl',
      name: 'Speed-to-lead follow-up',
      desc: 'Fires an instant SMS and email the moment a new lead submits a web form — responds in minutes, not hours. PLEX builds and manages the sequence.',
      setup: 397,
      monthly: 147,
      badge: 'popular',
    },
    {
      id: 'rep',
      name: 'Reputation automation',
      desc: 'Automatically requests a review after every completed job or visit. 4–5 star responses route to Google; 1–3 star go to a private feedback form to protect your rating.',
      setup: 297,
      monthly: 147,
      badge: 'popular',
    },
    {
      id: 'appt',
      name: 'Appointment reminder & confirmation',
      desc: 'Sends multi-step SMS and email reminders before every appointment, with 2-way confirmation. Reduces no-shows by up to 40%.',
      setup: 297,
      monthly: 127,
    },
    {
      id: 'nosh',
      name: 'No-show reactivation',
      desc: 'When an appointment is missed, an automated re-booking sequence goes out within 24–72 hours — recovers lost revenue without any manual follow-up.',
      setup: 247,
      monthly: 97,
    },
    {
      id: 'leadnurture',
      name: 'Lead nurture drip sequence',
      desc: 'Multi-touch SMS and email campaign for new leads who haven\'t booked yet — 7 to 14 steps over 30 to 60 days. Built and managed by PLEX.',
      setup: 497,
      monthly: 197,
    },
  ],

  // ── AI & Voice ───────────────────────────────────────────────────────────────
  // National pricing applies. AI receptionist SaaS: $99–$500/mo retail.
  // PLEX adds build, custom training, and ongoing management on top of platform cost.
  // Setup reflects 4–8 hrs build time at $150/hr.
  ai: [
    {
      id: 'voiceai',
      name: 'Voice AI receptionist',
      desc: '24/7 AI phone agent that answers inbound calls, handles FAQs, qualifies leads, and books appointments — even after hours and on weekends.',
      setup: 997,
      monthly: 397,
      badge: 'popular',
    },
    {
      id: 'chatbot',
      name: 'AI website chatbot',
      desc: 'GPT-powered chat widget on your website that captures lead info, answers common questions, and drops booking links — trained on your specific business.',
      setup: 697,
      monthly: 247,
    },
    {
      id: 'aisms',
      name: 'AI SMS conversation agent',
      desc: 'Handles two-way text conversations with leads — qualifies, answers objections, and schedules appointments automatically without a fixed script.',
      setup: 797,
      monthly: 297,
    },
    {
      id: 'summ',
      name: 'AI call summary & logging',
      desc: 'Every inbound call is transcribed and summarized by AI, then automatically logged to the contact record in your PLEX dashboard. No manual note-taking.',
      setup: 597,
      monthly: 197,
    },
    {
      id: 'intent',
      name: 'AI lead intent scoring',
      desc: 'AI evaluates lead behavior signals to classify each contact as hot, warm, or cold — then routes them automatically into the right follow-up sequence.',
      setup: 697,
      monthly: 247,
      badge: 'new',
    },
  ],

  // ── Marketing & Content ──────────────────────────────────────────────────────
  // SEOteric local SEO add-on: $500/mo. Foundational SEO: $250/mo.
  // Social media locally: $250–$500/mo (Zellus, Strottner). PLEX at mid-market.
  mkt: [
    {
      id: 'seo',
      name: 'SEO content automation',
      desc: 'AI-assisted monthly blog posts targeting local search terms, plus meta tag updates, schema markup, and directory/citation submissions — all handled by PLEX.',
      setup: 497,
      monthly: 497,
    },
    {
      id: 'social',
      name: 'Social media management',
      desc: '12 to 16 posts per month to Facebook and Instagram — written, designed, and scheduled by PLEX. Covers captions, graphics, and hashtag strategy.',
      setup: 297,
      monthly: 347,
    },
    {
      id: 'email',
      name: 'Email newsletter',
      desc: 'One branded newsletter per month designed, written, and sent to your existing contact list — broadcast to your audience, not a lead drip sequence.',
      setup: 297,
      monthly: 197,
    },
    {
      id: 'gmb',
      name: 'Google Business Profile management',
      desc: 'Weekly posts, Q&A responses, and monthly photo updates to your Google listing — keeps your profile active and ranking. Does not include review request sending.',
      setup: 247,
      monthly: 197,
    },
    {
      id: 'fbads',
      name: 'Paid ads retargeting',
      desc: 'Your PLEX contact list synced to Meta custom audiences, with automated ad triggers when leads take key actions — managed setup and monthly optimization.',
      setup: 597,
      monthly: 297,
      badge: 'addon',
    },
  ],

  // ── CRM & Pipeline ───────────────────────────────────────────────────────────
  // Setup fees reflect real build time (4–8 hrs). Monthly = ongoing management.
  // A working CRM + pipeline system prevents $50K+/yr in lost follow-up revenue.
  crm: [
    {
      id: 'crmsetup',
      name: 'PLEX CRM full setup',
      desc: 'One-time build of your complete CRM: pipeline stages, custom fields, tags, contact import, team access, and a live walkthrough with your owner.',
      setup: 1197,
      monthly: 0,
    },
    {
      id: 'pipeline',
      name: 'Sales pipeline automation',
      desc: 'Automates what happens at each pipeline stage — stage-change triggers, task assignments, deal scoring, and follow-up routing inside your PLEX dashboard.',
      setup: 597,
      monthly: 197,
    },
    {
      id: 'onboard',
      name: 'New client onboarding workflow',
      desc: 'Automates your own new client experience — welcome messages, intake forms, document collection, and a kickoff call scheduler. Removes manual admin from your process.',
      setup: 497,
      monthly: 127,
    },
    {
      id: 'reactivate',
      name: 'Past client reactivation',
      desc: 'Win-back campaign targeting dormant contacts who\'ve done business with you before — AI-personalized SMS and email to bring them back.',
      setup: 397,
      monthly: 97,
    },
    {
      id: 'reporting',
      name: 'Automated performance reporting',
      desc: 'Monthly summary delivered to your inbox covering leads captured, reviews sent, appointments booked, and revenue — pulled from your PLEX dashboard automatically.',
      setup: 347,
      monthly: 97,
    },
  ],

  // ── Add-ons & one-time services ──────────────────────────────────────────────
  // Benchmarked to North Alabama agency rates for equivalent deliverables.
  addon: [
    {
      id: 'lp',
      name: 'Landing page & funnel build',
      desc: 'A single conversion-focused page built for a specific campaign or offer — includes lead form, calendar embed, and automation trigger. Not a full website.',
      setup: 797,
      monthly: 0,
    },
    {
      id: 'training',
      name: 'Team training session',
      desc: '90-minute live Zoom session for your staff — covers your PLEX dashboard, contact management, pipeline, and day-to-day workflows. Recorded for future reference.',
      setup: 397,
      monthly: 0,
    },
    {
      id: 'retainer',
      name: 'Managed services retainer',
      desc: 'Dedicated PLEX support each month — optimization, bug fixes, new automation builds, and direct account team access. Up to 5 hours of active work per month.',
      setup: 0,
      monthly: 597,
    },
    {
      id: 'audit',
      name: 'Marketing & automation audit',
      desc: 'A full written review of your current funnels, CRM setup, and marketing tools — delivered by PLEX with a prioritized list of what to fix or improve.',
      setup: 597,
      monthly: 0,
      badge: 'addon',
    },
    {
      id: 'custom',
      name: 'Custom automation build',
      desc: 'A bespoke PLEX automation for any workflow not covered by the standard tiers. Scoped and priced after a discovery call.',
      setup: 0,
      monthly: 0,
    },
  ],
};

export const ALL_SERVICES = Object.values(SERVICES).flat();

export function getService(id) {
  return ALL_SERVICES.find(s => s.id === id);
}
