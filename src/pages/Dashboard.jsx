import PlanGate from '../components/PlanGate';
import { canUseFeature } from '../utils/planFeatures';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, FileText, DollarSign, AlertCircle,
  Plus, ArrowRight, CheckCircle, Clock, Send,
  Zap, Receipt, Users, Calendar, BarChart2, RefreshCw,
  ArrowUpRight, ChevronRight, Sparkles, Activity,
} from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import CashflowDashboard from '../components/CashflowDashboard';
import DashboardHeader from '../components/DashboardHeader';
import WeeklyScheduleWidget from '../components/WeeklyScheduleWidget';
import DraggableWidget from '../components/DraggableWidget';
import { api } from '../utils/api';

function fmt(n)    { return '$' + Math.abs(Math.round((n||0)*100)/100).toLocaleString('en-US',{minimumFractionDigits:0}); }
function fmtDate(s){ if(!s) return '—'; try { return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}); } catch{return s;} }

const STATUS_COLORS = { draft:'#64748B', sent:'#2563EB', viewed:'#D97706', paid:'#0D9488', overdue:'#ef4444', cancelled:'#94A3B8', accepted:'#0D9488' };
const STATUS_BG     = { draft:'#F1F5F9', sent:'#EAF0FF', viewed:'#FEF3C7', paid:'#E0FBF7', overdue:'rgba(239,68,68,0.1)', cancelled:'#F1F5F9', accepted:'#E0FBF7' };

function StatusBadge({ status }) {
  const s = status?.toLowerCase() || 'draft';
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20, background: STATUS_BG[s]||'#F1F5F9', color: STATUS_COLORS[s]||'#64748B', letterSpacing:'0.3px', whiteSpace:'nowrap' }}>
      {s.charAt(0).toUpperCase()+s.slice(1)}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, gradient, delay = 0, to }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => to && navigate(to)}
      className="glow-card p-4 animate-fade-up"
      style={{ animationDelay:`${delay}ms`, cursor: to ? 'pointer' : 'default', transition:'opacity 0.15s, box-shadow 0.15s', userSelect:'none' }}
      onMouseEnter={e => { if (to) { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(37,99,235,0.15)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
      onTouchStart={e => { if (to) e.currentTarget.style.opacity='0.85'; }}
      onTouchEnd={e => { e.currentTarget.style.opacity='1'; }}>
      <div style={{ height:3, borderRadius:2, background:gradient, marginBottom:12 }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.9px' }}>{label}</p>
        <div style={{ width:28, height:28, borderRadius:8, background:gradient, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.9, flexShrink:0 }}>
          <Icon size={13} color="#fff" />
        </div>
      </div>
      <p style={{ fontSize:'clamp(20px,4vw,26px)', fontWeight:800, letterSpacing:'-0.04em', lineHeight:1, color:'var(--text-primary)' }}>{value}</p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
        {sub && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</p>}
        {to && <p style={{ fontSize:10, color:'var(--blue)', fontWeight:600, opacity:0.7 }}>View →</p>}
      </div>
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
  const accent        = '#2563EB';

  const [stats,   setStats]   = useState(null);
  const [quotes,  setQuotes]  = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account?.id) return;
    setLoading(true);
    Promise.all([
      api.invoices.dashboard(account.id).catch(() => null),
      api.quotes.list(account.id).catch(() => []),
      api.invoices.list(account.id).catch(() => []),
    ]).then(([s, q, inv]) => {
      // Normalize API field names for backwards compatibility
      if (s && s.total_collected !== undefined && s.collected_all_time === undefined) {
        s.collected_all_time = s.total_collected;
      }
      if (s && s.this_month_invoiced !== undefined && s.invoiced_this_month === undefined) {
        s.invoiced_this_month = s.this_month_invoiced;
      }
      setStats(s);
      // API returns plain arrays
      const quoteArr   = Array.isArray(q) ? q : (q?.quotes || []);
      const invoiceArr = Array.isArray(inv) ? inv : (inv?.invoices || []);
      setQuotes(quoteArr.slice(0, 5));
      setInvoices(invoiceArr.filter(i => i.status !== 'paid' && i.status !== 'cancelled').slice(0, 5));
      setLoading(false);
    });
  }, [account?.id]);

  const statCards = [
    { label: 'Collected',    value: fmt(stats?.total_collected  || 0), sub: 'all time',              icon: DollarSign, gradient: '#0D9488', delay: 0,   to: '/invoices?filter=paid' },
    { label: 'Outstanding',  value: fmt(stats?.total_outstanding|| 0), sub: 'across all invoices',   icon: AlertCircle, gradient: 'linear-gradient(90deg,#2563EB,#0D9488)', delay: 50,  to: '/invoices' },
    { label: 'This month',   value: fmt(stats?.this_month_invoiced||0), sub: 'invoiced this month',  icon: TrendingUp, gradient: 'linear-gradient(90deg,#7C3AED,#2563EB)', delay: 100, to: '/analytics' },
    { label: 'Quotes',       value: stats?.total_quotes || 0,           sub: `${stats?.total_invoices||0} invoices`, icon: FileText, gradient: '#7C3AED', delay: 150, to: '/quotes' },
  ];

  const quickActions = [
    { icon: Plus,       label: 'New quote',  desc: 'Build & send in minutes',        color: '#2563EB', to: '/quotes/new' },
    { icon: Receipt,    label: 'Invoices',   desc: 'View and manage invoices',        color: '#0D9488', to: '/invoices' },
    { icon: Calendar,   label: 'Schedule',   desc: 'Manage your calendar & jobs',     color: '#7C3AED', to: '/calendar' },
    { icon: Users,      label: 'Team',       desc: 'Chat and collaborate with team',  color: '#D97706', to: '/workspace' },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px', width: '100%', boxSizing: 'border-box' }} className="page-fill">

      {/* Header */}
      {/* ── Dashboard Header — sleek time/greeting bar ── */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <DashboardHeader account={account} accent={accent} />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', gap: 10 }}>
          {quickActions.map(a => <QuickAction key={a.label} {...a} />)}
        </div>
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 440px), 1fr))', gap: 12 }} className="animate-fade-up-delay-3">

        {/* AI Executive Briefing */}
        <div className="glow-card p-5" style={{ marginBottom: 16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:`${accent}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:16 }}>🧠</span>
            </div>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>AI Executive Briefing</p>
              <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>Today's key insights and recommendations</p>
            </div>
            <a href="/analytics" style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:accent, textDecoration:'none', padding:'4px 10px', borderRadius:7, border:`1px solid ${accent}30`, background:`${accent}08` }}>Full Analytics →</a>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:10 }}>
            {[
              { icon:'💰', text:'Collections focus: send reminders to improve cash flow', action:'View Invoices', href:'/invoices', color:'#DC2626' },
              { icon:'📊', text:'Open quotes need follow-up — engage before they go cold', action:'View Quotes', href:'/quotes', color:'#D97706' },
              { icon:'📅', text:'Check schedule capacity for this week', action:'View Schedule', href:'/calendar', color:'#2563EB' },
            ].map((item, i) => (
              <div key={i} style={{ padding:'10px 12px', borderRadius:10, border:`1px solid ${item.color}20`, background:`${item.color}06`, display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ fontSize:16 }}>{item.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:'0 0 5px', fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>{item.text}</p>
                  <a href={item.href} style={{ fontSize:11, fontWeight:700, color:item.color, textDecoration:'none' }}>{item.action} →</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Left column: Recent quotes + Outstanding invoices stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Recent quotes */}
        <div className="glow-card overflow-hidden">
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.9px' }}>Recent quotes</p>
            <button onClick={() => navigate('/quotes')}
              style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ChevronRight size={11} />
            </button>
          </div>
          {quotes.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <FileText size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No quotes yet</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Create your first quote to get started.</p>
              <button onClick={() => navigate('/quotes/new')}
                style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--gradient)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>{q.number}</span>
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
              style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ChevronRight size={11} />
            </button>
          </div>
          {invoices.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <CheckCircle size={28} style={{ color: '#0D9488', margin: '0 auto 10px' }} />
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: isOverdue ? '#ef4444' : '#7C3AED', fontFamily: 'monospace' }}>{inv.number}</span>
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
        </div>{/* end left column */}

        {/* Right column: Schedule summary + Predictive Cashflow */}
        <div className="animate-fade-up-delay-4" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Weekly schedule & alerts — Pro+ only */}
          <DraggableWidget id="weekly-schedule" title="This Week" icon="📅" accent={accent}>
            {(!account?.plan || canUseFeature(account?.plan, 'calendar'))
              ? <WeeklyScheduleWidget accountId={account?.id} accent={accent} />
              : (
                <div style={{ padding:24, textAlign:'center', background:'var(--bg-surface)' }}>
                  <p style={{ fontSize:28, marginBottom:8 }}>🔒</p>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Schedule — Pro Feature</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:12 }}>
                    Upgrade to Pro to view your weekly schedule, upcoming jobs, and overdue invoice alerts.
                  </p>
                  <a href="/billing" style={{ fontSize:11, fontWeight:700, color: accent, textDecoration:'none',
                    padding:'6px 14px', border:`1.5px solid ${accent}`, borderRadius:8, display:'inline-block' }}>
                    Upgrade to Pro →
                  </a>
                </div>
              )
            }
          </DraggableWidget>

          {/* Predictive cashflow */}
          <DraggableWidget id="cashflow" title="Cashflow Forecast" icon="💰" accent={accent}>
            {(!account?.plan || canUseFeature(account?.plan, 'cashflow_dashboard'))
              ? <CashflowDashboard accountId={account?.id} accent={accent} />
              : <PlanGate feature="cashflow_dashboard" />
            }
          </DraggableWidget>
        </div>

      </div>
    </div>
  );
}
