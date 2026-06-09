import React, { useState, useEffect } from 'react';
import { Eye, Mail, MousePointer, Clock, CheckCircle, RefreshCw, Send } from 'lucide-react';
import { api } from '../utils/api';

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: '#9ca3af', icon: null },
  sent:      { label: 'Sent',      color: '#C8E20A', icon: Send },
  delivered: { label: 'Delivered', color: '#C8E20A', icon: Mail },
  opened:    { label: 'Email opened', color: '#64748B', icon: Mail },
  viewed:    { label: 'Portal viewed', color: '#64748B', icon: Eye },
  clicked:   { label: 'Pay clicked', color: '#C8E20A', icon: MousePointer },
  paid:      { label: 'Paid',      color: '#C8E20A', icon: CheckCircle },
};

function fmtTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtDuration(seconds) {
  if (!seconds || seconds < 5) return null;
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function EngagementTimeline({ invoiceId, accent = '#C8E20A', compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) { setLoading(false); return; }
    api.tracking.timeline(invoiceId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (!invoiceId || loading) return (
    <div className="flex items-center gap-2 py-2">
      {loading && <RefreshCw size={13} className="animate-spin text-ink-muted" />}
      <span className="text-xs text-ink-muted">{loading ? 'Loading…' : 'No invoice selected.'}</span>
    </div>
  );

  if (!data) return (
    <p className="text-xs text-ink-muted italic">No engagement data yet — send the invoice to start tracking.</p>
  );

  const readStatus = data.read_status || 'sent';
  const cfg = STATUS_CONFIG[readStatus] || STATUS_CONFIG.sent;

  const milestones = [
    { key: 'sent',        label: 'Sent',          ts: data.sent_at,        Icon: Send,          color: '#C8E20A' },
    { key: 'opened',      label: 'Email opened',  ts: data.opened_at,      Icon: Mail,          color: '#64748B' },
    { key: 'viewed',      label: 'Portal viewed', ts: data.first_viewed_at, Icon: Eye,           color: '#64748B' },
    { key: 'clicked_pay', label: 'Pay clicked',   ts: data.clicked_pay_at, Icon: MousePointer,  color: '#C8E20A' },
    { key: 'paid',        label: 'Paid',          ts: data.paid_at,        Icon: CheckCircle,   color: '#C8E20A' },
  ].filter(m => m.ts);

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: cfg.color + '18', color: cfg.color }}>
          {cfg.label}
        </span>
        {data.view_count > 0 && (
          <span className="text-xs text-ink-muted flex items-center gap-1">
            <Eye size={11} /> {data.view_count}× · {fmtDuration(data.total_view_seconds) || '<5s'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Status badge + summary */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ background: cfg.color + '18', color: cfg.color }}>
          {cfg.label}
        </span>
        {data.view_count > 0 && (
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Eye size={12} /> Viewed {data.view_count} time{data.view_count !== 1 ? 's' : ''}
          </span>
        )}
        {data.total_view_seconds > 0 && (
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Clock size={12} /> {fmtDuration(data.total_view_seconds)} total time
          </span>
        )}
      </div>

      {/* Timeline */}
      {milestones.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-3 bottom-3 w-px" style={{ background: '#E5E8EB' }} />

          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={m.key} className="flex items-start gap-4 relative">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10"
                  style={{ background: m.color + '20', border: `1.5px solid ${m.color}` }}>
                  <m.Icon size={11} style={{ color: m.color }} />
                </div>
                <div className="pb-1">
                  <p className="text-xs font-semibold text-ink leading-none">{m.label}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{fmtTime(m.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {milestones.length === 0 && (
        <p className="text-xs text-ink-muted italic">No engagement data yet — send the invoice to start tracking.</p>
      )}
    </div>
  );
}
