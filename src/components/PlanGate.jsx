/**
 * PlanGate — wraps features that require a plan upgrade
 * Usage: <PlanGate feature="calendar" plan={account?.plan} trial={account?.subscription_status === 'trialing'}>
 *          <CalendarPage />
 *        </PlanGate>
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, Star, Building2 } from 'lucide-react';
import { useAccount } from '../context/AccountContext';

const FEATURE_PLANS = {
  calendar:   'pro',
  documents:  'pro',
  photos:     'pro',
  workspace:  'pro',
  automations:'pro',
  analytics:  'pro',
  ai_parse:   'pro',
  stripe_connect: 'pro',
  white_label:'agency',
  api_access: 'agency',
};

const PLAN_NAMES = { starter: 'Starter', pro: 'Pro', agency: 'Agency' };
const PLAN_ICONS = { pro: Star, agency: Building2 };
const PLAN_COLORS = { pro: '#3DD68C', agency: '#64748B' };

export default function PlanGate({ feature, children }) {
  const { account } = useAccount();
  const plan = account?.plan || 'starter';
  const isTrialing = account?.subscription_status === 'trialing';
  const navigate = useNavigate();
  const requiredPlan = FEATURE_PLANS[feature] || 'pro';

  // Trial = full access
  if (isTrialing) return children;

  const planRank = { starter: 0, pro: 1, agency: 2 };
  const hasAccess = (planRank[plan] || 0) >= (planRank[requiredPlan] || 1);

  if (hasAccess) return children;

  const PlanIcon = PLAN_ICONS[requiredPlan] || Zap;
  const planColor = PLAN_COLORS[requiredPlan] || '#3DD68C';

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', padding:24, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ textAlign:'center', maxWidth:420 }}>
        <div style={{ width:72, height:72, borderRadius:20, background:`${planColor}15`, border:`2px solid ${planColor}30`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Lock size={28} style={{ color:planColor }} />
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em', marginBottom:10 }}>
          {PLAN_NAMES[requiredPlan]} Feature
        </h2>
        <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:24 }}>
          This feature is included in the <strong>{PLAN_NAMES[requiredPlan]}</strong> plan and above.
          Upgrade to unlock {feature.replace(/_/g,' ')}, unlimited access, and more.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => navigate('/billing')}
            style={{ width:'100%', padding:'14px', background:'#3DD68C', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            <PlanIcon size={16} /> Upgrade to {PLAN_NAMES[requiredPlan]}
          </button>
          <button onClick={() => navigate(-1)}
            style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid var(--border)', color:'var(--text-secondary)', borderRadius:12, fontSize:14, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
