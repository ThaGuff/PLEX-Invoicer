/**
 * Onboarding flow — shown to new users after first sign-in.
 * Step 1: Select plan (Starter / Pro / Agency) — includes 7-day trial
 * Step 2: Optional payment method setup (skip available)
 * Step 3: Redirect to dashboard
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Zap, Star, Building2, CreditCard, ArrowRight, X, Lock } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { PLAN_PRICES, PLAN_COLORS } from '../utils/planFeatures';

const LOGO_SVG = (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <rect width="100" height="100" rx="18" fill="#080D1A"/>
    <defs>
      <linearGradient id="rg-ob" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00E5C8"/><stop offset="50%" stopColor="#4B7BFF"/><stop offset="100%" stopColor="#7B4FE8"/>
      </linearGradient>
    </defs>
    <text x="14" y="80" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="80" fill="url(#rg-ob)">R</text>
  </svg>
);

const PLANS = [
  {
    key: 'starter', name: 'Starter', price: 19, icon: Zap, color: '#00E5C8',
    desc: 'For solo freelancers getting started.',
    features: ['10 quotes/month', '10 invoices/month', '1 account', 'Cash, Check, Zelle, Venmo', 'PDF export', '7-day free trial'],
  },
  {
    key: 'pro', name: 'Pro', price: 49, icon: Star, color: '#4B7BFF', badge: 'Most popular',
    desc: 'For growing service businesses.',
    features: ['100 quotes & invoices/month', '5 client accounts', 'All payment methods', 'Stripe card & ACH processing', 'Tax reporting + CSV export', 'AI quote parsing', 'Cash flow dashboard', '7-day free trial'],
  },
  {
    key: 'agency', name: 'Agency', price: 99, icon: Building2, color: '#7B4FE8',
    desc: 'For established agencies at scale.',
    features: ['Unlimited everything', 'Unlimited accounts', 'White-label portal', 'Priority support', 'API access', '7-day free trial'],
  },
];

const PAYMENT_CARDS = [
  { key: 'stripe_card', label: 'Credit / debit card', icon: '💳', desc: 'Visa, Mastercard, Amex, Discover. Processed by Stripe.' },
  { key: 'stripe_ach',  label: 'Bank account (ACH)', icon: '🏦', desc: 'Direct debit from checking/savings. Processed by Stripe via Plaid.' },
  { key: 'skip',        label: 'Skip for now',        icon: '⏭️',  desc: 'Add a payment method later in billing settings.' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { account } = useAccount();

  const [step, setStep]           = useState(1); // 1=plan, 2=payment
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const handleSelectPlan = async () => {
    setSaving(true); setError('');
    try {
      const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Get the user's accounts (or create one if new)
      let accountId = account?.id;
      if (!accountId) {
        const accRes = await fetch('/api/accounts', { headers: { Authorization: `Bearer ${token}` } });
        const accs = await accRes.json();
        accountId = Array.isArray(accs) && accs.length > 0 ? accs[0].id : null;
      }

      if (accountId) {
        // Update existing account plan
        await fetch('/api/accounts/' + accountId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            plan: selectedPlan,
            subscription_status: 'trialing',
            trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      } else {
        // Create a new account with the plan
        await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            name: 'My Business',
            plan: selectedPlan,
            subscription_status: 'trialing',
          }),
        });
      }
      setStep(2);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handlePaymentChoice = async (choice) => {
    if (choice === 'skip') {
      navigate('/dashboard');
      return;
    }
    // For Stripe card or ACH — redirect to checkout
    setSaving(true);
    try {
      const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan: selectedPlan, payment_type: choice }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setError(data.error || 'Could not start checkout'); setSaving(false); }
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const baseStyle = { fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#080D1A', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#fff' };

  return (
    <div style={baseStyle}>
      {/* Logo + brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        {LOGO_SVG}
        <div>
          <p style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>Revanew</p>
          <p style={{ fontSize: '10px', color: '#3A5070', fontWeight: 500 }}>Powered by PLEX Automation</p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
        {[1, 2].map(s => (
          <React.Fragment key={s}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
              background: step >= s ? 'linear-gradient(135deg, #00E5C8, #4B7BFF)' : '#1A2640',
              color: step >= s ? '#fff' : '#3A5070',
            }}>{s}</div>
            {s < 2 && <div style={{ width: '32px', height: '1px', background: step > s ? '#4B7BFF' : '#1A2640' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1: Plan selection */}
      {step === 1 && (
        <div style={{ width: '100%', maxWidth: '900px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '8px' }}>
              Choose your plan
            </h1>
            <p style={{ fontSize: '14px', color: '#3A5070' }}>
              All plans include a <strong style={{ color: '#00E5C8' }}>7-day free trial</strong> — no charge until your trial ends.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {PLANS.map(plan => {
              const Icon = plan.icon;
              const selected = selectedPlan === plan.key;
              return (
                <button key={plan.key} onClick={() => setSelectedPlan(plan.key)}
                  style={{
                    background: selected ? 'rgba(75,123,255,0.08)' : '#0D1526',
                    border: selected ? `1.5px solid ${plan.color}` : '0.5px solid #1A2640',
                    borderRadius: '12px', padding: '20px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    position: 'relative',
                  }}>
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #4B7BFF, #7B4FE8)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      ⭐ {plan.badge}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: plan.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={plan.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 800 }}>{plan.name}</p>
                      <p style={{ fontSize: '11px', color: '#3A5070' }}>{plan.desc}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '26px', fontWeight: 800, marginBottom: '14px' }}>
                    ${plan.price}<span style={{ fontSize: '13px', fontWeight: 500, color: '#3A5070' }}>/mo</span>
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <CheckCircle size={12} color={plan.color} style={{ flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {selected && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid rgba(75,123,255,0.2)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: plan.color }}>
                      <CheckCircle size={12} /> Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {error && <p style={{ textAlign: 'center', color: '#FCA5A5', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleSelectPlan} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 32px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {saving ? 'Saving…' : `Start ${PLANS.find(p=>p.key===selectedPlan)?.name} trial`}
              {!saving && <ArrowRight size={16} />}
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#2A3A55', marginTop: '14px' }}>
            No credit card required. Cancel anytime.
          </p>
        </div>
      )}

      {/* STEP 2: Payment method */}
      {step === 2 && (
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '8px' }}>
              Add a payment method
            </h1>
            <p style={{ fontSize: '13px', color: '#3A5070' }}>
              Optional — your trial won't be charged. Add one now so billing is seamless when your trial ends.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {PAYMENT_CARDS.map(pm => (
              <button key={pm.key} onClick={() => handlePaymentChoice(pm.key)} disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                  borderRadius: '10px', border: pm.key === 'skip' ? '0.5px dashed #1A2640' : '0.5px solid #1A2640',
                  background: '#0D1526', cursor: 'pointer', textAlign: 'left', color: '#fff',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#4B7BFF'}
                onMouseLeave={e => e.currentTarget.style.borderColor = pm.key === 'skip' ? '#1A2640' : '#1A2640'}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{pm.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>{pm.label}</p>
                  <p style={{ fontSize: '11px', color: '#3A5070' }}>{pm.desc}</p>
                </div>
                <ArrowRight size={15} color="#3A5070" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>

          {/* Pro/Agency note about card processing */}
          {selectedPlan !== 'starter' && (
            <div style={{ background: 'rgba(75,123,255,0.08)', border: '0.5px solid rgba(75,123,255,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#7B9FFF', lineHeight: 1.5 }}>
                💳 Your <strong>{PLANS.find(p=>p.key===selectedPlan)?.name}</strong> plan includes <strong>Stripe card and ACH bank processing</strong> for your invoices — so your clients can pay online with a credit card or bank transfer.
              </p>
            </div>
          )}

          {error && <p style={{ textAlign: 'center', color: '#FCA5A5', fontSize: '13px' }}>{error}</p>}

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#2A3A55', marginTop: '12px' }}>
            All payments processed securely by Stripe. Revanew never stores card numbers.
          </p>
        </div>
      )}
    </div>
  );
}
