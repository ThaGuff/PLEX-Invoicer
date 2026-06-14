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
  <svg width="32" height="40" viewBox="0 0 80 100" fill="none">
    <rect x="2" y="36" width="76" height="8" rx="2" fill="#C6E404"/>
    <polygon points="12,18 22,36 2,36" fill="#C6E404"/>
    <polygon points="68,18 78,36 58,36" fill="#C6E404"/>
    <rect x="28" y="22" width="24" height="14" fill="#C6E404"/>
    <polygon points="22,36 28,30 25,36" fill="#0A0F13"/>
    <polygon points="52,36 58,30 55,36" fill="#0A0F13"/>
    <polygon points="40,7 47,15 40,23 33,15" fill="#C6E404"/>
    <polygon points="40,11 44,15 40,19 36,15" fill="#A8C200"/>
    <path d="M4,44 L4,92 Q4,96 8,96 L56,96 Q60,96 60,92 L60,58 L46,44 Z" fill="#0A0F13"/>
    <polygon points="46,44 60,58 46,58" fill="#C6E404"/>
    <rect x="10" y="62" width="28" height="26" rx="1.5" fill="white"/>
    <rect x="14" y="68" width="20" height="3.5" rx="1.5" fill="#0A0F13"/>
    <rect x="14" y="75" width="14" height="3.5" rx="1.5" fill="#0A0F13"/>
    <rect x="14" y="82" width="18" height="3.5" rx="1.5" fill="#C6E404"/>
  </svg>
);

const PLANS = [
  {
    key: 'starter', name: 'Starter', price: 19, icon: Zap, color: '#C6E404',
    desc: 'For solo freelancers getting started.',
    features: ['10 quotes/month', '10 invoices/month', '1 account', 'Cash, Check, Zelle, Venmo', 'PDF export', '7-day free trial'],
  },
  {
    key: 'pro', name: 'Pro', price: 49, icon: Star, color: '#C6E404', badge: 'Most popular',
    desc: 'For growing service businesses.',
    features: ['100 quotes & invoices/month', '5 client accounts', 'All payment methods', 'Stripe card & ACH processing', 'Tax reporting + CSV export', 'AI quote parsing', 'Cash flow dashboard', '7-day free trial'],
  },
  {
    key: 'agency', name: 'Agency', price: 99, icon: Building2, color: '#C6E404',
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

  const baseStyle = { fontFamily: "'Inter', sans-serif", background: '#080D1A', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#fff' };

  return (
    <div style={baseStyle}>
      {/* Logo + brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        {LOGO_SVG}
        <div>
          <p style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>Invoice King</p>
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
              background: step >= s ? '#C6E404' : 'rgba(255,255,255,0.08)',
              color: step >= s ? '#0A0F13' : 'rgba(255,255,255,0.4)',
            }}>{s}</div>
            {s < 2 && <div style={{ width: '32px', height: '1px', background: step > s ? '#C6E404' : 'rgba(255,255,255,0.15)' }} />}
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
              All plans include a <strong style={{ color: '#C6E404' }}>7-day free trial</strong> — no charge until your trial ends.
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
                    transition: 'all 0.15s', color: '#fff', fontFamily: "'Inter', sans-serif",
                    position: 'relative',
                  }}>
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #1A1A1A, #C6E404)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' }}>
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

          {error && <p style={{ textAlign: 'center', color: '#64748B', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleSelectPlan} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 32px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #C6E404, #1A1A1A, #C6E404)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: "'Inter', sans-serif" }}>
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
      {/* Terms notice at bottom of plan step */}
      {step === 1 && (
        <p style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:16, lineHeight:1.5 }}>
          By selecting a plan you agree to Invoice King's{' '}
          <a href="/terms" target="_blank" rel="noreferrer" style={{ color:'#C6E404', textDecoration:'none' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" rel="noreferrer" style={{ color:'#C6E404', textDecoration:'none' }}>Privacy Policy</a>.
        </p>
      )}

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
                  fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#C6E404'}
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

          {error && <p style={{ textAlign: 'center', color: '#64748B', fontSize: '13px' }}>{error}</p>}

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#2A3A55', marginTop: '12px' }}>
            All payments processed securely by Stripe. Invoice King never stores card numbers.
          </p>
        </div>
      )}
    </div>
  );
}
