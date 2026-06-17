/**
 * Server-side quote PDF generation — Feature Request 2.
 *
 * Reuses buildQuotePDFDoc() from src/utils/exportPDF.js, the exact same
 * rendering logic the browser "Export PDF" button uses. This is deliberate:
 * earlier in this session, four independent copies of the same setup-price
 * × quantity calculation were found scattered across the codebase, each
 * silently out of sync with the others. Building a second copy of the PDF
 * layout here would risk creating a fifth. Instead, this module is purely
 * an *adapter* — it converts a saved quote's database row + quote_items
 * rows into the same `state` shape the live QuoteBuilder editor produces
 * in memory, then hands that off to the one shared rendering function.
 */
import { buildQuotePDFDoc, defaultQuotePdfFilename } from '../../src/utils/exportPDF.js';

/**
 * Convert a saved quote (DB row) + its quote_items rows + the owning
 * account row into the `state` object buildQuotePDFDoc() expects.
 *
 * Saved quote_items are already concrete, priced, named records — there
 * is no live "catalog" to select from the way the in-browser editor has.
 * So every item is treated as a "custom item" in a single synthetic
 * section per distinct section_label, with `selected[id] = true` for all
 * of them (a saved quote's items are, by definition, the ones that were
 * selected when it was saved).
 */
export function quoteRowToExportState(quote, items, account) {
  const selected   = {};
  const included   = {};
  const prices      = {};
  const quantities  = {};
  const customItems = [];
  const sectionsByLabel = new Map(); // label -> { id, label }

  (items || []).forEach(item => {
    const id = item.id; // qi-<uuid> — guaranteed not to collide with any
                          // built-in catalog slug like 'web' or 'core'
    const label = item.section_label || 'Services';
    if (!sectionsByLabel.has(label)) {
      sectionsByLabel.set(label, { id: `sec-${sectionsByLabel.size}`, label });
    }
    const sec = sectionsByLabel.get(label);

    selected[id]  = true;
    included[id]  = !!item.is_included;
    prices[id]    = { setup: parseFloat(item.setup_price || 0), monthly: parseFloat(item.monthly_price || 0) };
    quantities[id] = Math.max(1, parseFloat(item.quantity) || 1);

    customItems.push({
      id,
      sectionId:   sec.id,
      section_id:  sec.id,
      name:        item.name || '',
      desc:        item.description || '',
      description: item.description || '',
      setup:       parseFloat(item.setup_price   || 0),
      monthly:     parseFloat(item.monthly_price || 0),
    });
  });

  const customSections = Array.from(sectionsByLabel.values());

  return {
    clientName:  quote.client_name  || '',
    clientBiz:   quote.client_biz   || '',
    clientEmail: quote.client_email || '',
    clientPhone: quote.client_phone || '',
    quoteDate:   quote.created_at ? new Date(quote.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '',
    billingMode: quote.billing_mode || 'monthly',
    yearlyDiscount: 15,
    selected, included, prices, quantities,
    discType:    quote.disc_type    || 'pct',
    discValue:   parseFloat(quote.disc_value || 0),
    discSetup:   !!quote.disc_setup,
    discMonthly: !!quote.disc_monthly,
    taxRate:     parseFloat(quote.tax_rate || 0),
    notes:       quote.notes || '',
    agencyName:       account?.name             || 'Invoice King',
    agencyEmail:      account?.email            || '',
    agencyPhone:      account?.phone            || '',
    agencyWebsite:    account?.website          || '',
    agencyAddress:    account?.business_address || '',
    agencyCityState:  account?.city_state_zip   || '',
    agencyLicense:    account?.license_number   || '',
    agencyTagline:    account?.company_tagline  || '',
    agencyTechnician: account?.technician_name  || '',
    agencyTaxNum:     account?.tax_number       || '',
    whiteLabelPlan:   account?.plan === 'agency',
    primaryColor:     account?.primary_color    || '#C6E404',
    agencyLogoUrl:    account?.logo_url || null,
    customSections,
    customItems,
  };
}

/**
 * Generate a quote PDF as a Buffer, ready to attach to an email.
 * Returns { buffer, filename }.
 */
export function generateQuotePdfBuffer(quote, items, account) {
  const state = quoteRowToExportState(quote, items, account);
  const doc = buildQuotePDFDoc(state);
  const buffer = Buffer.from(doc.output('arraybuffer'));
  const filename = defaultQuotePdfFilename(quote.client_name);
  return { buffer, filename };
}
