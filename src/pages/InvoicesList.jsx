/**
 * Smart Invoicing — AI-powered Revenue Management Platform
 * Features: Health scores, AI collections, risk engine, payment profiles, cash flow forecast
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, DollarSign, AlertTriangle, CheckCircle,
         Clock, TrendingUp, TrendingDown, Brain, Zap, Eye, Send,
         RefreshCw, ChevronRight, X, BarChart3, Target } from 'lucide-react';

const fmt$ = n => '$' + parseFloat(n||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD = s => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const daysDiff = d => d ? Math.floor((Date.now() - new Date(d)) / 86400000) : 0;

const STATUS = {
  paid:     { label:'Paid',       color:'#059669', bg:'#05966912', dot:'#059669' },
  generated:{ label:'Sent',       color:'#2563EB', bg:'#2563EB12', dot:'#2563EB' },
  draft:    { label:'Draft',      color:'#64748B', bg:'#64748B12', dot:'#94A3B8' },
  overdue:  { label:'Overdue',    color:'#DC2626', bg:'#DC262612', dot:'#DC2626' },
  viewed:   { label:'Viewed',     color:'#D97706', bg:'#D9770612', dot:'#D97706' },
  partial:  { label:'Partial',    color:'#7C3AED', bg:'#7C3AED12', dot:'#7C3AED' },
  void:     { label:'Void',       color:'#94A3B8', bg:'#94A3B812', dot:'#94A3B8' },
};

function healthScore(inv, allInvoices) {
  const clientInvs = allInvoices.filter(i => i.client_name === inv.client_name && i.status === 'paid');
  const paidCount = clientInvs.length;
  const ageDays = daysDiff(inv.created_at);
  const amount = parseFloat(inv.amount_due || 0);
  let score = 90;
  if (ageDays > 30) score -= 20;
  if (ageDays > 60) score -= 20;
  if (paidCount === 0) score -= 15;
  if (amount > 2000) score -= 5;
  if (paidCount > 3) score += 10;
  return Math.max(10, Math.min(99, score));
}

function HealthBadge({ score }) {
  const color = score >= 80 ? '#059669' : score >= 60 ? '#D97706' : '#DC2626';
  const label = score >= 80 ? 'Low Risk' : score >= 60 ? 'Med Risk' : 'High Risk';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ width:32, height:32, borderRadius:'50%', background:`${color}15`, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color, flexShrink:0 }}>{score}</div>
      <span style={{ fontSize:10, fontWeight:700, color }}>{label}</span>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon, trend }) {
  return (
    <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--bg-surface)', border:'1px solid var(--border)', flex:'1 1 160px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)' }}>{label}</span>
        {Icon && <Icon size={14} style={{ color }} />}
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
        <span style={{ fontSize:22, fontWeight:900, color:'var(--text-primary)', letterSpacing:'-0.03em' }}>{value}</span>
        {trend !== undefined && (
          <span style={{ fontSize:11, fontWeight:700, color: trend >= 0 ? '#059669' : '#DC2626', display:'flex', alignItems:'center', gap:2 }}>
            {trend >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {sub && <p style={{ fontSize:11, color:'var(--text-muted)', margin:'3px 0 0' }}>{sub}</p>}
    </div>
  );
}

export default function InvoicesList() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const accent = account?.primary_color || '#2563EB';
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
  const h = { Authorization: `Bearer ${token}` };

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('list');
  const [aiInsights, setAiInsights] = useState([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/invoices?account_id=${account.id}`, { headers: h });
      if (r.ok) {
        const data = await r.json();
        const enriched = data.map(inv => {
          const od = inv.status !== 'paid' && inv.status !== 'void' && inv.due_date && inv.due_date < today;
          return { ...inv, status: od ? 'overdue' : inv.status };
        });
        setInvoices(enriched);
        // Generate AI insights
        const overdue = enriched.filter(i => i.status === 'overdue');
        const insights = [];
        if (overdue.length > 0) {
          const overdueAmt = overdue.reduce((s,i) => s + parseFloat(i.amount_due||0), 0);
          insights.push({ icon:'🚨', priority:'high', title: `${overdue.length} overdue invoice${overdue.length>1?'s':''} need attention`, desc:`${fmt$(overdueAmt)} at risk — send reminders now to recover`, action:'Send All Reminders', color:'#DC2626' });
        }
        const drafts = enriched.filter(i => i.status === 'draft' && daysDiff(i.created_at) > 2);
        if (drafts.length > 0) insights.push({ icon:'📝', priority:'medium', title:`${drafts.length} draft${drafts.length>1?'s':''} unsent for 2+ days`, desc:'Revenue leak: these invoices haven\'t been sent to customers', action:'Review Drafts', color:'#D97706' });
        const viewed = enriched.filter(i => i.status === 'viewed');
        if (viewed.length > 0) insights.push({ icon:'👁️', priority:'low', title:`${viewed.length} invoice${viewed.length>1?'s':''} viewed but unpaid`, desc:'Customer opened but hasn\'t paid — send a follow-up', action:'Follow Up', color:'#2563EB' });
        setAiInsights(insights);
      }
    } catch(e) {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const paid = invoices.filter(i => i.status === 'paid');
  const outstanding = invoices.filter(i => !['paid','void','draft'].includes(i.status));
  const overdue = invoices.filter(i => i.status === 'overdue');
  const totalRevenue = paid.reduce((s,i) => s + parseFloat(i.amount_paid || i.amount_due || 0), 0);
  const totalOutstanding = outstanding.reduce((s,i) => s + parseFloat(i.amount_due || 0), 0);
  const totalOverdue = overdue.reduce((s,i) => s + parseFloat(i.amount_due || 0), 0);
  const collectionRate = invoices.length > 0 ? Math.round(paid.length / invoices.length * 100) : 0;

  const filtered = invoices.filter(inv => {
    const matchFilter = filter === 'all' || inv.status === filter;
    const matchSearch = !search || [inv.number, inv.client_name, inv.client_email].some(f => (f||'').toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const TABS = [
    { id:'list', label:'All Invoices', icon:<BarChart3 size={12}/> },
    { id:'collections', label:'Collections', icon:<Target size={12}/> },
    { id:'forecast', label:'Cash Flow', icon:<TrendingUp size={12}/> },
  ];

  const FILTERS = ['all','draft','generated','viewed','overdue','paid'];

  // Payment profiles per client
  const paymentProfiles = {};
  invoices.forEach(inv => {
    if (!inv.client_name) return;
    if (!paymentProfiles[inv.client_name]) paymentProfiles[inv.client_name] = { paid: 0, late: 0, total: 0, revenue: 0 };
    paymentProfiles[inv.client_name].total++;
    if (inv.status === 'paid') { paymentProfiles[inv.client_name].paid++; paymentProfiles[inv.client_name].revenue += parseFloat(inv.amount_paid||0); }
    if (inv.status === 'overdue') paymentProfiles[inv.client_name].late++;
  });

  const clientClassification = (name) => {
    const p = paymentProfiles[name];
    if (!p || p.total === 0) return { label:'New Client', color:'#6B7280' };
    const rate = p.paid / p.total;
    if (rate >= 0.95) return { label:'Excellent Payer', color:'#059669' };
    if (rate >= 0.8) return { label:'Reliable Payer', color:'#2563EB' };
    if (rate >= 0.6) return { label:'Slow Payer', color:'#D97706' };
    return { label:'High-Risk Account', color:'#DC2626' };
  };

  return (
    <div style={{ padding:'0 0 32px', fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ padding:'20px 28px 22px', background:'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.06, backgroundImage:'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', color:'#C4B5FD', textTransform:'uppercase' }}>💰 REVENUE MANAGEMENT</span>
            <h1 style={{ fontSize:'clamp(18px,3vw,26px)', fontWeight:900, color:'#fff', margin:'4px 0', letterSpacing:'-0.04em' }}>Smart Invoicing</h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>AI-powered accounts receivable · Collections · Cash flow intelligence</p>
            <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
              {[
                { label:'Collected', value:fmt$(totalRevenue), color:'#6EE7B7' },
                { label:'Outstanding', value:fmt$(totalOutstanding), color:'#FCD34D' },
                { label:'Overdue', value:fmt$(totalOverdue), color:'#FCA5A5' },
                { label:'Collection Rate', value:`${collectionRate}%`, color:'#C4B5FD' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding:'5px 12px', borderRadius:10, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}>
                  <span style={{ fontSize:15, fontWeight:800, color }}>{value}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginLeft:5 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {aiInsights.length > 0 && (
              <button onClick={() => setShowAiPanel(p => !p)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
                <Brain size={13}/> AI Insights ({aiInsights.length})
              </button>
            )}
            <button onClick={() => navigate('/invoices/new')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'none', background:'rgba(255,255,255,0.95)', color:'#7C3AED', cursor:'pointer', fontSize:13, fontWeight:800, fontFamily:'inherit' }}>
              <Plus size={14}/> New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      {showAiPanel && aiInsights.length > 0 && (
        <div style={{ margin:'16px 28px 0', padding:16, borderRadius:14, border:'1.5px solid #7C3AED30', background:'#7C3AED06' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Brain size={16} style={{ color:'#7C3AED' }}/>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>AI Collections Assistant</p>
            </div>
            <button onClick={() => setShowAiPanel(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:18, lineHeight:1 }}>✕</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {aiInsights.map((ins, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, border:`1px solid ${ins.color}20`, background:`${ins.color}06` }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{ins.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{ins.title}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)' }}>{ins.desc}</p>
                </div>
                <button style={{ padding:'5px 12px', borderRadius:8, border:'none', background:ins.color, color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  {ins.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding:'0 28px', borderBottom:'1px solid var(--border)', display:'flex', background:'var(--bg-surface)', marginTop: showAiPanel ? 16 : 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:12, fontWeight:activeTab===tab.id?700:500, color:activeTab===tab.id?accent:'var(--text-muted)', borderBottom:`2px solid ${activeTab===tab.id?accent:'transparent'}`, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px 28px' }}>
        {/* Stats row */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
          <StatCard label="Total Revenue" value={fmt$(totalRevenue)} color="#059669" icon={DollarSign}/>
          <StatCard label="Outstanding" value={fmt$(totalOutstanding)} sub={`${outstanding.length} invoices pending`} color="#D97706" icon={AlertTriangle}/>
          <StatCard label="Overdue" value={fmt$(totalOverdue)} sub={overdue.length > 0 ? `${overdue.length} need immediate action` : 'All current ✓'} color={totalOverdue > 0 ? '#DC2626' : '#059669'} icon={totalOverdue > 0 ? AlertTriangle : CheckCircle}/>
          <StatCard label="Collection Rate" value={`${collectionRate}%`} sub="Paid vs total invoiced" color={collectionRate >= 80 ? '#059669' : '#D97706'} icon={Target}/>
        </div>

        {/* ALL INVOICES TAB */}
        {activeTab === 'list' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Search + Filter */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <div style={{ position:'relative', flex:1, minWidth:200 }}>
                <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices, clients…"
                  style={{ width:'100%', padding:'9px 12px 9px 32px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit', outline:'none' }}/>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ padding:'7px 12px', borderRadius:9, border:`1.5px solid ${filter===f ? accent : 'var(--border)'}`, background: filter===f ? `${accent}12` : 'var(--bg-surface)', color: filter===f ? accent : 'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:filter===f?700:500, fontFamily:'inherit', textTransform:'capitalize' }}>
                    {f === 'generated' ? 'Sent' : f === 'all' ? `All (${invoices.length})` : f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${invoices.filter(i=>i.status===f).length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoice table */}
            <div style={{ borderRadius:14, border:'1px solid var(--border)', overflow:'hidden', background:'var(--bg-surface)' }}>
              {loading ? (
                <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding:48, textAlign:'center' }}>
                  <DollarSign size={32} style={{ color:'var(--text-muted)', margin:'0 auto 10px', display:'block', opacity:0.3 }}/>
                  <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', margin:'0 0 4px' }}>No invoices found</p>
                  <button onClick={() => navigate('/invoices/new')} style={{ marginTop:10, padding:'8px 18px', borderRadius:10, border:'none', background:accent, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>Create First Invoice</button>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'var(--bg-raised)', borderBottom:'1px solid var(--border)' }}>
                        {['Invoice', 'Client', 'Amount', 'Due Date', 'Status', 'Health Score', 'Actions'].map(col => (
                          <th key={col} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(inv => {
                        const st = STATUS[inv.status] || STATUS.draft;
                        const cls = clientClassification(inv.client_name);
                        const score = inv.status === 'paid' ? 99 : healthScore(inv, invoices);
                        return (
                          <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} style={{ borderBottom:'0.5px solid var(--border)', cursor:'pointer', transition:'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background='var(--bg-raised)'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'11px 12px', fontWeight:700, color:accent }}>{inv.number || 'Draft'}</td>
                            <td style={{ padding:'11px 12px' }}>
                              <p style={{ margin:0, fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{inv.client_name || '—'}</p>
                              <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:`${cls.color}15`, color:cls.color, fontWeight:600 }}>{cls.label}</span>
                            </td>
                            <td style={{ padding:'11px 12px', fontWeight:800, color:'var(--text-primary)' }}>{fmt$(inv.amount_due)}</td>
                            <td style={{ padding:'11px 12px', color:'var(--text-muted)', fontSize:12 }}>
                              {fmtD(inv.due_date)}
                              {inv.status === 'overdue' && <p style={{ margin:'1px 0 0', fontSize:10, color:'#DC2626', fontWeight:700 }}>{daysDiff(inv.due_date)}d overdue</p>}
                            </td>
                            <td style={{ padding:'11px 12px' }}>
                              <span style={{ padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:700, background:st.bg, color:st.color }}>{st.label}</span>
                            </td>
                            <td style={{ padding:'11px 12px' }}>
                              {inv.status === 'paid' ? (
                                <span style={{ fontSize:11, color:'#059669', fontWeight:700 }}>✓ Paid</span>
                              ) : (
                                <HealthBadge score={score}/>
                              )}
                            </td>
                            <td style={{ padding:'11px 12px' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display:'flex', gap:6 }}>
                                <button onClick={() => navigate(`/invoices/${inv.id}`)}
                                  style={{ padding:'4px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-raised)', color:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'inherit' }}>View</button>
                                {['generated','viewed','overdue'].includes(inv.status) && (
                                  <button style={{ padding:'4px 10px', borderRadius:7, border:'none', background:`${accent}15`, color:accent, cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit' }}>Remind</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COLLECTIONS TAB */}
        {activeTab === 'collections' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ padding:20, borderRadius:14, border:'1.5px solid #DC262630', background:'#DC262606' }}>
              <p style={{ margin:'0 0 14px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#DC2626' }}>🎯 AI Collections Priority List</p>
              {overdue.length === 0 ? (
                <div style={{ textAlign:'center', padding:32 }}>
                  <CheckCircle size={32} style={{ color:'#059669', margin:'0 auto 10px', display:'block' }}/>
                  <p style={{ color:'#059669', fontWeight:700, fontSize:14, margin:0 }}>No overdue invoices — great job!</p>
                </div>
              ) : overdue.sort((a,b) => parseFloat(b.amount_due||0) - parseFloat(a.amount_due||0)).map(inv => {
                const score = healthScore(inv, invoices);
                const cls = clientClassification(inv.client_name);
                const days = inv.due_date ? daysDiff(inv.due_date) : 0;
                return (
                  <div key={inv.id} style={{ display:'flex', gap:14, padding:'14px 16px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-surface)', marginBottom:10, alignItems:'center' }}>
                    <HealthBadge score={score}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{inv.number} — {inv.client_name}</p>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:`${cls.color}15`, color:cls.color, fontWeight:700 }}>{cls.label}</span>
                      </div>
                      <p style={{ margin:0, fontSize:13, color:'#DC2626', fontWeight:700 }}>{fmt$(inv.amount_due)} · {days}d overdue</p>
                      <p style={{ margin:'3px 0 0', fontSize:11, color:'var(--text-muted)' }}>
                        {score >= 70 ? `💡 Reminder email estimated to improve collection by ~30%` : `⚠️ High-risk — consider payment plan or escalation`}
                      </p>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button style={{ padding:'7px 12px', borderRadius:9, border:'none', background:'#DC2626', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit' }}>Send Reminder</button>
                      <button onClick={() => navigate(`/invoices/${inv.id}`)} style={{ padding:'7px 12px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'inherit' }}>View</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Customer Payment Profiles */}
            <div style={{ padding:20, borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-surface)' }}>
              <p style={{ margin:'0 0 14px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>👥 Customer Payment Intelligence</p>
              {Object.entries(paymentProfiles).slice(0,10).map(([name, p]) => {
                const cls = clientClassification(name);
                const rate = p.total > 0 ? Math.round(p.paid / p.total * 100) : 0;
                return (
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'0.5px solid var(--border)' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${cls.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:cls.color, flexShrink:0 }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{name}</p>
                      <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{p.total} invoices · {fmt$(p.revenue)} paid</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:12, fontWeight:700, color:cls.color }}>{cls.label}</span>
                      <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{rate}% pay rate</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CASH FLOW TAB */}
        {activeTab === 'forecast' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* 30/60/90 day forecast */}
            {[
              { label:'Next 7 Days', days:7, color:'#059669' },
              { label:'Next 30 Days', days:30, color:'#2563EB' },
              { label:'Next 90 Days', days:90, color:'#7C3AED' },
            ].map(({ label, days, color }) => {
              const due = outstanding.filter(i => {
                if (!i.due_date) return false;
                const d = new Date(i.due_date);
                const diff = Math.floor((d - Date.now()) / 86400000);
                return diff >= 0 && diff <= days;
              });
              const amt = due.reduce((s,i) => s + parseFloat(i.amount_due||0), 0);
              return (
                <div key={label} style={{ padding:'16px 20px', borderRadius:12, border:`1px solid ${color}30`, background:`${color}06`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                  <div>
                    <p style={{ margin:0, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color }}>{label}</p>
                    <p style={{ margin:'4px 0 0', fontSize:26, fontWeight:900, color:'var(--text-primary)' }}>{fmt$(amt)}</p>
                    <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)' }}>{due.length} invoice{due.length!==1?'s':''} due</p>
                  </div>
                  <div style={{ width:64, height:64, borderRadius:'50%', border:`3px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:22 }}>{days<=7?'📅':days<=30?'📊':'🔮'}</span>
                  </div>
                </div>
              );
            })}
            <div style={{ padding:16, borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-surface)' }}>
              <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>📊 Revenue Leak Detection</p>
              {[
                invoices.filter(i=>i.status==='draft'&&daysDiff(i.created_at)>3).length > 0 && { icon:'📝', text:`${invoices.filter(i=>i.status==='draft'&&daysDiff(i.created_at)>3).length} draft invoices older than 3 days`, amt: invoices.filter(i=>i.status==='draft'&&daysDiff(i.created_at)>3).reduce((s,i)=>s+parseFloat(i.amount_due||0),0) },
                overdue.length > 0 && { icon:'🚨', text:`${overdue.length} overdue invoice${overdue.length>1?'s':''} at risk`, amt: totalOverdue },
              ].filter(Boolean).map((leak, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'0.5px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span>{leak.icon}</span>
                    <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{leak.text}</span>
                  </div>
                  <span style={{ fontSize:14, fontWeight:800, color:'#DC2626' }}>{fmt$(leak.amt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
