/**
 * Financing Calculator
 * Shows monthly payment options for quotes.
 * Supports: pay in full, 3-month, 6-month, 12-month, 24-month plans.
 * Mock integrations: Wisetack, Affirm, Stripe Financing structure.
 */
import React, { useState, useMemo } from 'react';
import { Calculator, ChevronDown, ChevronUp, CreditCard, Info } from 'lucide-react';

const GRAD = 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)';

const FINANCING_OPTIONS = [
  { months: 3,  apr: 0,     label: '3 months',  badge: '0% APR',    color: '#00E5C8', provider: 'Revanew Pay' },
  { months: 6,  apr: 0,     label: '6 months',  badge: '0% APR',    color: '#00E5C8', provider: 'Revanew Pay' },
  { months: 12, apr: 9.99,  label: '12 months', badge: '9.99% APR', color: '#4B7BFF', provider: 'Wisetack' },
  { months: 24, apr: 14.99, label: '24 months', badge: '14.99% APR',color: '#7B4FE8', provider: 'Affirm' },
];

function calcMonthly(principal, months, aprPct) {
  if (months === 0 || principal <= 0) return 0;
  if (aprPct === 0) return principal / months;
  const monthlyRate = aprPct / 100 / 12;
  const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  return payment;
}

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }
function fmt2(n) { return '$' + (n || 0).toFixed(2); }

export default function FinancingCalculator({ totalAmount = 0, onSelectFinancing }) {
  const [open, setOpen]           = useState(false);
  const [selected, setSelected]   = useState(null);
  const [deposit, setDeposit]     = useState(0);
  const [showDetails, setShowDetails] = useState(null);

  const financed = Math.max(0, totalAmount - deposit);

  const options = useMemo(() => FINANCING_OPTIONS.map(opt => {
    const monthly = calcMonthly(financed, opt.months, opt.apr);
    const totalCost = monthly * opt.months;
    const totalInterest = totalCost - financed;
    return { ...opt, monthly, totalCost, totalInterest };
  }), [financed]);

  const handleSelect = (opt) => {
    setSelected(opt.months);
    if (onSelectFinancing) {
      onSelectFinancing({ ...opt, deposit, financed, totalAmount });
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '0.5px dashed #4B7BFF', background: 'rgba(75,123,255,0.04)', cursor: 'pointer', color: '#4B7BFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calculator size={14} />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Add financing options to this quote</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          From {fmt2(calcMonthly(totalAmount, 6, 0))}/mo
        </div>
      </button>
    );
  }

  return (
    <div style={{ border: '0.5px solid rgba(75,123,255,0.3)', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', background: 'rgba(75,123,255,0.06)', borderBottom: '0.5px solid rgba(75,123,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={13} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Financing options</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Help clients say yes with flexible payments</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: '14px' }}>
        {/* Total + deposit */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Quote total</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(totalAmount)}</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Deposit (optional)</p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>$</span>
              <input type="number" value={deposit} min={0} max={totalAmount} step={50}
                onChange={e => setDeposit(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '7px 10px 7px 22px', border: '0.5px solid var(--border)', borderRadius: '7px', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' }} />
            </div>
          </div>
        </div>

        {deposit > 0 && (
          <div style={{ background: 'rgba(0,229,200,0.06)', border: '0.5px solid rgba(0,229,200,0.2)', borderRadius: '7px', padding: '8px 10px', marginBottom: '12px', fontSize: '11px', color: '#00E5C8', fontWeight: 600 }}>
            Financed amount: {fmt(financed)} (after {fmt(deposit)} deposit)
          </div>
        )}

        {/* Payment plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {/* Pay in full */}
          <button
            onClick={() => { setSelected(0); onSelectFinancing?.({ months: 0, monthly: totalAmount, totalCost: totalAmount, totalInterest: 0, deposit: 0, financed: totalAmount }); }}
            style={{ padding: '10px', borderRadius: '8px', border: selected === 0 ? '1.5px solid #00E5C8' : '0.5px solid var(--border)', background: selected === 0 ? 'rgba(0,229,200,0.06)' : 'var(--bg-page)', cursor: 'pointer', textAlign: 'left', fontFamily: "'Plus Jakarta Sans', sans-serif', transition: 'all 0.15s'" }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Pay in full</p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: selected === 0 ? '#00E5C8' : 'var(--text-primary)' }}>{fmt(totalAmount)}</p>
            <p style={{ fontSize: '10px', color: '#00E5C8', fontWeight: 700, marginTop: '2px' }}>No interest ✓</p>
          </button>

          {options.slice(0, 3).map(opt => (
            <button key={opt.months}
              onClick={() => handleSelect(opt)}
              style={{ padding: '10px', borderRadius: '8px', border: selected === opt.months ? `1.5px solid ${opt.color}` : '0.5px solid var(--border)', background: selected === opt.months ? opt.color + '08' : 'var(--bg-page)', cursor: 'pointer', textAlign: 'left', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.15s', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '8px', fontWeight: 700, color: '#fff', background: opt.color, padding: '1px 5px', borderRadius: '10px' }}>
                {opt.badge}
              </div>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{opt.label}</p>
              <p style={{ fontSize: '18px', fontWeight: 800, color: selected === opt.months ? opt.color : 'var(--text-primary)' }}>
                {fmt2(opt.monthly)}<span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>/mo</span>
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>via {opt.provider}</p>
            </button>
          ))}
        </div>

        {/* Selected plan summary */}
        {selected !== null && selected > 0 && (() => {
          const opt = options.find(o => o.months === selected);
          return opt ? (
            <div style={{ background: 'rgba(75,123,255,0.06)', border: '0.5px solid rgba(75,123,255,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#4B7BFF', marginBottom: '6px' }}>Selected: {opt.label} plan via {opt.provider}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Monthly', value: fmt2(opt.monthly) },
                  { label: 'Total cost', value: fmt(opt.totalCost) },
                  { label: 'Interest', value: opt.totalInterest > 0 ? fmt(opt.totalInterest) : 'None' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</p>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Disclaimer */}
        <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <Info size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>Financing subject to client approval. Rates shown are indicative. Wisetack and Affirm require separate merchant enrollment. Revanew Pay plans are handled directly between you and your client.</span>
        </div>
      </div>
    </div>
  );
}
