import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getService, SECTIONS } from '../data/services';

// PLEX brand + Ramp yellow
const INK      = [28,  27,  23];
const BRAND    = [201, 123, 46];
const RAMP_Y   = [235, 241, 35];
const CREAM    = [245, 240, 232];
const GRAY     = [107, 114, 128];
const WHITE    = [255, 255, 255];
const LIGHT_BG = [250, 250, 248];

function fmt(n) { return '$' + Math.round(n).toLocaleString(); }

function applyFont(doc, weight='normal', size=9, color=INK) {
  doc.setFont('helvetica', weight);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

export function exportPDF(state) {
  const {
    clientName='', clientBiz='', clientEmail='', clientPhone='',
    quoteDate='', billingMode='monthly', yearlyDiscount=15,
    selected={}, sectionMap={}, prices={}, included={},
    discType='pct', discValue=0, discSetup=true, discMonthly=true,
    notes='',
    agencyName='PLEX Automation',
    agencyEmail='hello@plexautomation.io',
    agencyPhone='256-609-4618',
    agencyWebsite='plexautomation.io',
  } = state;

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ── Header bar (dark ink like Ramp) ─────────────────────────────
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 72, 'F');

  // Yellow accent strip
  doc.setFillColor(...RAMP_Y);
  doc.rect(0, 0, 5, 72, 'F');

  // Logo mark
  doc.setFillColor(...RAMP_Y);
  doc.roundedRect(28, 16, 36, 36, 5, 5, 'F');
  applyFont(doc, 'bold', 18, INK);
  doc.text('P', 46, 40, { align: 'center' });

  // Agency name
  applyFont(doc, 'bold', 18, WHITE);
  doc.text(agencyName, 74, 32);
  applyFont(doc, 'normal', 8.5, [180, 180, 170]);
  doc.text([agencyEmail, agencyWebsite, agencyPhone].filter(Boolean).join('  ·  '), 74, 47);

  // Quote label
  applyFont(doc, 'bold', 9, RAMP_Y);
  doc.text('QUOTE', W - 36, 28, { align: 'right' });
  applyFont(doc, 'normal', 8.5, [180, 180, 170]);
  doc.text(quoteDate || new Date().toLocaleDateString(), W - 36, 42, { align: 'right' });

  // ── Client + billing mode blocks ──────────────────────────────────
  const bw = (W - 80 - 12) / 2;

  // Client block
  doc.setFillColor(...CREAM);
  doc.roundedRect(36, 88, bw, 76, 8, 8, 'F');
  applyFont(doc, 'bold', 7.5, BRAND);
  doc.text('PREPARED FOR', 48, 105);
  applyFont(doc, 'bold', 14, INK);
  doc.text(clientName || '—', 48, 122);
  applyFont(doc, 'normal', 8.5, GRAY);
  const meta = [clientBiz, clientEmail, clientPhone].filter(Boolean);
  meta.forEach((m, i) => doc.text(m, 48, 135 + i * 12));

  // Billing mode block
  const bx = 36 + bw + 12;
  doc.setFillColor(...INK);
  doc.roundedRect(bx, 88, bw, 76, 8, 8, 'F');

  // Yellow accent on billing card
  doc.setFillColor(...RAMP_Y);
  doc.roundedRect(bx, 88, bw, 76, 8, 8, 'F');
  doc.setFillColor(...INK);
  doc.roundedRect(bx + 2, 90, bw - 2, 74, 6, 6, 'F');

  applyFont(doc, 'bold', 7.5, RAMP_Y);
  doc.text('BILLING MODE', bx + 12, 105);
  applyFont(doc, 'bold', 13, WHITE);
  doc.text(billingMode === 'annual' ? 'Annual plan' : 'Month-to-month', bx + 12, 122);
  applyFont(doc, 'normal', 8.5, [170, 170, 160]);
  doc.text(
    billingMode === 'annual'
      ? `${yearlyDiscount}% off monthly · 12-month commitment`
      : 'No long-term commitment required',
    bx + 12, 137
  );

  // ── Service table ─────────────────────────────────────────────────
  const selectedIds = Object.keys(selected).filter(id => selected[id]);
  const tableRows = [];

  SECTIONS.forEach(sec => {
    const secIds = selectedIds.filter(id => sectionMap[id] === sec.id);
    if (secIds.length === 0) return;

    tableRows.push([{
      content: sec.label.toUpperCase(),
      colSpan: 5,
      styles: { fillColor: CREAM, fontStyle: 'bold', textColor: BRAND, fontSize: 7.5, cellPadding: { top: 6, bottom: 6, left: 10, right: 10 } }
    }]);

    secIds.forEach(id => {
      const svc = getService(id);
      if (!svc) return;
      const isIncl = included[id];
      const setupP = isIncl ? 0 : (prices[id]?.setup ?? svc.setup);
      const mthRaw = prices[id]?.monthly ?? svc.monthly;
      const mthP = isIncl ? 0 : (billingMode === 'annual' ? mthRaw * (1 - yearlyDiscount / 100) : mthRaw);

      tableRows.push([
        { content: svc.name, styles: { fontStyle: 'bold', fontSize: 8.5, textColor: INK } },
        { content: svc.desc, styles: { fontSize: 7.5, textColor: GRAY } },
        { content: isIncl ? '—' : fmt(setupP), styles: { halign: 'right', fontSize: 8.5, textColor: isIncl ? [150,200,150] : INK } },
        { content: isIncl ? 'Included' : fmt(mthP) + '/mo', styles: { halign: 'right', fontSize: 8.5, textColor: isIncl ? [100,180,100] : INK } },
        {
          content: billingMode === 'annual' && !isIncl && mthRaw > 0 ? fmt(mthP * 12) : '—',
          styles: { halign: 'right', fontSize: 8.5, textColor: billingMode === 'annual' ? BRAND : GRAY }
        },
      ]);
    });
  });

  autoTable(doc, {
    startY: 180,
    head: [[
      { content: 'Service', styles: { halign: 'left' } },
      { content: 'Description', styles: { halign: 'left' } },
      { content: 'Setup', styles: { halign: 'right' } },
      { content: billingMode === 'annual' ? 'Discounted/mo' : 'Monthly', styles: { halign: 'right' } },
      { content: billingMode === 'annual' ? 'Annual total' : '—', styles: { halign: 'right' } },
    ]],
    body: tableRows,
    margin: { left: 36, right: 36 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 7, textColor: INK },
    headStyles: { fillColor: INK, textColor: RAMP_Y, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 108 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 72, halign: 'right' },
      3: { cellWidth: 80, halign: 'right' },
      4: { cellWidth: 80, halign: 'right' },
    },
    alternateRowStyles: { fillColor: LIGHT_BG },
  });

  // ── Totals block ──────────────────────────────────────────────────
  let setupSub = 0, mthSub = 0;
  selectedIds.forEach(id => {
    if (included[id]) return;
    setupSub += prices[id]?.setup ?? (getService(id)?.setup || 0);
    const mthRaw = prices[id]?.monthly ?? (getService(id)?.monthly || 0);
    mthSub += billingMode === 'annual' ? mthRaw * (1 - yearlyDiscount / 100) : mthRaw;
  });

  let setupDiscAmt = 0, mthDiscAmt = 0;
  const dv = parseFloat(discValue) || 0;
  if (discType === 'pct') {
    if (discSetup) setupDiscAmt = setupSub * (dv / 100);
    if (discMonthly) mthDiscAmt = mthSub * (dv / 100);
  } else {
    if (discSetup && discMonthly) { setupDiscAmt = mthDiscAmt = dv / 2; }
    else if (discSetup) setupDiscAmt = Math.min(dv, setupSub);
    else if (discMonthly) mthDiscAmt = Math.min(dv, mthSub);
  }
  setupDiscAmt = Math.min(setupDiscAmt, setupSub);
  mthDiscAmt = Math.min(mthDiscAmt, mthSub);
  const setupFinal = Math.max(0, setupSub - setupDiscAmt);
  const mthFinal = Math.max(0, mthSub - mthDiscAmt);

  const finalY = doc.lastAutoTable.finalY + 16;
  const tW = 224;
  const tx = W - 36 - tW;

  // Totals card with dark background
  doc.setFillColor(...INK);
  doc.roundedRect(tx, finalY, tW, 160, 8, 8, 'F');
  doc.setFillColor(...RAMP_Y);
  doc.roundedRect(tx, finalY, tW, 4, 2, 2, 'F');

  let ty = finalY + 22;
  const trow = (lbl, val, bold=false, valColor=WHITE) => {
    applyFont(doc, bold ? 'bold' : 'normal', bold ? 10 : 8.5, bold ? WHITE : [150,150,140]);
    doc.text(lbl, tx + 14, ty);
    applyFont(doc, bold ? 'bold' : 'normal', bold ? 10 : 8.5, valColor);
    doc.text(val, tx + tW - 14, ty, { align: 'right' });
    ty += bold ? 18 : 14;
  };

  trow('One-time setup', fmt(setupSub));
  if (setupDiscAmt > 0) trow('Discount applied', '−' + fmt(setupDiscAmt), false, RAMP_Y);
  trow('Monthly recurring', fmt(mthSub));
  if (mthDiscAmt > 0) trow('Discount applied', '−' + fmt(mthDiscAmt), false, RAMP_Y);

  doc.setDrawColor(50, 50, 44);
  doc.setLineWidth(0.5);
  doc.line(tx + 14, ty + 2, tx + tW - 14, ty + 2);
  ty += 12;

  trow('TOTAL DUE TODAY', fmt(setupFinal), true, RAMP_Y);
  trow('MONTHLY TOTAL', fmt(mthFinal) + '/mo', true, RAMP_Y);

  if (billingMode === 'annual' && mthFinal > 0) {
    trow(`Annual commitment (12 mo)`, fmt(mthFinal * 12), false, [180, 180, 170]);
  }

  // ── Notes ─────────────────────────────────────────────────────────
  if (notes) {
    const ny = finalY + 180;
    doc.setFillColor(...CREAM);
    const noteLines = doc.splitTextToSize(notes, W - 80);
    const noteH = noteLines.length * 13 + 28;
    doc.roundedRect(36, ny, W - 72, noteH, 6, 6, 'F');
    applyFont(doc, 'bold', 7.5, BRAND);
    doc.text('NOTES & TERMS', 48, ny + 16);
    applyFont(doc, 'normal', 8.5, GRAY);
    doc.text(noteLines, 48, ny + 30);
  }

  // ── Footer ────────────────────────────────────────────────────────
  doc.setFillColor(...INK);
  doc.rect(0, H - 30, W, 30, 'F');
  doc.setFillColor(...RAMP_Y);
  doc.rect(0, H - 30, 4, 30, 'F');
  applyFont(doc, 'normal', 8, [150, 150, 140]);
  doc.text(
    `${agencyName}  ·  ${agencyWebsite}  ·  ${agencyEmail}  ·  ${agencyPhone}`,
    W / 2, H - 11, { align: 'center' }
  );

  const fn = `PLEX_Quote_${(clientName || 'Client').replace(/\s+/g,'_')}_${(quoteDate||'').replace(/[\s,]+/g,'_') || Date.now()}.pdf`;
  doc.save(fn);
}
