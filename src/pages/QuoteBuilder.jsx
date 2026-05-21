import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Zap, Bot, Megaphone, LayoutDashboard, PlusCircle, Globe,
  ChevronDown, ChevronUp, Download, Mail, Trash2, X,
  Calendar, CreditCard, CheckCircle, Info, FileText, Users,
  TrendingUp, Save, RefreshCw, Plus, Edit2,
} from 'lucide-react';
import { SERVICES, SECTIONS, YEARLY_DISCOUNT_DEFAULT, getService } from '../data/services';
import { useAccount } from '../context/AccountContext';
import { exportPDF } from '../utils/exportPDF';
import { openMailto } from '../utils/exportEmail';
import { api } from '../utils/api';
import AIInvoiceParser from '../components/AIInvoiceParser';

const SECTION_ICONS = {
  web: Globe, core: Zap, ai: Bot,
  mkt: Megaphone, crm: LayoutDashboard, addon: PlusCircle,
};

function fmt(n) { return '$' + Math.round(n).toLocaleString(); }

function Badge({ type }) {
  if (!type) return null;
  const cls = { popular: 'badge-popular', new: 'badge-new', addon: 'badge-addon' }[type] || 'badge-addon';
  return <span className={`badge ${cls} ml-1.5`}>{type}</span>;
}

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-track">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-thumb" />
    </label>
  );
}

function PriceCell({ value, onChange, disabled, accent }) {
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none">$</span>
      <input type="number" value={value} min={0} step={1} disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="field-price w-[86px] pl-5"
        style={!disabled ? { '--tw-ring-color': accent + '30' } : {}}
      />
    </div>
  );
}

function ServiceRow({ svc, sectionId, isSelected, isIncluded, setupPrice, monthlyPrice, billingMode, yearlyDiscount, onToggle, onPriceChange, onIncludeChange, accent }) {
  const effectiveMonthly = billingMode === 'annual' && !isIncluded ? monthlyPrice * (1 - yearlyDiscount / 100) : monthlyPrice;
  const savings = monthlyPrice * (yearlyDiscount / 100);
  return (
    <div className={`svc-row ${isSelected ? 'active' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5 shrink-0">
          <input type="checkbox" checked={isSelected}
            onChange={e => onToggle(svc.id, sectionId, e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap">
            <span className={`text-sm font-medium ${isSelected ? 'text-ink' : 'text-ink-muted'}`}>{svc.name}</span>
            <Badge type={svc.badge} />
          </div>
          <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{svc.desc || svc.description}</p>
          {isSelected && billingMode === 'annual' && monthlyPrice > 0 && !isIncluded && (
            <p className="text-xs font-semibold mt-1" style={{ color: accent }}>
              Annual saves {fmt(savings)}/mo · {fmt(savings * 12)}/yr
            </p>
          )}
        </div>
        {isSelected && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-ink-muted">Incl.</span>
              <Toggle checked={isIncluded} onChange={v => onIncludeChange(svc.id, v)} />
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-ink-muted">Setup</span>
              {isIncluded ? <span className="text-xs font-semibold text-green-600 w-[86px] text-right">Included</span>
                : <PriceCell value={setupPrice} onChange={v => onPriceChange(svc.id, 'setup', v)} accent={accent} />}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-ink-muted">Monthly</span>
              {isIncluded ? <span className="text-xs font-semibold text-green-600 w-[86px] text-right">Included</span>
                : <div className="flex flex-col items-end">
                    <PriceCell value={monthlyPrice} onChange={v => onPriceChange(svc.id, 'monthly', v)} accent={accent} />
                    {billingMode === 'annual' && monthlyPrice > 0 && (
                      <span className="text-xs mt-0.5 font-semibold" style={{ color: accent }}>{fmt(effectiveMonthly)} billed</span>
                    )}
                  </div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Custom section with inline add-item capability ────────────────
function CustomSection({ section, services, selected, included, prices, billingMode, yearlyDiscount, onToggle, onPriceChange, onIncludeChange, accent, accountId, onItemAdded, onSectionRenamed }) {
  const [open, setOpen] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [newLabel, setNewLabel] = useState(section.label);
  const [newItem, setNewItem] = useState({ name: '', description: '', setup_price: '', monthly_price: '' });
  const count = services.filter(s => selected[s.id]).length;

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return;
    setSavingItem(true);
    try {
      const created = await api.accounts.addItem(accountId, {
        section_id:    section.id,
        name:          newItem.name.trim(),
        description:   newItem.description.trim(),
        setup_price:   parseFloat(newItem.setup_price)   || 0,
        monthly_price: parseFloat(newItem.monthly_price) || 0,
      });
      onItemAdded(created);
      setNewItem({ name: '', description: '', setup_price: '', monthly_price: '' });
      setAddingItem(false);
    } catch (e) { alert('Failed to add service: ' + e.message); }
    setSavingItem(false);
  };

  const handleRenameSection = async () => {
    if (!newLabel.trim() || newLabel === section.label) { setEditingLabel(false); return; }
    try {
      await api.accounts.updateSection(accountId, section.id, { label: newLabel.trim() });
      onSectionRenamed(section.id, newLabel.trim());
    } catch (e) { alert('Rename failed: ' + e.message); }
    setEditingLabel(false);
  };

  return (
    <div className="card overflow-hidden mb-3">
      <button onClick={() => setOpen(o => !o)} className="section-trigger w-full text-left">
        <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 text-white" style={{ background: accent }}>
          <PlusCircle size={14} />
        </div>
        {editingLabel ? (
          <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              className="field flex-1 py-1 text-sm font-semibold"
              onKeyDown={e => { if (e.key === 'Enter') handleRenameSection(); if (e.key === 'Escape') setEditingLabel(false); }}
              autoFocus />
            <button onClick={handleRenameSection} className="text-xs font-semibold px-2 py-1 rounded text-white" style={{ background: accent }}>Save</button>
            <button onClick={() => setEditingLabel(false)} className="text-xs px-2 py-1 text-ink-muted hover:text-ink">✕</button>
          </div>
        ) : (
          <>
            <span className="text-sm font-semibold text-ink flex-1">{section.label}</span>
            <span className="text-xs text-ink-muted border px-1.5 py-0.5 rounded" style={{ borderColor: '#E5E8EB' }}>custom</span>
            <button onClick={e => { e.stopPropagation(); setEditingLabel(true); }} className="p-1 text-ink-muted hover:text-ink ml-1" title="Rename section">
              <Edit2 size={12} />
            </button>
          </>
        )}
        {count > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded text-white ml-1" style={{ background: accent }}>{count}</span>}
        {open ? <ChevronUp size={15} className="text-ink-muted shrink-0" /> : <ChevronDown size={15} className="text-ink-muted shrink-0" />}
      </button>

      {open && (
        <div>
          {services.length === 0 && !addingItem && (
            <div className="px-5 py-3 text-xs text-ink-muted italic border-t" style={{ borderColor: '#F0F3F5' }}>
              No services yet — add one below.
            </div>
          )}
          {services.map(svc => (
            <ServiceRow key={svc.id} svc={svc} sectionId={section.id}
              isSelected={!!selected[svc.id]} isIncluded={!!included[svc.id]}
              setupPrice={prices[svc.id]?.setup ?? svc.setup_price ?? 0}
              monthlyPrice={prices[svc.id]?.monthly ?? svc.monthly_price ?? 0}
              billingMode={billingMode} yearlyDiscount={yearlyDiscount}
              onToggle={onToggle} onPriceChange={onPriceChange} onIncludeChange={onIncludeChange}
              accent={accent} />
          ))}

          {/* Add service inline */}
          {addingItem ? (
            <div className="px-5 py-4 border-t space-y-2.5" style={{ borderColor: '#F0F3F5', background: '#FAFAFA' }}>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Add service to {section.label}</p>
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
                <button onClick={handleAddItem} disabled={!newItem.name.trim() || savingItem}
                  className="text-xs font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-40 flex items-center gap-1.5"
                  style={{ background: accent }}>
                  {savingItem ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
                  {savingItem ? 'Adding…' : 'Add service'}
                </button>
                <button onClick={() => { setAddingItem(false); setNewItem({ name:'', description:'', setup_price:'', monthly_price:'' }); }}
                  className="btn-ghost text-xs py-2 px-3">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="border-t" style={{ borderColor: '#F0F3F5' }}>
              <button onClick={() => setAddingItem(true)}
                className="w-full flex items-center gap-2 px-5 py-2.5 text-xs font-medium transition-colors hover:bg-gray-50"
                style={{ color: accent }}>
                <Plus size={13} /> Add service to this section
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ section, services, selected, included, prices, billingMode, yearlyDiscount, onToggle, onPriceChange, onIncludeChange, accent }) {
  const [open, setOpen] = useState(section.id === 'web' || section.id === 'core');
  const Icon = SECTION_ICONS[section.id] || PlusCircle;
  const count = services.filter(s => selected[s.id]).length;
  const isWeb = section.id === 'web';
  return (
    <div className="card overflow-hidden mb-3" style={isWeb ? { borderColor: accent + '40' } : {}}>
      <button onClick={() => setOpen(o => !o)} className="section-trigger w-full text-left">
        <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 text-white"
          style={{ background: isWeb ? accent : '#1a1a1a' }}>
          <Icon size={14} />
        </div>
        <span className="text-sm font-semibold text-ink flex-1">{section.label}</span>
        {count > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: accent }}>{count}</span>}
        {open ? <ChevronUp size={15} className="text-ink-muted shrink-0" /> : <ChevronDown size={15} className="text-ink-muted shrink-0" />}
      </button>
      {open && isWeb && (
        <div className="mx-5 mt-0 mb-2 px-3 py-2 rounded text-xs text-ink-muted flex items-start gap-2 border"
          style={{ background: '#f0fafd', borderColor: '#baeaf9' }}>
          <Info size={12} className="shrink-0 mt-0.5" style={{ color: accent }} />
          <span>Select a <strong>website build</strong> (one-time) and optionally a <strong>management plan</strong> (monthly).</span>
        </div>
      )}
      {open && (
        <div>
          {services.map(svc => (
            <ServiceRow key={svc.id} svc={svc} sectionId={section.id}
              isSelected={!!selected[svc.id]} isIncluded={!!included[svc.id]}
              setupPrice={prices[svc.id]?.setup ?? svc.setup ?? 0}
              monthlyPrice={prices[svc.id]?.monthly ?? svc.monthly ?? 0}
              billingMode={billingMode} yearlyDiscount={yearlyDiscount}
              onToggle={onToggle} onPriceChange={onPriceChange} onIncludeChange={onIncludeChange}
              accent={accent} />
          ))}
        </div>
      )}
    </div>
  );
}

function computeTotals({ selected, included, prices, billingMode, yearlyDiscount, discType, discValue, discSetup, discMonthly, customItems = [], taxRate = 0 }) {
  const selectedIds = Object.keys(selected).filter(id => selected[id]);
  let setupSub = 0, mthSub = 0;
  selectedIds.forEach(id => {
    if (included[id]) return;
    const svc = getService(id) || customItems.find(i => i.id === id);
    if (!svc) return;
    setupSub += prices[id]?.setup ?? (svc.setup ?? svc.setup_price ?? 0);
    const mthRaw = prices[id]?.monthly ?? (svc.monthly ?? svc.monthly_price ?? 0);
    mthSub += billingMode === 'annual' ? mthRaw * (1 - yearlyDiscount / 100) : mthRaw;
  });
  const dv = parseFloat(discValue) || 0;
  let setupDiscAmt = 0, mthDiscAmt = 0;
  if (discType === 'pct') {
    if (discSetup)   setupDiscAmt = setupSub * (dv / 100);
    if (discMonthly) mthDiscAmt   = mthSub   * (dv / 100);
  } else {
    if (discSetup && discMonthly) { setupDiscAmt = dv / 2; mthDiscAmt = dv / 2; }
    else if (discSetup)   setupDiscAmt = Math.min(dv, setupSub);
    else if (discMonthly) mthDiscAmt   = Math.min(dv, mthSub);
  }
  const setupFinal = Math.max(0, setupSub - Math.min(setupDiscAmt, setupSub));
  const mthFinal   = Math.max(0, mthSub   - Math.min(mthDiscAmt,   mthSub));
  const tRate = parseFloat(taxRate) || 0;
  const taxAmt  = tRate > 0 ? Math.round(setupFinal * (tRate / 100) * 100) / 100 : 0;
  return {
    setupSub, mthSub,
    setupDiscAmt: Math.min(setupDiscAmt, setupSub),
    mthDiscAmt:   Math.min(mthDiscAmt,   mthSub),
    setupFinal,
    mthFinal,
    taxAmt,
    grandTotal: setupFinal + taxAmt,
    selectedIds,
  };
}

// ── Add Section Modal ─────────────────────────────────────────────
function AddSectionModal({ accent, accountId, onCreated, onClose }) {
  const [label, setLabel]     = useState('');
  const [saving, setSaving]   = useState(false);

  const handleCreate = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const created = await api.accounts.addSection(accountId, { label: label.trim() });
      onCreated(created);
      onClose();
    } catch (e) { alert('Failed: ' + e.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
          <h3 className="text-sm font-bold text-ink">Add service section</h3>
          <button onClick={onClose}><X size={16} className="text-ink-muted" /></button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1.5">Section name</label>
            <input value={label} onChange={e => setLabel(e.target.value)}
              className="field" placeholder="e.g. Pressure Washing, HVAC, Lawn Care…"
              autoFocus onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }} />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={!label.trim() || saving}
            className="text-sm font-semibold px-5 py-2 rounded-xl text-white disabled:opacity-40"
            style={{ background: accent }}>
            {saving ? 'Creating…' : 'Create section'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main QuoteBuilder ─────────────────────────────────────────────
export default function QuoteBuilder() {
  const { account, activeId, addCustomSection, updateCustomSection, addCustomItem, refreshAccount } = useAccount();
  const accent = account?.primary_color || '#13B5EA';
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isNew = !editId || editId === 'new';

  const [saving, setSaving]       = useState(false);
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [contacts, setContacts]   = useState([]);
  const [showAddSection, setShowAddSection] = useState(false);

  // Local copy of sections/items for inline edits
  // Initialized from context, updated when items are added inline
  const [localSections, setLocalSections] = useState(null);
  const [localItems,    setLocalItems]    = useState(null);

  // Use local copies if available (have inline additions), otherwise context
  const customSections = localSections ?? account?.customSections ?? [];
  const customItems    = localItems    ?? account?.customItems    ?? [];

  // Sync local copies when context changes (e.g. account switch)
  useEffect(() => {
    setLocalSections(null);
    setLocalItems(null);
  }, [account?.id]);

  // Handlers for inline item/section changes
  const handleItemAdded = useCallback((item) => {
    setLocalItems(prev => [...(prev ?? customItems), item]);
    // Also update context
    refreshAccount(account?.id).catch(() => {});
  }, [customItems, account?.id, refreshAccount]);

  const handleSectionRenamed = useCallback((sectionId, newLabel) => {
    setLocalSections(prev =>
      (prev ?? customSections).map(s => s.id === sectionId ? { ...s, label: newLabel } : s)
    );
    updateCustomSection(account?.id, sectionId, { label: newLabel }).catch(() => {});
  }, [customSections, account?.id, updateCustomSection]);

  const handleSectionCreated = useCallback((created) => {
    setLocalSections(prev => [...(prev ?? customSections), created]);
    // Update context too
    refreshAccount(account?.id).catch(() => {});
  }, [customSections, account?.id, refreshAccount]);

  const [clientName,  setClientName]  = useState('');
  const [clientBiz,   setClientBiz]   = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [quoteDate,   setQuoteDate]   = useState(() =>
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  );

  const [billingMode,    setBillingMode]    = useState('monthly');
  const [yearlyDiscount, setYearlyDiscount] = useState(YEARLY_DISCOUNT_DEFAULT);
  const [selected,   setSelected]   = useState({});
  const [sectionMap, setSectionMap] = useState({});
  const [included,   setIncluded]   = useState({});
  const [prices,     setPrices]     = useState({});
  const [discType,    setDiscType]    = useState('pct');
  const [discValue,   setDiscValue]   = useState(0);
  const [discSetup,   setDiscSetup]   = useState(true);
  const [discMonthly, setDiscMonthly] = useState(true);
  const [taxRate, setTaxRate]             = useState(0);
  const [taxZip, setTaxZip]               = useState('');
  const [taxLooking, setTaxLooking]       = useState(false);
  const [taxLookupResult, setTaxLookupResult] = useState(null);

  const [notes, setNotes] = useState(
    'Pricing valid for 30 days. Monthly billing starts after setup is complete. Setup begins within 48 hours of signed agreement and initial deposit. No long-term contracts on monthly services.'
  );

  // Load contacts
  useEffect(() => {
    if (account?.id) api.contacts.list(account.id).then(setContacts).catch(console.error);
  }, [account?.id]);

  // Load existing quote when editing
  useEffect(() => {
    if (isNew) return;
    api.quotes.get(editId).then(q => {
      setClientName(q.client_name || '');
      setClientBiz(q.client_biz || '');
      setClientEmail(q.client_email || '');
      setClientPhone(q.client_phone || '');
      setBillingMode(q.billing_mode || 'monthly');
      setYearlyDiscount(q.yearly_discount || 15);
      setDiscType(q.disc_type || 'pct');
      setDiscValue(q.disc_value || 0);
      setDiscSetup(!!q.disc_setup);
      setDiscMonthly(!!q.disc_monthly);
      setTaxRate(q.tax_rate || 0);
      setNotes(q.notes || '');
      // Reconstruct selections from saved items
      const sel = {}, secMap = {}, incl = {}, prx = {};
      (q.items || []).forEach(item => {
        const id = item.service_id || item.id;
        sel[id] = true;
        secMap[id] = item.section_id || 'custom';
        incl[id] = !!item.is_included;
        prx[id] = { setup: item.setup_price, monthly: item.monthly_price };
      });
      setSelected(sel); setSectionMap(secMap); setIncluded(incl); setPrices(prx);
    }).catch(e => { alert('Failed to load quote: ' + e.message); navigate('/quotes'); });
  }, [editId]);

  // Reset form when account switches
  useEffect(() => {
    if (!isNew) return;
    setSelected({}); setSectionMap({}); setIncluded({}); setPrices({}); setDiscValue(0);
    setClientName(''); setClientBiz(''); setClientEmail(''); setClientPhone('');
  }, [activeId]);

  const handleToggle      = useCallback((id, sectionId, checked) => {
    setSelected(s  => ({ ...s, [id]: checked }));
    setSectionMap(m => ({ ...m, [id]: sectionId }));
  }, []);
  const handlePriceChange   = useCallback((id, field, value) => setPrices(p => ({ ...p, [id]: { ...p[id], [field]: value } })), []);
  const handleIncludeChange = useCallback((id, value) => setIncluded(i => ({ ...i, [id]: value })), []);

  const handleClear = () => {
    setSelected({}); setSectionMap({}); setIncluded({}); setPrices({}); setDiscValue(0);
    setClientName(''); setClientBiz(''); setClientEmail(''); setClientPhone('');
  };

  const handleContactSelect = (e) => {
    const c = contacts.find(x => x.id === e.target.value);
    if (!c) return;
    setSelectedContactId(c.id);
    setClientName(c.name); setClientBiz(c.business || '');
    setClientEmail(c.email || ''); setClientPhone(c.phone || '');
  };

  const fullState = {
    agencyName:    account?.name     || 'PLEX Automation',
    agencyEmail:   account?.email    || 'hello@plexautomation.io',
    agencyPhone:   account?.phone    || '256-609-4618',
    agencyWebsite: account?.website  || 'plexautomation.io',
    agencyLogoUrl: account?.logo_url || null,
    primaryColor:  accent,
    clientName, clientBiz, clientEmail, clientPhone,
    quoteDate, billingMode, yearlyDiscount,
    selected, sectionMap, included, prices,
    discType, discValue, discSetup, discMonthly,
    notes, customSections, customItems, taxRate,
  };

  const { setupSub, mthSub, setupDiscAmt, mthDiscAmt, setupFinal, mthFinal, taxAmt, grandTotal, selectedIds } =
    computeTotals({ ...fullState });
  const selectedCount = selectedIds.length;

  // Build items array for API save
  const buildItems = () => {
    const items = [];
    const allSections = account?.id === 'plex-master'
      ? [...SECTIONS, ...customSections.map(s => ({ id: s.id, label: s.label }))]
      : customSections.map(s => ({ id: s.id, label: s.label }));

    allSections.forEach(sec => {
      const secServices = (account?.id === 'plex-master' ? SERVICES[sec.id] : null)
        || customItems.filter(i => i.section_id === sec.id);
      secServices.forEach(svc => {
        if (!selected[svc.id]) return;
        items.push({
          section_id:    sec.id,
          section_label: sec.label || '',
          service_id:    svc.id,
          name:          svc.name,
          description:   svc.desc || svc.description || '',
          setup_price:   prices[svc.id]?.setup   ?? (svc.setup   ?? svc.setup_price   ?? 0),
          monthly_price: prices[svc.id]?.monthly ?? (svc.monthly ?? svc.monthly_price ?? 0),
          is_included:   !!included[svc.id],
        });
      });
    });
    return items;
  };

  const handleTaxLookup = async () => {
    if (taxZip.length !== 5) return;
    setTaxLooking(true);
    try {
      const result = await api.tax.lookup(taxZip);
      setTaxLookupResult(result);
      setTaxRate(result.tax_rate);
    } catch (e) {
      // silently fail - user can enter manually
    }
    setTaxLooking(false);
  };

  const handleSave = async () => {
    if (!account?.id) return;
    setSaving(true);
    setSaveState('saving');
    try {
      const payload = {
        account_id:      account.id,
        contact_id:      selectedContactId || null,
        client_name:     clientName,
        client_biz:      clientBiz,
        client_email:    clientEmail,
        client_phone:    clientPhone,
        billing_mode:    billingMode,
        yearly_discount: yearlyDiscount,
        disc_type:       discType,
        disc_value:      discValue,
        disc_setup:      discSetup,
        disc_monthly:    discMonthly,
        notes,
        setup_total:     setupFinal,
        monthly_total:   mthFinal,
        tax_rate:        parseFloat(taxRate) || 0,
        tax_amount:      taxAmt,
        items:           buildItems(),
      };

      if (isNew) {
        await api.quotes.create(payload);
      } else {
        await api.quotes.update(editId, payload);
      }

      setSaveState('saved');
      // Refresh contacts so auto-created contact appears on next visit
      api.contacts.list(account.id).then(setContacts).catch(() => {});
      // Navigate to quotes list after short confirmation flash
      setTimeout(() => navigate('/quotes'), 900);
    } catch (e) {
      setSaveState('error');
      alert('Save failed: ' + e.message);
      setSaveState('idle');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (isNew) { alert('Save the quote first.'); return; }
    try {
      const inv = await api.quotes.convert(editId);
      navigate(`/invoices/${inv.id}`);
    } catch (e) { alert('Convert failed: ' + e.message); }
  };

  const saveBtnLabel = {
    idle:   isNew ? 'Save quote' : 'Save changes',
    saving: 'Saving…',
    saved:  '✓ Saved!',
    error:  'Try again',
  }[saveState];

  return (
    <div className="max-w-7xl mx-auto px-5 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-ink">{isNew ? 'New quote' : 'Edit quote'}</h1>
          <p className="text-sm text-ink-muted mt-0.5">Select services, configure billing, then save.</p>
        </div>
        <div className="flex gap-2 items-center">
          <AIInvoiceParser
            accountId={account?.id}
            accent={accent}
            onApply={(parsed) => {
              if (parsed.client_name)  setClientName(parsed.client_name);
              if (parsed.client_biz)   setClientBiz(parsed.client_biz);
              if (parsed.client_email) setClientEmail(parsed.client_email);
              if (parsed.notes)        setNotes(parsed.notes);
              if (parsed.billing_mode === 'monthly') setBillingMode('monthly');
            }}
          />
          {!isNew && (
            <button onClick={handleConvert}
              className="btn-ghost flex items-center gap-1.5 text-sm">
              <RefreshCw size={14} /> Convert to invoice
            </button>
          )}
          <button onClick={handleSave}
            disabled={saving || selectedCount === 0}
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-40 transition-all"
            style={{ background: saveState === 'saved' ? '#22c55e' : accent }}>
            <Save size={14} /> {saveBtnLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* ── LEFT ── */}
        <div>

          {/* Client info */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#E5E8EB' }}>
              <Users size={14} style={{ color: accent }} />
              <span className="text-sm font-semibold text-ink">Client details</span>
              <div className="ml-auto flex items-center gap-2">
                <select value={selectedContactId} onChange={handleContactSelect}
                  className="field text-xs py-1 w-auto max-w-[200px]">
                  <option value="">{contacts.length > 0 ? 'Select from contacts…' : 'No contacts yet'}</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.business ? ` (${c.business})` : ''}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: clientName,  s: setClientName,  label: 'Contact name',  ph: 'Jane Smith' },
                { v: clientBiz,   s: setClientBiz,   label: 'Business name', ph: 'Acme Roofing' },
                { v: clientEmail, s: setClientEmail, label: 'Email',         ph: 'jane@business.com', type: 'email' },
                { v: clientPhone, s: setClientPhone, label: 'Phone',         ph: '(256) 000-0000' },
                { v: quoteDate,   s: setQuoteDate,   label: 'Quote date',    ph: 'May 15, 2026' },
              ].map((f, i) => (
                <div key={i}>
                  <label className="text-xs font-medium text-ink-muted block mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={f.v} onChange={e => f.s(e.target.value)} placeholder={f.ph} className="field" />
                </div>
              ))}
            </div>
          </div>

          {/* Billing mode */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#E5E8EB' }}>
              <Calendar size={14} style={{ color: accent }} />
              <span className="text-sm font-semibold text-ink">Billing mode</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { key: 'monthly', Icon: CreditCard, title: 'Month-to-month', sub: 'Standard pricing, no commitment. Cancel with 30 days notice.' },
                { key: 'annual',  Icon: Calendar,   title: 'Annual plan',     sub: '12-month commitment at a discounted monthly rate.', badge: `Save ${yearlyDiscount}%` },
              ].map(opt => {
                const active = billingMode === opt.key;
                return (
                  <button key={opt.key} onClick={() => setBillingMode(opt.key)}
                    className="relative flex flex-col items-start p-4 text-left transition-all border-2 rounded-lg"
                    style={{ borderColor: active ? accent : '#E5E8EB', background: active ? accent + '10' : '#FFFFFF' }}>
                    {opt.badge && (
                      <span className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: accent }}>
                        {opt.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                      <opt.Icon size={14} style={{ color: active ? accent : '#7A7E85' }} />
                      <span className="text-sm font-semibold" style={{ color: active ? accent : '#1a1a1a' }}>{opt.title}</span>
                      {active && <CheckCircle size={13} style={{ color: accent }} />}
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed pr-10">{opt.sub}</p>
                  </button>
                );
              })}
            </div>
            {billingMode === 'annual' && (
              <div className="flex items-center gap-3 px-4 py-3 rounded text-sm border"
                style={{ background: accent + '0D', borderColor: accent + '40', borderRadius: '6px' }}>
                <Info size={13} style={{ color: accent }} className="shrink-0" />
                <span className="text-xs text-ink-muted flex-1">Discount applied to all monthly line items:</span>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={50} value={yearlyDiscount}
                    onChange={e => setYearlyDiscount(Math.min(50, Math.max(1, parseFloat(e.target.value) || 0)))}
                    className="w-14 text-center text-sm font-bold rounded outline-none border-2 px-1 py-1 bg-white"
                    style={{ borderColor: accent, color: accent }} />
                  <span className="text-sm font-semibold text-ink">% off</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Services ── */}

          {/* PLEX master — built-in catalog */}
          {account?.id === 'plex-master' && SECTIONS.map(sec => (
            <Section key={sec.id} section={sec} services={SERVICES[sec.id]}
              selected={selected} included={included} prices={prices}
              billingMode={billingMode} yearlyDiscount={yearlyDiscount}
              onToggle={handleToggle} onPriceChange={handlePriceChange}
              onIncludeChange={handleIncludeChange} accent={accent} />
          ))}

          {/* Non-PLEX accounts — custom catalog with inline add */}
          {account?.id !== 'plex-master' && customSections.map(sec => (
            <CustomSection key={sec.id} section={sec}
              services={customItems.filter(i => i.section_id === sec.id)}
              selected={selected} included={included} prices={prices}
              billingMode={billingMode} yearlyDiscount={yearlyDiscount}
              onToggle={handleToggle} onPriceChange={handlePriceChange}
              onIncludeChange={handleIncludeChange} accent={accent}
              accountId={account.id}
              onItemAdded={handleItemAdded}
              onSectionRenamed={handleSectionRenamed}
            />
          ))}

          {/* Add section button / empty state */}
          {account?.id !== 'plex-master' && (
            <div className="mb-4">
              {customSections.length === 0 ? (
                <div className="card p-8 text-center" style={{ borderStyle:'dashed', borderColor: accent + '40', background: accent + '06' }}>
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: accent + '18' }}>
                    <PlusCircle size={22} style={{ color: accent }} />
                  </div>
                  <p className="text-sm font-semibold text-ink mb-1">No services in your catalog yet</p>
                  <p className="text-xs text-ink-muted mb-4 max-w-xs mx-auto">
                    Add a service section below, or go to <strong>Account Settings</strong> to scan your website and auto-import services.
                  </p>
                  <button onClick={() => setShowAddSection(true)}
                    className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
                    style={{ background: accent }}>
                    + Add your first service section
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAddSection(true)}
                  className="w-full text-xs font-semibold py-2.5 rounded-lg border border-dashed flex items-center justify-center gap-2 transition-colors hover:opacity-80"
                  style={{ borderColor: accent + '60', color: accent, background: accent + '08' }}>
                  <PlusCircle size={13} /> Add another service section
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: '#E5E8EB' }}>
              <FileText size={14} style={{ color: accent }} />
              <span className="text-sm font-semibold text-ink">Quote notes & terms</span>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="field resize-y min-h-[80px] text-sm leading-relaxed"
              placeholder="Payment terms, start dates, or conditions..." />
          </div>
        </div>

        {/* ── RIGHT — summary ── */}
        <div>
          <div className="sticky top-20 space-y-3">

            {/* Summary card */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: accent }}>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp size={14} /> Quote summary
                </span>
                {selectedCount > 0 && (
                  <span className="text-xs font-bold bg-white px-2 py-0.5 rounded" style={{ color: accent }}>
                    {selectedCount} item{selectedCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="p-5">
                {selectedCount === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded mx-auto mb-3 flex items-center justify-center" style={{ background: accent + '15' }}>
                      <Zap size={18} style={{ color: accent }} />
                    </div>
                    <p className="text-sm font-medium text-ink">No services selected</p>
                    <p className="text-xs text-ink-muted mt-1">Check items to build your quote</p>
                  </div>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 px-2.5 py-1 rounded border"
                      style={{ background: accent + '10', borderColor: accent + '40', color: accent }}>
                      <Calendar size={11} />
                      {billingMode === 'annual' ? `Annual · ${yearlyDiscount}% off monthly` : 'Month-to-month'}
                    </div>

                    <div className="mb-4 pb-4 border-b" style={{ borderColor: '#E5E8EB' }}>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">One-time setup</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-ink-muted">Subtotal</span>
                          <span className="font-medium tabular-nums">{fmt(setupSub)}</span>
                        </div>
                        {setupDiscAmt > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-ink-muted">Discount</span>
                            <span className="font-semibold tabular-nums" style={{ color: accent }}>−{fmt(setupDiscAmt)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-1.5 border-t" style={{ borderColor: '#E5E8EB' }}>
                          <span className="text-sm font-bold text-ink">Due today</span>
                          <span className="text-xl font-bold text-ink tabular-nums">{fmt(setupFinal)}</span>
                        </div>
                        {taxRate > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-ink-muted">Tax ({taxRate}%)</span>
                              <span className="tabular-nums text-red-600">+{fmt(taxAmt)}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-1.5 border-t font-bold" style={{ borderColor: '#E5E8EB' }}>
                              <span className="text-sm text-ink">Total incl. tax</span>
                              <span className="text-xl text-ink tabular-nums" style={{ color: accent }}>{fmt(grandTotal)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mb-4 pb-4 border-b" style={{ borderColor: '#E5E8EB' }}>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Monthly recurring</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-ink-muted">Subtotal</span>
                          <span className="font-medium tabular-nums">{fmt(mthSub)}</span>
                        </div>
                        {mthDiscAmt > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-ink-muted">Discount</span>
                            <span className="font-semibold tabular-nums" style={{ color: accent }}>−{fmt(mthDiscAmt)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-1.5 border-t" style={{ borderColor: '#E5E8EB' }}>
                          <span className="text-sm font-bold text-ink">Monthly total</span>
                          <span className="text-xl font-bold text-ink tabular-nums">
                            {fmt(mthFinal)}<span className="text-sm font-normal text-ink-muted">/mo</span>
                          </span>
                        </div>
                        {billingMode === 'annual' && mthFinal > 0 && (
                          <div className="flex justify-between text-xs font-semibold mt-1 px-3 py-2 rounded"
                            style={{ background: accent + '10', color: accent }}>
                            <span>Annual total</span>
                            <span className="tabular-nums">{fmt(mthFinal * 12)}/yr</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Services included</p>
                      <ul className="space-y-1">
                        {selectedIds.map(id => {
                          const svc = getService(id) || customItems.find(i => i.id === id);
                          return svc ? (
                            <li key={id} className="flex items-start gap-1.5 text-xs text-ink-muted">
                              <CheckCircle size={11} className="shrink-0 mt-0.5" style={{ color: accent }} />
                              <span>{svc.name}{included[id] && <span className="text-green-600 ml-1">(incl.)</span>}</span>
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Discount */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Apply discount</p>
              <div className="flex gap-2 mb-3">
                {[{ k: 'pct', label: '% Percent' }, { k: 'flat', label: '$ Fixed' }].map(t => (
                  <button key={t.k} onClick={() => setDiscType(t.k)}
                    className="flex-1 py-1.5 text-xs font-semibold rounded border transition-colors"
                    style={{
                      background: discType === t.k ? accent : '#FFFFFF',
                      color: discType === t.k ? '#FFFFFF' : '#7A7E85',
                      borderColor: discType === t.k ? accent : '#E5E8EB',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input type="number" value={discValue} min={0}
                  onChange={e => setDiscValue(e.target.value)}
                  className="field text-right w-24 font-semibold tabular-nums" placeholder="0" />
                <span className="text-sm text-ink-muted">{discType === 'pct' ? '% off' : '$ off'}</span>
              </div>
              <div className="flex gap-4">
                {[
                  { key: 'setup', label: 'Setup', val: discSetup, set: setDiscSetup },
                  { key: 'monthly', label: 'Monthly', val: discMonthly, set: setDiscMonthly },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer">
                    <input type="checkbox" checked={opt.val} onChange={e => opt.set(e.target.checked)} style={{ accentColor: accent }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Tax rate */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Tax rate</p>
              {/* Zip code lookup */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={taxZip} onChange={e => setTaxZip(e.target.value.replace(/\D/g,'').slice(0,5))}
                  className="field w-24 text-sm" placeholder="ZIP code" maxLength={5} />
                <button onClick={handleTaxLookup} disabled={taxZip.length !== 5 || taxLooking}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-40 transition-all"
                  style={{ background: accent }}>
                  {taxLooking ? '…' : 'Auto-lookup'}
                </button>
              </div>
              {taxLookupResult && (
                <p className="text-xs text-green-700 mb-2 px-2 py-1 rounded" style={{ background: '#f0fdf4' }}>
                  📍 {taxLookupResult.city}, {taxLookupResult.state} — {taxLookupResult.tax_rate}% avg rate
                </p>
              )}
              <div className="flex items-center gap-2 mb-2">
                <input type="number" value={taxRate} min={0} max={30} step={0.01}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="field text-right w-24 font-semibold tabular-nums" placeholder="0" />
                <span className="text-sm text-ink-muted">% sales tax</span>
              </div>
              {taxRate > 0 && (
                <div className="text-xs text-ink-muted space-y-0.5 pt-2 border-t" style={{ borderColor: '#E5E8EB' }}>
                  <div className="flex justify-between">
                    <span>Setup subtotal</span><span>{fmt(setupFinal)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Tax ({taxRate}%)</span><span>+{fmt(taxAmt)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-ink">
                    <span>Total due</span><span>{fmt(grandTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button onClick={handleSave}
                disabled={saving || selectedCount === 0}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white py-2.5 rounded-lg disabled:opacity-40 transition-all"
                style={{ background: saveState === 'saved' ? '#22c55e' : accent }}>
                <Save size={15} /> {saveBtnLabel}
              </button>
              <button onClick={() => exportPDF(fullState)} disabled={selectedCount === 0}
                className="btn-ghost w-full disabled:opacity-40 flex items-center justify-center gap-2 text-sm">
                <Download size={15} /> Export PDF
              </button>
              <button onClick={() => openMailto(fullState)} disabled={selectedCount === 0}
                className="btn-ghost w-full disabled:opacity-40 flex items-center justify-center gap-2 text-sm">
                <Mail size={15} /> Email quote
              </button>
              <button onClick={handleClear} className="btn-danger-ghost w-full">
                <Trash2 size={13} /> Clear all
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <AddSectionModal
          accent={accent}
          accountId={account?.id}
          onCreated={handleSectionCreated}
          onClose={() => setShowAddSection(false)}
        />
      )}
    </div>
  );
}
