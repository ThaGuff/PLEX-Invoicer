import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, RefreshCw, Calendar, Clock, ChevronDown, ChevronUp, BarChart2, TrendingUp as LineIcon, PieChart } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../utils/api';

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }

function MiniBar({ amount, max, color }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 32, background: 'var(--bg-page)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, opacity: 0.85, transition: 'width 0.6s ease', borderRadius: 4 }} />
      {amount > 0 && (
        <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 500, color: '#1a1a1a' }}>
          {fmt(amount)}
        </span>
      )}
    </div>
  );
}

export default function CashflowDashboard({ accountId, accent = '#C8E20A' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line' | 'pie'

  const load = async () => {
    if (!accountId) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.analytics.cashflow(accountId);
      setData(result);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [accountId]);

  if (loading) return (
    <div className="card p-6 flex items-center justify-center gap-2" style={{ minHeight: 160 }}>
      <RefreshCw size={16} className="animate-spin text-ink-muted" />
      <span className="text-sm text-ink-muted">Computing cashflow predictions…</span>
    </div>
  );

  if (error) return (
    <div className="card p-5 text-center">
      <p className="text-xs text-ink-muted">{error}</p>
      <button onClick={load} className="mt-2 text-xs text-ink-muted hover:text-ink underline">Retry</button>
    </div>
  );

  if (!data) return null;

  const { summary, weekly, predictions, client_profiles } = data;
  if (!summary) return null;   // guard: API returned data but summary key missing

  const maxWeek = Math.max(...(weekly || []).map(w => w.amount), 1);
  const weeks12 = (weekly || []).slice(0, 12);

  const summaryCards = [
    { label: 'Overdue now',   value: summary.overdue   ?? 0, color: '#ef4444' },
    { label: 'Next 30 days',  value: summary.next_30   ?? 0, color: accent },
    { label: 'Next 60 days',  value: summary.next_60   ?? 0, color: '#C8E20A' },
    { label: 'Next 90 days',  value: summary.next_90   ?? 0, color: '#C8E20A' },
  ];

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + '18' }}>
            <TrendingUp size={16} style={{ color: accent }} />
          </div>
          <div>
            <p className="text-sm font-bold text-ink leading-none">Predictive cash flow</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Based on avg {summary.global_dtp ?? 0} days-to-pay · {predictions?.length || 0} outstanding
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {/* Chart type selector */}
          {[
            { type: 'bar',  Icon: BarChart2,  label: 'Bar chart' },
            { type: 'line', Icon: TrendingUp, label: 'Line chart' },
            { type: 'pie',  Icon: PieChart,   label: 'Pie chart' },
          ].map(({ type, Icon, label }) => (
            <button key={type} onClick={() => setChartType(type)} title={label}
              style={{ padding:'4px 6px', borderRadius:6, border:'none', cursor:'pointer', transition:'all 0.15s',
                background: chartType === type ? accent + '20' : 'transparent',
                color: chartType === type ? accent : 'var(--text-muted)' }}>
              <Icon size={13} />
            </button>
          ))}
          <button onClick={load} className="p-1.5 text-ink-muted hover:text-ink" title="Refresh" style={{ marginLeft:4 }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-0 border-b" style={{ borderColor: 'var(--border)' }}>
        {summaryCards.map((c, i) => (
          <div key={c.label} className={`px-4 py-4 ${i < 3 ? 'border-r' : ''}`} style={{ borderColor: 'var(--border)' }}>
            <p className="text-lg font-bold tabular-nums" style={{ color: c.value > 0 ? c.color : '#9ca3af' }}>
              {fmt(c.value)}
            </p>
            <p className="text-xs text-ink-muted mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Chart — bar / line / pie based on chartType */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">12-week predicted inflow</p>
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeks12} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => '$'+Math.round(v/1000)+'k'} />
              <Tooltip formatter={(v) => ['$'+Math.round(v).toLocaleString(), 'Predicted']} contentStyle={{ fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', borderRadius: 8 }} />
              <Bar dataKey="amount" radius={[4,4,0,0]}>
                {weeks12.map((w, i) => <Cell key={i} fill={i === 0 ? '#ef4444' : i <= 2 ? accent : '#C8E20A'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {chartType === 'line' && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeks12} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => '$'+Math.round(v/1000)+'k'} />
              <Tooltip formatter={(v) => ['$'+Math.round(v).toLocaleString(), 'Predicted']} contentStyle={{ fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="amount" stroke={accent} strokeWidth={2.5} dot={{ r: 3, fill: accent }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {chartType === 'pie' && (
          <ResponsiveContainer width="100%" height={200}>
            <RePieChart>
              <Pie data={weeks12.filter(w => w.amount > 0)} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({name, value}) => `${name}: $${Math.round(value).toLocaleString()}`} labelLine={false}>
                {weeks12.filter(w => w.amount > 0).map((w, i) => (
                  <Cell key={i} fill={[accent, '#C8E20A', '#C8E20A', '#64748B', '#ef4444', '#C8E20A', '#C8E20A', '#C8E20A', '#10b981', '#64748B', '#06b6d4', '#C8E20A'][i % 12]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => '$'+Math.round(v).toLocaleString()} contentStyle={{ fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', borderRadius: 8 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </RePieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Expand: per-invoice predictions + client profiles */}
      <div className="px-5 pb-4 pt-2">
        <button
          onClick={() => setShowDetails(o => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors">
          {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showDetails ? 'Hide' : 'Show'} invoice predictions &amp; client profiles
        </button>

        {showDetails && (
          <div className="mt-3 space-y-4">
            {/* Per-invoice predictions */}
            {predictions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Invoice predictions</p>
                <div className="space-y-1">
                  {predictions.map(p => (
                    <div key={p.invoice_id} className="flex items-center gap-3 py-1.5 border-b last:border-0 text-xs" style={{ borderColor: 'var(--bg-page)' }}>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-ink">{p.client || 'Unknown client'}</span>
                        <span className="text-ink-muted ml-2">{p.dtp_source}</span>
                      </div>
                      <div className="flex items-center gap-1 text-ink-muted shrink-0">
                        <Calendar size={11} />
                        <span>{p.predicted_pay_date}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Clock size={11} className="text-ink-muted" />
                        <span className="text-ink-muted">{p.days_from_now < 0 ? `${Math.abs(p.days_from_now)}d overdue` : `${p.days_from_now}d`}</span>
                      </div>
                      <span className="font-semibold text-ink tabular-nums shrink-0">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client profiles */}
            {client_profiles?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Client pay behavior</p>
                <div className="space-y-1">
                  {client_profiles.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs py-1">
                      <span className="flex-1 text-ink font-medium">{p.client}</span>
                      <span className="text-ink-muted">{p.payments} payment{p.payments !== 1 ? 's' : ''}</span>
                      <span className="font-semibold" style={{ color: p.avg_dtp <= 7 ? '#C8E20A' : p.avg_dtp <= 30 ? accent : '#ef4444' }}>
                        avg {p.avg_dtp}d to pay
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!predictions?.length && !client_profiles?.length && (
              <p className="text-xs text-ink-muted italic">No outstanding invoices to predict. Start sending invoices to build your cash-flow picture.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
