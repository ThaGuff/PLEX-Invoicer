import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Receipt, Trash2, Bell, RefreshCw, CheckCircle, Clock, AlertCircle, Eye, DollarSign, Send } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';

const STATUS = {
  draft:     { bg:'#F1F5F9', color:'#64748B', dot:'#94A3B8' },
  sent:      { bg:'#EAF0FF', color:'#2B56CC', dot:'#4B7BFF' },
  viewed:    { bg:'#FEF3C7', color:'#92400E', dot:'#f59e0b' },
  paid:      { bg:'#E0FBF7', color:'#0A7A6A', dot:'#00E5C8' },
  overdue:   { bg:'rgba(239,68,68,0.1)', color:'#991B1B', dot:'#ef4444' },
  cancelled: { bg:'#F1F5F9', color:'#94A3B8', dot:'#CBD5E1' },
};

const fmt      = n => '$' + Math.round(n || 0).toLocaleString();
const fmtDate  = s => { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric' }); } catch { return s; } };
const isOD     = inv => inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid' && inv.status !== 'cancelled';

export default function InvoicesList() {
  const { account } = useAccount();
  const navigate    = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const data = await api.invoices.list(account.id);
      setInvoices(Array.isArray(data) ? data : data?.invoices || []);
    } catch {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this invoice?')) return;
    await api.invoices.delete(id);
    setInvoices(v => v.filter(x => x.id !== id));
  };

  const handleReminder = async (id, e) => {
    e.stopPropagation();
    try {
      await api.invoices.sendReminder(id);
    } catch (err) { console.error('Reminder failed:', err.message); }
  };

  const enriched = invoices.map(inv => ({ ...inv, _overdue: isOD(inv) }));
  const filtered = enriched.filter(inv => {
    const matchSearch = !search || [inv.client_name, inv.number].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || (filter === 'overdue' ? inv._overdue : inv.status === filter);
    return matchSearch && matchFilter;
  });

  const stats = {
    total:      invoices.length,
    paid:       invoices.filter(i => i.status === 'paid').length,
    outstanding: invoices.filter(i => !['paid','cancelled'].includes(i.status)).reduce((s,i) => s+(i.amount_due||0), 0),
    overdue:    enriched.filter(i => i._overdue).length,
    collected:  invoices.filter(i => i.status === 'paid').reduce((s,i) => s+(i.amount_paid||0), 0),
  };

  const FILTERS = [
    { k:'all',     label:'All',     icon: Receipt },
    { k:'sent',    label:'Sent',    icon: Send },
    { k:'viewed',  label:'Viewed',  icon: Eye },
    { k:'overdue', label:'Overdue', icon: AlertCircle },
    { k:'paid',    label:'Paid',    icon: CheckCircle },
  ];

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 16px' }}>
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em' }}>Invoices</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>{stats.total} total · {stats.overdue > 0 ? `${stats.overdue} overdue` : 'all current'}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }} className="animate-fade-up-delay-1">
        {[
          { label:'Collected',    value:fmt(stats.collected),    bg:'#00E5C8' },
          { label:'Outstanding',  value:fmt(stats.outstanding),  bg:'linear-gradient(90deg,#00E5C8,#4B7BFF)' },
          { label:'Paid count',   value:stats.paid,              bg:'linear-gradient(90deg,#4B7BFF,#7B4FE8)' },
          { label:'Overdue',      value:stats.overdue,           bg:'#ef4444' },
        ].map(s => (
          <div key={s.label} className="glow-card p-4">
            <div style={{ height:2, borderRadius:1, background:s.bg, marginBottom:10 }} />
            <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.9px', marginBottom:4 }}>{s.label}</p>
            <p style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap animate-fade-up-delay-2">
        <div className="relative" style={{ flex:1, minWidth:200, maxWidth:320 }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices, clients…" className="field" style={{ paddingLeft:36, fontSize:13 }} />
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {FILTERS.map(f => {
            const st = STATUS[f.k] || {};
            const active = filter === f.k;
            return (
              <button key={f.k} onClick={() => setFilter(f.k)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9, border:'none', cursor:'pointer', fontSize:11, fontWeight:active?700:500, background:active ? (st.bg||'var(--navy)') : 'var(--bg-page)', color:active ? (st.color||'#fff') : 'var(--text-muted)', boxShadow:active ? `0 2px 8px ${st.dot||'#4B7BFF'}33` : 'none', transition:'all 0.15s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                <f.icon size={11} /> {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoice rows */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => <div key={i} className="glow-card p-5 animate-pulse" style={{ height:72 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glow-card p-12 text-center">
          <Receipt size={32} style={{ color:'var(--text-muted)', margin:'0 auto 12px' }} />
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>No invoices found</p>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Convert a quote to generate an invoice.</p>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-up-delay-3">
          {filtered.map(inv => {
            const od = inv._overdue;
            const st = od ? STATUS.overdue : STATUS[inv.status] || STATUS.draft;
            return (
              <div key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="glow-card"
                style={{ padding:'14px 16px', cursor:'pointer', transition:'all 0.18s cubic-bezier(0.4,0,0.2,1)', background: od ? 'rgba(239,68,68,0.02)' : 'var(--bg-surface)' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 28px ${od?'rgba(239,68,68,0.12)':'rgba(75,123,255,0.12)'}`;  e.currentTarget.style.borderColor=od?'#ef444433':'#4B7BFF44'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='var(--border)'; }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:100 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:st.dot, flexShrink:0 }} />
                    <span style={{ fontSize:11, fontWeight:700, color:st.color, fontFamily:'monospace', letterSpacing:'0.5px' }}>{inv.number}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.client_name || '—'}</p>
                    {od && <p style={{ fontSize:10, color:'#ef4444', marginTop:1 }}>Due {fmtDate(inv.due_date)} · Overdue</p>}
                  </div>
                  <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20, background:st.bg, color:st.color, flexShrink:0, letterSpacing:'0.4px', textTransform:'uppercase' }}>
                    {od ? 'overdue' : inv.status}
                  </span>
                  <div style={{ textAlign:'right', flexShrink:0, minWidth:80 }}>
                    <p style={{ fontSize:14, fontWeight:800, color: od ? '#ef4444' : 'var(--text-primary)', letterSpacing:'-0.02em' }}>{fmt(inv.amount_due)}</p>
                    <p style={{ fontSize:10, color:'var(--text-muted)' }}>Due {fmtDate(inv.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={e => handleReminder(inv.id, e)}
                        style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:600, padding:'5px 10px', borderRadius:7, border:'0.5px solid var(--border)', background:'var(--bg-page)', cursor:'pointer', color:'var(--text-muted)', transition:'all 0.15s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='#4B7BFF'; e.currentTarget.style.color='#4B7BFF'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)'; }}>
                        <Bell size={10} /> Remind
                      </button>
                    )}
                    <button onClick={e => handleDelete(inv.id, e)}
                      style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'0.5px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--text-muted)', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#ef4444'; e.currentTarget.style.color='#ef4444'; e.currentTarget.style.background='rgba(239,68,68,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='transparent'; }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
