import { Router } from 'express';
import { db } from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const result = await db.execute(
      `SELECT * FROM contacts WHERE account_id = ? ORDER BY name ASC`, [account_id]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { account_id, name, business, email, phone, address, notes } = req.body;
    const id = `con-${uuid()}`;
    await db.execute(
      `INSERT INTO contacts (id, account_id, name, business, email, phone, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account_id, name, business || '', email || '', phone || '', address || '', notes || '']
    );
    const created = await db.execute(`SELECT * FROM contacts WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const fields = ['name', 'business', 'email', 'phone', 'address', 'notes'];
    const updates = ['updated_at = datetime(\'now\')'];
    const vals = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); } });
    vals.push(req.params.id);
    await db.execute(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`, vals);
    const updated = await db.execute(`SELECT * FROM contacts WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute(`DELETE FROM contacts WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── GET /api/contacts/:id/notes ────────────────────────────────
router.get('/:id/notes', async (req, res) => {
  try {
    const notes = await db.execute(
      `SELECT * FROM contact_notes WHERE contact_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ notes: notes.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/contacts/:id/notes ───────────────────────────────
router.post('/:id/notes', async (req, res) => {
  const { account_id, note, note_type = 'manual' } = req.body;
  if (!note) return res.status(400).json({ error: 'note required' });
  try {
    const id = `note-${uuid()}`;
    await db.execute(
      `INSERT INTO contact_notes (id, contact_id, account_id, note, note_type) VALUES (?, ?, ?, ?, ?)`,
      [id, req.params.id, account_id, note, note_type]
    );
    // Update last_contact_at on the contact
    await db.execute(
      `UPDATE contacts SET last_contact_at = NOW()::text WHERE id = ?`,
      [req.params.id]
    );
    const created = await db.execute(`SELECT * FROM contact_notes WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/contacts/:id/timeline — full CRM timeline ─────────
router.get('/:id/timeline', async (req, res) => {
  try {
    const contactId = req.params.id;
    // Get contact with all linked quotes, invoices, notes
    const [contact, notes, quotes, invoices] = await Promise.all([
      db.execute(`SELECT * FROM contacts WHERE id = ?`, [contactId]),
      db.execute(`SELECT * FROM contact_notes WHERE contact_id = ? ORDER BY created_at DESC LIMIT 50`, [contactId]),
      db.execute(`SELECT id, number, status, setup_total, monthly_total, created_at FROM quotes WHERE contact_id = ? ORDER BY created_at DESC`, [contactId]),
      db.execute(`SELECT id, number, status, amount_due, amount_paid, paid_at, created_at FROM invoices WHERE contact_id = ? ORDER BY created_at DESC`, [contactId]),
    ]);

    if (!contact.rows.length) return res.status(404).json({ error: 'Contact not found' });

    const totalRevenue = invoices.rows
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);

    const timeline = [
      ...notes.rows.map(n => ({ type: 'note', date: n.created_at, data: n })),
      ...quotes.rows.map(q => ({ type: 'quote', date: q.created_at, data: q })),
      ...invoices.rows.map(i => ({ type: 'invoice', date: i.created_at, data: i })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      contact: contact.rows[0],
      timeline,
      stats: {
        total_quotes: quotes.rows.length,
        total_invoices: invoices.rows.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        paid_invoices: invoices.rows.filter(i => i.status === 'paid').length,
        last_contact: contact.rows[0].last_contact_at,
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/contacts/:id/ai-summary — generate AI client summary
router.post('/:id/ai-summary', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const contactId = req.params.id;
  try {
    const [contact, quotes, invoices, notes] = await Promise.all([
      db.execute(`SELECT * FROM contacts WHERE id = ?`, [contactId]),
      db.execute(`SELECT number, status, setup_total FROM quotes WHERE contact_id = ? ORDER BY created_at DESC LIMIT 5`, [contactId]),
      db.execute(`SELECT number, status, amount_paid, paid_at FROM invoices WHERE contact_id = ? ORDER BY created_at DESC LIMIT 5`, [contactId]),
      db.execute(`SELECT note, note_type FROM contact_notes WHERE contact_id = ? ORDER BY created_at DESC LIMIT 5`, [contactId]),
    ]);

    if (!contact.rows.length) return res.status(404).json({ error: 'Not found' });
    const c = contact.rows[0];

    if (!apiKey) {
      return res.json({ summary: `${c.name} has ${quotes.rows.length} quotes and ${invoices.rows.length} invoices on file.` });
    }

    const context = `
Client: ${c.name} (${c.business || 'individual'})
Quotes: ${quotes.rows.map(q => `${q.number} (${q.status}, $${q.setup_total})`).join(', ') || 'none'}
Invoices: ${invoices.rows.map(i => `${i.number} (${i.status})`).join(', ') || 'none'}
Notes: ${notes.rows.map(n => n.note).join('; ') || 'none'}
    `;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: `Write a 2-3 sentence professional CRM summary for this client. Include their relationship status, key activity, and any recommended next action.

${context}` }],
        max_tokens: 150,
      }),
    });
    const data = await resp.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || 'Summary unavailable.';

    // Save it as a note
    await db.execute(
      `INSERT INTO contact_notes (id, contact_id, account_id, note, note_type) VALUES (?, ?, ?, ?, 'ai_summary')`,
      [`note-${uuid()}`, contactId, c.account_id, summary]
    );

    res.json({ summary });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
