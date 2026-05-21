/**
 * PlanGate — wraps any feature behind a plan check.
 * Shows an upgrade prompt instead of the feature if the user's plan doesn't support it.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { canUseFeature, getUpgradeMessage, PLAN_NAMES, PLAN_COLORS } from '../utils/planFeatures';

export default function PlanGate({ feature, children, fallback = null }) {
  const { account } = useAccount();
  const plan = account?.plan || 'starter';
  const navigate = useNavigate();

  if (canUseFeature(plan, feature)) return children;

  if (fallback) return fallback;

  return (
    <div className="card p-6 flex flex-col items-center text-center gap-4"
      style={{ border: '0.5px solid rgba(75,123,255,0.3)', background: 'rgba(75,123,255,0.04)' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)' }}>
        <Lock size={20} color="#fff" />
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {getUpgradeMessage(feature)}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          You're on the <strong>{PLAN_NAMES[plan]}</strong> plan.
        </p>
      </div>
      <button onClick={() => navigate('/billing')}
        className="flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl"
        style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)' }}>
        <Zap size={14} /> Upgrade to unlock
      </button>
    </div>
  );
}

/** Inline upgrade badge — use inside nav items or disabled buttons */
export function UpgradeBadge({ plan = 'pro' }) {
  return (
    <span className="inline-flex items-center gap-1 text-white font-bold ml-2"
      style={{ fontSize: '8px', padding: '2px 6px', borderRadius: '20px', background: PLAN_COLORS[plan], letterSpacing: '0.5px' }}>
      <Zap size={7} /> {PLAN_NAMES[plan].toUpperCase()}
    </span>
  );
}
