/**
 * CalendarPage — Master Schedule & Business Command Center
 * Views: Day, Week, Month, Timeline, Team
 * AI: Operations summary, conflict detection, gap filling, revenue forecasting
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount } from '../context/AccountContext';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Grid, List, Clock,
  Users, BarChart3, AlertTriangle, CheckCircle, Zap, Target,
  DollarSign, MapPin, Phone, Mail, X, Trash2, Edit2, RefreshCw,
  Activity, Brain, TrendingUp, Flag, Bell, MoreVertical, Check
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const EVENT_TYPES = ['Job','Estimate','Installation','Service Call','Follow-Up','Meeting','Invoice Due','Maintenance','Other'];
const PRIORITIES  = ['low','normal','high','urgent'];
const COLORS = ['#2563EB','#0D9488','#7C3AED','#D97706','#DC2626','#059669','#6B7280','#DB2777'];
const PRIORITY_COLOR = { low:'#6B7280', normal:'#2563EB', high:'#D97706', urgent:'#DC2626' };

function pad(n) { return String(n).padStart(2,'0'); }
function fmtTime(t) { if (!t) return ''; const [h,m]=t.split(':'); const hr=+h; return `${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`; }
function fmtDate(d) { return `${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}`; }
function isSameDay(a,b) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function todayStr() { const t=new Date(); return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`; }
function fmt$(n) { return n > 0 ? '$' + parseFloat(n).toLocaleString('en-US',{minimumFractionDigits:0}) : '—'; }

// ─── Event Chip (used in month/week cells) ───────────────────────
function EventChip({ ev, onClick, compact = false }) {
  const color = ev.color || '#2563EB';
  const confirmed = ev.job_confirmed;
  return (
    <div onClick={e => { e.stopPropagation(); onClick(ev); }}
      style={{
        padding: compact ? '2px 6px' : '4px 8px', borderRadius: 6,
        background: color + '20', border: `1.5px solid ${confirmed ? color : color + '60'}`,
        borderLeft: `3px solid ${color}`,
        cursor: 'pointer', fontSize: compact ? 10 : 11, fontWeight: 600,
        color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        opacity: ev.status === 'cancelled' ? 0.5 : 1,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
      {!confirmed && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D97706', flexShrink: 0 }} title="Unconfirmed" />}
      {ev.time && <span style={{ color, fontSize: 9, fontWeight: 700 }}>{fmtTime(ev.time).replace(' ','')}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
      {ev.estimated_revenue > 0 && <span style={{ color, fontSize: 9, fontWeight: 800, marginLeft: 'auto', flexShrink: 0 }}>{fmt$(ev.estimated_revenue)}</span>}
    </div>
  );
}

// ─── AI Command Center Bar ────────────────────────────────────────
function CommandCenter({ summary, onAction, accent }) {
  if (!summary) return null;
  const { today: t, recommendations, conflicts, gaps } = summary;
  const riskColor = t.risk_score >= 60 ? '#DC2626' : t.risk_score >= 30 ? '#D97706' : '#059669';

  return (
    <div style={{ margin: '0 0 16px', borderRadius: 14, border: `1px solid ${riskColor}30`, background: `${riskColor}06`, overflow: 'hidden' }}>
      {/* Summary row */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Brain size={14} style={{ color: accent }} />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>AI Ops Today</span>
        </div>
        {[
          { label: 'Scheduled', value: t.total_events, icon: <Calendar size={12} />, color: accent },
          { label: 'Revenue', value: fmt$(t.projected_revenue), icon: <DollarSign size={12} />, color: '#059669' },
          { label: 'Conflicts', value: conflicts.length, icon: <AlertTriangle size={12} />, color: conflicts.length > 0 ? '#DC2626' : '#6B7280' },
          { label: 'Gaps', value: gaps.length, icon: <Clock size={12} />, color: gaps.length > 0 ? '#D97706' : '#6B7280' },
          { label: 'Unconfirmed', value: t.unconfirmed, icon: <Bell size={12} />, color: t.unconfirmed > 0 ? '#D97706' : '#6B7280' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}20` }}>
            <span style={{ color }}>{icon}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color }}>{value}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
        {/* Risk badge */}
        <div style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 8, background: `${riskColor}15`, border: `1px solid ${riskColor}30`, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Activity size={11} style={{ color: riskColor }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: riskColor }}>{t.risk_label || 'On Track'}</span>
        </div>
      </div>
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recommendations.slice(0, 3).map((rec, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {rec.type === 'conflict' ? '⚠️' : rec.type === 'gap' ? '📅' : rec.type === 'invoice' ? '💰' : '✅'}
              </span>
              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Google Calendar Sync Button ──────────────────────────────────
function GoogleCalendarSync({ accountId }) {
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!accountId) return;
    fetch(`/api/google-calendar/status?account_id=${accountId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setStatus(d)).catch(() => {});
  }, [accountId]);

  const handleConnect = async () => {
    const r = await fetch(`/api/google-calendar/auth-url?account_id=${accountId}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (d.url) window.open(d.url, '_blank', 'width=500,height=600');
  };

  const handleSync = async () => {
    setSyncing(true);
    const r = await fetch('/api/google-calendar/sync', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ account_id: accountId }) });
    const d = await r.json();
    setSyncing(false);
    if (!d.ok) alert(d.error || 'Sync failed');
  };

  return status?.connected ? (
    <button onClick={handleSync} disabled={syncing} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'1px solid #0D9488', background:'rgba(13,148,136,0.08)', color:'#0D9488', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
      <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
      {syncing ? 'Syncing…' : 'Sync Google'}
    </button>
  ) : (
    <button onClick={handleConnect} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--text-muted)', fontFamily:'inherit' }}>
      <svg width="12" height="12" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      Connect Google
    </button>
  );
}

// ─── Event Detail/Edit Modal ──────────────────────────────────────
function EventModal({ event, onClose, onSave, onDelete, defaultDate, accent }) {
  const today = defaultDate || new Date();
  const [form, setForm] = useState(event ? {
    title: event.title||'', date: event.date||todayStr(), time: event.time||'', end_time: event.end_time||'',
    type: event.type||'Job', color: event.color||COLORS[0], notes: event.notes||'', assigned_to: event.assigned_to||'',
    tags: event.tags||'', client_name: event.client_name||'', client_email: event.client_email||'',
    client_phone: event.client_phone||'', location: event.location||'', status: event.status||'scheduled',
    estimated_revenue: event.estimated_revenue||'', priority: event.priority||'normal',
    equipment_needed: event.equipment_needed||'', job_confirmed: event.job_confirmed||0,
    deposit_amount: event.deposit_amount||'', deposit_paid: event.deposit_paid||0,
  } : {
    title:'', date:`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`,
    time:'', end_time:'', type:'Job', color:COLORS[0], notes:'', assigned_to:'', tags:'',
    client_name:'', client_email:'', client_phone:'', location:'', status:'scheduled',
    estimated_revenue:'', priority:'normal', equipment_needed:'', job_confirmed:0,
    deposit_amount:'', deposit_paid:0,
  });
  const set = (k, v) => setForm(f=>({...f,[k]:v}));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.6)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div style={{ background:'var(--bg-surface)', borderRadius:18, width:'100%', maxWidth:560, maxHeight:'92vh', overflow:'auto', boxShadow:'0 32px 80px rgba(11,18,32,0.25)', fontFamily:"'Plus Jakarta Sans',sans-serif" }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'var(--bg-surface)', zIndex:1 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>{event?.id ? 'Edit Event' : '+ New Event'}</h3>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {event?.id && (
              <button onClick={()=>set('job_confirmed', form.job_confirmed ? 0 : 1)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:`1px solid ${form.job_confirmed ? '#059669' : 'var(--border)'}`, background: form.job_confirmed ? '#05966910' : 'transparent', color: form.job_confirmed ? '#059669' : 'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit' }}>
                <Check size={11} /> {form.job_confirmed ? 'Confirmed' : 'Confirm Job'}
              </button>
            )}
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}><X size={18}/></button>
          </div>
        </div>

        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          {/* Title + Priority */}
          <div style={{ display:'flex', gap:10 }}>
            <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Event title *"
              style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:15, fontWeight:600, fontFamily:'inherit', outline:'none' }}/>
            <select value={form.priority} onChange={e=>set('priority',e.target.value)}
              style={{ padding:'10px 12px', borderRadius:10, border:`1.5px solid ${PRIORITY_COLOR[form.priority]}40`, background:`${PRIORITY_COLOR[form.priority]}10`, color:PRIORITY_COLOR[form.priority], fontSize:12, fontWeight:700, fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
              {PRIORITIES.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>

          {/* Date / Time / Type */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              { label:'DATE *', k:'date', type:'date' },
              { label:'START TIME', k:'time', type:'time' },
              { label:'END TIME', k:'end_time', type:'time' },
            ].map(({label,k,type})=>(
              <div key={k}>
                <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:4 }}>{label}</label>
                <input type={type} value={form[k]} onChange={e=>set(k,e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit' }}/>
              </div>
            ))}
          </div>

          {/* Type + Status */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:4 }}>TYPE</label>
              <select value={form.type} onChange={e=>set('type',e.target.value)}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit' }}>
                {EVENT_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:4 }}>STATUS</label>
              <select value={form.status} onChange={e=>set('status',e.target.value)}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit' }}>
                {['scheduled','in_progress','completed','cancelled'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Financial */}
          <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(5,150,105,0.05)', border:'1px solid rgba(5,150,105,0.2)' }}>
            <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'#059669', textTransform:'uppercase', letterSpacing:'0.06em' }}>💰 Financial</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:3 }}>Estimated Revenue</label>
                <input type="number" value={form.estimated_revenue} onChange={e=>set('estimated_revenue',e.target.value)} placeholder="0.00"
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit' }}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:3 }}>Deposit Amount</label>
                <input type="number" value={form.deposit_amount} onChange={e=>set('deposit_amount',e.target.value)} placeholder="0.00"
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit' }}/>
              </div>
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, cursor:'pointer', fontSize:12, color:'var(--text-muted)' }}>
              <input type="checkbox" checked={!!form.deposit_paid} onChange={e=>set('deposit_paid',e.target.checked?1:0)} style={{ accentColor:'#059669' }}/>
              Deposit received
            </label>
          </div>

          {/* Client Info */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'Client Name', k:'client_name', ph:'Jane Smith' },
              { label:'Client Email', k:'client_email', ph:'jane@company.com' },
              { label:'Client Phone', k:'client_phone', ph:'(256) 555-0100' },
              { label:'Location / Address', k:'location', ph:'123 Main St, Birmingham AL' },
              { label:'Assigned To', k:'assigned_to', ph:'Technician name or email' },
              { label:'Equipment Needed', k:'equipment_needed', ph:'Tools, materials…' },
            ].map(({label,k,ph})=>(
              <div key={k}>
                <label style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
                <input value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit' }}/>
              </div>
            ))}
          </div>

          {/* Color */}
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>COLOR TAG</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {COLORS.map(c=><button key={c} onClick={()=>set('color',c)} style={{ width:24, height:24, borderRadius:'50%', background:c, border:form.color===c?'3px solid var(--text-primary)':'2px solid transparent', cursor:'pointer' }}/>)}
            </div>
          </div>

          {/* Tags + Notes */}
          <input value={form.tags} onChange={e=>set('tags',e.target.value)} placeholder="Tags (comma-separated: roofing, urgent, follow-up)"
            style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit' }}/>
          <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Job notes, special instructions…" rows={3}
            style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, resize:'vertical', fontFamily:'inherit' }}/>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', bottom:0, background:'var(--bg-surface)' }}>
          {event?.id && <button onClick={()=>onDelete(event.id)} style={{ padding:'9px 16px', borderRadius:10, border:'1px solid #DC2626', background:'rgba(220,38,38,0.06)', color:'#DC2626', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' }}>Delete</button>}
          <div style={{ display:'flex', gap:10, marginLeft:'auto' }}>
            <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-primary)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' }}>Cancel</button>
            <button onClick={()=>{ if(!form.title.trim()||!form.date) return; onSave(form); }}
              style={{ padding:'9px 20px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#0D9488)`, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
              {event?.id ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DAY VIEW ────────────────────────────────────────────────────
function DayView({ events, date, accent, onEventClick, onSlotClick }) {
  const hours = Array.from({length:14}, (_,i)=>i+7); // 7am-8pm
  const dayKey = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  const dayEvs = events.filter(e => e.date === dayKey);

  return (
    <div style={{ overflow:'auto', maxHeight:'calc(100vh - 280px)' }}>
      {hours.map(h => {
        const timeStr = `${pad(h)}:00`;
        const slotEvs = dayEvs.filter(e => e.time && e.time.startsWith(pad(h)));
        return (
          <div key={h} style={{ display:'flex', borderBottom:'0.5px solid var(--border)', minHeight:56 }}
            onClick={() => onSlotClick(date, `${pad(h)}:00`)}>
            <div style={{ width:56, flexShrink:0, fontSize:10, fontWeight:600, color:'var(--text-muted)', padding:'8px 8px 0', textAlign:'right' }}>
              {h % 12 || 12}{h < 12 ? 'am' : 'pm'}
            </div>
            <div style={{ flex:1, padding:'4px 8px', display:'flex', flexDirection:'column', gap:3 }}>
              {slotEvs.map(ev => <EventChip key={ev.id} ev={ev} onClick={onEventClick} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WEEK VIEW ───────────────────────────────────────────────────
function WeekView({ events, weekDays, accent, onEventClick, onSlotClick, today }) {
  const hours = Array.from({length:14}, (_,i)=>i+7);
  return (
    <div style={{ overflow:'auto', maxHeight:'calc(100vh - 280px)' }}>
      {/* Header */}
      <div style={{ display:'grid', gridTemplateColumns:'56px repeat(7, 1fr)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--bg-surface)', zIndex:1 }}>
        <div/>
        {weekDays.map(d => {
          const isToday = isSameDay(d, today);
          return (
            <div key={d.toISOString()} style={{ padding:'8px 4px', textAlign:'center', background: isToday ? `${accent}10` : 'transparent' }}>
              <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)' }}>{DAYS[d.getDay()]}</div>
              <div style={{ fontSize:16, fontWeight: isToday ? 800 : 600, color: isToday ? accent : 'var(--text-primary)', width:28, height:28, borderRadius:'50%', background: isToday ? accent : 'transparent', color: isToday ? '#fff' : 'var(--text-primary)', display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0' }}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      {hours.map(h => (
        <div key={h} style={{ display:'grid', gridTemplateColumns:'56px repeat(7, 1fr)', borderBottom:'0.5px solid var(--border)', minHeight:52 }}>
          <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', padding:'8px 6px 0', textAlign:'right', flexShrink:0 }}>
            {h % 12 || 12}{h < 12 ? 'am' : 'pm'}
          </div>
          {weekDays.map(d => {
            const dayKey = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
            const slotEvs = events.filter(e => e.date === dayKey && e.time?.startsWith(pad(h)));
            const isToday = isSameDay(d, today);
            return (
              <div key={d.toISOString()}
                style={{ padding:'2px 3px', borderLeft:'0.5px solid var(--border)', background: isToday ? `${accent}04` : 'transparent', cursor:'pointer' }}
                onClick={() => onSlotClick(d, `${pad(h)}:00`)}>
                {slotEvs.map(ev => <EventChip key={ev.id} ev={ev} onClick={onEventClick} compact />)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── MONTH VIEW ──────────────────────────────────────────────────
function MonthView({ events, calendarDays, month, year, accent, today, onEventClick, onSlotClick }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:0, borderBottom:'1px solid var(--border)', marginBottom:4 }}>
        {DAYS.map(d => <div key={d} style={{ padding:'8px 0', textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
        {calendarDays.map((d, i) => {
          if (!d) return <div key={`e${i}`} style={{ minHeight:90, background:'var(--bg-raised)', opacity:0.3, borderRadius:6 }}/>;
          const dayKey = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
          const dayEvs = events.filter(e => e.date === dayKey);
          const isToday = isSameDay(d, today);
          const isOtherMonth = d.getMonth() !== month;
          const dayRevenue = dayEvs.reduce((s,e)=>s+parseFloat(e.estimated_revenue||0),0);
          return (
            <div key={dayKey} onClick={() => onSlotClick(d, null)}
              style={{ minHeight:90, padding:6, borderRadius:8, background: isToday ? `${accent}08` : 'var(--bg-surface)', border:`1px solid ${isToday ? accent : 'var(--border)'}40`, opacity: isOtherMonth ? 0.4 : 1, cursor:'pointer', overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:13, fontWeight: isToday ? 800 : 600, color: isToday ? '#fff' : 'var(--text-primary)', width:22, height:22, borderRadius:'50%', background: isToday ? accent : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {d.getDate()}
                </span>
                {dayRevenue > 0 && <span style={{ fontSize:9, fontWeight:700, color:'#059669' }}>{fmt$(dayRevenue)}</span>}
              </div>
              {dayEvs.slice(0,3).map(ev => <EventChip key={ev.id} ev={ev} onClick={onEventClick} compact />)}
              {dayEvs.length > 3 && <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>+{dayEvs.length-3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TIMELINE VIEW ───────────────────────────────────────────────
function TimelineView({ events, accent, onEventClick }) {
  const sorted = [...events].sort((a,b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''));
  const grouped = {};
  sorted.forEach(e => { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e); });

  return (
    <div style={{ overflow:'auto', maxHeight:'calc(100vh - 280px)' }}>
      {Object.entries(grouped).map(([date, evs]) => {
        const d = new Date(date + 'T12:00:00');
        const dayRevenue = evs.reduce((s,e)=>s+parseFloat(e.estimated_revenue||0),0);
        return (
          <div key={date} style={{ marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:`2px solid ${accent}20`, marginBottom:8 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${accent}15`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:9, fontWeight:700, color:accent, lineHeight:1 }}>{MONTHS[d.getMonth()].slice(0,3).toUpperCase()}</span>
                <span style={{ fontSize:18, fontWeight:900, color:accent, lineHeight:1 }}>{d.getDate()}</span>
              </div>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}</p>
                <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{evs.length} events{dayRevenue > 0 ? ` · ${fmt$(dayRevenue)} projected` : ''}</p>
              </div>
            </div>
            {evs.map(ev => (
              <div key={ev.id} onClick={() => onEventClick(ev)}
                style={{ display:'flex', gap:12, padding:'10px 12px', borderRadius:10, border:`1px solid ${(ev.color||accent)}20`, background:(ev.color||accent)+'08', marginBottom:6, cursor:'pointer', transition:'all 0.1s' }}
                onMouseEnter={e=>e.currentTarget.style.background=(ev.color||accent)+'14'}
                onMouseLeave={e=>e.currentTarget.style.background=(ev.color||accent)+'08'}>
                <div style={{ width:3, borderRadius:2, background:ev.color||accent, alignSelf:'stretch', flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{ev.title}</span>
                    {!ev.job_confirmed && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:6, background:'#D9770615', color:'#D97706', border:'1px solid #D9770630', fontWeight:600 }}>Unconfirmed</span>}
                    <span style={{ fontSize:10, padding:'1px 6px', borderRadius:6, background:`${PRIORITY_COLOR[ev.priority||'normal']}15`, color:PRIORITY_COLOR[ev.priority||'normal'], border:`1px solid ${PRIORITY_COLOR[ev.priority||'normal']}30`, fontWeight:600, marginLeft:'auto' }}>
                      {ev.priority||'normal'}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text-muted)', flexWrap:'wrap' }}>
                    {ev.time && <span><Clock size={10}/> {fmtTime(ev.time)}{ev.end_time ? ` – ${fmtTime(ev.end_time)}` : ''}</span>}
                    {ev.client_name && <span>👤 {ev.client_name}</span>}
                    {ev.assigned_to && <span>🔧 {ev.assigned_to}</span>}
                    {ev.location && <span>📍 {ev.location.slice(0,30)}</span>}
                    {ev.estimated_revenue > 0 && <span style={{ color:'#059669', fontWeight:700 }}>{fmt$(ev.estimated_revenue)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      {Object.keys(grouped).length === 0 && (
        <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
          <Calendar size={32} style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }}/>
          <p style={{ fontSize:14, fontWeight:600 }}>No events in this period</p>
        </div>
      )}
    </div>
  );
}

// ─── TEAM VIEW ───────────────────────────────────────────────────
function TeamView({ events, accent, onEventClick }) {
  const assignees = {};
  events.forEach(e => {
    const key = e.assigned_to || 'Unassigned';
    if (!assignees[key]) assignees[key] = { events: [], revenue: 0 };
    assignees[key].events.push(e);
    assignees[key].revenue += parseFloat(e.estimated_revenue || 0);
  });

  return (
    <div style={{ overflow:'auto', maxHeight:'calc(100vh - 280px)', display:'flex', flexDirection:'column', gap:16 }}>
      {Object.entries(assignees).map(([name, data]) => (
        <div key={name} style={{ borderRadius:12, border:'1px solid var(--border)', overflow:'hidden', background:'var(--bg-surface)' }}>
          <div style={{ padding:'12px 16px', background:'var(--bg-raised)', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:`${accent}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:accent }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{name}</p>
                <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{data.events.length} events this period</p>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ margin:0, fontSize:15, fontWeight:800, color:'#059669' }}>{fmt$(data.revenue)}</p>
              <p style={{ margin:0, fontSize:10, color:'var(--text-muted)' }}>projected revenue</p>
            </div>
          </div>
          <div style={{ padding:'10px 16px', display:'flex', flexDirection:'column', gap:6 }}>
            {data.events.sort((a,b)=>a.date.localeCompare(b.date)).map(ev => (
              <div key={ev.id} onClick={() => onEventClick(ev)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, border:`1px solid ${(ev.color||accent)}20`, cursor:'pointer', background:(ev.color||accent)+'06' }}>
                <div style={{ width:3, height:32, borderRadius:2, background:ev.color||accent, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{ev.title}</p>
                  <p style={{ margin:0, fontSize:10, color:'var(--text-muted)' }}>{ev.date} {ev.time ? `· ${fmtTime(ev.time)}` : ''} {ev.client_name ? `· ${ev.client_name}` : ''}</p>
                </div>
                {ev.estimated_revenue > 0 && <span style={{ fontSize:12, fontWeight:700, color:'#059669' }}>{fmt$(ev.estimated_revenue)}</span>}
                <span style={{ fontSize:10, padding:'2px 6px', borderRadius:5, background:`${PRIORITY_COLOR[ev.priority||'normal']}15`, color:PRIORITY_COLOR[ev.priority||'normal'], border:`1px solid ${PRIORITY_COLOR[ev.priority||'normal']}30`, fontWeight:600 }}>
                  {ev.priority||'normal'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(assignees).length === 0 && (
        <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
          <Users size={32} style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }}/>
          <p>No team assignments yet. Assign events to team members to see the team view.</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function CalendarPage() {
  const { account } = useAccount();
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
  const accent = account?.primary_color || '#2563EB';
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [events, setEvents]       = useState([]);
  const [view, setView]           = useState('week');
  const [today]                   = useState(new Date());
  const [current, setCurrent]     = useState(new Date());
  const [modal, setModal]         = useState(null);
  const [filter, setFilter]       = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading]     = useState(true);
  const [summary, setSummary]     = useState(null);
  const [showSummary, setShowSummary] = useState(true);

  const year  = current.getFullYear();
  const month = current.getMonth();

  // Load events for current period
  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      let url;
      if (view === 'month') {
        url = `/api/calendar?account_id=${account.id}&year=${year}&month=${month+1}`;
      } else if (view === 'week' || view === 'day' || view === 'team') {
        const start = new Date(current);
        start.setDate(start.getDate() - (view === 'week' ? start.getDay() : 0) - (view === 'day' ? 0 : 0));
        const end = new Date(start);
        end.setDate(end.getDate() + (view === 'week' || view === 'team' ? 7 : 0));
        url = `/api/calendar/events?account_id=${account.id}&start=${start.toISOString()}&end=${end.toISOString()}`;
      } else {
        // Timeline: next 30 days
        const start = new Date();
        const end = new Date(Date.now() + 30 * 86400000);
        url = `/api/calendar/events?account_id=${account.id}&start=${start.toISOString()}&end=${end.toISOString()}`;
      }
      const r = await fetch(url, { headers: h });
      if (r.ok) setEvents(await r.json());
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [account?.id, view, year, month, current]);

  useEffect(() => { load(); }, [load]);

  // Load AI summary
  useEffect(() => {
    if (!account?.id) return;
    const dateStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
    fetch(`/api/calendar/ai-summary?account_id=${account.id}&date=${dateStr}`, { headers: h })
      .then(r => r.ok ? r.json() : null).then(d => setSummary(d)).catch(() => {});
  }, [account?.id]);

  // Navigation
  const navigate = (dir) => {
    setCurrent(d => {
      const n = new Date(d);
      if (view === 'day') n.setDate(n.getDate() + dir);
      else if (view === 'week' || view === 'team') n.setDate(n.getDate() + dir * 7);
      else n.setMonth(n.getMonth() + dir);
      return n;
    });
  };

  // Week days
  const weekStart = new Date(current);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = Array.from({length:7}, (_,i) => { const d = new Date(weekStart); d.setDate(d.getDate()+i); return d; });

  // Month grid
  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month+1, 0);
    const days = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let i = 1; i <= last.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [year, month]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let evs = events;
    if (filter) { const s = filter.toLowerCase(); evs = evs.filter(e => e.title?.toLowerCase().includes(s) || e.client_name?.toLowerCase().includes(s)); }
    if (typeFilter) evs = evs.filter(e => e.type === typeFilter);
    return evs;
  }, [events, filter, typeFilter]);

  const handleEventClick = (ev) => setModal({ event: ev, defaultDate: null });
  const handleSlotClick  = (date, time) => setModal({ event: null, defaultDate: date, defaultTime: time });

  const handleSave = async (form) => {
    try {
      const body = { ...form, account_id: account.id };
      if (modal.event?.id) {
        await fetch(`/api/calendar/${modal.event.id}`, { method:'PATCH', headers:h, body:JSON.stringify(body) });
      } else {
        await fetch('/api/calendar', { method:'POST', headers:h, body:JSON.stringify(body) });
      }
      setModal(null);
      load();
    } catch(e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/calendar/${id}`, { method:'DELETE', headers:h });
    setModal(null);
    load();
  };

  // View title
  const viewTitle = view === 'day' ? fmtDate(current)
    : view === 'week' || view === 'team' ? `${fmtDate(weekDays[0])} – ${fmtDate(weekDays[6])}`
    : view === 'timeline' ? 'Next 30 Days'
    : `${MONTHS[month]} ${year}`;

  const VIEWS = [
    { k:'day', label:'Day', icon:<Clock size={12}/> },
    { k:'week', label:'Week', icon:<Calendar size={12}/> },
    { k:'month', label:'Month', icon:<Grid size={12}/> },
    { k:'timeline', label:'Timeline', icon:<List size={12}/> },
    { k:'team', label:'Team', icon:<Users size={12}/> },
  ];

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', fontFamily:"'Plus Jakarta Sans',sans-serif", padding:'0 24px 24px' }}>
      {/* ── Header ── */}
      <div style={{ padding:'20px 0 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', margin:0, letterSpacing:'-0.03em' }}>Schedule</h1>
          <p style={{ fontSize:12, color:'var(--text-muted)', margin:'4px 0 0' }}>Master Operations Calendar · {account?.name}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <GoogleCalendarSync accountId={account?.id} />
          <button onClick={() => setModal({ event:null, defaultDate:today })}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'none', background:accent, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', boxShadow:`0 4px 14px ${accent}40` }}>
            <Plus size={15}/> New Event
          </button>
        </div>
      </div>

      {/* ── AI Command Center ── */}
      {showSummary && summary && <CommandCenter summary={summary} accent={accent} />}

      {/* ── Controls ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        {/* Navigation */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={()=>navigate(-1)} style={{ width:32, height:32, borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-primary)' }}><ChevronLeft size={16}/></button>
          <button onClick={()=>setCurrent(new Date())} style={{ padding:'5px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--text-muted)', fontFamily:'inherit' }}>Today</button>
          <button onClick={()=>navigate(1)} style={{ width:32, height:32, borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-primary)' }}><ChevronRight size={16}/></button>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', minWidth:180 }}>{viewTitle}</span>
        </div>

        {/* View switcher */}
        <div style={{ display:'flex', borderRadius:10, border:'1px solid var(--border)', overflow:'hidden', background:'var(--bg-raised)' }}>
          {VIEWS.map(({ k, label, icon }) => (
            <button key={k} onClick={() => setView(k)}
              style={{ padding:'6px 12px', border:'none', background: view===k ? accent : 'transparent', color: view===k ? '#fff' : 'var(--text-muted)', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit', transition:'all 0.15s' }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search events…"
          style={{ padding:'6px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:12, width:160, fontFamily:'inherit', outline:'none' }}/>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          style={{ padding:'6px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit' }}>
          <option value="">All Types</option>
          {EVENT_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>

        <button onClick={() => setShowSummary(s=>!s)}
          style={{ padding:'6px 10px', borderRadius:9, border:`1px solid ${accent}30`, background: showSummary ? `${accent}10` : 'transparent', color: showSummary ? accent : 'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
          <Brain size={12}/> {showSummary ? 'Hide' : 'Show'} AI
        </button>
      </div>

      {/* ── Calendar View ── */}
      <div style={{ flex:1, overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${accent}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
          </div>
        ) : view === 'day' ? (
          <DayView events={filteredEvents} date={current} accent={accent} onEventClick={handleEventClick} onSlotClick={handleSlotClick}/>
        ) : view === 'week' ? (
          <WeekView events={filteredEvents} weekDays={weekDays} accent={accent} today={today} onEventClick={handleEventClick} onSlotClick={handleSlotClick}/>
        ) : view === 'month' ? (
          <MonthView events={filteredEvents} calendarDays={calendarDays} month={month} year={year} accent={accent} today={today} onEventClick={handleEventClick} onSlotClick={handleSlotClick}/>
        ) : view === 'timeline' ? (
          <TimelineView events={filteredEvents} accent={accent} onEventClick={handleEventClick}/>
        ) : (
          <TeamView events={filteredEvents} accent={accent} onEventClick={handleEventClick}/>
        )}
      </div>

      {/* ── Event Modal ── */}
      {modal && (
        <EventModal
          event={modal.event}
          defaultDate={modal.defaultDate}
          accent={accent}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
