import { canUseFeature } from '../utils/planFeatures';
import React, { useState, useEffect, useCallback } from 'react';
import { Download, FileText, RefreshCw, TrendingUp, DollarSign,
         Receipt, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';

const METHODS = {
  stripe:'Stripe', square:'Square', paypal:'PayPal', zelle:'Zelle',
  venmo:'Venmo', check:'Check', cash:'Cash', ach:'ACH/Wire', other:'Other',
};
const METHOD_COLORS = {
  stripe:'#635BFF', square:'#3E4348', paypal:'#003087', zelle:'#6D1ED4',
  venmo:'#008CFF', check:'#6B7280', cash:'#C8E20A', ach:'#C8E20A', other:'#9CA3AF',
};

function fmt(n)    { return '$' + Math.abs(Math.round((n||0)*100)/100).toLocaleString('en-US', { minimumFractionDigits: 2 }); }
function fmtPct(n) { return (n||0).toFixed(2) + '%'; }
function fmtDate(s){ if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); } catch { return s; } }

export default function TaxesPage() {
  const { account, activeId } = useAccount();
  const accent = account?.primary_color || '#C8E20A';

  const [loading, setLoading]   = useState(true);
  const [data, setData]         = useState(null);
  const [years, setYears]       = useState([]);
  const [year, setYear]         = useState('');
  const [quarter, setQuarter]   = useState('');
  const [expanded, setExpanded] = useState(null);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    if (!activeId) return;
    setLoading(true); setError('');
    try {
      const [taxData, yrsData] = await Promise.all([
        api.tax.summary(activeId, year || undefined, quarter || undefined),
        api.tax.years(activeId),
      ]);
      setData(taxData);
      setYears(yrsData.years || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [activeId, year, quarter]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Invoice #', 'Client', 'Paid Date', 'Payment Method', 'Reference', 'Amount', 'Tax Rate', 'Tax Amount', 'Processing Fee', 'Net Amount', 'Quote #'],
      ...data.invoices.map(inv => [
        inv.number, inv.client_name || inv.client_biz || '', fmtDate(inv.paid_at),
        METHODS[inv.payment_method] || inv.payment_method || 'Stripe',
        inv.payment_reference || '',
        inv.amount_paid, fmtPct(inv.tax_rate), inv.tax_amount,
        inv.processing_fee, inv.net_amount, inv.quote_number || '',
      ]),
      [],
      ['TOTALS', '', '', '', '',
        data.summary.total_collected, '', data.summary.total_tax_collected,
        data.summary.total_fees, data.summary.total_net, ''],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `plex-taxes-${year || 'all'}-${quarter ? 'Q'+quarter : 'full'}.csv`;
    a.click();
  };

  const exportPDF = async () => {
    if (!data) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    // Header
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('Tax Report', margin, y); y += 28;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`${account?.name || 'Invoice King'} · Period: ${year || 'All time'}${quarter ? ' Q'+quarter : ''}`, margin, y);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += 24;

    // Summary boxes
    doc.setTextColor(30);
    const boxes = [
      ['Collected', fmt(data.summary.total_collected)],
      ['Tax Collected', fmt(data.summary.total_tax_collected)],
      ['Processing Fees', fmt(data.summary.total_fees)],
      ['Net Revenue', fmt(data.summary.total_net)],
    ];
    const bw = (doc.internal.pageSize.width - margin*2) / 4 - 8;
    boxes.forEach(([label, val], i) => {
      const bx = margin + i * (bw + 8);
      doc.setFillColor(248, 248, 252);
      doc.roundedRect(bx, y, bw, 48, 4, 4, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
      doc.text(label.toUpperCase(), bx + 8, y + 16);
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
      doc.text(val, bx + 8, y + 34);
    });
    y += 64;

    // Table header
    const cols = [60, 90, 60, 70, 55, 55, 55, 60];
    const headers = ['Invoice', 'Client', 'Date', 'Method', 'Gross', 'Tax', 'Fee', 'Net'];
    doc.setFillColor(30, 30, 30);
    doc.rect(margin, y, doc.internal.pageSize.width - margin*2, 18, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255);
    let cx = margin + 4;
    headers.forEach((h, i) => { doc.text(h, cx, y + 12); cx += cols[i]; });
    y += 18;

    // Table rows
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30);
    data.invoices.forEach((inv, idx) => {
      if (y > doc.internal.pageSize.height - 60) { doc.addPage(); y = margin; }
      if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, doc.internal.pageSize.width - margin*2, 16, 'F'); }
      doc.setFontSize(7.5);
      const row = [
        inv.number, (inv.client_name || inv.client_biz || '').slice(0, 14),
        fmtDate(inv.paid_at), METHODS[inv.payment_method] || 'Stripe',
        fmt(inv.amount_paid), fmt(inv.tax_amount), fmt(inv.processing_fee), fmt(inv.net_amount),
      ];
      cx = margin + 4;
      row.forEach((v, i) => { doc.text(String(v), cx, y + 11); cx += cols[i]; });
      y += 16;
    });

    // Totals row
    y += 4;
    doc.setFillColor(accent.replace('#',''), 16);
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, doc.internal.pageSize.width - margin*2, 18, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    cx = margin + 4;
    const totals = ['TOTALS', `${data.summary.invoice_count} invoices`, '', '',
      fmt(data.summary.total_collected), fmt(data.summary.total_tax_collected),
      fmt(data.summary.total_fees), fmt(data.summary.total_net)];
    totals.forEach((v, i) => { doc.text(String(v), cx, y + 12); cx += cols[i]; });

    doc.save(`plex-taxes-${year || 'all'}.pdf`);
  };

  const summaryCards = data ? [
    { label: 'Total collected',    value: data.summary.total_collected,    color: accent,     icon: DollarSign },
    { label: 'Tax collected',      value: data.summary.total_tax_collected, color: '#dc2626',  icon: Receipt },
    { label: 'Processing fees',    value: data.summary.total_fees,          color: '#7c3aed',  icon: TrendingUp },
    { label: 'Net revenue',        value: data.summary.total_net,           color: '#C8E20A',  icon: TrendingUp },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-5 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Tax & Revenue Report</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Complete payment history with tax breakdown and export
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canUseFeature(account?.plan, 'csv_export') ? (
            <button onClick={exportCSV} disabled={!data || loading}
              className="btn-ghost flex items-center gap-1.5 text-sm disabled:opacity-40">
              <Download size={14} /> CSV
            </button>
          ) : (
            <button onClick={() => window.location.href='/billing'}
              className="btn-ghost flex items-center gap-1.5 text-sm opacity-60">
              <Download size={14} /> CSV
              <span style={{ fontSize:'8px', fontWeight:700, background:'linear-gradient(135deg,#1A1A1A,#C8E20A)', color:'#fff', padding:'1px 5px', borderRadius:'8px' }}>PRO</span>
            </button>
          )}
          <button onClick={exportPDF} disabled={!data || loading}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-40"
            style={{ background: accent }}>
            <FileText size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex items-center gap-4 flex-wrap">
        <Filter size={14} className="text-ink-muted shrink-0" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-ink-muted">Year</label>
          <select value={year} onChange={e => { setYear(e.target.value); setQuarter(''); }}
            className="field text-sm py-1.5 w-auto">
            <option value="">All time</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {year && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-ink-muted">Quarter</label>
            <select value={quarter} onChange={e => setQuarter(e.target.value)}
              className="field text-sm py-1.5 w-auto">
              <option value="">Full year</option>
              {['1','2','3','4'].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select>
          </div>
        )}
        <button onClick={load} className="ml-auto flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="card p-4 mb-5 text-sm text-red-600 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-ink-muted">
          <RefreshCw size={18} className="animate-spin" />
          <span>Loading tax data…</span>
        </div>
      ) : data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {summaryCards.map(c => (
              <div key={c.label} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-ink-muted">{c.label}</p>
                  <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: c.color + '18' }}>
                    <c.icon size={13} style={{ color: c.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold tabular-nums" style={{ color: c.value > 0 ? c.color : '#9CA3AF' }}>
                  {fmt(c.value)}
                </p>
                <p className="text-xs text-ink-muted mt-1">{data.summary.invoice_count} invoices</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {/* By payment method */}
            <div className="card p-5">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">By payment method</p>
              <div className="space-y-3">
                {Object.entries(data.by_payment_method || {}).map(([method, d]) => (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium" style={{ color: METHOD_COLORS[method] || '#6B7280' }}>
                        {METHODS[method] || method}
                      </span>
                      <span className="text-ink-muted text-xs">{d.count} invoice{d.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-muted">Collected</span>
                      <span className="font-semibold">{fmt(d.total)}</span>
                    </div>
                    {d.tax > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-muted">Tax</span>
                        <span className="text-red-600">{fmt(d.tax)}</span>
                      </div>
                    )}
                    <div className="h-px mt-2" style={{ background: '#F0F3F5' }} />
                  </div>
                ))}
                {Object.keys(data.by_payment_method || {}).length === 0 && (
                  <p className="text-xs text-ink-muted italic">No paid invoices yet</p>
                )}
              </div>
            </div>

            {/* Quarterly breakdown */}
            <div className="card p-5 lg:col-span-2">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Quarterly breakdown</p>
              {(data.by_quarter || []).length === 0 ? (
                <p className="text-xs text-ink-muted italic">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {data.by_quarter.map(q => (
                    <div key={q.period} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: '#F5F7F8' }}>
                      <span className="text-sm font-bold text-ink w-16 shrink-0">{q.period}</span>
                      <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                        <div><p className="text-ink-muted">Collected</p><p className="font-semibold">{fmt(q.collected)}</p></div>
                        <div><p className="text-ink-muted">Tax</p><p className="font-semibold text-red-600">{fmt(q.tax)}</p></div>
                        <div><p className="text-ink-muted">Fees</p><p className="font-semibold text-purple-600">{fmt(q.fees)}</p></div>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-ink-muted">Invoices</p>
                        <p className="font-bold">{q.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invoice detail table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5E8EB' }}>
              <p className="text-sm font-bold text-ink">Invoice history</p>
              <span className="text-xs text-ink-muted">{data.invoices.length} paid invoices</span>
            </div>

            {data.invoices.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-ink-muted">
                No paid invoices for the selected period.
              </div>
            ) : (
              <div>
                {/* Table header */}
                <div className="grid text-xs font-semibold text-ink-muted uppercase tracking-wider px-5 py-2.5"
                  style={{ gridTemplateColumns: '80px 1fr 100px 90px 90px 80px 80px 90px 36px', background: '#F5F7F8', borderBottom: '1px solid #E5E8EB' }}>
                  <span>Invoice</span><span>Client</span><span>Paid</span>
                  <span>Method</span><span>Gross</span><span>Tax</span>
                  <span>Fee</span><span>Net</span><span></span>
                </div>

                {data.invoices.map(inv => (
                  <div key={inv.id}>
                    <div
                      className="grid items-center px-5 py-3 border-b text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ gridTemplateColumns: '80px 1fr 100px 90px 90px 80px 80px 90px 36px', borderColor: '#F0F3F5' }}
                      onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}>
                      <span className="font-mono text-xs font-semibold" style={{ color: accent }}>{inv.number}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">{inv.client_name || inv.client_biz || '—'}</p>
                        {inv.quote_number && <p className="text-xs text-ink-muted">Quote {inv.quote_number}</p>}
                      </div>
                      <span className="text-xs text-ink-muted">{fmtDate(inv.paid_at)}</span>
                      <span className="text-xs font-medium" style={{ color: METHOD_COLORS[inv.payment_method] || '#6B7280' }}>
                        {METHODS[inv.payment_method] || 'Stripe'}
                      </span>
                      <span className="font-semibold tabular-nums">{fmt(inv.amount_paid)}</span>
                      <span className="text-red-600 tabular-nums text-xs">{inv.tax_amount > 0 ? fmt(inv.tax_amount) : '—'}</span>
                      <span className="text-purple-600 tabular-nums text-xs">{inv.processing_fee > 0 ? fmt(inv.processing_fee) : '—'}</span>
                      <span className="font-bold tabular-nums" style={{ color: '#C8E20A' }}>{fmt(inv.net_amount || inv.amount_paid)}</span>
                      <button className="text-ink-muted hover:text-ink">
                        {expanded === inv.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {expanded === inv.id && (
                      <div className="px-5 pb-4 pt-2" style={{ background: '#FAFBFF', borderBottom: '1px solid #E5E8EB' }}>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Invoice details */}
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Payment details</p>
                            {[
                              ['Payment method', METHODS[inv.payment_method] || 'Stripe'],
                              inv.payment_reference && ['Reference #', inv.payment_reference],
                              ['Tax rate', fmtPct(inv.tax_rate)],
                              ['Tax amount', fmt(inv.tax_amount)],
                              ['Processing fee', fmt(inv.processing_fee)],
                              ['Net to you', fmt(inv.net_amount || inv.amount_paid)],
                              ['Sent', fmtDate(inv.sent_at)],
                              ['Paid', fmtDate(inv.paid_at)],
                            ].filter(Boolean).map(([label, val]) => (
                              <div key={label} className="flex justify-between text-xs">
                                <span className="text-ink-muted">{label}</span>
                                <span className="font-medium text-ink">{val}</span>
                              </div>
                            ))}
                          </div>

                          {/* Line items */}
                          <div>
                            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Services / line items</p>
                            {inv.items?.length > 0 ? (
                              <div className="space-y-1">
                                {inv.items.map((item, i) => (
                                  <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0" style={{ borderColor: '#E5E8EB' }}>
                                    <div className="flex-1 min-w-0 pr-2">
                                      <p className="font-medium text-ink truncate">{item.name}</p>
                                      {item.description && <p className="text-ink-muted">{item.description.slice(0, 60)}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                      {item.setup_price > 0 && <p className="text-ink">{fmt(item.setup_price)}</p>}
                                      {item.monthly_price > 0 && <p className="text-ink-muted">{fmt(item.monthly_price)}/mo</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-ink-muted italic">No line items recorded</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
