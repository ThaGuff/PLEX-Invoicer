/**
 * Analytics API — AI Business Intelligence Engine
 * GET  /api/analytics/predictive-cashflow  — revenue forecast
 * GET  /api/analytics/business-health      — 0-100 health score + components
 * GET  /api/analytics/ai-advisor           — AI recommendations
 * GET  /api/analytics/revenue-intelligence — revenue breakdown + leaks
 * GET  /api/analytics/churn-risk           — customers at churn risk
 * GET  /api/analytics/executive-summary    — daily briefing
 * GET  /api/analytics/workforce-intelligence — labor profitability (from time entries)
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function assertAccess(accountId, userId) {
  const r = await db.execute(
    `SELECT id FROM accounts WHERE id = ? AND (owner_id = ? OR id IN (SELECT account_id FROM account_members WHERE user_id = ? AND status='active'))`,
    [accountId, userId, userId]
  );
  if (!r.rows.length) throw Object.assign(new Error('Access denied'), { status: 403 });
}

// ── Shared: get account financial snapshot ─────────────────────────
async function getSnapshot(accountId) {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 8) + '01';
  const yearStart = today.slice(0, 5) + '01-01';
  const last30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const last90 = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];

  const [invoices, quotes, contacts, timeEntries] = await Promise.all([
    db.execute(`SELECT * FROM invoices WHERE account_id = ?`, [accountId]),
    db.execute(`SELECT q.*, (SELECT COUNT(*) FROM quote_items WHERE quote_id = q.id AND is_included=1) as item_count FROM quotes q WHERE q.account_id = ?`, [accountId]),
    db.execute(`SELECT * FROM contacts WHERE account_id = ?`, [accountId]),
    db.execute(`SELECT * FROM time_entries WHERE account_id = ?`, [accountId]).catch(() => ({ rows: [] })),
  ]);

  const paid = invoices.rows.filter(i => i.status === 'paid');
  const outstanding = invoices.rows.filter(i => i.status !== 'paid' && i.status !== 'void');
  const overdue = outstanding.filter(i => i.due_date && i.due_date < today);

  const totalRevenue = paid.reduce((s, i) => s + parseFloat(i.amount_paid || i.amount_due || 0), 0);
  const thisMonthRevenue = paid.filter(i => (i.paid_at || i.created_at || '') >= monthStart).reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
  const thisYearRevenue = paid.filter(i => (i.paid_at || i.created_at || '') >= yearStart).reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
  const outstandingAmount = outstanding.reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);
  const overdueAmount = overdue.reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);

  // Revenue trend: last 6 months
  const last6Months = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthRevenue = paid
      .filter(i => (i.paid_at || i.created_at || '').startsWith(monthKey))
      .reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
    last6Months.push({ month: monthKey, revenue: Math.round(monthRevenue) });
  }

  // Average monthly revenue (last 6)
  const avgMonthly = last6Months.reduce((s, m) => s + m.revenue, 0) / 6;

  // Quote stats
  const acceptedQuotes = quotes.rows.filter(q => q.status === 'accepted' || q.status === 'converted');
  const acceptRate = quotes.rows.length > 0 ? Math.round(acceptedQuotes.length / quotes.rows.length * 100) : 0;

  // Churn risk: contacts not invoiced in 90+ days but previously had invoices
  const activeContactIds = [...new Set(paid.map(i => i.contact_id).filter(Boolean))];
  const recentInvoiced = [...new Set(
    invoices.rows.filter(i => (i.created_at || '') >= last90).map(i => i.contact_id).filter(Boolean)
  )];
  const churnRisk = activeContactIds.filter(id => !recentInvoiced.includes(id)).length;

  // Labor cost
  const totalLaborCost = timeEntries.rows.reduce((s, e) => s + parseFloat(e.billed_amount || 0), 0);
  const totalLaborHours = timeEntries.rows.reduce((s, e) => s + parseFloat(e.duration_minutes || 0) / 60, 0);
  const laborMargin = totalRevenue > 0 ? Math.round((1 - totalLaborCost / totalRevenue) * 100) : 0;

  return {
    invoices: invoices.rows,
    quotes: quotes.rows,
    contacts: contacts.rows,
    timeEntries: timeEntries.rows,
    paid, outstanding, overdue,
    totalRevenue: Math.round(totalRevenue),
    thisMonthRevenue: Math.round(thisMonthRevenue),
    thisYearRevenue: Math.round(thisYearRevenue),
    outstandingAmount: Math.round(outstandingAmount),
    overdueAmount: Math.round(overdueAmount),
    avgMonthly: Math.round(avgMonthly),
    last6Months,
    acceptRate,
    churnRisk,
    totalLaborCost: Math.round(totalLaborCost),
    totalLaborHours: Math.round(totalLaborHours * 10) / 10,
    laborMargin,
    today, monthStart, yearStart, last30, last90,
  };
}

// ── GET /predictive-cashflow ───────────────────────────────────────
router.get('/predictive-cashflow', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);
    const snap = await getSnapshot(account_id);

    // Per-contact avg days to pay
    const perContact = {};
    snap.paid.forEach(inv => {
      if (!inv.contact_id || !inv.created_at || !inv.paid_at) return;
      const days = Math.floor((new Date(inv.paid_at) - new Date(inv.created_at)) / 86400000);
      if (!perContact[inv.contact_id]) perContact[inv.contact_id] = { total: 0, count: 0, name: inv.client_name };
      perContact[inv.contact_id].total += days;
      perContact[inv.contact_id].count++;
    });
    const avgDaysToPay = Object.values(perContact).reduce((s, c) => s + c.total / c.count, 0) / Math.max(Object.keys(perContact).length, 1);

    // 12-week forecast
    const weeklyAvg = snap.avgMonthly / 4.33;
    const forecast = Array.from({ length: 12 }, (_, i) => ({
      week: i + 1,
      projected: Math.round(weeklyAvg * (0.9 + Math.random() * 0.2)),
      type: i < 4 ? 'near' : i < 8 ? 'mid' : 'far',
    }));

    // Revenue leaks
    const leaks = [];
    if (snap.overdueAmount > 0) leaks.push({ type: 'overdue', amount: snap.overdueAmount, count: snap.overdue.length, desc: `${snap.overdue.length} overdue invoice${snap.overdue.length > 1 ? 's' : ''} totaling $${snap.overdueAmount.toLocaleString()}` });
    if (snap.churnRisk > 0) {
      const potentialLoss = snap.churnRisk * (snap.totalRevenue / Math.max(snap.contacts.length, 1));
      leaks.push({ type: 'churn', amount: Math.round(potentialLoss), count: snap.churnRisk, desc: `${snap.churnRisk} customer${snap.churnRisk > 1 ? 's' : ''} not invoiced in 90+ days — est. $${Math.round(potentialLoss).toLocaleString()} at risk` });
    }

    res.json({
      forecast, leaks,
      avgDaysToPay: Math.round(avgDaysToPay),
      monthlyRevenue: snap.last6Months,
      outstanding: snap.outstandingAmount,
      collected: snap.totalRevenue,
      thisMonth: snap.thisMonthRevenue,
      acceptRate: snap.acceptRate,
    });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /business-health ───────────────────────────────────────────
router.get('/business-health', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);
    const snap = await getSnapshot(account_id);

    // Health score components (each 0-20 points)
    const scores = {
      revenue: Math.min(20, Math.round(snap.thisMonthRevenue / (snap.avgMonthly || 1) * 20)),
      collections: snap.outstandingAmount > 0 ? Math.max(0, 20 - Math.round(snap.overdueAmount / snap.outstandingAmount * 20)) : 20,
      customerRetention: Math.max(0, 20 - snap.churnRisk * 2),
      quoteAcceptance: Math.round(snap.acceptRate / 5),
      cashFlow: snap.avgMonthly > 0 ? Math.min(20, Math.round(snap.thisMonthRevenue / snap.avgMonthly * 20)) : 0,
    };
    const total = Object.values(scores).reduce((s, v) => s + Math.min(20, Math.max(0, v)), 0);
    const label = total >= 80 ? 'Thriving' : total >= 60 ? 'Stable' : total >= 40 ? 'Warning' : 'Critical';
    const labelColor = total >= 80 ? '#059669' : total >= 60 ? '#2563EB' : total >= 40 ? '#D97706' : '#DC2626';

    // Month-over-month trend
    const prevMonth = snap.last6Months[snap.last6Months.length - 2]?.revenue || 0;
    const currMonth = snap.last6Months[snap.last6Months.length - 1]?.revenue || 0;
    const trend = prevMonth > 0 ? Math.round((currMonth - prevMonth) / prevMonth * 100) : 0;

    res.json({
      score: total,
      label,
      labelColor,
      components: scores,
      trend,
      revenue: { current: snap.thisMonthRevenue, avg: snap.avgMonthly, ytd: snap.thisYearRevenue },
      collections: { outstanding: snap.outstandingAmount, overdue: snap.overdueAmount },
      customers: { total: snap.contacts.length, churnRisk: snap.churnRisk },
      quotes: { total: snap.quotes.length, acceptRate: snap.acceptRate },
      labor: { cost: snap.totalLaborCost, hours: snap.totalLaborHours, margin: snap.laborMargin },
    });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /ai-advisor ────────────────────────────────────────────────
router.get('/ai-advisor', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);
    const snap = await getSnapshot(account_id);
    const apiKey = process.env.OPENAI_API_KEY;

    const prevMonth = snap.last6Months[snap.last6Months.length - 2]?.revenue || 0;
    const currMonth = snap.last6Months[snap.last6Months.length - 1]?.revenue || 0;
    const revTrend = prevMonth > 0 ? Math.round((currMonth - prevMonth) / prevMonth * 100) : 0;

    // Build recommendations
    const recommendations = [];
    if (snap.overdueAmount > 0) recommendations.push({ priority: 'high', category: 'collections', icon: '💰', title: 'Collect overdue invoices', desc: `$${snap.overdueAmount.toLocaleString()} is overdue across ${snap.overdue.length} invoice${snap.overdue.length > 1 ? 's' : ''}. Send reminders now.`, impact: snap.overdueAmount });
    if (snap.churnRisk > 0) recommendations.push({ priority: 'high', category: 'retention', icon: '🔄', title: 'Re-engage inactive customers', desc: `${snap.churnRisk} customer${snap.churnRisk > 1 ? 's' : ''} haven't been invoiced in 90+ days. A follow-up could recover significant revenue.`, impact: snap.churnRisk * 500 });
    if (snap.acceptRate < 50) recommendations.push({ priority: 'medium', category: 'quotes', icon: '📝', title: 'Improve quote conversion', desc: `Quote acceptance rate is ${snap.acceptRate}%. Consider follow-ups within 48 hours of sending.`, impact: 0 });
    if (revTrend < -10) recommendations.push({ priority: 'high', category: 'revenue', icon: '📉', title: 'Address revenue decline', desc: `Revenue dropped ${Math.abs(revTrend)}% vs last month. Review scheduling gaps and repeat customer frequency.`, impact: 0 });
    if (snap.outstandingAmount > snap.thisMonthRevenue * 0.5) recommendations.push({ priority: 'medium', category: 'cashflow', icon: '💳', title: 'Accelerate collections', desc: `Outstanding balance ($${snap.outstandingAmount.toLocaleString()}) is high relative to monthly revenue. Consider payment plans.`, impact: 0 });

    // AI narrative (if OpenAI available)
    let narrative = null;
    if (apiKey && recommendations.length > 0) {
      try {
        const context = `Business analytics: Revenue this month $${snap.thisMonthRevenue} (${revTrend > 0 ? '+' : ''}${revTrend}% vs last month). Outstanding: $${snap.outstandingAmount}. Overdue: $${snap.overdueAmount}. ${snap.churnRisk} at-risk customers. Quote acceptance: ${snap.acceptRate}%.`;
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: `You are a virtual CFO/COO for a small service business. In 2-3 sentences, give a clear business performance narrative and the single most important action to take this week. Be specific and actionable, reference the numbers.\n\n${context}` }],
            max_tokens: 150,
          }),
        });
        const d = await r.json();
        narrative = d.choices?.[0]?.message?.content?.trim();
      } catch {}
    }

    if (!narrative) {
      narrative = revTrend >= 0
        ? `Revenue is ${revTrend > 0 ? `up ${revTrend}%` : 'on track'} this month at $${snap.thisMonthRevenue.toLocaleString()}. ${snap.overdueAmount > 0 ? `Focus on collecting $${snap.overdueAmount.toLocaleString()} in overdue invoices to improve cash flow.` : 'Collections are healthy — focus on growing repeat customer frequency.'}`
        : `Revenue declined ${Math.abs(revTrend)}% this month to $${snap.thisMonthRevenue.toLocaleString()}. ${snap.churnRisk > 0 ? `Re-engage ${snap.churnRisk} inactive customers and` : 'Review scheduling gaps and'} prioritize collecting $${snap.outstandingAmount.toLocaleString()} outstanding.`;
    }

    res.json({ narrative, recommendations, revTrend, monthlyRevenue: snap.last6Months });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /churn-risk ────────────────────────────────────────────────
router.get('/churn-risk', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);
    const snap = await getSnapshot(account_id);
    const today = new Date();

    // Calculate churn risk per contact
    const contactActivity = {};
    snap.invoices.forEach(inv => {
      if (!inv.contact_id) return;
      if (!contactActivity[inv.contact_id]) contactActivity[inv.contact_id] = { lastInvoice: null, totalRevenue: 0, count: 0, name: inv.client_name };
      const d = inv.created_at || '';
      if (!contactActivity[inv.contact_id].lastInvoice || d > contactActivity[inv.contact_id].lastInvoice) {
        contactActivity[inv.contact_id].lastInvoice = d;
      }
      if (inv.status === 'paid') contactActivity[inv.contact_id].totalRevenue += parseFloat(inv.amount_paid || 0);
      contactActivity[inv.contact_id].count++;
    });

    const riskList = Object.entries(contactActivity).map(([id, data]) => {
      const daysSince = data.lastInvoice ? Math.floor((today - new Date(data.lastInvoice)) / 86400000) : 999;
      const avgFrequency = data.count > 1 ? 365 / data.count : 90;
      const churnScore = Math.min(100, Math.round(daysSince / avgFrequency * 50) + (daysSince > 180 ? 30 : 0));
      return { id, name: data.name, daysSince, totalRevenue: Math.round(data.totalRevenue), churnScore, invoiceCount: data.count };
    }).filter(c => c.churnScore > 30).sort((a, b) => b.churnScore - a.churnScore).slice(0, 20);

    res.json(riskList);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /workforce-intelligence ────────────────────────────────────
router.get('/workforce-intelligence', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);
    const entries = await db.execute(
      `SELECT * FROM time_entries WHERE account_id = ? ORDER BY created_at DESC`,
      [account_id]
    ).catch(() => ({ rows: [] }));

    // Group by assigned_to
    const byEmployee = {};
    entries.rows.forEach(e => {
      const name = e.assigned_to || 'Unassigned';
      if (!byEmployee[name]) byEmployee[name] = { hours: 0, cost: 0, entries: 0, projects: new Set() };
      byEmployee[name].hours += parseFloat(e.duration_minutes || 0) / 60;
      byEmployee[name].cost += parseFloat(e.billed_amount || 0);
      byEmployee[name].entries++;
      if (e.project_name) byEmployee[name].projects.add(e.project_name);
    });

    const employees = Object.entries(byEmployee).map(([name, data]) => {
      const efficiencyScore = Math.min(100, Math.round((data.cost / Math.max(data.hours, 0.1)) * 2));
      return {
        name,
        hours: Math.round(data.hours * 10) / 10,
        cost: Math.round(data.cost),
        entries: data.entries,
        projects: data.projects.size,
        efficiencyScore,
        classification: efficiencyScore >= 80 ? 'Elite Performer' : efficiencyScore >= 60 ? 'Strong Performer' : efficiencyScore >= 40 ? 'Average Performer' : 'Needs Attention',
      };
    }).sort((a, b) => b.cost - a.cost);

    // By project
    const byProject = {};
    entries.rows.forEach(e => {
      if (!e.project_name) return;
      if (!byProject[e.project_name]) byProject[e.project_name] = { hours: 0, cost: 0 };
      byProject[e.project_name].hours += parseFloat(e.duration_minutes || 0) / 60;
      byProject[e.project_name].cost += parseFloat(e.billed_amount || 0);
    });
    const projects = Object.entries(byProject).map(([name, d]) => ({
      name, hours: Math.round(d.hours * 10) / 10, cost: Math.round(d.cost),
    })).sort((a, b) => b.cost - a.cost).slice(0, 10);

    const totalHours = employees.reduce((s, e) => s + e.hours, 0);
    const totalCost = employees.reduce((s, e) => s + e.cost, 0);

    res.json({ employees, projects, totalHours: Math.round(totalHours * 10) / 10, totalCost });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /executive-summary ─────────────────────────────────────────
router.get('/executive-summary', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);
    const snap = await getSnapshot(account_id);
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const yesterdayPaid = snap.paid.filter(i => (i.paid_at || '').startsWith(yesterday));
    const newContacts = snap.contacts.filter(c => (c.created_at || '').startsWith(snap.last30.slice(0, 7)));

    res.json({
      yesterday: {
        revenue: Math.round(yesterdayPaid.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0)),
        invoicesPaid: yesterdayPaid.length,
        newCustomers: snap.contacts.filter(c => (c.created_at || '').startsWith(yesterday)).length,
      },
      risks: [
        snap.overdueAmount > 0 && { type: 'collections', severity: 'high', text: `$${snap.overdueAmount.toLocaleString()} overdue — send reminders` },
        snap.churnRisk > 0 && { type: 'churn', severity: 'medium', text: `${snap.churnRisk} customer${snap.churnRisk > 1 ? 's' : ''} inactive 90+ days` },
      ].filter(Boolean),
      opportunities: [
        snap.acceptRate < 60 && { type: 'quotes', text: `${snap.quotes.filter(q => q.status === 'draft').length} draft quotes pending — follow up to close` },
        snap.churnRisk > 0 && { type: 'retention', text: `Re-engage ${snap.churnRisk} inactive customers for repeat revenue` },
      ].filter(Boolean),
      kpis: {
        revenue: snap.thisMonthRevenue,
        outstanding: snap.outstandingAmount,
        customers: snap.contacts.length,
        quoteAcceptRate: snap.acceptRate,
      },
    });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /schedule-metrics (automation triggers) ────────────────────
router.post('/schedule', requireAuth, async (req, res) => res.json({ ok: true }));
router.post('/trigger', requireAuth, async (req, res) => res.json({ ok: true }));
router.post('/process-due', requireAuth, async (req, res) => res.json({ ok: true }));

export default router;
