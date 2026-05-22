import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, ArrowRight, RefreshCw, Eye, CheckCircle, Clock, Send, BarChart2 } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';

const STATUS = {
  draft:     { bg:'#F1F5F9', color:'#64748B',  dot:'#94A3B8' },
  sent:      { bg:'#EAF0FF', color:'#2B56CC',  dot:'#4B7BFF' },
  viewed:    { bg:'#FEF3C7', color:'#92400E',  dot:'#f59e0b' },
  accepted:  { bg:'#E0FBF7', color:'#0A7A6A',  dot:'#00E5C8' },
  cancelled: { bg:'#FEF2F2', color:'#991B1B',  dot:'#ef4444' },
};

const FILTER_ICONS = { all: FileText, draft: Clock, sent: Send, viewed: Eye, accepted: CheckCircle };

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }
function fmtDate(s) { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return s; } }
function daysAgo(s) { if (!s) return null; const d = Math.floor((Date.now() - new Date(s)) / 86400000); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`; }

export default function QuotesList() {
  const { account } = useAccount();
  const navigate    = useNavigate();
  const [quotes,  setQuotes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const data = await api.quotes.list(account.id);
      setQuotes(Array.isArray(data) ? data : data?.quotes || []);
    } catch {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this quote?')) return;
    await api.quotes.delete(id);
    setQuotes(q => q.filter(x => x.id !== id));
  };

  const handleConvert = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Convert this quote to an invoice?')) return;
    try {
      const inv = await api.quotes.convert(id);
      navigate(`/invoices/${inv.id}`);
    } catch (err) { console.error('Convert failed:', err.message); }
  };

  const filtered = quotes.filter(q => {
    const matchSearch = !search || [q.client_name, q.client_biz, q.number].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || q.status === filter;
    return matchSearch && matchFilter;
  });

  // Stats summary
  const total    = quotes.length;
  const accepted = quotes.filter(q => q.status === 'accepted').length;
  const pending  = quotes.filter(q => ['sent','viewed'].includes(q.status)).length;
  const revenue  = quotes.filter(q => q.status === 'accepted').reduce((s,q) => s+(q.setup_total||0), 0);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Quotes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{total} total · {pending} pending</p>
        </div>
        <button onClick={() => navigate('/quotes/new')}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:'linear-gradient(135deg,#00E5C8,#4B7BFF)', color:'#fff', border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(75,123,255,0.35)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <Plus size={15} /> New quote
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }} className="animate-fade-up-delay-1">
        {[
          { label:'Total', value:total, color:'#7B4FE8', bg:'linear-gradient(90deg,#7B4FE8,#4B7BFF)' },
          { label:'Pending', value:pending, color:'#f59e0b', bg:'#f59e0b' },
          { label:'Accepted', value:accepted, color:'#00E5C8', bg:'linear-gradient(90deg,#00E5C8,#4B7BFF)' },
          { label:'Revenue', value:fmt(revenue), color:'#00E5C8', bg:'#00E5C8' },
        ].map(s => (
          <div key={s.label} className="glow-card p-4">
            <div style={{ height:2, borderRadius:1, background:s.bg, marginBottom:10 }} />
            <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.9px', marginBottom:4 }}>{s.label}</p>
            <p style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap animate-fade-up-delay-2">
        <div className="relative" style={{ flex:'1', minWidth:200, maxWidth:320 }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search quotes, clients…" className="field"
            style={{ paddingLeft:36, fontSize:13 }} />
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {['all','draft','sent','viewed','accepted'].map(s => {
            const Icon = FILTER_ICONS[s];
            const st = STATUS[s];
            const active = filter === s;
            return (
              <button key={s} onClick={() => setFilter(s)}
                style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'7px 12px', borderRadius:9, border:'none', cursor:'pointer',
                  fontSize:11, fontWeight:active ? 700 : 500, textTransform:'capitalize',
                  background: active ? (st?.bg || 'var(--navy)') : 'var(--bg-page)',
                  color: active ? (st?.color || '#fff') : 'var(--text-muted)',
                  boxShadow: active ? `0 2px 8px ${st?.dot || '#4B7BFF'}33` : 'none',
                  transition:'all 0.15s', fontFamily:"'Plus Jakarta Sans',sans-serif",
                }}>
                {Icon && <Icon size={11} />}
                {s}
                <span style={{ fontSize:10, opacity:0.7, marginLeft:2 }}>
                  ({s === 'all' ? quotes.length : quotes.filter(q=>q.status===s).length})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quote cards */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="glow-card p-5 animate-pulse" style={{ height:80 }}>
              <div style={{ display:'flex', gap:16 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'var(--border)' }} />
                <div style={{ flex:1 }}>
                  <div style={{ height:12, width:'30%', background:'var(--border)', borderRadius:4, marginBottom:8 }} />
                  <div style={{ height:10, width:'60%', background:'var(--border)', borderRadius:4 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glow-card p-12 text-center">
          <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#4B7BFF,#7B4FE8)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', opacity:0.8 }}>
            <FileText size={26} color="#fff" />
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>
            {search || filter !== 'all' ? 'No quotes match your filters' : 'No quotes yet'}
          </p>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
            {search || filter !== 'all' ? 'Try adjusting your search or filter.' : 'Create your first quote to get started.'}
          </p>
          {!search && filter === 'all' && (
            <button onClick={() => navigate('/quotes/new')}
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', background:'linear-gradient(135deg,#00E5C8,#4B7BFF)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              <Plus size={14} /> Create first quote
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 animate-fade-up-delay-3">
          {filtered.map((q) => {
            const st = STATUS[q.status] || STATUS.draft;
            const isAccepted = q.status === 'accepted';
            return (
              <div key={q.id}
                onClick={() => navigate(`/quotes/${q.id}`)}
                className="glow-card"
                style={{ padding:'14px 16px', cursor:'pointer', transition:'all 0.18s cubic-bezier(0.4,0,0.2,1)' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(75,123,255,0.12)'; e.currentTarget.style.borderColor='#4B7BFF44'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='var(--border)'; }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>

                  {/* Status dot + number */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:90 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:st.dot, flexShrink:0 }} />
                    <span style={{ fontSize:11, fontWeight:700, color:st.color, fontFamily:'monospace', letterSpacing:'0.5px' }}>{q.number}</span>
                  </div>

                  {/* Client */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {q.client_name || q.client_biz || '—'}
                    </p>
                    {q.client_biz && q.client_name && (
                      <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{q.client_biz}</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20, background:st.bg, color:st.color, flexShrink:0, letterSpacing:'0.4px', textTransform:'uppercase' }}>
                    {q.status}
                  </span>

                  {/* Views */}
                  {q.view_count > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>
                      <Eye size={11} />{q.view_count}
                    </div>
                  )}

                  {/* Amount */}
                  <div style={{ textAlign:'right', flexShrink:0, minWidth:80 }}>
                    <p style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>{fmt(q.setup_total)}</p>
                    {q.monthly_total > 0 && (
                      <p style={{ fontSize:10, color:'var(--text-muted)' }}>+{fmt(q.monthly_total)}/mo</p>
                    )}
                  </div>

                  {/* Date */}
                  <div style={{ textAlign:'right', flexShrink:0, minWidth:60, display:'none' }} className="hidden md:block">
                    <p style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtDate(q.created_at)}</p>
                    <p style={{ fontSize:10, color:'var(--text-muted)', opacity:0.6 }}>{daysAgo(q.created_at)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {!isAccepted && q.status !== 'cancelled' && (
                      <button onClick={e => handleConvert(q.id, e)}
                        style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, padding:'5px 10px', borderRadius:7, background:'linear-gradient(135deg,#4B7BFF,#7B4FE8)', color:'#fff', border:'none', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                        <ArrowRight size={10} /> Invoice
                      </button>
                    )}
                    <button onClick={e => handleDelete(q.id, e)}
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
