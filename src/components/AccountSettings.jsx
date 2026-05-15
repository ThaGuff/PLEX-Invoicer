import React, { useState } from 'react';
import {
  X, Plus, Trash2, Edit2, Check, ChevronDown, ChevronUp,
  Globe, Loader, AlertCircle, CheckCircle,
} from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { scrapeWebsite } from '../utils/scraper';

const PRESET_COLORS = [
  '#13B5EA', '#6366f1', '#8b5cf6', '#ec4899',
  '#f97316', '#22c55e', '#14b8a6', '#1d4ed8',
  '#dc2626', '#d97706', '#1a1a1a', '#64748b',
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESET_COLORS.map(c => (
        <button key={c} onClick={() => onChange(c)}
          className="w-6 h-6 rounded transition-transform hover:scale-110"
          style={{ background: c, outline: value === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
        />
      ))}
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-6 h-6 rounded border cursor-pointer" style={{ borderColor: '#E5E8EB' }} />
    </div>
  );
}

function ItemForm({ initial = {}, onSave, onCancel, isNew }) {
  const [v, setV] = useState({
    name: initial.name || '', desc: initial.desc || '',
    setup: initial.setup ?? '', monthly: initial.monthly ?? '',
  });
  const s = (k, val) => setV(p => ({ ...p, [k]: val }));

  const handleSave = () => {
    if (!v.name.trim()) return;
    onSave({ ...v, setup: parseFloat(v.setup) || 0, monthly: parseFloat(v.monthly) || 0 });
    if (isNew) setV({ name: '', desc: '', setup: '', monthly: '' });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input value={v.name} onChange={e => s('name', e.target.value)}
          placeholder="Service name *" className="field col-span-2 text-sm" />
        <input value={v.desc} onChange={e => s('desc', e.target.value)}
          placeholder="Short description" className="field col-span-2 text-sm" />
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted select-none">$</span>
          <input type="number" value={v.setup} min={0}
            onChange={e => s('setup', e.target.value)}
            placeholder="Setup fee" className="field pl-5 text-sm" />
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted select-none">$</span>
          <input type="number" value={v.monthly} min={0}
            onChange={e => s('monthly', e.target.value)}
            placeholder="Monthly" className="field pl-5 text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!v.name.trim()}
          className="btn-primary py-1.5 px-4 text-xs disabled:opacity-40 flex items-center gap-1">
          <Check size={12} />{isNew ? 'Add item' : 'Save'}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="btn-ghost py-1.5 px-3 text-xs">Cancel</button>
        )}
      </div>
    </div>
  );
}

function SectionEditor({ accountId, section, items }) {
  const { addCustomItem, updateCustomItem, deleteCustomItem, updateCustomSection, deleteCustomSection } = useAccount();
  const [open, setOpen] = useState(true);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelVal, setLabelVal] = useState(section.label);
  const [editingId, setEditingId] = useState(null);

  const saveLabel = () => {
    updateCustomSection(accountId, section.id, { label: labelVal });
    setEditingLabel(false);
  };

  return (
    <div className="border rounded-xl overflow-hidden mb-3" style={{ borderColor: '#E5E8EB' }}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        {editingLabel ? (
          <div className="flex items-center gap-2 flex-1">
            <input value={labelVal} onChange={e => setLabelVal(e.target.value)}
              className="field flex-1 py-1 text-sm font-semibold"
              onKeyDown={e => e.key === 'Enter' && saveLabel()} autoFocus />
            <button onClick={saveLabel} className="btn-primary py-1 px-3 text-xs">Save</button>
            <button onClick={() => setEditingLabel(false)} className="btn-ghost py-1 px-2 text-xs">✕</button>
          </div>
        ) : (
          <span className="text-sm font-semibold text-ink flex-1">{section.label}</span>
        )}
        {!editingLabel && (
          <>
            <button onClick={() => setEditingLabel(true)} className="text-ink-muted hover:text-ink p-1" title="Rename section">
              <Edit2 size={13} />
            </button>
            <button onClick={() => deleteCustomSection(accountId, section.id)}
              className="text-ink-muted hover:text-red-500 p-1" title="Delete section">
              <Trash2 size={13} />
            </button>
          </>
        )}
        <button onClick={() => setOpen(o => !o)} className="text-ink-muted p-1">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="p-4 space-y-3">
          {/* Existing items */}
          {items.map(item => (
            <div key={item.id} className="p-3 rounded-lg border" style={{ borderColor: '#F0F3F5', background: '#FAFAF8' }}>
              {editingId === item.id ? (
                <ItemForm initial={item}
                  onSave={patch => { updateCustomItem(accountId, item.id, patch); setEditingId(null); }}
                  onCancel={() => setEditingId(null)} />
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                    {item.desc && <p className="text-xs text-ink-muted mt-0.5">{item.desc}</p>}
                    <p className="text-xs text-ink-muted mt-1">
                      Setup: <strong>${item.setup || 0}</strong>
                      {' · '}Monthly: <strong>${item.monthly || 0}</strong>
                    </p>
                  </div>
                  <button onClick={() => setEditingId(item.id)}
                    className="text-ink-muted hover:text-ink p-1 shrink-0"><Edit2 size={13} /></button>
                  <button onClick={() => deleteCustomItem(accountId, item.id)}
                    className="text-ink-muted hover:text-red-500 p-1 shrink-0"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}

          {/* Add new item */}
          <div className="pt-2 border-t" style={{ borderColor: '#E5E8EB' }}>
            <p className="text-xs font-semibold text-ink-muted mb-2">Add line item</p>
            <ItemForm isNew onSave={v => addCustomItem(accountId, { sectionId: section.id, ...v })} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountSettings({ onClose }) {
  // Pull everything we need from context at the top level — no hooks in callbacks
  const {
    account, activeId,
    updateAccount, addCustomSection, deleteCustomSection, addCustomItem,
  } = useAccount();

  const [form, setForm] = useState({
    name:         account?.name         || '',
    email:        account?.email        || '',
    phone:        account?.phone        || '',
    website:      account?.website      || '',
    logoInitial:  account?.logoInitial  || '',
    primaryColor: account?.primaryColor || '#13B5EA',
  });
  const [saved, setSaved] = useState(false);

  const [scrapeUrl,  setScrapeUrl]  = useState('');
  const [scraping,   setScraping]   = useState(false);
  const [scrapeMsg,  setScrapeMsg]  = useState(null);
  const [newSecLabel, setNewSecLabel] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    updateAccount(activeId, {
      ...form,
      logoInitial: form.logoInitial || form.name?.[0]?.toUpperCase() || 'A',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeMsg(null);

    const result = await scrapeWebsite(scrapeUrl.trim());
    setScraping(false);

    if (result.success && result.data) {
      const d = result.data;

      // Pre-fill form if fields are empty
      if (!form.name  && d.businessName) set('name',  d.businessName);
      if (!form.email && d.email)        set('email', d.email);
      if (!form.phone && d.phone)        set('phone', d.phone);
      if (!form.logoInitial && d.businessName)
        set('logoInitial', d.businessName[0].toUpperCase());

      // Import services into a new section if found
      if (d.services?.length) {
        const secId = addCustomSection(activeId, { label: `Imported — ${d.businessName || scrapeUrl}` });
        // secId comes back as string from addCustomSection
        d.services.forEach(svc => {
          addCustomItem(activeId, {
            sectionId: secId,
            name:    svc.name        || 'Unnamed service',
            desc:    svc.description || '',
            setup:   Number(svc.setupPrice   || svc.oneTimePrice || 0) || 0,
            monthly: Number(svc.monthlyPrice || 0) || 0,
          });
        });
        setScrapeMsg({
          type: 'success',
          text: `Imported ${d.services.length} service${d.services.length !== 1 ? 's' : ''} from ${d.businessName || 'the website'}.${d.pricingFound ? ' Pricing was detected.' : ' No pricing was public — set prices manually.'}`,
        });
      } else {
        setScrapeMsg({
          type: 'info',
          text: `Found ${d.businessName || 'the business'} but no service listings were detected. Business info has been pre-filled — add services manually below.`,
        });
      }
    } else {
      setScrapeMsg({ type: 'error', text: result.error || 'Could not fetch the site.' });
    }
  };

  const addSection = () => {
    if (!newSecLabel.trim()) return;
    addCustomSection(activeId, { label: newSecLabel.trim() });
    setNewSecLabel('');
  };

  const secs  = account?.customSections || [];
  const items = account?.customItems    || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl shadow-xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: '#E5E8EB' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: form.primaryColor || '#13B5EA' }}>
              {(form.logoInitial || form.name?.[0] || 'A').toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Account settings</h2>
              <p className="text-xs text-ink-muted">{account?.name}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={18} className="text-ink-muted hover:text-ink" /></button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Branding ── */}
          <section>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Branding</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'name',        label: 'Business name',         ph: 'Acme Powerwash',    span: 2 },
                { k: 'email',       label: 'Email',                  ph: 'hello@acme.com' },
                { k: 'phone',       label: 'Phone',                  ph: '(256) 000-0000' },
                { k: 'website',     label: 'Website',                ph: 'acmepowerwash.com' },
                { k: 'logoInitial', label: 'Logo letter (1 char)',    ph: 'A' },
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
            <div className="mt-3">
              <label className="text-xs text-ink-muted block mb-2">Primary brand color</label>
              <ColorPicker value={form.primaryColor} onChange={v => set('primaryColor', v)} />
            </div>
          </section>

          {/* ── Website import ── */}
          <section className="border rounded-xl p-4" style={{ borderColor: '#E5E8EB' }}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
              Import from website
            </p>
            <p className="text-xs text-ink-muted mb-3">
              Enter a business website URL — Claude will visit the page and extract services and pricing automatically.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input type="text" value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  placeholder="https://yourbusiness.com"
                  className="field pl-8"
                  onKeyDown={e => e.key === 'Enter' && !scraping && handleScrape()} />
              </div>
              <button onClick={handleScrape} disabled={!scrapeUrl.trim() || scraping}
                className="btn-primary px-4 disabled:opacity-50 flex items-center gap-2">
                {scraping ? <><Loader size={13} className="animate-spin" /> Scanning...</> : 'Scan site'}
              </button>
            </div>

            {scrapeMsg && (
              <div className={`mt-3 flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg border ${
                scrapeMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                scrapeMsg.type === 'error'   ? 'bg-red-50 text-red-700 border-red-200' :
                                               'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {scrapeMsg.type === 'success'
                  ? <CheckCircle size={13} className="shrink-0 mt-0.5" />
                  : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                <span>{scrapeMsg.text}</span>
              </div>
            )}
          </section>

          {/* ── Custom catalog ── */}
          <section>
            <div className="mb-3">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Custom service catalog
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                Add your own sections and line items to include in quotes.
              </p>
            </div>

            {secs.length === 0 && (
              <p className="text-sm text-ink-muted text-center py-5 border rounded-xl"
                style={{ borderColor: '#E5E8EB' }}>
                No custom sections yet — add one below or scan a website above.
              </p>
            )}

            {secs.map(sec => (
              <SectionEditor
                key={sec.id}
                accountId={activeId}
                section={sec}
                items={items.filter(i => i.sectionId === sec.id)}
              />
            ))}

            {/* Add new section */}
            <div className="flex gap-2 mt-2">
              <input value={newSecLabel} onChange={e => setNewSecLabel(e.target.value)}
                placeholder="New section name (e.g. Pressure Washing Packages)"
                className="field flex-1 text-sm"
                onKeyDown={e => e.key === 'Enter' && addSection()} />
              <button onClick={addSection} disabled={!newSecLabel.trim()}
                className="btn-primary px-4 disabled:opacity-40 flex items-center gap-1.5">
                <Plus size={14} /> Add
              </button>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0"
          style={{ borderColor: '#E5E8EB', background: '#FAFAF8' }}>
          <button onClick={onClose} className="btn-ghost">Close</button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            {saved ? <><CheckCircle size={14} /> Saved!</> : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
