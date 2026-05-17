import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }

export default function PublicQuote() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.quotes.getPublic(token)
      .then(q => { setQuote(q); if (q.status === 'accepted') setAccepted(true); })
      .catch(() => setError('Quote not found or link has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await api.quotes.accept(token);
      setAccepted(true);
      setQuote(q => ({ ...q, status: 'accepted' }));
    } catch (e) { setError(e.message); }
    finally { setAccepting(false); }
  };

  const accent = quote?.primary_color || '#13B5EA';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
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

  const isExpired = quote.valid_days && new Date(quote.created_at) < new Date(Date.now() - quote.valid_days * 86400000);
  const groupedItems = {};
  (quote.items || []).forEach(item => {
    const key = item.section_label || 'Services';
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push(item);
  });

  return (
    <div className="min-h-screen" style={{ background: '#F5F7F8' }}>
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: '#E5E8EB' }}>
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {quote.logo_url
              ? <img src={quote.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain border" style={{ borderColor:'#E5E8EB' }}/>
              : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: accent }}>
                  {(quote.logo_initial || quote.agency_name?.[0] || 'A').toUpperCase()}
                </div>
            }
            <span className="font-bold text-ink text-sm">{quote.agency_name}</span>
          </div>
          <span className="text-xs text-ink-muted">{quote.agency_website}</span>
        </div>
        <div className="h-0.5" style={{ background: accent }} />
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8">
        {/* Quote header */}
        <div className="card p-6 mb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Quote</p>
              <h1 className="text-2xl font-bold text-ink">{quote.number}</h1>
              <p className="text-sm text-ink-muted mt-1">
                Prepared for <strong>{quote.client_name}</strong>
                {quote.client_biz ? ` · ${quote.client_biz}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-muted mb-1">
                {quote.billing_mode === 'annual' ? 'Annual plan' : 'Month-to-month'}
              </p>
              {isExpired && !accepted ? (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  Expired
                </span>
              ) : (
                <div className="flex items-center gap-1 text-xs text-ink-muted">
                  <Clock size={11} />
                  Valid {quote.valid_days} days
                </div>
              )}
            </div>
          </div>

          {/* Billing info */}
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border"
            style={{ background: accent + '0D', borderColor: accent + '30', color: accent }}>
            {quote.billing_mode === 'annual'
              ? `Annual plan — ${quote.yearly_discount}% off monthly rates · 12-month commitment`
              : 'Month-to-month — no long-term commitment required'}
          </div>
        </div>

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
                      {item.monthly_price > 0 && (
                        <p className="text-sm font-semibold text-ink">{fmt(item.monthly_price)}/mo</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Totals */}
        <div className="card p-5 mb-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">One-time setup</span>
              <span className="font-medium tabular-nums">{fmt(quote.setup_total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Monthly recurring</span>
              <span className="font-medium tabular-nums">{fmt(quote.monthly_total)}/mo</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-3 border-t" style={{ borderColor: '#E5E8EB' }}>
              <span>Total due today</span>
              <span style={{ color: accent }}>{fmt(quote.setup_total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="card p-5 mb-5">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Notes & terms</p>
            <p className="text-sm text-ink-muted leading-relaxed">{quote.notes}</p>
          </div>
        )}

        {/* Accept button */}
        {accepted ? (
          <div className="card p-6 text-center">
            <CheckCircle size={36} className="mx-auto mb-3" style={{ color: '#16a34a' }} />
            <h2 className="text-lg font-bold text-ink mb-1">Quote accepted!</h2>
            <p className="text-sm text-ink-muted">
              {quote.agency_name} will be in touch shortly to get started.
            </p>
          </div>
        ) : isExpired ? (
          <div className="card p-6 text-center">
            <AlertCircle size={36} className="mx-auto mb-3 text-red-400" />
            <h2 className="text-lg font-bold text-ink mb-1">Quote has expired</h2>
            <p className="text-sm text-ink-muted">Please contact {quote.agency_name} for an updated quote.</p>
            {quote.agency_email && (
              <a href={`mailto:${quote.agency_email}`} className="mt-3 inline-block text-sm font-semibold"
                style={{ color: accent }}>
                {quote.agency_email}
              </a>
            )}
          </div>
        ) : (
          <button onClick={handleAccept} disabled={accepting}
            className="w-full py-4 text-base font-bold text-white rounded-xl transition-all disabled:opacity-50"
            style={{ background: accent }}>
            {accepting ? 'Accepting...' : `Accept this quote — ${fmt(quote.setup_total)} due today`}
          </button>
        )}

        <p className="text-center text-xs text-ink-muted mt-4">
          Powered by {quote.agency_name} · {quote.agency_website}
        </p>
      </div>
    </div>
  );
}
