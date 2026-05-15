export const YEARLY_DISCOUNT_DEFAULT = 15; // percent off monthly when paying annually

export const SECTIONS = [
  { id: 'core', label: 'Tier 1 — Core automations', icon: 'Zap' },
  { id: 'ai', label: 'Tier 2 — AI & voice', icon: 'Bot' },
  { id: 'mkt', label: 'Tier 3 — Marketing & content', icon: 'Megaphone' },
  { id: 'crm', label: 'Tier 4 — CRM & pipeline', icon: 'LayoutDashboard' },
  { id: 'addon', label: 'Add-ons & one-time', icon: 'PlusCircle' },
];

export const SERVICES = {
  core: [
    {
      id: 'mctb',
      name: 'Missed call text-back',
      desc: 'Auto-text any missed call within 60 sec via GHL workflow',
      setup: 297,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'stl',
      name: 'Speed-to-lead follow-up',
      desc: 'Instant SMS + email sequence triggered on new web form leads',
      setup: 397,
      monthly: 127,
      badge: 'popular',
    },
    {
      id: 'rep',
      name: 'Reputation automation',
      desc: 'Post-service review request via SMS/email, Google & Facebook routing',
      setup: 297,
      monthly: 97,
      badge: 'popular',
    },
    {
      id: 'appt',
      name: 'Appointment reminder & confirmation',
      desc: 'Multi-step SMS/email reminders + 2-way confirmation before appointments',
      setup: 297,
      monthly: 97,
    },
    {
      id: 'nosh',
      name: 'No-show reactivation',
      desc: 'Automated sequence to re-book no-shows within 24–72 hours',
      setup: 197,
      monthly: 67,
    },
    {
      id: 'leadnurture',
      name: 'Lead nurture drip sequence',
      desc: 'Multi-touch SMS + email campaign for new and cold leads (7–14 steps)',
      setup: 497,
      monthly: 147,
    },
  ],
  ai: [
    {
      id: 'voiceai',
      name: 'Voice AI receptionist',
      desc: '24/7 inbound call handling, Q&A, booking, and lead capture via AI phone agent',
      setup: 997,
      monthly: 297,
      badge: 'popular',
    },
    {
      id: 'chatbot',
      name: 'AI website chatbot',
      desc: 'Trained GHL chatbot with GPT backend for lead capture and FAQ handling',
      setup: 697,
      monthly: 197,
    },
    {
      id: 'aisms',
      name: 'AI SMS conversation agent',
      desc: 'Two-way AI SMS for lead qualification and appointment booking',
      setup: 797,
      monthly: 247,
    },
    {
      id: 'summ',
      name: 'AI call summary & CRM logging',
      desc: 'Transcribe and summarize inbound calls, auto-log notes to contact record',
      setup: 597,
      monthly: 147,
    },
    {
      id: 'intent',
      name: 'AI lead intent scoring',
      desc: 'Score and tag leads by behavior signals for hot/warm/cold routing',
      setup: 697,
      monthly: 197,
      badge: 'new',
    },
  ],
  mkt: [
    {
      id: 'seo',
      name: 'SEO content automation',
      desc: 'Monthly AI-generated blog posts, meta tags, and directory submissions',
      setup: 497,
      monthly: 297,
    },
    {
      id: 'social',
      name: 'Social media auto-posting',
      desc: 'Scheduled posts to Facebook, Instagram, and Google Business from one dashboard',
      setup: 297,
      monthly: 197,
    },
    {
      id: 'email',
      name: 'Email newsletter automation',
      desc: 'Monthly branded newsletters to segmented list, auto-scheduled in GHL',
      setup: 397,
      monthly: 147,
    },
    {
      id: 'gmb',
      name: 'Google Business Profile optimization',
      desc: 'Weekly posts, Q&A automation, and review response workflow via GHL',
      setup: 297,
      monthly: 97,
    },
    {
      id: 'fbads',
      name: 'Facebook ads retargeting workflow',
      desc: 'Audience sync from GHL contacts to Meta custom audiences and ad triggers',
      setup: 597,
      monthly: 197,
      badge: 'addon',
    },
  ],
  crm: [
    {
      id: 'crmsetup',
      name: 'GHL CRM full setup',
      desc: 'Pipeline build, custom fields, tags, contact import, and user onboarding',
      setup: 997,
      monthly: 0,
    },
    {
      id: 'pipeline',
      name: 'Sales pipeline automation',
      desc: 'Stage-based triggers, task assignments, deal scoring, and follow-up cadences',
      setup: 597,
      monthly: 147,
    },
    {
      id: 'onboard',
      name: 'Client onboarding workflow',
      desc: 'Welcome sequence, document collection, intake form routing, and kickoff scheduler',
      setup: 497,
      monthly: 97,
    },
    {
      id: 'reactivate',
      name: 'Past client reactivation campaign',
      desc: 'Segmented win-back campaign to dormant contacts with AI-personalized messaging',
      setup: 397,
      monthly: 67,
    },
    {
      id: 'reporting',
      name: 'Automated reporting dashboard',
      desc: 'Monthly performance reports emailed to owner — leads, bookings, and revenue',
      setup: 397,
      monthly: 97,
    },
  ],
  addon: [
    {
      id: 'ghlwl',
      name: 'GHL white-label sub-account setup',
      desc: 'Configure branded sub-account with logo, domain, SMTP, and Twilio',
      setup: 497,
      monthly: 0,
      badge: 'addon',
    },
    {
      id: 'lp',
      name: 'Landing page & funnel build',
      desc: 'Custom GHL funnel page with form, calendar, and automation hook',
      setup: 697,
      monthly: 0,
    },
    {
      id: 'training',
      name: 'Team training & onboarding session',
      desc: '90-min live training session for client staff on GHL usage',
      setup: 297,
      monthly: 0,
    },
    {
      id: 'retainer',
      name: 'Managed services retainer',
      desc: 'Ongoing optimization, support, and new automation builds (up to 5 hrs/mo)',
      setup: 0,
      monthly: 497,
    },
    {
      id: 'audit',
      name: 'Marketing & automation audit',
      desc: 'Full audit of current tools, funnels, and CRM with written recommendations',
      setup: 497,
      monthly: 0,
      badge: 'addon',
    },
    {
      id: 'custom',
      name: 'Custom automation build',
      desc: 'Bespoke workflow for unique business process — scoped separately',
      setup: 0,
      monthly: 0,
    },
  ],
};

export const ALL_SERVICES = Object.values(SERVICES).flat();

export function getService(id) {
  return ALL_SERVICES.find(s => s.id === id);
}
