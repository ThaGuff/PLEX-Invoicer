import React, { useState, useCallback, useMemo } from 'react';
import {
  Zap, Bot, Megaphone, LayoutDashboard, PlusCircle,
  ChevronDown, ChevronUp, Download, Mail, Trash2,
  Settings, Calendar, CreditCard, CheckCircle, Info,
} from 'lucide-react';
import { SERVICES, SECTIONS, YEARLY_DISCOUNT_DEFAULT, getService } from '../data/services';
import { exportPDF } from '../utils/exportPDF';
import { openMailto } from '../utils/exportEmail';

const SECTION_ICONS = { core: Zap, ai: Bot, mkt: Megaphone, crm: LayoutDashboard, addon: PlusCircle };

function fmt(n) {
  const v = Math.round(n);
  return '$' + v.toLocaleString();
}

function Badge({ type }) {
  if (!type) return null;
  const map = {
    popular: 'bg-amber-100 text-amber-800',
    new: 'bg-blue-100 text-blue-800',
    addon: 'bg-gray-100 text-gray-600',
  };
  return <span className={`badge ${map[type] || ''}`}>{type}</span>;
}

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

function PriceInput({ value, onChange, disabled, prefix = '$' }) {
  return (
    <div className="flex items-center">
      <span className="text-gray-400 text-xs mr-1">{prefix}</span>
      <input
        type="number"
        value={value}
        min={0}
        step={1}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 text-right text-sm border border-gray-200 rounded-md px-2 py-1 bg-white disabled:bg-gray-50 disabled:text-gray-300 outline-none focus:border-brand"
        style={{ fontFamily: 'Sora, sans-serif' }}
      />
    </div>
  );
}

function ServiceRow({ svc, sectionId, isSelected, isIncluded, setupPrice, monthlyPrice, billingMode, yearlyDiscount, onToggle, onPriceChange, onIncludeChange }) {
  const annualMonthly = billingMode === 'annual' ? monthlyPrice * (1 - yearlyDiscount / 100) : monthlyPrice;
  const savingsPerMonth = billingMode === 'annual' ? monthlyPrice * (yearlyDiscount / 100) : 0;

  return (
    <div className={`service-row ${isSelected ? 'selected' : ''} px-4 py-3`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => onToggle(svc.id, sectionId, e.target.checked)}
            className="w-4 h-4 cursor-pointer rounded"
            style={{ accentColor: '#C97B2E' }}
          />
        </div>

        {/* Name + desc */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1">
            <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{svc.name}</span>
            <Badge type={svc.badge} />
          </div>
          <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{svc.desc}</div>
          {isSelected && billingMode === 'annual' && monthlyPrice > 0 && !isIncluded && (
            <div className="text-xs text-brand mt-1 font-medium">
              You save {fmt(savingsPerMonth)}/mo ({yearlyDiscount}%) — {fmt(savingsPerMonth * 12)}/year
            </div>
          )}
        </div>

        {/* Prices — only show when selected */}
        {isSelected && (
          <div className="flex items-center gap-4 shrink-0">
            {/* Include toggle */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">Incl.</span>
              <Toggle checked={isIncluded} onChange={v => onIncludeChange(svc.id, v)} />
            </div>

            {/* Setup */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">Setup</span>
              {isIncluded ? (
                <span className="text-xs text-green-600 font-medium px-2">Included</span>
              ) : (
                <PriceInput value={setupPrice} onChange={v => onPriceChange(svc.id, 'setup', v)} />
              )}
            </div>

            {/* Monthly */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">Monthly</span>
              {isIncluded ? (
                <span className="text-xs text-green-600 font-medium px-2">Included</span>
              ) : (
                <div className="flex flex-col items-end gap-0.5">
                  <PriceInput value={monthlyPrice} onChange={v => onPriceChange(svc.id, 'monthly', v)} />
                  {billingMode === 'annual' && monthlyPrice > 0 && (
                    <span className="text-xs text-brand">{fmt(annualMonthly)}/mo billed</span>
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
  const [open, setOpen] = useState(true);
  const Icon = SECTION_ICONS[section.id] || Zap;
  const count = services.filter(s => selected[s.id]).length;

  return (
    <div className="plex-card overflow-hidden mb-4">
      <button
        className="section-header w-full text-left"
        onClick={() => setOpen(o => !o)}
      >
        <Icon size={16} className="text-brand shrink-0" />
        <span className="text-sm font-medium text-gray-800 flex-1">{section.label}</span>
        {count > 0 && (
          <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full">{count} selected</span>
        )}
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div>
          {/* Column headers */}
          <div className="hidden md:grid px-4 py-1.5 bg-white border-b border-gray-100" style={{ gridTemplateColumns: '28px 1fr auto' }}>
            <span />
            <span className="text-xs text-gray-400 uppercase tracking-wider">Service</span>
            <span className="text-xs text-gray-400 uppercase tracking-wider text-right pr-1">Pricing</span>
          </div>
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

function TotalsPanel({ state }) {
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
    if (discSetup && discMonthly) { setupDiscAmt = mthDiscAmt = dv / 2; }
    else if (discSetup) setupDiscAmt = Math.min(dv, setupSub);
    else if (discMonthly) mthDiscAmt = Math.min(dv, mthSub);
  }

  const setupFinal = Math.max(0, setupSub - setupDiscAmt);
  const mthFinal = Math.max(0, mthSub - mthDiscAmt);

  return { setupSub, mthSub, setupDiscAmt, mthDiscAmt, setupFinal, mthFinal };
}

export default function QuoteBuilder() {
  // ── Agency settings (editable) ──────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [agencySettings, setAgencySettings] = useState({
    agencyName: 'PLEX Automation',
    agencyEmail: 'hello@plexautomation.io',
    agencyPhone: '',
    agencyWebsite: 'plexautomation.io',
  });

  // ── Client info ─────────────────────────────────────────────────
  const [clientName, setClientName] = useState('');
  const [clientBiz, setClientBiz] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

  // ── Billing mode ─────────────────────────────────────────────────
  const [billingMode, setBillingMode] = useState('monthly'); // 'monthly' | 'annual'
  const [yearlyDiscount, setYearlyDiscount] = useState(YEARLY_DISCOUNT_DEFAULT);

  // ── Services state ───────────────────────────────────────────────
  const [selected, setSelected] = useState({});   // { [id]: bool }
  const [sectionMap, setSectionMap] = useState({}); // { [id]: sectionId }
  const [included, setIncluded] = useState({});    // { [id]: bool }
  const [prices, setPrices] = useState({});         // { [id]: { setup, monthly } }

  // ── Discount ─────────────────────────────────────────────────────
  const [discType, setDiscType] = useState('pct');
  const [discValue, setDiscValue] = useState(0);
  const [discSetup, setDiscSetup] = useState(true);
  const [discMonthly, setDiscMonthly] = useState(true);

  // ── Notes ────────────────────────────────────────────────────────
  const [notes, setNotes] = useState('Pricing valid for 30 days. Monthly billing via GHL invoicing. Setup begins within 48 hours of signed agreement and initial deposit.');

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
    setSelected({});
    setSectionMap({});
    setIncluded({});
    setPrices({});
    setDiscValue(0);
  };

  const fullState = {
    ...agencySettings,
    clientName, clientBiz, clientEmail, clientPhone,
    quoteDate, billingMode, yearlyDiscount,
    selected, sectionMap, included, prices,
    discType, discValue, discSetup, discMonthly,
    notes,
  };

  const { setupSub, mthSub, setupDiscAmt, mthDiscAmt, setupFinal, mthFinal } = TotalsPanel({ state: fullState });
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top nav ── */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">{agencySettings.agencyName}</span>
            <span className="text-gray-300 text-sm mx-1">·</span>
            <span className="text-gray-500 text-sm">Quote Builder</span>
          </div>
          <button
            onClick={() => setShowSettings(s => !s)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Settings size={13} />
            Agency settings
          </button>
        </div>
      </header>

      {/* ── Agency Settings Panel ── */}
      {showSettings && (
        <div className="bg-neutral-cream border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={14} className="text-brand" />
              <span className="text-sm font-medium text-gray-800">Agency settings</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'agencyName', label: 'Agency name', placeholder: 'PLEX Automation' },
                { key: 'agencyEmail', label: 'Email', placeholder: 'hello@plex.io' },
                { key: 'agencyPhone', label: 'Phone', placeholder: '(555) 000-0000' },
                { key: 'agencyWebsite', label: 'Website', placeholder: 'plexautomation.io' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={agencySettings[f.key]}
                    placeholder={f.placeholder}
                    onChange={e => setAgencySettings(a => ({ ...a, [f.key]: e.target.value }))}
                    className="plex-input text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN — services ── */}
          <div className="lg:col-span-2">

            {/* Page title */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Build a quote</h1>
              <p className="text-sm text-gray-400 mt-1">Select services, adjust pricing, choose billing mode — then export or email the quote.</p>
            </div>

            {/* Client info */}
            <div className="plex-card p-4 mb-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Client info</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Client name</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. McLain Team SIP" className="plex-input" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Business type</label>
                  <input value={clientBiz} onChange={e => setClientBiz(e.target.value)} placeholder="e.g. Insurance Agency" className="plex-input" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Email</label>
                  <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" className="plex-input" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Phone</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(555) 000-0000" className="plex-input" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Quote date</label>
                  <input value={quoteDate} onChange={e => setQuoteDate(e.target.value)} placeholder="May 2026" className="plex-input" />
                </div>
              </div>
            </div>

            {/* Billing mode toggle */}
            <div className="plex-card p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} />
                  Billing mode
                </h2>
              </div>

              {/* Mode selector */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setBillingMode('monthly')}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-colors text-left ${billingMode === 'monthly' ? 'border-brand bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard size={14} className={billingMode === 'monthly' ? 'text-brand' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${billingMode === 'monthly' ? 'text-brand' : 'text-gray-600'}`}>Month-to-month</span>
                    {billingMode === 'monthly' && <CheckCircle size={13} className="text-brand ml-auto" />}
                  </div>
                  <span className="text-xs text-gray-400">No long-term commitment required. Billed monthly at standard rate.</span>
                </button>

                <button
                  onClick={() => setBillingMode('annual')}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-colors text-left relative overflow-hidden ${billingMode === 'annual' ? 'border-brand bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={14} className={billingMode === 'annual' ? 'text-brand' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${billingMode === 'annual' ? 'text-brand' : 'text-gray-600'}`}>Annual plan</span>
                    {billingMode === 'annual' && <CheckCircle size={13} className="text-brand ml-auto" />}
                  </div>
                  <span className="text-xs text-gray-400">12-month commitment. Pay monthly at a discounted rate and save each year.</span>
                  <span className="absolute top-2 right-2 bg-brand text-white text-xs px-2 py-0.5 rounded-full font-medium">Save {yearlyDiscount}%</span>
                </button>
              </div>

              {/* Annual discount control */}
              {billingMode === 'annual' && (
                <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-100 flex items-center gap-4">
                  <Info size={14} className="text-brand shrink-0" />
                  <span className="text-xs text-gray-600 flex-1">Annual discount applied to all monthly line items:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={yearlyDiscount}
                      onChange={e => setYearlyDiscount(Math.min(50, Math.max(1, parseFloat(e.target.value) || 0)))}
                      className="w-16 text-center text-sm border border-amber-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-brand"
                    />
                    <span className="text-sm text-gray-600 font-medium">% off</span>
                  </div>
                </div>
              )}
            </div>

            {/* Service sections */}
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

            {/* Notes */}
            <div className="plex-card p-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Quote notes & terms</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="plex-input resize-y min-h-[80px] text-sm"
                placeholder="Add any notes, payment terms, or conditions..."
              />
            </div>

          </div>

          {/* ── RIGHT COLUMN — summary & actions ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">

              {/* Totals card */}
              <div className="plex-card p-5 mb-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Quote summary</h2>

                {selectedCount === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-full bg-neutral-cream flex items-center justify-center mx-auto mb-2">
                      <Zap size={18} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400">Select services to build your quote</p>
                  </div>
                ) : (
                  <>
                    {/* Billing badge */}
                    <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 mb-4 font-medium ${billingMode === 'annual' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                      <Calendar size={11} />
                      {billingMode === 'annual' ? `Annual plan · ${yearlyDiscount}% off monthly` : 'Month-to-month'}
                    </div>

                    {/* Setup totals */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">One-time setup</div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Subtotal</span>
                        <span>{fmt(setupSub)}</span>
                      </div>
                      {setupDiscAmt > 0 && (
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">Discount</span>
                          <span className="text-brand font-medium">-{fmt(setupDiscAmt)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-semibold mt-2">
                        <span>Total due today</span>
                        <span>{fmt(setupFinal)}</span>
                      </div>
                    </div>

                    {/* Monthly totals */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Monthly recurring</div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Subtotal</span>
                        <span>{fmt(mthSub)}</span>
                      </div>
                      {mthDiscAmt > 0 && (
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">Discount</span>
                          <span className="text-brand font-medium">-{fmt(mthDiscAmt)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-semibold mt-2">
                        <span>Monthly total</span>
                        <span>{fmt(mthFinal)}</span>
                      </div>
                      {billingMode === 'annual' && mthFinal > 0 && (
                        <div className="mt-2 text-xs text-brand font-medium bg-amber-50 rounded-lg px-3 py-2">
                          Annual commitment: {fmt(mthFinal * 12)}/year
                        </div>
                      )}
                    </div>

                    {/* Selected services list */}
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Selected ({selectedCount})</div>
                    <ul className="space-y-1 mb-4">
                      {Object.keys(selected).filter(id => selected[id]).map(id => {
                        const svc = getService(id);
                        return svc ? (
                          <li key={id} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <CheckCircle size={11} className="text-brand shrink-0" />
                            {svc.name}
                            {included[id] && <span className="text-green-600 text-xs">(incl.)</span>}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </>
                )}
              </div>

              {/* Discount card */}
              <div className="plex-card p-5 mb-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Discount</h2>

                <div className="flex gap-2 mb-3">
                  {['pct', 'flat'].map(t => (
                    <button
                      key={t}
                      onClick={() => setDiscType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${discType === t ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {t === 'pct' ? '% Percent' : '$ Fixed amount'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    value={discValue}
                    min={0}
                    onChange={e => setDiscValue(e.target.value)}
                    className="plex-input text-sm w-24 text-right"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-500">{discType === 'pct' ? '% off' : '$ off'}</span>
                </div>

                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={discSetup} onChange={e => setDiscSetup(e.target.checked)} style={{ accentColor: '#C97B2E' }} />
                    Apply to setup
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={discMonthly} onChange={e => setDiscMonthly(e.target.checked)} style={{ accentColor: '#C97B2E' }} />
                    Apply to monthly
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => exportPDF(fullState)}
                  disabled={selectedCount === 0}
                  className="w-full plex-btn-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={15} />
                  Export PDF quote
                </button>
                <button
                  onClick={() => openMailto(fullState)}
                  disabled={selectedCount === 0}
                  className="w-full plex-btn-secondary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Mail size={15} />
                  Email quote
                </button>
                <button
                  onClick={handleClear}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-700 py-2 transition-colors"
                >
                  <Trash2 size={14} />
                  Clear all
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <span className="text-xs text-gray-400">{agencySettings.agencyName} · {agencySettings.agencyWebsite}</span>
          <span className="text-xs text-gray-400">Quote Builder v1.0</span>
        </div>
      </footer>
    </div>
  );
}
