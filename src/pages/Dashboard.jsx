import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';
import WeeklyScheduleWidget from '../components/WeeklyScheduleWidget';

function fmt(n) { return '$' + Math.abs(Math.round((n || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 }); }
function fmtFull(n) { return '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtDate(s) { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return s; } }
function today() { return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase(); }

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: '#64748B', bg: '#F1F5F9' },
  sent:     { label: 'Sent',     color: '#C6E404', bg: '#F0FDF4' },
  viewed:   { label: 'Viewed',   color: '#64748B', bg: '#F1F5F9' },
  paid:     { label: 'Paid',     color: '#C6E404', bg: '#F0FDF4' },
  overdue:  { label: 'Overdue',  color: '#DC2626', bg: '#FEF2F2' },
  accepted: { label: 'Approved', color: '#C6E404', bg: '#F0FDF4' },
  generated:{ label: 'Sent',     color: '#C6E404', bg: '#F0FDF4' },
};

function StatusBadge({ status }) {
  const s = (status || 'draft').toLowerCase();
  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.draft;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

// Top search + action bar
function TopBar({ onSearch }) {
  const navigate = useNavigate();
  const { account } = useAccount();
  const [query, setQuery] = React.useState('');

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onSearch) onSearch(val);
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      // Navigate to most relevant section based on query
      const q = query.toLowerCase();
      if (q.includes('quote') || q.includes('proposal')) navigate('/quotes');
      else if (q.includes('invoice') || q.includes('bill')) navigate('/invoices');
      else if (q.includes('client') || q.includes('contact') || q.includes('customer')) navigate('/contacts');
      else if (q.includes('doc') || q.includes('file')) navigate('/documents');
      else navigate('/contacts');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px clamp(12px,4vw,20px)', background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
      {/* Search — fills available space */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: 9, padding: '8px 12px', minWidth: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          onKeyDown={handleSearchKey}
          placeholder="Search clients, invoices, quotes…"
          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", width: '100%', minWidth: 0 }}
        />
        {query && (
          <button onClick={() => { setQuery(''); if (onSearch) onSearch(''); }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0, fontSize: 16, lineHeight: 1 }}>✕</button>
        )}
      </div>
      {/* New Quote button — desktop only shows text, mobile just shows + */}
      <button
        onClick={() => navigate('/quotes/new')} aria-label="Create new quote"
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'var(--forest)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", flexShrink: 0, whiteSpace: 'nowrap' }}
        onMouseEnter={e => e.currentTarget.style.background = '#1A2A1A'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--forest)'}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span className="hide-on-mobile">New quote</span>
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter invoices/quotes based on search
  const filteredInvoices = searchQuery
    ? invoices.filter(inv =>
        (inv.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(inv.amount_due || '').includes(searchQuery)
      )
    : invoices;

  const filteredQuotes = searchQuery
    ? quotes.filter(q =>
        (q.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.quote_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(q.setup_total || '').includes(searchQuery)
      )
    : quotes;

  useEffect(() => {
    if (!account?.id) return;
    setLoading(true);
    Promise.all([
      api.invoices.dashboard(account.id).catch(() => null),
      api.quotes.list(account.id).catch(() => []),
      api.invoices.list(account.id).catch(() => []),
    ]).then(([s, q, inv]) => {
      if (s && s.total_collected !== undefined && s.collected_all_time === undefined) s.collected_all_time = s.total_collected;
      if (s && s.this_month_invoiced !== undefined && s.invoiced_this_month === undefined) s.invoiced_this_month = s.this_month_invoiced;
      setStats(s);
      const quoteArr = Array.isArray(q) ? q : (q?.quotes || []);
      const invoiceArr = Array.isArray(inv) ? inv : (inv?.invoices || []);
      setQuotes(quoteArr.slice(0, 6));
      setInvoices(invoiceArr.filter(i => i.status !== 'paid' && i.status !== 'cancelled').slice(0, 6));
      setLoading(false);
    });
  }, [account?.id]);

  const today_str = new Date().toISOString().split('T')[0];
  const overdue = invoices.filter(i => i.due_date && i.due_date < today_str);
  const dueSoon = invoices.filter(i => {
    if (!i.due_date || i.due_date < today_str) return false;
    const diff = Math.floor((new Date(i.due_date) - Date.now()) / 86400000);
    return diff <= 7;
  });

  const collectableThisMonth = invoices.reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);
  const overdueAmt = overdue.reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);
  const dueSoonAmt = dueSoon.reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);
  const quotePipeline = quotes.filter(q => ['draft','sent','viewed','accepted'].includes(q.status)).reduce((s, q) => s + parseFloat(q.setup_total || 0), 0);
  const collected = parseFloat(stats?.total_collected || 0);

  // Action queue items
  const actionQueue = [
    ...overdue.slice(0, 2).map(inv => ({
      type: 'overdue',
      dot: '#DC2626',
      title: 'Send overdue reminder',
      desc: `${inv.client_name || 'Client'}, ${inv.number || 'INV'}, ${fmt(inv.amount_due)} due ${fmtDate(inv.due_date)}`,
      action: 'Send',
      onAction: () => navigate(`/invoices/${inv.id}`),
    })),
    ...quotes.filter(q => q.status === 'accepted').slice(0, 1).map(q => ({
      type: 'convert',
      dot: '#C6E404',
      title: 'Convert approved quote',
      desc: `${q.number || 'PQ'} for ${q.client_name || q.client_biz || 'client'} is approved`,
      action: 'Convert',
      onAction: () => navigate(`/quotes/${q.id}`),
    })),
    ...quotes.filter(q => q.status === 'sent').slice(0, 1).map(q => ({
      type: 'followup',
      dot: '#C6E404',
      title: 'Follow up on sent quote',
      desc: `${q.number} sent to ${q.client_name || q.client_biz || 'client'}`,
      action: 'Open',
      onAction: () => navigate(`/quotes/${q.id}`),
    })),
  ].slice(0, 4);

  // Pipeline breakdown by status
  const draftPipeline = quotes.filter(q => q.status === 'draft').reduce((s, q) => s + parseFloat(q.setup_total || 0), 0);
  const sentPipeline = quotes.filter(q => q.status === 'sent').reduce((s, q) => s + parseFloat(q.setup_total || 0), 0);
  const approvedPipeline = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + parseFloat(q.setup_total || 0), 0);
  const maxPipeline = Math.max(draftPipeline, sentPipeline, approvedPipeline, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar onSearch={setSearchQuery} />

      {/* Page content */}
      <div style={{ padding: 'clamp(16px,4vw,28px) clamp(14px,4vw,24px)', flex: 1 }}>
        {/* Date + title */}

        {/* Main grid: left content + right sidebar */}
        <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 16, alignItems: 'start' }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Collectable hero card */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Collectable this month</p>
              <p style={{ fontSize: 'clamp(36px,6vw,56px)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 12 }}>
                {loading ? '—' : fmtFull(collectableThisMonth)}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                {overdue.length > 0 ? `${overdue.length} invoice${overdue.length > 1 ? 's' : ''} need follow-up today.` : 'All invoices are current.'}{' '}
                {quotes.filter(q => q.status === 'accepted').length > 0 ? `One approved quote is ready to convert into an invoice.` : ''}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/invoices')}
                  style={{ padding: '10px 18px', background: 'var(--forest)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                  View invoices
                </button>
                <button onClick={() => navigate('/quotes/new')}
                  style={{ padding: '10px 18px', background: 'transparent', color: 'var(--text-primary)', border: '1.5px solid var(--border)', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                  + New quote
                </button>
              </div>

              {/* 4 stat boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                {[
                  { label: 'Overdue', value: fmtFull(overdueAmt), sub: `${overdue.length} invoice${overdue.length !== 1 ? 's' : ''} past due`, to: '/invoices' },
                  { label: 'Due next 7 days', value: fmtFull(dueSoonAmt), sub: `${dueSoon.length} scheduled payment${dueSoon.length !== 1 ? 's' : ''}`, to: '/invoices' },
                  { label: 'Quote pipeline', value: fmtFull(quotePipeline), sub: `${quotes.length} open quote${quotes.length !== 1 ? 's' : ''}`, to: '/quotes' },
                  { label: 'Collected', value: fmtFull(collected), sub: stats?.collected_trend ? `+${stats.collected_trend}% over last month` : 'All time', to: '/analytics' },
                ].map(card => (
                  <div key={card.label}
                    onClick={() => navigate(card.to)}
                    style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-raised)', cursor: 'pointer', transition: 'border-color 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#C0BFB8'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>{card.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 3 }}>{loading ? '—' : card.value}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices needing attention */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Invoices needing attention</h2>
                <button onClick={() => navigate('/invoices')}
                  style={{ fontSize: 12, fontWeight: 700, color: '#C6E404', background: 'none', border: 'none', cursor: 'pointer' }}>Open invoices</button>
              </div>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 120px 110px', gap: 0, padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
                {['CLIENT', 'INVOICE', 'STATUS', 'DUE', 'AMOUNT'].map(col => (
                  <span key={col} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{col}</span>
                ))}
              </div>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
              ) : invoices.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>All caught up!</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No outstanding invoices right now.</p>
                </div>
              ) : invoices.map((inv, i) => {
                const isOverdue = inv.due_date && inv.due_date < today_str;
                const nextAction = isOverdue ? 'Reminder ready' : inv.status === 'accepted' ? 'Convert to invoice' : inv.status === 'draft' ? 'Review line items' : 'Waiting on client';
                return (
                  <div key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 120px 110px', gap: 0, padding: '13px 20px', borderBottom: i < invoices.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                    className="inv-table-row"
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.client_name || '—'}</div>
                      <div className="row-terms-text" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{inv.description || inv.notes || ''}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'center' }}>{inv.number || '—'}</div>
                    <div style={{ alignSelf: 'center' }}><StatusBadge status={isOverdue ? 'overdue' : inv.status} /></div>
                    <div style={{ fontSize: 12, color: isOverdue ? '#DC2626' : 'var(--text-secondary)', fontWeight: isOverdue ? 700 : 500, alignSelf: 'center' }}>
                      {fmtDate(inv.due_date)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', alignSelf: 'center', textAlign: 'right' }}>{fmt(inv.amount_due)}</div>
                  </div>
                );
              })}
            </div>

            {/* Quote pipeline */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Quote pipeline</h2>
                <button onClick={() => navigate('/quotes')}
                  style={{ fontSize: 12, fontWeight: 700, color: '#C6E404', background: 'none', border: 'none', cursor: 'pointer' }}>Manage</button>
              </div>
              {[
                { label: 'Draft', value: draftPipeline, count: quotes.filter(q => q.status === 'draft').length, color: '#64748B' },
                { label: 'Sent', value: sentPipeline, count: quotes.filter(q => q.status === 'sent').length, color: '#C6E404' },
                { label: 'Approved', value: approvedPipeline, count: quotes.filter(q => q.status === 'accepted').length, color: '#C6E404' },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{row.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.count} quote{row.count !== 1 ? 's' : ''}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtFull(row.value)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: row.color, width: `${Math.round((row.value / maxPipeline) * 100)}%`, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Action queue */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Action queue</h2>
                <button onClick={() => navigate('/invoices')}
                  style={{ fontSize: 12, fontWeight: 700, color: '#C6E404', background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
              </div>
              {actionQueue.length === 0 ? (
                <div style={{ padding: '28px 18px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No actions needed — you're all caught up!</p>
                </div>
              ) : actionQueue.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderBottom: i < actionQueue.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{item.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</p>
                  </div>
                  <button onClick={item.onAction}
                    style={{ padding: '5px 12px', background: 'var(--forest)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                    {item.action}
                  </button>
                </div>
              ))}
            </div>

            {/* Cash-flow forecast */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Cash-flow forecast</h2>
                <button onClick={() => navigate('/analytics')}
                  style={{ fontSize: 12, fontWeight: 700, color: '#C6E404', background: 'none', border: 'none', cursor: 'pointer' }}>Details</button>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ marginBottom: 4 }}>
                  <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>{fmtFull((dueSoonAmt || 0) + (collected || 0) * 0.15)}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Expected next 60 days</p>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: '#F0FDF4', color: '#C6E404' }}>Healthy</span>
                  </div>
                </div>

                {/* Mini bar chart */}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-end', gap: 5, height: 80 }}>
                  {[0.3, 0.65, 0.9, 0.5, 0.4, 0.75, 0.55, 0.4].map((h, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: i % 2 === 0 ? '#DEDDD5' : '#C6E404', height: `${Math.round(h * 72)}px` }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  {['Jun 6', 'Jun 13', 'Jun 20', 'Jun 27', 'Jul 4', 'Jul 11', 'Jul 18', 'Jul 25'].map(d => (
                    <span key={d} style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{d.replace(' ', '\n')}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly Schedule Widget */}
            <WeeklyScheduleWidget />

            {/* Quick actions */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 12 }}>Quick actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'New quote', desc: 'Build & send in minutes', to: '/quotes/new' },
                  { label: 'Add client', desc: 'Save contact info', to: '/contacts' },
                  { label: 'View schedule', desc: 'Calendar & jobs', to: '/calendar' },
                  { label: 'Team workspace', desc: 'Chat and collaborate', to: '/workspace' },
                ].map(a => (
                  <button key={a.label} onClick={() => navigate(a.to)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s', fontFamily: "'Inter', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{a.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>{a.desc}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: stack columns */}
      <style>{`
        @media (max-width: 900px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 767px) {
          .inv-table-row { grid-template-columns: 1fr 80px !important; overflow: hidden !important; }
          .inv-table-row > :not(:first-child):not(:last-child) { display: none !important; }
          .inv-table-row > :first-child { min-width: 0; overflow: hidden; }
          .row-terms-text { display: none !important; }
        }
      `}</style>
    </div>
  );
}
