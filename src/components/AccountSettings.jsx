import React, { useState, useRef, useCallback } from 'react';
import {
  X, Save, CheckCircle, Globe, RefreshCw, AlertCircle, Info,
  Plus, Trash2, Edit2, ChevronDown, ChevronUp, Upload, Image,
} from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';
import { scrapeWebsite } from '../utils/scraper';

const COLORS = [
  '#13B5EA','#6366f1','#8b5cf6','#ec4899','#f97316',
  '#22c55e','#14b8a6','#1d4ed8','#dc2626','#d97706','#1a1a1a','#64748b',
];

// ── Logo uploader ─────────────────────────────────────────────────
function LogoUploader({ accountId, currentLogoUrl, currentInitial, accentColor, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentLogoUrl || null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB.'); return; }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setPreviewUrl(dataUrl);
      try {
        await api.accounts.uploadLogo(accountId, dataUrl);
        onUploaded(dataUrl);
      } catch (err) {
        alert('Upload failed: ' + err.message);
        setPreviewUrl(currentLogoUrl);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = async () => {
    if (!confirm('Remove logo?')) return;
    await api.accounts.uploadLogo(accountId, '');
    setPreviewUrl(null);
    onUploaded(null);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Preview */}
      <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden border-2 shrink-0"
        style={{ borderColor: accentColor + '40', background: previewUrl ? '#fff' : accentColor + '15' }}>
        {previewUrl ? (
          <img src={previewUrl} alt="Logo" className="w-full h-full object-contain" />
        ) : (
          <span className="text-xl font-bold" style={{ color: accentColor }}>
            {(currentInitial || '?').toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-ink mb-1">Business logo</p>
        <p className="text-xs text-ink-muted mb-2">PNG, JPG, or SVG — max 2MB. Shown on quotes and invoices.</p>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: '#E5E8EB' }}>
            {uploading ? <RefreshCw size={11} className="animate-spin" /> : <Upload size={11} />}
            {uploading ? 'Uploading…' : previewUrl ? 'Replace' : 'Upload logo'}
          </button>
          {previewUrl && (
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

// ── Service item row ──────────────────────────────────────────────
function ItemRow({ accountId, item, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ name: item.name, description: item.description || '', setup_price: item.setup_price || 0, monthly_price: item.monthly_price || 0 });

  const save = async () => {
    await api.accounts.updateItem(accountId, item.id, {
      name: v.name, description: v.description,
      setup_price: parseFloat(v.setup_price) || 0,
      monthly_price: parseFloat(v.monthly_price) || 0,
    });
    onUpdated({ ...item, ...v, setup_price: parseFloat(v.setup_price)||0, monthly_price: parseFloat(v.monthly_price)||0 });
    setEditing(false);
  };

  if (editing) return (
    <div className="p-3 rounded-lg border space-y-2" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
      <input value={v.name} onChange={e => setV(p=>({...p,name:e.target.value}))}
        className="field text-sm" placeholder="Service name *" />
      <input value={v.description} onChange={e => setV(p=>({...p,description:e.target.value}))}
        className="field text-sm" placeholder="Short description (optional)" />
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
          <input type="number" min={0} value={v.setup_price} onChange={e=>setV(p=>({...p,setup_price:e.target.value}))}
            className="field pl-5 text-sm" placeholder="Setup fee" />
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
          <input type="number" min={0} value={v.monthly_price} onChange={e=>setV(p=>({...p,monthly_price:e.target.value}))}
            className="field pl-5 text-sm" placeholder="Monthly" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={!v.name.trim()}
          className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40 flex items-center gap-1">
          <CheckCircle size={11} /> Save
        </button>
        <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5 px-2">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="flex items-start gap-2 py-2 px-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{item.name}</p>
        {item.description && <p className="text-xs text-ink-muted truncate">{item.description}</p>}
        <p className="text-xs text-ink-muted mt-0.5">
          {item.setup_price > 0 && <span>${item.setup_price} setup</span>}
          {item.setup_price > 0 && item.monthly_price > 0 && <span className="mx-1">·</span>}
          {item.monthly_price > 0 && <span>${item.monthly_price}/mo</span>}
          {!item.setup_price && !item.monthly_price && <span className="italic">No pricing set</span>}
        </p>
      </div>
      <button onClick={() => setEditing(true)} className="p-1 text-ink-muted hover:text-ink shrink-0"><Edit2 size={12} /></button>
      <button onClick={() => onDeleted(item.id)} className="p-1 text-ink-muted hover:text-red-500 shrink-0"><Trash2 size={12} /></button>
    </div>
  );
}

// ── Service section block ─────────────────────────────────────────
function SectionBlock({ accountId, section, items, onSectionUpdated, onSectionDeleted, onItemAdded, onItemUpdated, onItemDeleted }) {
  const [open, setOpen] = useState(true);
  const [editLabel, setEditLabel] = useState(false);
  const [label, setLabel] = useState(section.label);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name:'', description:'', setup_price:'', monthly_price:'' });

  const saveLabel = async () => {
    if (!label.trim()) return;
    await api.accounts.updateSection(accountId, section.id, { label: label.trim() });
    onSectionUpdated({ ...section, label: label.trim() });
    setEditLabel(false);
  };

  const addItem = async () => {
    if (!newItem.name.trim()) return;
    const created = await api.accounts.addItem(accountId, {
      section_id: section.id,
      name: newItem.name.trim(),
      description: newItem.description,
      setup_price: parseFloat(newItem.setup_price) || 0,
      monthly_price: parseFloat(newItem.monthly_price) || 0,
    });
    onItemAdded(created);
    setNewItem({ name:'', description:'', setup_price:'', monthly_price:'' });
    setAddingItem(false);
  };

  return (
    <div className="border rounded-xl overflow-hidden mb-3" style={{ borderColor: '#E5E8EB' }}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#F5F7F8' }}>
        {editLabel ? (
          <div className="flex items-center gap-2 flex-1">
            <input value={label} onChange={e=>setLabel(e.target.value)}
              className="field flex-1 py-1 text-sm font-semibold"
              onKeyDown={e=>{if(e.key==='Enter')saveLabel();if(e.key==='Escape')setEditLabel(false);}}
              autoFocus />
            <button onClick={saveLabel} className="btn-primary py-1 px-3 text-xs">Save</button>
            <button onClick={()=>setEditLabel(false)} className="btn-ghost py-1 px-2 text-xs">✕</button>
          </div>
        ) : (
          <span className="text-sm font-semibold text-ink flex-1">{section.label}</span>
        )}
        {!editLabel && (
          <>
            <button onClick={()=>setEditLabel(true)} className="p-1 text-ink-muted hover:text-ink" title="Rename"><Edit2 size={12} /></button>
            <button onClick={()=>onSectionDeleted(section.id)} className="p-1 text-ink-muted hover:text-red-500" title="Delete section"><Trash2 size={12} /></button>
          </>
        )}
        <button onClick={()=>setOpen(o=>!o)} className="p-1 text-ink-muted ml-1">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-3 pt-2 space-y-1">
          {items.length === 0 && !addingItem && (
            <p className="text-xs text-ink-muted italic py-2">No services yet — add one below.</p>
          )}
          {items.map(item => (
            <ItemRow key={item.id} accountId={accountId} item={item}
              onUpdated={onItemUpdated} onDeleted={onItemDeleted} />
          ))}

          {/* Add item form */}
          {addingItem ? (
            <div className="pt-2 border-t space-y-2" style={{ borderColor: '#F0F3F5' }}>
              <input value={newItem.name} onChange={e=>setNewItem(p=>({...p,name:e.target.value}))}
                className="field text-sm" placeholder="Service name *" autoFocus />
              <input value={newItem.description} onChange={e=>setNewItem(p=>({...p,description:e.target.value}))}
                className="field text-sm" placeholder="Description (optional)" />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
                  <input type="number" min={0} value={newItem.setup_price}
                    onChange={e=>setNewItem(p=>({...p,setup_price:e.target.value}))}
                    className="field pl-5 text-sm" placeholder="Setup (one-time)" />
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
                  <input type="number" min={0} value={newItem.monthly_price}
                    onChange={e=>setNewItem(p=>({...p,monthly_price:e.target.value}))}
                    className="field pl-5 text-sm" placeholder="Monthly recurring" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addItem} disabled={!newItem.name.trim()}
                  className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40 flex items-center gap-1">
                  <Plus size={11} /> Add service
                </button>
                <button onClick={()=>setAddingItem(false)} className="btn-ghost text-xs py-1.5 px-2">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={()=>setAddingItem(true)}
              className="mt-1 text-xs font-medium flex items-center gap-1 text-ink-muted hover:text-ink py-1">
              <Plus size={12} /> Add service to this section
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main AccountSettings modal ────────────────────────────────────
export default function AccountSettings({ onClose }) {
  const {
    account, activeId,
    updateAccount,
    addCustomSection, updateCustomSection, deleteCustomSection,
    addCustomItem, updateCustomItem, deleteCustomItem,
  } = useAccount();

  const accent = account?.primary_color || '#13B5EA';

  const [form, setForm] = useState({
    name:        account?.name         || '',
    email:       account?.email        || '',
    phone:       account?.phone        || '',
    website:     account?.website      || '',
    logo_initial: account?.logo_initial || account?.logoInitial || '',
    primary_color: account?.primary_color || account?.primaryColor || '#13B5EA',
  });
  const [logoUrl, setLogoUrl] = useState(account?.logo_url || null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Scraper state
  const [scanUrl, setScanUrl]     = useState('');
  const [scanning, setScanning]   = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Section management local state (mirrors context)
  const sections = account?.customSections || [];
  const items    = account?.customItems    || [];

  const [newSectionName, setNewSectionName] = useState('');
  const [addingSection, setAddingSection]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateAccount(activeId, {
      ...form,
      logo_initial: form.logo_initial || form.name?.[0]?.toUpperCase() || 'A',
    });
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2000);
  };

  const handleScan = async () => {
    if (!scanUrl.trim()) return;
    setScanning(true);
    setScanResult(null);
    const result = await scrapeWebsite(scanUrl.trim());
    setScanning(false);

    if (result.success && result.data) {
      const d = result.data;
      // Pre-fill branding if blank
      if (!form.name && d.businessName) set('name', d.businessName);
      if (!form.email && d.email) set('email', d.email);
      if (!form.phone && d.phone) set('phone', d.phone);
      if (d.businessName) set('logo_initial', d.businessName[0].toUpperCase());

      // Import services as custom sections/items
      if (d.services?.length) {
        const sectionId = await addCustomSection(activeId, {
          label: `Imported — ${d.businessName || scanUrl}`,
        });
        for (const svc of d.services) {
          await addCustomItem(activeId, {
            section_id: sectionId,
            name: svc.name || 'Service',
            description: svc.description || '',
            setup_price: Number(svc.setupPrice || svc.oneTimePrice || 0) || 0,
            monthly_price: Number(svc.monthlyPrice || 0) || 0,
          });
        }
        setScanResult({
          type: 'success',
          text: `Imported ${d.services.length} service${d.services.length !== 1 ? 's' : ''} from ${d.businessName || 'the website'}.${d.pricingFound ? ' Pricing was detected.' : ' No pricing found — set prices manually.'}`,
        });
      } else {
        setScanResult({
          type: 'info',
          text: `Found ${d.businessName || 'the business'} but no service listings were detected. Business info pre-filled — add services manually below.`,
        });
      }
    } else {
      setScanResult({ type: 'error', text: result.error || 'Could not scan the site.' });
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    await addCustomSection(activeId, { label: newSectionName.trim() });
    setNewSectionName('');
    setAddingSection(false);
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Delete this section and all its services?')) return;
    await deleteCustomSection(activeId, sectionId);
  };

  const handleItemUpdated = useCallback(async (accountId, itemId, patch) => {
    await updateCustomItem(accountId, itemId, patch);
  }, [updateCustomItem]);

  const handleItemDeleted = useCallback(async (itemId) => {
    await deleteCustomItem(activeId, itemId);
  }, [activeId, deleteCustomItem]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#E5E8EB' }}>
          <div className="flex items-center gap-3">
            {/* Logo preview in header */}
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain border" style={{ borderColor: '#E5E8EB' }} />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: form.primary_color }}>
                {(form.logo_initial || form.name?.[0] || 'A').toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-ink">Account settings</h2>
              <p className="text-xs text-ink-muted">{account?.name}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={18} className="text-ink-muted hover:text-ink" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">

          {/* ── Logo upload ── */}
          <section>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Logo</p>
            <LogoUploader
              accountId={activeId}
              currentLogoUrl={logoUrl}
              currentInitial={form.logo_initial || form.name?.[0]}
              accentColor={accent}
              onUploaded={(url) => { setLogoUrl(url); }}
            />
          </section>

          {/* ── Branding ── */}
          <section>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Business info</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'name',         label: 'Business name',      ph: 'Acme Powerwash',     span: 2 },
                { k: 'email',        label: 'Email',              ph: 'hello@business.com' },
                { k: 'phone',        label: 'Phone',              ph: '(256) 000-0000' },
                { k: 'website',      label: 'Website',            ph: 'acmepowerwash.com' },
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

          {/* ── Website scanner ── */}
          <section className="border rounded-xl p-4" style={{ borderColor: '#E5E8EB' }}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Import services from website</p>
            <p className="text-xs text-ink-muted mb-3">
              Enter your business website URL — AI will scan the page and automatically extract your services and pricing into your catalog.
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
                className="btn-primary px-4 disabled:opacity-50 flex items-center gap-2">
                {scanning
                  ? <><RefreshCw size={13} className="animate-spin" /> Scanning…</>
                  : 'Scan site'}
              </button>
            </div>
            {scanResult && (
              <div className={`mt-3 flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg border ${
                scanResult.type === 'success' ? 'bg-green-50 text-green-700 border-green-200'
                : scanResult.type === 'error' ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {scanResult.type === 'success' ? <CheckCircle size={13} className="shrink-0 mt-0.5" /> : <Info size={13} className="shrink-0 mt-0.5" />}
                <span>{scanResult.text}</span>
              </div>
            )}
          </section>

          {/* ── Service catalog ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Service catalog</p>
                <p className="text-xs text-ink-muted mt-0.5">Your services appear in the Quote Builder for selection.</p>
              </div>
              <button onClick={() => setAddingSection(true)}
                className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#E5E8EB', color: accent }}>
                <Plus size={12} /> Add section
              </button>
            </div>

            {/* Add section form */}
            {addingSection && (
              <div className="mb-3 p-3 border rounded-xl" style={{ borderColor: '#E5E8EB' }}>
                <p className="text-xs font-medium text-ink-muted mb-2">Section name</p>
                <div className="flex gap-2">
                  <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                    placeholder="e.g. Pressure Washing, HVAC Services, Lawn Care..."
                    className="field flex-1 text-sm"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setAddingSection(false); }}
                    autoFocus />
                  <button onClick={handleAddSection} disabled={!newSectionName.trim()}
                    className="btn-primary text-xs px-4 disabled:opacity-40">Add</button>
                  <button onClick={() => setAddingSection(false)} className="btn-ghost text-xs px-3">Cancel</button>
                </div>
              </div>
            )}

            {sections.length === 0 ? (
              <div className="text-center py-8 border rounded-xl border-dashed" style={{ borderColor: '#E5E8EB' }}>
                <p className="text-sm text-ink-muted mb-1">No service sections yet</p>
                <p className="text-xs text-ink-muted mb-3">Scan your website above to auto-import, or add sections manually.</p>
                <button onClick={() => setAddingSection(true)}
                  className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
                  style={{ background: accent }}>
                  Add your first section
                </button>
              </div>
            ) : (
              sections.map(sec => (
                <SectionBlock
                  key={sec.id}
                  accountId={activeId}
                  section={sec}
                  items={items.filter(i => i.section_id === sec.id)}
                  onSectionUpdated={(updated) => updateCustomSection(activeId, sec.id, { label: updated.label })}
                  onSectionDeleted={(sId) => handleDeleteSection(sId)}
                  onItemAdded={(item) => addCustomItem(activeId, { ...item, section_id: sec.id })}
                  onItemUpdated={(item) => handleItemUpdated(activeId, item.id, item)}
                  onItemDeleted={(itemId) => handleItemDeleted(itemId)}
                />
              ))
            )}
          </section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
          <button onClick={onClose} className="btn-ghost">Close</button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {savedOk
              ? <><CheckCircle size={14} /> Saved!</>
              : saving
              ? <><RefreshCw size={14} className="animate-spin" /> Saving…</>
              : <><Save size={14} /> Save changes</>}
          </button>
        </div>

      </div>
    </div>
  );
}
