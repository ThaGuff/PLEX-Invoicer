import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getService, SECTIONS } from '../data/services';

const XERO_LIGHT = [240, 250, 253];
const XERO_BORD  = [186, 234, 249];
const INK        = [26,  26,  26 ];
const INK_MUTED  = [122, 126, 133];
const WHITE      = [255, 255, 255];
const SURFACE    = [245, 247, 248];
const BORDER     = [229, 232, 235];
const GREEN      = [34,  197, 94 ];
const FOOTER_H   = 32;
const MARGIN     = 32;

function fmt(n) { return '$' + Math.round(n).toLocaleString(); }

function hexToRgb(hex) {
  const c = (hex || '#13B5EA').replace('#', '');
  return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
}

function drawFooter(doc, W, H, agencyName, agencyWebsite, agencyEmail, agencyPhone, pageNum, totalPages) {
  doc.setFillColor(...WHITE);
  doc.rect(0, H - FOOTER_H, W, FOOTER_H, 'F');
  const accent = hexToRgb(doc.__accentHex || '#13B5EA');
  doc.setFillColor(...accent);
  doc.rect(0, H - FOOTER_H, W, 1.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_MUTED);
  doc.text(
    [agencyName, agencyAddress ? agencyAddress + (agencyCityState ? ', ' + agencyCityState : '') : null, agencyPhone, agencyEmail, agencyWebsite].filter(Boolean).join('  ·  '),
    W / 2, H - FOOTER_H + 14, { align: 'center' }
  );
  if (totalPages > 1) {
    doc.text(`Page ${pageNum} of ${totalPages}`, W - MARGIN, H - FOOTER_H + 14, { align: 'right' });
  }
}

function pushRow(rows, item, isIncluded, priceOverride, billingMode, yearlyDiscount, accent) {
  const setupP = isIncluded ? 0 : (priceOverride?.setup ?? item.setup ?? 0);
  const mthRaw = priceOverride?.monthly ?? item.monthly ?? 0;
  const mthP   = isIncluded ? 0 : (billingMode === 'annual' ? mthRaw * (1 - yearlyDiscount / 100) : mthRaw);
  rows.push([
    { content: item.name || '', styles: { fontStyle: 'bold', fontSize: 8.5, textColor: INK } },
    { content: item.desc || item.description || '', styles: { fontSize: 7.5, textColor: INK_MUTED } },
    { content: isIncluded ? 'Included' : setupP === 0 ? '—' : fmt(setupP),
      styles: { halign: 'right', fontSize: 8.5, textColor: isIncluded ? GREEN : INK } },
    { content: isIncluded ? 'Included' : mthRaw === 0 ? '—' : fmt(mthP) + '/mo',
      styles: { halign: 'right', fontSize: 8.5, textColor: isIncluded ? GREEN : INK } },
    { content: billingMode === 'annual' && !isIncluded && mthRaw > 0 ? fmt(mthP * 12) : '—',
      styles: { halign: 'right', fontSize: 8.5, textColor: billingMode === 'annual' ? accent : INK_MUTED } },
  ]);
}

export function exportPDF(state) {
  const {
    clientName = '', clientBiz = '', clientEmail = '', clientPhone = '',
    quoteDate = '', billingMode = 'monthly', yearlyDiscount = 15,
    selected = {}, sectionMap = {}, prices = {}, included = {},
    discType = 'pct', discValue = 0, discSetup = true, discMonthly = true,
    notes = '',
    agencyName       = '',
    agencyEmail      = '',
    agencyPhone      = '',
    agencyWebsite    = '',
    agencyAddress    = '',
    agencyCityState  = '',
    agencyLicense    = '',
    agencyTagline    = '',
    agencyTechnician = '',
    agencyTaxNum     = '',
    primaryColor     = '#13B5EA',
    agencyLogoUrl    = null,
    customSections   = [],
    customItems      = [],
  } = state;

  const accent    = hexToRgb(primaryColor);
  const doc       = new jsPDF({ unit: 'pt', format: 'letter' });
  doc.__accentHex = primaryColor; // stash for footer helper
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const usableBottom = H - FOOTER_H - 20;

  // ── Header ───────────────────────────────────────────────────────
  doc.setFillColor(...WHITE);  doc.rect(0, 0, W, 70, 'F');
  doc.setFillColor(...accent); doc.rect(0, 0, 4, 70, 'F');
  doc.setFillColor(...accent); doc.rect(0, 68, W, 2.5, 'F');

  // Logo: use uploaded image if available, fallback to letter initial
  if (agencyLogoUrl && agencyLogoUrl.startsWith('data:image/')) {
    try {
      const ext = agencyLogoUrl.includes('data:image/png') ? 'PNG'
                : agencyLogoUrl.includes('data:image/jpg') || agencyLogoUrl.includes('data:image/jpeg') ? 'JPEG'
                : 'PNG';
      doc.addImage(agencyLogoUrl, ext, 20, 14, 36, 36);
    } catch {
      // Fallback to letter initial if image fails
      doc.setFillColor(...accent);
      doc.roundedRect(20, 14, 36, 36, 4, 4, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...WHITE);
      doc.text((agencyName || 'P')[0].toUpperCase(), 38, 38, { align: 'center' });
    }
  } else {
    doc.setFillColor(...accent);
    doc.roundedRect(20, 14, 36, 36, 4, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...WHITE);
    doc.text((agencyName || 'P')[0].toUpperCase(), 38, 38, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK);
  doc.text(agencyName, 66, 28);
  if (agencyTagline) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...accent);
    doc.text(agencyTagline, 66, 38);
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...INK_MUTED);
  const contactLine = [agencyPhone, agencyEmail, agencyWebsite].filter(Boolean).join('  ·  ');
  const addrLine = [agencyAddress, agencyCityState].filter(Boolean).join(', ');
  const licLine = agencyLicense ? `Lic# ${agencyLicense}` : '';
  const techLine = agencyTechnician ? `Tech: ${agencyTechnician}` : '';
  if (contactLine) doc.text(contactLine, 66, agencyTagline ? 47 : 40);
  if (addrLine) doc.text([addrLine, licLine].filter(Boolean).join('  ·  '), 66, agencyTagline ? 55 : 48);
  if (techLine) doc.text(techLine, 66, agencyTagline ? 63 : 56);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...accent);
  doc.text('QUOTE', W - MARGIN, 28, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK_MUTED);
  doc.text(quoteDate || new Date().toLocaleDateString(), W - MARGIN, 42, { align: 'right' });

  // ── Client + Billing cards ────────────────────────────────────────
  const halfW = (W - MARGIN * 2 - 12) / 2;
  const cardY = 86, cardH = 80;

  // Client
  doc.setFillColor(...SURFACE); doc.roundedRect(MARGIN, cardY, halfW, cardH, 5, 5, 'F');
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.5); doc.roundedRect(MARGIN, cardY, halfW, cardH, 5, 5, 'S');
  doc.setFillColor(...accent); doc.roundedRect(MARGIN, cardY, halfW, 4, 5, 5, 'F');
  doc.rect(MARGIN, cardY + 2, halfW, 2, 'F');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...accent);
  doc.text('PREPARED FOR', MARGIN + 12, cardY + 18);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK);
  doc.text(clientName || '—', MARGIN + 12, cardY + 34);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK_MUTED);
  [clientBiz, clientEmail, clientPhone].filter(Boolean).forEach((m, i) => {
    doc.text(m, MARGIN + 12, cardY + 48 + i * 11);
  });

  // Billing
  const bx = MARGIN + halfW + 12;
  doc.setFillColor(...XERO_LIGHT); doc.roundedRect(bx, cardY, halfW, cardH, 5, 5, 'F');
  doc.setDrawColor(...XERO_BORD); doc.roundedRect(bx, cardY, halfW, cardH, 5, 5, 'S');
  doc.setFillColor(...accent); doc.roundedRect(bx, cardY, halfW, 4, 5, 5, 'F');
  doc.rect(bx, cardY + 2, halfW, 2, 'F');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...accent);
  doc.text('BILLING MODE', bx + 12, cardY + 18);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK);
  doc.text(billingMode === 'annual' ? 'Annual plan' : 'Month-to-month', bx + 12, cardY + 34);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK_MUTED);
  doc.text(
    billingMode === 'annual'
      ? `${yearlyDiscount}% off monthly · 12-month commitment`
      : 'Standard monthly pricing · Cancel anytime',
    bx + 12, cardY + 48
  );

  // ── Build table rows ──────────────────────────────────────────────
  const selectedIds = Object.keys(selected).filter(id => selected[id]);
  const tableRows = [];

  SECTIONS.forEach(sec => {
    const secIds = selectedIds.filter(id => sectionMap[id] === sec.id);
    if (!secIds.length) return;
    tableRows.push([{ content: sec.label.toUpperCase(), colSpan: 5, styles: {
      fillColor: SURFACE, fontStyle: 'bold', textColor: accent, fontSize: 7.5,
      cellPadding: { top: 6, bottom: 6, left: 10, right: 10 }
    }}]);
    secIds.forEach(id => {
      const svc = getService(id);
      if (svc) pushRow(tableRows, svc, included[id], prices[id], billingMode, yearlyDiscount, accent);
    });
  });

  customSections.forEach(sec => {
    const items = (customItems || []).filter(i => i.sectionId === sec.id && selected[i.id]);
    if (!items.length) return;
    tableRows.push([{ content: (sec.label || sec.name || 'Custom').toUpperCase(), colSpan: 5, styles: {
      fillColor: SURFACE, fontStyle: 'bold', textColor: accent, fontSize: 7.5,
      cellPadding: { top: 6, bottom: 6, left: 10, right: 10 }
    }}]);
    items.forEach(item => pushRow(tableRows, item, included[item.id], prices[item.id], billingMode, yearlyDiscount, accent));
  });

  // ── Render table ──────────────────────────────────────────────────
  autoTable(doc, {
    startY: cardY + cardH + 16,
    head: [[
      { content: 'Service',     styles: { halign: 'left' } },
      { content: 'Description', styles: { halign: 'left' } },
      { content: 'Setup',       styles: { halign: 'right' } },
      { content: billingMode === 'annual' ? 'Disc. monthly' : 'Monthly', styles: { halign: 'right' } },
      { content: billingMode === 'annual' ? 'Annual total'  : '—',       styles: { halign: 'right' } },
    ]],
    body: tableRows,
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_H + 24 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 7, textColor: INK },
    headStyles: { fillColor: accent, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 108 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 70, halign: 'right' },
      3: { cellWidth: 78, halign: 'right' },
      4: { cellWidth: 76, halign: 'right' },
    },
    alternateRowStyles: { fillColor: SURFACE },
    didDrawPage: () => {
      const p = doc.internal.getCurrentPageInfo().pageNumber;
      drawFooter(doc, W, H, agencyName, agencyWebsite, agencyEmail, agencyPhone, p, '?');
    },
  });

  // ── Totals ────────────────────────────────────────────────────────
  let setupSub = 0, mthSub = 0;
  selectedIds.forEach(id => {
    if (included[id]) return;
    const svc = getService(id);
    const cust = (customItems || []).find(i => i.id === id);
    const item = svc || cust;
    if (!item) return;
    setupSub += prices[id]?.setup ?? item.setup ?? 0;
    const mthRaw = prices[id]?.monthly ?? item.monthly ?? 0;
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
  setupDiscAmt = Math.min(setupDiscAmt, setupSub);
  mthDiscAmt   = Math.min(mthDiscAmt, mthSub);
  const setupFinal = Math.max(0, setupSub - setupDiscAmt);
  const mthFinal   = Math.max(0, mthSub   - mthDiscAmt);

  // Dynamic totals card height
  const extraRows = (setupDiscAmt > 0 ? 1 : 0) + (mthDiscAmt > 0 ? 1 : 0)
    + (billingMode === 'annual' && mthFinal > 0 ? 1 : 0);
  const tH = (4 + extraRows) * 15 + 2 * 18 + 44;
  const tW = 224;
  const tx = W - MARGIN - tW;
  const noteLines = notes ? doc.splitTextToSize(notes, W - MARGIN * 2 - 24) : [];
  const noteH = notes ? noteLines.length * 13 + 32 : 0;
  let finalY = doc.lastAutoTable.finalY + 16;

  if (finalY + tH + (noteH ? noteH + 16 : 0) > usableBottom) {
    doc.addPage();
    const p = doc.internal.getCurrentPageInfo().pageNumber;
    drawFooter(doc, W, H, agencyName, agencyWebsite, agencyEmail, agencyPhone, p, '?');
    finalY = MARGIN + 16;
  }

  // Totals card
  doc.setFillColor(...WHITE); doc.roundedRect(tx, finalY, tW, tH, 6, 6, 'F');
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.5); doc.roundedRect(tx, finalY, tW, tH, 6, 6, 'S');
  doc.setFillColor(...accent); doc.roundedRect(tx, finalY, tW, 4, 6, 6, 'F');
  doc.rect(tx, finalY + 2, tW, 2, 'F');

  let ty = finalY + 22;
  const trow = (lbl, val, bold = false, vc = INK) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 8.5);
    doc.setTextColor(...(bold ? INK : INK_MUTED));
    doc.text(lbl, tx + 14, ty);
    doc.setTextColor(...vc);
    doc.text(val, tx + tW - 14, ty, { align: 'right' });
    ty += bold ? 18 : 15;
  };

  trow('One-time setup subtotal', fmt(setupSub));
  if (setupDiscAmt > 0) trow('Setup discount', '−' + fmt(setupDiscAmt), false, accent);
  trow('Monthly subtotal', fmt(mthSub));
  if (mthDiscAmt > 0) trow('Monthly discount', '−' + fmt(mthDiscAmt), false, accent);
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.5);
  doc.line(tx + 14, ty + 2, tx + tW - 14, ty + 2); ty += 12;
  trow('TOTAL DUE TODAY', fmt(setupFinal), true, accent);
  trow('MONTHLY TOTAL', fmt(mthFinal) + '/mo', true, accent);
  if (billingMode === 'annual' && mthFinal > 0) trow('Annual commitment', fmt(mthFinal * 12), false, INK_MUTED);

  // Notes
  if (notes && noteLines.length) {
    const ny = finalY + tH + 16;
    doc.setFillColor(...SURFACE); doc.roundedRect(MARGIN, ny, W - MARGIN * 2, noteH, 5, 5, 'F');
    doc.setDrawColor(...BORDER); doc.roundedRect(MARGIN, ny, W - MARGIN * 2, noteH, 5, 5, 'S');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...accent);
    doc.text('NOTES & TERMS', MARGIN + 12, ny + 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK_MUTED);
    doc.text(noteLines, MARGIN + 12, ny + 30);
  }

  // Fix all footers with correct total page count
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, W, H, agencyName, agencyWebsite, agencyEmail, agencyPhone, p, totalPages);
  }

  doc.save(`Quote_${(agencyName||'PLEX').replace(/\s+/g,'_')}_${(clientName||'Client').replace(/\s+/g,'_')}.pdf`);
}
