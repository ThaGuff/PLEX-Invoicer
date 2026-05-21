import AIInsightsPanel from '../components/AIInsightsPanel';
import PlanGate, { UpgradeBadge } from '../components/PlanGate';
import { canUseFeature } from '../utils/planFeatures';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingUp, FileText, DollarSign, AlertCircle,
  Plus, ArrowRight, CheckCircle, Clock, Send,
} from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import CashflowDashboard from '../components/CashflowDashboard';
import EngagementTimeline from '../components/EngagementTimeline';
import { api } from '../utils/api';

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }

function StatCard({ label, value, sub, icon: Icon, color = '#13B5EA', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-ink tabular-nums">{value}</p>
      <p className="text-sm font-medium text-ink mt-0.5">{label}</p>
      {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
    </div>
  );
}

const STATUS_STYLES = {
  draft:    { bg: '#F5F7F8', color: '#7A7E85', label: 'Draft' },
  sent:     { bg: '#e8f8fd', color: '#13B5EA', label: 'Sent' },
  viewed:   { bg: '#fff7e6', color: '#d97706', label: 'Viewed' },
  accepted: { bg: '#f0fdf4', color: '#16a34a', label: 'Accepted' },
  paid:     { bg: '#f0fdf4', color: '#16a34a', label: 'Paid' },
  overdue:  { bg: '#fef2f2', color: '#dc2626', label: 'Overdue' },
  cancelled:{ bg: '#F5F7F8', color: '#7A7E85', label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function Dashboard() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const accent = account?.primary_color || '#13B5EA';

  // Handle Stripe Connect OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('stripe_connected') === '1') {
      setToast({ type: 'success', msg: '🎉 Stripe connected! Payment links now route to your account.' });
      navigate('/dashboard', { replace: true });
    } else if (params.get('stripe_error')) {
      setToast({ type: 'error', msg: 'Stripe connection failed: ' + decodeURIComponent(params.get('stripe_error')) });
      navigate('/dashboard', { replace: true });
    }
  }, [location.search]);

  // Auto-dismiss toast after 6s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!account?.id) return;
    setLoading(true);
    api.invoices.dashboard(account.id).then(setStats).catch(console.error).finally(() => setLoading(false));
  }, [account?.id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-5 py-6">
      {toast && (
        <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-muted">{account?.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/contacts/new')} className="btn-ghost flex items-center gap-1.5 text-sm">
            <Plus size={14} /> Contact
          </button>
          <button
            onClick={() => navigate('/quotes/new')}
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg"
            style={{ background: accent }}
          >
            <Plus size={14} /> New quote
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Collected" value={fmt(stats?.total_collected)} icon={DollarSign} color="#16a34a"
          sub="all time" />
        <StatCard label="Outstanding" value={fmt(stats?.total_outstanding)} icon={Clock} color={accent}
          sub={stats?.overdue_count ? `${stats.overdue_count} overdue` : 'no overdue'}
          onClick={() => navigate('/invoices')} />
        <StatCard label="This month" value={fmt(stats?.this_month_invoiced)} icon={TrendingUp} color="#8b5cf6"
          sub="invoiced" />
        <StatCard label="Total quotes" value={stats?.total_quotes || 0} icon={FileText} color="#f97316"
          sub={`${stats?.total_invoices || 0} invoices`} onClick={() => navigate('/quotes')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent quotes */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
            <span className="text-sm font-semibold text-ink">Recent quotes</span>
            <button onClick={() => navigate('/quotes')} className="text-xs flex items-center gap-1 font-medium" style={{ color: accent }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          {!stats?.recent_quotes?.length ? (
            <div className="text-center py-8">
              <p className="text-sm text-ink-muted">No quotes yet</p>
              <button onClick={() => navigate('/quotes/new')}
                className="mt-3 text-xs font-semibold px-4 py-2 rounded-lg text-white" style={{ background: accent }}>
                Create first quote
              </button>
            </div>
          ) : (
            <div>
              {stats.recent_quotes.map(q => (
                <div key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                  style={{ borderColor: '#F0F3F5' }}>
                  <div>
                    <p className="text-sm font-medium text-ink">{q.client_name || 'No client'}</p>
                    <p className="text-xs text-ink-muted">{q.number} · {fmt(q.setup_total + q.monthly_total)}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent invoices */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
            <span className="text-sm font-semibold text-ink">Recent invoices</span>
            <button onClick={() => navigate('/invoices')} className="text-xs flex items-center gap-1 font-medium" style={{ color: accent }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          {!stats?.recent_invoices?.length ? (
            <div className="text-center py-8">
              <p className="text-sm text-ink-muted">No invoices yet</p>
              <p className="text-xs text-ink-muted mt-1">Convert a quote to create your first invoice</p>
            </div>
          ) : (
            <div>
              {stats.recent_invoices.map(inv => {
                const isOverdue = !['paid','cancelled'].includes(inv.status) && inv.due_date && new Date(inv.due_date) < new Date();
                const displayStatus = isOverdue ? 'overdue' : inv.status;
                return (
                  <div key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    style={{ borderColor: '#F0F3F5' }}>
                    <div>
                      <p className="text-sm font-medium text-ink">{inv.client_name || 'No client'}</p>
                      <p className="text-xs text-ink-muted">{inv.number} · {fmt(inv.amount_due)}</p>
                    </div>
                    <StatusBadge status={displayStatus} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* F10: Predictive cashflow — Pro+ only */}
      <div className="mt-6">
        {canUseFeature(account?.plan, 'cashflow_dashboard')
          ? <CashflowDashboard accountId={account?.id} accent={accent} />
          : <PlanGate feature="cashflow_dashboard" />
        }
      </div>

      {/* AI Insights */}
      <div className="mt-5">
        <AIInsightsPanel accountId={account?.id} />
      </div>
    </div>
  );
}
