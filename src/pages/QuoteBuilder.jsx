import React, { useState, useCallback } from 'react';
import {
  Zap, Bot, Megaphone, LayoutDashboard, PlusCircle, Globe,
  ChevronDown, ChevronUp, Download, Mail, Trash2,
  Calendar, CreditCard, CheckCircle, Info, FileText, Users, TrendingUp,
} from 'lucide-react';
import { SERVICES, SECTIONS, YEARLY_DISCOUNT_DEFAULT, getService } from '../data/services';
import { useAccount } from '../context/AccountContext';
import { exportPDF } from '../utils/exportPDF';
import { openMailto } from '../utils/exportEmail';
import AccountSwitcher from '../components/AccountSwitcher';
import AccountSettings from '../components/AccountSettings';
import NewAccountModal from '../components/NewAccountModal';

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

function Section({ section, services, selected, included, prices, billingMode, yearlyDiscount, onToggle, onPriceChange, onIncludeChange, accent, isCustom }) {
  const [open, setOpen] = useState(section.id === 'web' || section.id === 'core' || isCustom);
  const Icon = SECTION_ICONS[section.id] || PlusCircle;
  const count = services.filter(s => selected[s.id]).length;
  const isWeb = section.id === 'web';
  return (
    <div className={`card overflow-hidden mb-3 ${isWeb ? '' : ''}`} style={isWeb ? { borderColor: accent + '40' } : {}}>
      <button onClick={() => setOpen(o => !o)} className="section-trigger w-full text-left">
        <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 text-white"
          style={{ background: isCustom ? accent : isWeb ? accent : '#1a1a1a' }}>
          <Icon size={14} />
        </div>
        <span className="text-sm font-semibold text-ink flex-1">{section.label}</span>
        {isCustom && <span className="text-xs text-ink-muted border px-1.5 py-0.5 rounded" style={{ borderColor: '#E5E8EB' }}>custom</span>}
        {count > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: accent }}>{count}</span>}
        {open ? <ChevronUp size={15} className="text-ink-muted shrink-0" /> : <ChevronDown size={15} className="text-ink-muted shrink-0" />}
      </button>
      {open && isWeb && (
        <div className="mx-5 mt-0 mb-2 px-3 py-2 rounded text-xs text-ink-muted flex items-start gap-2 border"
          style={{ background: '#f0fafd', borderColor: '#baeaf9' }}>
          <Info size={12} className="shrink-0 mt-0.5" style={{ color: accent }} />
          <span>Select a <strong>website build</strong> (one-time) and optionally a <strong>management plan</strong> (monthly). Can be combined with any automation services.</span>
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

function computeTotals({ selected, included, prices, billingMode, yearlyDiscount, discType, discValue, discSetup, discMonthly, customItems = [] }) {
  const selectedIds = Object.keys(selected).filter(id => selected[id]);
  let setupSub = 0, mthSub = 0;
  selectedIds.forEach(id => {
    if (included[id]) return;
    const svc = getService(id) || customItems.find(i => i.id === id);
    if (!svc) return;
    setupSub += prices[id]?.setup ?? svc.setup ?? 0;
    const mthRaw = prices[id]?.monthly ?? svc.monthly ?? 0;
    mthSub += billingMode === 'annual' ? mthRaw * (1 - yearlyDiscount / 100) : mthRaw;
  });
  const dv = parseFloat(discValue) || 0;
  let setupDiscAmt = 0, mthDiscAmt = 0;
  if (discType === 'pct') {
    if (discSetup)   setupDiscAmt = setupSub * (dv / 100);
    if (discMonthly) mthDiscAmt   = mthSub   * (dv / 100);
  } else {
    if (discSetup && discMonthly) { setupDiscAmt = dv/2; mthDiscAmt = dv/2; }
    else if (discSetup)   setupDiscAmt = Math.min(dv, setupSub);
    else if (discMonthly) mthDiscAmt   = Math.min(dv, mthSub);
  }
  return {
    setupSub, mthSub,
    setupDiscAmt: Math.min(setupDiscAmt, setupSub),
    mthDiscAmt:   Math.min(mthDiscAmt,   mthSub),
    setupFinal: Math.max(0, setupSub - Math.min(setupDiscAmt, setupSub)),
    mthFinal:   Math.max(0, mthSub   - Math.min(mthDiscAmt,   mthSub)),
    selectedIds,
  };
}

export default function QuoteBuilder() {
  const { account, activeId } = useAccount();
  const accent = account?.primaryColor || '#13B5EA';

  const [showSettings, setShowSettings] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);

  const [clientName,  setClientName]  = useState('');
  const [clientBiz,   setClientBiz]   = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
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
  const [notes, setNotes] = useState(
    'Pricing valid for 30 days. Monthly billing starts after setup is complete. Setup begins within 48 hours of signed agreement and initial deposit. No long-term contracts on monthly services.'
  );

  // Reset selections when account switches
  React.useEffect(() => {
    setSelected({}); setSectionMap({}); setIncluded({}); setPrices({});
    setDiscValue(0);
  }, [activeId]);

  const handleToggle    = useCallback((id, sectionId, checked) => {
    setSelected(s  => ({ ...s,  [id]: checked }));
    setSectionMap(m => ({ ...m, [id]: sectionId }));
  }, []);
  const handlePriceChange  = useCallback((id, field, value) => setPrices(p => ({ ...p, [id]: { ...p[id], [field]: value } })), []);
  const handleIncludeChange = useCallback((id, value) => setIncluded(i => ({ ...i, [id]: value })), []);
  const handleClear = () => { setSelected({}); setSectionMap({}); setIncluded({}); setPrices({}); setDiscValue(0); };

  const customSections = account?.customSections || [];
  const customItems    = account?.customItems    || [];

  const fullState = {
    agencyName:    account?.name    || 'PLEX Automation',
    agencyEmail:   account?.email   || 'hello@plexautomation.io',
    agencyPhone:   account?.phone   || '256-609-4618',
    agencyWebsite: account?.website || 'plexautomation.io',
    primaryColor:  accent,
    clientName, clientBiz, clientEmail, clientPhone,
    quoteDate, billingMode, yearlyDiscount,
    selected, sectionMap, included, prices,
    discType, discValue, discSetup, discMonthly,
    notes, customSections, customItems,
  };

  const { setupSub, mthSub, setupDiscAmt, mthDiscAmt, setupFinal, mthFinal, selectedIds } =
    computeTotals({ ...fullState });
  const selectedCount = selectedIds.length;

  return (
    <div className="min-h-screen" style={{ background: '#F5F7F8' }}>

      {/* ── Header ── */}
      <header className="bg-white border-b sticky top-0 z-40 no-print" style={{ borderColor: '#E5E8EB' }}>
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-white text-sm select-none"
              style={{ background: accent }}>
              {(account?.logoInitial || account?.name?.[0] || 'P').toUpperCase()}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-ink text-sm tracking-tight">{account?.name || 'PLEX Automation'}</span>
              <span className="text-ink-muted text-xs">·</span>
              <span className="text-ink-muted text-xs">Quote Builder</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="text-xs text-ink-muted hidden sm:block">{selectedCount} selected</span>
            )}
            <AccountSwitcher
              onOpenSettings={() => setShowSettings(true)}
              onNewAccount={() => setShowNewAccount(true)}
            />
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background: accent }} />
      </header>

      {/* ── Modals ── */}
      {showSettings   && <AccountSettings onClose={() => setShowSettings(false)} />}
      {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} onCreated={() => {}} />}

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

          {/* LEFT */}
          <div>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-ink">New quote</h1>
              <p className="text-sm text-ink-muted mt-0.5">Select services, set billing, adjust pricing — then export or send.</p>
            </div>

            {/* Client info */}
            <div className="card p-5 mb-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#E5E8EB' }}>
                <Users size={14} style={{ color: accent }} />
                <span className="text-sm font-semibold text-ink">Client details</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: clientName,  s: setClientName,  label: 'Contact name',  ph: 'Jane Smith' },
                  { v: clientBiz,   s: setClientBiz,   label: 'Business name', ph: 'Acme Roofing' },
                  { v: clientEmail, s: setClientEmail, label: 'Email',          ph: 'jane@business.com', type: 'email' },
                  { v: clientPhone, s: setClientPhone, label: 'Phone',          ph: '(256) 000-0000' },
                  { v: quoteDate,   s: setQuoteDate,   label: 'Quote date',     ph: 'May 15, 2026' },
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
                      style={{ borderColor: accent, color: accent, borderRadius: '5px' }} />
                    <span className="text-sm font-semibold text-ink">% off</span>
                  </div>
                </div>
              )}
            </div>

            {/* Built-in PLEX sections */}
            {SECTIONS.map(sec => (
              <Section key={sec.id} section={sec} services={SERVICES[sec.id]}
                selected={selected} included={included} prices={prices}
                billingMode={billingMode} yearlyDiscount={yearlyDiscount}
                onToggle={handleToggle} onPriceChange={handlePriceChange}
                onIncludeChange={handleIncludeChange} accent={accent} />
            ))}

            {/* Custom sections */}
            {customSections.map(sec => (
              <Section key={sec.id}
                section={{ id: sec.id, label: sec.label }}
                services={customItems.filter(i => i.sectionId === sec.id)}
                selected={selected} included={included} prices={prices}
                billingMode={billingMode} yearlyDiscount={yearlyDiscount}
                onToggle={handleToggle} onPriceChange={handlePriceChange}
                onIncludeChange={handleIncludeChange} accent={accent} isCustom />
            ))}

            {customSections.length === 0 && (
              <button onClick={() => setShowSettings(true)}
                className="w-full mb-3 border-2 border-dashed rounded-xl py-4 text-sm text-ink-muted hover:text-ink hover:border-ink-muted transition-colors flex items-center justify-center gap-2"
                style={{ borderColor: '#BFC3C8' }}>
                <PlusCircle size={15} />
                Add custom services for {account?.name || 'this account'} → Account settings
              </button>
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

          {/* RIGHT */}
          <div>
            <div className="sticky top-20 space-y-3">

              {/* Summary */}
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

                      {/* Setup */}
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
                        </div>
                      </div>

                      {/* Monthly */}
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
                              style={{ background: accent + '10', color: accent, borderRadius: '6px' }}>
                              <span>Annual total</span>
                              <span className="tabular-nums">{fmt(mthFinal * 12)}/yr</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* List */}
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
                        borderColor: discType === t.k ? accent : '#E5E8EB', borderRadius: '5px',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <input type="number" value={discValue} min={0} onChange={e => setDiscValue(e.target.value)}
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

              {/* Actions */}
              <div className="space-y-2">
                <button onClick={() => exportPDF(fullState)} disabled={selectedCount === 0}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white py-2.5 rounded-lg transition-all disabled:opacity-40"
                  style={{ background: accent }}>
                  <Download size={15} /> Export PDF quote
                </button>
                <button onClick={() => openMailto(fullState)} disabled={selectedCount === 0}
                  className="btn-ghost w-full disabled:opacity-40">
                  <Mail size={15} /> Email quote to client
                </button>
                <button onClick={handleClear} className="btn-danger-ghost w-full">
                  <Trash2 size={13} /> Clear all
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-8 py-4 no-print" style={{ borderColor: '#E5E8EB', background: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
          <span className="text-xs text-ink-muted">{account?.name} · {account?.website} · {account?.phone}</span>
          <span className="text-xs text-ink-muted">Quote Builder v3.0</span>
        </div>
      </footer>
    </div>
  );
}
