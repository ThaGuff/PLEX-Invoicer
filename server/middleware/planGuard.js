/**
 * Server-side plan feature enforcement
 * Mirrors src/utils/planFeatures.js for backend validation
 */

const PLAN_LIMITS = {
  starter: {
    quotes_per_month: 10,
    invoices_per_month: 10,
    ai_parse: false,
    stripe_connect: false,
    csv_export: false,
    cashflow_dashboard: false,
  },
  pro: {
    quotes_per_month: 100,
    invoices_per_month: 100,
    ai_parse: true,
    stripe_connect: true,
    csv_export: true,
    cashflow_dashboard: true,
  },
  agency: {
    quotes_per_month: -1,
    invoices_per_month: -1,
    ai_parse: true,
    stripe_connect: true,
    csv_export: true,
    cashflow_dashboard: true,
  },
};

export function canUsePlanFeature(plan = 'starter', feature) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  const val = limits[feature];
  if (val === false) return false;
  if (val === true || val === -1) return true;
  if (typeof val === 'number') return val > 0;
  return true;
}

/** Middleware: require plan feature or return 403 */
export function requirePlanFeature(feature) {
  return async (req, res, next) => {
    try {
      const { db } = await import('../db/schema.js');
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const accResult = await db.execute(
        `SELECT plan, subscription_status, trial_ends_at FROM accounts WHERE owner_id = ? LIMIT 1`,
        [userId]
      );
      if (!accResult.rows.length) return next(); // no account yet = allow

      const { plan, subscription_status, trial_ends_at } = accResult.rows[0];

      // Allow during trial
      const isTrialing = subscription_status === 'trialing';
      const trialEnd = trial_ends_at ? new Date(trial_ends_at) : null;
      const trialActive = isTrialing && trialEnd && trialEnd > new Date();

      // Active subscription or active trial = enforce plan limits
      if (trialActive) return next(); // trial has full access

      if (!canUsePlanFeature(plan, feature)) {
        return res.status(403).json({
          error: `Your ${plan} plan does not include this feature. Upgrade to access it.`,
          feature,
          plan,
          upgrade_url: '/billing',
        });
      }
      next();
    } catch (e) {
      console.error('planGuard error:', e.message);
      next(); // fail open — don't block on guard errors
    }
  };
}
