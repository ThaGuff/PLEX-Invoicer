import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, DollarSign, Clock, CreditCard } from 'lucide-react';
import { api } from '../utils/api';

export default function FeeRulesSettings({ accountId, accent = '#C6E404' }) {
  const [rules, setRules]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    api.feeRules.get(accountId).then(r => { setRules(r); setLoading(false); }).catch(() => setLoading(false));
  }, [accountId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.feeRules.save({ ...rules, account_id: accountId });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert('Save failed: ' + e.message); }
    setSaving(false);
  };

  const set = (k, v) => setRules(p => ({ ...p, [k]: v }));

  if (loading) return <div className="flex items-center gap-2 py-3"><RefreshCw size={13} className="animate-spin text-ink-muted"/><span className="text-xs text-ink-muted">Loading…</span></div>;
  if (!rules) return null;

  return (
    <div className="space-y-5">
      {/* Processing fee passthrough */}
      <div>
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Processing fee</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-muted block mb-1">Percentage (%)</label>
            <div className="relative">
              <input type="number" min={0} max={10} step={0.1} value={rules.processing_fee_pct}
                onChange={e => set('processing_fee_pct', parseFloat(e.target.value))}
                className="field text-sm" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1">Flat fee ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
              <input type="number" min={0} step={0.01} value={rules.processing_fee_flat}
                onChange={e => set('processing_fee_flat', parseFloat(e.target.value))}
                className="field pl-6 text-sm" />
            </div>
          </div>
        </div>
        <p className="text-xs text-ink-muted mt-1.5 opacity-70">Stripe default is 2.9% + $0.30. Set to 0 to not show fees to clients.</p>
      </div>

      {/* Early payment waiver */}
      <div className="border rounded-xl p-4" style={{ borderColor:'#E5E8EB' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Waive fee for early payment</p>
            <p className="text-xs text-ink-muted mt-0.5">Don't charge the processing fee if the client pays within N hours of receiving the invoice.</p>
          </div>
          <button
            onClick={() => set('waive_fee_if_early', rules.waive_fee_if_early ? 0 : 1)}
            className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
            style={{ background: rules.waive_fee_if_early ? accent : '#E5E8EB' }}>
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
              style={{ left: rules.waive_fee_if_early ? 24 : 4 }} />
          </button>
        </div>
        {rules.waive_fee_if_early ? (
          <div className="mt-3">
            <label className="text-xs text-ink-muted block mb-1">Waive fee if paid within</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={336} value={rules.early_pay_hours}
                onChange={e => set('early_pay_hours', parseInt(e.target.value))}
                className="field w-24 text-sm" />
              <span className="text-xs text-ink-muted">hours of sending</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* ACH-only threshold */}
      <div className="border rounded-xl p-4" style={{ borderColor:'#E5E8EB' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">ACH-only above threshold</p>
            <p className="text-xs text-ink-muted mt-0.5">Disable credit card payments and require ACH/bank transfer for large invoices.</p>
          </div>
          <button
            onClick={() => set('ach_only_enabled', rules.ach_only_enabled ? 0 : 1)}
            className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
            style={{ background: rules.ach_only_enabled ? accent : '#E5E8EB' }}>
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
              style={{ left: rules.ach_only_enabled ? 24 : 4 }} />
          </button>
        </div>
        {rules.ach_only_enabled ? (
          <div className="mt-3">
            <label className="text-xs text-ink-muted block mb-1">Require ACH if invoice exceeds</label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
                <input type="number" min={100} step={100} value={rules.ach_only_above}
                  onChange={e => set('ach_only_above', parseFloat(e.target.value))}
                  className="field pl-6 w-32 text-sm" />
              </div>
              <span className="text-xs text-ink-muted">— credit cards disabled above this amount</span>
            </div>
          </div>
        ) : null}
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50"
        style={{ background: saved ? '#C6E404' : accent }}>
        {saved ? <><CheckCircle size={14}/>Saved!</> : saving ? <><RefreshCw size={14} className="animate-spin"/>Saving…</> : <><Save size={14}/>Save fee rules</>}
      </button>
    </div>
  );
}
