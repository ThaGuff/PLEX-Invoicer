// ─── Pricing rationale ────────────────────────────────────────────────────────
// Benchmarked against Huntsville AL market rates (Hughes Web Designs, Be Seen
// Solutions, Rocket City Digital, Zellus Marketing, SEOteric, IG Webs) and
// AI automation agency comps nationwide. Local market prices are
// 10–20% below major metros; premium for AI/voice services remains high.
//
// Redundancy audit completed — each service below covers a distinct channel,
// trigger, audience, or output. Descriptions are intentionally scoped to avoid
// overlap. Key boundaries:
//   • Reputation automation = sending review requests after a job
//   • GMB management = publishing content and Q&A to the Google listing
//   • Social posting = Facebook + Instagram only (GBP handled by GMB service)
//   • Lead nurture = triggered drip for new/cold leads who haven't bought
//   • Reactivation = win-back campaign for dormant past clients
//   • Pipeline automation = CRM-side stage logic and task routing
//   • Web mgmt SEO audit = technical site health check
//   • SEO content automation = content production and directory submissions
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
  // Distinct tiers by page count and scope. Management plans are month-to-month
  // add-ons; the SEO audit included in Premium covers technical site health only
  // (not content production, which is handled by the SEO content automation service).
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
      desc: 'Full business site with custom design, on-page SEO foundation, contact forms, appointment booking widget, and blog structure — built by PLEX.',
      setup: 2800,
      monthly: 0,
      badge: 'popular',
    },
    {
      id: 'web-premium',
      name: 'Premium website (12+ pages)',
      desc: 'Multi-section site with custom graphics, case studies, testimonials, advanced on-page SEO, and full PLEX automation integration.',
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
      desc: 'Up to 3 content changes per month, security and plugin updates, uptime monitoring, and a monthly site performance report.',
      setup: 0,
      monthly: 97,
    },
    {
      id: 'web-mgmt-pro',
      name: 'Website management — Pro',
      desc: 'Unlimited content edits, one new blog post per month, hosting oversight, load speed optimization, and priority PLEX support.',
      setup: 0,
      monthly: 197,
      badge: 'popular',
    },
    {
      id: 'web-mgmt-premium',
      name: 'Website management — Premium',
      desc: 'Everything in Pro plus new landing page builds, monthly technical SEO audit (site health, crawl errors, Core Web Vitals), and a dedicated PLEX account manager.',
      setup: 0,
      monthly: 347,
    },
  ],

  // ── Core automations ─────────────────────────────────────────────────────────
  // Each item covers a distinct trigger and audience:
  //   Missed call text-back  = inbound missed call → immediate text
  //   Speed-to-lead          = web form submission → immediate sequence
  //   Reputation automation  = post-job/visit → review request (not GMB posting)
  //   Appointment reminders  = pre-appointment → reduce no-shows
  //   No-show reactivation   = missed appointment → recovery outreach
  //   Lead nurture drip      = new/cold unsold lead → long-form follow-up sequence
  core: [
    {
      id: 'mctb',
      name: 'Missed call text-back',
      desc: 'Every missed call triggers an automatic text within 60 seconds — re-engages the caller before they dial a competitor. Built and managed by PLEX.',
      setup: 247,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'stl',
      name: 'Speed-to-lead follow-up',
      desc: 'Fires an instant SMS and email the moment a new lead submits a web form — responds in minutes, not hours. PLEX builds and manages the sequence.',
      setup: 347,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'rep',
      name: 'Reputation automation',
      desc: 'Automatically requests a review after every completed job or visit. 4–5 star responses route to Google; 1–3 star go to a private feedback form to protect your rating.',
      setup: 247,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'appt',
      name: 'Appointment reminder & confirmation',
      desc: 'Sends multi-step SMS and email reminders before every appointment, with 2-way confirmation. Reduces no-shows by up to 40%.',
      setup: 247,
      monthly: 77,
    },
    {
      id: 'nosh',
      name: 'No-show reactivation',
      desc: 'When an appointment is missed, an automated re-booking sequence goes out within 24–72 hours — recovers lost revenue without any manual follow-up.',
      setup: 197,
      monthly: 57,
    },
    {
      id: 'leadnurture',
      name: 'Lead nurture drip sequence',
      desc: 'Multi-touch SMS and email campaign for new leads who haven\'t booked yet — 7 to 14 steps over 30 to 60 days. Built and managed by PLEX.',
      setup: 447,
      monthly: 127,
    },
  ],

  // ── AI & Voice ───────────────────────────────────────────────────────────────
  // Each service covers a distinct channel or function:
  //   Voice AI  = inbound phone calls answered by AI
  //   Chatbot   = on-site web chat widget (not SMS, not phone)
  //   AI SMS    = two-way conversational texting (not a fixed drip sequence)
  //   Call summary = post-call transcription and CRM logging
  //   Intent scoring = behavior-based lead classification and routing
  ai: [
    {
      id: 'voiceai',
      name: 'Voice AI receptionist',
      desc: '24/7 AI phone agent that answers inbound calls, handles FAQs, qualifies leads, and books appointments — even after hours and on weekends.',
      setup: 897,
      monthly: 247,
      badge: 'popular',
    },
    {
      id: 'chatbot',
      name: 'AI website chatbot',
      desc: 'GPT-powered chat widget on your website that captures lead info, answers common questions, and drops booking links — trained on your specific business.',
      setup: 597,
      monthly: 147,
    },
    {
      id: 'aisms',
      name: 'AI SMS conversation agent',
      desc: 'Handles two-way text conversations with leads — qualifies, answers objections, and schedules appointments automatically without a fixed script.',
      setup: 697,
      monthly: 197,
    },
    {
      id: 'summ',
      name: 'AI call summary & logging',
      desc: 'Every inbound call is transcribed and summarized by AI, then automatically logged to the contact record in your PLEX dashboard. No manual note-taking.',
      setup: 497,
      monthly: 127,
    },
    {
      id: 'intent',
      name: 'AI lead intent scoring',
      desc: 'AI evaluates lead behavior signals to classify each contact as hot, warm, or cold — then routes them automatically into the right follow-up sequence.',
      setup: 597,
      monthly: 167,
      badge: 'new',
    },
  ],

  // ── Marketing & Content ──────────────────────────────────────────────────────
  // Distinct by platform and output type:
  //   SEO content      = blog posts, schema, directory submissions (not technical audit)
  //   Social posting   = Facebook and Instagram only (Google Business is its own service)
  //   Email newsletter = broadcast to existing contact list (not triggered lead sequences)
  //   GMB management   = Google listing posts, Q&A, and photo updates (not review requests)
  //   Ads retargeting  = paid Meta ad audience automation (not organic posting)
  mkt: [
    {
      id: 'seo',
      name: 'SEO content automation',
      desc: 'AI-assisted monthly blog posts targeting local search terms, plus meta tag updates, schema markup, and directory/citation submissions — all handled by PLEX.',
      setup: 397,
      monthly: 247,
    },
    {
      id: 'social',
      name: 'Social media management',
      desc: '12 to 16 posts per month to Facebook and Instagram — written, designed, and scheduled by PLEX. Covers captions, graphics, and hashtag strategy.',
      setup: 247,
      monthly: 167,
    },
    {
      id: 'email',
      name: 'Email newsletter',
      desc: 'One branded newsletter per month designed, written, and sent to your existing contact list — different from automated lead sequences, this is a broadcast to your audience.',
      setup: 297,
      monthly: 127,
    },
    {
      id: 'gmb',
      name: 'Google Business Profile management',
      desc: 'Weekly posts, Q&A responses, and monthly photo updates to your Google listing — keeps your profile active and ranking. Does not include review request sending (see Reputation Automation).',
      setup: 197,
      monthly: 97,
    },
    {
      id: 'fbads',
      name: 'Paid ads retargeting',
      desc: 'Your PLEX contact list synced to Meta custom audiences, with automated ad triggers when leads take key actions — managed setup and monthly optimization.',
      setup: 497,
      monthly: 167,
      badge: 'addon',
    },
  ],

  // ── CRM & Pipeline ───────────────────────────────────────────────────────────
  // Distinct by CRM function:
  //   CRM setup      = one-time build of the full system architecture
  //   Pipeline auto  = stage-based CRM triggers and deal routing logic
  //   Onboarding     = workflow for YOUR new clients joining your business
  //   Reactivation   = outreach to dormant past clients (not cold leads)
  //   Reporting      = automated lead/revenue/booking performance reports
  crm: [
    {
      id: 'crmsetup',
      name: 'PLEX CRM full setup',
      desc: 'One-time build of your complete CRM: pipeline stages, custom fields, tags, contact import, team access, and a live walkthrough with your owner. Required before pipeline automation.',
      setup: 897,
      monthly: 0,
    },
    {
      id: 'pipeline',
      name: 'Sales pipeline automation',
      desc: 'Automates what happens at each pipeline stage — stage-change triggers, task assignments, deal scoring, and follow-up routing inside your PLEX dashboard.',
      setup: 497,
      monthly: 127,
    },
    {
      id: 'onboard',
      name: 'New client onboarding workflow',
      desc: 'Automates your own new client experience — welcome messages, intake forms, document collection, and a kickoff call scheduler. Removes manual admin from your process.',
      setup: 397,
      monthly: 77,
    },
    {
      id: 'reactivate',
      name: 'Past client reactivation',
      desc: 'Win-back campaign targeting dormant contacts who\'ve done business with you before — AI-personalized SMS and email to bring them back, not cold lead nurturing.',
      setup: 297,
      monthly: 57,
    },
    {
      id: 'reporting',
      name: 'Automated performance reporting',
      desc: 'Monthly summary delivered to your inbox covering leads captured, reviews sent, appointments booked, and revenue — pulled from your PLEX dashboard automatically.',
      setup: 297,
      monthly: 77,
    },
  ],

  // ── Add-ons & one-time services ──────────────────────────────────────────────
  // These are stand-alone one-time builds or ongoing support items that don't
  // fit neatly into a recurring tier — each has a unique scope.
  addon: [
    {
      id: 'lp',
      name: 'Landing page & funnel build',
      desc: 'A single conversion-focused page built for a specific campaign or offer — includes lead form, calendar embed, and automation trigger. Not a full website.',
      setup: 597,
      monthly: 0,
    },
    {
      id: 'training',
      name: 'Team training session',
      desc: '90-minute live Zoom session for your staff — covers your PLEX dashboard, contact management, pipeline, and day-to-day workflows. Recorded for future reference.',
      setup: 247,
      monthly: 0,
    },
    {
      id: 'retainer',
      name: 'Managed services retainer',
      desc: 'Dedicated PLEX support each month — optimization, bug fixes, new automation builds, and direct account team access. Up to 5 hours of active work per month.',
      setup: 0,
      monthly: 397,
    },
    {
      id: 'audit',
      name: 'Marketing & automation audit',
      desc: 'A full written review of your current funnels, CRM setup, and marketing tools — delivered by PLEX with a prioritized list of what to fix or improve.',
      setup: 397,
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
