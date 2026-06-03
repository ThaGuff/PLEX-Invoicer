/**
 * Revanew Plan Feature Definitions
 * Powered by PLEX Automation
 * 
 * Feature gating is enforced on the frontend (UX) AND server (API).
 * Always check both layers.
 */

export const PLAN_LIMITS = {
  starter: {
    quotes_per_month:    25,      // matches server planGuard
    invoices_per_month:  25,      // matches server planGuard
    accounts:            1,
    contacts:            25,
    tax_reporting:       false,
    ai_parse:            false,
    stripe_connect:      false,
    cashflow_dashboard:  false,
    automations:         false,
    analytics:           false,
    calendar:            false,
    documents:           false,
    photos:              false,
    workspace:           false,
    smart_reminders:     3,
    pdf_export:          true,
    csv_export:          false,
    custom_branding:     false,
    push_notifications:  false,
    payment_methods:     ['cash', 'check', 'zelle', 'venmo', 'other'],
    payment_processing:  false,
  },
  pro: {
    quotes_per_month:    -1,      // unlimited — matches server
    invoices_per_month:  -1,
    accounts:            5,
    contacts:            -1,
    tax_reporting:       true,
    ai_parse:            true,
    stripe_connect:      true,
    cashflow_dashboard:  true,
    automations:         true,
    analytics:           true,
    calendar:            true,
    documents:           true,
    photos:              true,
    workspace:           true,
    smart_reminders:     -1,
    pdf_export:          true,
    csv_export:          true,
    custom_branding:     true,
    push_notifications:  true,
    payment_methods:     ['stripe', 'square', 'paypal', 'zelle', 'venmo', 'cash', 'check', 'ach', 'other'],
    payment_processing:  true,
  },
  agency: {
    quotes_per_month:    -1,
    invoices_per_month:  -1,
    accounts:            -1,
    contacts:            -1,
    tax_reporting:       true,
    ai_parse:            true,
    stripe_connect:      true,
    cashflow_dashboard:  true,
    smart_reminders:     -1,
    pdf_export:          true,
    csv_export:          true,
    custom_branding:     true,
    payment_methods:     ['stripe', 'square', 'paypal', 'zelle', 'venmo', 'cash', 'check', 'ach', 'other'],
    payment_processing:  true,
  },
};

export const PLAN_NAMES = { starter: 'Starter', pro: 'Pro', agency: 'Agency' };
export const PLAN_PRICES = { starter: 19, pro: 49, agency: 99 };
export const PLAN_COLORS = { 
  starter: '#00E5C8', 
  pro:     '#4B7BFF', 
  agency:  '#7B4FE8',
};

export function getPlanLimits(plan = 'starter') {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

export function canUseFeature(plan = 'starter', feature) {
  const limits = getPlanLimits(plan);
  return !!limits[feature];
}

export function isAtLimit(plan = 'starter', feature, currentCount) {
  const limits = getPlanLimits(plan);
  const limit = limits[feature];
  if (limit === -1) return false;           // unlimited
  if (limit === false) return true;          // feature off
  return currentCount >= limit;
}

export function getUpgradeMessage(feature) {
  const messages = {
    ai_parse:           'AI parsing is available on Pro and Agency plans.',
    stripe_connect:     'Stripe card processing is available on Pro and Agency plans.',
    cashflow_dashboard: 'Cash flow forecasting is available on Pro and Agency plans.',
    tax_reporting:      'Tax reports and CSV export are available on Pro and Agency plans.',
    csv_export:         'CSV export is available on Pro and Agency plans.',
    custom_branding:    'Custom branding is available on Pro and Agency plans.',
    quotes_per_month:   'You\'ve reached your monthly quote limit. Upgrade to Pro for 100/month.',
    invoices_per_month: 'You\'ve reached your monthly invoice limit. Upgrade to Pro for 100/month.',
    accounts:           'You\'ve reached your account limit. Upgrade to Pro for 5 client accounts.',
    payment_processing: 'Credit card and bank account processing requires Pro or Agency.',
  };
  return messages[feature] || 'This feature requires a higher plan.';
}
