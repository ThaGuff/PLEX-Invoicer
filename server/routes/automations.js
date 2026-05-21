/**
 * Automation Engine — sequences, steps, runs, and AI message generation
 * Triggers: quote_viewed, quote_ignored, invoice_overdue, deposit_unpaid, repeat_customer
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// ── Default template library ──────────────────────────────────────
const TEMPLATES = [
  {
    id: 'tpl-quote-followup',
    name: 'Quote follow-up (3-step)',
    trigger: 'quote_viewed',
    steps: [
      { delay_hours: 24, channel: 'email', subject: 'Quick follow-up on your quote', body: 'Hi {client_name},\n\nJust wanted to check in on the quote I sent over. Do you have any questions I can help answer?\n\nBest,\n{agency_name}' },
      { delay_hours: 72, channel: 'email', subject: 'Still interested in moving forward?', body: 'Hi {client_name},\n\nI\'m reaching back out about your quote for {service_summary}. I\'d love to get started — even a small adjustment to fit your budget is possible.\n\nBest,\n{agency_name}' },
      { delay_hours: 168, channel: 'email', subject: 'Last follow-up', body: 'Hi {client_name},\n\nThis will be my last follow-up. The quote for {service_summary} is still open if you\'re interested. Happy to revisit pricing if needed.\n\n{agency_name}' },
    ],
  },
  {
    id: 'tpl-invoice-overdue',
    name: 'Overdue invoice recovery',
    trigger: 'invoice_overdue',
    steps: [
      { delay_hours: 0,   channel: 'email', subject: 'Invoice {invoice_num} is past due', body: 'Hi {client_name},\n\nYour invoice {invoice_num} for {amount} was due on {due_date}. Please make payment at your earliest convenience:\n{payment_link}\n\nThank you,\n{agency_name}' },
      { delay_hours: 72,  channel: 'email', subject: 'Second notice: Invoice {invoice_num}', body: 'Hi {client_name},\n\nThis is a second notice for invoice {invoice_num} ({amount}). If you\'ve already sent payment please disregard.\n{payment_link}\n\n{agency_name}' },
      { delay_hours: 168, channel: 'email', subject: 'Final notice: Invoice {invoice_num}', body: 'Hi {client_name},\n\nThis is our final notice for invoice {invoice_num} ({amount}). Please arrange payment immediately or contact us to discuss options.\n\n{agency_name}' },
    ],
  },
  {
    id: 'tpl-repeat-upsell',
    name: 'Repeat customer upsell',
    trigger: 'repeat_customer',
    steps: [
      { delay_hours: 48, channel: 'email', subject: 'Thank you — and a special offer', body: 'Hi {client_name},\n\nThank you for your continued business! As a returning client, I\'d like to offer you a priority slot and 10% off your next project.\n\nWould you like to schedule a call?\n\n{agency_name}' },
    ],
  },
  {
    id: 'tpl-quote-ignored',
    name: 'Quote ignored nurture',
    trigger: 'quote_ignored',
    steps: [
      { delay_hours: 48,  channel: 'email', subject: 'Did you get a chance to look at the quote?', body: 'Hi {client_name},\n\nI sent over a quote a couple of days ago and wanted to make sure it arrived okay. Happy to hop on a quick call to walk through it.\n\n{agency_name}' },
      { delay_hours: 120, channel: 'email', subject: 'Checking in one more time', body: 'Hi {client_name},\n\nI know you\'re busy — just wanted to leave the door open. If the timing isn\'t right, I completely understand. When you\'re ready, I\'m here.\n\n{agency_name}' },
    ],
  },
];

// ── GET /api/automations/templates ─────────────────────────────
router.get('/templates', (req, res) => res.json({ templates: TEMPLATES }));

// ── GET /api/automations — list sequences for account ──────────
router.get('/', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const seqs = await db.execute(
      `SELECT s.*, COUNT(st.id) as step_count,
        (SELECT COUNT(*) FROM automation_runs r WHERE r.sequence_id = s.id AND r.status = 'sent') as total_sent
       FROM automation_sequences s
       LEFT JOIN automation_steps st ON st.sequence_id = s.id
       WHERE s.account_id = ?
       GROUP BY s.id ORDER BY s.created_at DESC`,
      [account_id]
    );
    res.json({ sequences: seqs.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/automations — create sequence ─────────────────────
router.post('/', async (req, res) => {
  const { account_id, name, trigger, steps = [], template_id } = req.body;
  if (!account_id || !name || !trigger) return res.status(400).json({ error: 'account_id, name, trigger required' });

  const seqId = `seq-${uuid()}`;
  let stepsToCreate = steps;

  // Load from template
  if (template_id && steps.length === 0) {
    const tpl = TEMPLATES.find(t => t.id === template_id);
    if (tpl) stepsToCreate = tpl.steps;
  }

  try {
    await db.execute(
      `INSERT INTO automation_sequences (id, account_id, name, trigger) VALUES (?, ?, ?, ?)`,
      [seqId, account_id, name, trigger]
    );
    for (let i = 0; i < stepsToCreate.length; i++) {
      const s = stepsToCreate[i];
      await db.execute(
        `INSERT INTO automation_steps (id, sequence_id, step_order, delay_hours, channel, subject, body)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`step-${uuid()}`, seqId, i + 1, s.delay_hours || 24, s.channel || 'email', s.subject || '', s.body]
      );
    }
    const created = await db.execute(`SELECT * FROM automation_sequences WHERE id = ?`, [seqId]);
    const createdSteps = await db.execute(`SELECT * FROM automation_steps WHERE sequence_id = ? ORDER BY step_order`, [seqId]);
    res.json({ sequence: created.rows[0], steps: createdSteps.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/automations/:id — toggle active or update name ──
router.patch('/:id', async (req, res) => {
  try {
    const { active, name } = req.body;
    const updates = [];
    const vals = [];
    if (active !== undefined) { updates.push('active = ?'); vals.push(active ? 1 : 0); }
    if (name) { updates.push('name = ?'); vals.push(name); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    await db.execute(`UPDATE automation_sequences SET ${updates.join(', ')} WHERE id = ?`, vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/automations/:id ─────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.execute(`DELETE FROM automation_sequences WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/automations/ai-rewrite — rewrite a message with AI
router.post('/ai-rewrite', async (req, res) => {
  const { message, tone = 'professional', context = '' } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ rewritten: message, note: 'OpenAI not configured' });

  try {
    const prompt = `Rewrite this follow-up message in a ${tone} tone. Keep it concise (under 100 words). Keep all template variables like {client_name} intact. Context: ${context}\n\nOriginal:\n${message}`;
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 300 }),
    });
    const data = await resp.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim() || message;
    res.json({ rewritten });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/automations/trigger — manually fire a trigger ────
router.post('/trigger', async (req, res) => {
  const { account_id, trigger, invoice_id, quote_id, contact_id } = req.body;
  if (!account_id || !trigger) return res.status(400).json({ error: 'account_id and trigger required' });

  try {
    // Find active sequences for this trigger
    const seqs = await db.execute(
      `SELECT s.*, st.id as step_id, st.delay_hours, st.channel, st.subject, st.body, st.step_order
       FROM automation_sequences s
       JOIN automation_steps st ON st.sequence_id = s.id
       WHERE s.account_id = ? AND s.trigger = ? AND s.active = 1
       ORDER BY s.id, st.step_order`,
      [account_id, trigger]
    );

    const runs = [];
    for (const step of seqs.rows) {
      const scheduledAt = new Date(Date.now() + step.delay_hours * 3600000).toISOString();
      const runId = `run-${uuid()}`;
      await db.execute(
        `INSERT INTO automation_runs (id, sequence_id, step_id, invoice_id, quote_id, contact_id, status, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [runId, step.id, step.step_id, invoice_id || null, quote_id || null, contact_id || null, scheduledAt]
      );
      runs.push({ run_id: runId, step_order: step.step_order, scheduled_at: scheduledAt });
    }
    res.json({ ok: true, runs_scheduled: runs.length, runs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/automations/runs — pending run queue ──────────────
router.get('/runs', async (req, res) => {
  const { account_id, status = 'pending' } = req.query;
  try {
    const result = await db.execute(
      `SELECT r.*, st.subject, st.body, st.channel, st.delay_hours,
              s.name as sequence_name, s.trigger
       FROM automation_runs r
       JOIN automation_steps st ON r.step_id = st.id
       JOIN automation_sequences s ON r.sequence_id = s.id
       JOIN accounts a ON s.account_id = a.id
       WHERE a.id = ? AND r.status = ?
       ORDER BY r.scheduled_at ASC LIMIT 100`,
      [account_id, status]
    );
    res.json({ runs: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
