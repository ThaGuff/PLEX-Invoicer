import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Save, CheckCircle, Globe, RefreshCw, AlertCircle, Info,
  Plus, Trash2, Edit2, ChevronDown, ChevronUp, Upload, Image as ImageIcon,
} from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';
import { scrapeWebsite } from '../utils/scraper';
import FeeRulesSettings from './FeeRulesSettings';
import StripeConnectSettings from './StripeConnectSettings';

const COLORS = [
  '#13B5EA','#6366f1','#8b5cf6','#ec4899','#f97316',
  '#22c55e','#14b8a6','#1d4ed8','#dc2626','#d97706','#1a1a1a','#64748b',
];

// ── Logo uploader ─────────────────────────────────────────────────
function LogoUploader({ accountId, currentLogoUrl, currentInitial, accentColor, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentLogoUrl || null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB.'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      try {
        await api.accounts.uploadLogo(accountId, dataUrl);
        onUploaded(dataUrl);
      } catch (err) {
        alert('Upload failed: ' + err.message);
        setPreview(currentLogoUrl);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = async () => {
    if (!confirm('Remove logo?')) return;
    await api.accounts.uploadLogo(accountId, '');
    setPreview(null);
    onUploaded(null);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden border-2 shrink-0"
        style={{ borderColor: accentColor + '40', background: preview ? '#fff' : accentColor + '15' }}>
        {preview
          ? <img src={preview} alt="Logo" className="w-full h-full object-contain" />
          : <span className="text-xl font-bold" style={{ color: accentColor }}>{(currentInitial || '?').toUpperCase()}</span>
        }
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-ink mb-1">Business logo</p>
        <p className="text-xs text-ink-muted mb-2">PNG, JPG or SVG · max 2 MB · shown on quotes and invoices.</p>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: '#E5E8EB' }}>
            {uploading ? <RefreshCw size={11} className="animate-spin" /> : <Upload size={11} />}
            {uploading ? 'Uploading…' : preview ? 'Replace' : 'Upload logo'}
          </button>
          {preview && (
            <button onClick={handleRemove}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50">
              <Trash2 size={11} /> Remove
            </button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Single item row — edit inline ─────────────────────────────────
function ItemRow({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({
    name: item.name,
    description: item.description || '',
    setup_price: item.setup_price ?? 0,
    monthly_price: item.monthly_price ?? 0,
  });

  const save = async () => {
    const patch = {
      name: v.name.trim(),
      description: v.description.trim(),
      setup_price: parseFloat(v.setup_price) || 0,
      monthly_price: parseFloat(v.monthly_price) || 0,
    };
    await onSave(item.id, patch);
    setEditing(false);
  };

  if (editing) return (
    <div className="p-3 rounded-lg border space-y-2 my-1" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
      <input value={v.name} onChange={e => setV(p => ({ ...p, name: e.target.value }))}
        className="field text-sm" placeholder="Service name *" autoFocus />
      <input value={v.description} onChange={e => setV(p => ({ ...p, description: e.target.value }))}
        className="field text-sm" placeholder="Short description (optional)" />
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
          <input type="number" min={0} value={v.setup_price}
            onChange={e => setV(p => ({ ...p, setup_price: e.target.value }))}
            className="field pl-6 text-sm" placeholder="Setup / one-time" />
        </div>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
          <input type="number" min={0} value={v.monthly_price}
            onChange={e => setV(p => ({ ...p, monthly_price: e.target.value }))}
            className="field pl-6 text-sm" placeholder="Monthly recurring" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={!v.name.trim()}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40 flex items-center gap-1"
          style={{ background: '#13B5EA' }}>
          <CheckCircle size={11} /> Save
        </button>
        <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5 px-2">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="flex items-start gap-2 py-2 px-1 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink leading-snug">{item.name}</p>
        {item.description && <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{item.description}</p>}
        <p className="text-xs text-ink-muted mt-0.5">
          {item.setup_price > 0 && <span>${Number(item.setup_price).toLocaleString()} setup</span>}
          {item.setup_price > 0 && item.monthly_price > 0 && <span className="mx-1 opacity-40">·</span>}
          {item.monthly_price > 0 && <span>${Number(item.monthly_price).toLocaleString()}/mo</span>}
          {!item.setup_price && !item.monthly_price && <span className="italic opacity-50">No pricing set</span>}
        </p>
      </div>
      <button onClick={() => setEditing(true)}
        className="p-1.5 text-ink-muted hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Edit2 size={12} />
      </button>
      <button onClick={() => onDelete(item.id)}
        className="p-1.5 text-ink-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Section block — contains items ───────────────────────────────
function SectionBlock({ accountId, section, items, onRename, onDelete, onItemAdded, onItemUpdated, onItemDeleted }) {
  const [open, setOpen] = useState(true);
  const [editLabel, setEditLabel] = useState(false);
  const [label, setLabel] = useState(section.label);
  const [addingItem, setAddingItem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', setup_price: '', monthly_price: '' });

  const saveLabel = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    await api.accounts.updateSection(accountId, section.id, { label: trimmed });
    onRename(section.id, trimmed);
    setEditLabel(false);
  };

  // Add item: write to DB then notify parent with the created item (no double write)
  const handleAddItem = async () => {
    const trimmed = newItem.name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const created = await api.accounts.addItem(accountId, {
        section_id: section.id,
        name: trimmed,
        description: newItem.description.trim(),
        setup_price: parseFloat(newItem.setup_price) || 0,
        monthly_price: parseFloat(newItem.monthly_price) || 0,
      });
      onItemAdded(created);  // parent updates state — no second DB call
      setNewItem({ name: '', description: '', setup_price: '', monthly_price: '' });
      setAddingItem(false);
    } catch (e) {
      alert('Failed to add service: ' + e.message);
    }
    setSaving(false);
  };

  // Update item: write to DB then notify parent
  const handleSaveItem = async (itemId, patch) => {
    await api.accounts.updateItem(accountId, itemId, patch);
    onItemUpdated(itemId, patch);
  };

  // Delete item: write to DB then notify parent
  const handleDeleteItem = async (itemId) => {
    if (!confirm('Remove this service?')) return;
    await api.accounts.deleteItem(accountId, itemId);
    onItemDeleted(itemId);
  };

  return (
    <div className="border rounded-xl overflow-hidden mb-3" style={{ borderColor: '#E5E8EB' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#F5F7F8' }}>
        {editLabel ? (
          <div className="flex items-center gap-2 flex-1">
            <input value={label} onChange={e => setLabel(e.target.value)}
              className="field flex-1 py-1 text-sm font-semibold"
              onKeyDown={e => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setEditLabel(false); }}
              autoFocus />
            <button onClick={saveLabel} className="text-xs font-semibold px-3 py-1 rounded-lg text-white" style={{ background: '#13B5EA' }}>Save</button>
            <button onClick={() => { setLabel(section.label); setEditLabel(false); }} className="btn-ghost py-1 px-2 text-xs">✕</button>
          </div>
        ) : (
          <>
            <span className="text-sm font-semibold text-ink flex-1">{section.label}</span>
            <span className="text-xs text-ink-muted">{items.length} service{items.length !== 1 ? 's' : ''}</span>
            <button onClick={() => setEditLabel(true)} className="p-1 text-ink-muted hover:text-ink" title="Rename"><Edit2 size={12} /></button>
            <button onClick={() => onDelete(section.id)} className="p-1 text-ink-muted hover:text-red-500" title="Delete section"><Trash2 size={12} /></button>
          </>
        )}
        <button onClick={() => setOpen(o => !o)} className="p-1 text-ink-muted ml-1">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-3 pt-1">
          {items.length === 0 && !addingItem && (
            <p className="text-xs text-ink-muted italic py-2 px-1">No services yet — add one below.</p>
          )}

          {items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              onSave={handleSaveItem}
              onDelete={handleDeleteItem}
            />
          ))}

          {/* Add item form */}
          {addingItem ? (
            <div className="pt-2 mt-1 border-t space-y-2" style={{ borderColor: '#F0F3F5' }}>
              <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                className="field text-sm" placeholder="Service name *" autoFocus />
              <input value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                className="field text-sm" placeholder="Description (optional)" />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
                  <input type="number" min={0} value={newItem.setup_price}
                    onChange={e => setNewItem(p => ({ ...p, setup_price: e.target.value }))}
                    className="field pl-6 text-sm" placeholder="Setup / one-time" />
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
                  <input type="number" min={0} value={newItem.monthly_price}
                    onChange={e => setNewItem(p => ({ ...p, monthly_price: e.target.value }))}
                    className="field pl-6 text-sm" placeholder="Monthly" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddItem} disabled={!newItem.name.trim() || saving}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40 flex items-center gap-1"
                  style={{ background: '#13B5EA' }}>
                  {saving ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
                  {saving ? 'Adding…' : 'Add service'}
                </button>
                <button onClick={() => { setAddingItem(false); setNewItem({ name: '', description: '', setup_price: '', monthly_price: '' }); }}
                  className="btn-ghost text-xs py-1.5 px-2">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingItem(true)}
              className="mt-1 text-xs font-medium flex items-center gap-1.5 text-ink-muted hover:text-ink py-1.5 px-1 transition-colors">
              <Plus size={13} /> Add service to this section
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main AccountSettings ──────────────────────────────────────────
export default function AccountSettings({ onClose }) {
  const { account, activeId, updateAccount, refreshAccount } = useAccount();
  const accent = account?.primary_color || '#13B5EA';

  const [form, setForm] = useState({
    name:          account?.name          || '',
    email:         account?.email         || '',
    phone:         account?.phone         || '',
    website:       account?.website       || '',
    logo_initial:  account?.logo_initial  || account?.name?.[0]?.toUpperCase() || 'A',
    primary_color: account?.primary_color || '#13B5EA',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const [logoUrl, setLogoUrl]     = useState(account?.logo_url || null);
  const [saving, setSaving]       = useState(false);
  const [savedOk, setSavedOk]     = useState(false);

  // Local catalog state — always loaded fresh from DB on mount
  const [sections, setSections]   = useState([]);
  const [items, setItems]         = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Load fresh data from API on mount (don't trust stale context state)
  useEffect(() => {
    if (!activeId) return;
    setCatalogLoading(true);
    api.accounts.get(activeId)
      .then(data => {
        setSections(data.customSections || []);
        setItems(data.customItems || []);
        // Also sync branding fields if they differ from context
        if (data.logo_url !== undefined) setLogoUrl(data.logo_url || null);
      })
      .catch(console.error)
      .finally(() => setCatalogLoading(false));
  }, [activeId]);

  // Scraper state
  const [scanUrl, setScanUrl]       = useState('');
  const [scanning, setScanning]     = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Add-section state
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSec, setAddingSec]           = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAccount(activeId, {
        ...form,
        logo_initial: (form.logo_initial || form.name?.[0] || 'A').toUpperCase().slice(0, 1),
      });
      // updateAccount now returns enriched data (sections/items included)
      // so context is already fully in sync after this call
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch (e) { alert('Save failed: ' + e.message); }
    setSaving(false);
  };

  const handleScan = async () => {
    if (!scanUrl.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const result = await scrapeWebsite(scanUrl.trim());
      if (result.success && result.data) {
        const d = result.data;
        // Pre-fill business info if blank
        if (!form.name && d.businessName) set('name', d.businessName);
        if (!form.email && d.email)       set('email', d.email);
        if (!form.phone && d.phone)       set('phone', d.phone);
        if (d.businessName && !form.logo_initial) set('logo_initial', d.businessName[0].toUpperCase());

        const svcs = d.services || [];
        if (svcs.length > 0) {
          // Create ONE section, then add each service under it
          const sectionLabel = d.businessName ? `${d.businessName} Services` : 'Imported Services';
          const newSec = await api.accounts.addSection(activeId, { label: sectionLabel });
          setSections(prev => [...prev, newSec]);

          const created = [];
          for (const svc of svcs) {
            const item = await api.accounts.addItem(activeId, {
              section_id:    newSec.id,
              name:          svc.name || 'Service',
              description:   svc.description || '',
              setup_price:   Number(svc.setupPrice || svc.oneTimePrice || 0) || 0,
              monthly_price: Number(svc.monthlyPrice || 0) || 0,
            });
            created.push(item);
          }
          setItems(prev => [...prev, ...created]);

          setScanResult({
            type: 'success',
            text: `Imported ${svcs.length} service${svcs.length !== 1 ? 's' : ''} from ${d.businessName || 'the website'}.${d.pricingFound ? ' Pricing detected.' : ' No pricing found — set prices manually.'}`,
          });
          // Sync context and QuoteBuilder after import
          refreshAccount(activeId).catch(() => {});
        } else {
          setScanResult({
            type: 'info',
            text: `Found ${d.businessName || 'the business'} but no services detected. Business info pre-filled. Add services manually below.`,
          });
        }
      } else {
        setScanResult({ type: 'error', text: result.error || 'Could not scan the site. Try entering details manually.' });
      }
    } catch (e) {
      setScanResult({ type: 'error', text: e.message || 'Scan failed.' });
    }
    setScanning(false);
  };

  const handleAddSection = async () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    setAddingSec(true);
    try {
      const created = await api.accounts.addSection(activeId, { label: trimmed });
      setSections(prev => [...prev, created]);
      setNewSectionName('');
      setAddingSection(false);
      // Sync context so QuoteBuilder sees the new section immediately
      refreshAccount(activeId).catch(() => {});
    } catch (e) { alert('Failed: ' + e.message); }
    setAddingSec(false);
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Delete this section and all its services?')) return;
    await api.accounts.deleteSection(activeId, sectionId);
    setSections(prev => prev.filter(s => s.id !== sectionId));
    setItems(prev => prev.filter(i => i.section_id !== sectionId));
    refreshAccount(activeId).catch(() => {});
  };

  // These callbacks are passed to SectionBlock — no double DB write
  const handleItemAdded   = (item)        => {
    setItems(prev => [...prev, item]);
    refreshAccount(activeId).catch(() => {}); // sync context so QuoteBuilder sees new services
  };
  const handleItemUpdated = (id, patch)   => setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  const handleItemDeleted = (id)          => {
    setItems(prev => prev.filter(i => i.id !== id));
    refreshAccount(activeId).catch(() => {});
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#E5E8EB' }}>
          <div className="flex items-center gap-3">
            {logoUrl
              ? <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain border" style={{ borderColor: '#E5E8EB' }} />
              : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: form.primary_color }}>
                  {(form.logo_initial || form.name?.[0] || 'A').toUpperCase()}
                </div>
            }
            <div>
              <h2 className="text-base font-bold text-ink">Account settings</h2>
              <p className="text-xs text-ink-muted">{account?.name}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={18} className="text-ink-muted hover:text-ink" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">

          {/* Logo */}
          <section>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Logo</p>
            <LogoUploader
              accountId={activeId}
              currentLogoUrl={logoUrl}
              currentInitial={form.logo_initial || form.name?.[0]}
              accentColor={accent}
              onUploaded={url => setLogoUrl(url)}
            />
          </section>

          {/* Business info */}
          <section>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Business info</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'name',         label: 'Business name',       ph: 'Acme Powerwash',     span: 2 },
                { k: 'email',        label: 'Email',               ph: 'hello@business.com' },
                { k: 'phone',        label: 'Phone',               ph: '(256) 000-0000' },
                { k: 'website',      label: 'Website',             ph: 'acmepowerwash.com' },
                { k: 'logo_initial', label: 'Logo letter (1 char)', ph: 'A' },
              ].map(f => (
                <div key={f.k} className={f.span === 2 ? 'col-span-2' : ''}>
                  <label className="text-xs text-ink-muted block mb-1">{f.label}</label>
                  <input value={form[f.k]} onChange={e => set(f.k, e.target.value)}
                    placeholder={f.ph} maxLength={f.k === 'logo_initial' ? 1 : undefined}
                    className="field" />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs text-ink-muted block mb-2">Brand color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => set('primary_color', c)}
                    className="w-6 h-6 rounded transition-transform hover:scale-110"
                    style={{ background: c, outline: form.primary_color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }} />
                ))}
                <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                  className="w-6 h-6 rounded border cursor-pointer" style={{ borderColor: '#E5E8EB' }} />
              </div>
            </div>
          </section>

          {/* Website scanner */}
          <section className="border rounded-xl p-4" style={{ borderColor: '#E5E8EB' }}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Import services from your website</p>
            <p className="text-xs text-ink-muted mb-3">
              AI scans your website and auto-creates your service catalog with pricing where available.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input type="text" value={scanUrl} onChange={e => setScanUrl(e.target.value)}
                  placeholder="https://yourbusiness.com"
                  className="field pl-8"
                  onKeyDown={e => e.key === 'Enter' && !scanning && handleScan()} />
              </div>
              <button onClick={handleScan} disabled={!scanUrl.trim() || scanning}
                className="btn-primary px-4 disabled:opacity-50 flex items-center gap-2 shrink-0">
                {scanning ? <><RefreshCw size={13} className="animate-spin" />Scanning…</> : 'Scan site'}
              </button>
            </div>
            {scanResult && (
              <div className={`mt-3 flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg border ${
                scanResult.type === 'success' ? 'bg-green-50 text-green-700 border-green-200'
                : scanResult.type === 'error'   ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {scanResult.type === 'success'
                  ? <CheckCircle size={13} className="shrink-0 mt-0.5" />
                  : <Info size={13} className="shrink-0 mt-0.5" />}
                {scanResult.text}
              </div>
            )}
          </section>

          {/* Service catalog */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Service catalog</p>
                <p className="text-xs text-ink-muted mt-0.5">These services appear in the Quote Builder.</p>
              </div>
              <button onClick={() => setAddingSection(true)}
                className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#E5E8EB', color: accent }}>
                <Plus size={12} /> Add section
              </button>
            </div>

            {addingSection && (
              <div className="mb-3 p-3 border rounded-xl" style={{ borderColor: '#E5E8EB' }}>
                <label className="text-xs font-medium text-ink-muted block mb-2">Section name</label>
                <div className="flex gap-2">
                  <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                    placeholder="e.g. Pressure Washing, HVAC, Lawn Care…"
                    className="field flex-1 text-sm"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setAddingSection(false); }}
                    autoFocus />
                  <button onClick={handleAddSection} disabled={!newSectionName.trim() || addingSec}
                    className="text-xs font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-40"
                    style={{ background: accent }}>
                    {addingSec ? '…' : 'Add'}
                  </button>
                  <button onClick={() => { setAddingSection(false); setNewSectionName(''); }}
                    className="btn-ghost text-xs px-3">Cancel</button>
                </div>
              </div>
            )}

            {catalogLoading ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <RefreshCw size={14} className="animate-spin text-ink-muted" />
                <span className="text-xs text-ink-muted">Loading your service catalog…</span>
              </div>
            ) : sections.length === 0 ? (
              <div className="text-center py-8 border rounded-xl border-dashed" style={{ borderColor: '#E5E8EB' }}>
                <p className="text-sm font-medium text-ink mb-1">No services yet</p>
                <p className="text-xs text-ink-muted mb-3">Scan your website above or add sections manually.</p>
                <button onClick={() => setAddingSection(true)}
                  className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
                  style={{ background: accent }}>
                  Add your first section
                </button>
              </div>
            ) : sections.map(sec => (
              <SectionBlock
                key={sec.id}
                accountId={activeId}
                section={sec}
                items={items.filter(i => i.section_id === sec.id)}
                onRename={(id, label) => setSections(prev => prev.map(s => s.id === id ? { ...s, label } : s))}
                onDelete={handleDeleteSection}
                onItemAdded={handleItemAdded}
                onItemUpdated={handleItemUpdated}
                onItemDeleted={handleItemDeleted}
              />
            ))}
          </section>

          {/* Stripe Connect */}
          <section>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Stripe payments</p>
            <StripeConnectSettings accountId={activeId} accent={accent} />
          </section>

          {/* F8: Fee rules */}
          <section>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Payment & fee rules</p>
            <FeeRulesSettings accountId={activeId} accent={accent} />
          </section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
          <button onClick={onClose} className="btn-ghost">Close</button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {savedOk ? <><CheckCircle size={14} /> Saved!</>
              : saving ? <><RefreshCw size={14} className="animate-spin" />Saving…</>
              : <><Save size={14} /> Save changes</>}
          </button>
        </div>

      </div>
    </div>
  );
}
