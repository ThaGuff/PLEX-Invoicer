import React, { useState } from 'react';
import { DollarSign, CreditCard, X, CheckCircle, RefreshCw, Receipt, Info } from 'lucide-react';

const PAYMENT_METHODS = [
  { key: 'stripe',  label: 'Stripe',   icon: '💳', desc: 'Credit/debit card via Stripe' },
  { key: 'square',  label: 'Square',   icon: '⬛', desc: 'Square payment terminal' },
  { key: 'paypal',  label: 'PayPal',   icon: '🅿️', desc: 'PayPal transfer' },
  { key: 'zelle',   label: 'Zelle',    icon: '💜', desc: 'Zelle bank transfer' },
  { key: 'venmo',   label: 'Venmo',    icon: '💙', desc: 'Venmo payment' },
  { key: 'check',   label: 'Check',    icon: '📋', desc: 'Physical check' },
  { key: 'cash',    label: 'Cash',     icon: '💵', desc: 'Cash payment' },
  { key: 'ach',     label: 'ACH/Wire', icon: '🏦', desc: 'Bank transfer / wire' },
  { key: 'other',   label: 'Other',    icon: '🔄', desc: 'Other payment method' },
];

// Processing fee defaults by method
const FEE_DEFAULTS = {
  stripe:  { pct: 2.9,  flat: 0.30 },
  square:  { pct: 2.6,  flat: 0.10 },
  paypal:  { pct: 3.49, flat: 0.49 },
  zelle:   { pct: 0,    flat: 0 },
  venmo:   { pct: 1.9,  flat: 0 },
  check:   { pct: 0,    flat: 0 },
  cash:    { pct: 0,    flat: 0 },
  ach:     { pct: 0.8,  flat: 0 },
  other:   { pct: 0,    flat: 0 },
};

function fmt(n) { return '$' + (Math.round((n || 0) * 100) / 100).toFixed(2); }

export default function MarkPaidModal({ invoice, onClose, onConfirm, accent = '#13B5EA', saving }) {
  const [method, setMethod]     = useState('stripe');
  const [reference, setRef]     = useState('');
  const [amount, setAmount]     = useState(invoice?.amount_due || 0);
  const [taxRate, setTaxRate]   = useState(invoice?.tax_rate || 0);
  const [includeFee, setIncludeFee] = useState(true);
  const [customFee, setCustomFee]   = useState('');

  const feeDefaults = FEE_DEFAULTS[method] || { pct: 0, flat: 0 };
  const rawFee = includeFee
    ? customFee !== '' ? parseFloat(customFee) || 0
      : (amount * feeDefaults.pct / 100) + feeDefaults.flat
    : 0;

  const taxAmount  = Math.round(amount * (taxRate / 100) * 100) / 100;
  const fee        = Math.round(rawFee * 100) / 100;
  const net        = Math.round((amount - taxAmount - fee) * 100) / 100;

  const selectedMethod = PAYMENT_METHODS.find(m => m.key === method);
  const hasFee = feeDefaults.pct > 0 || feeDefaults.flat > 0;

  const handleConfirm = () => {
    onConfirm({
      amount,
      payment_method:    method,
      payment_reference: reference || null,
      tax_rate:          taxRate,
      tax_amount:        taxAmount,
      processing_fee:    fee,
      net_amount:        net,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + '18' }}>
              <DollarSign size={16} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Mark as paid</p>
              <p className="text-xs text-ink-muted">Invoice {invoice?.number}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={16} className="text-ink-muted" /></button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-2">Amount received</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted font-semibold">$</span>
              <input type="number" value={amount} min={0} step={0.01}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="field pl-7 text-lg font-bold" />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-2">Payment method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m.key} onClick={() => { setMethod(m.key); setCustomFee(''); }}
                  className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-xs font-semibold transition-all"
                  style={{
                    borderColor: method === m.key ? accent : '#E5E8EB',
                    background:  method === m.key ? accent + '10' : '#FAFAFA',
                    color:       method === m.key ? accent : '#7A7E85',
                  }}>
                  <span className="text-lg leading-none">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference number */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1.5">
              Reference / confirmation # <span className="font-normal">(optional)</span>
            </label>
            <input value={reference} onChange={e => setRef(e.target.value)}
              className="field text-sm"
              placeholder={method === 'check' ? 'Check number' : method === 'zelle' ? 'Zelle transaction ID' : 'Transaction ID or note'} />
          </div>

          {/* Tax rate */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1.5">Tax rate (%)</label>
            <div className="flex items-center gap-3">
              <input type="number" value={taxRate} min={0} max={30} step={0.01}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="field w-28 text-sm" placeholder="0" />
              <span className="text-xs text-ink-muted">% — Tax on {fmt(amount)} = <strong>{fmt(taxAmount)}</strong></span>
            </div>
          </div>

          {/* Processing fee */}
          <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: '#F5F7F8' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input type="checkbox" checked={includeFee} onChange={e => setIncludeFee(e.target.checked)}
                    style={{ accentColor: accent }} />
                  Track processing fee
                </label>
                {hasFee && (
                  <span className="text-xs text-ink-muted">
                    ({selectedMethod?.label} default: {feeDefaults.pct}%{feeDefaults.flat > 0 ? ` + $${feeDefaults.flat}` : ''})
                  </span>
                )}
              </div>
            </div>
            {includeFee && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted">Override fee ($)</span>
                <input type="number" value={customFee} min={0} step={0.01}
                  onChange={e => setCustomFee(e.target.value)}
                  className="field w-28 text-sm py-1" placeholder={`${fmt(rawFee)} (auto)`} />
                {customFee !== '' && (
                  <button onClick={() => setCustomFee('')} className="text-xs text-ink-muted hover:text-ink underline">reset</button>
                )}
              </div>
            )}
          </div>

          {/* Breakdown */}
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#E5E8EB' }}>
            <div className="px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider"
              style={{ background: '#F5F7F8', borderBottom: '1px solid #E5E8EB' }}>
              Payment breakdown
            </div>
            <div className="divide-y" style={{ '--divider': '#F5F7F8' }}>
              {[
                { label: 'Amount received',  value: fmt(amount),    color: '#1a1a1a' },
                { label: `Tax (${taxRate}%)`, value: `− ${fmt(taxAmount)}`, color: '#dc2626', show: taxAmount > 0 },
                { label: `${selectedMethod?.label} fee`, value: `− ${fmt(fee)}`, color: '#7c3aed', show: fee > 0 },
                { label: 'Net to you',        value: fmt(net < 0 ? 0 : net), color: accent, bold: true },
              ].filter(r => r.show !== false).map((row, i) => (
                <div key={i} className="flex justify-between items-center px-4 py-2.5 text-sm"
                  style={{ background: row.bold ? accent + '08' : 'white' }}>
                  <span className={row.bold ? 'font-bold text-ink' : 'text-ink-muted'}>{row.label}</span>
                  <span className="font-semibold tabular-nums" style={{ color: row.color, fontWeight: row.bold ? 700 : 600 }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-50"
            style={{ background: '#22c55e' }}>
            {saving ? <><RefreshCw size={14} className="animate-spin" />Saving…</>
              : <><CheckCircle size={14} />Confirm payment</>}
          </button>
        </div>
      </div>
    </div>
  );
}
