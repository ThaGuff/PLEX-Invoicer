// ─── Pricing rationale ────────────────────────────────────────────────────────
// Benchmarked against Huntsville AL market rates (Hughes Web Designs, Be Seen
// Solutions, Rocket City Digital, Zellus Marketing, SEOteric, IG Webs) and
// GHL-based AI automation agency comps nationwide. Local market prices are
// 10–20% below major metros; premium for AI/voice services remains high.
// ─────────────────────────────────────────────────────────────────────────────

export const YEARLY_DISCOUNT_DEFAULT = 15;

export const SECTIONS = [
  { id: 'web',   label: 'Website design & management',    icon: 'Globe' },
  { id: 'core',  label: 'Tier 1 — Core automations',      icon: 'Zap' },
  { id: 'ai',    label: 'Tier 2 — AI & voice',            icon: 'Bot' },
  { id: 'mkt',   label: 'Tier 3 — Marketing & content',   icon: 'Megaphone' },
  { id: 'crm',   label: 'Tier 4 — CRM & pipeline',        icon: 'LayoutDashboard' },
  { id: 'addon', label: 'Add-ons & one-time services',    icon: 'PlusCircle' },
];

export const SERVICES = {

  // ── Website design & management ─────────────────────────────────────────────
  // Local Huntsville AL web agencies: $2,500–$6,000 build, $97–$297/mo mgmt
  web: [
    {
      id: 'web-starter',
      name: 'Starter website (5 pages)',
      desc: 'Mobile-responsive brochure site: Home, About, Services, Contact, FAQ. GHL-hosted or custom domain.',
      setup: 1500,
      monthly: 0,
      badge: 'popular',
    },
    {
      id: 'web-pro',
      name: 'Pro website (8–12 pages)',
      desc: 'Full business site with custom design, SEO on-page setup, contact forms, booking widget, and blog foundation.',
      setup: 2800,
      monthly: 0,
      badge: 'popular',
    },
    {
      id: 'web-premium',
      name: 'Premium website (12+ pages)',
      desc: 'Multi-section site with custom graphics, case studies, testimonials section, advanced SEO, and GHL CRM integration.',
      setup: 4500,
      monthly: 0,
    },
    {
      id: 'web-ecomm',
      name: 'E-commerce website',
      desc: 'Online store with product catalog, Stripe payments, order management, and mobile-optimized checkout.',
      setup: 5500,
      monthly: 0,
    },
    {
      id: 'web-mgmt-basic',
      name: 'Website management — Basic',
      desc: 'Monthly content updates (up to 3), plugin/security updates, uptime monitoring, and monthly report.',
      setup: 0,
      monthly: 97,
    },
    {
      id: 'web-mgmt-pro',
      name: 'Website management — Pro',
      desc: 'Unlimited content edits, hosting oversight, performance optimization, blog post/month, and priority support.',
      setup: 0,
      monthly: 197,
      badge: 'popular',
    },
    {
      id: 'web-mgmt-premium',
      name: 'Website management — Premium',
      desc: 'Everything in Pro plus landing page builds, A/B testing, monthly SEO audit, and dedicated account manager.',
      setup: 0,
      monthly: 347,
    },
  ],

  // ── Core automations ─────────────────────────────────────────────────────────
  // Benchmarked: $197–$397/mo locally; PLEX site shows $197–$697. Adjusted.
  core: [
    {
      id: 'mctb',
      name: 'Missed call text-back',
      desc: 'Texts every missed call within 60 seconds — name, business, and next step. Simple GHL workflow.',
      setup: 247,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'stl',
      name: 'Speed-to-lead follow-up',
      desc: 'Instant SMS + email sequence triggered on new web form leads. Increases contact rate by 5–10×.',
      setup: 347,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'rep',
      name: 'Reputation automation',
      desc: 'Post-job review requests via SMS/email; routes 4–5 star to Google, 1–3 star to private feedback form.',
      setup: 247,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'appt',
      name: 'Appointment reminder & confirmation',
      desc: 'Multi-step SMS/email reminders + 2-way confirmation. Reduces no-shows by up to 40%.',
      setup: 247,
      monthly: 77,
    },
    {
      id: 'nosh',
      name: 'No-show reactivation',
      desc: 'Automated re-booking sequence for no-shows within 24–72 hours post-miss.',
      setup: 197,
      monthly: 57,
    },
    {
      id: 'leadnurture',
      name: 'Lead nurture drip sequence',
      desc: 'Multi-touch SMS + email campaign for new and cold leads (7–14 steps, 30–60 days).',
      setup: 447,
      monthly: 127,
    },
  ],

  // ── AI & Voice ───────────────────────────────────────────────────────────────
  // AI/voice commands national-level pricing even in local markets
  ai: [
    {
      id: 'voiceai',
      name: 'Voice AI receptionist',
      desc: '24/7 inbound call handling — answers FAQs, qualifies leads, books appointments via AI phone agent.',
      setup: 897,
      monthly: 247,
      badge: 'popular',
    },
    {
      id: 'chatbot',
      name: 'AI website chatbot',
      desc: 'GPT-powered GHL chat widget — lead capture, FAQ handling, booking link. Trained on your business.',
      setup: 597,
      monthly: 147,
    },
    {
      id: 'aisms',
      name: 'AI SMS conversation agent',
      desc: 'Two-way AI SMS for lead qualification, objection handling, and appointment scheduling.',
      setup: 697,
      monthly: 197,
    },
    {
      id: 'summ',
      name: 'AI call summary & CRM logging',
      desc: 'Transcribes and summarizes every inbound call; auto-logs notes to GHL contact record.',
      setup: 497,
      monthly: 127,
    },
    {
      id: 'intent',
      name: 'AI lead intent scoring',
      desc: 'Scores and tags leads hot/warm/cold based on behavior signals; triggers routing workflows.',
      setup: 597,
      monthly: 167,
      badge: 'new',
    },
  ],

  // ── Marketing & Content ──────────────────────────────────────────────────────
  // Local Huntsville agencies: SEO $300–$800/mo, social $150–$400/mo
  mkt: [
    {
      id: 'seo',
      name: 'SEO content automation',
      desc: 'AI-assisted monthly blog posts, meta tag optimization, schema markup, and directory submissions.',
      setup: 397,
      monthly: 247,
    },
    {
      id: 'social',
      name: 'Social media auto-posting',
      desc: 'Scheduled posts to Facebook, Instagram, and Google Business — 12–16 posts/month from one dashboard.',
      setup: 247,
      monthly: 167,
    },
    {
      id: 'email',
      name: 'Email newsletter automation',
      desc: 'Monthly branded newsletters to segmented contact list — designed, written, and scheduled in GHL.',
      setup: 297,
      monthly: 127,
    },
    {
      id: 'gmb',
      name: 'Google Business Profile management',
      desc: 'Weekly posts, Q&A automation, review response templates, and photo updates via GHL.',
      setup: 197,
      monthly: 97,
    },
    {
      id: 'fbads',
      name: 'Facebook/Instagram ads retargeting',
      desc: 'GHL contact audience sync to Meta custom audiences; ad trigger workflows on lead actions.',
      setup: 497,
      monthly: 167,
      badge: 'addon',
    },
  ],

  // ── CRM & Pipeline ───────────────────────────────────────────────────────────
  crm: [
    {
      id: 'crmsetup',
      name: 'GHL CRM full setup',
      desc: 'Pipeline build, custom fields, tags, contact import, user access, and owner orientation.',
      setup: 897,
      monthly: 0,
    },
    {
      id: 'pipeline',
      name: 'Sales pipeline automation',
      desc: 'Stage-based triggers, task assignments, deal scoring, and automated follow-up cadences.',
      setup: 497,
      monthly: 127,
    },
    {
      id: 'onboard',
      name: 'Client onboarding workflow',
      desc: 'Welcome sequence, document collection, intake form routing, and kickoff scheduler.',
      setup: 397,
      monthly: 77,
    },
    {
      id: 'reactivate',
      name: 'Past client reactivation campaign',
      desc: 'Segmented win-back campaign to dormant contacts with AI-personalized SMS + email.',
      setup: 297,
      monthly: 57,
    },
    {
      id: 'reporting',
      name: 'Automated reporting dashboard',
      desc: 'Monthly performance report emailed to owner — leads captured, reviews sent, bookings, revenue.',
      setup: 297,
      monthly: 77,
    },
  ],

  // ── Add-ons & one-time ───────────────────────────────────────────────────────
  addon: [
    {
      id: 'ghlwl',
      name: 'GHL white-label sub-account setup',
      desc: 'Branded sub-account with logo, custom domain, SMTP, Twilio, and Stripe configuration.',
      setup: 397,
      monthly: 0,
      badge: 'addon',
    },
    {
      id: 'lp',
      name: 'Landing page & funnel build',
      desc: 'Single GHL funnel page with form, calendar embed, and automation trigger. Conversion-optimized.',
      setup: 597,
      monthly: 0,
    },
    {
      id: 'training',
      name: 'Team training & onboarding session',
      desc: '90-minute live Zoom session — GHL platform walkthrough for client staff.',
      setup: 247,
      monthly: 0,
    },
    {
      id: 'retainer',
      name: 'Managed services retainer',
      desc: 'Ongoing optimization, support tickets, and new automation builds (up to 5 hrs/mo).',
      setup: 0,
      monthly: 397,
    },
    {
      id: 'audit',
      name: 'Marketing & automation audit',
      desc: 'Full written audit of current funnels, CRM, and tools with prioritized recommendations.',
      setup: 397,
      monthly: 0,
      badge: 'addon',
    },
    {
      id: 'custom',
      name: 'Custom automation build',
      desc: 'Bespoke workflow for a unique business process. Scoped and quoted separately.',
      setup: 0,
      monthly: 0,
    },
  ],
};

export const ALL_SERVICES = Object.values(SERVICES).flat();

export function getService(id) {
  return ALL_SERVICES.find(s => s.id === id);
}
