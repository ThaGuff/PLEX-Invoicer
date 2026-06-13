/**
 * WeeklyScheduleWidget — Shows upcoming schedule items, alerts & tasks
 * Fetches from calendar events for the next 7 days
 */
import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WeeklyScheduleWidget({ accountId, accent = '#C6E404' }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overdue, setOverdue] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!accountId) return;
    const load = async () => {
      try {
        const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
        const h = { Authorization: `Bearer ${token}` };

        // First: try to sync Google Calendar (silent, non-blocking)
        fetch(`/api/google-calendar/sync?account_id=${accountId}`, {
          method: 'POST', headers: h
        }).catch(() => {}); // silent fail if not connected

        // Fetch calendar events for next 14 days (manual + synced Google events)
        const now = new Date();
        const nextTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const r = await fetch(
          `/api/calendar/events?account_id=${accountId}&start=${now.toISOString()}&end=${nextTwoWeeks.toISOString()}`,
          { headers: h }
        );
        if (r.ok) {
          const data = await r.json();
          setEvents((Array.isArray(data) ? data : data?.events || []).slice(0, 8));
        }

        // Fetch overdue invoices
        const ir = await fetch(`/api/invoices?account_id=${accountId}&limit=20`, { headers: h });
        if (ir.ok) {
          const data = await ir.json();
          const invArr = Array.isArray(data) ? data : data?.invoices || [];
          const today = new Date().toISOString().split('T')[0];
          const overdueInvs = invArr.filter(inv =>
            inv.status === 'generated' || inv.status === 'sent' || inv.status === 'viewed'
          ).filter(inv => inv.due_date && inv.due_date < today);
          setOverdue(overdueInvs.slice(0, 3));
        }
      } catch(e) {}
      setLoading(false);
    };
    load();
  }, [accountId]);

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((dt - now) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const fmtTime = (d) => {
    if (!d) return '';
    // Handle "HH:MM" string format (calendar events) or ISO date string
    if (typeof d === 'string' && /^\d{1,2}:\d{2}$/.test(d.trim())) {
      const [h, m] = d.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
    }
    // ISO date string
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'14px 16px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:`${accent}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Calendar size={14} style={{ color: accent }} />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', lineHeight:1 }}>This Week</p>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Schedule & alerts</p>
          </div>
        </div>
        <button onClick={() => navigate('/calendar')}
          style={{ fontSize:11, color: accent, fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
          View all <ChevronRight size={11} />
        </button>
      </div>

      <div style={{ padding:'12px 14px' }}>
        {/* Overdue alerts */}
        {overdue.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
              <AlertTriangle size={10} /> {overdue.length} overdue invoice{overdue.length > 1 ? 's' : ''}
            </p>
            {overdue.map(inv => (
              <button key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 8px', borderRadius:8, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', marginBottom:4, cursor:'pointer', textAlign:'left' }}>
                <div>
                  <p style={{ fontSize:12, fontWeight:600, color:'#dc2626' }}>{inv.number} — {inv.client_name || inv.client_biz}</p>
                  <p style={{ fontSize:10, color:'#ef4444' }}>Due {new Date(inv.due_date).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</p>
                </div>
                <p style={{ fontSize:12, fontWeight:700, color:'#dc2626' }}>${(inv.amount_due || 0).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}

        {/* Upcoming events */}
        {loading ? (
          <div style={{ textAlign:'center', padding:16 }}>
            <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${accent}`, borderTopColor:'transparent', margin:'0 auto', animation:'spin 0.8s linear infinite' }} />
          </div>
        ) : events.length === 0 && overdue.length === 0 ? (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <CheckCircle size={24} style={{ color:'#C6E404', margin:'0 auto 6px' }} />
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>All clear — no upcoming events</p>
            <button onClick={() => navigate('/calendar')}
              style={{ marginTop:8, fontSize:11, color: accent, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>
              + Add event
            </button>
          </div>
        ) : (
          <>
            {events.length > 0 && (
              <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Upcoming</p>
            )}
            {events.map((ev, i) => (
              <div key={ev.id || i}
                style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'7px 0', borderBottom: i < events.length-1 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{ width:28, height:28, borderRadius:7, background:`${accent}15`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:9, fontWeight:700, color: accent, lineHeight:1 }}>
                    {new Date((ev.date || ev.start_time || ev.start) + 'T12:00:00').toLocaleDateString('en-US',{month:'short'}).toUpperCase()}
                  </span>
                  <span style={{ fontSize:13, fontWeight:800, color: accent, lineHeight:1 }}>
                    {new Date((ev.date || ev.start_time || ev.start) + 'T12:00:00').getDate()}
                  </span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {ev.title || ev.summary || 'Untitled'}
                  </p>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2, flexWrap:'wrap' }}>
                    <p style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3 }}>
                      <Clock size={9} />
                      {fmtDate(ev.date || ev.start_time || ev.start)}
                      {ev.time ? ` · ${ev.time}` : (ev.start_time ? ` · ${fmtTime(ev.start_time)}` : '')}
                    </p>
                    {ev.client_name && (
                      <span style={{ fontSize:10, color:'var(--text-muted)', background:'var(--bg-raised)', padding:'1px 6px', borderRadius:8 }}>
                        {ev.client_name}
                      </span>
                    )}
                    {ev.location && (
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>📍 {ev.location}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
