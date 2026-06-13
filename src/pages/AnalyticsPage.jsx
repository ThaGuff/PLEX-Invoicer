/**
 * AnalyticsPage — AI Business Intelligence Command Center
 * Sections: Executive Dashboard, Business Health, AI Advisor,
 *           Revenue Intelligence, Churn Risk, Workforce Intelligence
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle,
         Brain, Target, Activity, BarChart3, RefreshCw, ChevronRight,
         Zap, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';

const fmt$ = n => '$' + Math.round(parseFloat(n||0)).toLocaleString('en-US');
const fmtPct = n => (n > 0 ? '+' : '') + n + '%';

function StatCard({ label, value, sub, color, icon: Icon, trend }) {
  return (
    <div style={{ padding:'16px 18px', borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-surface)', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
        <span style={{ fontSize:26, fontWeight:900, color:'var(--text-primary)', letterSpacing:'-0.04em' }}>{value}</span>
        {trend !== undefined && (
          <span style={{ fontSize:12, fontWeight:700, color: trend >= 0 ? '#C6E404' : '#DC2626', display:'flex', alignItems:'center', gap:2 }}>
            {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
            {fmtPct(trend)}
          </span>
        )}
      </div>
      {sub && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{sub}</span>}
    </div>
  );
}

function HealthGauge({ score, label, color }) {
  const r = 50, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ textAlign:'center' }}>
      <svg width={120} height={120} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={60} cy={60} r={r} fill="none" stroke="var(--border)" strokeWidth={10}/>
        <circle cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1s ease' }}/>
      </svg>
      <div style={{ marginTop:-100, height:100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:28, fontWeight:900, color }}>{score}</span>
        <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>/100</span>
      </div>
      <p style={{ margin:'8px 0 0', fontSize:14, fontWeight:800, color }}>{label}</p>
    </div>
  );
}

function RevenueBar({ month, revenue, maxRevenue }) {
  const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  const label = month.slice(5); // "MM"
  const monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
      <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{fmt$(revenue)}</span>
      <div style={{ width:'100%', background:'var(--bg-raised)', borderRadius:6, height:80, display:'flex', alignItems:'flex-end', overflow:'hidden' }}>
        <div style={{ width:'100%', background:'#C6E404', borderRadius:6, height:`${pct}%`, transition:'height 0.8s ease', minHeight:4 }}/>
      </div>
      <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>{monthNames[parseInt(label)] || label}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { account } = useAccount();
  const accent = '#C6E404';
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
  const h = { Authorization: `Bearer ${token}` };
  const acctId = account?.id;

  const [health, setHealth] = useState(null);
  const [advisor, setAdvisor] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [churnRisk, setChurnRisk] = useState([]);
  const [workforce, setWorkforce] = useState(null);
  const [execSummary, setExecSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!acctId) return;
    setLoading(true);
    try {
      const [h1, h2, h3, h4, h5, h6] = await Promise.all([
        fetch(`/api/analytics/business-health?account_id=${acctId}`, { headers: h }).then(r => r.json()).catch(() => null),
        fetch(`/api/analytics/ai-advisor?account_id=${acctId}`, { headers: h }).then(r => r.json()).catch(() => null),
        fetch(`/api/analytics/predictive-cashflow?account_id=${acctId}`, { headers: h }).then(r => r.json()).catch(() => null),
        fetch(`/api/analytics/churn-risk?account_id=${acctId}`, { headers: h }).then(r => r.json()).catch(() => []),
        fetch(`/api/analytics/workforce-intelligence?account_id=${acctId}`, { headers: h }).then(r => r.json()).catch(() => null),
        fetch(`/api/analytics/executive-summary?account_id=${acctId}`, { headers: h }).then(r => r.json()).catch(() => null),
      ]);
      setHealth(h1); setAdvisor(h2); setCashflow(h3);
      setChurnRisk(Array.isArray(h4) ? h4 : []); setWorkforce(h5); setExecSummary(h6);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [acctId]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const TABS = [
    { id:'overview', label:'Overview', icon:<BarChart3 size={13}/> },
    { id:'advisor', label:'AI Advisor', icon:<Brain size={13}/> },
    { id:'revenue', label:'Revenue', icon:<DollarSign size={13}/> },
    { id:'customers', label:'Customers', icon:<Users size={13}/> },
    { id:'workforce', label:'Workforce', icon:<Clock size={13}/> },
  ];

  const maxRevenue = cashflow ? Math.max(...(cashflow.monthlyRevenue || []).map(m => m.revenue), 1) : 1;
  const healthColor = health?.labelColor || accent;

  return (
    <div style={{ padding:'0 0 32px', fontFamily:"'Inter', sans-serif" }}>
      {/* ── Gradient Header ── */}
      <div style={{ padding:'20px 28px 22px', background:'var(--bg-page)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            {health && (
              <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
                {[
                  { label:'Health', value:`${health.score}/100`, color:'var(--text-muted)' },
                  { label:'This Month', value:fmt$(health.revenue?.current), color:'#C6E404' },
                  { label:'Outstanding', value:fmt$(health.collections?.outstanding), color:'var(--text-muted)' },
                  { label:'Churn Risk', value:health.customers?.churnRisk, color:'#64748B' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding:'5px 12px', borderRadius:10, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}>
                    <span style={{ fontSize:15, fontWeight:800, color }}>{value}</span>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginLeft:6 }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ padding:'8px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}/> Refresh AI
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ padding:'0 28px', borderBottom:'1px solid var(--border)', display:'flex', gap:0, background:'var(--bg-surface)' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:12, fontWeight:activeTab===tab.id?700:500, color:activeTab===tab.id?accent:'var(--text-muted)', borderBottom:`2px solid ${activeTab===tab.id?accent:'transparent'}`, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit', transition:'all 0.15s' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px 28px' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${accent}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
          </div>
        ) : (

          /* ── OVERVIEW TAB ── */
          activeTab === 'overview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {/* Business Health Score */}
              {health && (
                <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:24, padding:24, borderRadius:16, border:`2px solid ${healthColor}30`, background:`${healthColor}06`, alignItems:'center' }}>
                  <HealthGauge score={health.score} label={health.label} color={healthColor} />
                  <div>
                    <p style={{ margin:'0 0 12px', fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>Business Health Score</p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:10 }}>
                      {Object.entries(health.components || {}).map(([key, score]) => (
                        <div key={key} style={{ padding:'8px 12px', borderRadius:10, background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'capitalize', marginBottom:4 }}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:4, borderRadius:2, background:'var(--border)', overflow:'hidden' }}>
                              <div style={{ width:`${Math.min(score/20*100,100)}%`, height:'100%', background:score>=15?'#C6E404':score>=10?'#64748B':'#DC2626', transition:'width 0.8s ease' }}/>
                            </div>
                            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)' }}>{score}/20</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:14 }}>
                <StatCard label="This Month" value={fmt$(health?.revenue?.current)} sub={`Avg: ${fmt$(health?.revenue?.avg)}/mo`} color="#C6E404" icon={DollarSign} trend={health?.trend}/>
                <StatCard label="YTD Revenue" value={fmt$(health?.revenue?.ytd)} color={accent} icon={TrendingUp}/>
                <StatCard label="Outstanding" value={fmt$(health?.collections?.outstanding)} sub={health?.collections?.overdue > 0 ? `${fmt$(health.collections.overdue)} overdue` : 'None overdue ✓'} color={health?.collections?.overdue > 0 ? '#DC2626' : '#C6E404'} icon={AlertTriangle}/>
                <StatCard label="Quote Accept Rate" value={`${health?.quotes?.acceptRate || 0}%`} color={accent} icon={CheckCircle}/>
                <StatCard label="Customers" value={health?.customers?.total || 0} sub={`${health?.customers?.churnRisk || 0} at churn risk`} color="#64748B" icon={Users}/>
                <StatCard label="Labor Margin" value={`${health?.labor?.margin || 0}%`} sub={`${health?.labor?.hours}h tracked`} color="#C6E404" icon={Activity}/>
              </div>

              {/* Revenue Chart */}
              {cashflow?.monthlyRevenue && (
                <div style={{ padding:20, borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                  <p style={{ margin:'0 0 16px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>6-Month Revenue Trend</p>
                  <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:120 }}>
                    {cashflow.monthlyRevenue.map(m => (
                      <RevenueBar key={m.month} month={m.month} revenue={m.revenue} maxRevenue={maxRevenue}/>
                    ))}
                  </div>
                </div>
              )}

              {/* Executive Summary */}
              {execSummary && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {execSummary.risks?.length > 0 && (
                    <div style={{ padding:16, borderRadius:12, border:'1px solid #DC262630', background:'#DC262606' }}>
                      <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'#DC2626', textTransform:'uppercase', letterSpacing:'0.06em' }}>⚠️ Risks</p>
                      {execSummary.risks.map((r, i) => (
                        <div key={i} style={{ fontSize:13, color:'var(--text-secondary)', padding:'5px 0', borderBottom:'0.5px solid var(--border)' }}>{r.text}</div>
                      ))}
                    </div>
                  )}
                  {execSummary.opportunities?.length > 0 && (
                    <div style={{ padding:16, borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-raised)' }}>
                      <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Opportunities</p>
                      {execSummary.opportunities.map((o, i) => (
                        <div key={i} style={{ fontSize:13, color:'var(--text-secondary)', padding:'5px 0', borderBottom:'0.5px solid var(--border)' }}>{o.text}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* ── AI ADVISOR TAB ── */}
        {!loading && activeTab === 'advisor' && advisor && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* AI Narrative */}
            <div style={{ padding:24, borderRadius:16, border:`1.5px solid ${accent}30`, background:`${accent}06` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Brain size={18} style={{ color:'#fff' }}/>
                </div>
                <div>
                  <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>AI Business Advisor</p>
                  <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>Powered by GPT-4 · Updated just now</p>
                </div>
                <div style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:8, background: advisor.revTrend >= 0 ? '#C6E40415' : '#DC262615', fontSize:12, fontWeight:700, color: advisor.revTrend >= 0 ? '#C6E404' : '#DC2626', display:'flex', alignItems:'center', gap:4 }}>
                  {advisor.revTrend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                  {fmtPct(advisor.revTrend || 0)} vs last month
                </div>
              </div>
              <p style={{ margin:0, fontSize:14, color:'var(--text-secondary)', lineHeight:1.8, fontStyle:'italic' }}>
                "{advisor.narrative}"
              </p>
            </div>

            {/* Recommendations */}
            {advisor.recommendations?.length > 0 && (
              <div>
                <p style={{ margin:'0 0 12px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>Recommended Actions</p>
                {advisor.recommendations.map((rec, i) => (
                  <div key={i} style={{ display:'flex', gap:14, padding:'14px 16px', borderRadius:12, border:`1px solid ${rec.priority==='high' ? '#DC262630' : '#64748B30'}`, background: rec.priority==='high' ? '#DC262606' : '#64748B06', marginBottom:10 }}>
                    <div style={{ fontSize:24, flexShrink:0 }}>{rec.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{rec.title}</span>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background: rec.priority==='high' ? '#DC262615' : '#64748B15', color: rec.priority==='high' ? '#DC2626' : '#64748B', fontWeight:700 }}>{rec.priority}</span>
                      </div>
                      <p style={{ margin:0, fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>{rec.desc}</p>
                      {rec.impact > 0 && <p style={{ margin:'4px 0 0', fontSize:12, fontWeight:700, color:'#C6E404' }}>Est. impact: {fmt$(rec.impact)}</p>}
                    </div>
                    <ChevronRight size={16} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
                  </div>
                ))}
              </div>
            )}

            {advisor.recommendations?.length === 0 && (
              <div style={{ textAlign:'center', padding:40 }}>
                <CheckCircle size={40} style={{ color:'#C6E404', margin:'0 auto 12px', display:'block' }}/>
                <p style={{ fontSize:16, fontWeight:700, color:'#C6E404', margin:'0 0 6px' }}>Business is on track!</p>
                <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>No critical issues detected. Keep up the great work.</p>
              </div>
            )}
          </div>
        )}

        {/* ── REVENUE TAB ── */}
        {!loading && activeTab === 'revenue' && cashflow && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:14 }}>
              <StatCard label="Collected" value={fmt$(cashflow.collected)} color="#C6E404" icon={DollarSign}/>
              <StatCard label="Outstanding" value={fmt$(cashflow.outstanding)} color="#64748B" icon={AlertTriangle}/>
              <StatCard label="This Month" value={fmt$(cashflow.thisMonth)} color={accent} icon={TrendingUp}/>
              <StatCard label="Accept Rate" value={`${cashflow.acceptRate}%`} color="#64748B" icon={Target}/>
            </div>
            {cashflow.leaks?.length > 0 && (
              <div style={{ padding:20, borderRadius:14, border:'1.5px solid #DC262630', background:'#DC262606' }}>
                <p style={{ margin:'0 0 14px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#DC2626' }}>💰 Revenue Leaks Detected</p>
                {cashflow.leaks.map((leak, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:i < cashflow.leaks.length-1 ? '0.5px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{leak.desc}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:'#DC2626', flexShrink:0, marginLeft:12 }}>{fmt$(leak.amount)}</span>
                  </div>
                ))}
                <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #DC262630', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Total Estimated Leak</span>
                  <span style={{ fontSize:16, fontWeight:900, color:'#DC2626' }}>{fmt$(cashflow.leaks.reduce((s,l)=>s+l.amount,0))}</span>
                </div>
              </div>
            )}
            {/* 12-week forecast */}
            {cashflow.forecast && (
              <div style={{ padding:20, borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                <p style={{ margin:'0 0 16px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>12-Week Revenue Forecast</p>
                <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:80 }}>
                  {cashflow.forecast.map(w => {
                    const max = Math.max(...cashflow.forecast.map(f => f.projected), 1);
                    const pct = (w.projected / max) * 100;
                    const opacity = w.type === 'near' ? 1 : w.type === 'mid' ? 0.7 : 0.4;
                    return (
                      <div key={w.week} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }} title={`Week ${w.week}: ${fmt$(w.projected)}`}>
                        <div style={{ width:'100%', height:`${pct}%`, background:accent, borderRadius:4, minHeight:4, opacity }}/>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:'flex', gap:16, marginTop:8 }}>
                  {[{label:'Weeks 1-4', op:1},{label:'Weeks 5-8', op:0.7},{label:'Weeks 9-12', op:0.4}].map(({label,op})=>(
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:12, height:12, borderRadius:3, background:accent, opacity:op }}/>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {!loading && activeTab === 'customers' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ padding:16, borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-surface)' }}>
              <p style={{ margin:'0 0 14px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>🚨 Churn Risk Customers</p>
              {churnRisk.length === 0 ? (
                <div style={{ textAlign:'center', padding:24 }}>
                  <CheckCircle size={32} style={{ color:'#C6E404', margin:'0 auto 10px', display:'block' }}/>
                  <p style={{ color:'var(--text-muted)', fontSize:13, margin:0 }}>No high-risk customers detected — great retention!</p>
                </div>
              ) : churnRisk.map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'0.5px solid var(--border)' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background: c.churnScore>70?'#DC262615':'#64748B15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:c.churnScore>70?'#DC2626':'#64748B', flexShrink:0 }}>
                    {(c.name||'?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{c.name || 'Unknown'}</p>
                    <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>
                      {c.daysSince}d inactive · {c.invoiceCount} invoices · {fmt$(c.totalRevenue)} lifetime
                    </p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:16, fontWeight:900, color:c.churnScore>70?'#DC2626':'#64748B' }}>{c.churnScore}%</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>churn risk</div>
                  </div>
                  <a href={`/contacts`} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-raised)', color:'var(--text-muted)', textDecoration:'none', fontSize:11, fontWeight:600 }}>Contact →</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WORKFORCE TAB ── */}
        {!loading && activeTab === 'workforce' && workforce && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:14 }}>
              <StatCard label="Total Hours" value={`${workforce.totalHours}h`} color={accent} icon={Clock}/>
              <StatCard label="Labor Revenue" value={fmt$(workforce.totalCost)} color="#C6E404" icon={DollarSign}/>
              <StatCard label="Team Members" value={workforce.employees?.length || 0} color="#64748B" icon={Users}/>
              <StatCard label="Projects" value={workforce.projects?.length || 0} color="#64748B" icon={Activity}/>
            </div>
            {/* Leaderboard */}
            {workforce.employees?.length > 0 && (
              <div style={{ padding:20, borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                <p style={{ margin:'0 0 14px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>Workforce Leaderboard</p>
                {workforce.employees.slice(0, 10).map((emp, i) => (
                  <div key={emp.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:i<workforce.employees.length-1?'0.5px solid var(--border)':'none' }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:i===0?'#64748B':i===1?'#94A3B8':i===2?'#B45309':'var(--bg-raised)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:i<3?'#fff':'var(--text-muted)', flexShrink:0 }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{emp.name}</p>
                      <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{emp.hours}h · {emp.projects} project{emp.projects!==1?'s':''}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ margin:0, fontSize:14, fontWeight:800, color:'#C6E404' }}>{fmt$(emp.cost)}</p>
                      <p style={{ margin:0, fontSize:10, color:emp.classification==='Elite Performer'?'#64748B':emp.classification==='Strong Performer'?'#C6E404':'var(--text-muted)', fontWeight:600 }}>{emp.classification}</p>
                    </div>
                    <div style={{ width:48, textAlign:'center' }}>
                      <div style={{ fontSize:16, fontWeight:900, color:accent }}>{emp.efficiencyScore}</div>
                      <div style={{ fontSize:9, color:'var(--text-muted)' }}>score</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
