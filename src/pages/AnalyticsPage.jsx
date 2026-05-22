/**
 * Analytics — DocSend-style quote intelligence dashboard.
 * Shows: view rates, time-to-accept, top services, acceptance rates, revenue forecast.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';
import {
  TrendingUp, Eye, Clock, CheckCircle, FileText,
  AlertCircle, BarChart2, RefreshCw, Zap, DollarSign,
  ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import PlanGate from '../components/PlanGate';
import { canUseFeature } from '../utils/planFeatures';

const fmt  = n => '$' + Math.round(n||0).toLocaleString();
const pct  = n => Math.round((n||0)*10)/10 + '%';

function MetricCard({ label, value, sub, icon: Icon, color, trend, delay=0 }) {
  return (
    <div className="glow-card p-5 animate-fade-up" style={{ animationDelay:`${delay}ms` }}>
      <div style={{ height:3, borderRadius:2, background:color, marginBottom:14 }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:6 }}>
        <p style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.9px' }}>{label}</p>
        <div style={{ width:28, height:28, borderRadius:8, background:color+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <p style={{ fontSize:28, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em', lineHeight:1 }}>{value}</p>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
        {trend > 0 && <ArrowUp size={11} style={{ color:'#00E5C8' }} />}
        {trend < 0 && <ArrowDown size={11} style={{ color:'#ef4444' }} />}
        {trend === 0 && <Minus size={11} style={{ color:'#94A3B8' }} />}
        <p style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</p>
      </div>
    </div>
  );
}

function QuoteRow({ q }) {
  const statusColor = { draft:'#94A3B8', sent:'#4B7BFF', viewed:'#f59e0b', accepted:'#00E5C8', expired:'#ef4444' };
  const s = q.status || 'draft';
  return (
    <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:'0.5px solid var(--border-subtle)', gap:12 }}
      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-page)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, fontWeight:700, color:statusColor[s]||'#64748B', fontFamily:'monospace' }}>{q.number}</span>
          <span style={{ fontSize:9, fontWeight:700, color:statusColor[s], background:statusColor[s]+'18', padding:'2px 7px', borderRadius:20 }}>{s}</span>
        </div>
        <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.client_name||q.client_biz||'—'}</p>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:16, shrink:0, fontSize:11 }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontWeight:700, color:'var(--text-primary)' }}>{q.view_count||0}</p>
          <p style={{ color:'var(--text-muted)' }}>views</p>
        </div>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontWeight:700, color:'var(--text-primary)' }}>{q.time_to_view ? Math.round(q.time_to_view/3600)+'h' : '—'}</p>
          <p style={{ color:'var(--text-muted)' }}>to view</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontWeight:700, color:'var(--text-primary)', fontSize:13 }}>{'$'+Math.round(q.setup_total||0).toLocaleString()}</p>
          <p style={{ color:'var(--text-muted)' }}>{new Date(q.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { account } = useAccount();
  const plan = account?.plan || 'starter';

  const [quotes,  setQuotes]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const q = await api.quotes.list(account.id);
      setQuotes(q?.quotes || []);
    } catch {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  // Compute metrics from quotes
  const total        = quotes.length;
  const accepted     = quotes.filter(q => q.status==='accepted').length;
  const viewed       = quotes.filter(q => q.view_count>0).length;
  const totalRevenue = quotes.filter(q=>q.status==='accepted').reduce((s,q)=>s+(q.setup_total||0),0);
  const acceptRate   = total > 0 ? (accepted/total*100) : 0;
  const viewRate     = total > 0 ? (viewed/total*100) : 0;
  const avgValue     = accepted > 0 ? totalRevenue/accepted : 0;

  const metrics = [
    { label:'Total quotes',     value: total,           sub:'all time',           icon: FileText,   color:'#7B4FE8',    trend:0, delay:0   },
    { label:'View rate',        value: pct(viewRate),   sub:'of quotes viewed',   icon: Eye,        color:'#4B7BFF',    trend:1, delay:50  },
    { label:'Acceptance rate',  value: pct(acceptRate), sub:'of views accepted',  icon: CheckCircle,color:'#00E5C8',    trend:1, delay:100 },
    { label:'Revenue closed',   value: fmt(totalRevenue),sub:'from accepted quotes',icon:DollarSign, color:'#00E5C8',   trend:1, delay:150 },
    { label:'Avg deal value',   value: fmt(avgValue),   sub:'per accepted quote', icon: TrendingUp, color:'#4B7BFF',    trend:0, delay:200 },
    { label:'Open pipeline',    value: fmt(quotes.filter(q=>q.status==='sent'||q.status==='viewed').reduce((s,q)=>s+(q.setup_total||0),0)), sub:'in pending quotes', icon: Zap, color:'#f59e0b', trend:0, delay:250 },
  ];

  const topServices = {};
  quotes.filter(q=>q.status==='accepted').forEach(q => {
    (q.items||[]).forEach(i => {
      const k = i.name;
      if (!topServices[k]) topServices[k] = { count:0, revenue:0 };
      topServices[k].count++;
      topServices[k].revenue += (i.setup_price||0) + (i.monthly_price||0)*12;
    });
  });
  const topList = Object.entries(topServices).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,5);

  if (!canUseFeature(plan, 'cashflow_dashboard')) {
    return (
      <div style={{ maxWidth:680, margin:'0 auto', padding:'40px 16px' }}>
        <PlanGate feature="cashflow_dashboard" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth:1280, margin:'0 auto', padding:'24px 16px' }}>
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em' }}>Analytics</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>Quote intelligence & revenue insights</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid-auto-stack mb-6" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:7 }}>
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }} className="animate-fade-up-delay-2">

        {/* Quote funnel table */}
        <div className="glow-card overflow-hidden">
          <div style={{ padding:'14px 16px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.9px' }}>Quote pipeline</p>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{total} total</span>
          </div>
          {loading ? (
            <div style={{ padding:'40px 16px', textAlign:'center' }}>
              <RefreshCw size={20} className="animate-spin" style={{ color:'var(--text-muted)', margin:'0 auto' }} />
            </div>
          ) : quotes.length === 0 ? (
            <div style={{ padding:'40px 16px', textAlign:'center' }}>
              <BarChart2 size={32} style={{ color:'var(--text-muted)', margin:'0 auto 12px' }} />
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Send your first quote to start seeing analytics.</p>
            </div>
          ) : (
            quotes.map(q => <QuoteRow key={q.id} q={q} />)
          )}
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Funnel vis */}
          <div className="glow-card p-5">
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.9px', marginBottom:14 }}>Conversion funnel</p>
            {[
              { label:'Quotes sent',  value:total,    color:'#7B4FE8' },
              { label:'Viewed',       value:viewed,   color:'#4B7BFF' },
              { label:'Accepted',     value:accepted, color:'#00E5C8' },
            ].map((row, i) => (
              <div key={row.label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{row.value}</span>
                </div>
                <div style={{ height:8, borderRadius:4, background:'var(--bg-page)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:4, background:row.color, width:`${total>0 ? (row.value/total*100) : 0}%`, transition:'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Top services */}
          {topList.length > 0 && (
            <div className="glow-card overflow-hidden">
              <div style={{ padding:'12px 16px', borderBottom:'0.5px solid var(--border)' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.9px' }}>Top services</p>
              </div>
              {topList.map(([name, data], i) => (
                <div key={name} style={{ display:'flex', alignItems:'center', padding:'10px 16px', borderBottom:'0.5px solid var(--border-subtle)', gap:10 }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,#00E5C8,#4B7BFF)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</p>
                    <p style={{ fontSize:10, color:'var(--text-muted)' }}>{data.count} deals</p>
                  </div>
                  <p style={{ fontSize:12, fontWeight:700, color:'#00E5C8', flexShrink:0 }}>{fmt(data.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
