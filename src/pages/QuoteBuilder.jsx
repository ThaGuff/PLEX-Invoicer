import FinancingCalculator from '../components/FinancingCalculator';
import { canUseFeature } from '../utils/planFeatures';
import { saveDraftOffline, isOnline, onNetworkChange } from '../utils/offlineStore';
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
import { TEMPLATE_LIST, QUOTE_TEMPLATES } from '../data/quoteTemplates';
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
            className="custom-checkbox" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap">
            <span style={{ fontSize:14, fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', letterSpacing:'-0.01em', transition:'color 0.15s' }}>{svc.name}</span>
            <Badge type={svc.badge} />
          </div>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3, lineHeight:1.6 }}>{svc.desc || svc.description}</p>
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
              <span className="text-xs text-ink-muted">Price</span>
              {isIncluded ? <span className="text-xs font-semibold text-green-600 w-[86px] text-right">Included</span>
                : <PriceCell value={setupPrice} onChange={v => onPriceChange(svc.id, 'setup', v)} accent={accent} />}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-ink-muted">Recurring</span>
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
  const [newItem, setNewItem] = useState({ name: '', description: '', setup_price: '', monthly_price: '', unit: 'per job' });
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
        unit: newItem.unit || 'per job',
      });
      onItemAdded(created);
      setNewItem({ name: '', description: '', setup_price: '', monthly_price: '', unit: 'per job' });
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
    <div style={{ background:"var(--bg-surface)", border:"1.5px solid var(--border)", borderRadius:14, overflow:"hidden", marginBottom:12 }}>
      <button onClick={() => setOpen(o => !o)} className="section-trigger">
        <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,var(--blue),var(--forest))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 3px 10px rgba(61,214,140,0.2)' }}>
          <PlusCircle size={14} color="#fff" />
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
            <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-0.01em', flex:1 }}>{section.label}</span>
            <span className="text-xs text-ink-muted border px-1.5 py-0.5 rounded" style={{ borderColor: 'var(--border)' }}>custom</span>
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
            <div className="px-5 py-3 text-xs text-ink-muted italic border-t" style={{ borderColor: 'var(--border-subtle)' }}>
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
            <div className="px-5 py-4 border-t space-y-2.5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-page)' }}>
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
                    className="field pl-6 text-sm" placeholder="One-time price" />
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted">$</span>
                  <input type="number" min={0} value={newItem.monthly_price}
                    onChange={e => setNewItem(p => ({ ...p, monthly_price: e.target.value }))}
                    className="field pl-6 text-sm" placeholder="Recurring/mo" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddItem} disabled={!newItem.name.trim() || savingItem}
                  className="text-xs font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-40 flex items-center gap-1.5"
                  style={{ background: accent }}>
                  {savingItem ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
                  {savingItem ? 'Adding…' : 'Add service'}
                </button>
                <button onClick={() => { setAddingItem(false); setNewItem({ name:'', description:'', setup_price:'', monthly_price:'', unit:'per job' }); }}
                  className="btn-ghost text-xs py-2 px-3">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
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
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
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
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-page)' }}>
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
// Calculate quote win probability based on various factors
function calcWinProb(quote, clientHistory) {
  let score = 65; // base
  if (clientHistory?.accepted > 0) score += 10;
  if (clientHistory?.total > 3) score += 5;
  const amount = parseFloat(quote?.setup_total || 0);
  if (amount < 500) score += 10;
  if (amount > 5000) score -= 15;
  if (amount > 2000) score -= 5;
  const daysSinceSent = quote?.sent_at ? Math.floor((Date.now() - new Date(quote.sent_at)) / 86400000) : 0;
  if (daysSinceSent > 7) score -= 10;
  if (daysSinceSent > 14) score -= 15;
  return Math.max(15, Math.min(97, score));
}

export default function QuoteBuilder() {
  const { account, activeId, addCustomSection, updateCustomSection, addCustomItem, refreshAccount } = useAccount();
  const accent = '#3DD68C';
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
  const [offlineMode, setOfflineMode] = useState(!isOnline());

  // Monitor online/offline status
  React.useEffect(() => {
    const cleanup = onNetworkChange(online => setOfflineMode(!online));
    return cleanup;
  }, []);

  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [emailTo, setEmailTo] = React.useState('');
  const [emailName, setEmailName] = React.useState('');
  const [emailMsg, setEmailMsg] = React.useState('');
  const [emailSending, setEmailSending] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  const handleSendEmail = async () => {
    if (!emailTo.trim()) return;
    setEmailSending(true);
    try {
      const r = await fetch(`/api/quotes/${editId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ account_id: account?.id, recipient_email: emailTo.trim(), recipient_name: emailName.trim(), custom_message: emailMsg.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Send failed');
      setEmailSent(true);
      setTimeout(() => { setShowEmailModal(false); setEmailSent(false); setEmailTo(''); setEmailName(''); setEmailMsg(''); }, 2500);
    } catch(e) { alert('Failed to send: ' + e.message); }
    setEmailSending(false);
  };

  // Payment due date — defaults to 30 days from today, user can override
  const [dueUponReceipt, setDueUponReceipt] = useState(false);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD for date input
  });

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
  const [activePackage, setActivePackage] = useState(null); // null | 'good' | 'better' | 'best'
  const [taxZip, setTaxZip]               = useState('');
  const [taxLooking, setTaxLooking]       = useState(false);
  const [taxLookupResult, setTaxLookupResult] = useState(null);

  // Quote template state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateApplied, setTemplateApplied] = useState(false);

  // Website scraper state (now lives in QuoteBuilder)
  const [scanUrl, setScanUrl]       = useState('');
  const [scanning, setScanning]     = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleScan = async () => {
    if (!scanUrl.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const { scrapeWebsite } = await import('../utils/scraper');
      const result = await scrapeWebsite(scanUrl.trim());
      if (result.success && result.data) {
        const d = result.data;
        const svcs = d.services || [];
        if (svcs.length > 0) {
          const secId = 'scraped-' + Date.now();
          const newSec = { id: secId, name: d.businessName ? `${d.businessName} Services` : 'Imported Services', position: customSections.length };
          const newSvcItems = svcs.map((svc, i) => ({
            id: `scraped-svc-${i}`,
            section_id: secId,
            name: svc.name,
            description: svc.description || '',
            setup_price: svc.price || 0,   // Per-job pricing for service businesses
            monthly_price: 0,
            unit: 'per job',
            position: i,
          }));
          setLocalSections(prev => [...(prev ?? customSections), newSec]);
          setLocalItems(prev => [...(prev ?? customItems), ...newSvcItems]);
          setScanResult(`Imported ${svcs.length} services from ${d.businessName || 'website'}`);
        } else {
          setScanResult('No services found. Try a different URL or use a template above.');
        }
      } else {
        setScanResult('Scan failed. Please check the URL and try again.');
      }
    } catch (e) {
      setScanResult('Error scanning website: ' + e.message);
    }
    setScanning(false);
  };

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
      if (q.due_date) setDueDate(q.due_date);
      if (q.due_upon_receipt) setDueUponReceipt(true);
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
    agencyName:       account?.name             || 'Revanew',
    agencyEmail:      account?.email            || '',
    agencyPhone:      account?.phone            || '',
    agencyWebsite:    account?.website          || '',
    agencyAddress:    account?.business_address || '',
    agencyCityState:  account?.city_state_zip   || '',
    agencyLicense:    account?.license_number   || '',
    agencyTagline:    account?.company_tagline  || '',
    agencyTechnician: account?.technician_name  || '',
    agencyTaxNum:     account?.tax_number       || '',
    whiteLabelPlan:   canUseFeature(account?.plan, 'white_label'),
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
    setTaxLookupResult(null);
    // Timeout after 5 seconds — never block the user from saving
    const timeoutId = setTimeout(() => setTaxLooking(false), 5000);
    try {
      const result = await api.tax.lookup(taxZip);
      if (result?.tax_rate != null) {
        setTaxLookupResult(result);
        setTaxRate(result.tax_rate);
      }
    } catch (e) {
      // Fail silently — user can enter rate manually
    } finally {
      clearTimeout(timeoutId);
      setTaxLooking(false);
    }
  };

  const handleSave = async () => {
    if (!account?.id) return;
    // If ZIP lookup is in progress, cancel it and save with current rate
    setTaxLooking(false);
    setSaving(true);
    setSaveState('saving');
    try {
      const payload = {
        account_id:      account.id,
        contact_id:      selectedContactId || null,
        client_name:     clientName,
        client_biz:      clientBiz,
        client_email:    clientEmail,
        due_date:        dueUponReceipt ? 'due_upon_receipt' : dueDate,
        due_upon_receipt: dueUponReceipt ? 1 : 0,
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
          {canUseFeature(account?.plan, 'ai_parse') ? (
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
          ) : (
            <button onClick={() => window.location.href='/billing'}
              className="btn-ghost flex items-center gap-1.5 text-sm opacity-70"
              title="Upgrade to Pro for AI parsing">
              <Bot size={14} /> AI parse
              <span style={{ fontSize:'8px', fontWeight:700, background:'linear-gradient(135deg,#0D1A0D,#3DD68C)', color:'#fff', padding:'1px 5px', borderRadius:'8px', marginLeft:'2px' }}>PRO</span>
            </button>
          )}
          {!isNew && (
            <button onClick={handleConvert}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:'#0D1A0D', color:'#C8FF00', border:'1.5px solid #C8FF0040', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans', sans-serif", flexShrink:0, transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='#162216'; e.currentTarget.style.borderColor='#C8FF0060'; }}
              onMouseLeave={e => { e.currentTarget.style.background='#0D1A0D'; e.currentTarget.style.borderColor='#C8FF0040'; }}>
              <RefreshCw size={13} /> Convert to invoice
            </button>
          )}
          <button onClick={handleSave}
            disabled={saving || selectedCount === 0}
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-40 transition-all"
            style={{ background: saveState === 'saved' ? '#3DD68C' : accent }}>
            <Save size={14} /> {saveBtnLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* ── LEFT ── */}
        <div>

          {/* Company branding header — always shows logo */}
          {(account?.logo_url || account?.name) && (
            <div className="card p-4 mb-4" style={{ background: `linear-gradient(135deg, ${accent}08, ${accent}04)`, borderColor: `${accent}20` }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {account?.logo_url ? (
                  <img src={account.logo_url} alt={account.name} style={{ height:48, maxWidth:120, objectFit:'contain', borderRadius:8, background:'white', padding:4, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }} />
                ) : (
                  <img src="/logo-revanew.png" alt="Revanew"
                    style={{ width:48, height:48, borderRadius:10, objectFit:'contain', flexShrink:0, background:'#0d1b6b', padding:4 }} />
                )}
                <div>
                  <p style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', lineHeight:1.2 }}>{account?.name}</p>
                  {account?.email && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{account.email}</p>}
                  {account?.phone && <p style={{ fontSize:12, color:'var(--text-muted)' }}>{account.phone}</p>}
                </div>
                {!canUseFeature(account?.plan, 'white_label') && (
                  <div style={{ marginLeft:'auto', textAlign:'right' }}>
                    <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600 }}>Powered by</p>
                    <a href="https://revanew.io" target="_blank" rel="noopener noreferrer" style={{ fontSize:12, fontWeight:700, color: accent, textDecoration:'none' }}>Revanew.io</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client info */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
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
              {/* Payment Due Date — with "Due upon receipt" option */}
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Payment Due Date</label>
                {/* Due upon receipt checkbox */}
                <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, cursor:'pointer', userSelect:'none' }}>
                  <input
                    type="checkbox"
                    checked={dueUponReceipt}
                    onChange={e => setDueUponReceipt(e.target.checked)}
                    style={{ width:16, height:16, accentColor: accent, cursor:'pointer' }}
                  />
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Due upon receipt</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>Payment expected immediately on completion</span>
                </label>
                {!dueUponReceipt && (
                  <>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="field"
                      min={new Date().toISOString().split('T')[0]}
                      style={{ colorScheme: 'light dark' }}
                    />
                    <p className="text-xs text-ink-muted mt-1">
                      {dueDate ? `Due ${new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Set payment deadline'}
                    </p>
                  </>
                )}
                {dueUponReceipt && (
                  <p style={{ fontSize:12, color: accent, fontWeight:600, marginTop:4 }}>✓ Payment due upon receipt of invoice</p>
                )}
              </div>
            </div>
          </div>

          {/* ── QUOTE TEMPLATE SELECTOR ── */}
          <div className="card p-5 mb-4" style={{ border: `1.5px solid ${accent}30` }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 18 }}>📋</span>
              <div>
                <p className="text-sm font-bold text-ink">Industry Quote Templates</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Load pre-built services for your trade — then customize as needed</p>
              </div>
            </div>

            {/* Template Dropdown */}
            <select
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2.5 mb-3 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <option value="">— Select your trade / industry —</option>
              {TEMPLATE_LIST.map(t => (
                <option key={t.id} value={t.id}>
                  {t.icon}  {t.name} — {t.description}
                </option>
              ))}
            </select>

            {selectedTemplate && QUOTE_TEMPLATES[selectedTemplate] && (
              <div>
                {/* Template preview */}
                <div className="flex items-center justify-between mb-3 p-3 rounded-lg" style={{ background: QUOTE_TEMPLATES[selectedTemplate].color + '10', border: `1px solid ${QUOTE_TEMPLATES[selectedTemplate].color}30` }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 22 }}>{QUOTE_TEMPLATES[selectedTemplate].icon}</span>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <p className="text-sm font-bold" style={{ color: QUOTE_TEMPLATES[selectedTemplate].color }}>{QUOTE_TEMPLATES[selectedTemplate].name}</p>
                      {account?.default_template === selectedTemplate && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:8, background:'#3DD68C20', color:'#3DD68C', border:'1px solid #3DD68C40' }}>⭐ Your default</span>
                      )}
                    </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {QUOTE_TEMPLATES[selectedTemplate].sections.reduce((a, s) => a + s.services.length, 0)} services across {QUOTE_TEMPLATES[selectedTemplate].sections.length} categories
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const tmpl = QUOTE_TEMPLATES[selectedTemplate];
                      if (!tmpl) return;

                      // Add each section and its services as custom catalog items
                      const newSections = [];
                      const newItems = [];
                      tmpl.sections.forEach((sec, si) => {
                        const secId = `tmpl-${selectedTemplate}-sec-${si}`;
                        newSections.push({ id: secId, name: sec.name, position: customSections.length + si });
                        sec.services.forEach((svc, svi) => {
                          newItems.push({
                            id: svc.id,
                            section_id: secId,
                            name: svc.name,
                            description: svc.description,
                            setup_price: svc.defaultPrice,   // Trade services = per job / per unit price
                            monthly_price: 0,
                            unit: svc.unit,
                            position: svi,
                          });
                        });
                      });

                      // Merge into existing custom catalog
                      setLocalSections(prev => {
                        const base = prev ?? customSections;
                        const existing = new Set(base.map(s => s.id));
                        return [...base, ...newSections.filter(s => !existing.has(s.id))];
                      });
                      setLocalItems(prev => {
                        const base = prev ?? customItems;
                        const existing = new Set(base.map(i => i.id));
                        return [...base, ...newItems.filter(i => !existing.has(i.id))];
                      });

                      // Pre-fill notes and payment terms
                      setNotes(tmpl.notes || notes);

                      setTemplateApplied(true);
                      setSelectedTemplate('');
                      setTimeout(() => setTemplateApplied(false), 3000);
                    }}
                    className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all"
                    style={{ background: QUOTE_TEMPLATES[selectedTemplate].color, boxShadow: `0 4px 12px ${QUOTE_TEMPLATES[selectedTemplate].color}40` }}>
                    Load Template ✨
                  </button>
                  {account?.id && (
                    <button
                      onClick={async () => {
                        try {
                          const t = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
                          await fetch(`/api/accounts/${account.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type':'application/json', Authorization:`Bearer ${t}` },
                            body: JSON.stringify({ default_template: selectedTemplate })
                          });
                          await refreshAccount();
                          setTemplateApplied(true);
                          setTimeout(() => setTemplateApplied(false), 3000);
                        } catch(e) { console.error(e); }
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      title="Auto-load this template for all new quotes">
                      ⭐ Set as default
                    </button>
                  )}
                </div>

                {/* Section preview */}
                <div className="grid gap-1">
                  {QUOTE_TEMPLATES[selectedTemplate].sections.map(sec => (
                    <div key={sec.name} className="flex items-center justify-between text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-raised)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sec.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{sec.services.length} services</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {templateApplied && (
              <div className="mt-3 p-3 rounded-lg text-sm font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: '#3DD68C', border: '1px solid rgba(34,197,94,0.2)' }}>
                ✅ Template loaded! Services added to your catalog below. Customize prices as needed.
              </div>
            )}
          </div>

          {/* ── Website Scraper (Import from URL) ── */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 16 }}>🌐</span>
              <div>
                <p className="text-sm font-bold text-ink">Import from Website</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Scan your website to auto-import services and pricing</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://yourwebsite.com"
                value={scanUrl ?? ''}
                onChange={e => setScanUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                className="flex-1 text-sm border rounded-lg px-3 py-2 bg-white"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              />
              <button
                onClick={handleScan}
                disabled={scanning || !scanUrl?.trim()}
                className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#3DD68C' }}>
                {scanning ? '⏳ Scanning…' : '🔍 Scan'}
              </button>
            </div>
            {scanResult && (
              <div className="mt-2 p-2 rounded text-xs" style={{ background: 'rgba(34,197,94,0.08)', color: '#3DD68C', border: '1px solid rgba(34,197,94,0.2)' }}>
                ✅ {scanResult}
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
            <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
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
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {account?.logo_url && (
                    <img src={account.logo_url} alt="" style={{ width:28, height:28, borderRadius:6, objectFit:'contain', background:'#fff', padding:2, flexShrink:0 }} />
                  )}
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={14} /> {account?.name || 'Quote summary'}
                  </span>
                </div>
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

                    <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
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
                        <div className="flex justify-between items-baseline pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-sm font-bold text-ink">Due today</span>
                          <span className="text-xl font-bold text-ink tabular-nums">{fmt(setupFinal)}</span>
                        </div>
                        {taxRate > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-ink-muted">Tax ({taxRate}%)</span>
                              <span className="tabular-nums text-red-600">+{fmt(taxAmt)}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-1.5 border-t font-bold" style={{ borderColor: 'var(--border)' }}>
                              <span className="text-sm text-ink">Total incl. tax</span>
                              <span className="text-xl text-ink tabular-nums" style={{ color: accent }}>{fmt(grandTotal)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
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
                        <div className="flex justify-between items-baseline pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
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
                      borderColor: discType === t.k ? accent : 'var(--border)',
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
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.9px' }}>Tax rate</p>
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
                <div className="text-xs text-ink-muted space-y-0.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
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

            {/* Financing options */}
            {setupFinal > 0 && (
              <FinancingCalculator
                totalAmount={setupFinal + taxAmt}
                onSelectFinancing={(plan) => console.info('Financing selected:', plan)}
              />
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              <button onClick={handleSave}
                disabled={saving || selectedCount === 0}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white py-2.5 rounded-lg disabled:opacity-40 transition-all"
                style={{ background: saveState === 'saved' ? '#3DD68C' : accent }}>
                <Save size={15} /> {saveBtnLabel}
              </button>
              <button onClick={() => window.print()} disabled={selectedCount === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
              <button onClick={async () => {
                // If logo is a URL (not data:), fetch it first for jsPDF
                let exportState = { ...fullState };
                if (exportState.agencyLogoUrl && !exportState.agencyLogoUrl.startsWith('data:')) {
                  try {
                    const logoR = await fetch(exportState.agencyLogoUrl);
                    const blob = await logoR.blob();
                    const reader = new FileReader();
                    const dataUrl = await new Promise(res => {
                      reader.onload = e => res(e.target.result);
                      reader.readAsDataURL(blob);
                    });
                    exportState.agencyLogoUrl = dataUrl;
                  } catch(e) { 
                    console.warn('Logo fetch for PDF failed:', e);
                    exportState.agencyLogoUrl = null;
                  }
                }
                exportPDF(exportState);
              }} disabled={selectedCount === 0}
                className="btn-ghost w-full disabled:opacity-40 flex items-center justify-center gap-2 text-sm">
                <Download size={15} /> Export PDF
              </button>
              <button onClick={() => setShowEmailModal(true)} disabled={selectedCount === 0}
                className="btn-ghost w-full disabled:opacity-40 flex items-center justify-center gap-2 text-sm">
                <Mail size={15} /> Email quote
              </button>
              <button onClick={handleClear} className="btn-danger-ghost w-full">
                <Trash2 size={13} /> Clear all
              </button>
            </div>

            {/* Revanew branding */}
            <div style={{ marginTop: 16, textAlign: 'center', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4l3 3"/></svg>
                Powered by{' '}
                <a href="https://revanew.io" target="_blank" rel="noopener noreferrer"
                  style={{ color: accent, fontWeight: 700, textDecoration: 'none' }}>
                  Revanew.io
                </a>
              </p>
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
