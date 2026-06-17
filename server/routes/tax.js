import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ── GET /api/tax/lookup?zip=35801 — look up tax rate by US zip code ─
router.get('/lookup', async (req, res) => {
  const { zip } = req.query;
  if (!zip || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'Valid 5-digit US zip code required' });
  }

  // US state sales tax rates (2024) — combined average rate
  const STATE_TAX_RATES = {
    AL: 9.24, AK: 1.76, AZ: 8.37, AR: 9.47, CA: 8.82, CO: 7.77, CT: 6.35,
    DE: 0.00, FL: 7.01, GA: 7.40, HI: 4.44, ID: 6.03, IL: 8.85, IN: 7.00,
    IA: 6.94, KS: 8.70, KY: 6.00, LA: 9.55, ME: 5.50, MD: 6.00, MA: 6.25,
    MI: 6.00, MN: 7.49, MS: 7.07, MO: 8.29, MT: 0.00, NE: 6.94, NV: 8.23,
    NH: 0.00, NJ: 6.60, NM: 7.83, NY: 8.52, NC: 6.98, ND: 6.96, OH: 7.24,
    OK: 8.99, OR: 0.00, PA: 6.34, RI: 7.00, SC: 7.43, SD: 6.40, TN: 9.55,
    TX: 8.19, UT: 7.19, VT: 6.24, VA: 5.73, WA: 9.38, WV: 6.59, WI: 5.43,
    WY: 5.44, DC: 6.00,
  };

  // First three digits of a ZIP map to a fixed range of states (USPS-assigned
  // ZIP prefix blocks). Used as a resilient fallback when the external
  // geocoding API is unreachable, so the feature degrades gracefully instead
  // of silently returning whatever rate happened to be set before.
  const ZIP3_STATE_RANGES = [
    [['005','005'],'NY'],[['006','009'],'PR'],[['010','027'],'MA'],[['028','029'],'RI'],
    [['030','038'],'NH'],[['039','049'],'ME'],[['050','059'],'VT'],[['060','069'],'CT'],
    [['070','089'],'NJ'],[['100','149'],'NY'],[['150','196'],'PA'],[['197','199'],'DE'],
    [['200','205'],'DC'],[['206','219'],'MD'],[['220','246'],'VA'],[['247','268'],'WV'],
    [['270','289'],'NC'],[['290','299'],'SC'],[['300','319'],'GA'],[['320','349'],'FL'],
    [['350','369'],'AL'],[['370','385'],'TN'],[['386','397'],'MS'],[['398','399'],'GA'],
    [['400','427'],'KY'],[['430','458'],'OH'],[['460','479'],'IN'],[['480','499'],'MI'],
    [['500','528'],'IA'],[['530','549'],'WI'],[['550','567'],'MN'],[['570','577'],'SD'],
    [['580','588'],'ND'],[['590','599'],'MT'],[['600','629'],'IL'],[['630','658'],'MO'],
    [['660','679'],'KS'],[['680','693'],'NE'],[['700','714'],'LA'],[['716','729'],'AR'],
    [['730','749'],'OK'],[['750','799'],'TX'],[['800','816'],'CO'],[['820','831'],'WY'],
    [['832','838'],'ID'],[['840','847'],'UT'],[['850','865'],'AZ'],[['870','884'],'NM'],
    [['889','898'],'NV'],[['900','966'],'CA'],[['967','968'],'HI'],[['970','979'],'OR'],
    [['980','994'],'WA'],[['995','999'],'AK'],
  ];
  const zip3StateFallback = (z) => {
    const n = parseInt(z.slice(0, 3), 10);
    const hit = ZIP3_STATE_RANGES.find(([[lo, hi]]) => n >= parseInt(lo, 10) && n <= parseInt(hi, 10));
    return hit ? hit[1] : null;
  };

  try {
    let state = null, city = null, stateName = null, source = '';

    // Primary: zippopotam.us (gives exact city + state from the live API)
    try {
      const resp = await fetch(`https://api.zippopotam.us/us/${zip}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (resp.ok) {
        const data = await resp.json();
        const place = data.places?.[0];
        state     = place?.['state abbreviation'] || null;
        city      = place?.['place name'] || null;
        stateName = place?.state || null;
        source    = 'zippopotam.us live lookup';
      } else {
        console.warn(`[Tax Lookup] zippopotam.us returned ${resp.status} for zip ${zip}`);
      }
    } catch (fetchErr) {
      console.warn(`[Tax Lookup] zippopotam.us unreachable for zip ${zip}:`, fetchErr.message);
    }

    // Fallback: USPS ZIP-prefix-to-state table — used whenever the live
    // lookup above failed or returned no usable state, so a single
    // external provider outage never breaks the whole feature.
    if (!state) {
      state = zip3StateFallback(zip);
      source = state ? 'ZIP-prefix fallback table (external lookup unavailable)' : '';
      if (!state) {
        console.error(`[Tax Lookup] No state resolved for zip ${zip} via live API or fallback table`);
        return res.status(404).json({ error: 'Could not determine state for this zip code', zip });
      }
    }

    const rate = STATE_TAX_RATES[state] ?? 0;
    console.log(`[Tax Lookup] zip=${zip} → state=${state} rate=${rate}% (${source})`);

    res.json({
      zip,
      city,
      state,
      state_name: stateName,
      tax_rate: rate,
      source: source + ' — US average combined state + local rate (2024)',
    });
  } catch (e) {
    console.error(`[Tax Lookup] Unexpected error for zip ${zip}:`, e.message);
    res.status(500).json({ error: 'Tax lookup failed: ' + e.message });
  }
});

// ── GET /api/tax/summary — full tax report for an account ─────────
router.get('/summary', async (req, res) => {
  const { account_id, year, quarter } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });

  try {
    // Build date filter
    let dateFilter = '';
    const params = [account_id];

    if (year) {
      dateFilter = `AND TO_CHAR(paid_at::timestamp, 'YYYY') = ?`;
      params.push(year);
      if (quarter) {
        const qMap = { '1':'01,02,03', '2':'04,05,06', '3':'07,08,09', '4':'10,11,12' };
        const months = qMap[quarter]?.split(',') || [];
        if (months.length === 3) {
          dateFilter = `AND TO_CHAR(paid_at::timestamp, 'YYYY') = ?
            AND TO_CHAR(paid_at::timestamp, 'MM') IN ('${months.join("','")}')`;
        }
      }
    }

    // All paid invoices with tax data
    const invoices = await db.execute(`
      SELECT
        i.id, i.number, i.client_name, i.client_biz, i.client_email,
        i.amount_paid, i.tax_rate, i.tax_amount, i.processing_fee,
        i.net_amount, i.payment_method, i.payment_reference,
        i.paid_at, i.sent_at, i.created_at,
        i.setup_total, i.monthly_total,
        i.billing_mode, i.notes,
        q.number AS quote_number
      FROM invoices i
      LEFT JOIN quotes q ON i.quote_id = q.id
      WHERE i.account_id = ? AND i.status = 'paid' AND i.paid_at IS NOT NULL
      ${dateFilter}
      ORDER BY i.paid_at DESC
    `, params);

    // Invoice items for each invoice
    const invIds = invoices.rows.map(i => `'${i.id}'`);
    let items = { rows: [] };
    if (invIds.length > 0) {
      items = await db.execute(`
        SELECT ii.*, ii.invoice_id
        FROM invoice_items ii
        WHERE ii.invoice_id IN (${invIds.join(',')})
        ORDER BY ii.sort_order
      `);
    }

    // Build item map
    const itemMap = {};
    items.rows.forEach(item => {
      if (!itemMap[item.invoice_id]) itemMap[item.invoice_id] = [];
      itemMap[item.invoice_id].push(item);
    });

    // Aggregate totals
    let totalCollected = 0, totalTax = 0, totalFees = 0, totalNet = 0;
    const byPaymentMethod = {};
    const byQuarter = {};

    const enriched = invoices.rows.map(inv => {
      const collected  = parseFloat(inv.amount_paid  || 0);
      const tax        = parseFloat(inv.tax_amount    || 0);
      const fee        = parseFloat(inv.processing_fee || 0);
      const net        = parseFloat(inv.net_amount    || (collected - tax - fee));

      totalCollected += collected;
      totalTax       += tax;
      totalFees      += fee;
      totalNet       += net;

      // Payment method breakdown
      const pm = inv.payment_method || 'stripe';
      if (!byPaymentMethod[pm]) byPaymentMethod[pm] = { count: 0, total: 0, tax: 0 };
      byPaymentMethod[pm].count  += 1;
      byPaymentMethod[pm].total  += collected;
      byPaymentMethod[pm].tax    += tax;

      // Quarterly breakdown
      if (inv.paid_at) {
        const d = new Date(inv.paid_at);
        const yr = d.getFullYear();
        const q  = Math.ceil((d.getMonth() + 1) / 3);
        const key = `${yr} Q${q}`;
        if (!byQuarter[key]) byQuarter[key] = { collected: 0, tax: 0, fees: 0, count: 0 };
        byQuarter[key].collected += collected;
        byQuarter[key].tax       += tax;
        byQuarter[key].fees      += fee;
        byQuarter[key].count     += 1;
      }

      return {
        ...inv,
        amount_paid:     collected,
        tax_amount:      tax,
        processing_fee:  fee,
        net_amount:      net,
        items:           (itemMap[inv.id] || []).map(item => ({
          ...item,
          line_total: parseFloat(item.line_total || item.setup_price || item.monthly_price || 0),
          tax_amount: parseFloat(item.tax_amount || 0),
        })),
      };
    });

    res.json({
      summary: {
        total_collected:     Math.round(totalCollected   * 100) / 100,
        total_tax_collected: Math.round(totalTax         * 100) / 100,
        total_fees:          Math.round(totalFees        * 100) / 100,
        total_net:           Math.round(totalNet         * 100) / 100,
        invoice_count:       enriched.length,
        filter: { account_id, year: year || 'all', quarter: quarter || 'all' },
      },
      by_payment_method: byPaymentMethod,
      by_quarter: Object.entries(byQuarter)
        .sort(([a],[b]) => a.localeCompare(b))
        .map(([period, data]) => ({ period, ...data })),
      invoices: enriched,
    });
  } catch (e) {
    console.error('Tax summary error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/tax/years — available years with data ────────────────
router.get('/years', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const result = await db.execute(`
      SELECT DISTINCT TO_CHAR(paid_at::timestamp, 'YYYY') AS year
      FROM invoices
      WHERE account_id = ? AND status = 'paid' AND paid_at IS NOT NULL
      ORDER BY year DESC
    `, [account_id]);
    res.json({ years: result.rows.map(r => r.year) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
