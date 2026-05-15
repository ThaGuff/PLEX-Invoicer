import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getService, SECTIONS } from '../data/services';

const BRAND = '#C97B2E';
const BRAND_DARK = '#9a5a1a';
const GRAY = '#6B7280';
const LIGHT = '#F5F0E8';

function fmt(n) {
  return '$' + Math.round(n).toLocaleString();
}

export function exportPDF(state) {
  const {
    clientName, clientBiz, clientEmail, clientPhone,
    quoteDate, billingMode, yearlyDiscount,
    selected, prices, included,
    discType, discValue, discSetup, discMonthly,
    notes,
    agencyName = 'PLEX Automation',
    agencyEmail = 'hello@plexautomation.io',
    agencyPhone = '',
    agencyWebsite = 'plexautomation.io',
  } = state;

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ── Header bar ──────────────────────────────────────────────────
  doc.setFillColor(BRAND);
  doc.rect(0, 0, W, 68, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(agencyName, 40, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 230, 200);
  doc.text([agencyEmail, agencyWebsite, agencyPhone].filter(Boolean).join('  ·  '), 40, 54);

  // Quote label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('QUOTE', W - 40, 38, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(quoteDate || new Date().toLocaleDateString(), W - 40, 54, { align: 'right' });

  // ── Client block ─────────────────────────────────────────────────
  doc.setFillColor(245, 240, 232);
  doc.roundedRect(40, 84, (W - 80) / 2 - 8, 68, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(154, 90, 26);
  doc.text('PREPARED FOR', 52, 100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(17, 17, 17);
  doc.text(clientName || '—', 52, 117);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const clientMeta = [clientBiz, clientEmail, clientPhone].filter(Boolean).join('  ·  ');
  doc.text(clientMeta || '', 52, 131);

  // Billing mode badge
  const bx = W / 2 + 4;
  doc.setFillColor(BRAND);
  doc.roundedRect(bx, 84, (W - 80) / 2 - 8, 68, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 230, 200);
  doc.text('BILLING MODE', bx + 12, 100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(billingMode === 'annual' ? 'Annual (paid monthly)' : 'Month-to-month', bx + 12, 117);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 230, 200);
  if (billingMode === 'annual') {
    doc.text(`${yearlyDiscount}% off monthly rate — 12-month commitment`, bx + 12, 131);
  } else {
    doc.text('No long-term commitment required', bx + 12, 131);
  }

  // ── Service table ────────────────────────────────────────────────
  let y = 172;

  const tableRows = [];
  const selectedIds = Object.keys(selected).filter(id => selected[id]);

  SECTIONS.forEach(sec => {
    const sectionIds = selectedIds.filter(id => {
      const svc = getService(id);
      return svc && Object.keys(state.sectionMap || {}).length === 0
        ? true
        : (state.sectionMap || {})[id] === sec.id;
    });

    // Rebuild from selected using section grouping passed in
    const secIds = selectedIds.filter(id => (state.sectionMap || {})[id] === sec.id);
    if (secIds.length === 0) return;

    tableRows.push([{ content: sec.label, colSpan: 5, styles: { fillColor: [245, 240, 232], fontStyle: 'bold', textColor: [154, 90, 26], fontSize: 8 } }]);

    secIds.forEach(id => {
      const svc = getService(id);
      if (!svc) return;
      const isIncl = included[id];
      const setupPrice = isIncl ? 0 : (prices[id]?.setup ?? svc.setup);
      const mthRaw = prices[id]?.monthly ?? svc.monthly;
      let mthPrice = isIncl ? 0 : mthRaw;
      if (!isIncl && billingMode === 'annual') {
        mthPrice = mthRaw * (1 - yearlyDiscount / 100);
      }

      tableRows.push([
        { content: svc.name, styles: { fontStyle: 'bold', fontSize: 9 } },
        { content: svc.desc, styles: { fontSize: 8, textColor: [107, 114, 128] } },
        { content: isIncl ? 'INCLUDED' : fmt(setupPrice), styles: { halign: 'right', fontSize: 9, textColor: isIncl ? [16, 120, 60] : [17, 17, 17] } },
        { content: isIncl ? 'INCLUDED' : fmt(mthPrice) + '/mo', styles: { halign: 'right', fontSize: 9, textColor: isIncl ? [16, 120, 60] : [17, 17, 17] } },
        { content: billingMode === 'annual' && !isIncl && mthRaw > 0 ? fmt(mthPrice * 12) + '/yr' : '—', styles: { halign: 'right', fontSize: 9, textColor: [154, 90, 26] } },
      ]);
    });
  });

  autoTable(doc, {
    startY: y,
    head: [[
      { content: 'Service', styles: { halign: 'left' } },
      { content: 'Description', styles: { halign: 'left' } },
      { content: 'Setup', styles: { halign: 'right' } },
      { content: 'Monthly', styles: { halign: 'right' } },
      { content: billingMode === 'annual' ? 'Annual total' : '—', styles: { halign: 'right' } },
    ]],
    body: tableRows,
    margin: { left: 40, right: 40 },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [201, 123, 46], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 70, halign: 'right' },
      3: { cellWidth: 70, halign: 'right' },
      4: { cellWidth: 80, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didParseCell(data) {
      if (data.row.raw?.[0]?.colSpan === 5) {
        data.cell.styles.fillColor = [245, 240, 232];
      }
    },
  });

  // ── Totals block ─────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 16;

  // Compute totals
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
    else if (discSetup) setupDiscAmt = dv;
    else if (discMonthly) mthDiscAmt = dv;
  }
  setupDiscAmt = Math.min(setupDiscAmt, setupSub);
  mthDiscAmt = Math.min(mthDiscAmt, mthSub);

  const setupFinal = Math.max(0, setupSub - setupDiscAmt);
  const mthFinal = Math.max(0, mthSub - mthDiscAmt);

  const tW = 220;
  const tx = W - 40 - tW;

  doc.setFillColor(245, 240, 232);
  doc.roundedRect(tx, finalY, tW, setupDiscAmt > 0 || mthDiscAmt > 0 ? 130 : 100, 6, 6, 'F');

  let ty = finalY + 18;

  const row = (label, value, bold = false, color = [17, 17, 17]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(...(bold ? [17, 17, 17] : [107, 114, 128]));
    doc.text(label, tx + 12, ty);
    doc.setTextColor(...color);
    doc.text(value, tx + tW - 12, ty, { align: 'right' });
    ty += bold ? 18 : 15;
  };

  row('One-time setup', fmt(setupSub));
  if (setupDiscAmt > 0) row('Setup discount', '-' + fmt(setupDiscAmt), false, [201, 123, 46]);
  row('Monthly recurring', fmt(mthSub));
  if (mthDiscAmt > 0) row('Monthly discount', '-' + fmt(mthDiscAmt), false, [201, 123, 46]);
  if (billingMode === 'annual') row('Annual commitment', fmt(mthFinal * 12), false, [154, 90, 26]);

  doc.setDrawColor(201, 123, 46, 0.3);
  doc.setLineWidth(0.5);
  doc.line(tx + 12, ty, tx + tW - 12, ty);
  ty += 10;

  row('TOTAL DUE TODAY', fmt(setupFinal), true);
  row('MONTHLY TOTAL', fmt(mthFinal), true);

  // ── Notes ────────────────────────────────────────────────────────
  if (notes) {
    const ny = Math.max(finalY, doc.lastAutoTable.finalY) + 160;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(154, 90, 26);
    doc.text('NOTES & TERMS', 40, ny);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    const lines = doc.splitTextToSize(notes, W - 80);
    doc.text(lines, 40, ny + 14);
  }

  // ── Footer ───────────────────────────────────────────────────────
  doc.setFillColor(17, 17, 17);
  doc.rect(0, H - 32, W, 32, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`${agencyName}  ·  ${agencyWebsite}  ·  ${agencyEmail}`, W / 2, H - 12, { align: 'center' });

  const filename = `PLEX_Quote_${(clientName || 'Client').replace(/\s+/g, '_')}_${(quoteDate || '').replace(/\s+/g, '_') || Date.now()}.pdf`;
  doc.save(filename);
}
