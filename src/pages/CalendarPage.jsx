import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from '../context/AccountContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Plus, Calendar, List, Grid, Clock, User, Tag, Trash2, X, Check, RefreshCw } from 'lucide-react';

const COLORS = ['#2563EB','#0D9488','#7C3AED','#D97706','#DC2626','#059669','#0891B2','#9333EA'];
const EVENT_TYPES = ['Job','Meeting','Follow-up','Estimate','Install','Inspection','Invoice Due','Other'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function pad(n) { return String(n).padStart(2,'0'); }
function fmtDate(d) { return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
function fmtTime(t) { if (!t) return ''; const [h,m] = t.split(':'); const hr = +h; return `${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`; }
function isSameDay(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

function GoogleCalendarSync({ accountId }) {
  const { user } = useAuth();
  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    fetch(`/api/google-calendar/status?account_id=${accountId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setStatus).catch(() => {});
  }, [accountId]);

  const handleConnect = async () => {
    try {
      const r = await fetch(`/api/google-calendar/auth-url?account_id=${accountId}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.url) window.open(d.url, '_blank');
      else alert(d.error || 'Google Calendar not configured. Set GOOGLE_CLIENT_ID in Railway Variables.');
    } catch (e) { alert(e.message); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch('/api/google-calendar/sync', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ account_id: accountId }) });
      const d = await r.json();
      if (d.ok) { alert(`Synced ${d.imported} events from Google Calendar`); window.location.reload(); }
      else alert(d.error || 'Sync failed');
    } catch (e) { alert(e.message); } finally { setSyncing(false); }
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      {status?.connected ? (
        <button onClick={handleSync} disabled={syncing} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'1px solid #0D9488', background:'rgba(13,148,136,0.08)', color:'#0D9488', cursor:'pointer', fontSize:12, fontWeight:600 }}>
          <RefreshCw size={12} className={syncing ? 'spin' : ''}/>
          {syncing ? 'Syncing…' : 'Sync Google'}
        </button>
      ) : (
        <button onClick={handleConnect} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'1px solid #4285F4', background:'rgba(66,133,244,0.08)', color:'#4285F4', cursor:'pointer', fontSize:12, fontWeight:600 }}>
          <svg width="12" height="12" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Connect Google
        </button>
      )}
    </div>
  );
}

function EventModal({ event, onClose, onSave, onDelete, defaultDate }) {
  const today = defaultDate || new Date();
  const [form, setForm] = useState(event ? {
    title: event.title || '',
    date: event.date || `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`,
    time: event.time || '',
    end_time: event.end_time || '',
    type: event.type || 'Job',
    color: event.color || COLORS[0],
    notes: event.notes || '',
    assigned_to: event.assigned_to || '',
    tags: event.tags || '',
  } : {
    title: '', date: `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`,
    time: '', end_time: '', type: 'Job', color: COLORS[0], notes: '', assigned_to: '', tags: '',
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'var(--bg-surface)', borderRadius:20, width:'100%', maxWidth:480, padding:28, boxShadow:'0 24px 80px rgba(11,18,32,0.25)', border:'1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:'var(--text-primary)' }}>{event?.id ? 'Edit Event' : 'New Event'}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={20}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Event title*" style={{ padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:15, fontWeight:600 }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }}>DATE*</label>
              <input type="date" value={form.date} onChange={e=>set('date',e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:14 }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }}>TYPE</label>
              <select value={form.type} onChange={e=>set('type',e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:14 }}>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }}>START TIME</label>
              <input type="time" value={form.time} onChange={e=>set('time',e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:14 }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }}>END TIME</label>
              <input type="time" value={form.end_time} onChange={e=>set('end_time',e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:14 }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>COLOR TAG</label>
            <div style={{ display:'flex', gap:8 }}>
              {COLORS.map(c => <button key={c} onClick={()=>set('color',c)} style={{ width:24, height:24, borderRadius:'50%', background:c, border:form.color===c?'3px solid var(--text-primary)':'2px solid transparent', cursor:'pointer' }}/>)}
            </div>
          </div>
          <input value={form.assigned_to} onChange={e=>set('assigned_to',e.target.value)} placeholder="Assigned to (team member name or email)" style={{ padding:'8px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:14 }}/>
          <input value={form.tags} onChange={e=>set('tags',e.target.value)} placeholder="Tags (comma-separated: roofing, estimate, urgent)" style={{ padding:'8px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:14 }}/>
          <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Notes or job details…" rows={3} style={{ padding:'8px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:14, resize:'vertical' }}/>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'space-between' }}>
          {event?.id && <button onClick={()=>onDelete(event.id)} style={{ padding:'10px 16px', borderRadius:10, border:'1px solid #DC2626', background:'rgba(220,38,38,0.06)', color:'#DC2626', cursor:'pointer', fontSize:13, fontWeight:600 }}>Delete</button>}
          <div style={{ display:'flex', gap:10, marginLeft:'auto' }}>
            <button onClick={onClose} style={{ padding:'10px 20px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-raised)', color:'var(--text-primary)', cursor:'pointer', fontSize:14, fontWeight:600 }}>Cancel</button>
            <button onClick={()=>{ if(!form.title.trim()||!form.date) return alert('Title and date required'); onSave(form); }} style={{ padding:'10px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700 }}>Save Event</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { account } = useAccount();
  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
  const headers = { Authorization: `Bearer ${token}` };

  const [events, setEvents] = useState([]);
  const [view, setView] = useState('month'); // month | week | list
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date());
  const [modal, setModal] = useState(null); // null | {event, defaultDate}
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const year = current.getFullYear();
  const month = current.getMonth();

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/calendar?account_id=${account.id}&year=${year}&month=${month+1}`, { headers });
      if (r.ok) setEvents(await r.json());
    } catch {} finally { setLoading(false); }
  }, [account?.id, year, month]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (!account?.id) return;
    try {
      const body = { ...form, account_id: account.id };
      let r;
      if (modal?.event?.id) {
        r = await fetch(`/api/calendar/${modal.event.id}`, { method:'PATCH', headers:{ ...headers, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      } else {
        r = await fetch('/api/calendar', { method:'POST', headers:{ ...headers, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      }
      if (r.ok) { setModal(null); await load(); }
      else { const d = await r.json(); alert(d.error || 'Save failed'); }
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try {
      await fetch(`/api/calendar/${id}`, { method:'DELETE', headers });
      setModal(null);
      setEvents(ev => ev.filter(e => e.id !== id));
    } catch (e) { alert(e.message); }
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    let evs = [...events];
    if (filter) evs = evs.filter(e => e.title?.toLowerCase().includes(filter.toLowerCase()) || e.notes?.toLowerCase().includes(filter.toLowerCase()) || e.tags?.toLowerCase().includes(filter.toLowerCase()) || e.assigned_to?.toLowerCase().includes(filter.toLowerCase()));
    if (typeFilter) evs = evs.filter(e => e.type === typeFilter);
    return evs.sort((a, b) => a.date?.localeCompare(b.date) || a.time?.localeCompare(b.time));
  }, [events, filter, typeFilter]);

  // Calendar grid for month view
  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [year, month]);

  const eventsOnDay = (d) => {
    if (!d) return [];
    const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    return filteredEvents.filter(e => e.date === key);
  };

  // Week view
  const weekStart = useMemo(() => {
    const d = new Date(current);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [current]);
  const weekDays = Array.from({ length:7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate()+i); return d; });

  const accent = account?.primary_color || '#2563EB';

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'var(--bg-page)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      {/* Header */}
      <div style={{ padding:'20px 24px 0', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={() => setCurrent(d => { const n=new Date(d); view==='week'?n.setDate(n.getDate()-7):n.setMonth(n.getMonth()-1); return n; })} style={{ width:34, height:34, borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-primary)' }}><ChevronLeft size={18}/></button>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'var(--text-primary)' }}>
            {view === 'list' ? 'Schedule' : `${MONTHS[month]} ${year}`}
          </h2>
          <button onClick={() => setCurrent(d => { const n=new Date(d); view==='week'?n.setDate(n.getDate()+7):n.setMonth(n.getMonth()+1); return n; })} style={{ width:34, height:34, borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-primary)' }}><ChevronRight size={18}/></button>
          <button onClick={() => setCurrent(new Date())} style={{ padding:'4px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>Today</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          {/* View switcher */}
          <div style={{ display:'flex', borderRadius:10, border:'1px solid var(--border)', overflow:'hidden' }}>
            {[['month','Month',Grid],['week','Week',Calendar],['list','List',List]].map(([v,label,Icon]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding:'6px 12px', border:'none', background: view===v ? accent : 'var(--bg-raised)', color: view===v ? '#fff' : 'var(--text-secondary)', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                <Icon size={13}/>{label}
              </button>
            ))}
          </div>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search events…" style={{ padding:'6px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-raised)', color:'var(--text-primary)', fontSize:13, width:150 }}/>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ padding:'6px 10px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-raised)', color:'var(--text-primary)', fontSize:13 }}>
            <option value="">All types</option>
            {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <GoogleCalendarSync accountId={account?.id}/>
          <button onClick={() => setModal({ event:null, defaultDate:null })} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${accent},#0D9488)`, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, boxShadow:`0 4px 12px ${accent}40` }}>
            <Plus size={15}/> New Event
          </button>
        </div>
      </div>

      {/* Calendar content */}
      <div style={{ flex:1, overflow:'auto', padding:view==='list'?'20px 24px':'16px 24px 24px' }}>
        {/* MONTH VIEW */}
        {view === 'month' && (
          <div style={{ background:'var(--bg-surface)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden', boxShadow:'0 2px 16px rgba(11,18,32,0.06)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', background:'var(--bg-raised)', borderBottom:'1px solid var(--border)' }}>
              {DAYS.map(d => <div key={d} style={{ padding:'10px 0', textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{d}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)' }}>
              {calendarDays.map((d, i) => {
                const dayEvents = d ? eventsOnDay(d) : [];
                const isToday = d && isSameDay(d, today);
                return (
                  <div key={i} onClick={() => d && setModal({ event:null, defaultDate:d })} style={{ minHeight:110, padding:'8px 6px', borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background: d ? 'var(--bg-surface)' : 'var(--bg-page)', cursor:d?'pointer':'default', transition:'background 0.1s' }}
                    onMouseEnter={e => d && (e.currentTarget.style.background='var(--bg-raised)')}
                    onMouseLeave={e => d && (e.currentTarget.style.background='var(--bg-surface)')}>
                    {d && (
                      <>
                        <div style={{ width:26, height:26, borderRadius:'50%', background:isToday?accent:'transparent', color:isToday?'#fff':'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:isToday?800:500, marginBottom:4 }}>
                          {d.getDate()}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          {dayEvents.slice(0,3).map(ev => (
                            <div key={ev.id} onClick={e => { e.stopPropagation(); setModal({ event:ev, defaultDate:null }); }}
                              style={{ padding:'2px 6px', borderRadius:5, background:ev.color||accent, color:'#fff', fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}>
                              {ev.time ? `${fmtTime(ev.time)} ` : ''}{ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && <div style={{ fontSize:10, color:accent, fontWeight:600, paddingLeft:4 }}>+{dayEvents.length-3} more</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {view === 'week' && (
          <div style={{ background:'var(--bg-surface)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden', boxShadow:'0 2px 16px rgba(11,18,32,0.06)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', borderBottom:'1px solid var(--border)' }}>
              {weekDays.map((d, i) => {
                const isToday = isSameDay(d, today);
                return (
                  <div key={i} style={{ padding:'12px 8px', textAlign:'center', borderRight: i<6 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{DAYS[d.getDay()]}</div>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:isToday?accent:'transparent', color:isToday?'#fff':'var(--text-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, margin:'0 auto' }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', minHeight:400 }}>
              {weekDays.map((d, i) => {
                const dayEvents = eventsOnDay(d);
                return (
                  <div key={i} onClick={() => setModal({ event:null, defaultDate:d })} style={{ padding:'8px 6px', borderRight:i<6?'1px solid var(--border)':'none', minHeight:400, cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg-raised)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {dayEvents.map(ev => (
                        <div key={ev.id} onClick={e => { e.stopPropagation(); setModal({ event:ev, defaultDate:null }); }}
                          style={{ padding:'6px 8px', borderRadius:8, background:ev.color||accent, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}>
                          {ev.time && <div style={{ fontSize:10, opacity:0.85 }}>{fmtTime(ev.time)}{ev.end_time?` – ${fmtTime(ev.end_time)}`:''}</div>}
                          <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.title}</div>
                          {ev.assigned_to && <div style={{ fontSize:10, opacity:0.75, marginTop:2 }}>👤 {ev.assigned_to}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {loading && <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>Loading…</div>}
            {!loading && filteredEvents.length === 0 && (
              <div style={{ textAlign:'center', padding:64, color:'var(--text-muted)' }}>
                <Calendar size={40} style={{ margin:'0 auto 12px', opacity:0.3 }}/>
                <p style={{ margin:0, fontSize:15 }}>No events found. Click "New Event" to schedule something.</p>
              </div>
            )}
            {/* Group events by date */}
            {(() => {
              const grouped = {};
              filteredEvents.forEach(ev => { (grouped[ev.date] = grouped[ev.date] || []).push(ev); });
              return Object.entries(grouped).map(([date, evs]) => {
                const d = new Date(date + 'T00:00:00');
                const isToday = isSameDay(d, today);
                return (
                  <div key={date}>
                    <div style={{ padding:'8px 0 4px', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:isToday?accent:'var(--bg-raised)', color:isToday?'#fff':'var(--text-primary)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, flexShrink:0 }}>
                        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase' }}>{DAYS[d.getDay()]}</span>
                        {d.getDate()}
                      </div>
                      <span style={{ fontSize:13, fontWeight:700, color:isToday?accent:'var(--text-secondary)' }}>{isToday ? 'Today' : fmtDate(d)}</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, paddingLeft:46 }}>
                      {evs.map(ev => (
                        <div key={ev.id} onClick={() => setModal({ event:ev, defaultDate:null })} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'12px 16px', background:'var(--bg-surface)', borderRadius:12, border:'1px solid var(--border)', cursor:'pointer', transition:'box-shadow 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(11,18,32,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                          <div style={{ width:4, height:'100%', minHeight:40, borderRadius:4, background:ev.color||accent, flexShrink:0, marginTop:2 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                              <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{ev.title}</span>
                              <span style={{ padding:'2px 8px', borderRadius:20, background:`${ev.color||accent}22`, color:ev.color||accent, fontSize:11, fontWeight:700 }}>{ev.type}</span>
                              {ev.tags && ev.tags.split(',').map(t=>t.trim()).filter(Boolean).map(t => (
                                <span key={t} style={{ padding:'2px 6px', borderRadius:6, background:'var(--bg-raised)', color:'var(--text-muted)', fontSize:10, fontWeight:600 }}>#{t}</span>
                              ))}
                            </div>
                            <div style={{ display:'flex', gap:16, marginTop:5, flexWrap:'wrap' }}>
                              {ev.time && <span style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><Clock size={11}/>{fmtTime(ev.time)}{ev.end_time?` – ${fmtTime(ev.end_time)}`:''}</span>}
                              {ev.assigned_to && <span style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><User size={11}/>{ev.assigned_to}</span>}
                            </div>
                            {ev.notes && <p style={{ margin:'5px 0 0', fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{ev.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Event Modal */}
      {modal && <EventModal event={modal.event} defaultDate={modal.defaultDate} onClose={() => setModal(null)} onSave={handleSave} onDelete={handleDelete}/>}
    </div>
  );
}
