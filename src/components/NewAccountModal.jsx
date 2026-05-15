import React, { useState } from 'react';
import { X, Globe, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { scrapeWebsite } from '../utils/scraper';

const PRESET_COLORS = [
  '#13B5EA', '#6366f1', '#8b5cf6', '#ec4899',
  '#f97316', '#22c55e', '#14b8a6', '#1d4ed8',
  '#dc2626', '#d97706', '#1a1a1a', '#64748b',
];

export default function NewAccountModal({ onClose, onCreated }) {
  const { createAccount, switchAccount } = useAccount();

  const [step, setStep] = useState('form'); // form | scraping | scraped | done
  const [url, setUrl] = useState('');
  const [scrapeResult, setScrapeResult] = useState(null);
  const [scrapeError, setScrapeError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', website: '',
    primaryColor: '#13B5EA',
    logoInitial: '',
  });

  const handleScrape = async () => {
    if (!url) return;
    setStep('scraping');
    setScrapeError('');
    const result = await scrapeWebsite(url);
    if (result.success && result.data) {
      const d = result.data;
      setForm(f => ({
        ...f,
        name:    d.businessName || f.name,
        email:   d.email        || f.email,
        phone:   d.phone        || f.phone,
        website: url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        logoInitial: (d.businessName || f.name)?.[0]?.toUpperCase() || '',
      }));
      setScrapeResult(result.data);
      setStep('scraped');
    } else {
      setScrapeError(result.error || 'Could not fetch website info.');
      setStep('form');
    }
  };

  const handleCreate = () => {
    const acc = createAccount({
      ...form,
      logoInitial: form.logoInitial || form.name?.[0]?.toUpperCase() || 'A',
      scrapedServices: scrapeResult?.services || [],
    });
    switchAccount(acc.id);
    onCreated?.(acc);
    onClose();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
          <h2 className="text-base font-bold text-ink">Add new account</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Website scraper */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1.5">
              Business website <span className="normal-case font-normal">(optional — we'll pull info automatically)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yourbusiness.com"
                  className="field pl-8"
                  onKeyDown={e => e.key === 'Enter' && handleScrape()}
                />
              </div>
              <button
                onClick={handleScrape}
                disabled={!url || step === 'scraping'}
                className="btn-primary px-4 disabled:opacity-50"
              >
                {step === 'scraping' ? <Loader size={14} className="animate-spin" /> : 'Fetch'}
              </button>
            </div>

            {scrapeError && (
              <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {scrapeError}
              </div>
            )}
            {step === 'scraped' && scrapeResult && (
              <div className="mt-2 flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle size={13} className="shrink-0 mt-0.5" />
                Found: <strong>{scrapeResult.businessName}</strong>
                {scrapeResult.pricingFound && ' · Pricing detected — saved to catalog.'}
              </div>
            )}
          </div>

          <div className="border-t pt-4" style={{ borderColor: '#E5E8EB' }}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Account details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'name',    label: 'Business name', ph: 'Acme Roofing' },
                { k: 'email',   label: 'Email',         ph: 'hello@acme.com' },
                { k: 'phone',   label: 'Phone',         ph: '(256) 000-0000' },
                { k: 'website', label: 'Website',       ph: 'acmeroofing.com' },
                { k: 'logoInitial', label: 'Logo letter', ph: 'A' },
              ].map(f => (
                <div key={f.k} className={f.k === 'name' ? 'col-span-2' : ''}>
                  <label className="text-xs text-ink-muted block mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={form[f.k]}
                    onChange={e => set(f.k, e.target.value)}
                    placeholder={f.ph}
                    maxLength={f.k === 'logoInitial' ? 1 : undefined}
                    className="field"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-2">Brand color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set('primaryColor', c)}
                  className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: form.primaryColor === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
              <input
                type="color"
                value={form.primaryColor}
                onChange={e => set('primaryColor', e.target.value)}
                className="w-7 h-7 rounded-lg border cursor-pointer"
                title="Custom color"
                style={{ borderColor: '#E5E8EB' }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#E5E8EB', background: '#FAFAF8' }}>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleCreate} disabled={!form.name} className="btn-primary disabled:opacity-40">
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
