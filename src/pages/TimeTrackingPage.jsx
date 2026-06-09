/**
 * TimeTrackingPage — Intelligent Workforce Operating System
 * Tabs: Dashboard, Entries, Leaderboard, Payroll Readiness, AI Intelligence
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from '../context/AccountContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Play, Square, Plus, Trash2, Clock, DollarSign, FileText,
         CheckCircle, X, Users, Brain, TrendingUp, BarChart3,
         AlertTriangle, Activity, Award, Target } from 'lucide-react';

function pad(n) { return String(n).padStart(2,'0'); }
function formatDuration(mins) {
  if (!mins) return '0:00';
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}:${pad(m)}`;
}
function fmt$(n) { return n > 0 ? '$' + parseFloat(n||0).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '$0.00'; }

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6, color }}>
        {Icon && <Icon size={14}/>}
      </div>
      <p style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:0 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'var(--text-muted)', margin:'3px 0 0' }}>{sub}</p>}
    </div>
  );
}

function ScoreRing({ score, size=44, color }) {
  const r=(size-6)/2, circ=2*Math.PI*r;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={4}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={circ-(score/100)*circ} strokeLinecap="round"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size<48?11:13, fontWeight:800, color }}>
        {score}
      </div>
    </div>
  );
}

export default function TimeTrackingPage() {
  const navigate = useNavigate();
  const { account } = useAccount();
  const accent = account?.primary_color || '#2563EB';
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [entries, setEntries]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [workforce, setWorkforce] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNew, setShowNew]   = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerDisplay, setTimerDisplay] = useState('0:00:00');
  const timerRef = useRef(null);
  const [form, setForm] = useState({ project_name:'', description:'', duration_minutes:'', hourly_rate:'', is_billable:true, assigned_to:'' });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertClient, setConvertClient] = useState('');
  const [convertEmail, setConvertEmail] = useState('');
  const [converting, setConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState(null);

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const [e, s, w] = await Promise.all([
        fetch(`/api/time?account_id=${account.id}&limit=100`, { headers: h }).then(r => r.json()),
        fetch(`/api/time/summary?account_id=${account.id}`, { headers: h }).then(r => r.json()),
        fetch(`/api/analytics/workforce-intelligence?account_id=${account.id}`, { headers: h }).then(r => r.json()).catch(() => null),
      ]);
      setEntries(Array.isArray(e) ? e : []);
      setSummary(s);
      setWorkforce(w);
      const running = (Array.isArray(e) ? e : []).find(en => en.timer_running);
      if (running) setActiveTimer(running.id);
    } catch(err) { console.error(err); }
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  // Live timer
  useEffect(() => {
    if (!activeTimer) { clearInterval(timerRef.current); return; }
    const running = entries.find(e => e.id === activeTimer);
    if (!running?.start_time) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(running.start_time)) / 1000);
      setTimerDisplay(`${Math.floor(elapsed/3600)}:${pad(Math.floor(elapsed%3600/60))}:${pad(elapsed%60)}`);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeTimer, entries]);

  const handleStartNew = async () => {
    if (!form.project_name.trim()) return;
    const r = await fetch('/api/time', { method:'POST', headers:h, body:JSON.stringify({ account_id:account.id, ...form, is_billable:form.is_billable?1:0 }) });
    const entry = await r.json();
    const sr = await fetch(`/api/time/${entry.id}/start`, { method:'POST', headers:h });
    const started = await sr.json();
    setActiveTimer(started.id);
    setShowNew(false);
    setForm({ project_name:'', description:'', duration_minutes:'', hourly_rate:'', is_billable:true, assigned_to:'' });
    load();
  };

  const handleLogManual = async () => {
    if (!form.project_name.trim() || !form.duration_minutes) return;
    await fetch('/api/time', { method:'POST', headers:h, body:JSON.stringify({ account_id:account.id, ...form, status:'logged', is_billable:form.is_billable?1:0 }) });
    setShowNew(false);
    setForm({ project_name:'', description:'', duration_minutes:'', hourly_rate:'', is_billable:true, assigned_to:'' });
    load();
  };

  const handleStop = async (id) => {
    await fetch(`/api/time/${id}/stop`, { method:'POST', headers:h });
    setActiveTimer(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this time entry?')) return;
    await fetch(`/api/time/${id}`, { method:'DELETE', headers:h });
    load();
  };

  const handleConvertToInvoice = async () => {
    const ids = billable.map(e => e.id);
    if (!ids.length) return;
    setConverting(true);
    try {
      const r = await fetch('/api/time/convert', { method:'POST', headers:h, body:JSON.stringify({ account_id:account.id, entry_ids:ids, client_name:convertClient, client_email:convertEmail }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setConvertSuccess(d);
      setShowConvertModal(false);
      setConvertClient(''); setConvertEmail('');
      load();
    } catch(e) { alert('Failed: ' + e.message); }
    setConverting(false);
  };

  const billable = entries.filter(e => e.is_billable && !e.is_invoiced);
  const totalUnbilled = billable.reduce((s, e) => s + parseFloat(e.billed_amount || 0), 0);

  const TABS = [
    { id:'dashboard', label:'Dashboard', icon:<BarChart3 size={12}/> },
    { id:'entries', label:'Time Entries', icon:<Clock size={12}/> },
    { id:'leaderboard', label:'Leaderboard', icon:<Award size={12}/> },
    { id:'payroll', label:'Payroll', icon:<DollarSign size={12}/> },
  ];

  return (
    <div style={{ padding:'0 0 32px', fontFamily:"'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ padding:'20px 28px 22px', background:'linear-gradient(135deg, #0D9488 0%, #2563EB 100%)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.06, backgroundImage:'radial-gradient(circle at 25% 50%, #fff 1px, transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            {summary && (
              <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
                {[
                  { label:'Hours', value:`${summary.total_hours}h`, color:'#6EE7B7' },
                  { label:'Billed', value:fmt$(summary.total_billed), color:'#A7F3D0' },
                  { label:'Unbilled', value:fmt$(summary.unbilled_amount), color:'#FCD34D' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding:'5px 12px', borderRadius:10, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize:15, fontWeight:800, color }}>{value}</span>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginLeft:5 }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {activeTimer && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, background:'rgba(220,38,38,0.2)', border:'1.5px solid rgba(220,38,38,0.4)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#F87171', animation:'pulse 1s infinite' }}/>
                <span style={{ fontSize:15, fontWeight:800, color:'#FCA5A5', fontVariantNumeric:'tabular-nums' }}>{timerDisplay}</span>
                <button onClick={() => handleStop(activeTimer)} style={{ padding:'3px 10px', borderRadius:7, background:'#DC2626', border:'none', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                  <Square size={10}/> Stop
                </button>
              </div>
            )}
            <button onClick={() => setShowNew(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'none', background:'rgba(255,255,255,0.95)', color:'#0D9488', cursor:'pointer', fontSize:13, fontWeight:800, fontFamily:'inherit' }}>
              <Plus size={14}/> Log Time
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:'0 28px', borderBottom:'1px solid var(--border)', display:'flex', background:'var(--bg-surface)' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:12, fontWeight:activeTab===tab.id?700:500, color:activeTab===tab.id?accent:'var(--text-muted)', borderBottom:`2px solid ${activeTab===tab.id?accent:'transparent'}`, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px 28px' }}>
        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Summary cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12 }}>
              <StatCard label="Total Hours" value={`${summary?.total_hours || 0}h`} icon={Clock} color={accent}/>
              <StatCard label="Billed" value={fmt$(summary?.total_billed)} icon={CheckCircle} color="#059669"/>
              <StatCard label="Unbilled" value={fmt$(summary?.unbilled_amount)} sub={totalUnbilled > 0 ? 'Ready to invoice' : 'All invoiced'} icon={DollarSign} color={totalUnbilled > 0 ? '#D97706' : '#059669'}/>
              <StatCard label="Entries" value={summary?.total_entries || 0} icon={FileText} color="#7C3AED"/>
            </div>

            {/* AI Workforce Intelligence */}
            {workforce?.employees?.length > 0 && (
              <div style={{ padding:20, borderRadius:14, border:`1.5px solid ${accent}20`, background:`${accent}04` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <Brain size={16} style={{ color:accent }}/>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>Labor Intelligence</p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
                    <p style={{ margin:'0 0 6px', fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>Most Profitable Employee</p>
                    <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{workforce.employees[0]?.name}</p>
                    <p style={{ margin:'2px 0 0', fontSize:12, color:'#059669', fontWeight:700 }}>{fmt$(workforce.employees[0]?.cost)} revenue</p>
                  </div>
                  <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
                    <p style={{ margin:'0 0 6px', fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>Top Project</p>
                    <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{workforce.projects[0]?.name || '—'}</p>
                    <p style={{ margin:'2px 0 0', fontSize:12, color:'#059669', fontWeight:700 }}>{fmt$(workforce.projects[0]?.cost || 0)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Unbilled action */}
            {totalUnbilled > 0 && (
              <div style={{ padding:'14px 18px', borderRadius:12, border:'1px solid #05966930', background:'#05966908', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <p style={{ margin:0, fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{fmt$(totalUnbilled)} ready to invoice</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)' }}>{billable.length} billable {billable.length===1?'entry':'entries'} not yet invoiced</p>
                </div>
                <button onClick={() => setShowConvertModal(true)} style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'#059669', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
                  Convert to Invoice →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ENTRIES TAB ── */}
        {activeTab === 'entries' && (
          <div style={{ borderRadius:14, border:'1px solid var(--border)', overflow:'hidden', background:'var(--bg-surface)' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-raised)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Time Entries</span>
              {totalUnbilled > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:12, color:'#D97706', fontWeight:600 }}>{fmt$(totalUnbilled)} unbilled</span>
                  <button onClick={() => setShowConvertModal(true)} style={{ padding:'5px 12px', borderRadius:8, border:'none', background:'#059669', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit' }}>Convert to Invoice</button>
                </div>
              )}
            </div>
            {loading ? (
              <div style={{ padding:32, textAlign:'center', color:'var(--text-muted)' }}>Loading…</div>
            ) : entries.length === 0 ? (
              <div style={{ padding:48, textAlign:'center' }}>
                <Clock size={32} style={{ color:'var(--text-muted)', margin:'0 auto 10px', display:'block', opacity:0.4 }}/>
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', margin:'0 0 6px' }}>No time entries yet</p>
                <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>Click "Log Time" to start tracking billable hours</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--bg-raised)', borderBottom:'1px solid var(--border)' }}>
                      {['Project','Description','Date','Duration','Rate','Amount','Status',''].map(col => (
                        <th key={col} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id} style={{ borderBottom:'0.5px solid var(--border)' }}>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:accent }}>{e.project_name}</td>
                        <td style={{ padding:'10px 12px', color:'var(--text-muted)', maxWidth:200 }}>{e.description || '—'}</td>
                        <td style={{ padding:'10px 12px', color:'var(--text-muted)', fontSize:11 }}>
                          {e.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—'}
                        </td>
                        <td style={{ padding:'10px 12px', fontWeight:600, color:'var(--text-primary)' }}>
                          {e.timer_running
                            ? <span style={{ color:'#DC2626', display:'flex', alignItems:'center', gap:4 }}><div style={{ width:6, height:6, borderRadius:'50%', background:'#DC2626' }}/>{timerDisplay}</span>
                            : formatDuration(e.duration_minutes) + 'h'}
                        </td>
                        <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>{e.hourly_rate > 0 ? `$${e.hourly_rate}/hr` : '—'}</td>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:parseFloat(e.billed_amount)>0?'#059669':'var(--text-muted)' }}>
                          {parseFloat(e.billed_amount)>0 ? fmt$(e.billed_amount) : '—'}
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, fontWeight:700,
                            background:e.is_invoiced?'#05966920':e.timer_running?'#DC262620':e.is_billable?'#D9770620':'#6B728020',
                            color:e.is_invoiced?'#059669':e.timer_running?'#DC2626':e.is_billable?'#D97706':'#6B7280'
                          }}>{e.is_invoiced?'Invoiced':e.timer_running?'● Running':e.is_billable?'Billable':'Non-billable'}</span>
                        </td>
                        <td style={{ padding:'10px 8px' }}>
                          <button onClick={() => handleDelete(e.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}><Trash2 size={13}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'leaderboard' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <p style={{ margin:0, fontSize:13, color:'var(--text-muted)' }}>Performance rankings based on billable revenue generated per team member.</p>
            {!workforce || workforce.employees?.length === 0 ? (
              <div style={{ textAlign:'center', padding:48 }}>
                <Users size={32} style={{ color:'var(--text-muted)', margin:'0 auto 12px', display:'block', opacity:0.4 }}/>
                <p style={{ color:'var(--text-muted)', fontSize:13 }}>Log time with team member names to see performance rankings.</p>
              </div>
            ) : workforce.employees.map((emp, i) => {
              const medalColors = ['#D97706', '#94A3B8', '#B45309'];
              const classColors = { 'Elite Performer':'#D97706', 'Strong Performer':'#059669', 'Average Performer':accent, 'Needs Attention':'#DC2626' };
              return (
                <div key={emp.name} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderRadius:14, border:`1px solid ${i===0?'#D9770630':'var(--border)'}`, background: i===0?'#D9770606':'var(--bg-surface)' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:i<3?medalColors[i]:accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:i<3?'#fff':'rgba(255,255,255,0.8)', flexShrink:0 }}>
                    {i<3?['🥇','🥈','🥉'][i]:i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{emp.name}</p>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:`${classColors[emp.classification] || accent}15`, color:classColors[emp.classification] || accent, fontWeight:700 }}>{emp.classification}</span>
                    </div>
                    <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>{emp.hours}h worked · {emp.projects} project{emp.projects!==1?'s':''} · {emp.entries} entries</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ margin:0, fontSize:18, fontWeight:900, color:'#059669' }}>{fmt$(emp.cost)}</p>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--text-muted)' }}>revenue generated</p>
                  </div>
                  <ScoreRing score={emp.efficiencyScore} color={classColors[emp.classification] || accent} size={48}/>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAYROLL READINESS TAB ── */}
        {activeTab === 'payroll' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Payroll readiness score */}
            {summary && (
              <div style={{ padding:24, borderRadius:16, border:'1px solid var(--border)', background:'var(--bg-surface)', display:'flex', gap:24, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:48, fontWeight:900, color: totalUnbilled === 0 ? '#059669' : '#D97706' }}>
                    {totalUnbilled === 0 ? '100' : Math.round((1 - totalUnbilled / (summary.total_billed + totalUnbilled)) * 100)}%
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text-muted)' }}>Payroll Ready</div>
                </div>
                <div style={{ flex:1, minWidth:200 }}>
                  <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Payroll Summary</p>
                  {[
                    { label:'Approved Hours', value:`${summary.total_hours}h`, ok:true },
                    { label:'Billed Amount', value:fmt$(summary.total_billed), ok:true },
                    { label:'Unbilled (Pending)', value:fmt$(summary.unbilled_amount), ok:summary.unbilled_amount === 0 },
                    { label:'Total Entries', value:summary.total_entries, ok:true },
                  ].map(({ label, value, ok }) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid var(--border)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {ok ? <CheckCircle size={12} style={{ color:'#059669' }}/> : <AlertTriangle size={12} style={{ color:'#D97706' }}/>}
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Project breakdown */}
            {workforce?.projects?.length > 0 && (
              <div style={{ padding:20, borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-surface)' }}>
                <p style={{ margin:'0 0 14px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>Labor by Project</p>
                {workforce.projects.map(p => (
                  <div key={p.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'0.5px solid var(--border)' }}>
                    <span style={{ fontSize:13, color:'var(--text-primary)' }}>{p.name}</span>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'#059669' }}>{fmt$(p.cost)}</span>
                      <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:8 }}>{p.hours}h</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── New Entry Modal ── */}
      {showNew && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.6)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'var(--bg-surface)', borderRadius:18, width:'100%', maxWidth:480, boxShadow:'0 32px 80px rgba(11,18,32,0.25)', overflow:'hidden', fontFamily:'inherit' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>Log Time</h3>
              <button onClick={() => setShowNew(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>✕</button>
            </div>
            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { k:'project_name', label:'Project / Job *', ph:'HVAC Installation – Johnson', type:'text' },
                { k:'description', label:'Description', ph:'Installed AC unit, tested refrigerant', type:'text' },
                { k:'duration_minutes', label:'Duration (minutes) — leave blank to use live timer', ph:'90', type:'number' },
                { k:'hourly_rate', label:'Hourly Rate ($)', ph:'75.00', type:'number' },
                { k:'assigned_to', label:'Assigned To', ph:'Technician name', type:'text' },
              ].map(({ k, label, ph, type }) => (
                <div key={k}>
                  <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>{label}</label>
                  <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit', outline:'none' }}/>
                </div>
              ))}
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'var(--text-primary)', fontWeight:600 }}>
                <input type="checkbox" checked={form.is_billable} onChange={e => set('is_billable', e.target.checked)} style={{ accentColor:accent, width:16, height:16 }}/>
                Billable time
              </label>
            </div>
            <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ padding:'9px 16px', borderRadius:10, border:'1.5px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' }}>Cancel</button>
              <button onClick={handleLogManual} disabled={!form.project_name || !form.duration_minutes}
                style={{ padding:'9px 16px', borderRadius:10, border:`1.5px solid ${accent}`, background:'transparent', color:accent, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', opacity:(!form.project_name || !form.duration_minutes)?0.5:1 }}>Log Manual</button>
              <button onClick={handleStartNew} disabled={!form.project_name}
                style={{ padding:'9px 18px', borderRadius:10, border:'none', background:accent, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, opacity:!form.project_name?0.5:1 }}>
                <Play size={13}/> Start Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Convert to Invoice Modal ── */}
      {showConvertModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.6)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'var(--bg-surface)', borderRadius:18, width:'100%', maxWidth:440, boxShadow:'0 32px 80px rgba(11,18,32,0.25)', overflow:'hidden', fontFamily:'inherit' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>Convert to Invoice</h3>
              <button onClick={() => setShowConvertModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>✕</button>
            </div>
            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ padding:'10px 14px', borderRadius:10, background:'#05966910', border:'1px solid #05966930', fontSize:12, color:'#059669', fontWeight:600 }}>
                {billable.length} billable {billable.length===1?'entry':'entries'} · Total: {fmt$(totalUnbilled)}
              </div>
              {[
                { k:'convertClient', label:'Client Name', ph:'Jane Smith', val:convertClient, fn:setConvertClient },
                { k:'convertEmail', label:'Client Email (optional)', ph:'jane@company.com', val:convertEmail, fn:setConvertEmail },
              ].map(({ k, label, ph, val, fn }) => (
                <div key={k}>
                  <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>{label}</label>
                  <input value={val} onChange={e => fn(e.target.value)} placeholder={ph} type={k==='convertEmail'?'email':'text'}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit', outline:'none' }}/>
                </div>
              ))}
            </div>
            <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowConvertModal(false)} style={{ padding:'9px 16px', borderRadius:10, border:'1.5px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' }}>Cancel</button>
              <button onClick={handleConvertToInvoice} disabled={converting}
                style={{ padding:'9px 20px', borderRadius:10, border:'none', background:'#059669', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', opacity:converting?0.6:1 }}>
                {converting ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {convertSuccess && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:1000, display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderRadius:12, background:'#059669', color:'#fff', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>
          ✅ Invoice {convertSuccess.number} created!
          <button onClick={() => navigate(`/invoices/${convertSuccess.invoice_id}`)} style={{ padding:'4px 10px', borderRadius:7, background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>View →</button>
          <button onClick={() => setConvertSuccess(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:16, padding:0 }}>✕</button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
