import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BarChart2, Mail, Megaphone, RefreshCw, CheckCircle,
  AlertCircle, ChevronDown, ChevronUp, Clock, FileText,
  Receipt, Shield, ExternalLink, Send, Calendar, TrendingUp,
  ArrowLeft, X, Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const OWNER_EMAIL = 'guffey.ryan@gmail.com';
const ACCENT = '#13B5EA';
const DARK = '#1a1a1a';

// ── Small stat card ───────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color = ACCENT }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink leading-none mb-1">{value ?? '—'}</p>
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        {sub && <p className="text-xs text-ink-muted mt-0.5 opacity-70">{sub}</p>}
      </div>
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────
function UserRow({ user, onOnboard, onExtendTrial, onViewAccount }) {
  const [open, setOpen] = useState(false);

  const planColor = {
    agency:  '#6366f1', pro: ACCENT, starter: '#22c55e', none: '#9ca3af',
  }[user.plan] || '#9ca3af';

  const statusColor = {
    active: '#22c55e', trialing: '#f59e0b', cancelled: '#ef4444', none: '#9ca3af',
  }[user.sub_status] || '#9ca3af';

  const since = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const lastSeen = user.last_sign_in
    ? new Date(user.last_sign_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Never';

  return (
    <div className="border rounded-xl overflow-hidden mb-2" style={{ borderColor: '#E5E8EB' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: ACCENT }}>
          {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink truncate">
              {user.name || user.email}
            </p>
            {user.name && <p className="text-xs text-ink-muted truncate hidden sm:block">{user.email}</p>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: planColor + '18', color: planColor }}>
              {user.plan || 'no plan'}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: statusColor + '18', color: statusColor }}>
              {user.sub_status || 'none'}
            </span>
            <span className="text-xs text-ink-muted hidden sm:inline">joined {since}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-4 shrink-0 text-right">
          <div>
            <p className="text-sm font-bold text-ink">{user.quote_count}</p>
            <p className="text-xs text-ink-muted">quotes</p>
          </div>
          <div>
            <p className="text-sm font-bold text-ink">{user.invoice_count}</p>
            <p className="text-xs text-ink-muted">invoices</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">last seen</p>
            <p className="text-xs font-medium text-ink">{lastSeen}</p>
          </div>
        </div>

        {open ? <ChevronUp size={14} className="text-ink-muted shrink-0" /> : <ChevronDown size={14} className="text-ink-muted shrink-0" />}
      </div>

      {open && (
        <div className="border-t px-4 py-4 bg-gray-50 flex flex-wrap gap-2" style={{ borderColor: '#F0F3F5' }}>
          <button
            onClick={() => onOnboard(user)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white"
            style={{ background: ACCENT }}>
            <Mail size={12} /> Send welcome email
          </button>
          <button
            onClick={() => onExtendTrial(user)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:bg-white transition-colors"
            style={{ borderColor: '#E5E8EB', color: DARK }}>
            <Clock size={12} /> Extend trial 14 days
          </button>
          <button
            onClick={() => onViewAccount(user)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:bg-white transition-colors"
            style={{ borderColor: '#E5E8EB', color: DARK }}>
            <Eye size={12} /> View account
          </button>
          {user.account?.website && (
            <a href={`https://${user.account.website}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:bg-white transition-colors"
              style={{ borderColor: '#E5E8EB', color: DARK }}>
              <ExternalLink size={12} /> Visit website
            </a>
          )}
          <div className="ml-auto text-xs text-ink-muted self-center">
            {user.account?.name || 'No account'} · {user.provider} sign-in
            {!user.confirmed && <span className="ml-2 text-amber-500 font-medium">· email unconfirmed</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Account viewer modal ──────────────────────────────────────────
function AccountViewer({ user, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.userAccount(user.id).then(d => { setData(d); setLoading(false); });
  }, [user.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ maxHeight: '88vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
          <div>
            <h2 className="text-base font-bold text-ink">{user.name || user.email}</h2>
            <p className="text-xs text-ink-muted">{user.account?.name || 'No account'} · {user.email}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-ink-muted hover:text-ink" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-ink-muted" />
            </div>
          ) : !data?.account ? (
            <p className="text-sm text-ink-muted text-center py-12">No account created yet.</p>
          ) : (
            <div className="space-y-5">
              {/* Account info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Business', data.account.name],
                  ['Email', data.account.email],
                  ['Phone', data.account.phone],
                  ['Website', data.account.website],
                  ['Plan', data.account.plan],
                  ['Status', data.account.subscription_status],
                ].map(([k, v]) => v ? (
                  <div key={k}>
                    <p className="text-xs text-ink-muted">{k}</p>
                    <p className="text-sm font-medium text-ink">{v}</p>
                  </div>
                ) : null)}
              </div>

              {/* Service catalog */}
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Service catalog ({data.account.customSections?.length || 0} sections, {data.account.customItems?.length || 0} items)
                </p>
                {data.account.customSections?.length > 0 ? (
                  data.account.customSections.map(sec => (
                    <div key={sec.id} className="mb-2">
                      <p className="text-xs font-semibold text-ink">{sec.label}</p>
                      {data.account.customItems?.filter(i => i.section_id === sec.id).map(item => (
                        <p key={item.id} className="text-xs text-ink-muted ml-3 mt-0.5">
                          · {item.name}
                          {item.setup_price > 0 && ` — $${item.setup_price} setup`}
                          {item.monthly_price > 0 && ` / $${item.monthly_price}/mo`}
                        </p>
                      ))}
                    </div>
                  ))
                ) : <p className="text-xs text-ink-muted italic">No services added yet.</p>}
              </div>

              {/* Recent quotes */}
              {data.recent_quotes?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Recent quotes</p>
                  <div className="space-y-1">
                    {data.recent_quotes.map(q => (
                      <div key={q.id} className="flex items-center justify-between text-xs">
                        <span className="text-ink">{q.number}</span>
                        <span className="text-ink-muted">{q.status}</span>
                        <span className="text-ink">${(q.setup_total || 0).toFixed(0)} setup</span>
                        <span className="text-ink-muted">{new Date(q.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent invoices */}
              {data.recent_invoices?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Recent invoices</p>
                  <div className="space-y-1">
                    {data.recent_invoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between text-xs">
                        <span className="text-ink">{inv.number}</span>
                        <span className="text-ink-muted">{inv.status}</span>
                        <span className="text-ink">${(inv.amount_due || 0).toFixed(0)}</span>
                        <span className="text-ink-muted">{new Date(inv.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Onboarding modal ──────────────────────────────────────────────
function OnboardModal({ user, onClose, onSent }) {
  const [msg, setMsg]       = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone]     = useState(false);
  const [err, setErr]       = useState('');

  const send = async () => {
    setSending(true);
    setErr('');
    try {
      await api.admin.onboard({
        user_id:       user.id,
        email:         user.email,
        name:          user.name || user.email.split('@')[0],
        business_name: user.account?.name || '',
        custom_message: msg.trim() || null,
      });
      setDone(true);
      setTimeout(() => { onSent(); onClose(); }, 1500);
    } catch (e) { setErr(e.message); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
          <div>
            <h2 className="text-base font-bold text-ink">Send welcome email</h2>
            <p className="text-xs text-ink-muted">To: {user.name || user.email} · {user.email}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-ink-muted" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl p-4 text-xs" style={{ background: ACCENT + '10', borderLeft: `3px solid ${ACCENT}` }}>
            <p className="font-semibold text-ink mb-1">This email includes:</p>
            <ul className="text-ink-muted space-y-0.5 ml-2">
              <li>· Personalized welcome message with their business name</li>
              <li>· Login link and 3-step quick-start guide</li>
              <li>· Your contact info (email + phone)</li>
              <li>· Welcome PDF attached (printable quick-start guide)</li>
            </ul>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1.5">
              Personal note (optional — added to the email)
            </label>
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              rows={3}
              placeholder="e.g. Great talking with you earlier — here's your login info. Let me know if you have any questions!"
              className="field text-sm resize-none"
            />
          </div>

          {err && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {err}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={send} disabled={sending || done}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-50"
            style={{ background: done ? '#22c55e' : ACCENT }}>
            {done ? <><CheckCircle size={14} /> Sent!</>
              : sending ? <><RefreshCw size={14} className="animate-spin" />Sending…</>
              : <><Send size={14} />Send welcome email</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Broadcast modal ───────────────────────────────────────────────
function BroadcastModal({ userCount, onClose }) {
  const [subject, setSubject]   = useState('');
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState(null);
  const [err, setErr]           = useState('');

  const send = async () => {
    if (!subject.trim() || !message.trim()) return;
    if (!confirm(`Send this to all ${userCount} users? This cannot be undone.`)) return;
    setSending(true);
    setErr('');
    try {
      const r = await api.admin.broadcast({ subject: subject.trim(), message: message.trim() });
      setResult(r);
    } catch (e) { setErr(e.message); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
          <div>
            <h2 className="text-base font-bold text-ink">Broadcast to all users</h2>
            <p className="text-xs text-ink-muted">{userCount} recipients</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-ink-muted" /></button>
        </div>
        <div className="p-6 space-y-4">
          {result ? (
            <div className="text-center py-6">
              <CheckCircle size={36} className="mx-auto mb-3" style={{ color: '#22c55e' }} />
              <p className="text-sm font-bold text-ink">Broadcast sent!</p>
              <p className="text-xs text-ink-muted mt-1">
                {result.sent} sent · {result.failed} failed · {result.total} total
              </p>
              <button onClick={onClose} className="mt-4 btn-ghost text-sm">Close</button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1.5">Subject line</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  className="field" placeholder="e.g. New feature: Stripe payment links" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1.5">Message body</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  rows={5} className="field text-sm resize-none"
                  placeholder="Write your message here. It will be sent as a branded HTML email to all users." />
              </div>
              {err && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} /> {err}
                </div>
              )}
            </>
          )}
        </div>
        {!result && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
            <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button onClick={send} disabled={sending || !subject.trim() || !message.trim()}
              className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-50"
              style={{ background: DARK }}>
              {sending ? <><RefreshCw size={14} className="animate-spin" />Sending…</> : <><Megaphone size={14} />Send to {userCount} users</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Admin page ───────────────────────────────────────────────
export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]           = useState('users'); // 'users' | 'metrics'
  const [users, setUsers]       = useState([]);
  const [metrics, setMetrics]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const [onboardUser, setOnboardUser]   = useState(null);
  const [viewUser, setViewUser]         = useState(null);
  const [showBroadcast, setShowBroadcast] = useState(false);

  // Block non-owners
  useEffect(() => {
    if (user && user.email !== OWNER_EMAIL && user.id !== 'dev-user') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, m] = await Promise.all([api.admin.users(), api.admin.metrics()]);
      setUsers(u.users || []);
      setMetrics(m);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExtendTrial = async (user) => {
    if (!confirm(`Extend trial 14 days for ${user.name || user.email}?`)) return;
    try {
      await api.admin.extendTrial(user.id, 14);
      await load();
    } catch (e) { alert('Failed: ' + e.message); }
  };

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase())
      || u.name?.toLowerCase().includes(search.toLowerCase())
      || u.account?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id: 'users',   label: 'Users',   icon: Users },
    { id: 'metrics', label: 'Metrics', icon: BarChart2 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-gray-100 text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: DARK }}>
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink leading-none">Admin Console</h1>
            <p className="text-xs text-ink-muted mt-0.5">PLEX Automation · Owner only</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#E5E8EB' }}>
            <Megaphone size={13} /> Broadcast
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#E5E8EB' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Quick metrics strip */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total users"    value={metrics.total_users}    icon={Users}      color={ACCENT} />
          <StatCard label="New this week"  value={metrics.new_this_week}  icon={TrendingUp}  color="#6366f1" />
          <StatCard label="Accounts"       value={metrics.total_accounts} icon={Shield}      color="#8b5cf6" />
          <StatCard label="Quotes sent"    value={metrics.total_quotes}   icon={FileText}    color="#f97316" />
          <StatCard label="Invoices"       value={metrics.total_invoices} icon={Receipt}     color="#22c55e" />
          <StatCard label="Revenue tracked"
            value={`$${Number(metrics.total_revenue || 0).toLocaleString()}`}
            icon={BarChart2} color="#14b8a6" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b" style={{ borderColor: '#E5E8EB' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{
              borderColor:  tab === t.id ? ACCENT : 'transparent',
              color:        tab === t.id ? ACCENT : '#7A7E85',
            }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}

        {tab === 'users' && (
          <div className="ml-auto pb-1">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="field text-sm py-1.5 w-48" />
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={22} className="animate-spin text-ink-muted" />
        </div>
      ) : tab === 'users' ? (
        <div>
          <p className="text-xs text-ink-muted mb-3">
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ' total'}
          </p>
          {filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <Users size={28} className="mx-auto mb-3 text-ink-muted opacity-40" />
              <p className="text-sm text-ink-muted">{search ? 'No users match your search.' : 'No users yet.'}</p>
            </div>
          ) : filtered.map(u => (
            <UserRow
              key={u.id}
              user={u}
              onOnboard={setOnboardUser}
              onExtendTrial={handleExtendTrial}
              onViewAccount={setViewUser}
            />
          ))}
        </div>
      ) : (
        /* Metrics tab — detailed breakdown */
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Plan distribution</p>
            {['agency', 'pro', 'starter', 'none'].map(plan => {
              const count = users.filter(u => u.plan === plan).length;
              const pct = users.length > 0 ? Math.round(count / users.length * 100) : 0;
              const color = { agency: '#6366f1', pro: ACCENT, starter: '#22c55e', none: '#9ca3af' }[plan];
              return count > 0 ? (
                <div key={plan} className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium w-16 capitalize" style={{ color }}>{plan}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-xs text-ink-muted w-16 text-right">{count} · {pct}%</span>
                </div>
              ) : null;
            })}
          </div>

          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Subscription status</p>
            {['active', 'trialing', 'cancelled', 'none'].map(status => {
              const count = users.filter(u => u.sub_status === status).length;
              const pct = users.length > 0 ? Math.round(count / users.length * 100) : 0;
              const color = { active: '#22c55e', trialing: '#f59e0b', cancelled: '#ef4444', none: '#9ca3af' }[status];
              return count > 0 ? (
                <div key={status} className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium w-20 capitalize" style={{ color }}>{status}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-xs text-ink-muted w-16 text-right">{count} · {pct}%</span>
                </div>
              ) : null;
            })}
          </div>

          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Most active users</p>
            {[...users].sort((a, b) => (b.quote_count + b.invoice_count) - (a.quote_count + a.invoice_count))
              .slice(0, 10)
              .map(u => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: '#F5F7F8' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: ACCENT }}>
                    {(u.name?.[0] || u.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{u.name || u.email}</p>
                    <p className="text-xs text-ink-muted">{u.account?.name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-muted">
                    <span>{u.quote_count} quotes</span>
                    <span>{u.invoice_count} invoices</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {onboardUser && (
        <OnboardModal
          user={onboardUser}
          onClose={() => setOnboardUser(null)}
          onSent={load}
        />
      )}
      {viewUser && (
        <AccountViewer
          user={viewUser}
          onClose={() => setViewUser(null)}
        />
      )}
      {showBroadcast && (
        <BroadcastModal
          userCount={users.length}
          onClose={() => setShowBroadcast(false)}
        />
      )}
    </div>
  );
}
