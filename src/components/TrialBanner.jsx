/**
 * TrialBanner — smart upsell system
 * 
 * Shows when trial ≤ 3 days left, cancelled, or expired.
 * Win-back offer: if cancelled, offer 30-day extension at 50% off.
 * Disappears completely once subscription is active.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Clock, AlertTriangle, Gift, ArrowRight, RefreshCw } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAccount } from '../context/AccountContext';

const GRAD = 'linear-gradient(135deg, #00C9B1, #3B6FE8, #6B3FD8)';

function WinbackOffer({ onDismiss }) {
  const navigate   = useNavigate();
  const [loading, setLoading] = useState(false);
  const { account } = useAccount();
  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;

  const claimOffer = async () => {
    setLoading(true);
    try {
      // Create a 30-day discounted checkout session
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: account?.plan || 'pro', winback: true }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #1a0a30, #0a1a35)', borderBottom: '1px solid rgba(107,63,216,0.4)', padding: '0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6B3FD8, #3B6FE8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Gift size={17} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
            We'd love to keep you — here's a special offer
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
            Your subscription was cancelled. Get <strong style={{ color: '#00C9B1' }}>30 extra days + 50% off your first month</strong> if you come back today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={claimOffer} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: GRAD, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(59,111,232,0.4)', opacity: loading ? 0.7 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {loading ? <RefreshCw size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Gift size={13} />}
            {loading ? 'Loading…' : 'Claim offer'}
          </button>
          <button onClick={onDismiss}
            style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TrialCountdown({ daysLeft, onDismiss }) {
  const navigate = useNavigate();
  const isUrgent = daysLeft <= 1;

  const bgColor = isUrgent
    ? 'linear-gradient(135deg, #2a0a0a, #1a0a20)'
    : 'linear-gradient(135deg, #0a1525, #0f1a35)';
  const borderColor = isUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(59,111,232,0.3)';
  const accentColor = isUrgent ? '#ef4444' : '#3B6FE8';

  return (
    <div style={{ background: bgColor, borderBottom: `1px solid ${borderColor}` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(59,111,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${accentColor}44` }}>
          {isUrgent ? <AlertTriangle size={16} color={accentColor} /> : <Clock size={16} color={accentColor} />}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 1 }}>
            {isUrgent
              ? `⚡ Last chance — ${daysLeft === 0 ? 'trial expires today' : '1 day left in your trial'}`
              : `${daysLeft} days left in your free trial`}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            {isUrgent
              ? 'Subscribe now to keep access to all your quotes, invoices, and data.'
              : 'Upgrade to keep Revanew working after your trial ends.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => navigate('/billing')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: GRAD, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px ${accentColor}44`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Zap size={13} /> Subscribe now <ArrowRight size={12} />
          </button>
          <button onClick={onDismiss}
            style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpiredWall() {
  const navigate = useNavigate();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,18,32,0.92)', backdropFilter: 'blur(8px)', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 20 }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(239,68,68,0.4)' }}>
          <Clock size={32} color="#fff" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 10, letterSpacing: '-0.03em' }}>
          Your free trial has ended
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 28 }}>
          Your 7-day trial is over. Subscribe to keep your quotes, invoices, clients, and automations — all your data is safely stored and waiting.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => navigate('/billing')}
            style={{ width: '100%', padding: '14px 20px', background: GRAD, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 28px rgba(59,111,232,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Choose a plan — from $19/month
          </button>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            7-day money-back guarantee · Cancel anytime · No setup fees
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TrialBanner() {
  const { isActive, isExpired, showUpsellBanner, showCancelOffer, daysLeft } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Never show anything for active subscribers
  if (isActive) return null;

  // Expired trial — show blocking wall
  if (isExpired) return <ExpiredWall />;

  // Cancelled — show win-back offer (can't dismiss, comes back on reload)
  if (showCancelOffer) return <WinbackOffer onDismiss={() => setDismissed(true)} />;

  // Trial with ≤ 3 days left — show countdown banner
  if (showUpsellBanner && !dismissed) {
    return <TrialCountdown daysLeft={daysLeft} onDismiss={() => setDismissed(true)} />;
  }

  return null;
}
