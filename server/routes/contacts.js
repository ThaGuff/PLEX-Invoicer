/**
 * Contacts API — Full CRM System
 * Endpoints:
 *   GET    /                          — list with computed financials
 *   POST   /                          — create
 *   GET    /:id                       — get single contact with full enrichment
 *   PATCH  /:id                       — update
 *   DELETE /:id                       — delete
 *   GET    /:id/timeline              — full activity timeline
 *   POST   /:id/notes                 — add note/call/email log
 *   GET    /:id/notes                 — get notes
 *   POST   /:id/ai-score              — compute AI scores (revenue, health, DNA, opportunity)
 *   GET    /custom-fields             — list custom field definitions
 *   POST   /custom-fields             — create custom field
 *   PATCH  /custom-fields/:id        — update custom field
 *   DELETE /custom-fields/:id        — delete custom field
 *   PATCH  /:id/custom-values        — save custom field values for contact
 *   GET    /saved-views              — list saved views
 *   POST   /saved-views              — create saved view
 *   DELETE /saved-views/:id         — delete saved view
 *   GET    /:id/tasks                — list tasks for contact
 *   POST   /:id/tasks                — create task
 *   PATCH  /tasks/:id               — update task (complete, edit)
 *   DELETE /tasks/:id               — delete task
 *   POST   /bulk                     — bulk actions (tag, assign, delete)
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// ── Auth helper ────────────────────────────────────────────────
async function assertAccess(accountId, userId) {
  if (!accountId) throw Object.assign(new Error('account_id required'), { status: 400 });
  const r = await db.execute(
    `SELECT id FROM accounts WHERE id = ? AND (owner_id = ? OR id IN (SELECT account_id FROM account_members WHERE user_id = ? AND status='active'))`,
    [accountId, userId, userId]
  );
  if (!r.rows.length) throw Object.assign(new Error('Access denied'), { status: 403 });
}

// ── Compute live financial stats for a contact ─────────────────
async function computeContactStats(contactId) {
  const [quotes, invoices] = await Promise.all([
    db.execute(
      `SELECT id, number, status, setup_total, monthly_total, created_at FROM quotes WHERE contact_id = ? ORDER BY created_at DESC`,
      [contactId]
    ),
    db.execute(
      `SELECT id, number, status, amount_due, amount_paid, paid_at, due_date, created_at FROM invoices WHERE contact_id = ? ORDER BY created_at DESC`,
      [contactId]
    ),
  ]);

  const paidInvoices    = invoices.rows.filter(i => i.status === 'paid');
  const lifetimeValue   = paidInvoices.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
  const outstanding     = invoices.rows
    .filter(i => i.status !== 'paid' && i.status !== 'void')
    .reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);
  const avgInvoice      = paidInvoices.length ? lifetimeValue / paidInvoices.length : 0;
  const lastInvoice     = invoices.rows[0]?.created_at || null;
  const lastPayment     = paidInvoices[0]?.paid_at || null;

  // Overdue invoices
  const today = new Date().toISOString().split('T')[0];
  const overdueInvoices = invoices.rows.filter(i =>
    i.status !== 'paid' && i.status !== 'void' && i.due_date && i.due_date < today
  );

  return {
    quotes: quotes.rows,
    invoices: invoices.rows,
    lifetime_value: Math.round(lifetimeValue * 100) / 100,
    outstanding_balance: Math.round(outstanding * 100) / 100,
    avg_invoice: Math.round(avgInvoice * 100) / 100,
    total_quotes: quotes.rows.length,
    total_invoices: invoices.rows.length,
    paid_invoices: paidInvoices.length,
    overdue_invoices: overdueInvoices.length,
    last_invoice_date: lastInvoice,
    last_payment_date: lastPayment,
  };
}

// ── Compute AI scores (revenue, health, DNA) ───────────────────
async function computeAIScores(contact, stats) {
  const { lifetime_value, total_invoices, paid_invoices, outstanding_balance, overdue_invoices, last_invoice_date } = stats;

  // Revenue Score (0-100)
  let revenueScore = 0;
  if (lifetime_value >= 10000) revenueScore += 30;
  else if (lifetime_value >= 5000) revenueScore += 20;
  else if (lifetime_value >= 1000) revenueScore += 10;
  if (total_invoices >= 5) revenueScore += 20;
  else if (total_invoices >= 2) revenueScore += 10;
  if (paid_invoices === total_invoices && total_invoices > 0) revenueScore += 20;
  else if (paid_invoices > 0) revenueScore += 10;
  // Recency
  if (last_invoice_date) {
    const daysSinceLast = Math.floor((Date.now() - new Date(last_invoice_date)) / 86400000);
    if (daysSinceLast < 30) revenueScore += 20;
    else if (daysSinceLast < 90) revenueScore += 10;
    else if (daysSinceLast > 180) revenueScore -= 10;
  }
  // Customer age bonus
  if (contact.customer_since) {
    const months = Math.floor((Date.now() - new Date(contact.customer_since)) / (30 * 86400000));
    if (months >= 12) revenueScore += 10;
    else if (months >= 6) revenueScore += 5;
  }
  revenueScore = Math.min(100, Math.max(0, revenueScore));

  // Health Score (0-100)
  let healthScore = 50;
  if (overdue_invoices > 0) healthScore -= 20 * overdue_invoices;
  if (outstanding_balance > 0) healthScore -= 10;
  if (paid_invoices === total_invoices && total_invoices > 0) healthScore += 20;
  if (last_invoice_date) {
    const days = Math.floor((Date.now() - new Date(last_invoice_date)) / 86400000);
    if (days < 60) healthScore += 20;
    else if (days > 180) healthScore -= 20;
    else if (days > 365) healthScore -= 40;
  }
  healthScore = Math.min(100, Math.max(0, healthScore));

  // DNA Label
  let dnaLabel = 'New Customer';
  if (total_invoices >= 5) dnaLabel = 'Repeat Buyer';
  if (lifetime_value >= 10000) dnaLabel = 'VIP';
  if (lifetime_value >= 10000 && total_invoices >= 5) dnaLabel = 'VIP';
  if (overdue_invoices > 1 || healthScore < 30) dnaLabel = 'At-Risk Customer';
  if (total_invoices === 1) dnaLabel = 'New Customer';
  if (last_invoice_date) {
    const days = Math.floor((Date.now() - new Date(last_invoice_date)) / 86400000);
    if (days > 180 && total_invoices > 1) dnaLabel = 'Seasonal Customer';
    if (days > 365) dnaLabel = 'At-Risk Customer';
  }
  if (lifetime_value > 0 && avg_invoice > 2000) dnaLabel = 'High Margin Customer';
  const { avg_invoice } = stats;

  // Opportunity text
  let opportunity = null;
  if (last_invoice_date) {
    const daysSince = Math.floor((Date.now() - new Date(last_invoice_date)) / 86400000);
    if (daysSince >= 90) {
      opportunity = `This client hasn't been invoiced in ${daysSince} days — consider a follow-up.`;
    } else if (daysSince >= 45) {
      opportunity = `It's been ${daysSince} days since their last invoice. A check-in call could generate repeat business.`;
    }
  }
  if (overdue_invoices > 0) {
    opportunity = `⚠️ ${overdue_invoices} overdue invoice${overdue_invoices > 1 ? 's' : ''} — send a payment reminder.`;
  }
  if (revenueScore >= 80 && !opportunity) {
    opportunity = `🌟 High-value client — consider an upsell or premium service offering.`;
  }

  return { revenueScore, healthScore, dnaLabel, opportunity };
}

// ── GET / — list all contacts with live financial data ─────────
router.get('/', requireAuth, async (req, res) => {
  const { account_id, search, tags, contact_type, dna_label, sort_by = 'name', sort_dir = 'asc', limit = 500 } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccess(account_id, req.user.id);

    // Base query with live financial aggregation
    const safeSortBy = ['name','lifetime_value','outstanding_balance','last_invoice_date','created_at','ai_revenue_score','ai_health_score'].includes(sort_by) ? sort_by : 'name';
    const contacts = await db.execute(
      `SELECT c.*,
        COALESCE((SELECT SUM(i.amount_paid) FROM invoices i WHERE i.contact_id = c.id AND i.status='paid'), 0) as lifetime_value,
        COALESCE((SELECT SUM(i.amount_due) FROM invoices i WHERE i.contact_id = c.id AND i.status NOT IN ('paid','void')), 0) as outstanding_balance,
        (SELECT i.created_at FROM invoices i WHERE i.contact_id = c.id ORDER BY i.created_at DESC LIMIT 1) as last_invoice_date,
        (SELECT i.paid_at FROM invoices i WHERE i.contact_id = c.id AND i.status='paid' ORDER BY i.paid_at DESC LIMIT 1) as last_payment_date,
        GREATEST(
          COALESCE((SELECT MAX(cn.created_at) FROM contact_notes cn WHERE cn.contact_id = c.id), '1970-01-01'),
          COALESCE((SELECT MAX(q.created_at) FROM quotes q WHERE q.contact_id = c.id), '1970-01-01')
        ) as last_activity_date,
        (SELECT COUNT(*) FROM quotes WHERE contact_id = c.id) as total_quotes,
        (SELECT COUNT(*) FROM invoices WHERE contact_id = c.id) as total_invoices
       FROM contacts c
       WHERE c.account_id = ?
       ORDER BY c.${safeSortBy} ${sort_dir === 'desc' ? 'DESC' : 'ASC'}
       LIMIT ?`,
      [account_id, parseInt(limit)]
    );

    let rows = contacts.rows;

    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(c =>
        c.name?.toLowerCase().includes(s) ||
        c.business?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.includes(s)
      );
    }

    // Filter by tag
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      rows = rows.filter(c => {
        try {
          const ctags = JSON.parse(c.tags || '[]');
          return tagList.some(t => ctags.includes(t));
        } catch { return false; }
      });
    }

    // Filter by DNA label
    if (dna_label) {
      rows = rows.filter(c => c.ai_dna_label === dna_label);
    }

    // Filter by contact type
    if (contact_type) {
      rows = rows.filter(c => c.contact_type === contact_type);
    }

    res.json(rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST / — create contact ────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { account_id, name, business, email, phone, address, notes, tags, contact_type, website, job_title, source, assigned_to } = req.body;
    const id = `con-${uuid()}`;
    await db.execute(
      `INSERT INTO contacts (id, account_id, name, business, email, phone, address, notes, tags, contact_type, website, job_title, source, assigned_to, customer_since)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, account_id, name, business||'', email||'', phone||'', address||'', notes||'', tags||'[]', contact_type||'customer', website||'', job_title||'', source||'', assigned_to||null]
    );
    const created = await db.execute(`SELECT * FROM contacts WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Custom Fields ──────────────────────────────────────────────
router.get('/custom-fields', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const fields = await db.execute(
      `SELECT * FROM contact_custom_fields WHERE account_id = ? ORDER BY sort_order ASC, created_at ASC`,
      [account_id]
    );
    res.json(fields.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/custom-fields', requireAuth, async (req, res) => {
  const { account_id, field_name, field_type = 'text', field_options = '[]', is_required = 0, sort_order = 0 } = req.body;
  if (!account_id || !field_name) return res.status(400).json({ error: 'account_id and field_name required' });
  try {
    await assertAccess(account_id, req.user.id);
    const field_key = field_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = `cf-${uuid()}`;
    await db.execute(
      `INSERT INTO contact_custom_fields (id, account_id, field_name, field_key, field_type, field_options, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, field_name, field_key, field_type, JSON.stringify(field_options), is_required ? 1 : 0, sort_order]
    );
    const created = await db.execute(`SELECT * FROM contact_custom_fields WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.patch('/custom-fields/:id', requireAuth, async (req, res) => {
  try {
    const { field_name, field_options, is_required, sort_order } = req.body;
    const updates = [];
    const vals = [];
    if (field_name !== undefined) { updates.push('field_name = ?'); vals.push(field_name); }
    if (field_options !== undefined) { updates.push('field_options = ?'); vals.push(JSON.stringify(field_options)); }
    if (is_required !== undefined) { updates.push('is_required = ?'); vals.push(is_required ? 1 : 0); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); vals.push(sort_order); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    await db.execute(`UPDATE contact_custom_fields SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM contact_custom_fields WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/custom-fields/:id', requireAuth, async (req, res) => {
  try {
    await db.execute(`DELETE FROM contact_custom_fields WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/custom-values', requireAuth, async (req, res) => {
  const { account_id, values } = req.body; // values: { [field_id]: value }
  try {
    for (const [field_id, value] of Object.entries(values || {})) {
      await db.execute(
        `INSERT INTO contact_custom_values (id, contact_id, account_id, field_id, value, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON CONFLICT(contact_id, field_id) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
        [`cv-${uuid()}`, req.params.id, account_id, field_id, String(value)]
      );
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Saved Views ────────────────────────────────────────────────
router.get('/saved-views', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const views = await db.execute(
      `SELECT * FROM contact_saved_views WHERE account_id = ? ORDER BY created_at ASC`,
      [account_id]
    );
    res.json(views.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/saved-views', requireAuth, async (req, res) => {
  const { account_id, name, filters = '{}', sort_by = 'name' } = req.body;
  if (!account_id || !name) return res.status(400).json({ error: 'account_id and name required' });
  try {
    const id = `sv-${uuid()}`;
    await db.execute(
      `INSERT INTO contact_saved_views (id, account_id, name, filters, sort_by, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, account_id, name, JSON.stringify(filters), sort_by, req.user.id]
    );
    const created = await db.execute(`SELECT * FROM contact_saved_views WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/saved-views/:id', requireAuth, async (req, res) => {
  try {
    await db.execute(`DELETE FROM contact_saved_views WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Tasks ──────────────────────────────────────────────────────
router.get('/:id/tasks', async (req, res) => {
  try {
    const tasks = await db.execute(
      `SELECT * FROM contact_tasks WHERE contact_id = ? ORDER BY completed ASC, due_date ASC, created_at DESC`,
      [req.params.id]
    );
    res.json(tasks.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/tasks', requireAuth, async (req, res) => {
  const { account_id, title, due_date, assigned_to, priority = 'normal' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const id = `task-${uuid()}`;
    await db.execute(
      `INSERT INTO contact_tasks (id, contact_id, account_id, title, due_date, assigned_to, priority) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, account_id, title, due_date || null, assigned_to || null, priority]
    );
    const created = await db.execute(`SELECT * FROM contact_tasks WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { title, due_date, completed, assigned_to, priority } = req.body;
    const updates = [];
    const vals = [];
    if (title !== undefined) { updates.push('title = ?'); vals.push(title); }
    if (due_date !== undefined) { updates.push('due_date = ?'); vals.push(due_date); }
    if (completed !== undefined) { updates.push('completed = ?'); vals.push(completed ? 1 : 0); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); vals.push(assigned_to); }
    if (priority !== undefined) { updates.push('priority = ?'); vals.push(priority); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    await db.execute(`UPDATE contact_tasks SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM contact_tasks WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/tasks/:id', requireAuth, async (req, res) => {
  try {
    await db.execute(`DELETE FROM contact_tasks WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Bulk Actions ───────────────────────────────────────────────
router.post('/bulk', requireAuth, async (req, res) => {
  const { account_id, contact_ids, action, value } = req.body;
  if (!account_id || !contact_ids?.length || !action) return res.status(400).json({ error: 'account_id, contact_ids, and action required' });
  try {
    await assertAccess(account_id, req.user.id);
    const placeholders = contact_ids.map(() => '?').join(',');
    let affected = 0;
    if (action === 'delete') {
      await db.execute(`DELETE FROM contacts WHERE id IN (${placeholders}) AND account_id = ?`, [...contact_ids, account_id]);
      affected = contact_ids.length;
    } else if (action === 'tag' && value) {
      // Add tag to each contact (merge with existing tags)
      for (const cid of contact_ids) {
        const c = await db.execute(`SELECT tags FROM contacts WHERE id = ?`, [cid]);
        if (c.rows.length) {
          const tags = JSON.parse(c.rows[0].tags || '[]');
          if (!tags.includes(value)) {
            tags.push(value);
            await db.execute(`UPDATE contacts SET tags = ? WHERE id = ?`, [JSON.stringify(tags), cid]);
            affected++;
          }
        }
      }
    } else if (action === 'assign' && value) {
      await db.execute(`UPDATE contacts SET assigned_to = ? WHERE id IN (${placeholders}) AND account_id = ?`, [value, ...contact_ids, account_id]);
      affected = contact_ids.length;
    } else if (action === 'type' && value) {
      await db.execute(`UPDATE contacts SET contact_type = ? WHERE id IN (${placeholders}) AND account_id = ?`, [value, ...contact_ids, account_id]);
      affected = contact_ids.length;
    } else if (action === 'score') {
      // Trigger AI scoring for all selected contacts
      for (const cid of contact_ids) {
        try {
          const c = await db.execute(`SELECT * FROM contacts WHERE id = ?`, [cid]);
          if (c.rows.length) {
            const stats = await computeContactStats(cid);
            const { revenueScore, healthScore, dnaLabel, opportunity } = await computeAIScores(c.rows[0], stats);
            await db.execute(
              `UPDATE contacts SET ai_revenue_score=?, ai_health_score=?, ai_dna_label=?, ai_opportunity=?, lifetime_value=?, outstanding_balance=? WHERE id=?`,
              [revenueScore, healthScore, dnaLabel, opportunity, stats.lifetime_value, stats.outstanding_balance, cid]
            );
            affected++;
          }
        } catch {}
      }
    }
    res.json({ ok: true, affected });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /:id — single contact with full enrichment ─────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const contact = await db.execute(
      `SELECT c.*, a.name as account_name FROM contacts c LEFT JOIN accounts a ON a.id = c.account_id WHERE c.id = ?`,
      [req.params.id]
    );
    if (!contact.rows.length) return res.status(404).json({ error: 'Not found' });
    const c = contact.rows[0];

    const [stats, notes, customValues] = await Promise.all([
      computeContactStats(req.params.id),
      db.execute(`SELECT * FROM contact_notes WHERE contact_id = ? ORDER BY created_at DESC LIMIT 50`, [req.params.id]),
      db.execute(
        `SELECT cv.*, cf.field_name, cf.field_key, cf.field_type FROM contact_custom_values cv
         JOIN contact_custom_fields cf ON cf.id = cv.field_id WHERE cv.contact_id = ?`,
        [req.params.id]
      ),
    ]);

    const scores = await computeAIScores(c, stats);

    res.json({
      ...c,
      ...stats,
      ...scores,
      notes: notes.rows,
      custom_values: customValues.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /:id — update contact ────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const owned = await db.execute(`SELECT id FROM contacts WHERE id = ? AND account_id = ?`, [req.params.id, account_id]);
    if (!owned.rows.length) return res.status(404).json({ error: 'Not found' });

    const allowed = ['name','business','email','phone','address','notes','tags','contact_type','website','job_title','source','assigned_to','rating','last_contacted','company_size'];
    const updates = [`updated_at = NOW()`];
    const vals = [];
    allowed.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); } });
    vals.push(req.params.id, account_id);
    await db.execute(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ? AND account_id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM contacts WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /:id ────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const c = await db.execute(`SELECT * FROM contacts WHERE id = ?`, [req.params.id]);
    if (!c.rows.length) return res.status(404).json({ error: 'Not found' });
    await assertAccess(c.rows[0].account_id, req.user.id);
    await db.execute(`DELETE FROM contacts WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /:id/timeline ──────────────────────────────────────────
router.get('/:id/timeline', async (req, res) => {
  try {
    const [contact, notes, quotes, invoices, tasks] = await Promise.all([
      db.execute(`SELECT * FROM contacts WHERE id = ?`, [req.params.id]),
      db.execute(`SELECT * FROM contact_notes WHERE contact_id = ? ORDER BY created_at DESC LIMIT 100`, [req.params.id]),
      db.execute(`SELECT id, number, status, setup_total, created_at FROM quotes WHERE contact_id = ? ORDER BY created_at DESC`, [req.params.id]),
      db.execute(`SELECT id, number, status, amount_due, amount_paid, paid_at, created_at FROM invoices WHERE contact_id = ? ORDER BY created_at DESC`, [req.params.id]),
      db.execute(`SELECT * FROM contact_tasks WHERE contact_id = ? ORDER BY created_at DESC LIMIT 20`, [req.params.id]),
    ]);
    if (!contact.rows.length) return res.status(404).json({ error: 'Not found' });
    const c = contact.rows[0];
    const stats = await computeContactStats(req.params.id);
    const scores = await computeAIScores(c, stats);

    const timeline = [
      ...notes.rows.map(n => ({ type: 'note', date: n.created_at, data: n })),
      ...quotes.rows.map(q => ({ type: 'quote', date: q.created_at, data: q })),
      ...invoices.rows.map(i => ({ type: 'invoice', date: i.created_at, data: i })),
      ...tasks.rows.map(t => ({ type: 'task', date: t.created_at, data: t })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ contact: c, timeline, stats, scores });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /:id/notes ─────────────────────────────────────────────
router.get('/:id/notes', async (req, res) => {
  try {
    const notes = await db.execute(
      `SELECT * FROM contact_notes WHERE contact_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ notes: notes.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /:id/notes ────────────────────────────────────────────
router.post('/:id/notes', async (req, res) => {
  const { account_id, note, note_type = 'manual' } = req.body;
  if (!note) return res.status(400).json({ error: 'note required' });
  try {
    const id = `note-${uuid()}`;
    await db.execute(
      `INSERT INTO contact_notes (id, contact_id, account_id, note, note_type) VALUES (?, ?, ?, ?, ?)`,
      [id, req.params.id, account_id, note, note_type]
    );
    await db.execute(`UPDATE contacts SET last_contact_at = NOW() WHERE id = ?`, [req.params.id]);
    const created = await db.execute(`SELECT * FROM contact_notes WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /:id/ai-score — compute & cache all AI scores ─────────
router.post('/:id/ai-score', requireAuth, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  try {
    const contact = await db.execute(`SELECT * FROM contacts WHERE id = ?`, [req.params.id]);
    if (!contact.rows.length) return res.status(404).json({ error: 'Not found' });
    const c = contact.rows[0];
    const stats = await computeContactStats(req.params.id);
    const { revenueScore, healthScore, dnaLabel, opportunity } = await computeAIScores(c, stats);

    // Generate AI summary via OpenAI if available
    let aiSummary = c.ai_summary_cache;
    const lastUpdate = c.ai_summary_updated ? new Date(c.ai_summary_updated) : null;
    const needsRefresh = !lastUpdate || (Date.now() - lastUpdate) > 7 * 86400000; // 7 days

    if (apiKey && needsRefresh) {
      try {
        const ctx = `
Client: ${c.name} (${c.business || 'individual'})
Revenue Score: ${revenueScore}/100 | Health Score: ${healthScore}/100 | DNA: ${dnaLabel}
Lifetime Value: $${stats.lifetime_value} | Invoices: ${stats.total_invoices} | Paid: ${stats.paid_invoices}
Outstanding: $${stats.outstanding_balance} | Overdue: ${stats.overdue_invoices}
Last Invoice: ${stats.last_invoice_date || 'never'} | Last Payment: ${stats.last_payment_date || 'never'}
Source: ${c.source || 'unknown'} | Since: ${c.customer_since || 'unknown'}
Notes: ${c.notes || 'none'}`;

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: `You are a business CRM assistant. Write a 2-3 sentence relationship memory summary for this client. Include their value to the business, communication style if known, and the single most important next action.\n\n${ctx}` }],
            max_tokens: 200,
          }),
        });
        const data = await resp.json();
        aiSummary = data.choices?.[0]?.message?.content?.trim();
      } catch(aiErr) {
        console.error('OpenAI error:', aiErr.message);
      }
    }

    // Save scores to DB
    await db.execute(
      `UPDATE contacts SET
        ai_revenue_score = ?, ai_health_score = ?, ai_dna_label = ?,
        ai_opportunity = ?, ai_summary_cache = ?, ai_summary_updated = NOW(),
        lifetime_value = ?, outstanding_balance = ?,
        last_invoice_date = ?, last_payment_date = ?
       WHERE id = ?`,
      [revenueScore, healthScore, dnaLabel, opportunity, aiSummary,
       stats.lifetime_value, stats.outstanding_balance,
       stats.last_invoice_date, stats.last_payment_date,
       req.params.id]
    );

    res.json({
      revenue_score: revenueScore,
      health_score: healthScore,
      dna_label: dnaLabel,
      opportunity,
      ai_summary: aiSummary,
      stats,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
