import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: '#64748B', bg: '#F1F5F9' },
  sent:     { label: 'Sent',     color: '#3DD68C', bg: '#F0FDF4' },
  viewed:   { label: 'Viewed',   color: '#64748B', bg: '#F1F5F9' },
  accepted: { label: 'Approved', color: '#3DD68C', bg: '#F0FDF4' },
  invoiced: { label: 'Invoiced', color: '#3DD68C', bg: '#F0FDF4' },
  cancelled:{ label: 'Cancelled',color: '#9CA3AF', bg: '#F9FAFB' },
};

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }
function fmtDate(s) { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return s; } }
function daysAgo(s) { if (!s) return null; const d = Math.floor((Date.now() - new Date(s)) / 86400000); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`; }

function StatusBadge({ status }) {
  const s = (status || 'draft').toLowerCase();
  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.draft;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

export default function QuotesList() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [converting, setConverting] = useState(null);

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
    try {
      await api.quotes.delete(id);
      setQuotes(q => q.filter(x => x.id !== id));
    } catch (err) {
      alert('Failed to delete: ' + (err.message || 'Unknown error'));
    }
  };

  const handleConvert = async (id, e) => {
    e.stopPropagation();
    if (converting) return;
    if (!confirm('Convert this quote to an invoice?')) return;
    setConverting(id);
    try {
      const inv = await api.quotes.convert(id);
      if (!inv?.id) throw new Error('No invoice ID returned');
      setQuotes(qs => qs.map(q => q.id === id ? { ...q, status: 'invoiced' } : q));
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      alert('Failed to create invoice. Please try again.');
    } finally {
      setConverting(null);
    }
  };

  const filtered = quotes.filter(q => {
    const matchSearch = !search || [q.client_name, q.client_biz, q.number].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || q.status === filter;
    return matchSearch && matchFilter;
  });

  const total = quotes.length;
  const accepted = quotes.filter(q => q.status === 'accepted').length;
  const pending = quotes.filter(q => ['sent', 'viewed'].includes(q.status)).length;
  const pipelineValue = quotes.filter(q => ['draft','sent','viewed','accepted'].includes(q.status)).reduce((s, q) => s + (q.setup_total || 0), 0);

  const FILTERS = [
    { id: 'all', label: 'All', count: total },
    { id: 'draft', label: 'Draft', count: quotes.filter(q => q.status === 'draft').length },
    { id: 'sent', label: 'Sent', count: quotes.filter(q => q.status === 'sent').length },
    { id: 'viewed', label: 'Viewed', count: quotes.filter(q => q.status === 'viewed').length },
    { id: 'accepted', label: 'Approved', count: accepted },
    { id: 'invoiced', label: 'Invoiced', count: quotes.filter(q => q.status === 'invoiced').length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* Action bar */}
      <div style={{ padding: '10px clamp(14px,4vw,24px)', background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button onClick={() => navigate('/quotes/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#0D1A0D', color: '#C8FF00', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New quote
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ padding: 'clamp(12px,3vw,16px) clamp(14px,4vw,24px)', background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {[
            { label: 'Total quotes', value: total, color: '#0D1A0D' },
            { label: 'Pending response', value: pending, color: '#64748B' },
            { label: 'Approved', value: accepted, color: '#3DD68C' },
            { label: 'Pipeline value', value: fmt(pipelineValue), color: '#3DD68C' },
          ].map(s => (
            <div key={s.label} style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: '-0.04em' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ padding: '12px clamp(12px,4vw,24px)', background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search quotes, clients…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#3DD68C'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: '7px 12px', borderRadius: 7, border: '1.5px solid', borderColor: filter === f.id ? 'var(--forest)' : 'var(--border)', background: filter === f.id ? 'var(--forest)' : 'var(--bg-surface)', color: filter === f.id ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: filter === f.id ? 700 : 500, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.12s' }}>
              {f.label} {f.count > 0 && <span style={{ opacity: 0.7, fontSize: 11 }}>({f.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes list */}
      <div style={{ flex: 1, padding: 'clamp(14px,3vw,20px) clamp(14px,4vw,24px)' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ height: 72, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', animation: 'pulse 1.8s ease infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {search ? 'No quotes match your search' : 'No quotes yet'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {search ? 'Try a different search term.' : 'Create your first quote to get started.'}
            </p>
            {!search && (
              <button onClick={() => navigate('/quotes/new')}
                style={{ padding: '10px 20px', background: 'var(--forest)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Create first quote
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 90px 110px 120px', padding: '10px 20px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
              {['CLIENT', 'QUOTE #', 'STATUS', 'DATE', 'VALUE', 'ACTIONS'].map(col => (
                <span key={col} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{col}</span>
              ))}
            </div>
            {filtered.map((q, i) => {
              const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
              const isConverting = converting === q.id;
              return (
                <div key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 90px 110px 120px', padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer', transition: 'background 0.1s', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {/* Client */}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{q.client_name || q.client_biz || 'Unknown client'}</p>
                    {q.client_biz && q.client_name && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>{q.client_biz}</p>}
                  </div>
                  {/* Quote # */}
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#3DD68C', fontFamily: 'monospace' }}>{q.number || '—'}</span>
                  {/* Status */}
                  <StatusBadge status={q.status} />
                  {/* Date */}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{daysAgo(q.created_at)}</span>
                  {/* Value */}
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(q.setup_total)}</span>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    {q.status === 'accepted' && (
                      <button onClick={(e) => handleConvert(q.id, e)}
                        disabled={isConverting}
                        style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#3DD68C', color: '#fff', cursor: isConverting ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: isConverting ? 0.6 : 1 }}>
                        {isConverting ? '…' : '→ Invoice'}
                      </button>
                    )}
                    <button onClick={(e) => handleDelete(q.id, e)}
                      style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Del
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
