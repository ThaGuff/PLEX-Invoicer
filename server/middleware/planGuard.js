/**
 * Plan feature enforcement — mirrors subscription tiers
 *
 * Starter ($19/mo): Basic quotes/invoices, email delivery, PDF export
 * Pro ($49/mo):     + Unlimited, AI tools, Stripe Connect, Automations, Analytics, Calendar, Documents, Photos, Team (3 members)
 * Agency ($99/mo):  + Everything, Workspace, unlimited Team members, White-label, API
 */

export const PLAN_LIMITS = {
  starter: {
    quotes_per_month:    25,
    invoices_per_month:  25,
    team_members:        0,    // no team members
    ai_parse:            false,
    stripe_connect:      false,
    csv_export:          false,
    cashflow_dashboard:  false,
    automations:         false,
    analytics:           false, // basic only
    calendar:            false,
    documents:           false,
    photos:              false,
    workspace:           false,
    white_label:         false,
    api_access:          false,
    push_notifications:  false,
  },
  pro: {
    quotes_per_month:    -1,   // unlimited
    invoices_per_month:  -1,
    team_members:        3,
    ai_parse:            true,
    stripe_connect:      true,
    csv_export:          true,
    cashflow_dashboard:  true,
    automations:         true,
    analytics:           true,
    calendar:            true,
    documents:           true,
    photos:              true,
    workspace:           true,
    white_label:         false,
    api_access:          false,
    push_notifications:  true,
  },
  agency: {
    quotes_per_month:    -1,
    invoices_per_month:  -1,
    team_members:        -1,   // unlimited
    ai_parse:            true,
    stripe_connect:      true,
    csv_export:          true,
    cashflow_dashboard:  true,
    automations:         true,
    analytics:           true,
    calendar:            true,
    documents:           true,
    photos:              true,
    workspace:           true,
    white_label:         true,
    api_access:          true,
    push_notifications:  true,
  },
};

export function canUsePlanFeature(plan = 'starter', feature) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  const val = limits[feature];
  if (val === undefined) return true;  // unknown feature = allow
  if (val === false) return false;
  if (val === true || val === -1) return true;
  if (typeof val === 'number') return val > 0;
  return true;
}

export function getPlanLimit(plan = 'starter', feature) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  return limits[feature];
}

/** Middleware: require plan feature or return 403 */
export function requirePlanFeature(feature) {
  return async (req, res, next) => {
    try {
      const { db } = await import('../db/schema.js');
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // First check if user is the account owner
      let accResult = await db.execute(
        `SELECT plan, subscription_status, trial_ends_at FROM accounts WHERE owner_id = ? LIMIT 1`,
        [userId]
      );
      
      // If not an owner, check if they're an invited member — use the account's plan
      if (!accResult.rows.length) {
        accResult = await db.execute(
          `SELECT a.plan, a.subscription_status, a.trial_ends_at
           FROM account_members am
           JOIN accounts a ON a.id = am.account_id
           WHERE am.user_id = ? AND am.status = 'active'
           ORDER BY a.created_at ASC LIMIT 1`,
          [userId]
        );
      }
      
      if (!accResult.rows.length) return next(); // no account at all = allow

      const { plan, subscription_status, trial_ends_at } = accResult.rows[0];
      const isTrialing = subscription_status === 'trialing';
      const trialEnd   = trial_ends_at ? new Date(trial_ends_at) : null;
      const trialActive = isTrialing && trialEnd && trialEnd > new Date();

      // Active trial = full Pro access for 7 days
      if (trialActive) return next();

      // Expired/cancelled = enforce plan
      if (!canUsePlanFeature(plan, feature)) {
        const upgradeTo = plan === 'starter' ? 'Pro' : 'Agency';
        return res.status(403).json({
          error: `This feature requires ${upgradeTo} or higher. Upgrade to access ${feature.replace(/_/g,' ')}.`,
          feature,
          plan,
          upgrade_url: '/billing',
        });
      }
      next();
    } catch (e) {
      console.error('planGuard error:', e.message);
      next(); // fail open
    }
  };
}
