import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

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
