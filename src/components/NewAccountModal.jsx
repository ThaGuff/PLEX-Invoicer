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
  const { createAccount, switchAccount, addCustomSection, addCustomItem } = useAccount();

  const [url,         setUrl]         = useState('');
  const [scanning,    setScanning]    = useState(false);
  const [scanMsg,     setScanMsg]     = useState(null);
  const [scannedSvcs, setScannedSvcs] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', website: '',
    primaryColor: '#13B5EA', logoInitial: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleScan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setScanMsg(null);

    const result = await scrapeWebsite(url.trim());
    setScanning(false);

    if (result.success && result.data) {
      const d = result.data;
      setForm(f => ({
        ...f,
        name:        f.name  || d.businessName || '',
        email:       f.email || d.email        || '',
        phone:       f.phone || d.phone        || '',
        website:     url.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
        logoInitial: f.logoInitial || d.businessName?.[0]?.toUpperCase() || '',
      }));

      if (d.services?.length) {
        setScannedSvcs(d.services);
        setScanMsg({
          type: 'success',
          text: `Found ${d.businessName || 'the business'}${d.pricingFound ? ' with pricing' : ''}. ${d.services.length} service${d.services.length !== 1 ? 's' : ''} will be imported when you create the account.`,
        });
      } else {
        setScanMsg({
          type: 'info',
          text: `Found ${d.businessName || 'the business'} — info pre-filled below. No service listings detected on the page.`,
        });
      }
    } else {
      setScanMsg({ type: 'error', text: result.error || 'Could not scan the site.' });
    }
  };

  const handleCreate = () => {
    if (!form.name.trim()) return;

    const acc = createAccount({
      ...form,
      logoInitial: form.logoInitial || form.name[0].toUpperCase(),
    });

    // Import any scraped services into the new account
    if (scannedSvcs.length) {
      const secId = addCustomSection(acc.id, { label: `Imported — ${form.name}` });
      scannedSvcs.forEach(svc => {
        addCustomItem(acc.id, {
          sectionId: secId,
          name:    svc.name        || 'Service',
          desc:    svc.description || '',
          setup:   Number(svc.setupPrice   || svc.oneTimePrice || 0) || 0,
          monthly: Number(svc.monthlyPrice || 0) || 0,
        });
      });
    }

    switchAccount(acc.id);
    onCreated?.(acc);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
          <h2 className="text-base font-bold text-ink">Add new account</h2>
          <button onClick={onClose}><X size={18} className="text-ink-muted hover:text-ink" /></button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>

          {/* Website scanner */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1.5">
              Business website
              <span className="ml-1 normal-case font-normal text-ink-muted">(optional — Claude will scan it automatically)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="https://yourbusiness.com" className="field pl-8"
                  onKeyDown={e => e.key === 'Enter' && !scanning && handleScan()} />
              </div>
              <button onClick={handleScan} disabled={!url.trim() || scanning}
                className="btn-primary px-4 disabled:opacity-50 flex items-center gap-2">
                {scanning ? <><Loader size={13} className="animate-spin" /> Scanning...</> : 'Scan'}
              </button>
            </div>

            {scanMsg && (
              <div className={`mt-2 flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
                scanMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                scanMsg.type === 'error'   ? 'bg-red-50 text-red-700 border-red-200' :
                                             'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {scanMsg.type === 'success'
                  ? <CheckCircle size={13} className="shrink-0 mt-0.5" />
                  : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                <span>{scanMsg.text}</span>
              </div>
            )}
          </div>

          {/* Account details */}
          <div className="border-t pt-4" style={{ borderColor: '#E5E8EB' }}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Account details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'name',        label: 'Business name',      ph: 'Schrimsher Powerwash', span: 2 },
                { k: 'email',       label: 'Email',              ph: 'hello@business.com' },
                { k: 'phone',       label: 'Phone',              ph: '(256) 000-0000' },
                { k: 'website',     label: 'Website',            ph: 'schrimsherpowerwash.com' },
                { k: 'logoInitial', label: 'Logo letter (1 char)', ph: 'S' },
              ].map(f => (
                <div key={f.k} className={f.span === 2 ? 'col-span-2' : ''}>
                  <label className="text-xs text-ink-muted block mb-1">{f.label}</label>
                  <input type="text" value={form[f.k]}
                    onChange={e => set(f.k, e.target.value)}
                    placeholder={f.ph}
                    maxLength={f.k === 'logoInitial' ? 1 : undefined}
                    className="field" />
                </div>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-2">Brand color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => set('primaryColor', c)}
                  className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                  style={{ background: c, outline: form.primaryColor === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
              <input type="color" value={form.primaryColor}
                onChange={e => set('primaryColor', e.target.value)}
                className="w-7 h-7 rounded-lg border cursor-pointer"
                style={{ borderColor: '#E5E8EB' }} title="Pick custom color" />
            </div>
          </div>

          {/* Preview */}
          {form.name && (
            <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: '#E5E8EB', background: '#FAFAF8' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: form.primaryColor }}>
                {(form.logoInitial || form.name[0] || 'A').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{form.name}</p>
                <p className="text-xs text-ink-muted">{form.website || form.email || 'No contact yet'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: '#E5E8EB', background: '#FAFAF8' }}>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleCreate} disabled={!form.name.trim()}
            className="btn-primary disabled:opacity-40">
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
