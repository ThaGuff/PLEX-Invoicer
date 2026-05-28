
function GoogleCalendarSync({ accountId, onSynced }) {
  const [status, setStatus] = React.useState(null); // null | 'connected' | 'disconnected'
  const [syncing, setSyncing] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;

  React.useEffect(() => {
    if (!accountId) return;
    fetch(`/api/google-calendar/status?account_id=${accountId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setStatus(d.connected ? 'connected' : 'disconnected')).catch(() => setStatus('disconnected'));
    // Handle OAuth callback params
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') { setStatus('connected'); window.history.replaceState({}, '', window.location.pathname); }
  }, [accountId]);

  const connect = async () => {
    const r = await fetch(`/api/google-calendar/auth-url?account_id=${accountId}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (d.url) window.location.href = d.url;
    else alert(d.error || 'Google Calendar not configured on server.');
  };

  const sync = async () => {
    setSyncing(true); setResult(null);
    try {
      const r = await fetch('/api/google-calendar/sync', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ account_id: accountId }) });
      const d = await r.json();
      setResult(d);
      if (d.ok && d.imported > 0) onSynced?.();
    } catch(e) { setResult({ error: e.message }); }
    setSyncing(false);
  };

  return (
    <div className="glow-card" style={{ padding:'14px 16px', marginTop:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'rgba(37,99,235,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Calendar size={16} style={{ color:'#2563EB' }} />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Google Calendar Sync</p>
          <p style={{ fontSize:11, color: status === 'connected' ? '#0D9488' : 'var(--text-muted)' }}>
            {status === 'connected' ? '✓ Connected — tap Sync to import events' : 'Import events from your Google Calendar'}
          </p>
          {result && !result.error && (
            <p style={{ fontSize:11, color:'#0D9488', marginTop:3 }}>
              Imported {result.imported} new events ({result.skipped} already synced)
            </p>
          )}
          {result?.error && <p style={{ fontSize:11, color:'#DC2626', marginTop:3 }}>{result.error}</p>}
        </div>
        {status === 'connected' ? (
          <button onClick={sync} disabled={syncing}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", opacity:syncing?0.6:1 }}>
            <RefreshCw size={13} style={{ animation: syncing?'spin 1s linear infinite':undefined }} /> {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        ) : (
          <button onClick={connect}
            style={{ padding:'8px 14px', background:'var(--bg-page)', border:'1px solid var(--border)', borderRadius:9, fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Calendar & Scheduling — job appointments, Google Calendar sync
 * Mobile-first: month view with day drill-down, large tap targets
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, ExternalLink, X, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthDays(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return { first, days };
}

function EventDot({ color = '#2563EB' }) {
  return <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} />;
}

const STATUS_COLORS = {
  scheduled: '#2563EB', completed: '#0D9488', cancelled: '#DC2626', pending: '#D97706'
};

export default function CalendarPage() {
  const { account } = useAccount();
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(today.getDate());
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ title:'', date:'', time:'', duration:60, location:'', notes:'', status:'scheduled' });

  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;

  const load = useCallback(async () => {
    if (!account?.id) return;
    try {
      const res = await fetch(`/api/calendar?account_id=${account.id}&year=${year}&month=${month+1}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setEvents(await res.json());
    } catch {}
    setLoading(false);
  }, [account?.id, year, month]);

  useEffect(() => { load(); }, [load]);

  const { first, days } = getMonthDays(year, month);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const selectedDate = `${year}-${String(month+1).padStart(2,'0')}-${String(selected).padStart(2,'0')}`;
  const dayEvents = events.filter(e => e.date?.startsWith(selectedDate));
  const eventsByDay = {};
  events.forEach(e => {
    const d = new Date(e.date).getDate();
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  const saveEvent = async () => {
    try {
      const res = await fetch('/api/calendar', { method:'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ ...form, account_id: account.id }) });
      if (res.ok) { const ev = await res.json(); setEvents(e => [...e, ev]); setShowForm(false); setForm({ title:'', date:'', time:'', duration:60, location:'', notes:'', status:'scheduled' }); }
    } catch {}
  };

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'16px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em', display:'flex', alignItems:'center', gap:10 }}>
            <Calendar size={20} style={{ color:'#2563EB' }} /> Schedule
          </h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>{events.length} upcoming jobs</p>
        </div>
        <button onClick={() => { setForm(f => ({ ...f, date:selectedDate })); setShowForm(true); }}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:11, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(37,99,235,0.3)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <Plus size={14} /> New job
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }}>
        {/* Calendar */}
        <div className="glow-card" style={{ padding:16 }}>
          {/* Month nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <button onClick={prevMonth} style={{ width:36, height:36, borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-page)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' }}>
              <ChevronLeft size={16} />
            </button>
            <p style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>{MONTHS[month]} {year}</p>
            <button onClick={nextMonth} style={{ width:36, height:36, borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-page)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day labels */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
            {DAYS.map(d => <p key={d} style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textAlign:'center', padding:'4px 0', textTransform:'uppercase', letterSpacing:'0.5px' }}>{d}</p>)}
          </div>

          {/* Day grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {Array(first).fill(null).map((_, i) => <div key={'e'+i} />)}
            {Array(days).fill(null).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSel   = day === selected;
              const hasEvts = eventsByDay[day]?.length > 0;
              return (
                <button key={day} onClick={() => setSelected(day)}
                  style={{ aspectRatio:'1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, borderRadius:9, border:'none', cursor:'pointer', transition:'all 0.15s', fontFamily:"'Plus Jakarta Sans',sans-serif",
                    background: isSel ? 'linear-gradient(135deg,#2563EB,#0D9488)' : isToday ? 'rgba(37,99,235,0.1)' : 'transparent',
                    color: isSel ? '#fff' : isToday ? '#2563EB' : 'var(--text-primary)',
                    fontWeight: isToday || isSel ? 800 : 400, fontSize:13 }}>
                  {day}
                  {hasEvts && <div style={{ width:4, height:4, borderRadius:'50%', background: isSel ? 'rgba(255,255,255,0.8)' : '#2563EB' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day events */}
        <div>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>
            {MONTHS[month]} {selected}
          </p>
          {dayEvents.length === 0 ? (
            <div className="glow-card" style={{ padding:'32px 24px', textAlign:'center' }}>
              <Calendar size={28} style={{ color:'var(--text-muted)', margin:'0 auto 8px' }} />
              <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>No jobs scheduled</p>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>Tap "New job" to schedule a job for this day.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {dayEvents.map(ev => (
                <div key={ev.id} className="glow-card" style={{ padding:'14px 16px', borderLeft:`3px solid ${STATUS_COLORS[ev.status]||'#2563EB'}` }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{ev.title}</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                        {ev.time && <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)' }}><Clock size={11}/>{ev.time}</span>}
                        {ev.location && <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)' }}><MapPin size={11}/>{ev.location}</span>}
                      </div>
                      {ev.notes && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>{ev.notes}</p>}
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background:`${STATUS_COLORS[ev.status]||'#2563EB'}15`, color:STATUS_COLORS[ev.status]||'#2563EB', flexShrink:0, textTransform:'capitalize' }}>{ev.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Google Calendar OAuth + Sync */}
      <GoogleCalendarSync accountId={account?.id} onSynced={load} />

      {/* New event modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.5)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'flex-end', padding:0, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <div style={{ background:'var(--bg-surface)', borderRadius:'20px 20px 0 0', padding:'20px 16px', width:'100%', maxHeight:'90dvh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>New job</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={20}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[['title','Job title',true],['location','Job site address'],['notes','Notes (optional)']].map(([field,ph,req]) => (
                <div key={field}>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>{ph}</label>
                  <input value={form[field]} onChange={e => setForm(f => ({...f,[field]:e.target.value}))} placeholder={ph} className="field" style={{ fontSize:14 }} />
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({...f,date:e.target.value}))} className="field" style={{ fontSize:14 }} />
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Time</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({...f,time:e.target.value}))} className="field" style={{ fontSize:14 }} />
                </div>
              </div>
              <button onClick={saveEvent} disabled={!form.title||!form.date}
                style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:800, cursor:'pointer', opacity:(!form.title||!form.date)?0.5:1, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                Save job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
