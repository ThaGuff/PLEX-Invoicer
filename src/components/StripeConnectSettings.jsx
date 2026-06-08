import React, { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle, AlertCircle, RefreshCw,
  ExternalLink, Unlink, Zap, Shield, ArrowRight, DollarSign,
} from 'lucide-react';
import { api } from '../utils/api';

export default function StripeConnectSettings({ accountId, accent = '#3DD68C' }) {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [feePct, setFeePct]   = useState(0);
  const [feeEdit, setFeeEdit] = useState(false);
  const [error, setError]     = useState('');

  const load = async () => {
    if (!accountId) return;
    setLoading(true);
    setError('');
    try {
      const s = await api.stripeConnect.status(accountId);
      setStatus(s);
      setFeePct(s.platform_fee_pct || 0);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [accountId]);

  const handleConnect = async () => {
    setWorking('connect');
    setError('');
    try {
      const r = await api.stripeConnect.oauthLink(accountId);
      if (r.url) window.location.href = r.url;
      else setError(r.error || 'Could not generate OAuth link');
    } catch (e) {
      // Detect the STRIPE_CLIENT_ID missing error specifically
      if (e.message?.includes('STRIPE_CLIENT_ID')) {
        setError('STRIPE_CLIENT_ID_MISSING');
      } else {
        setError(e.message);
      }
    }
    setWorking('');
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Stripe account? Existing payment links will stop working.')) return;
    setWorking('disconnect');
    try {
      await api.stripeConnect.disconnect(accountId);
      await load();
    } catch (e) { setError(e.message); }
    setWorking('');
  };

  const handleSaveFee = async () => {
    setWorking('fee');
    try {
      await api.stripeConnect.setPlatformFee(accountId, parseFloat(feePct) || 0);
      setFeeEdit(false);
      await load();
    } catch (e) { setError(e.message); }
    setWorking('');
  };

  if (loading) return (
    <div className="flex items-center gap-2 py-3">
      <RefreshCw size={13} className="animate-spin text-ink-muted" />
      <span className="text-xs text-ink-muted">Checking Stripe connection…</span>
    </div>
  );

  const isConnected    = status?.connected && status?.charges_enabled;
  const isPending      = status?.connected && !status?.charges_enabled;
  const isDisconnected = !status?.connected;

  return (
    <div className="space-y-4">

      {error && error !== 'STRIPE_CLIENT_ID_MISSING' && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {error === 'STRIPE_CLIENT_ID_MISSING' && (
        <div className="border border-emerald-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50">
            <AlertCircle size={14} className="text-emerald-500 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">One setup step needed</p>
          </div>
          <div className="px-4 py-4 space-y-3 text-sm text-ink">
            <p>To enable Stripe Connect, add <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">STRIPE_CLIENT_ID</code> to Railway:</p>
            <ol className="space-y-2 text-xs text-ink-muted list-none">
              {[
                ['1', 'Go to', 'dashboard.stripe.com', 'https://dashboard.stripe.com'],
                ['2', 'Click Connect → Settings in the left sidebar', null, null],
                ['3', 'Copy your Client ID (starts with ca_...)', null, null],
                ['4', 'Go to Railway → your service → Variables → New Variable', null, null],
                ['5', 'Add: STRIPE_CLIENT_ID = ca_xxxx...', null, null],
              ].map(([n, text, link, href]) => (
                <li key={n} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
                  <span>{text}{link && <> → <a href={href} target="_blank" rel="noreferrer" className="underline" style={{color:accent}}>{link}</a></>}</span>
                </li>
              ))}
            </ol>
            <a href="https://dashboard.stripe.com/settings/connect" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white"
              style={{ background: '#635BFF' }}>
              Open Stripe Connect Settings →
            </a>
          </div>
        </div>
      )}

      {/* Connected state */}
      {isConnected && (
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {/* Green header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#f0fdf4', borderBottom: '0.5px solid #bbf7d0' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#3DD68C20' }}>
              <CheckCircle size={16} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">Stripe connected</p>
              <p className="text-xs text-green-700">Payments go directly to your Stripe account</p>
            </div>
            <button onClick={load} className="p-1.5 text-green-600 hover:text-green-800" title="Refresh">
              <RefreshCw size={12} className={working === 'refresh' ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Account details */}
          <div className="divide-y" style={{ '--tw-divide-color': 'var(--bg-page)' }}>
            {[
              ['Account', status.display_name || status.email || status.account_id],
              ['Email', status.email],
              ['Country', status.country?.toUpperCase()],
              ['Charges', status.charges_enabled ? 'Enabled' : 'Pending'],
              ['Payouts', status.payouts_enabled ? 'Enabled' : 'Pending'],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-ink-muted">{k}</span>
                <span className="text-xs font-medium text-ink">{v}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ borderTop: '0.5px solid #F0F3F5' }}>
            <a href={status.dashboard_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <ExternalLink size={11} /> Stripe Dashboard
            </a>
            <button onClick={handleDisconnect} disabled={!!working}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-red-50 text-red-500 border-red-200 disabled:opacity-40 transition-colors">
              {working === 'disconnect' ? <RefreshCw size={11} className="animate-spin" /> : <Unlink size={11} />}
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Pending state */}
      {isPending && (
        <div className="border rounded-xl p-4" style={{ borderColor: '#fbbf24', background: '#fffbeb' }}>
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle size={16} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Setup incomplete</p>
              <p className="text-xs text-emerald-700">Your Stripe account is connected but not yet approved for charges. Complete your Stripe onboarding.</p>
            </div>
          </div>
          <a href={status.dashboard_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white"
            style={{ background: '#64748B' }}>
            Complete Stripe onboarding <ExternalLink size={11} />
          </a>
        </div>
      )}

      {/* Disconnected state */}
      {isDisconnected && (
        <div className="border rounded-xl p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: accent + '15' }}>
              <CreditCard size={18} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Connect your Stripe account</p>
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                Connect Stripe so your clients can pay invoices directly into your account. PLEX never touches your money.
              </p>
            </div>
          </div>

          {/* Feature list */}
          <ul className="space-y-2 mb-5">
            {[
              'Payments go directly into your Stripe account',
              'Credit card, Apple Pay, Google Pay, ACH bank transfer',
              'Automatic invoice status update when client pays',
              'Stripe handles all PCI compliance',
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-ink-muted">
                <CheckCircle size={12} className="shrink-0" style={{ color: accent }} />
                {f}
              </li>
            ))}
          </ul>

          <button onClick={handleConnect} disabled={!!working}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: '#635BFF' }}>
            {working === 'connect'
              ? <><RefreshCw size={14} className="animate-spin" />Redirecting to Stripe…</>
              : <><svg width="16" height="16" viewBox="0 0 60 60" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M60 30C60 13.4 46.6 0 30 0S0 13.4 0 30s13.4 30 30 30 30-13.4 30-30zM26.5 17.5c0-2 1.6-3 3.9-3 3.5 0 7.9 1.1 11.4 3v10.6c-3.3-1.6-6.6-2.3-9.9-2.3v16.7c0 8.4-5.6 11.5-11.1 11.5-4.4 0-9.5-1.7-9.5-7.7 0-5.7 4.8-8.4 10.2-8.4.8 0 1.6.1 2.3.1V30c-7.9.4-14.2 4.3-14.2 12 0 7.5 5.9 12 13.5 12 8.2 0 14.9-4.8 14.9-13.5V17.5z" fill="white"/></svg>Connect with Stripe<ArrowRight size={14} /></>
            }
          </button>


        </div>
      )}

      {/* Platform fee (shown when connected) */}
      {isConnected && (
        <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Platform fee</p>
            {!feeEdit && (
              <button onClick={() => setFeeEdit(true)}
                className="text-xs font-medium hover:underline" style={{ color: accent }}>
                Edit
              </button>
            )}
          </div>
          <p className="text-xs text-ink-muted mb-3">
            A percentage taken from each payment as a platform fee to Revanew. Set to 0 for no fee.
          </p>
          {feeEdit ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number" min={0} max={30} step={0.1}
                  value={feePct}
                  onChange={e => setFeePct(e.target.value)}
                  className="field w-24 text-sm text-right pr-6"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">%</span>
              </div>
              <button onClick={handleSaveFee} disabled={working === 'fee'}
                className="text-xs font-semibold px-3 py-2 rounded-lg text-white disabled:opacity-40"
                style={{ background: accent }}>
                {working === 'fee' ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setFeeEdit(false); setFeePct(status.platform_fee_pct || 0); }}
                className="btn-ghost text-xs py-2 px-2">Cancel</button>
            </div>
          ) : (
            <p className="text-sm font-bold text-ink">
              {status.platform_fee_pct > 0 ? `${status.platform_fee_pct}%` : 'No fee'}
              <span className="text-xs font-normal text-ink-muted ml-2">per payment</span>
            </p>
          )}
        </div>
      )}


    </div>
  );
}
