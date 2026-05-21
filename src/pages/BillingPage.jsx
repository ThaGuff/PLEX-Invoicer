import React, { useState, useEffect } from 'react';
import { CheckCircle, Zap, Building2, Star, RefreshCw, ExternalLink, Crown } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    icon: Zap,
    price: 19,
    color: '#13B5EA',
    description: 'Perfect for freelancers and solo operators just getting started.',
    features: [
      'Up to 25 quotes/month',
      'Up to 25 invoices/month',
      '1 client account',
      'Payment tracking (Stripe, Cash, Check, etc.)',
      'Basic tax reporting',
      'Email invoice delivery',
      'PDF exports',
      '7-day free trial',
    ],
    limits: { quotes: 25, invoices: 25, accounts: 1 },
  },
  {
    key: 'pro',
    name: 'Pro',
    icon: Star,
    price: 49,
    color: '#7c3aed',
    badge: 'Most Popular',
    description: 'For growing agencies managing multiple clients and automating workflows.',
    features: [
      'Unlimited quotes & invoices',
      'Up to 10 client accounts',
      'All payment methods + fee tracking',
      'Full tax reporting (CSV & PDF export)',
      'Predictive cash flow dashboard',
      'Smart payment reminders',
      'Stripe Connect integration',
      'Client engagement tracking',
      'Priority support',
      '7-day free trial',
    ],
    limits: { quotes: -1, invoices: -1, accounts: 10 },
  },
  {
    key: 'agency',
    name: 'Agency',
    icon: Building2,
    price: 99,
    color: '#d97706',
    description: 'For established agencies running full-service AI automation at scale.',
    features: [
      'Everything in Pro',
      'Unlimited client accounts',
      'White-label client portal',
      'Advanced analytics & reporting',
      'Custom branding per account',
      'API access',
      'Dedicated onboarding support',
      'Team member access (coming soon)',
      'SLA guarantee',
      '7-day free trial',
    ],
    limits: { quotes: -1, invoices: -1, accounts: -1 },
  },
];

const STATUS_LABELS = {
  trialing:   { label: 'Free Trial',  color: '#13B5EA' },
  active:     { label: 'Active',      color: '#16a34a' },
  cancelled:  { label: 'Cancelled',   color: '#dc2626' },
  suspended:  { label: 'Suspended',   color: '#dc2626' },
  past_due:   { label: 'Past Due',    color: '#d97706' },
};

export default function BillingPage() {
  const { account } = useAccount();
  const accent = account?.primary_color || '#13B5EA';

  const [loading, setLoading]   = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError]       = useState('');
  const [annual, setAnnual]     = useState(false);

  const currentPlan = account?.plan || 'starter';
  const currentStatus = account?.subscription_status || 'trialing';
  const trialEnds = account?.trial_ends_at;

  const trialDaysLeft = trialEnds
    ? Math.max(0, Math.ceil((new Date(trialEnds) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const statusInfo = STATUS_LABELS[currentStatus] || STATUS_LABELS.trialing;

  const handleSelectPlan = async (planKey) => {
    if (planKey === currentPlan && currentStatus === 'active') return;
    setLoading(planKey);
    setError('');
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token}`,
        },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token}`,
        },
      });
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
      else setError(data.error || 'Could not open billing portal');
    } catch (e) {
      setError(e.message);
    }
    setPortalLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: accent + '18', color: accent }}>
          <Crown size={12} /> Revanew Plans
        </div>
        <h1 className="text-3xl font-bold text-ink mb-3">Simple, transparent pricing</h1>
        <p className="text-ink-muted max-w-xl mx-auto">
          All plans include a <strong>7-day free trial</strong> — no credit card required to start.
          Upgrade, downgrade, or cancel anytime.
        </p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm font-medium ${!annual ? 'text-ink' : 'text-ink-muted'}`}>Monthly</span>
          <button onClick={() => setAnnual(a => !a)}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: annual ? accent : '#E5E8EB' }}>
            <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
              style={{ transform: annual ? 'translateX(24px)' : 'translateX(0)' }} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-ink' : 'text-ink-muted'}`}>
            Annual <span className="text-green-600 text-xs font-bold">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Current plan banner */}
      {currentStatus !== 'cancelled' && (
        <div className="card p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: statusInfo.color + '18' }}>
              <CheckCircle size={16} style={{ color: statusInfo.color }} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">
                Current plan: <span className="capitalize">{currentPlan}</span>
                {' '}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: statusInfo.color + '18', color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
              </p>
              {currentStatus === 'trialing' && trialDaysLeft !== null && (
                <p className="text-xs text-ink-muted">
                  {trialDaysLeft > 0 ? `${trialDaysLeft} days left in your free trial` : 'Trial expired — upgrade to continue'}
                </p>
              )}
              {currentStatus === 'active' && (
                <p className="text-xs text-ink-muted">Your subscription is active and renewing</p>
              )}
            </div>
          </div>
          {(currentStatus === 'active' || currentStatus === 'trialing') && (
            <button onClick={handleManageBilling} disabled={portalLoading}
              className="btn-ghost flex items-center gap-1.5 text-sm">
              {portalLoading ? <RefreshCw size={13} className="animate-spin" /> : <ExternalLink size={13} />}
              Manage billing
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="card p-4 mb-6 text-sm text-red-600 border border-red-200 bg-red-50">{error}</div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isCurrent = plan.key === currentPlan;
          const price = annual ? Math.round(plan.price * 0.8) : plan.price;
          const isLoading = loading === plan.key;

          return (
            <div key={plan.key}
              className="card overflow-hidden flex flex-col"
              style={{
                border: isCurrent ? `2px solid ${plan.color}` : undefined,
                boxShadow: plan.badge ? '0 8px 32px rgba(0,0,0,0.12)' : undefined,
              }}>
              {/* Badge */}
              {plan.badge && (
                <div className="text-center text-xs font-bold py-1.5 text-white"
                  style={{ background: plan.color }}>
                  ⭐ {plan.badge}
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                {/* Plan header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: plan.color + '18' }}>
                    <Icon size={18} style={{ color: plan.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-ink text-lg leading-none">{plan.name}</p>
                    {isCurrent && (
                      <p className="text-xs mt-0.5" style={{ color: plan.color }}>Current plan</p>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-ink">${price}</span>
                    <span className="text-ink-muted text-sm">/mo</span>
                    {annual && <span className="text-xs text-green-600 font-semibold ml-1">billed annually</span>}
                  </div>
                  <p className="text-sm text-ink-muted mt-1">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink">
                      <CheckCircle size={14} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={isLoading || (isCurrent && currentStatus === 'active')}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: isCurrent && currentStatus === 'active' ? 'var(--bg-page)' : 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)',
                    color: isCurrent && currentStatus === 'active' ? '#7A7E85' : '#FFFFFF',
                  }}>
                  {isLoading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Redirecting…</>
                  ) : isCurrent && currentStatus === 'active' ? (
                    'Current plan'
                  ) : currentStatus === 'trialing' ? (
                    `Start ${plan.name} — 7-day free trial`
                  ) : (
                    `Switch to ${plan.name}`
                  )}
                </button>

                {currentStatus !== 'active' && (
                  <p className="text-center text-xs text-ink-muted mt-2">No credit card required to trial</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ / guarantee */}
      <div className="mt-10 card p-6">
        <h3 className="text-sm font-bold text-ink mb-4">Frequently asked questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ['Can I cancel anytime?', 'Yes. Cancel from the billing portal with one click. No questions asked, no cancellation fees.'],
            ['What happens when my trial ends?', 'You\'ll be notified 2 days before your trial expires. Your data is always safe — upgrading restores full access instantly.'],
            ['Can I switch plans?', 'Absolutely. Upgrade or downgrade at any time. Prorated billing means you only pay for what you use.'],
            ['Is my data safe?', 'All data is stored in Supabase PostgreSQL with daily backups. Your data is never deleted, even if you cancel.'],
          ].map(([q, a]) => (
            <div key={q}>
              <p className="text-sm font-semibold text-ink mb-1">{q}</p>
              <p className="text-sm text-ink-muted">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy & powered by */}
      <div className="mt-8 text-center space-y-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Revanew is powered by{' '}
          <a href="https://plexautomation.io" target="_blank" rel="noreferrer"
            style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>PLEX Automation</a>.
          Billing managed securely by Stripe.
        </p>
        <div className="flex items-center justify-center gap-4">
          {[
            { label: 'Privacy policy', href: 'https://plexautomation.io/privacy' },
            { label: 'Terms of service', href: 'https://plexautomation.io/terms' },
            { label: 'Support', href: 'mailto:hello@plexautomation.io' },
          ].map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer"
              className="text-xs" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
