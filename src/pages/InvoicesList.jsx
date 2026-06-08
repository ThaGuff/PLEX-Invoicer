import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { useNavigate } from 'react-router-dom';

const fmt$ = n => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSimple = n => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = s => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtDShort = s => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
const daysDiff = d => d ? Math.floor((Date.now() - new Date(d)) / 86400000) : 0;

const STATUS_CONFIG = {
  paid:     { label: 'Paid',    color: '#3DD68C', bg: '#F0FDF4' },
  generated:{ label: 'Sent',    color: '#3DD68C', bg: '#F0FDF4' },
  draft:    { label: 'Draft',   color: '#64748B', bg: '#F1F5F9' },
  overdue:  { label: 'Overdue', color: '#DC2626', bg: '#FEF2F2' },
  viewed:   { label: 'Viewed',  color: '#64748B', bg: '#F1F5F9' },
  partial:  { label: 'Partial', color: '#3DD68C', bg: '#F0FDF4' },
  void:     { label: 'Void',    color: '#9CA3AF', bg: '#F9FAFB' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

export default function InvoicesList() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
  const h = { Authorization: `Bearer ${token}` };

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('list');
  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/invoices?account_id=${account.id}`, { headers: h });
      if (r.ok) {
        const data = await r.json();
        const enriched = data.map(inv => {
          const od = inv.status !== 'paid' && inv.status !== 'void' && inv.due_date && inv.due_date < today;
          return { ...inv, status: od ? 'overdue' : inv.status };
        });
        setInvoices(enriched);
      }
    } catch {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const paid = invoices.filter(i => i.status === 'paid');
  const outstanding = invoices.filter(i => !['paid', 'void', 'draft'].includes(i.status));
  const overdue = invoices.filter(i => i.status === 'overdue');
  const totalRevenue = paid.reduce((s, i) => s + parseFloat(i.amount_paid || i.amount_due || 0), 0);
  const totalOutstanding = outstanding.reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);
  const totalOverdue = overdue.reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);
  const collectionRate = invoices.length > 0 ? Math.round(paid.length / invoices.length * 100) : 0;

  const filtered = invoices.filter(inv => {
    const matchFilter = filter === 'all' || inv.status === filter;
    const matchSearch = !search || [inv.number, inv.client_name, inv.client_email].some(f => (f || '').toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  // Payment profiles
  const paymentProfiles = {};
  invoices.forEach(inv => {
    if (!inv.client_name) return;
    if (!paymentProfiles[inv.client_name]) paymentProfiles[inv.client_name] = { paid: 0, late: 0, total: 0, revenue: 0 };
    paymentProfiles[inv.client_name].total++;
    if (inv.status === 'paid') { paymentProfiles[inv.client_name].paid++; paymentProfiles[inv.client_name].revenue += parseFloat(inv.amount_paid || 0); }
    if (inv.status === 'overdue') paymentProfiles[inv.client_name].late++;
  });

  const clientClass = name => {
    const p = paymentProfiles[name];
    if (!p || p.total === 0) return { label: 'New client', color: '#64748B' };
    const rate = p.paid / p.total;
    if (rate >= 0.95) return { label: 'Excellent payer', color: '#3DD68C' };
    if (rate >= 0.8) return { label: 'Reliable payer', color: '#3DD68C' };
    if (rate >= 0.6) return { label: 'Slow payer', color: '#64748B' };
    return { label: 'High-risk', color: '#DC2626' };
  };

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'generated', label: 'Sent' },
    { id: 'viewed', label: 'Viewed' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'paid', label: 'Paid' },
  ];

  const TABS = [
    { id: 'list', label: 'All invoices' },
    { id: 'collections', label: 'Collections' },
    { id: 'forecast', label: 'Cash flow' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Stat cards */}
      <div style={{ padding: 'clamp(14px,3vw,20px) clamp(14px,4vw,24px)', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
        <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: 'Total collected', value: fmtSimple(totalRevenue), sub: `${paid.length} paid invoices`, color: '#3DD68C' },
            { label: 'Outstanding', value: fmtSimple(totalOutstanding), sub: `${outstanding.length} awaiting payment`, color: '#64748B' },
            { label: 'Overdue', value: fmtSimple(totalOverdue), sub: overdue.length > 0 ? `${overdue.length} need immediate action` : 'None — all current', color: totalOverdue > 0 ? '#DC2626' : '#3DD68C' },
            { label: 'Collection rate', value: `${collectionRate}%`, sub: 'Paid vs total invoiced', color: collectionRate >= 80 ? '#3DD68C' : '#64748B' },
          ].map(s => (
            <div key={s.label} style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: '-0.04em', marginBottom: 2 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>



      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', padding: '0 clamp(12px,4vw,24px)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--forest)' : 'transparent'}`, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: '20px clamp(12px,4vw,24px)' }}>

        {/* ALL INVOICES TAB */}
        {activeTab === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Search + filter */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search invoices, clients…"
                  style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#3DD68C'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {FILTERS.map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)}
                    style={{ padding: '7px 12px', borderRadius: 7, border: '1.5px solid', borderColor: filter === f.id ? 'var(--forest)' : 'var(--border)', background: filter === f.id ? 'var(--forest)' : 'var(--bg-surface)', color: filter === f.id ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: filter === f.id ? 700 : 500, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.12s' }}>
                    {f.label}
                    {f.id !== 'all' && <span style={{ opacity: 0.7, marginLeft: 4 }}>({invoices.filter(i => i.status === f.id).length})</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoice table */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No invoices found</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Invoices are created by approving a quote and converting it.</p>
                  <button onClick={() => navigate('/quotes/new')}
                    style={{ padding: '10px 20px', background: 'var(--forest)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Start a quote
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 650 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                        {['Invoice', 'Client', 'Amount', 'Due date', 'Status', 'Actions'].map(col => (
                          <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(inv => {
                        const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                        return (
                          <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                            style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '13px 16px', fontWeight: 700, color: '#3DD68C', fontFamily: 'monospace', fontSize: 12 }}>{inv.number || 'Draft'}</td>
                            <td style={{ padding: '13px 16px' }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{inv.client_name || '—'}</p>
                              {inv.client_name && (
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: `${clientClass(inv.client_name).color}18`, color: clientClass(inv.client_name).color }}>
                                  {clientClass(inv.client_name).label}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '13px 16px', fontWeight: 800, color: 'var(--text-primary)', fontSize: 13 }}>{fmt$(inv.amount_due)}</td>
                            <td style={{ padding: '13px 16px', color: inv.status === 'overdue' ? '#DC2626' : 'var(--text-muted)', fontSize: 12, fontWeight: inv.status === 'overdue' ? 700 : 400 }}>
                              {fmtDShort(inv.due_date)}
                              {inv.status === 'overdue' && <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginTop: 1 }}>{daysDiff(inv.due_date)}d overdue</div>}
                            </td>
                            <td style={{ padding: '13px 16px' }}><StatusBadge status={inv.status} /></td>
                            <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => navigate(`/invoices/${inv.id}`)}
                                  style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  View
                                </button>
                                {['generated', 'viewed', 'overdue'].includes(inv.status) && (
                                  <button
                                    style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: inv.status === 'overdue' ? '#FEF2F2' : '#F0FDF4', color: inv.status === 'overdue' ? '#DC2626' : '#3DD68C', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {inv.status === 'overdue' ? 'Remind' : 'Follow up'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COLLECTIONS TAB */}
        {activeTab === 'collections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '16px 20px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 16 }}>Priority collections list</p>
              {overdue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#3DD68C', marginBottom: 4 }}>No overdue invoices — great job!</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>All your invoices are current.</p>
                </div>
              ) : overdue.sort((a, b) => parseFloat(b.amount_due || 0) - parseFloat(a.amount_due || 0)).map(inv => {
                const days = inv.due_date ? daysDiff(inv.due_date) : 0;
                const cls = clientClass(inv.client_name);
                return (
                  <div key={inv.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF2F2', border: '1.5px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#DC2626' }}>{days}d</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{inv.client_name}</p>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${cls.color}15`, color: cls.color, fontWeight: 700 }}>{cls.label}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{inv.number} · Due {fmtDShort(inv.due_date)}</p>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 12 }}>
                      <p style={{ fontSize: 16, fontWeight: 900, color: '#DC2626', letterSpacing: '-0.03em', margin: 0 }}>{fmt$(inv.amount_due)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: 'var(--forest)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Send reminder
                      </button>
                      <button onClick={() => navigate(`/invoices/${inv.id}`)}
                        style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Client payment profiles */}
            <div style={{ padding: '16px 20px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 16 }}>Client payment profiles</p>
              {Object.entries(paymentProfiles).slice(0, 10).map(([name, p]) => {
                const cls = clientClass(name);
                const rate = p.total > 0 ? Math.round(p.paid / p.total * 100) : 0;
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${cls.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: cls.color, flexShrink: 0 }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{p.total} invoices · {fmtSimple(p.revenue)} paid</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: cls.color }}>{cls.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{rate}% pay rate</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CASH FLOW TAB */}
        {activeTab === 'forecast' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Next 7 days', days: 7, color: '#3DD68C', icon: '📅' },
              { label: 'Next 30 days', days: 30, color: '#3DD68C', icon: '📊' },
              { label: 'Next 90 days', days: 90, color: '#3DD68C', icon: '🔮' },
            ].map(({ label, days, color, icon }) => {
              const due = outstanding.filter(i => {
                if (!i.due_date) return false;
                const diff = Math.floor((new Date(i.due_date) - Date.now()) / 86400000);
                return diff >= 0 && diff <= days;
              });
              const amt = due.reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);
              return (
                <div key={label} style={{ padding: '18px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>{fmtSimple(amt)}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{due.length} invoice{due.length !== 1 ? 's' : ''} due</p>
                  </div>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: `${color}10`, border: `1.5px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {icon}
                  </div>
                </div>
              );
            })}

            {/* Revenue leak */}
            {(invoices.filter(i => i.status === 'draft').length > 0 || overdue.length > 0) && (
              <div style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid #FECACA', background: '#FFF5F5' }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#DC2626', marginBottom: 12 }}>Revenue at risk</p>
                {invoices.filter(i => i.status === 'draft').length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #FECACA' }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{invoices.filter(i => i.status === 'draft').length} unsent draft invoices</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#DC2626' }}>{fmtSimple(invoices.filter(i => i.status === 'draft').reduce((s, i) => s + parseFloat(i.amount_due || 0), 0))}</p>
                  </div>
                )}
                {overdue.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{overdue.length} overdue invoice{overdue.length > 1 ? 's' : ''}</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#DC2626' }}>{fmtSimple(totalOverdue)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
