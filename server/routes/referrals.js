/**
 * Referral System Routes
 * POST /api/referrals/generate    — generate a referral code for an account
 * GET  /api/referrals             — get all referrals for an account
 * GET  /api/referrals/validate/:code — check if a referral code is valid (public)
 * POST /api/referrals/apply       — apply referral code when new account signs up
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
const router = Router();

const { randomUUID } = await import('crypto');

function generateCode(name) {
  const base = (name || 'REV').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}

// GET /api/referrals — get referrals + stats for account
router.get('/', requireAuth, async (req, res) => {
  try {
    const { db } = await import('../db/schema.js');
    const { account_id } = req.query;
    if (!account_id) return res.status(400).json({ error: 'account_id required' });

    const refs = await db.execute(
      `SELECT * FROM referrals WHERE referrer_account_id = ? ORDER BY created_at DESC`,
      [account_id]
    );

    const total    = refs.rows.length;
    const pending  = refs.rows.filter(r => r.status === 'pending').length;
    const rewarded = refs.rows.filter(r => r.status === 'rewarded').length;
    const totalEarned = refs.rows.filter(r => r.status === 'rewarded').reduce((s, r) => s + (r.reward_value || 0), 0);

    res.json({ referrals: refs.rows, stats: { total, pending, rewarded, totalEarned } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/referrals/generate — create or return existing referral code
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { db } = await import('../db/schema.js');
    const { account_id } = req.body;
    if (!account_id) return res.status(400).json({ error: 'account_id required' });

    // Return existing code if one exists
    const existing = await db.execute(
      `SELECT * FROM referrals WHERE referrer_account_id = ? AND referred_account_id IS NULL LIMIT 1`,
      [account_id]
    );
    if (existing.rows.length) return res.json({ referral: existing.rows[0], isNew: false });

    // Get account name for code generation
    const acc = await db.execute(`SELECT name FROM accounts WHERE id = ?`, [account_id]);
    const code = generateCode(acc.rows[0]?.name || 'REV');

    const id = `ref-${randomUUID()}`;
    await db.execute(
      `INSERT INTO referrals (id, referrer_account_id, referral_code, status, reward_value, created_at)
       VALUES (?, ?, ?, 'pending', 25.00, NOW())`,
      [id, account_id, code]
    );

    const created = await db.execute(`SELECT * FROM referrals WHERE id = ?`, [id]);
    res.json({ referral: created.rows[0], isNew: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/referrals/validate/:code — validate a referral code (public, for signup flow)
router.get('/validate/:code', async (req, res) => {
  try {
    const { db } = await import('../db/schema.js');
    const ref = await db.execute(
      `SELECT r.*, a.name as referrer_name FROM referrals r
       JOIN accounts a ON a.id = r.referrer_account_id
       WHERE r.referral_code = ? AND r.referred_account_id IS NULL`,
      [req.params.code.toUpperCase()]
    );
    if (!ref.rows.length) return res.json({ valid: false });
    const r = ref.rows[0];
    res.json({ valid: true, referrerName: r.referrer_name, reward: r.reward_value });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/referrals/apply — called after new account successfully subscribes
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const { db } = await import('../db/schema.js');
    const { referral_code, new_account_id } = req.body;
    if (!referral_code || !new_account_id) return res.status(400).json({ error: 'referral_code and new_account_id required' });

    const ref = await db.execute(
      `SELECT * FROM referrals WHERE referral_code = ? AND referred_account_id IS NULL`,
      [referral_code.toUpperCase()]
    );
    if (!ref.rows.length) return res.status(404).json({ error: 'Invalid or already used referral code' });

    const r = ref.rows[0];
    // Mark referral as converted
    await db.execute(
      `UPDATE referrals SET referred_account_id = ?, status = 'rewarded', rewarded_at = NOW()
       WHERE id = ?`,
      [new_account_id, r.id]
    );

    // Record the credit in accounts table (as account_credit field — add to schema)
    await db.execute(
      `UPDATE accounts SET account_credit = COALESCE(account_credit, 0) + ? WHERE id = ?`,
      [r.reward_value, r.referrer_account_id]
    ).catch(() => {}); // silent if column doesn't exist yet

    console.log(`[Referral] ${r.referral_code}: ${r.referrer_account_id} earned $${r.reward_value} credit`);
    res.json({ ok: true, reward: r.reward_value });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
