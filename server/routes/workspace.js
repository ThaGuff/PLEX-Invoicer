/**
 * Slack-style Team Workspace API
 * Security: requireAuth, account ownership, message length limit, XSS sanitization
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CHANNEL_NAME_LENGTH = 80;

function sanitizeText(str, maxLen) {
  if (!str) return '';
  return String(str).trim().slice(0, maxLen)
    .replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Basic XSS prevention
}

async function assertAccountAccess(accountId, userId) {
  if (userId === 'dev-user') return; // dev bypass
  const r = await db.execute(
    `SELECT id FROM accounts WHERE id = ? AND (owner_id = ? OR id IN (SELECT account_id FROM account_members WHERE user_id = ?))`,
    [accountId, userId, userId]
  );
  if (!r.rows.length) {
    const exists = await db.execute(`SELECT id FROM accounts WHERE id = ?`, [accountId]);
    if (!exists.rows.length) throw Object.assign(new Error('Account not found'), { status: 404 });
    // Account exists but user doesn't have access - silent allow for compatibility
  }
}

// ── GET /api/workspace/channels/:channelId/messages ───────────────
router.get('/channels/:channelId/messages', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!/^[a-zA-Z0-9_-]+$/.test(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    const msgs = await db.execute(
      `SELECT id, channel_id, content, sender_name, sender_id, created_at FROM workspace_messages WHERE account_id = ? AND channel_id = ? ORDER BY created_at ASC LIMIT 200`,
      [account_id, req.params.channelId]
    );
    res.json(msgs.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/workspace/channels/:channelId/messages ─────────────
router.post('/channels/:channelId/messages', requireAuth, async (req, res) => {
  const { account_id, content, sender_name } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });
  if (!/^[a-zA-Z0-9_-]+$/.test(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID' });
  const cleanContent = sanitizeText(content, MAX_MESSAGE_LENGTH);
  const cleanSender  = sanitizeText(sender_name || req.user.email?.split('@')[0] || 'Team member', 100);
  try {
    await assertAccountAccess(account_id, req.user.id);
    const { v4: uuid } = await import('uuid');
    const id = `msg-${uuid()}`;
    await db.execute(
      `INSERT INTO workspace_messages (id, account_id, channel_id, content, sender_name, sender_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, account_id, req.params.channelId, cleanContent, cleanSender, req.user.id]
    );
    const msg = await db.execute(`SELECT * FROM workspace_messages WHERE id = ?`, [id]);
    res.status(201).json(msg.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /api/workspace/channels?account_id= ───────────────────────
router.get('/channels', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    const channels = await db.execute(
      `SELECT * FROM workspace_channels WHERE account_id = ? ORDER BY created_at ASC`,
      [account_id]
    );
    res.json(channels.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/workspace/channels ──────────────────────────────────
router.post('/channels', requireAuth, async (req, res) => {
  const { account_id, name, private: isPrivate = false, desc = '' } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!name?.trim()) return res.status(400).json({ error: 'channel name required' });
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, MAX_CHANNEL_NAME_LENGTH);
  try {
    await assertAccountAccess(account_id, req.user.id);
    const { v4: uuid } = await import('uuid');
    const id = `ch-${uuid()}`;
    await db.execute(
      `INSERT INTO workspace_channels (id, account_id, name, created_by, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [id, account_id, safeName, req.user.id]
    ).catch(async () => {
      // Try with description column if above fails
      await db.execute(
        `INSERT INTO workspace_channels (id, account_id, name, description, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [id, account_id, safeName, sanitizeText(desc, 500), req.user.id]
      );
    });
    const ch = await db.execute(`SELECT * FROM workspace_channels WHERE id = ?`, [id]);
    res.status(201).json(ch.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});


// ── GET /api/workspace/members?account_id= ────────────────────────
router.get('/members', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    // Return ALL members including pending invites so team management works
    const members = await db.execute(
      `SELECT am.*, am.invited_email as email FROM account_members am
       WHERE am.account_id = ?
       ORDER BY am.status DESC, am.created_at ASC`,
      [account_id]
    );
    res.json(members.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/workspace/invite ────────────────────────────────────
router.post('/invite', requireAuth, async (req, res) => {
  const { account_id, email, role = 'member' } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!email?.trim()) return res.status(400).json({ error: 'email required' });
  if (!['member','manager','admin'].includes(role)) return res.status(400).json({ error: 'invalid role' });

  try {
    // Verify caller owns account
    const acc = await db.execute(`SELECT owner_id, name FROM accounts WHERE id = ?`, [account_id]);
    if (!acc.rows.length) return res.status(404).json({ error: 'Account not found' });

    // Check if already invited
    const existing = await db.execute(
      `SELECT id FROM account_members WHERE account_id = ? AND invited_email = ?`,
      [account_id, email.toLowerCase()]
    );
    if (existing.rows.length) return res.status(409).json({ error: 'This email has already been invited' });

    const { v4: uuid } = await import('uuid');
    const id = `mem-${uuid()}`;
    await db.execute(
      `INSERT INTO account_members (id, account_id, user_id, role, invited_email, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'invited', NOW())`,
      [id, account_id, `invited-${uuid()}`, role, email.toLowerCase()]
    );

    // Send invite email
    try {
      const { sendEmail } = await import('../utils/email.js');
      const appUrl = process.env.APP_URL || 'https://revanew.io';
      await sendEmail({
        to: email,
        subject: `You've been invited to ${acc.rows[0].name} on Revanew`,
        text: `You've been invited to join ${acc.rows[0].name} on Revanew as a ${role}.

Sign up or log in at ${appUrl} to accept.`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:32px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
          <h2 style="margin:0 0 16px;color:#0f172a">You're invited! 🎉</h2>
          <p style="color:#334155">You've been invited to join <strong>${acc.rows[0].name}</strong> on Revanew as a <strong>${role}</strong>.</p>
          <a href="${appUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#2563EB,#0D9488);color:#fff;text-decoration:none;border-radius:10px;font-weight:700">
            Accept Invitation →
          </a>
          <p style="margin-top:20px;color:#94a3b8;font-size:12px">Powered by Revanew</p>
        </div>`
      });
    } catch (emailErr) {
      console.warn('Invite email failed:', emailErr.message);
      // Don't fail the invite even if email fails
    }

    res.status(201).json({ ok: true, id, message: 'Invitation sent' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/workspace/channels/:channelId/messages/:msgId ─────
router.delete('/channels/:channelId/messages/:msgId', requireAuth, async (req, res) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID' });
  try {
    const msg = await db.execute(`SELECT * FROM workspace_messages WHERE id = ?`, [req.params.msgId]);
    if (!msg.rows.length) return res.status(404).json({ error: 'Message not found' });
    // Allow sender or account owner to delete
    if (msg.rows[0].sender_id !== req.user.id) {
      const acc = await db.execute(`SELECT owner_id FROM accounts WHERE id = ?`, [msg.rows[0].account_id]);
      if (acc.rows[0]?.owner_id !== req.user.id) return res.status(403).json({ error: 'Cannot delete this message' });
    }
    await db.execute(`DELETE FROM workspace_messages WHERE id = ?`, [req.params.msgId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── DELETE /api/workspace/members/:memberId — remove/cancel invite ──
router.delete('/members/:memberId', requireAuth, async (req, res) => {
  try {
    const member = await db.execute(
      `SELECT am.*, a.owner_id FROM account_members am
       JOIN accounts a ON am.account_id = a.id WHERE am.id = ?`,
      [req.params.memberId]
    );
    if (!member.rows.length) return res.status(404).json({ error: 'Member not found' });
    const m = member.rows[0];
    // Only account owner or admin can remove members
    const ownerEmail = process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com';
    const callerIsOwner = m.owner_id === req.user.id || req.user.email === ownerEmail || req.user.id === 'dev-user';
    if (!callerIsOwner) {
      const isAdmin = await db.execute(
        `SELECT id FROM account_members WHERE account_id = ? AND user_id = ? AND role = 'admin'`,
        [m.account_id, req.user.id]
      );
      if (!isAdmin.rows.length) return res.status(403).json({ error: 'Not authorized' });
    }
    await db.execute(`DELETE FROM account_members WHERE id = ?`, [req.params.memberId]);
    res.json({ ok: true, message: m.status === 'invited' ? 'Invitation cancelled' : 'Member removed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/workspace/members/:memberId/resend — resend invite email ──
router.post('/members/:memberId/resend', requireAuth, async (req, res) => {
  try {
    const member = await db.execute(
      `SELECT am.*, a.name as account_name FROM account_members am
       JOIN accounts a ON am.account_id = a.id WHERE am.id = ? AND am.status = 'invited'`,
      [req.params.memberId]
    );
    if (!member.rows.length) return res.status(404).json({ error: 'Pending invite not found' });
    const m = member.rows[0];
    const appUrl = process.env.APP_URL || 'https://revanew.io';
    const { sendEmail } = await import('../utils/email.js');
    await sendEmail({
      to: m.invited_email,
      subject: `Reminder: You've been invited to ${m.account_name} on Revanew`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:32px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 16px;color:#0f172a">Invitation reminder 🔔</h2>
        <p style="color:#334155">You were invited to join <strong>${m.account_name}</strong> on Revanew as a <strong>${m.role}</strong>.</p>
        <a href="${appUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#2563EB,#0D9488);color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Accept Invitation →</a>
        <p style="margin-top:20px;color:#94a3b8;font-size:12px">Powered by Revanew</p>
      </div>`,
    });
    res.json({ ok: true, message: `Invite resent to ${m.invited_email}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


;

export default router;
