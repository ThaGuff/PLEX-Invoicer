import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BarChart2, Mail, Megaphone, RefreshCw, CheckCircle,
  AlertCircle, ChevronDown, ChevronUp, Clock, FileText, Receipt,
  Shield, ExternalLink, Send, TrendingUp, ArrowLeft, X, Eye,
  Ban, Unlock, KeyRound, Trash2, Link2, Activity, CreditCard,
  Server, Zap, Wifi, Database, Settings, MoreVertical, Crown,
  UserCheck, UserX, Copy, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const OWNER_EMAIL = 'guffey.ryan@gmail.com';
const ACCENT = '#C6E404';
const DARK   = '#1a1a1a';

const PLANS = ['starter', 'pro', 'agency'];
const PLAN_COLOR  = { agency:'#C6E404', pro: ACCENT, starter:'#C6E404', none:'#9ca3af', suspended:'#ef4444' };
const STATUS_COLOR = { active:'#C6E404', trialing:'#64748B', cancelled:'#ef4444', suspended:'#ef4444', none:'#9ca3af' };

function fmt(n)   { return '$' + Math.round(n||0).toLocaleString(); }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function fmtAgo(iso) {
  if (!iso) return 'never';
  const d = Math.round((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30)  return `${d}d ago`;
  if (d < 365) return `${Math.round(d/30)}mo ago`;
  return `${Math.round(d/365)}yr ago`;
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color = ACCENT }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color+'18' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-ink leading-none">{value ?? '—'}</p>
        <p className="text-xs text-ink-muted mt-0.5">{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: color+'99' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────
function CopyBtn({ text, size = 12 }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 text-ink-muted hover:text-ink transition-colors" title="Copy">
      {copied ? <Check size={size} className="text-green-500" /> : <Copy size={size} />}
    </button>
  );
}

// ── Action button ─────────────────────────────────────────────────
function ActionBtn({ onClick, icon: Icon, label, variant = 'default', loading = false, disabled = false }) {
  const styles = {
    default:   'border text-ink-muted hover:text-ink hover:bg-gray-50',
    danger:    'border border-red-200 text-red-500 hover:bg-red-50',
    primary:   'text-white',
    success:   'text-white',
  };
  const bg = variant === 'primary' ? ACCENT : variant === 'success' ? '#C6E404' : 'transparent';
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${styles[variant]}`}
      style={{ background: bg, borderColor: variant === 'default' ? '#E5E8EB' : undefined }}>
      {loading ? <RefreshCw size={11} className="animate-spin" /> : <Icon size={11} />}
      {label}
    </button>
  );
}

// ── User detail panel (full management) ──────────────────────────
function UserPanel({ user, onClose, onRefresh }) {
  const [loading, setLoading]   = useState('');
  const [toast, setToast]       = useState('');
  const [account, setAccount]   = useState(null);
  const [activity, setActivity] = useState(null);
  const [magicLink, setMagicLink] = useState('');
  const [planOverride, setPlanOverride] = useState(user.plan || 'starter');
  const [tab, setTab]           = useState('overview');

  useEffect(() => {
    api.admin.userAccount(user.id).then(d => setAccount(d));
    api.admin.activity(user.id).then(d => setActivity(d.events || []));
  }, [user.id]);

  const act = async (label, fn, successMsg) => {
    setLoading(label);
    setToast('');
    try {
      const r = await fn();
      setToast(successMsg || 'Done');
      if (onRefresh) onRefresh();
      return r;
    } catch (e) {
      setToast('Error: ' + e.message);
      return null;
    } finally {
      setLoading('');
    }
  };

  const isSuspended = user.sub_status === 'suspended';

  const EVENT_LABELS = {
    quote_created:   { label: 'Created quote',    color: '#C6E404' },
    invoice_created: { label: 'Created invoice',  color: '#C6E404' },
    opened:          { label: 'Client opened email', color: '#64748B' },
    viewed:          { label: 'Client viewed portal', color: '#64748B' },
    clicked_pay:     { label: 'Client clicked pay',   color: '#C6E404' },
    heartbeat:       { label: 'Portal heartbeat', color: '#9ca3af' },
    reminder_sent:   { label: 'Reminder sent',    color: '#C6E404' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
      <div className="h-full w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor:'#E5E8EB' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: ACCENT }}>
            {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink truncate">{user.name || 'No name'}</p>
            <p className="text-xs text-ink-muted truncate">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: (STATUS_COLOR[user.sub_status]||'#9ca3af')+'18', color: STATUS_COLOR[user.sub_status]||'#9ca3af' }}>
              {user.sub_status || 'none'}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: (PLAN_COLOR[user.plan]||'#9ca3af')+'18', color: PLAN_COLOR[user.plan]||'#9ca3af' }}>
              {user.plan || 'no plan'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 text-ink-muted hover:text-ink ml-1"><X size={16} /></button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`px-5 py-2.5 text-xs font-medium flex items-center gap-2 ${toast.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {toast.startsWith('Error') ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
            {toast}
          </div>
        )}

        {/* Sub-tabs */}
        <div className="flex border-b shrink-0 px-5" style={{ borderColor:'#E5E8EB' }}>
          {[
            { id: 'overview',      label: 'Overview' },
            { id: 'subscription',  label: 'Subscription' },
            { id: 'account',       label: 'Account' },
            { id: 'activity',      label: 'Activity' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors"
              style={{ borderColor: tab===t.id ? ACCENT : 'transparent', color: tab===t.id ? ACCENT : '#7A7E85' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {tab === 'overview' && (
            <>
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-3 text-center">
                  <p className="text-lg font-bold text-ink">{user.quote_count}</p>
                  <p className="text-xs text-ink-muted">Quotes</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-lg font-bold text-ink">{user.invoice_count}</p>
                  <p className="text-xs text-ink-muted">Invoices</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-xs font-semibold text-ink">{fmtAgo(user.last_sign_in)}</p>
                  <p className="text-xs text-ink-muted">Last seen</p>
                </div>
              </div>

              {/* Info */}
              <div className="card divide-y" style={{ '--tw-divide-opacity':1 }}>
                {[
                  ['User ID', user.id, true],
                  ['Email', user.email, false],
                  ['Sign-in method', user.provider, false],
                  ['Email confirmed', user.confirmed ? 'Yes' : 'No — unconfirmed', false],
                  ['Joined', fmtDate(user.created_at), false],
                  ['Last sign-in', fmtDate(user.last_sign_in), false],
                ].map(([k, v, copyable]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-ink-muted">{k}</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-medium ${v?.startsWith?.('No') ? 'text-emerald-600' : 'text-ink'}`}>{v}</span>
                      {copyable && v && <CopyBtn text={v} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Actions</p>
                <div className="flex flex-wrap gap-2">
                  <ActionBtn icon={KeyRound} label="Reset password" loading={loading==='reset'}
                    onClick={() => act('reset', () => api.admin.resetPassword(user.id), `Password reset email sent to ${user.email}`)} />
                  {!user.confirmed && (
                    <ActionBtn icon={UserCheck} label="Force-confirm email" loading={loading==='confirm'}
                      variant="primary"
                      onClick={() => act('confirm', () => api.admin.confirmEmail(user.id), 'Email confirmed — user can now sign in')} />
                  )}
                  <ActionBtn icon={Link2} label="Generate login link" loading={loading==='magic'}
                    onClick={async () => {
                      setLoading('magic');
                      try {
                        const r = await api.admin.magicLink(user.id);
                        if (r.link) { setMagicLink(r.link); setToast('Login link generated — valid for 1 hour'); }
                      } catch (e) { setToast('Error: ' + e.message); }
                      setLoading('');
                    }} />
                  {isSuspended
                    ? <ActionBtn icon={Unlock} label="Unsuspend account" loading={loading==='unsuspend'} variant="success"
                        onClick={() => act('unsuspend', () => api.admin.unsuspend(user.id), 'Account unsuspended')} />
                    : <ActionBtn icon={Ban} label="Suspend account" loading={loading==='suspend'} variant="danger"
                        onClick={() => { if (confirm(`Suspend ${user.email}? They will be locked out.`)) act('suspend', () => api.admin.suspend(user.id), 'Account suspended'); }} />
                  }
                  <ActionBtn icon={Trash2} label="Delete account" variant="danger" loading={loading==='delete'}
                    onClick={() => {
                      if (confirm(`PERMANENTLY DELETE ${user.email} and ALL their data?\n\nThis cannot be undone.`)) {
                        // Delete the account (and all its data) via accountId, fallback to userId
                        const deleteFn = user.accountId
                          ? () => api.admin.deleteUser(user.id, user.accountId)
                          : () => api.admin.deleteUser(user.id);
                        act('delete', deleteFn, 'Account deleted').then(() => { onRefresh?.(); onClose(); });
                      }
                    }} />
                </div>

                {magicLink && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">Login link (valid 1 hour — share securely)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-emerald-800 break-all flex-1 font-mono">{magicLink.slice(0, 60)}…</p>
                      <CopyBtn text={magicLink} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'subscription' && (
            <>
              <div className="card divide-y">
                {[
                  ['Plan', user.plan || 'none'],
                  ['Status', user.sub_status || 'none'],
                  ['Trial ends', account?.account?.trial_ends_at ? fmtDate(account.account.trial_ends_at) : '—'],
                  ['Stripe customer', account?.account?.stripe_customer_id || 'none'],
                  ['Stripe subscription', account?.account?.stripe_subscription_id || 'none'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-ink-muted">{k}</span>
                    <span className="text-xs font-medium text-ink">{v}</span>
                  </div>
                ))}
              </div>

              {/* Plan override */}
              <div className="card p-4">
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Override plan</p>
                <div className="flex gap-2 flex-wrap">
                  {[...PLANS, 'none'].map(p => (
                    <button key={p} onClick={() => setPlanOverride(p)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border capitalize transition-colors"
                      style={{
                        borderColor: planOverride === p ? (PLAN_COLOR[p]||'#9ca3af') : '#E5E8EB',
                        background: planOverride === p ? (PLAN_COLOR[p]||'#9ca3af')+'15' : 'transparent',
                        color: planOverride === p ? (PLAN_COLOR[p]||'#9ca3af') : '#7A7E85',
                      }}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => act('plan-active', () => api.admin.setPlan(user.id, planOverride, 'active'), `Plan set to ${planOverride} (active)`)}
                    disabled={loading==='plan-active'}
                    className="text-xs font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-40"
                    style={{ background: ACCENT }}>
                    {loading==='plan-active' ? 'Saving…' : 'Set active'}
                  </button>
                  <button onClick={() => act('plan-trial', () => api.admin.setPlan(user.id, planOverride, 'trialing'), `Plan set to ${planOverride} (trialing)`)}
                    disabled={loading==='plan-trial'}
                    className="text-xs font-semibold px-4 py-2 rounded-lg border text-ink disabled:opacity-40"
                    style={{ borderColor:'#E5E8EB' }}>
                    {loading==='plan-trial' ? 'Saving…' : 'Set trialing'}
                  </button>
                </div>
              </div>

              {/* Trial extension */}
              <div className="card p-4">
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Trial management</p>
                <div className="flex gap-2">
                  {[7, 14, 30].map(days => (
                    <button key={days} onClick={() => act(`trial-${days}`, () => api.admin.extendTrial(user.id, days), `Trial extended ${days} days`)}
                      disabled={!!loading}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border text-ink hover:bg-gray-50 disabled:opacity-40"
                      style={{ borderColor:'#E5E8EB' }}>
                      +{days} days
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'account' && (
            <>
              {!account ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={16} className="animate-spin text-ink-muted" />
                </div>
              ) : !account.account ? (
                <p className="text-sm text-ink-muted text-center py-12">No account created yet.</p>
              ) : (
                <>
                  <div className="card divide-y">
                    {[
                      ['Business', account?.account?.name],
                      ['Email', account?.account?.email],
                      ['Phone', account?.account?.phone],
                      ['Website', account?.account?.website],
                      ['Brand color', account?.account?.primary_color],
                    ].map(([k, v]) => v ? (
                      <div key={k} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-ink-muted">{k}</span>
                        <div className="flex items-center gap-2">
                          {k === 'Brand color' && <div className="w-4 h-4 rounded" style={{ background: v }} />}
                          <span className="text-xs font-medium text-ink">{v}</span>
                        </div>
                      </div>
                    ) : null)}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                      Service catalog ({account?.account?.customSections?.length || 0} sections, {account?.account?.customItems?.length || 0} services)
                    </p>
                    {account?.account?.customSections?.length > 0 ? (
                      <div className="space-y-2">
                        {account?.account?.customSections.map(sec => (
                          <div key={sec.id} className="card p-3">
                            <p className="text-xs font-semibold text-ink mb-1">{sec.label}</p>
                            {account?.account?.customItems?.filter(i => i.section_id === sec.id).map(item => (
                              <p key={item.id} className="text-xs text-ink-muted ml-2 py-0.5">
                                · {item.name}
                                {item.setup_price > 0 && ` — $${item.setup_price} setup`}
                                {item.monthly_price > 0 && ` / $${item.monthly_price}/mo`}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-ink-muted italic card p-3">No services in catalog yet.</p>}
                  </div>

                  {(account?.recent_quotes?.length > 0 || account?.recent_invoices?.length > 0) && (
                    <div>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Recent activity</p>
                      <div className="card divide-y">
                        {[
                          ...(account?.recent_quotes||[]).slice(0,5).map(q => ({ ...q, _type: 'Quote' })),
                          ...(account?.recent_invoices||[]).slice(0,5).map(i => ({ ...i, _type: 'Invoice' })),
                        ].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,8).map(item => (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                            <span className="text-ink-muted w-12 shrink-0">{item._type}</span>
                            <span className="font-medium text-ink">{item.number}</span>
                            <span className="text-ink-muted capitalize">{item.status}</span>
                            <span className="ml-auto text-ink-muted">{fmtDate(item.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'activity' && (
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Event log</p>
              {!activity ? (
                <div className="flex justify-center py-8"><RefreshCw size={14} className="animate-spin text-ink-muted" /></div>
              ) : activity.length === 0 ? (
                <p className="text-xs text-ink-muted italic text-center py-8">No activity recorded yet.</p>
              ) : (
                <div className="space-y-1">
                  {activity.map((e, i) => {
                    const cfg = EVENT_LABELS[e.type] || { label: e.type, color: '#9ca3af' };
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0 text-xs" style={{ borderColor:'#F5F7F8' }}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                        <span className="text-ink font-medium">{cfg.label}</span>
                        {e.ref && <span className="text-ink-muted">#{e.ref}</span>}
                        <span className="ml-auto text-ink-muted">{fmtAgo(e.ts)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Onboard modal ─────────────────────────────────────────────────
function OnboardModal({ user, onClose, onSent }) {
  const [msg, setMsg]         = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState('');

  const send = async () => {
    setSending(true); setErr('');
    try {
      await api.admin.onboard({
        user_id: user.id, email: user.email,
        name: user.name || user.email.split('@')[0],
        business_name: user.account?.name || '',
        custom_message: msg.trim() || null,
      });
      setDone(true);
      setTimeout(() => { onSent?.(); onClose(); }, 1500);
    } catch (e) { setErr(e.message); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:'#E5E8EB' }}>
          <div>
            <h2 className="text-sm font-bold text-ink">Send welcome email</h2>
            <p className="text-xs text-ink-muted">To: {user.email}</p>
          </div>
          <button onClick={onClose}><X size={16} className="text-ink-muted" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl p-4 text-xs" style={{ background: ACCENT+'10', borderLeft:`3px solid ${ACCENT}` }}>
            <p className="font-semibold text-ink mb-1">Includes:</p>
            <ul className="text-ink-muted space-y-0.5 ml-2">
              <li>· Personalized welcome with their business name</li>
              <li>· Login link + 3-step quick-start guide</li>
              <li>· Your contact info (email + phone)</li>
              <li>· Welcome PDF guide attached</li>
            </ul>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1.5">Personal note (optional)</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
              placeholder="e.g. Great talking with you — here's your login info!"
              className="field text-sm resize-none" />
          </div>
          {err && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle size={12}/>{err}</div>}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor:'#E5E8EB', background:'#FAFAFA' }}>
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={send} disabled={sending || done}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-50"
            style={{ background: done ? '#C6E404' : ACCENT }}>
            {done ? <><CheckCircle size={14}/>Sent!</> : sending ? <><RefreshCw size={14} className="animate-spin"/>Sending…</> : <><Send size={14}/>Send welcome email</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Broadcast modal ───────────────────────────────────────────────
function BroadcastModal({ userCount, onClose }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);
  const [err, setErr]         = useState('');

  const send = async () => {
    if (!subject.trim() || !message.trim()) return;
    if (!confirm(`Send to all ${userCount} users?`)) return;
    setSending(true); setErr('');
    try { const r = await api.admin.broadcast({ subject: subject.trim(), message: message.trim() }); setResult(r); }
    catch (e) { setErr(e.message); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:'#E5E8EB' }}>
          <div><h2 className="text-sm font-bold text-ink">Broadcast to all users</h2><p className="text-xs text-ink-muted">{userCount} recipients</p></div>
          <button onClick={onClose}><X size={16} className="text-ink-muted"/></button>
        </div>
        <div className="p-6 space-y-4">
          {result ? (
            <div className="text-center py-6">
              <CheckCircle size={32} className="mx-auto mb-3" style={{ color:'#C6E404' }}/>
              <p className="text-sm font-bold text-ink">Broadcast sent!</p>
              <p className="text-xs text-ink-muted mt-1">{result.sent} sent · {result.failed} failed</p>
              <button onClick={onClose} className="mt-4 btn-ghost text-sm">Close</button>
            </div>
          ) : (
            <>
              <input value={subject} onChange={e => setSubject(e.target.value)} className="field" placeholder="Subject line" />
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} className="field text-sm resize-none" placeholder="Message body…" />
              {err && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            </>
          )}
        </div>
        {!result && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor:'#E5E8EB', background:'#FAFAFA' }}>
            <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button onClick={send} disabled={sending || !subject.trim() || !message.trim()}
              className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-50"
              style={{ background: DARK }}>
              {sending ? <><RefreshCw size={14} className="animate-spin"/>Sending…</> : <><Megaphone size={14}/>Send to {userCount} users</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Health indicator ──────────────────────────────────────────────
function HealthDot({ ok }) {
  return <div className="w-2 h-2 rounded-full" style={{ background: ok ? '#C6E404' : '#ef4444' }} />;
}

// ── Main Admin ────────────────────────────────────────────────────
export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]           = useState('users');
  const [users, setUsers]       = useState([]);
  const [metrics, setMetrics]   = useState(null);
  const [subs, setSubs]         = useState([]);
  const [health, setHealth]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [panelUser, setPanelUser]         = useState(null);
  const [onboardUser, setOnboardUser]     = useState(null);
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => {
    if (user && user.email !== OWNER_EMAIL && user.id !== 'dev-user') navigate('/dashboard');
  }, [user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, m, s, h] = await Promise.all([
        api.admin.users(),
        api.admin.metrics(),
        api.admin.subscriptions(),
        api.admin.health(),
      ]);
      setUsers(u.users || []);
      setMetrics(m);
      setSubs(s || []);
      setHealth(h);
    } catch (e) { console.error('Admin load error:', e.message); setLoading(false); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const matchSearch = !search
      || u.email?.toLowerCase().includes(search.toLowerCase())
      || u.name?.toLowerCase().includes(search.toLowerCase())
      || u.account?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.sub_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const TABS = [
    { id:'users',         label:'Users',         icon: Users },
    { id:'subscriptions', label:'Subscriptions', icon: CreditCard },
    { id:'metrics',       label:'Metrics',       icon: BarChart2 },
    { id:'system',        label:'System',        icon: Server },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 text-ink-muted">
          <ArrowLeft size={16}/>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: DARK }}>
            <Shield size={16} className="text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink leading-none">Admin Console</h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Invoice King · Owner view
              {health && <span className={`ml-2 ${health.ok ? 'text-green-500' : 'text-emerald-500'}`}>
                · {health.ok ? 'All systems go' : 'Check system health'}
              </span>}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:bg-gray-50"
            style={{ borderColor:'#E5E8EB' }}>
            <Megaphone size={13}/> Broadcast
          </button>
          <button onClick={load} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:bg-gray-50" style={{ borderColor:'#E5E8EB' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
        </div>
      </div>

      {/* Metric strip */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total users"    value={metrics.total_users}    icon={Users}     color={ACCENT}/>
          <StatCard label="New this week"  value={metrics.new_this_week}  icon={TrendingUp} color="#C6E404"/>
          <StatCard label="Accounts"       value={metrics.total_accounts} icon={Shield}    color="#C6E404"/>
          <StatCard label="Quotes sent"    value={metrics.total_quotes}   icon={FileText}  color="#64748B"/>
          <StatCard label="Invoices"       value={metrics.total_invoices} icon={Receipt}   color="#C6E404"/>
          <StatCard label="Revenue tracked" value={fmt(metrics.total_revenue)} icon={BarChart2} color="#14b8a6"/>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-5 border-b" style={{ borderColor:'#E5E8EB' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{ borderColor: tab===t.id ? ACCENT : 'transparent', color: tab===t.id ? ACCENT : '#7A7E85' }}>
            <t.icon size={14}/> {t.label}
          </button>
        ))}
        {tab === 'users' && (
          <div className="ml-auto pb-1 flex items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="field text-xs py-1 w-28">
              <option value="all">All status</option>
              <option value="trialing">Trialing</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="suspended">Suspended</option>
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…" className="field text-sm py-1.5 w-44"/>
          </div>
        )}
      </div>

      {/* ── Users tab ─────────────────────────────────────────── */}
      {tab === 'users' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-ink-muted"/></div>
          ) : (
            <>
              <p className="text-xs text-ink-muted mb-3">{filtered.length} user{filtered.length!==1?'s':''}</p>
              {filtered.length === 0 ? (
                <div className="card p-12 text-center">
                  <Users size={28} className="mx-auto mb-3 text-ink-muted opacity-40"/>
                  <p className="text-sm text-ink-muted">No users match your filters.</p>
                </div>
              ) : filtered.map(u => (
                <div key={u.id} className="border rounded-xl mb-2 overflow-hidden" style={{ borderColor:'#E5E8EB' }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: ACCENT }}>
                      {(u.name?.[0] || u.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{u.name || u.email}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {u.name && <span className="text-xs text-ink-muted">{u.email}</span>}
                        <span className="text-xs font-medium px-1.5 py-px rounded-full"
                          style={{ background:(PLAN_COLOR[u.plan]||'#9ca3af')+'15', color:PLAN_COLOR[u.plan]||'#9ca3af' }}>
                          {u.plan || 'no plan'}
                        </span>
                        <span className="text-xs font-medium px-1.5 py-px rounded-full"
                          style={{ background:(STATUS_COLOR[u.sub_status]||'#9ca3af')+'15', color:STATUS_COLOR[u.sub_status]||'#9ca3af' }}>
                          {u.sub_status || 'none'}
                        </span>
                        {!u.confirmed && <span className="text-xs text-emerald-600 font-medium">⚠ unconfirmed</span>}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-xs text-ink-muted shrink-0">
                      <span>{u.quote_count}Q · {u.invoice_count}I</span>
                      {u.total_revenue > 0 && <span className="text-green-600 font-semibold">{fmt(u.total_revenue)}</span>}
                      {u.trial_ends_at && u.sub_status === 'trialing' && (
                        <span className="text-emerald-600">
                          Trial: {Math.max(0,Math.ceil((new Date(u.trial_ends_at)-Date.now())/86400000))}d left
                        </span>
                      )}
                      <span>{fmtAgo(u.last_sign_in)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setOnboardUser(u)}
                        className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50 text-ink-muted"
                        style={{ borderColor:'#E5E8EB' }} title="Send welcome email">
                        <Mail size={12}/>
                      </button>
                      <button onClick={() => setPanelUser(u)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                        style={{ background: ACCENT }}>
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Subscriptions tab ─────────────────────────────────── */}
      {tab === 'subscriptions' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-ink-muted"/></div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-ink-muted" style={{ borderColor:'#E5E8EB', background:'#F5F7F8' }}>
                    {['Account','Plan','Status','Revenue tracked','Paid invoices','Last active',''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subs.map(s => {
                    const matchUser = users.find(u => {
                      const acc = u.account;
                      return acc && acc.id === s.id;
                    });
                    return (
                      <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor:'#F0F3F5' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {s.logo_url
                              ? <img src={s.logo_url} alt="" className="w-7 h-7 rounded object-contain border" style={{ borderColor:'#E5E8EB' }}/>
                              : <div className="w-7 h-7 rounded overflow-hidden" style={{ background: '#1A1A1A' }}><img src="/logo-invoiceking.png" alt="R" style={{ width: 28, height: 28, objectFit: 'cover' }}/></div>
                            }
                            <div>
                              <p className="font-medium text-ink text-xs">{s.name}</p>
                              <p className="text-xs text-ink-muted">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
                            style={{ background:(PLAN_COLOR[s.plan]||'#9ca3af')+'15', color:PLAN_COLOR[s.plan]||'#9ca3af' }}>
                            {s.plan || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
                            style={{ background:(STATUS_COLOR[s.subscription_status]||'#9ca3af')+'15', color:STATUS_COLOR[s.subscription_status]||'#9ca3af' }}>
                            {s.subscription_status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-ink">{fmt(s.total_revenue)}</td>
                        <td className="px-4 py-3 text-xs text-ink-muted">{s.paid_invoices}</td>
                        <td className="px-4 py-3 text-xs text-ink-muted">{fmtAgo(s.last_invoice_at || s.last_quote_at)}</td>
                        <td className="px-4 py-3">
                          {matchUser && (
                            <button onClick={() => setPanelUser(matchUser)}
                              className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
                              style={{ background: ACCENT }}>
                              Manage
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {subs.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-muted">No accounts yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Metrics tab ───────────────────────────────────────── */}
      {tab === 'metrics' && (
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Plan distribution</p>
            {['agency','pro','starter','none'].map(plan => {
              const count = users.filter(u => u.plan === plan).length;
              const pct = users.length > 0 ? Math.round(count/users.length*100) : 0;
              if (!count) return null;
              return (
                <div key={plan} className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium w-16 capitalize" style={{ color:PLAN_COLOR[plan]||'#9ca3af' }}>{plan}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:PLAN_COLOR[plan]||'#9ca3af' }}/>
                  </div>
                  <span className="text-xs text-ink-muted w-20 text-right">{count} · {pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Subscription status</p>
            {['active','trialing','cancelled','none','suspended'].map(status => {
              const count = users.filter(u => u.sub_status === status).length;
              const pct = users.length > 0 ? Math.round(count/users.length*100) : 0;
              if (!count) return null;
              return (
                <div key={status} className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium w-20 capitalize" style={{ color:STATUS_COLOR[status]||'#9ca3af' }}>{status}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:STATUS_COLOR[status]||'#9ca3af' }}/>
                  </div>
                  <span className="text-xs text-ink-muted w-20 text-right">{count} · {pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Most active users</p>
            {[...users].sort((a,b) => (b.quote_count+b.invoice_count)-(a.quote_count+a.invoice_count))
              .slice(0,10).map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor:'#F5F7F8' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background:ACCENT }}>
                  {(u.name?.[0]||u.email?.[0]||'?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink truncate">{u.name||u.email}</p>
                  <p className="text-xs text-ink-muted">{u.account?.name}</p>
                </div>
                <div className="flex gap-3 text-xs text-ink-muted shrink-0">
                  <span>{u.quote_count} Q</span>
                  <span>{u.invoice_count} I</span>
                </div>
                <button onClick={() => setPanelUser(u)}
                  className="text-xs px-2.5 py-1 rounded-lg text-white shrink-0" style={{ background:ACCENT }}>
                  →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── System tab ────────────────────────────────────────── */}
      {tab === 'system' && (
        <div className="space-y-4 max-w-lg">
          {/* Data persistence warning */}
          {health && !health.checks?.db_persistent && (
            <div className="card p-5 border-red-200" style={{ borderColor:'#fca5a5', background:'#fef2f2' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <Database size={16} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-800 mb-1">⚠️ Data is NOT persistent</p>
                  <p className="text-xs text-red-700 leading-relaxed mb-3">
                    Railway uses ephemeral containers — the SQLite database is <strong>wiped on every deploy</strong>.
                    This is why quotes, invoices, and accounts disappear after updates.
                    Set up Turso cloud database to fix this permanently.
                  </p>
                  <div className="space-y-1 text-xs text-red-700 mb-3">
                    <p className="font-semibold">Fix in 5 minutes:</p>
                    <p>1. Go to <a href="https://turso.tech" target="_blank" className="underline font-semibold">turso.tech</a> → sign up free</p>
                    <p>2. Create a database: <code className="bg-red-100 px-1 rounded">turso db create invoice-king</code></p>
                    <p>3. Get URL + token: <code className="bg-red-100 px-1 rounded">turso db show invoice-king</code> and <code className="bg-red-100 px-1 rounded">turso db tokens create invoice-king</code></p>
                    <p>4. Add to Railway: <code className="bg-red-100 px-1 rounded">TURSO_DATABASE_URL</code> and <code className="bg-red-100 px-1 rounded">TURSO_AUTH_TOKEN</code></p>
                    <p>5. Done — data persists forever across all future deploys</p>
                  </div>
                  <a href="https://turso.tech" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
                    Set up Turso now →
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Service health</p>
            {health ? (
              <div className="space-y-3">
                {[
                  { key:'database', label: health?.checks?.db_type === 'turso_cloud' ? 'Database (Turso — persistent ✓)' : 'Database (SQLite — ⚠️ ephemeral)', icon: Database },
                  { key:'supabase', label:'Authentication (Supabase)', icon: Shield },
                  { key:'smtp',     label:'Email (SMTP)', icon: Mail },
                  { key:'openai',   label:'AI parsing (OpenAI)', icon: Zap },
                  { key:'stripe',   label:'Payments (Stripe)', icon: CreditCard },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center gap-3">
                    <Icon size={15} className="text-ink-muted shrink-0"/>
                    <span className="text-sm text-ink flex-1">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <HealthDot ok={health.checks[key]}/>
                      <span className="text-xs" style={{ color: health.checks[key] ? '#C6E404' : '#ef4444' }}>
                        {health.checks[key] ? 'OK' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center py-4"><RefreshCw size={16} className="animate-spin text-ink-muted"/></div>
            )}
            <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor:'#E5E8EB' }}>
              <span className="text-xs text-ink-muted">Last checked: {health ? new Date(health.ts).toLocaleTimeString() : '—'}</span>
              <button onClick={load} className="text-xs text-ink-muted hover:text-ink flex items-center gap-1">
                <RefreshCw size={11}/> Recheck
              </button>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Webhook endpoint</p>
            <p className="text-xs text-ink-muted mb-2">Users can point external systems at this URL to auto-create invoices:</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border" style={{ borderColor:'#E5E8EB' }}>
              <code className="text-xs text-ink flex-1 break-all">
                {(typeof window !== 'undefined' ? window.location.origin : 'https://invoiceking.app')}/api/v1/integrations/webhook?account_id=ACC_ID
              </code>
              <CopyBtn text={`${window.location.origin}/api/v1/integrations/webhook?account_id=ACC_ID`}/>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Cron reminders</p>
            <p className="text-xs text-ink-muted mb-3">Smart reminders queue up automatically. Trigger them on a schedule to fire pending ones:</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border mb-3" style={{ borderColor:'#E5E8EB' }}>
              <code className="text-xs text-ink flex-1">POST /api/analytics/run-reminders</code>
            </div>
            <button onClick={async () => {
              try {
                const r = await api.analytics.runReminders();
                console.info(`Ran reminders: ${r.sent} sent, ${r.failed} failed`);
              } catch (e) { console.error('Admin error:', e.message); }
            }}
              className="text-xs font-semibold px-4 py-2 rounded-lg border hover:bg-gray-50"
              style={{ borderColor:'#E5E8EB' }}>
              Run now
            </button>
          </div>
        </div>
      )}

      {/* Email Test Section */}
      {tab === 'system' && (
        <div style={{ marginTop:16, background:'var(--bg-raised)', borderRadius:12, padding:20, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
            📧 TEST EMAIL DELIVERY
          </div>
          <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:12, lineHeight:1.5 }}>
            Send a test email to verify your email configuration is working correctly.
          </p>
          <div style={{ display:'flex', gap:8 }}>
            <input
              type="email"
              placeholder="your@email.com"
              id="test-email-input"
              defaultValue={user?.email || ''}
              style={{ flex:1, padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13 }}
            />
            <button
              onClick={async () => {
                const email = document.getElementById('test-email-input').value;
                if (!email) return alert('Enter an email address');
                const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
                const r = await fetch('/api/admin/test-email', {
                  method:'POST',
                  headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
                  body: JSON.stringify({ to: email })
                }).then(res => res.json());
                if (r.ok) alert(`✅ Test email sent to ${email} via ${r.provider}!`);
                else alert('❌ Email failed: ' + r.error + '\n\nFix: ' + (r.fix || 'Check Railway Variables'));
              }}
              style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#C6E404', color:'#1A1A1A', cursor:'pointer', fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>
              Send Test
            </button>
          </div>
        </div>
      )}

      {/* Modals / panels */}
      {panelUser && <UserPanel user={panelUser} onClose={() => setPanelUser(null)} onRefresh={load}/>}
      {onboardUser && <OnboardModal user={onboardUser} onClose={() => setOnboardUser(null)} onSent={load}/>}
      {showBroadcast && <BroadcastModal userCount={users.length} onClose={() => setShowBroadcast(false)}/>}
    </div>
  );
}
