import React, { useState, useCallback } from 'react';
import {
  Zap, Bot, Megaphone, LayoutDashboard, PlusCircle, Globe,
  ChevronDown, ChevronUp, Download, Mail, Trash2,
  Settings, Calendar, CreditCard, CheckCircle, Info, X,
  TrendingUp, FileText, Users,
} from 'lucide-react';
import { SERVICES, SECTIONS, YEARLY_DISCOUNT_DEFAULT, getService } from '../data/services';
import { exportPDF } from '../utils/exportPDF';
import { openMailto } from '../utils/exportEmail';

const SECTION_ICONS = {
  web: Globe, core: Zap, ai: Bot,
  mkt: Megaphone, crm: LayoutDashboard, addon: PlusCircle,
};

function fmt(n, decimals = 0) {
  const v = Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return '$' + v.toLocaleString();
}

function Badge({ type }) {
  if (!type) return null;
  const cls = { popular: 'badge-popular', new: 'badge-new', addon: 'badge-addon' }[type] || 'badge-addon';
  return <span className={`badge ${cls} ml-2`}>{type}</span>;
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle-track" title={label}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-thumb" />
    </label>
  );
}

function PriceCell({ value, onChange, disabled }) {
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none">$</span>
      <input
        type="number"
        value={value}
        min={0}
        step={1}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="field-price w-[88px] pl-5"
      />
    </div>
  );
}

function ServiceRow({ svc, sectionId, isSelected, isIncluded, setupPrice, monthlyPrice, billingMode, yearlyDiscount, onToggle, onPriceChange, onIncludeChange }) {
  const effectiveMonthly = billingMode === 'annual' && !isIncluded
    ? monthlyPrice * (1 - yearlyDiscount / 100)
    : monthlyPrice;
  const savings = monthlyPrice * (yearlyDiscount / 100);

  return (
    <div className={`svc-row ${isSelected ? 'active' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Check */}
        <div className="pt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => onToggle(svc.id, sectionId, e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: '#C97B2E' }}
          />
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-0.5">
            <span className={`text-sm font-medium ${isSelected ? 'text-ink' : 'text-gray-500'}`}>
              {svc.name}
            </span>
            <Badge type={svc.badge} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{svc.desc}</p>
          {isSelected && billingMode === 'annual' && monthlyPrice > 0 && !isIncluded && (
            <p className="text-xs font-medium mt-1" style={{ color: '#C97B2E' }}>
              Annual saves {fmt(savings)}/mo · {fmt(savings * 12)}/yr
            </p>
          )}
        </div>

        {/* Price controls — shown when selected */}
        {isSelected && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
            {/* Included toggle */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">Incl.</span>
              <Toggle checked={isIncluded} onChange={v => onIncludeChange(svc.id, v)} />
            </div>

            {/* Setup */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">Setup</span>
              {isIncluded
                ? <span className="text-xs font-medium text-green-600 w-[88px] text-right">Included</span>
                : <PriceCell value={setupPrice} onChange={v => onPriceChange(svc.id, 'setup', v)} />}
            </div>

            {/* Monthly */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">Monthly</span>
              {isIncluded
                ? <span className="text-xs font-medium text-green-600 w-[88px] text-right">Included</span>
                : (
                  <div className="flex flex-col items-end">
                    <PriceCell value={monthlyPrice} onChange={v => onPriceChange(svc.id, 'monthly', v)} />
                    {billingMode === 'annual' && monthlyPrice > 0 && (
                      <span className="text-xs mt-0.5" style={{ color: '#C97B2E' }}>
                        {fmt(effectiveMonthly)} billed
                      </span>
                    )}
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ section, services, selected, included, prices, billingMode, yearlyDiscount, onToggle, onPriceChange, onIncludeChange }) {
  const [open, setOpen] = useState(section.id === 'web' || section.id === 'core');
  const Icon = SECTION_ICONS[section.id] || Zap;
  const count = services.filter(s => selected[s.id]).length;
  const isWeb = section.id === 'web';

  return (
    <div className={`card overflow-hidden mb-3 ${isWeb ? 'border-ramp/40' : ''}`}>
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="section-trigger w-full text-left"
        style={isWeb ? { borderBottom: open ? '1px solid #f0f0e8' : 'none' } : {}}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isWeb ? 'bg-ramp' : 'bg-ink'}`}>
          <Icon size={14} className={isWeb ? 'text-ink' : 'text-ramp'} />
        </div>
        <span className="text-sm font-semibold text-ink flex-1">{section.label}</span>
        {count > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand text-white">{count}</span>
        )}
        {open
          ? <ChevronUp size={15} className="text-gray-400 shrink-0" />
          : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
      </button>

      {/* Web section gets a callout */}
      {open && isWeb && (
        <div className="mx-5 mt-3 mb-1 px-3 py-2 rounded-xl text-xs text-ink/70 flex items-start gap-2 border border-ramp/30" style={{ background: '#fdfde8' }}>
          <Info size={13} className="shrink-0 mt-0.5" style={{ color: '#C97B2E' }} />
          <span>Select a <strong>website build</strong> (one-time) and optionally add a <strong>management plan</strong> (monthly). These can be bundled with any automation services below.</span>
        </div>
      )}

      {open && (
        <div className="divide-y divide-gray-50">
          {services.map(svc => (
            <ServiceRow
              key={svc.id}
              svc={svc}
              sectionId={section.id}
              isSelected={!!selected[svc.id]}
              isIncluded={!!included[svc.id]}
              setupPrice={prices[svc.id]?.setup ?? svc.setup}
              monthlyPrice={prices[svc.id]?.monthly ?? svc.monthly}
              billingMode={billingMode}
              yearlyDiscount={yearlyDiscount}
              onToggle={onToggle}
              onPriceChange={onPriceChange}
              onIncludeChange={onIncludeChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function computeTotals(state) {
  const { selected, included, prices, billingMode, yearlyDiscount, discType, discValue, discSetup, discMonthly } = state;
  const selectedIds = Object.keys(selected).filter(id => selected[id]);

  let setupSub = 0, mthSub = 0;
  selectedIds.forEach(id => {
    if (included[id]) return;
    const svc = getService(id);
    if (!svc) return;
    setupSub += prices[id]?.setup ?? svc.setup;
    const mthRaw = prices[id]?.monthly ?? svc.monthly;
    mthSub += billingMode === 'annual' ? mthRaw * (1 - yearlyDiscount / 100) : mthRaw;
  });

  const dv = parseFloat(discValue) || 0;
  let setupDiscAmt = 0, mthDiscAmt = 0;
  if (discType === 'pct') {
    if (discSetup) setupDiscAmt = setupSub * (dv / 100);
    if (discMonthly) mthDiscAmt = mthSub * (dv / 100);
  } else {
    if (discSetup && discMonthly) { setupDiscAmt = dv / 2; mthDiscAmt = dv / 2; }
    else if (discSetup) setupDiscAmt = Math.min(dv, setupSub);
    else if (discMonthly) mthDiscAmt = Math.min(dv, mthSub);
  }
  setupDiscAmt = Math.min(setupDiscAmt, setupSub);
  mthDiscAmt = Math.min(mthDiscAmt, mthSub);

  return {
    setupSub,
    mthSub,
    setupDiscAmt,
    mthDiscAmt,
    setupFinal: Math.max(0, setupSub - setupDiscAmt),
    mthFinal: Math.max(0, mthSub - mthDiscAmt),
    selectedIds,
  };
}

export default function QuoteBuilder() {
  const [showSettings, setShowSettings] = useState(false);
  const [agency, setAgency] = useState({
    agencyName: 'PLEX Automation',
    agencyEmail: 'hello@plexautomation.io',
    agencyPhone: '256-609-4618',
    agencyWebsite: 'plexautomation.io',
  });

  // Client
  const [clientName, setClientName] = useState('');
  const [clientBiz, setClientBiz] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [quoteDate, setQuoteDate] = useState(() =>
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  );

  // Billing
  const [billingMode, setBillingMode] = useState('monthly');
  const [yearlyDiscount, setYearlyDiscount] = useState(YEARLY_DISCOUNT_DEFAULT);

  // Services
  const [selected, setSelected] = useState({});
  const [sectionMap, setSectionMap] = useState({});
  const [included, setIncluded] = useState({});
  const [prices, setPrices] = useState({});

  // Discount
  const [discType, setDiscType] = useState('pct');
  const [discValue, setDiscValue] = useState(0);
  const [discSetup, setDiscSetup] = useState(true);
  const [discMonthly, setDiscMonthly] = useState(true);

  // Notes
  const [notes, setNotes] = useState(
    'Pricing valid for 30 days. Monthly billing via GHL invoicing. Setup begins within 48 hours of signed agreement and initial deposit. No long-term contracts on monthly services.'
  );

  const handleToggle = useCallback((id, sectionId, checked) => {
    setSelected(s => ({ ...s, [id]: checked }));
    setSectionMap(m => ({ ...m, [id]: sectionId }));
  }, []);

  const handlePriceChange = useCallback((id, field, value) => {
    setPrices(p => ({ ...p, [id]: { ...p[id], [field]: value } }));
  }, []);

  const handleIncludeChange = useCallback((id, value) => {
    setIncluded(i => ({ ...i, [id]: value }));
  }, []);

  const handleClear = () => {
    setSelected({}); setSectionMap({}); setIncluded({});
    setPrices({}); setDiscValue(0);
  };

  const fullState = {
    ...agency,
    clientName, clientBiz, clientEmail, clientPhone,
    quoteDate, billingMode, yearlyDiscount,
    selected, sectionMap, included, prices,
    discType, discValue, discSetup, discMonthly,
    notes,
  };

  const totals = computeTotals(fullState);
  const { setupSub, mthSub, setupDiscAmt, mthDiscAmt, setupFinal, mthFinal, selectedIds } = totals;
  const selectedCount = selectedIds.length;

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="bg-ink border-b border-ink-soft sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-ink text-sm" style={{ background: '#EBF123' }}>P</div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">{agency.agencyName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium text-ink" style={{ background: '#EBF123' }}>Quote Builder</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="text-xs text-gray-400">
                {selectedCount} service{selectedCount !== 1 ? 's' : ''} · {fmt(mthFinal)}/mo · {fmt(setupFinal)} today
              </span>
            )}
            <button
              onClick={() => setShowSettings(s => !s)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-ink-soft hover:border-gray-500 transition-colors"
            >
              <Settings size={13} />
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* ── Agency settings drawer ─────────────────────────────────── */}
      {showSettings && (
        <div className="border-b bg-white no-print" style={{ borderColor: '#f0f0e8' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings size={14} className="text-brand" />
                <span className="text-sm font-semibold text-ink">Agency settings</span>
              </div>
              <button onClick={() => setShowSettings(false)}>
                <X size={15} className="text-gray-400 hover:text-ink" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'agencyName', label: 'Agency name', placeholder: 'PLEX Automation' },
                { key: 'agencyEmail', label: 'Email', placeholder: 'hello@plex.io' },
                { key: 'agencyPhone', label: 'Phone', placeholder: '256-000-0000' },
                { key: 'agencyWebsite', label: 'Website', placeholder: 'plexautomation.io' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={agency[f.key]}
                    placeholder={f.placeholder}
                    onChange={e => setAgency(a => ({ ...a, [f.key]: e.target.value }))}
                    className="field"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* LEFT */}
          <div>
            <div className="mb-5">
              <h1 className="text-2xl font-semibold text-ink tracking-tight">Build a quote</h1>
              <p className="text-sm text-gray-400 mt-1">Select services, set billing mode, adjust pricing — then export or email.</p>
            </div>

            {/* ── Client block ── */}
            <div className="card p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Users size={14} className="text-brand" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client information</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { state: clientName, set: setClientName, label: 'Client / Contact name', ph: 'Jane Smith' },
                  { state: clientBiz,  set: setClientBiz,  label: 'Business name',        ph: 'e.g. McLain Team SIP' },
                  { state: clientEmail,set: setClientEmail,label: 'Email address',         ph: 'jane@business.com', type: 'email' },
                  { state: clientPhone,set: setClientPhone,label: 'Phone number',          ph: '(256) 000-0000' },
                  { state: quoteDate,  set: setQuoteDate,  label: 'Quote date',            ph: 'May 15, 2026' },
                ].map((f, i) => (
                  <div key={i} className={i === 4 ? '' : ''}>
                    <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      value={f.state}
                      onChange={e => f.set(e.target.value)}
                      placeholder={f.ph}
                      className="field"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Billing mode ── */}
            <div className="card p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={14} className="text-brand" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Billing mode</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {
                    key: 'monthly',
                    icon: CreditCard,
                    title: 'Month-to-month',
                    sub: 'Standard rates, no commitment. Cancel anytime with 30 days notice.',
                  },
                  {
                    key: 'annual',
                    icon: Calendar,
                    title: 'Annual plan',
                    sub: '12-month commitment. Monthly billing at discounted rate.',
                    badge: `Save ${yearlyDiscount}%`,
                  },
                ].map(opt => {
                  const Icon = opt.icon;
                  const active = billingMode === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setBillingMode(opt.key)}
                      className={`relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                        active ? 'border-brand bg-amber-50/60 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {opt.badge && (
                        <span className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full text-ink" style={{ background: '#EBF123' }}>
                          {opt.badge}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className={active ? 'text-brand' : 'text-gray-400'} />
                        <span className={`text-sm font-semibold ${active ? 'text-brand' : 'text-gray-600'}`}>{opt.title}</span>
                        {active && <CheckCircle size={13} className="text-brand" />}
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed pr-12">{opt.sub}</p>
                    </button>
                  );
                })}
              </div>

              {billingMode === 'annual' && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm" style={{ background: '#fdfde8', borderColor: '#EBF123' }}>
                  <Info size={14} className="text-brand shrink-0" />
                  <span className="text-gray-600 flex-1 text-xs">Annual discount applied to all monthly line items:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1} max={50}
                      value={yearlyDiscount}
                      onChange={e => setYearlyDiscount(Math.min(50, Math.max(1, parseFloat(e.target.value) || 0)))}
                      className="w-14 text-center text-sm font-semibold border-2 border-brand/30 rounded-lg px-2 py-1 bg-white outline-none focus:border-brand"
                    />
                    <span className="text-sm font-semibold text-ink">% off</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Service sections ── */}
            {SECTIONS.map(sec => (
              <Section
                key={sec.id}
                section={sec}
                services={SERVICES[sec.id]}
                selected={selected}
                included={included}
                prices={prices}
                billingMode={billingMode}
                yearlyDiscount={yearlyDiscount}
                onToggle={handleToggle}
                onPriceChange={handlePriceChange}
                onIncludeChange={handleIncludeChange}
              />
            ))}

            {/* ── Notes ── */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-brand" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quote notes & terms</span>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="field resize-y min-h-[80px] text-sm leading-relaxed"
                placeholder="Add payment terms, start date, or any conditions..."
              />
            </div>
          </div>

          {/* RIGHT — sticky summary ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-3">

              {/* Totals card */}
              <div className="card p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={13} />
                    Quote summary
                  </span>
                  {selectedCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-ink" style={{ background: '#EBF123' }}>
                      {selectedCount} service{selectedCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {selectedCount === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-2xl bg-ink flex items-center justify-center mx-auto mb-3">
                      <Zap size={20} className="text-ramp" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No services selected</p>
                    <p className="text-xs text-gray-400 mt-1">Check the services you want to include</p>
                  </div>
                ) : (
                  <>
                    {/* Billing mode badge */}
                    <div className="flex items-center gap-1.5 text-xs font-medium mb-4 px-3 py-1.5 rounded-lg border" style={{
                      background: billingMode === 'annual' ? '#fdfde8' : '#f5f5f5',
                      borderColor: billingMode === 'annual' ? '#EBF123' : '#e5e5e5',
                      color: billingMode === 'annual' ? '#1C1B17' : '#6b6a62',
                    }}>
                      <Calendar size={11} />
                      {billingMode === 'annual' ? `Annual plan · ${yearlyDiscount}% off monthly` : 'Month-to-month'}
                    </div>

                    {/* Setup block */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">One-time setup</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-medium tabular-nums">{fmt(setupSub)}</span>
                        </div>
                        {setupDiscAmt > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Discount</span>
                            <span className="font-medium text-brand tabular-nums">−{fmt(setupDiscAmt)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-1">
                          <span className="text-sm font-semibold text-ink">Total due today</span>
                          <span className="text-lg font-bold text-ink tabular-nums">{fmt(setupFinal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Monthly block */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Monthly recurring</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-medium tabular-nums">{fmt(mthSub)}</span>
                        </div>
                        {mthDiscAmt > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Discount</span>
                            <span className="font-medium text-brand tabular-nums">−{fmt(mthDiscAmt)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-1">
                          <span className="text-sm font-semibold text-ink">Monthly total</span>
                          <span className="text-lg font-bold text-ink tabular-nums">{fmt(mthFinal)}<span className="text-sm font-normal text-gray-400">/mo</span></span>
                        </div>
                        {billingMode === 'annual' && mthFinal > 0 && (
                          <div className="mt-2 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between" style={{ background: '#fdfde8', color: '#1C1B17' }}>
                            <span>Annual commitment</span>
                            <span className="tabular-nums">{fmt(mthFinal * 12)}/yr</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected list */}
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Included services</p>
                      <ul className="space-y-1">
                        {selectedIds.map(id => {
                          const svc = getService(id);
                          return svc ? (
                            <li key={id} className="flex items-start gap-1.5 text-xs text-gray-600">
                              <CheckCircle size={11} className="text-brand shrink-0 mt-0.5" />
                              <span>{svc.name}{included[id] ? <span className="text-green-600 ml-1">(incl.)</span> : ''}</span>
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </div>
                  </>
                )}
              </div>

              {/* Discount card */}
              <div className="card p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Apply discount</p>

                <div className="flex gap-2 mb-3">
                  {[{ k: 'pct', label: '% Percent' }, { k: 'flat', label: '$ Fixed' }].map(t => (
                    <button
                      key={t.k}
                      onClick={() => setDiscType(t.k)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        discType === t.k
                          ? 'text-ink border-ramp'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                      style={discType === t.k ? { background: '#EBF123', borderColor: '#EBF123' } : {}}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    value={discValue}
                    min={0}
                    onChange={e => setDiscValue(e.target.value)}
                    className="field text-right w-24 font-semibold text-base tabular-nums"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-500">{discType === 'pct' ? '% off' : '$ off'}</span>
                </div>

                <div className="flex gap-4">
                  {[
                    { key: 'discSetup', label: 'Apply to setup', val: discSetup, set: setDiscSetup },
                    { key: 'discMonthly', label: 'Apply to monthly', val: discMonthly, set: setDiscMonthly },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={opt.val}
                        onChange={e => opt.set(e.target.checked)}
                        style={{ accentColor: '#C97B2E' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => exportPDF(fullState)}
                  disabled={selectedCount === 0}
                  className="btn-primary w-full"
                >
                  <Download size={15} />
                  Export PDF quote
                </button>
                <button
                  onClick={() => openMailto(fullState)}
                  disabled={selectedCount === 0}
                  className="btn-ghost w-full"
                >
                  <Mail size={15} />
                  Email quote to client
                </button>
                <button onClick={handleClear} className="btn-danger-ghost w-full">
                  <Trash2 size={13} />
                  Clear all selections
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-8 py-5 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <span className="text-xs text-gray-400">{agency.agencyName} · {agency.agencyWebsite} · {agency.agencyPhone}</span>
          <span className="text-xs text-gray-400">Quote Builder v2.0 · Huntsville AL</span>
        </div>
      </footer>
    </div>
  );
}
