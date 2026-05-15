import { getService, SECTIONS } from '../data/services';

function fmt(n) {
  return '$' + Math.round(n).toLocaleString();
}

export function buildEmailBody(state) {
  const {
    clientName, clientBiz, clientEmail,
    quoteDate, billingMode, yearlyDiscount,
    selected, prices, included,
    discType, discValue, discSetup, discMonthly,
    notes,
    agencyName = 'PLEX Automation',
    agencyEmail = 'hello@plexautomation.io',
    agencyWebsite = 'plexautomation.io',
    sectionMap = {},
  } = state;

  const selectedIds = Object.keys(selected).filter(id => selected[id]);

  let setupSub = 0, mthSub = 0;
  selectedIds.forEach(id => {
    if (included[id]) return;
    setupSub += prices[id]?.setup ?? (getService(id)?.setup || 0);
    const mthRaw = prices[id]?.monthly ?? (getService(id)?.monthly || 0);
    mthSub += billingMode === 'annual' ? mthRaw * (1 - yearlyDiscount / 100) : mthRaw;
  });

  const dv = parseFloat(discValue) || 0;
  let setupDiscAmt = 0, mthDiscAmt = 0;
  if (discType === 'pct') {
    if (discSetup) setupDiscAmt = setupSub * (dv / 100);
    if (discMonthly) mthDiscAmt = mthSub * (dv / 100);
  } else {
    if (discSetup && discMonthly) { setupDiscAmt = mthDiscAmt = dv / 2; }
    else if (discSetup) setupDiscAmt = dv;
    else if (discMonthly) mthDiscAmt = dv;
  }

  const setupFinal = Math.max(0, setupSub - setupDiscAmt);
  const mthFinal = Math.max(0, mthSub - mthDiscAmt);

  const subject = `Your ${agencyName} Quote — ${quoteDate || new Date().toLocaleDateString()}`;

  let lineItems = '';
  SECTIONS.forEach(sec => {
    const secIds = selectedIds.filter(id => sectionMap[id] === sec.id);
    if (secIds.length === 0) return;
    lineItems += `\n${sec.label.toUpperCase()}\n${'─'.repeat(40)}\n`;
    secIds.forEach(id => {
      const svc = getService(id);
      if (!svc) return;
      const isIncl = included[id];
      const setupP = isIncl ? 'INCLUDED' : fmt(prices[id]?.setup ?? svc.setup);
      const mthRaw = prices[id]?.monthly ?? svc.monthly;
      const mthP = isIncl ? 'INCLUDED' : fmt(billingMode === 'annual' ? mthRaw * (1 - yearlyDiscount / 100) : mthRaw) + '/mo';
      lineItems += `• ${svc.name}\n  Setup: ${setupP}  |  Monthly: ${mthP}\n`;
    });
  });

  const body = `Hi ${clientName || 'there'},

Thank you for your interest in ${agencyName}. Below is a summary of your custom automation quote.

BILLING MODE: ${billingMode === 'annual' ? `Annual (${yearlyDiscount}% off monthly — 12-month commitment)` : 'Month-to-month'}
DATE: ${quoteDate || new Date().toLocaleDateString()}
${clientBiz ? 'BUSINESS: ' + clientBiz : ''}

══════════════════════════════════════════
SELECTED SERVICES
══════════════════════════════════════════
${lineItems}
══════════════════════════════════════════
TOTALS
══════════════════════════════════════════
One-time setup:       ${fmt(setupSub)}${setupDiscAmt > 0 ? '\nSetup discount:       -' + fmt(setupDiscAmt) : ''}
Total due today:      ${fmt(setupFinal)}

Monthly recurring:    ${fmt(mthSub)}${mthDiscAmt > 0 ? '\nMonthly discount:     -' + fmt(mthDiscAmt) : ''}
Monthly total:        ${fmt(mthFinal)}${billingMode === 'annual' ? '\nAnnual commitment:    ' + fmt(mthFinal * 12) : ''}
${notes ? '\n══════════════════════════════════════════\nNOTES & TERMS\n══════════════════════════════════════════\n' + notes : ''}

Ready to move forward? Reply to this email or reach out at ${agencyEmail}.

${agencyName}
${agencyWebsite}`;

  return { subject, body };
}

export function openMailto(state) {
  const { subject, body } = buildEmailBody(state);
  const clientEmail = state.clientEmail || '';
  const mailto = `mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailto, '_blank');
}
