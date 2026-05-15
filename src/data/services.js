// ─── Pricing rationale ────────────────────────────────────────────────────────
// Benchmarked against Huntsville AL market rates (Hughes Web Designs, Be Seen
// Solutions, Rocket City Digital, Zellus Marketing, SEOteric, IG Webs) and
// AI automation agency comps nationwide. Local market prices are
// 10–20% below major metros; premium for AI/voice services remains high.
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
  // Local Huntsville AL web agencies: $2,500–$6,000 build, $97–$297/mo mgmt
  web: [
    {
      id: 'web-starter',
      name: 'Starter website (5 pages)',
      desc: 'Mobile-responsive brochure site: Home, About, Services, Contact, and FAQ. Built and hosted by PLEX on your custom domain.',
      setup: 1500,
      monthly: 0,
      badge: 'popular',
    },
    {
      id: 'web-pro',
      name: 'Pro website (8–12 pages)',
      desc: 'Full business site with custom design, on-page SEO, contact forms, appointment booking widget, and blog foundation — built by PLEX.',
      setup: 2800,
      monthly: 0,
      badge: 'popular',
    },
    {
      id: 'web-premium',
      name: 'Premium website (12+ pages)',
      desc: 'Multi-section site with custom graphics, case studies, testimonials, advanced SEO, and full PLEX automation integration.',
      setup: 4500,
      monthly: 0,
    },
    {
      id: 'web-ecomm',
      name: 'E-commerce website',
      desc: 'Online store with product catalog, Stripe payments, order management, and mobile-optimized checkout — built and launched by PLEX.',
      setup: 5500,
      monthly: 0,
    },
    {
      id: 'web-mgmt-basic',
      name: 'Website management — Basic',
      desc: 'Monthly content updates (up to 3 changes), security patches, uptime monitoring, and a monthly performance report from PLEX.',
      setup: 0,
      monthly: 97,
    },
    {
      id: 'web-mgmt-pro',
      name: 'Website management — Pro',
      desc: 'Unlimited content edits, performance optimization, one blog post per month, hosting oversight, and priority PLEX support.',
      setup: 0,
      monthly: 197,
      badge: 'popular',
    },
    {
      id: 'web-mgmt-premium',
      name: 'Website management — Premium',
      desc: 'Everything in Pro plus new landing page builds, A/B testing, monthly SEO audit, and a dedicated PLEX account manager.',
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
      desc: 'Every missed call gets an automatic text-back within 60 seconds — keeps the conversation alive and the lead warm. Built and managed by PLEX.',
      setup: 247,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'stl',
      name: 'Speed-to-lead follow-up',
      desc: 'Instant SMS + email sequence fires the moment a new lead submits a web form. PLEX builds the sequence to your business and offer.',
      setup: 347,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'rep',
      name: 'Reputation automation',
      desc: 'Post-job review requests sent automatically via SMS and email. 4–5 star reviews route to Google; lower scores go to private feedback. Built by PLEX.',
      setup: 247,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'appt',
      name: 'Appointment reminder & confirmation',
      desc: 'Multi-step SMS and email reminders with 2-way confirmation before every appointment. Reduces no-shows by up to 40%.',
      setup: 247,
      monthly: 77,
    },
    {
      id: 'nosh',
      name: 'No-show reactivation',
      desc: 'Automated re-booking sequence reaches out to no-shows within 24–72 hours — recovers lost appointments without any manual effort.',
      setup: 197,
      monthly: 57,
    },
    {
      id: 'leadnurture',
      name: 'Lead nurture drip sequence',
      desc: 'Multi-touch SMS and email campaign for new and cold leads — 7 to 14 steps over 30 to 60 days. Fully built and managed by PLEX.',
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
      desc: '24/7 AI phone agent answers inbound calls, handles FAQs, qualifies leads, and books appointments — even after hours. Deployed and monitored by PLEX.',
      setup: 897,
      monthly: 247,
      badge: 'popular',
    },
    {
      id: 'chatbot',
      name: 'AI website chatbot',
      desc: 'GPT-powered chat widget installed on your site — captures leads, answers common questions, and sends booking links. Trained on your business by PLEX.',
      setup: 597,
      monthly: 147,
    },
    {
      id: 'aisms',
      name: 'AI SMS conversation agent',
      desc: 'Two-way AI texting for lead qualification, objection handling, and appointment scheduling — runs automatically, around the clock.',
      setup: 697,
      monthly: 197,
    },
    {
      id: 'summ',
      name: 'AI call summary & CRM logging',
      desc: 'Every inbound call is transcribed, summarized by AI, and automatically logged to the contact record in your PLEX dashboard.',
      setup: 497,
      monthly: 127,
    },
    {
      id: 'intent',
      name: 'AI lead intent scoring',
      desc: 'AI scores every lead hot, warm, or cold based on behavior signals and auto-routes them into the right follow-up sequence.',
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
      desc: 'AI-assisted monthly blog posts, meta tag optimization, schema markup, and directory submissions — all handled by PLEX.',
      setup: 397,
      monthly: 247,
    },
    {
      id: 'social',
      name: 'Social media auto-posting',
      desc: 'Scheduled posts to Facebook, Instagram, and Google Business Profile — 12 to 16 posts per month, written and published by PLEX.',
      setup: 247,
      monthly: 167,
    },
    {
      id: 'email',
      name: 'Email newsletter automation',
      desc: 'Monthly branded newsletters designed, written, and sent to your segmented contact list — fully managed by PLEX.',
      setup: 297,
      monthly: 127,
    },
    {
      id: 'gmb',
      name: 'Google Business Profile management',
      desc: 'Weekly posts, Q&A responses, review reply templates, and photo updates — your Google presence managed by PLEX.',
      setup: 197,
      monthly: 97,
    },
    {
      id: 'fbads',
      name: 'Facebook/Instagram ads retargeting',
      desc: 'Your contact list synced to Meta custom audiences with automated ad triggers on key lead actions — set up and managed by PLEX.',
      setup: 497,
      monthly: 167,
      badge: 'addon',
    },
  ],

  // ── CRM & Pipeline ───────────────────────────────────────────────────────────
  crm: [
    {
      id: 'crmsetup',
      name: 'PLEX CRM full setup',
      desc: 'Full pipeline build, custom fields, tags, contact import, user access configuration, and owner orientation — done for you by PLEX.',
      setup: 897,
      monthly: 0,
    },
    {
      id: 'pipeline',
      name: 'Sales pipeline automation',
      desc: 'Stage-based triggers, task assignments, deal scoring, and automated follow-up cadences built inside your PLEX dashboard.',
      setup: 497,
      monthly: 127,
    },
    {
      id: 'onboard',
      name: 'Client onboarding workflow',
      desc: 'Welcome sequence, document collection, intake form routing, and kickoff scheduler — fully automated and built by PLEX.',
      setup: 397,
      monthly: 77,
    },
    {
      id: 'reactivate',
      name: 'Past client reactivation campaign',
      desc: 'Segmented win-back campaign to dormant contacts with AI-personalized SMS and email — built and launched by PLEX.',
      setup: 297,
      monthly: 57,
    },
    {
      id: 'reporting',
      name: 'Automated reporting dashboard',
      desc: 'Monthly performance report delivered to your inbox — leads captured, reviews sent, bookings made, and revenue tracked.',
      setup: 297,
      monthly: 77,
    },
  ],

  // ── Add-ons & one-time ───────────────────────────────────────────────────────
  addon: [
    {
      id: 'plexwl',
      name: 'PLEX branded client sub-account',
      desc: 'White-labeled PLEX sub-account configured with your client\'s logo, custom domain, email sending, and phone number.',
      setup: 397,
      monthly: 0,
      badge: 'addon',
    },
    {
      id: 'lp',
      name: 'Landing page & funnel build',
      desc: 'Single conversion-optimized funnel page with lead form, calendar embed, and automation trigger — built by PLEX on your domain.',
      setup: 597,
      monthly: 0,
    },
    {
      id: 'training',
      name: 'Team training & onboarding session',
      desc: '90-minute live Zoom walkthrough of your PLEX systems — covers dashboards, contacts, pipelines, and day-to-day workflows for your staff.',
      setup: 247,
      monthly: 0,
    },
    {
      id: 'retainer',
      name: 'Managed services retainer',
      desc: 'Ongoing PLEX support — optimization, updates, new automation builds, and direct access to your account team (up to 5 hrs/mo).',
      setup: 0,
      monthly: 397,
    },
    {
      id: 'audit',
      name: 'Marketing & automation audit',
      desc: 'Full written audit of your current funnels, CRM, and marketing stack — delivered by PLEX with prioritized action items.',
      setup: 397,
      monthly: 0,
      badge: 'addon',
    },
    {
      id: 'custom',
      name: 'Custom automation build',
      desc: 'A bespoke PLEX automation for any unique business process. Scoped and quoted after a discovery call.',
      setup: 0,
      monthly: 0,
    },
  ],
};

export const ALL_SERVICES = Object.values(SERVICES).flat();

export function getService(id) {
  return ALL_SERVICES.find(s => s.id === id);
}
