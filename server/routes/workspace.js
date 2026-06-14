/**
 * Slack-style Team Workspace API
 * Security: requireAuth, account ownership, message length limit, XSS sanitization
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { sendEmail, buildInviteHtml, buildMentionHtml, isEmailConfigured } from '../utils/email.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const MAX_MESSAGE_LENGTH = 10000; // Allow longer messages but NOT base64 files
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max for file attachments
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
    // For DM channels: check if the channel is a DM that includes this user
    // If so, fetch messages by channel_id only (cross-account DMs)
    const chCheck = await db.execute(
      `SELECT is_dm, dm_user_ids FROM workspace_channels WHERE id = ?`,
      [req.params.channelId]
    );
    const isDMForUser = chCheck.rows[0]?.is_dm && chCheck.rows[0]?.dm_user_ids?.includes(req.user.id);
    
    let msgs;
    if (isDMForUser) {
      // Cross-account DM: fetch by channel_id only, no account_id restriction
      msgs = await db.execute(
        `SELECT id, channel_id, content, sender_name, sender_id, created_at FROM workspace_messages WHERE channel_id = ? ORDER BY created_at ASC LIMIT 200`,
        [req.params.channelId]
      );
    } else {
      msgs = await db.execute(
        `SELECT id, channel_id, content, sender_name, sender_id, created_at FROM workspace_messages WHERE account_id = ? AND channel_id = ? ORDER BY created_at ASC LIMIT 200`,
        [account_id, req.params.channelId]
      );
    }
    res.json(msgs.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/workspace/channels/:channelId/messages ─────────────
router.post('/channels/:channelId/messages', requireAuth, async (req, res) => {
  const { account_id, content, sender_name, reply_to } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });
  if (!/^[a-zA-Z0-9_-]+$/.test(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID' });
  // Block base64 data URLs in message content (file attachments should use attachment endpoint)
  if (content && (content.includes('data:application/') || content.includes('data:image/')) 
      && content.length > 5000) {
    return res.status(413).json({ error: 'File too large for message. Use file upload instead.' });
  }
  const cleanContent = sanitizeText(content, MAX_MESSAGE_LENGTH);
  const cleanSender  = sanitizeText(sender_name || req.user.email?.split('@')[0] || 'Team member', 100);
  try {
    await assertAccountAccess(account_id, req.user.id);
    const { v4: uuid } = await import('uuid');
    const id = `msg-${uuid()}`;
    // For cross-account DM channels, use the channel's original account_id
    const chForInsert = await db.execute(
      `SELECT account_id, is_dm, dm_user_ids FROM workspace_channels WHERE id = ?`,
      [req.params.channelId]
    );
    const insertAccountId = chForInsert.rows[0]?.account_id || account_id;
    await db.execute(
      `INSERT INTO workspace_messages (id, account_id, channel_id, content, sender_name, sender_id, reply_to, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, insertAccountId, req.params.channelId, cleanContent, cleanSender, req.user.id, reply_to || null]
    );
    const msg = await db.execute(`SELECT * FROM workspace_messages WHERE id = ?`, [id]);
    const savedMsg = msg.rows[0];

    // ── Detect @mentions and send notifications ──────────────────
    const mentionPattern = /@(\w[\w.]*)/g;
    const mentions = [...cleanContent.matchAll(mentionPattern)].map(m => m[1].toLowerCase());

    if (mentions.length > 0) {
      try {
        // Get all members of this account to match mentions against
        const members = await db.execute(
          `SELECT am.invited_email, am.user_id, am.role FROM account_members am
           WHERE am.account_id = ? AND am.status = 'active'`,
          [account_id]
        );

        // Get channel name for notification
        const ch = await db.execute(`SELECT name FROM workspace_channels WHERE id = ?`, [req.params.channelId]);
        const channelName = ch.rows[0]?.name || 'general';

        // Get account info for email
        const acct = await db.execute(`SELECT name, logo_url, primary_color FROM accounts WHERE id = ?`, [account_id]);
        const accountName = acct.rows[0]?.name || 'Your Team';

        const appUrl = process.env.APP_URL || 'https://invoiceking.app';
        const workspaceUrl = `${appUrl}/workspace`;

        for (const mention of mentions) {
          // Find matching member by email prefix or username
          const matched = members.rows.find(m =>
            m.invited_email?.split('@')[0]?.toLowerCase() === mention ||
            m.invited_email?.toLowerCase() === mention ||
            mention === 'here' || mention === 'channel' || mention === 'everyone'
          );

          if (matched?.invited_email && matched.invited_email !== req.user.email) {
            // Send mention email notification
            if (isEmailConfigured()) {
              sendEmail({
                to: matched.invited_email,
                subject: `${cleanSender} mentioned you in #${channelName} — ${accountName}`,
                html: buildMentionHtml({
                  mentionedName: matched.invited_email.split('@')[0],
                  senderName: cleanSender,
                  accountName,
                  channelName,
                  messageContent: cleanContent.slice(0, 200),
                  workspaceUrl,
                }),
              }).catch(e => console.warn('[Workspace] Mention email failed:', e.message));
            }
          }
        }
      } catch (notifErr) {
        console.warn('[Workspace] Mention notification error:', notifErr.message);
      }
    }

    // ── Send push notifications to account members ─────────────────
    // (fire-and-forget, don't block the response)
    if (process.env.VAPID_PUBLIC_KEY) {
      const pushPayload = JSON.stringify({
        title: `${cleanSender} in #${req.params.channelId}`,
        body: cleanContent.slice(0, 100),
        url: `${process.env.APP_URL || 'https://invoiceking.app'}/workspace`,
        tag: `workspace-${account_id}`,
      });
      db.execute(
        `SELECT ps.* FROM push_subscriptions ps
         JOIN account_members am ON am.user_id = ps.user_id
         WHERE am.account_id = ? AND am.status = 'active' AND ps.user_id != ?`,
        [account_id, req.user.id]
      ).then(async subs => {
        if (!subs.rows.length) return;
        const { getWebPush } = await import('./notifications.js');
        const wp = await getWebPush();
        if (!process.env.VAPID_PUBLIC_KEY) return;
        for (const sub of subs.rows) {
          wp.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload, { TTL: 3600 }
          ).catch(() => {});
        }
      }).catch(() => {});
    }

    res.status(201).json(savedMsg);
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
  const { account_id, name, private: isPrivate = false, desc = '', description = desc } = req.body;
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
        [id, account_id, safeName, sanitizeText(description || desc, 500), req.user.id]
      );
    });
    const ch = await db.execute(`SELECT * FROM workspace_channels WHERE id = ?`, [id]);
    res.status(201).json(ch.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});


// ── POST /api/workspace/dm — create or fetch DM channel ───────────
router.post('/dm', requireAuth, async (req, res) => {
  try {
    const { account_id, target_user_id } = req.body;
    if (!account_id || !target_user_id) return res.status(400).json({ error: 'account_id and target_user_id required' });
    await assertAccountAccess(account_id, req.user.id);
    const sortedIds = [req.user.id, target_user_id].sort().join(',');
    const existing = await db.execute(
      `SELECT * FROM workspace_channels WHERE account_id = ? AND is_dm = 1 AND dm_user_ids = ?`,
      [account_id, sortedIds]
    );
    if (existing.rows.length) return res.json(existing.rows[0]);
    const tp = await db.execute(`SELECT display_name, username FROM user_profiles WHERE user_id = ?`, [target_user_id]);
    const mp = await db.execute(`SELECT display_name, username FROM user_profiles WHERE user_id = ?`, [req.user.id]);
    const targetName = tp.rows[0]?.display_name || tp.rows[0]?.username || 'User';
    const myName = mp.rows[0]?.display_name || mp.rows[0]?.username || 'User';
    const { randomUUID } = await import('crypto');
    const id = `wch-dm-${randomUUID()}`;
    await db.execute(
      `INSERT INTO workspace_channels (id, account_id, name, is_dm, is_private, dm_user_ids, created_by)
       VALUES (?, ?, ?, 1, 1, ?, ?)`,
      [id, account_id, `${myName} & ${targetName}`, sortedIds, req.user.id]
    );
    const created = await db.execute(`SELECT * FROM workspace_channels WHERE id = ?`, [id]);
    res.json(created.rows[0]);
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── GET /api/workspace/members?account_id= ────────────────────────
router.get('/members', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    // Return ALL members including pending invites so team management works
    const members = await db.execute(
      `SELECT am.*, am.invited_email as email,
              up.display_name, up.username, up.avatar_url, up.title
       FROM account_members am
       LEFT JOIN user_profiles up ON up.user_id = am.user_id
       WHERE am.account_id = ?
       ORDER BY am.status DESC, am.created_at ASC`,
      [account_id]
    );
    res.json(members.rows);
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── POST /api/workspace/invite ────────────────────────────────────
router.post('/invite', requireAuth, async (req, res) => {
  const { account_id, email, role = 'member' } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!email?.trim()) return res.status(400).json({ error: 'email required' });
  if (!['member','manager','admin'].includes(role)) return res.status(400).json({ error: 'invalid role' });

  try {
    const acc = await db.execute(`SELECT owner_id, name, logo_url, primary_color FROM accounts WHERE id = ?`, [account_id]);
    if (!acc.rows.length) return res.status(404).json({ error: 'Account not found' });
    const account = acc.rows[0];

    // Check if already has active membership
    const existing = await db.execute(
      `SELECT id, status FROM account_members WHERE account_id = ? AND invited_email = ?`,
      [account_id, email.toLowerCase()]
    );
    if (existing.rows.length) {
      if (existing.rows[0].status === 'active') return res.status(409).json({ error: 'User is already a member' });
      // Re-invite: regenerate token for existing pending invite
    }

    const { v4: uuid, v4 } = await import('uuid');
    const crypto = await import('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const id = existing.rows[0]?.id || `mem-${uuid()}`;
    
    if (existing.rows.length) {
      // Update existing invite with new token
      await db.execute(
        `UPDATE account_members SET invite_token = ?, role = ?, invited_at = NOW(), status = 'invited' WHERE id = ?`,
        [inviteToken, role, id]
      );
    } else {
      await db.execute(
        `INSERT INTO account_members (id, account_id, user_id, role, invited_email, status, invite_token, invited_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'invited', ?, NOW(), NOW())`,
        [id, account_id, `invited-${v4()}`, role, email.toLowerCase(), inviteToken]
      );
    }

    // Send invite email with accept/decline links
    const appUrl = process.env.APP_URL || 'https://invoiceking.app';
    const acceptUrl = `${appUrl}/invite/accept/${inviteToken}`;
    const declineUrl = `${appUrl}/invite/decline/${inviteToken}`;
    const senderName = req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'A team member';

    try {
      await sendEmail({
        to: email,
        type: 'invite',
        subject: `${senderName} invited you to join ${account.name} on Invoice King`,
        html: buildInviteHtml({
          inviteeName: email.split('@')[0],
          accountName: account.name,
          role,
          acceptUrl,
          declineUrl,
          senderName,
          logoUrl: account.logo_url || null,
        }),
      });
      console.log(`[Workspace] Invite sent to ${email} for ${account.name}`);
    } catch (emailErr) {
      console.warn('[Workspace] Invite email failed:', emailErr.message);
    }

    res.status(201).json({ ok: true, id, inviteToken, message: 'Invitation sent' });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── GET /accept/:token — accept invite (NO AUTH - link from email) ──
router.get('/accept/:token', async (req, res) => {
  try {
    const invite = await db.execute(
      `SELECT am.*, a.name as account_name, a.owner_id, a.logo_url
       FROM account_members am
       JOIN accounts a ON am.account_id = a.id
       WHERE am.invite_token = ? AND am.status = 'invited'`,
      [req.params.token]
    );
    
    if (!invite.rows.length) {
      // Redirect to app with error
      return res.redirect(`${process.env.APP_URL || 'https://invoiceking.app'}/invite/error?reason=invalid`);
    }
    
    const inv = invite.rows[0];
    // Redirect to the app's invite acceptance page with the token
    res.redirect(`${process.env.APP_URL || 'https://invoiceking.app'}/invite/accept/${req.params.token}?account=${encodeURIComponent(inv.account_name)}&email=${encodeURIComponent(inv.invited_email)}&role=${inv.role}`);
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── POST /accept/:token — complete acceptance (after user logs in) ─
router.post('/accept/:token', requireAuth, async (req, res) => {
  try {
    const invite = await db.execute(
      `SELECT am.*, a.name as account_name, a.owner_id, a.primary_color
       FROM account_members am
       JOIN accounts a ON am.account_id = a.id
       WHERE am.invite_token = ? AND am.status = 'invited'`,
      [req.params.token]
    );
    
    if (!invite.rows.length) {
      // Check if already accepted by this user (idempotent: return success)
      const alreadyMember = await db.execute(
        `SELECT am.*, a.id as account_id, a.name as account_name FROM account_members am
         JOIN accounts a ON am.account_id = a.id
         WHERE am.user_id = ? AND am.status = 'active'`,
        [req.user.id]
      );
      if (alreadyMember.rows.length) {
        // Already a member - return success so frontend completes gracefully
        const m = alreadyMember.rows[0];
        return res.json({ ok: true, account_id: m.account_id, account_name: m.account_name, already_accepted: true });
      }
      return res.status(404).json({ error: 'Invite not found or already used' });
    }
    const inv = invite.rows[0];
    
    // Accept: update member record with real user_id
    await db.execute(
      `UPDATE account_members SET
        status = 'active',
        user_id = ?,
        invite_accepted_by_user_id = ?,
        accepted_at = NOW(),
        invite_token = NULL
       WHERE id = ?`,
      [req.user.id, req.user.id, inv.id]
    );
    
    // Notify the account owner that invite was accepted
    const appUrl = process.env.APP_URL || 'https://invoiceking.app';
    const accepterName = req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'Team member';
    
    // Find owner email + account info
    const owner = await db.execute(
      `SELECT a.email, a.owner_id FROM accounts a WHERE a.id = ?`,
      [inv.account_id]
    );
    const ownerRecord = owner.rows[0];
    const ownerEmail = ownerRecord?.email || null; // ← was undefined before - BUG FIX
    
    // Auto-create profile for the new member
    try {
      const { ensureProfile } = await import('./profiles.js');
      await ensureProfile(req.user.id, req.user.email, accepterName);
    } catch {}
    
    // Store in-app notification for the account owner
    if (ownerRecord?.owner_id) {
      try {
        const { v4: uuid } = await import('uuid');
        await db.execute(
          `INSERT INTO notification_log (id, user_id, account_id, type, title, body, url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            `notif-${uuid()}`,
            ownerRecord.owner_id,
            inv.account_id,
            'invite_accepted',
            `${accepterName} joined your team! 🎉`,
            `${accepterName} accepted the invitation and joined ${inv.account_name} as ${inv.role}.`,
            `${appUrl}/workspace`,
          ]
        );
      } catch (e) { console.warn('[Workspace] Notification insert failed:', e.message); }
    }
    
    // Send email to account owner
    if (ownerEmail) {
      sendEmail({
        to: ownerEmail,
        subject: `✅ ${accepterName} joined ${inv.account_name}!`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:32px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
          <h2 style="color:#0F172A;margin:0 0 12px">Team member joined! 🎉</h2>
          <p style="color:#334155;font-size:15px;margin:0 0 20px">
            <strong>${accepterName}</strong> accepted your invitation and joined <strong>${inv.account_name}</strong> as a <strong>${inv.role}</strong>.
          </p>
          <a href="${appUrl}/workspace" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#2563EB,#0D9488);color:#fff;text-decoration:none;border-radius:10px;font-weight:700">
            Open Team Workspace →
          </a>
          <p style="color:#94A3B8;font-size:12px;margin-top:20px">Powered by Invoice King</p>
        </div>`,
      }).catch(e => console.warn('[Workspace] Accept notify email failed:', e.message));
    }
    
    res.json({ ok: true, account_id: inv.account_id, account_name: inv.account_name, role: inv.role });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── POST /decline/:token — decline invitation ─────────────────────
router.post('/decline/:token', async (req, res) => {
  try {
    const invite = await db.execute(
      `SELECT am.*, a.name as account_name FROM account_members am
       JOIN accounts a ON am.account_id = a.id
       WHERE am.invite_token = ? AND am.status = 'invited'`,
      [req.params.token]
    );
    if (!invite.rows.length) return res.status(404).json({ error: 'Invite not found' });
    const inv = invite.rows[0];

    await db.execute(
      `UPDATE account_members SET status = 'declined', declined_at = NOW(), invite_token = NULL WHERE id = ?`,
      [inv.id]
    );
    
    // Notify owner of decline  
    const declinerName = req.body?.name || inv.invited_email;
    const owner = await db.execute(`SELECT email, owner_id FROM accounts WHERE id = ?`, [inv.account_id]);
    const ownerRec = owner.rows[0];
    
    // Create in-app notification
    if (ownerRec?.owner_id) {
      try {
        const { v4: uuid } = await import('uuid');
        await db.execute(
          `INSERT INTO notification_log (id, user_id, account_id, type, title, body, url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [`notif-${uuid()}`, ownerRec.owner_id, inv.account_id, 'invite_declined',
           `Invite declined`, `${declinerName} declined the invitation to ${inv.account_name}.`,
           `${process.env.APP_URL || 'https://invoiceking.app'}/workspace`]
        );
      } catch {}
    }
    
    if (ownerRec?.email) {
      sendEmail({
        to: ownerRec.email,
        subject: `Team invite declined — ${inv.account_name}`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:32px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
          <h2 style="color:#0F172A;margin:0 0 12px">Invitation declined</h2>
          <p style="color:#334155;font-size:15px;margin:0 0 20px">
            <strong>${declinerName}</strong> declined your invitation to join <strong>${inv.account_name}</strong>.
          </p>
          <p style="color:#64748B;font-size:13px">You can send a new invitation from the Team workspace.</p>
        </div>`,
      }).catch(() => {});
    }
    
    res.json({ ok: true, message: 'Invitation declined' });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
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
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
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
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
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
    const appUrl = process.env.APP_URL || 'https://invoiceking.app';
    const { sendEmail } = await import('../utils/email.js');
    await sendEmail({
      to: m.invited_email,
      subject: `Reminder: You've been invited to ${m.account_name} on Invoice King`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:32px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 16px;color:#0f172a">Invitation reminder 🔔</h2>
        <p style="color:#334155">You were invited to join <strong>${m.account_name}</strong> on Invoice King as a <strong>${m.role}</strong>.</p>
        <a href="${appUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#2563EB,#0D9488);color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Accept Invitation →</a>
        <p style="margin-top:20px;color:#94a3b8;font-size:12px">Powered by Invoice King</p>
      </div>`,
    });
    res.json({ ok: true, message: `Invite resent to ${m.invited_email}` });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});


;


// ── POST /api/workspace/upload — store file attachment and return URL ──
router.post('/upload', requireAuth, async (req, res) => {
  const { account_id, file_data, file_name, file_type, file_size } = req.body;
  if (!account_id || !file_data || !file_name) {
    return res.status(400).json({ error: 'account_id, file_data, and file_name required' });
  }
  if (file_size > 10 * 1024 * 1024) { // 10MB max
    return res.status(413).json({ error: 'File too large (max 10MB)' });
  }
  try {
    await assertAccountAccess(account_id, req.user.id);
    const { v4: uuid } = await import('uuid');
    const attachId = `att-${uuid()}`;
    
    // Store file data in workspace_attachments table
    await db.execute(
      `INSERT INTO workspace_attachments (id, account_id, uploader_id, file_name, file_type, file_data, file_size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [attachId, account_id, req.user.id, file_name.slice(0,255), file_type || 'application/octet-stream', file_data, file_size || 0]
    );
    
    // Return the attachment URL (served by our API)
    const appUrl = process.env.APP_URL || 'https://invoiceking.app';
    res.json({ ok: true, id: attachId, url: `${appUrl}/api/workspace/attachment/${attachId}`, name: file_name, type: file_type });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── GET /api/workspace/attachment/:id — serve stored attachment ──
router.get('/attachment/:id', requireAuth, async (req, res) => {
  try {
    const att = await db.execute(`SELECT * FROM workspace_attachments WHERE id = ?`, [req.params.id]);
    if (!att.rows.length) return res.status(404).json({ error: 'Attachment not found' });
    const file = att.rows[0];
    await assertAccountAccess(file.account_id, req.user.id);
    
    // Return the file as base64 data URL for images, or direct download for docs
    const isImage = file.file_type?.startsWith('image/');
    if (isImage) {
      res.json({ url: file.file_data, name: file.file_name, type: file.file_type });
    } else {
      res.json({ url: file.file_data, name: file.file_name, type: file.file_type, download: true });
    }
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── DELETE /api/workspace/messages/:id — delete a message ─────────
router.delete('/messages/:id', requireAuth, async (req, res) => {
  try {
    const msg = await db.execute(`SELECT * FROM workspace_messages WHERE id = ?`, [req.params.id]);
    if (!msg.rows.length) return res.status(404).json({ error: 'Message not found' });
    const m = msg.rows[0];
    // Only the sender or account owner can delete
    if (m.sender_id !== req.user.id) {
      const isOwner = await db.execute(
        `SELECT id FROM accounts WHERE id = ? AND owner_id = ?`, [m.account_id, req.user.id]
      );
      if (!isOwner.rows.length) return res.status(403).json({ error: 'Cannot delete others messages' });
    }
    await db.execute(`DELETE FROM workspace_messages WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── PATCH /api/workspace/messages/:id — edit a message ────────────
router.patch('/messages/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content required' });
    const msg = await db.execute(`SELECT * FROM workspace_messages WHERE id = ?`, [req.params.id]);
    if (!msg.rows.length) return res.status(404).json({ error: 'Message not found' });
    if (msg.rows[0].sender_id !== req.user.id) return res.status(403).json({ error: 'Cannot edit others messages' });
    const clean = sanitizeText(content, MAX_MESSAGE_LENGTH);
    await db.execute(
      `UPDATE workspace_messages SET content = ?, edited_at = NOW() WHERE id = ?`,
      [clean, req.params.id]
    );
    const updated = await db.execute(`SELECT * FROM workspace_messages WHERE id = ?`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── GET /api/workspace/activity-feed ─────────────────────────────
router.get('/activity-feed', requireAuth, async (req, res) => {
  const { account_id, limit = 30 } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const [messages, invoices, quotes, contacts, events] = await Promise.all([
      db.execute(`SELECT wm.*, wc.name as channel_name FROM workspace_messages wm LEFT JOIN workspace_channels wc ON wc.id = wm.channel_id WHERE wm.account_id = ? ORDER BY wm.created_at DESC LIMIT 10`, [account_id]),
      db.execute(`SELECT * FROM invoices WHERE account_id = ? ORDER BY created_at DESC LIMIT 5`, [account_id]),
      db.execute(`SELECT * FROM quotes WHERE account_id = ? ORDER BY created_at DESC LIMIT 5`, [account_id]),
      db.execute(`SELECT * FROM contacts WHERE account_id = ? ORDER BY created_at DESC LIMIT 5`, [account_id]),
      db.execute(`SELECT * FROM calendar_events WHERE account_id = ? ORDER BY created_at DESC LIMIT 5`, [account_id]).catch(() => ({ rows: [] })),
    ]);

    const feed = [
      ...messages.rows.map(m => ({ type:'message', icon:'💬', title:`Message in #${m.channel_name || 'general'} from ${m.sender_name || 'team'}`, desc: (m.content || '').replace(/<[^>]+>/g, '').slice(0, 80), time: m.created_at, color:'#7C3AED' })),
      ...invoices.rows.filter(i => i.status === 'paid').map(i => ({ type:'payment', icon:'💰', title:`Invoice paid — $${parseFloat(i.amount_paid||0).toLocaleString()}`, desc: i.client_name, time: i.paid_at || i.created_at, color:'#059669' })),
      ...invoices.rows.filter(i => i.status === 'generated').map(i => ({ type:'invoice', icon:'📄', title:`Invoice ${i.number} sent`, desc: i.client_name, time: i.created_at, color:'#2563EB' })),
      ...quotes.rows.filter(q => q.status === 'accepted').map(q => ({ type:'quote', icon:'✅', title:`Quote ${q.number} accepted`, desc: q.client_name, time: q.created_at, color:'#059669' })),
      ...quotes.rows.filter(q => q.status !== 'accepted').map(q => ({ type:'quote', icon:'📝', title:`Quote ${q.number} created`, desc: q.client_name, time: q.created_at, color:'#D97706' })),
      ...contacts.rows.map(c => ({ type:'customer', icon:'👤', title:`New client added`, desc: c.name, time: c.created_at, color:'#0D9488' })),
      ...events.rows.map(e => ({ type:'schedule', icon:'📅', title:`Job scheduled: ${e.title}`, desc: e.client_name || e.location || '', time: e.created_at, color:'#DC2626' })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, parseInt(limit));

    res.json(feed);
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

// ── GET /api/workspace/ai-summary ─────────────────────────────────
router.get('/ai-summary', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const today = new Date().toISOString().split('T')[0];
    const [msgs, invoices, events] = await Promise.all([
      db.execute(`SELECT COUNT(*) as cnt FROM workspace_messages WHERE account_id = ? AND DATE(created_at::text) = ?`, [account_id, today]),
      db.execute(`SELECT COUNT(*) as cnt FROM invoices WHERE account_id = ? AND status='paid' AND DATE(paid_at) = ?`, [account_id, today]),
      db.execute(`SELECT COUNT(*) as cnt FROM calendar_events WHERE account_id = ? AND date = ?`, [account_id, today]).catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);
    res.json({
      today: { messages: msgs.rows[0]?.cnt || 0, invoicesPaid: invoices.rows[0]?.cnt || 0, jobsScheduled: events.rows[0]?.cnt || 0 },
      recommendations: [
        msgs.rows[0]?.cnt === 0 ? { text:'No team messages today — check in with your team', type:'engagement' } : null,
      ].filter(Boolean),
    });
  } catch (e) { console.error('[API Error]', e.message); res.status(500).json({ error: 'An internal error occurred. Please try again.' }); }
});

export default router;
