import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getService, SECTIONS } from '../data/services';

// ── Xero color palette ───────────────────────────────────────────────────────
const XERO_BLUE  = [19,  181, 234];   // #13B5EA — primary
const XERO_DARK  = [13,  143, 192];   // #0d8fc0 — darker blue
const XERO_LIGHT = [240, 250, 253];   // #f0fafd — blue tint bg
const XERO_BORD  = [186, 234, 249];   // #baeaf9 — blue border
const INK        = [26,  26,  26 ];   // #1a1a1a — near-black
const INK_MUTED  = [122, 126, 133];   // #7A7E85 — official Xero grey
const WHITE      = [255, 255, 255];
const SURFACE    = [245, 247, 248];   // #F5F7F8 — page bg
const BORDER     = [229, 232, 235];   // #E5E8EB — card border
const GREEN      = [34,  197, 94 ];   // success

function fmt(n) { return '$' + Math.round(n).toLocaleString(); }

function rgb(arr) { return `rgb(${arr.join(',')})` }

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

  // ── Header — white with Xero blue bottom border ──────────────────
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, W, 70, 'F');

  // Xero blue left accent bar
  doc.setFillColor(...XERO_BLUE);
  doc.rect(0, 0, 4, 70, 'F');

  // Xero blue bottom line on header
  doc.setFillColor(...XERO_BLUE);
  doc.rect(0, 68, W, 2.5, 'F');

  // Logo mark — blue square
  doc.setFillColor(...XERO_BLUE);
  doc.roundedRect(20, 14, 36, 36, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.text('P', 38, 38, { align: 'center' });

  // Agency name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(agencyName, 66, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_MUTED);
  doc.text([agencyWebsite, agencyEmail, agencyPhone].filter(Boolean).join('  ·  '), 66, 45);

  // Quote label right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...XERO_BLUE);
  doc.text('QUOTE', W - 32, 28, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_MUTED);
  doc.text(quoteDate || new Date().toLocaleDateString(), W - 32, 42, { align: 'right' });

  // ── Client + billing cards ────────────────────────────────────────
  const halfW = (W - 72 - 12) / 2;
  const cardY = 86;

  // Client card
  doc.setFillColor(...SURFACE);
  doc.roundedRect(32, cardY, halfW, 80, 5, 5, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.roundedRect(32, cardY, halfW, 80, 5, 5, 'S');

  // Blue top stripe on client card
  doc.setFillColor(...XERO_BLUE);
  doc.roundedRect(32, cardY, halfW, 4, 5, 5, 'F');
  doc.rect(32, cardY + 2, halfW, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...XERO_BLUE);
  doc.text('PREPARED FOR', 44, cardY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(clientName || '—', 44, cardY + 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_MUTED);
  [clientBiz, clientEmail, clientPhone].filter(Boolean).forEach((m, i) => {
    doc.text(m, 44, cardY + 48 + (i * 11));
  });

  // Billing card
  const bx = 32 + halfW + 12;
  doc.setFillColor(...XERO_LIGHT);
  doc.roundedRect(bx, cardY, halfW, 80, 5, 5, 'F');
  doc.setDrawColor(...XERO_BORD);
  doc.roundedRect(bx, cardY, halfW, 80, 5, 5, 'S');

  doc.setFillColor(...XERO_BLUE);
  doc.roundedRect(bx, cardY, halfW, 4, 5, 5, 'F');
  doc.rect(bx, cardY + 2, halfW, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...XERO_BLUE);
  doc.text('BILLING MODE', bx + 12, cardY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(billingMode === 'annual' ? 'Annual plan' : 'Month-to-month', bx + 12, cardY + 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_MUTED);
  doc.text(
    billingMode === 'annual'
      ? `${yearlyDiscount}% off monthly rate · 12-month commitment`
      : 'Standard monthly pricing · Cancel anytime',
    bx + 12, cardY + 48
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
      styles: {
        fillColor: SURFACE,
        fontStyle: 'bold',
        textColor: XERO_BLUE,
        fontSize: 7.5,
        cellPadding: { top: 6, bottom: 6, left: 10, right: 10 }
      }
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
        { content: svc.desc, styles: { fontSize: 7.5, textColor: INK_MUTED } },
        {
          content: isIncl ? 'Included' : fmt(setupP),
          styles: { halign: 'right', fontSize: 8.5, textColor: isIncl ? GREEN : INK }
        },
        {
          content: isIncl ? 'Included' : fmt(mthP) + '/mo',
          styles: { halign: 'right', fontSize: 8.5, textColor: isIncl ? GREEN : INK }
        },
        {
          content: billingMode === 'annual' && !isIncl && mthRaw > 0 ? fmt(mthP * 12) : '—',
          styles: { halign: 'right', fontSize: 8.5, textColor: billingMode === 'annual' ? XERO_BLUE : INK_MUTED }
        },
      ]);
    });
  });

  autoTable(doc, {
    startY: cardY + 96,
    head: [[
      { content: 'Service',     styles: { halign: 'left' } },
      { content: 'Description', styles: { halign: 'left' } },
      { content: 'Setup',       styles: { halign: 'right' } },
      { content: billingMode === 'annual' ? 'Disc. monthly' : 'Monthly', styles: { halign: 'right' } },
      { content: billingMode === 'annual' ? 'Annual total' : '—',       styles: { halign: 'right' } },
    ]],
    body: tableRows,
    margin: { left: 32, right: 32 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 7, textColor: INK },
    headStyles: { fillColor: XERO_BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 72, halign: 'right' },
      3: { cellWidth: 80, halign: 'right' },
      4: { cellWidth: 78, halign: 'right' },
    },
    alternateRowStyles: { fillColor: SURFACE },
  });

  // ── Totals block ──────────────────────────────────────────────────
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
    if (discSetup && discMonthly) { setupDiscAmt = dv / 2; mthDiscAmt = dv / 2; }
    else if (discSetup) setupDiscAmt = Math.min(dv, setupSub);
    else if (discMonthly) mthDiscAmt = Math.min(dv, mthSub);
  }
  setupDiscAmt = Math.min(setupDiscAmt, setupSub);
  mthDiscAmt = Math.min(mthDiscAmt, mthSub);
  const setupFinal = Math.max(0, setupSub - setupDiscAmt);
  const mthFinal   = Math.max(0, mthSub - mthDiscAmt);

  const finalY = doc.lastAutoTable.finalY + 16;
  const tW = 220;
  const tx = W - 32 - tW;

  // Totals card — white with blue top stripe
  doc.setFillColor(...WHITE);
  doc.roundedRect(tx, finalY, tW, 148, 6, 6, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.roundedRect(tx, finalY, tW, 148, 6, 6, 'S');
  doc.setFillColor(...XERO_BLUE);
  doc.roundedRect(tx, finalY, tW, 4, 6, 6, 'F');
  doc.rect(tx, finalY + 2, tW, 2, 'F');

  let ty = finalY + 22;
  const trow = (lbl, val, bold = false, valCol = INK) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 8.5);
    doc.setTextColor(...(bold ? INK : INK_MUTED));
    doc.text(lbl, tx + 14, ty);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 8.5);
    doc.setTextColor(...valCol);
    doc.text(val, tx + tW - 14, ty, { align: 'right' });
    ty += bold ? 18 : 14;
  };

  trow('One-time setup subtotal', fmt(setupSub));
  if (setupDiscAmt > 0) trow('Setup discount', '−' + fmt(setupDiscAmt), false, XERO_BLUE);
  trow('Monthly subtotal', fmt(mthSub));
  if (mthDiscAmt > 0) trow('Monthly discount', '−' + fmt(mthDiscAmt), false, XERO_BLUE);

  // divider
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(tx + 14, ty + 2, tx + tW - 14, ty + 2);
  ty += 12;

  trow('TOTAL DUE TODAY', fmt(setupFinal), true, XERO_BLUE);
  trow('MONTHLY TOTAL', fmt(mthFinal) + '/mo', true, XERO_BLUE);

  if (billingMode === 'annual' && mthFinal > 0) {
    trow('Annual commitment', fmt(mthFinal * 12), false, INK_MUTED);
  }

  // ── Notes ─────────────────────────────────────────────────────────
  if (notes) {
    const ny = finalY + 160;
    const noteLines = doc.splitTextToSize(notes, W - 68);
    const noteH = noteLines.length * 13 + 28;
    doc.setFillColor(...SURFACE);
    doc.roundedRect(32, ny, W - 64, noteH, 5, 5, 'F');
    doc.setDrawColor(...BORDER);
    doc.roundedRect(32, ny, W - 64, noteH, 5, 5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...XERO_BLUE);
    doc.text('NOTES & TERMS', 44, ny + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK_MUTED);
    doc.text(noteLines, 44, ny + 30);
  }

  // ── Footer ────────────────────────────────────────────────────────
  doc.setFillColor(...WHITE);
  doc.rect(0, H - 28, W, 28, 'F');
  doc.setFillColor(...XERO_BLUE);
  doc.rect(0, H - 28, W, 1.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK_MUTED);
  doc.text(
    `${agencyName}  ·  ${agencyWebsite}  ·  ${agencyEmail}  ·  ${agencyPhone}`,
    W / 2, H - 10, { align: 'center' }
  );

  const fn = `PLEX_Quote_${(clientName || 'Client').replace(/\s+/g,'_')}.pdf`;
  doc.save(fn);
}
