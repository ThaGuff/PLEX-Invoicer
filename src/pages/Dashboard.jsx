import PlanGate from '../components/PlanGate';
import { canUseFeature } from '../utils/planFeatures';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, FileText, DollarSign, AlertCircle,
  Plus, ArrowRight, CheckCircle, Clock, Send,
  Zap, Receipt, Users, BarChart2, RefreshCw,
  ArrowUpRight, ChevronRight, Sparkles, Activity,
} from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import CashflowDashboard from '../components/CashflowDashboard';
import { api } from '../utils/api';

function fmt(n)    { return '$' + Math.abs(Math.round((n||0)*100)/100).toLocaleString('en-US',{minimumFractionDigits:0}); }
function fmtDate(s){ if(!s) return '—'; try { return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}); } catch{return s;} }

const STATUS_COLORS = { draft:'#64748B', sent:'#4B7BFF', viewed:'#f59e0b', paid:'#00E5C8', overdue:'#ef4444', cancelled:'#94A3B8', accepted:'#00E5C8' };
const STATUS_BG     = { draft:'#F1F5F9', sent:'#EAF0FF', viewed:'#FEF3C7', paid:'#E0FBF7', overdue:'rgba(239,68,68,0.1)', cancelled:'#F1F5F9', accepted:'#E0FBF7' };

function StatusBadge({ status }) {
  const s = status?.toLowerCase() || 'draft';
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20, background: STATUS_BG[s]||'#F1F5F9', color: STATUS_COLORS[s]||'#64748B', letterSpacing:'0.3px', whiteSpace:'nowrap' }}>
      {s.charAt(0).toUpperCase()+s.slice(1)}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, gradient, delay = 0 }) {
  return (
    <div className="glow-card p-5 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ height: 3, borderRadius: 2, background: gradient, marginBottom: 14 }} />
      <div className="flex items-start justify-between mb-2">
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.9px' }}>{label}</p>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>
          <Icon size={14} color="#fff" />
        </div>
      </div>
      <p className="stat-value" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, color, to, onClick }) {
  const navigate = useNavigate();
  return (
    <button className="tab-card p-4 text-left w-full" onClick={() => onClick ? onClick() : navigate(to)}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={17} style={{ color }} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</p>
    </button>
  );
}

export default function Dashboard() {
  const { account }   = useAccount();
  const navigate      = useNavigate();
  const accent        = '#4B7BFF';

  const [stats,   setStats]   = useState(null);
  const [quotes,  setQuotes]  = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account?.id) return;
    setLoading(true);
    Promise.all([
      api.invoices.dashboard(account.id).catch(() => null),
      api.quotes.list(account.id).catch(() => ({ quotes: [] })),
      api.invoices.list(account.id).catch(() => ({ invoices: [] })),
    ]).then(([s, q, inv]) => {
      setStats(s);
      setQuotes((q?.quotes || []).slice(0, 5));
      setInvoices((inv?.invoices || []).filter(i => i.status !== 'paid' && i.status !== 'cancelled').slice(0, 5));
      setLoading(false);
    });
  }, [account?.id]);

  const statCards = [
    { label: 'Collected',    value: fmt(stats?.collected_all_time  || 0), sub: 'all time',         icon: DollarSign, gradient: '#00E5C8', delay: 0 },
    { label: 'Outstanding',  value: fmt(stats?.total_outstanding   || 0), sub: 'across all invoices', icon: AlertCircle, gradient: 'linear-gradient(90deg,#00E5C8,#4B7BFF)', delay: 50 },
    { label: 'This month',   value: fmt(stats?.invoiced_this_month || 0), sub: 'invoiced',          icon: TrendingUp, gradient: 'linear-gradient(90deg,#4B7BFF,#7B4FE8)', delay: 100 },
    { label: 'Total quotes', value: stats?.total_quotes || 0,             sub: `${stats?.total_invoices||0} invoices`, icon: FileText, gradient: '#7B4FE8', delay: 150 },
  ];

  const quickActions = [
    { icon: Plus,       label: 'New quote',     desc: 'Build & send in minutes',    color: '#4B7BFF', to: '/quotes/new' },
    { icon: Receipt,    label: 'Record payment', desc: 'Mark an invoice as paid',   color: '#00E5C8', to: '/invoices' },
    { icon: Users,      label: 'Add client',     desc: 'Create a contact record',   color: '#7B4FE8', to: '/contacts' },
    { icon: Zap,        label: 'Automate',       desc: 'Set up a follow-up sequence', color: '#f59e0b', to: '/automations' },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px' }} className="page-fill">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {account?.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/quotes/new')}
            className="flex items-center gap-2 text-white font-bold rounded-xl"
            style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)', padding: '10px 20px', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(75,123,255,0.35)' }}>
            <Plus size={15} /> New quote
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid-auto-stack mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className="glow-card p-5 animate-pulse" style={{ height: 112 }}>
              <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', marginBottom: 14 }} />
              <div style={{ height: 10, width: '50%', borderRadius: 4, background: 'var(--border)', marginBottom: 8 }} />
              <div style={{ height: 30, width: '70%', borderRadius: 6, background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-auto-stack mb-6">
          {statCards.map((s, i) => (
            <StatCard key={s.label} {...s} gradient={typeof s.gradient === 'string' && s.gradient.startsWith('#') ? s.gradient : s.gradient} />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-6 animate-fade-up-delay-2">
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 12 }}>Quick actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {quickActions.map(a => <QuickAction key={a.label} {...a} />)}
        </div>
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="animate-fade-up-delay-3">

        {/* Recent quotes */}
        <div className="glow-card overflow-hidden">
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.9px' }}>Recent quotes</p>
            <button onClick={() => navigate('/quotes')}
              style={{ fontSize: 11, fontWeight: 600, color: '#4B7BFF', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ChevronRight size={11} />
            </button>
          </div>
          {quotes.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <FileText size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No quotes yet</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Create your first quote to get started.</p>
              <button onClick={() => navigate('/quotes/new')}
                style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={12} /> New quote
              </button>
            </div>
          ) : quotes.map((q, i) => (
            <div key={q.id}
              onClick={() => navigate(`/quotes/${q.id}`)}
              style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: i < quotes.length-1 ? '0.5px solid var(--border-subtle)' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4B7BFF', fontFamily: 'monospace' }}>{q.number}</span>
                  <StatusBadge status={q.status} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', truncate: true }}>{q.client_name || q.client_biz || '—'}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(q.setup_total)}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(q.created_at)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Outstanding invoices */}
        <div className="glow-card overflow-hidden">
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.9px' }}>Outstanding invoices</p>
            <button onClick={() => navigate('/invoices')}
              style={{ fontSize: 11, fontWeight: 600, color: '#4B7BFF', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ChevronRight size={11} />
            </button>
          </div>
          {invoices.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <CheckCircle size={28} style={{ color: '#00E5C8', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>All clear!</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No outstanding invoices right now.</p>
            </div>
          ) : invoices.map((inv, i) => {
            const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid';
            return (
              <div key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: i < invoices.length-1 ? '0.5px solid var(--border-subtle)' : 'none', cursor: 'pointer', background: isOverdue ? 'rgba(239,68,68,0.03)' : 'transparent', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = isOverdue ? 'rgba(239,68,68,0.06)' : 'var(--bg-page)'}
                onMouseLeave={e => e.currentTarget.style.background = isOverdue ? 'rgba(239,68,68,0.03)' : 'transparent'}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isOverdue ? '#ef4444' : '#7B4FE8', fontFamily: 'monospace' }}>{inv.number}</span>
                    <StatusBadge status={isOverdue ? 'overdue' : inv.status} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inv.client_name || '—'}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: isOverdue ? '#ef4444' : 'var(--text-primary)' }}>{fmt(inv.amount_due)}</p>
                  <p style={{ fontSize: 10, color: isOverdue ? '#ef4444' : 'var(--text-muted)' }}>Due {fmtDate(inv.due_date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cashflow — Pro+ */}
      <div style={{ marginTop: 20 }} className="animate-fade-up-delay-4">
        {canUseFeature(account?.plan, 'cashflow_dashboard')
          ? <CashflowDashboard accountId={account?.id} accent={accent} />
          : <PlanGate feature="cashflow_dashboard" />
        }
      </div>
    </div>
  );
}
