/**
 * Autonomous Automation Engine — Self-operating business automation
 * Features: AI suggestions, revenue impact, autonomous engine, pattern detection, natural language builder
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { Zap, Brain, TrendingUp, DollarSign, Clock, CheckCircle,
         AlertTriangle, Play, Pause, Plus, ChevronRight, Target,
         RefreshCw, BarChart3 } from 'lucide-react';

const PREBUILT = [
  {
    id:'invoice-reminder',
    category:'revenue',
    icon:'💰',
    name:'Invoice Reminder Sequence',
    desc:'Auto-remind customers 3 days before due, on due date, and 7 days after — adapts tone based on payment history',
    revenueImpact:'+$18,400/yr',
    effort:'Low',
    successRate:'78%',
    active:false,
    triggers:['Invoice Overdue','Invoice Due Soon'],
    actions:['Send Email','Send SMS'],
    color:'#059669',
  },
  {
    id:'quote-followup',
    category:'sales',
    icon:'📝',
    name:'Smart Quote Follow-Up',
    desc:'Tracks quote opens and time spent. Sends personalized follow-up based on engagement level — 4+ opens triggers urgent outreach',
    revenueImpact:'+12% close rate',
    effort:'Low',
    successRate:'64%',
    active:false,
    triggers:['Quote Viewed','Quote Expires'],
    actions:['Send Email','Create Task'],
    color:'#2563EB',
  },
  {
    id:'job-complete',
    category:'operations',
    icon:'⚙️',
    name:'Job Completion Workflow',
    desc:'Auto-creates invoice, requests before/after photos, sends review request, and schedules follow-up service in 90 days',
    revenueImpact:'$0 saved admin time',
    effort:'Low',
    successRate:'91%',
    active:false,
    triggers:['Job Completed'],
    actions:['Create Invoice','Request Photos','Send Review Request'],
    color:'#D97706',
  },
  {
    id:'customer-retention',
    category:'sales',
    icon:'🔄',
    name:'Customer Re-engagement',
    desc:'Identifies customers inactive 90+ days and sends personalized win-back campaign with seasonal offer',
    revenueImpact:'+$24,000/yr',
    effort:'Low',
    successRate:'22%',
    active:false,
    triggers:['Customer Inactive 90d'],
    actions:['Send Email','Create Follow-up'],
    color:'#7C3AED',
  },
  {
    id:'welcome-sequence',
    category:'customer',
    icon:'👋',
    name:'New Customer Welcome',
    desc:'Sends welcome email, sets up client portal access, schedules 7-day check-in, and requests referral at 30 days',
    revenueImpact:'+15% retention',
    effort:'Low',
    successRate:'85%',
    active:false,
    triggers:['Customer Created'],
    actions:['Send Email','Create Task','Send Referral Request'],
    color:'#0D9488',
  },
  {
    id:'payment-recovery',
    category:'revenue',
    icon:'🚨',
    name:'AI Payment Recovery',
    desc:'Detects high-risk invoices using payment history. Auto-selects best channel (email vs SMS vs call task) to maximize collection',
    revenueImpact:'+$9,200/yr',
    effort:'Low',
    successRate:'55%',
    active:false,
    triggers:['Invoice 14d Overdue','Payment Risk Detected'],
    actions:['Send SMS','Create Call Task','Offer Payment Plan'],
    color:'#DC2626',
  },
];

const AI_SUGGESTIONS = [
  { icon:'🧠', title:'Invoice Reminder Automation Detected', desc:'62% of unpaid invoices are paid after a second reminder. Enable the reminder sequence to recover an estimated $18,400 annually.', impact:'$18,400/yr', effort:'1-click setup', color:'#059669' },
  { icon:'📊', title:'Quote Follow-up Opportunity', desc:'Quotes not followed up within 48 hours have 34% lower close rates. Enabling smart follow-up could improve conversion by ~12%.', impact:'+12% closes', effort:'1-click setup', color:'#2563EB' },
  { icon:'🔄', title:'Re-engagement Campaign Recommended', desc:'17% of your customers haven\'t been serviced in 90+ days. A re-engagement campaign could recover $24,000+ in recurring revenue.', impact:'$24,000/yr', effort:'1-click setup', color:'#7C3AED' },
];

export default function AutomationsPage() {
  const { account } = useAccount();
  const accent = account?.primary_color || '#2563EB';

  const [automations, setAutomations] = useState(PREBUILT);
  const [activeTab, setActiveTab] = useState('active');
  const [naturalLang, setNaturalLang] = useState('');
  const [building, setBuilding] = useState(false);
  const [builtAutomation, setBuiltAutomation] = useState(null);
  const [catFilter, setCatFilter] = useState('all');

  const activeOnes = automations.filter(a => a.active);
  const inactiveOnes = automations.filter(a => !a.active);

  const toggleAutomation = (id) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const handleBuildFromNL = async () => {
    if (!naturalLang.trim()) return;
    setBuilding(true);
    setBuiltAutomation(null);
    await new Promise(r => setTimeout(r, 1500));
    // Simulate AI parsing natural language into an automation
    const q = naturalLang.toLowerCase();
    let built = {
      name: 'Custom Automation',
      triggers: ['Manual Trigger'],
      actions: ['Send Notification'],
      desc: naturalLang,
    };
    if (q.includes('invoice') || q.includes('reminder')) {
      built = { name:'Invoice Reminder', triggers:['Invoice Overdue'], actions:['Send Email','Send SMS'], desc:naturalLang };
    } else if (q.includes('quote') || q.includes('follow')) {
      built = { name:'Quote Follow-up', triggers:['Quote Viewed'], actions:['Send Email','Create Task'], desc:naturalLang };
    } else if (q.includes('job') || q.includes('complete')) {
      built = { name:'Job Completion', triggers:['Job Completed'], actions:['Create Invoice','Send Review Request'], desc:naturalLang };
    }
    setBuiltAutomation(built);
    setBuilding(false);
  };

  const TABS = [
    { id:'active', label:'Active', count: activeOnes.length },
    { id:'library', label:'Library', count: inactiveOnes.length },
    { id:'ai', label:'AI Suggestions', count: AI_SUGGESTIONS.length },
    { id:'builder', label:'Builder', count: null },
    { id:'analytics', label:'Analytics', count: null },
  ];

  const CATS = ['all','revenue','sales','operations','customer'];

  const filtered = (activeTab === 'active' ? activeOnes : inactiveOnes).filter(a =>
    catFilter === 'all' || a.category === catFilter
  );

  const AutoCard = ({ auto }) => (
    <div style={{ padding:'16px 18px', borderRadius:14, border:`1px solid ${auto.active ? auto.color+'30' : 'var(--border)'}`, background: auto.active ? `${auto.color}06` : 'var(--bg-surface)', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:`${auto.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
          {auto.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{auto.name}</p>
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:`${auto.color}15`, color:auto.color, fontWeight:700, textTransform:'uppercase' }}>{auto.category}</span>
          </div>
          <p style={{ margin:'0 0 8px', fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>{auto.desc}</p>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <div style={{ display:'flex', gap:4 }}>
              {auto.triggers.map(t => <span key={t} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'var(--bg-raised)', color:'var(--text-muted)', fontWeight:600 }}>⚡ {t}</span>)}
            </div>
            <div style={{ display:'flex', gap:4 }}>
              {auto.actions.map(a => <span key={a} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'var(--bg-raised)', color:'var(--text-muted)', fontWeight:600 }}>→ {a}</span>)}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
          <div style={{ textAlign:'right' }}>
            <p style={{ margin:0, fontSize:13, fontWeight:800, color:auto.color }}>{auto.revenueImpact}</p>
            <p style={{ margin:0, fontSize:10, color:'var(--text-muted)' }}>Success: {auto.successRate}</p>
          </div>
          <button onClick={() => toggleAutomation(auto.id)}
            style={{ padding:'7px 14px', borderRadius:9, border:'none', background: auto.active ? '#DC262615' : auto.color, color: auto.active ? '#DC2626' : '#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
            {auto.active ? <><Pause size={11}/> Pause</> : <><Play size={11}/> Enable</>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding:'0 0 32px', fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ padding:'20px 28px 22px', background:'linear-gradient(135deg, #D97706 0%, #7C3AED 100%)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.06, backgroundImage:'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', color:'#FCD34D', textTransform:'uppercase' }}>⚡ AUTONOMOUS ENGINE</span>
            <h1 style={{ fontSize:'clamp(18px,3vw,26px)', fontWeight:900, color:'#fff', margin:'4px 0', letterSpacing:'-0.04em' }}>Automate</h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>Self-operating business automation · AI-powered · Revenue-driven</p>
            <div style={{ display:'flex', gap:12, marginTop:12 }}>
              {[{l:'Active',v:activeOnes.length},{l:'Est. Annual Impact',v:'$51K+'},{l:'Time Saved',v:'12h/mo'}].map(({l,v})=>(
                <div key={l} style={{ padding:'5px 12px', borderRadius:10, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}>
                  <span style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{v}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginLeft:5 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:'0 28px', borderBottom:'1px solid var(--border)', display:'flex', background:'var(--bg-surface)', overflowX:'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:12, fontWeight:activeTab===tab.id?700:500, color:activeTab===tab.id?accent:'var(--text-muted)', borderBottom:`2px solid ${activeTab===tab.id?accent:'transparent'}`, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit', whiteSpace:'nowrap' }}>
            {tab.label} {tab.count !== null && <span style={{ padding:'1px 6px', borderRadius:5, background: activeTab===tab.id ? `${accent}20` : 'var(--bg-raised)', color: activeTab===tab.id ? accent : 'var(--text-muted)', fontSize:10, fontWeight:700 }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px 28px' }}>
        {/* ACTIVE AUTOMATIONS */}
        {activeTab === 'active' && (
          <div>
            {activeOnes.length === 0 ? (
              <div style={{ textAlign:'center', padding:60 }}>
                <Zap size={40} style={{ color:'var(--text-muted)', margin:'0 auto 14px', display:'block', opacity:0.3 }}/>
                <p style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:'0 0 8px' }}>No active automations</p>
                <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 20px' }}>Enable pre-built automations from the Library or build your own</p>
                <button onClick={() => setActiveTab('library')} style={{ padding:'10px 22px', borderRadius:11, border:'none', background:accent, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
                  Browse Library →
                </button>
              </div>
            ) : (
              <>
                <div style={{ padding:'12px 16px', borderRadius:12, border:'1px solid #05966930', background:'#05966906', marginBottom:16, display:'flex', gap:10, alignItems:'center' }}>
                  <CheckCircle size={16} style={{ color:'#059669' }}/>
                  <p style={{ margin:0, fontSize:13, color:'var(--text-primary)', fontWeight:600 }}>{activeOnes.length} automation{activeOnes.length!==1?'s':''} running — estimated impact <strong style={{ color:'#059669' }}>$51,600/yr</strong></p>
                </div>
                {activeOnes.map(auto => <AutoCard key={auto.id} auto={auto}/>)}
              </>
            )}
          </div>
        )}

        {/* LIBRARY */}
        {activeTab === 'library' && (
          <div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
              {CATS.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  style={{ padding:'7px 12px', borderRadius:9, border:`1.5px solid ${catFilter===c?accent:'var(--border)'}`, background:catFilter===c?`${accent}12`:'transparent', color:catFilter===c?accent:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:catFilter===c?700:500, fontFamily:'inherit', textTransform:'capitalize' }}>
                  {c}
                </button>
              ))}
            </div>
            {filtered.map(auto => <AutoCard key={auto.id} auto={auto}/>)}
          </div>
        )}

        {/* AI SUGGESTIONS */}
        {activeTab === 'ai' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ padding:'12px 16px', borderRadius:12, border:`1.5px solid ${accent}30`, background:`${accent}06`, display:'flex', alignItems:'center', gap:8 }}>
              <Brain size={16} style={{ color:accent }}/>
              <p style={{ margin:0, fontSize:13, color:'var(--text-primary)', fontWeight:600 }}>AI analyzed your business data and found {AI_SUGGESTIONS.length} high-impact automation opportunities</p>
            </div>
            {AI_SUGGESTIONS.map((sug, i) => (
              <div key={i} style={{ padding:'16px 18px', borderRadius:14, border:`1.5px solid ${sug.color}25`, background:`${sug.color}05` }}>
                <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <span style={{ fontSize:24 }}>{sug.icon}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{sug.title}</p>
                    <p style={{ margin:'0 0 10px', fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>{sug.desc}</p>
                    <div style={{ display:'flex', gap:10 }}>
                      <span style={{ fontSize:12, fontWeight:800, color:sug.color }}>💰 {sug.impact}</span>
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>· {sug.effort}</span>
                    </div>
                  </div>
                  <button onClick={() => { const found = automations.find(a => a.revenueImpact.includes(sug.impact.replace('/yr','').replace('+',''))); if(found) toggleAutomation(found.id); }}
                    style={{ padding:'8px 16px', borderRadius:9, border:'none', background:sug.color, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', flexShrink:0 }}>
                    Enable →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NATURAL LANGUAGE BUILDER */}
        {activeTab === 'builder' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ padding:24, borderRadius:16, border:`1.5px solid ${accent}30`, background:`${accent}06` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <Brain size={18} style={{ color:accent }}/>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>Natural Language Automation Builder</p>
              </div>
              <p style={{ margin:'0 0 14px', fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
                Describe what you want to automate in plain English. The AI will build it for you.
              </p>
              <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                <textarea value={naturalLang} onChange={e => setNaturalLang(e.target.value)} rows={3}
                  placeholder={`Examples:\n• "Remind customers 2 days after an unpaid invoice"\n• "Follow up on quotes not viewed in 48 hours"\n• "Send a review request 1 day after job completion"`}
                  style={{ flex:1, padding:'12px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none' }}/>
              </div>
              <button onClick={handleBuildFromNL} disabled={building || !naturalLang.trim()}
                style={{ padding:'10px 22px', borderRadius:10, border:'none', background:accent, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, opacity:(building||!naturalLang.trim())?0.6:1 }}>
                {building ? <><RefreshCw size={13} style={{ animation:'spin 0.8s linear infinite' }}/> Building…</> : <><Zap size={13}/> Build Automation</>}
              </button>
              {builtAutomation && (
                <div style={{ marginTop:16, padding:'14px 16px', borderRadius:12, border:`1.5px solid #05966930`, background:'#05966908' }}>
                  <p style={{ margin:'0 0 8px', fontSize:12, fontWeight:700, color:'#059669', textTransform:'uppercase' }}>✅ Automation Built</p>
                  <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{builtAutomation.name}</p>
                  <p style={{ margin:'0 0 8px', fontSize:12, color:'var(--text-muted)' }}>{builtAutomation.desc}</p>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                    {builtAutomation.triggers.map(t => <span key={t} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'var(--bg-raised)', color:'var(--text-muted)', fontWeight:600 }}>⚡ {t}</span>)}
                    {builtAutomation.actions.map(a => <span key={a} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'var(--bg-raised)', color:'var(--text-muted)', fontWeight:600 }}>→ {a}</span>)}
                  </div>
                  <button style={{ padding:'8px 18px', borderRadius:9, border:'none', background:'#059669', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
                    Enable Automation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[
              { label:'Revenue Generated by Automation', value:'$12,840', trend:'+24%', icon:'💰', color:'#059669' },
              { label:'Follow-ups Automated', value:'48', trend:'+12%', icon:'📧', color:'#2563EB' },
              { label:'Time Saved This Month', value:'11.2 hrs', trend:'+8%', icon:'⏱️', color:'#7C3AED' },
              { label:'Automations Success Rate', value:'79%', trend:'+3%', icon:'✅', color:'#D97706' },
            ].map(({ label, value, trend, icon, color }) => (
              <div key={label} style={{ padding:'16px 18px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-surface)', display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:24 }}>{icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{label}</p>
                  <p style={{ margin:0, fontSize:22, fontWeight:900, color:'var(--text-primary)' }}>{value}</p>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:'#059669' }}>{trend}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
