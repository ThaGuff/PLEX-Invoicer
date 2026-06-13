import React, { useState } from 'react';
import { DollarSign, X, CheckCircle, RefreshCw, Lock } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { getPlanLimits } from '../utils/planFeatures';

const ALL_PAYMENT_METHODS = [
  { key: 'stripe',  label: 'Stripe',   icon: '💳', fee: { pct: 2.9,  flat: 0.30 }, pro: true  },
  { key: 'square',  label: 'Square',   icon: '⬛', fee: { pct: 2.6,  flat: 0.10 }, pro: true  },
  { key: 'paypal',  label: 'PayPal',   icon: '🅿️', fee: { pct: 3.49, flat: 0.49 }, pro: true  },
  { key: 'zelle',   label: 'Zelle',    icon: '💜', fee: { pct: 0,    flat: 0    }, pro: false },
  { key: 'venmo',   label: 'Venmo',    icon: '💙', fee: { pct: 1.9,  flat: 0    }, pro: false },
  { key: 'check',   label: 'Check',    icon: '📋', fee: { pct: 0,    flat: 0    }, pro: false },
  { key: 'cash',    label: 'Cash',     icon: '💵', fee: { pct: 0,    flat: 0    }, pro: false },
  { key: 'ach',     label: 'ACH/Wire', icon: '🏦', fee: { pct: 0.8,  flat: 0    }, pro: true  },
  { key: 'other',   label: 'Other',    icon: '🔄', fee: { pct: 0,    flat: 0    }, pro: false },
];

function fmt(n) { return '$' + (Math.round((n || 0) * 100) / 100).toFixed(2); }

export default function MarkPaidModal({ invoice, onClose, onConfirm, accent = '#1A1A1A', saving }) {
  const { account } = useAccount();
  const planLimits  = getPlanLimits(account?.plan || 'starter');
  const allowedKeys = planLimits.payment_methods || ['cash', 'check', 'zelle', 'venmo', 'other'];

  const [method, setMethod]       = useState('cash');
  const [reference, setRef]       = useState('');
  const [amount, setAmount]       = useState(parseFloat(invoice?.amount_due || 0));
  const [taxRate, setTaxRate]     = useState(parseFloat(invoice?.tax_rate || 0));
  const [includeFee, setIncludeFee] = useState(false);
  const [customFee, setCustomFee] = useState('');

  const selectedM  = ALL_PAYMENT_METHODS.find(m => m.key === method) || ALL_PAYMENT_METHODS[0];
  const feeDefault = includeFee
    ? customFee !== '' ? parseFloat(customFee) || 0
      : (amount * selectedM.fee.pct / 100) + selectedM.fee.flat
    : 0;
  const taxAmount  = Math.round(amount * (taxRate / 100) * 100) / 100;
  const fee        = Math.round(feeDefault * 100) / 100;
  const net        = Math.round((amount - taxAmount - fee) * 100) / 100;

  const handleConfirm = () => onConfirm({ amount, payment_method: method, payment_reference: reference || null, tax_rate: taxRate, tax_amount: taxAmount, processing_fee: fee, net_amount: net });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,13,26,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg overflow-hidden" style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(8,13,26,0.4)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C6E404, #1A1A1A, #C6E404)' }}>
              <DollarSign size={15} color="#fff" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Mark as paid</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Invoice {invoice?.number}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        <div className="px-5 py-4 space-y-4" style={{ maxHeight: '65vh', overflowY: 'auto' }}>

          {/* Amount */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Amount received</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold" style={{ color: 'var(--text-muted)' }}>$</span>
              <input type="number" value={amount} min={0} step={0.01}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="field pl-7 text-lg font-bold" />
            </div>
          </div>

          {/* Payment method grid */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Payment method</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_PAYMENT_METHODS.map(m => {
                const allowed = allowedKeys.includes(m.key);
                const active  = method === m.key;
                return (
                  <div key={m.key} style={{ position: 'relative' }}>
                    {!allowed && (
                      <div style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 2, background: 'linear-gradient(135deg, #1A1A1A, #C6E404)', borderRadius: '8px', padding: '1px 5px', fontSize: '8px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Lock size={7} /> Pro
                      </div>
                    )}
                    <button
                      onClick={() => allowed && setMethod(m.key)}
                      disabled={!allowed}
                      className="w-full flex flex-col items-center gap-1 text-xs font-semibold py-2.5 px-1 rounded-xl transition-all"
                      style={{
                        border: active ? `1.5px solid ${accent}` : '1px solid var(--border)',
                        background: active ? accent + '12' : 'var(--bg-page)',
                        color: active ? accent : 'var(--text-muted)',
                        opacity: allowed ? 1 : 0.5,
                        cursor: allowed ? 'pointer' : 'not-allowed',
                      }}>
                      <span style={{ fontSize: '18px', lineHeight: 1 }}>{m.icon}</span>
                      {m.label}
                    </button>
                  </div>
                );
              })}
            </div>
            {!allowedKeys.includes(method) && (
              <p className="text-xs mt-2 text-center" style={{ color: '#1A1A1A' }}>
                💡 Upgrade to Pro to use Stripe, Square, PayPal & ACH processing
              </p>
            )}
          </div>

          {/* Reference */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Reference # <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <input value={reference} onChange={e => setRef(e.target.value)}
              className="field text-sm"
              placeholder={method === 'check' ? 'Check #' : method === 'zelle' ? 'Zelle transaction ID' : 'Transaction ID'} />
          </div>

          {/* Tax rate */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Tax rate (%)</label>
            <div className="flex items-center gap-3">
              <input type="number" value={taxRate} min={0} max={30} step={0.01}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="field w-28 text-sm" placeholder="0" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {taxRate > 0 ? `= ${fmt(taxAmount)} tax` : 'Enter % if applicable'}
              </span>
            </div>
          </div>

          {/* Processing fee */}
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-page)' }}>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-primary)', marginBottom: includeFee ? '8px' : 0 }}>
              <input type="checkbox" checked={includeFee} onChange={e => setIncludeFee(e.target.checked)} style={{ accentColor: accent }} />
              Track processing fee
              {selectedM.fee.pct > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({selectedM.label} default: {selectedM.fee.pct}%{selectedM.fee.flat > 0 ? ` + $${selectedM.fee.flat}` : ''})</span>}
            </label>
            {includeFee && (
              <input type="number" value={customFee} min={0} step={0.01}
                onChange={e => setCustomFee(e.target.value)}
                className="field text-sm" placeholder={`${fmt(feeDefault)} (auto)`} />
            )}
          </div>

          {/* Breakdown */}
          <div style={{ border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: 'var(--bg-page)', borderBottom: '0.5px solid var(--border)', fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Breakdown
            </div>
            {[
              { label: 'Gross collected',  value: fmt(amount),               color: 'var(--text-primary)' },
              ...(taxAmount > 0 ? [{ label: `Tax (${taxRate}%)`, value: `− ${fmt(taxAmount)}`, color: '#ef4444' }] : []),
              ...(fee > 0 ? [{ label: `${selectedM.label} fee`, value: `− ${fmt(fee)}`, color: '#C6E404' }] : []),
              { label: 'Net to you', value: fmt(Math.max(0, net)), color: '#C6E404', bold: true },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center px-3.5 py-2.5 text-sm" style={{ background: row.bold ? 'rgba(0,229,200,0.05)' : 'var(--bg-surface)', borderBottom: i < 3 ? '0.5px solid var(--border-subtle)' : 'none' }}>
                <span style={{ color: row.bold ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                <span style={{ color: row.color, fontWeight: row.bold ? 800 : 600, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: '0.5px solid var(--border)', background: 'var(--bg-page)' }}>
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #C6E404, #1A1A1A)' }}>
            {saving ? <><RefreshCw size={13} className="animate-spin" />Saving…</> : <><CheckCircle size={13} />Confirm payment</>}
          </button>
        </div>
      </div>
    </div>
  );
}
