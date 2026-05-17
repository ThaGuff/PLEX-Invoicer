import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '../utils/api';

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }

export default function PublicInvoice() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // F1: Track view + heartbeat
  useEffect(() => {
    if (!token) return;
    // Fire view event
    api.tracking.view(token).catch(() => {});
    // Heartbeat every 30s
    const hb = setInterval(() => api.tracking.heartbeat(token, 30).catch(() => {}), 30000);
    return () => clearInterval(hb);
  }, [token]);

  useEffect(() => {
    api.invoices.getPublic(token)
      .then(setInvoice)
      .catch(() => setError('Invoice not found or link has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const justPaid = searchParams.get('paid') === '1';
  const accent = invoice?.primary_color || '#13B5EA';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#13B5EA', borderTopColor: 'transparent' }} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <p className="text-lg font-semibold text-ink">{error}</p>
      </div>
    </div>
  );

  const isPaid = invoice.status === 'paid' || justPaid;
  const groupedItems = {};
  (invoice.items || []).forEach(item => {
    const key = item.section_label || 'Services';
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push(item);
  });

  return (
    <div className="min-h-screen" style={{ background: '#F5F7F8' }}>
      <header className="bg-white border-b" style={{ borderColor: '#E5E8EB' }}>
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: accent }}>
              {(invoice.logo_initial || invoice.agency_name?.[0] || 'A').toUpperCase()}
            </div>
            <span className="font-bold text-ink text-sm">{invoice.agency_name}</span>
          </div>
          <span className="text-xs text-ink-muted">{invoice.agency_website}</span>
        </div>
        <div className="h-0.5" style={{ background: accent }} />
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8">
        {isPaid ? (
          <div className="card p-8 text-center mb-5">
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#16a34a' }} />
            <h1 className="text-2xl font-bold text-ink mb-2">Payment received!</h1>
            <p className="text-sm text-ink-muted">Thank you, {invoice.client_name}. This invoice has been paid.</p>
          </div>
        ) : (
          <div className="card p-6 mb-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Invoice</p>
                <h1 className="text-2xl font-bold text-ink">{invoice.number}</h1>
                <p className="text-sm text-ink-muted mt-1">
                  For <strong>{invoice.client_name}</strong>
                  {invoice.client_biz ? ` · ${invoice.client_biz}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-muted mb-1">Due date</p>
                <p className="text-sm font-semibold text-ink">
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Line items */}
        {Object.entries(groupedItems).map(([section, items]) => (
          <div key={section} className="card overflow-hidden mb-4">
            <div className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider"
              style={{ background: '#F5F7F8', borderColor: '#E5E8EB', color: accent }}>
              {section}
            </div>
            {items.map(item => (
              <div key={item.id} className="flex items-start justify-between px-5 py-3.5 border-b last:border-b-0"
                style={{ borderColor: '#F0F3F5' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{item.name}</p>
                  {item.description && <p className="text-xs text-ink-muted mt-0.5">{item.description}</p>}
                </div>
                <div className="text-right shrink-0 ml-6">
                  {item.is_included ? (
                    <span className="text-xs text-green-600 font-medium">Included</span>
                  ) : (
                    <>
                      {item.setup_price > 0 && <p className="text-xs text-ink-muted">{fmt(item.setup_price)} setup</p>}
                      {item.monthly_price > 0 && <p className="text-sm font-semibold text-ink">{fmt(item.monthly_price)}/mo</p>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Amount due */}
        <div className="card p-5 mb-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Amount due</span>
              <span className="font-bold text-xl tabular-nums" style={{ color: accent }}>{fmt(invoice.amount_due)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Amount paid</span>
                <span>{fmt(invoice.amount_paid)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pay button */}
        {!isPaid && invoice.stripe_payment_link && (
          <a href={invoice.stripe_payment_link} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 text-base font-bold text-white rounded-xl"
            style={{ background: accent }}>
            Pay {fmt(invoice.amount_due)} securely
            <ExternalLink size={16} />
          </a>
        )}

        {!isPaid && !invoice.stripe_payment_link && (
          <div className="card p-5 text-center">
            <p className="text-sm text-ink-muted">
              To pay this invoice, contact <strong>{invoice.agency_name}</strong>
              {invoice.agency_email ? ` at ${invoice.agency_email}` : ''}.
            </p>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-4 text-xs text-ink-muted text-center leading-relaxed">
            {invoice.notes}
          </div>
        )}

        <p className="text-center text-xs text-ink-muted mt-6">
          Invoice from {invoice.agency_name} · {invoice.agency_website}
        </p>
      </div>
    </div>
  );
}
