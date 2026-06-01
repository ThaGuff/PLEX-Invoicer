/**
 * Unified Email System for Revanew
 * ─────────────────────────────────────────────────────────────────
 * Priority:
 *   1. Resend API (recommended — set RESEND_API_KEY + RESEND_FROM)
 *   2. SMTP fallback (set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM)
 *
 * IMPORTANT FOR RESEND:
 *   - Verify revanew.io at https://resend.com/domains
 *   - Set RESEND_FROM=invoices@revanew.io in Railway Variables
 *   - Until verified, only delivers to the account owner's email
 */

export async function sendEmail({ to, subject, html, text, from, replyTo } = {}) {
  if (!to || !subject) throw new Error('to and subject are required');

  const toList = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!toList.length) throw new Error('No valid recipients');

  const resendKey  = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const smtpFrom   = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromAddr   = from || (resendKey ? resendFrom : smtpFrom) || 'onboarding@resend.dev';

  console.log(`[Email] → ${toList.join(', ')} | "${subject}" | via ${resendKey ? 'Resend' : 'SMTP'}`);

  // ── Resend (primary) ──────────────────────────────────────────
  if (resendKey) {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);

    const payload = {
      from: fromAddr,
      to: toList,
      subject,
      html: html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`,
      text: text || '',
      ...(replyTo ? { reply_to: replyTo } : {}),
    };

    const result = await resend.emails.send(payload);

    if (result.error) {
      const msg = result.error.message || JSON.stringify(result.error);
      console.error('[Email] Resend error:', msg);

      // Domain not verified warning
      if (msg.includes('testing emails') || msg.includes('verify') || msg.includes('unverified') || msg.includes('only send')) {
        console.error('[Email] FIX: Go to https://resend.com/domains and verify revanew.io');
        console.error('[Email] Then set RESEND_FROM=invoices@revanew.io in Railway Variables');
      }

      // Try SMTP fallback
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        console.log('[Email] Falling back to SMTP...');
        return sendViaSMTP({ to: toList, from: smtpFrom || fromAddr, subject, html, text, replyTo });
      }

      throw new Error(`Email failed: ${msg}`);
    }

    console.log('[Email] ✓ Sent via Resend:', result.data?.id);
    return { provider: 'resend', id: result.data?.id };
  }

  // ── SMTP (fallback) ───────────────────────────────────────────
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return sendViaSMTP({ to: toList, from: smtpFrom || fromAddr, subject, html, text, replyTo });
  }

  throw new Error('Email not configured. Add RESEND_API_KEY or SMTP_HOST+SMTP_USER to Railway Variables.');
}

async function sendViaSMTP({ to, from, subject, html, text, replyTo }) {
  const nodemailer = (await import('nodemailer')).default;
  const port = parseInt(process.env.SMTP_PORT) || 587;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  // Verify connection first
  try { await transporter.verify(); }
  catch (e) { console.warn('[Email] SMTP verify failed:', e.message); }

  const info = await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    text: text || '',
    html: html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`,
    ...(replyTo ? { replyTo } : {}),
  });

  console.log('[Email] ✓ Sent via SMTP:', info.messageId);
  return { provider: 'smtp', id: info.messageId };
}

export const isEmailConfigured = () =>
  !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER));

// ── Email Templates ───────────────────────────────────────────────

const emailBase = (content, accentColor = '#2563EB') => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.08)">
${content}
<div style="padding:24px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center">
  <p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.6">
    Powered by <a href="https://revanew.io" style="color:${accentColor};text-decoration:none;font-weight:600">Revanew</a> · 
    The billing platform for service businesses
  </p>
</div>
</div>
</body></html>`;

export function buildInvoiceHtml({ clientName, agencyName, invoiceNum, amount, dueDate, portalUrl, logoUrl, accentColor }) {
  const accent = accentColor || '#2563EB';
  return emailBase(`
  <div style="background:linear-gradient(135deg,${accent},#0D9488);padding:36px 40px">
    ${logoUrl ? `<img src="${logoUrl}" alt="${agencyName || 'Logo'}" style="height:44px;margin-bottom:16px;object-fit:contain;border-radius:8px;background:#fff;padding:6px 10px;display:block">` : ''}
    <h1 style="color:#fff;margin:0 0 6px;font-size:26px;font-weight:800;letter-spacing:-0.02em">Invoice Ready</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px">from ${agencyName || 'Revanew'} · Invoice #${invoiceNum}</p>
  </div>
  <div style="padding:36px 40px">
    <p style="color:#334155;font-size:16px;margin:0 0 8px">Hi ${clientName || 'there'},</p>
    <p style="color:#64748B;font-size:14px;margin:0 0 28px;line-height:1.6">Your invoice is ready. Review and pay securely online — no account needed.</p>
    <div style="background:#F8FAFC;border:2px solid #E2E8F0;border-radius:14px;padding:24px 28px;margin:0 0 28px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${dueDate ? '12px' : '0'}">
        <span style="color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Amount Due</span>
        <span style="color:#0F172A;font-size:28px;font-weight:900">${amount}</span>
      </div>
      ${dueDate ? `<div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #E2E8F0">
        <span style="color:#64748B;font-size:13px">Due date</span>
        <span style="color:#DC2626;font-size:14px;font-weight:700">${dueDate}</span>
      </div>` : ''}
    </div>
    <a href="${portalUrl}" style="display:block;text-align:center;padding:16px 32px;background:linear-gradient(135deg,${accent},#0D9488);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800;letter-spacing:-0.01em;box-shadow:0 6px 20px rgba(37,99,235,0.35);margin-bottom:16px">
      View &amp; Pay Invoice →
    </a>
    <p style="color:#94A3B8;font-size:12px;text-align:center;margin:0">Secure payment · No account required · Takes 60 seconds</p>
  </div>
`, accent);
}

export function buildQuoteHtml({ clientName, agencyName, quoteNum, amount, expiryDate, portalUrl, logoUrl, accentColor }) {
  const accent = accentColor || '#2563EB';
  return emailBase(`
  <div style="background:linear-gradient(135deg,${accent},#7C3AED);padding:36px 40px">
    ${logoUrl ? `<img src="${logoUrl}" alt="${agencyName || 'Logo'}" style="height:44px;margin-bottom:16px;object-fit:contain;border-radius:8px;background:#fff;padding:6px 10px;display:block">` : ''}
    <h1 style="color:#fff;margin:0 0 6px;font-size:26px;font-weight:800;letter-spacing:-0.02em">Your Quote is Ready</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px">from ${agencyName || 'Revanew'} · Quote #${quoteNum}</p>
  </div>
  <div style="padding:36px 40px">
    <p style="color:#334155;font-size:16px;margin:0 0 8px">Hi ${clientName || 'there'},</p>
    <p style="color:#64748B;font-size:14px;margin:0 0 28px;line-height:1.6">Your quote is ready for review. View details, ask questions, and e-sign from any device — no account needed.</p>
    <div style="background:#F8FAFC;border:2px solid #E2E8F0;border-radius:14px;padding:24px 28px;margin:0 0 28px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${expiryDate ? '12px' : '0'}">
        <span style="color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Total Amount</span>
        <span style="color:#0F172A;font-size:28px;font-weight:900">${amount}</span>
      </div>
      ${expiryDate ? `<div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #E2E8F0">
        <span style="color:#64748B;font-size:13px">Valid until</span>
        <span style="color:#D97706;font-size:14px;font-weight:700">${expiryDate}</span>
      </div>` : ''}
    </div>
    <a href="${portalUrl}" style="display:block;text-align:center;padding:16px 32px;background:linear-gradient(135deg,${accent},#7C3AED);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800;letter-spacing:-0.01em;box-shadow:0 6px 20px rgba(37,99,235,0.35);margin-bottom:16px">
      Review &amp; Sign Quote →
    </a>
    <p style="color:#94A3B8;font-size:12px;text-align:center;margin:0">E-sign from any device · No account required</p>
  </div>
`, accent);
}

export function buildReminderHtml({ clientName, agencyName, invoiceNum, amount, dueDate, portalUrl, logoUrl, accentColor, daysOverdue }) {
  const accent = accentColor || '#DC2626';
  const isOverdue = daysOverdue > 0;
  return emailBase(`
  <div style="background:linear-gradient(135deg,${isOverdue ? '#DC2626' : '#D97706'},${isOverdue ? '#9F1239' : '#B45309'});padding:36px 40px">
    ${logoUrl ? `<img src="${logoUrl}" alt="${agencyName || 'Logo'}" style="height:44px;margin-bottom:16px;object-fit:contain;border-radius:8px;background:#fff;padding:6px 10px;display:block">` : ''}
    <h1 style="color:#fff;margin:0 0 6px;font-size:26px;font-weight:800">${isOverdue ? '⚠️ Invoice Overdue' : '🔔 Payment Reminder'}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px">from ${agencyName || 'Revanew'} · Invoice #${invoiceNum}</p>
  </div>
  <div style="padding:36px 40px">
    <p style="color:#334155;font-size:16px;margin:0 0 8px">Hi ${clientName || 'there'},</p>
    <p style="color:#64748B;font-size:14px;margin:0 0 28px;line-height:1.6">
      ${isOverdue
        ? `Invoice #${invoiceNum} is <strong style="color:#DC2626">${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</strong>. Please pay at your earliest convenience to avoid any late fees.`
        : `Just a friendly reminder that invoice #${invoiceNum} is due ${dueDate ? `on <strong>${dueDate}</strong>` : 'soon'}.`
      }
    </p>
    <div style="background:#FEF2F2;border:2px solid #FECACA;border-radius:14px;padding:24px 28px;margin:0 0 28px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Balance Due</span>
        <span style="color:#DC2626;font-size:28px;font-weight:900">${amount}</span>
      </div>
    </div>
    <a href="${portalUrl}" style="display:block;text-align:center;padding:16px 32px;background:linear-gradient(135deg,#DC2626,#9F1239);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800;box-shadow:0 6px 20px rgba(220,38,38,0.35);margin-bottom:16px">
      Pay Invoice Now →
    </a>
    <p style="color:#94A3B8;font-size:12px;text-align:center;margin:0">Secure payment · Takes 60 seconds</p>
  </div>
`, accent);
}

export function buildInviteHtml({ inviteeName, accountName, role, acceptUrl, logoUrl }) {
  return emailBase(`
  <div style="background:linear-gradient(135deg,#2563EB,#0D9488);padding:36px 40px">
    ${logoUrl ? `<img src="${logoUrl}" alt="${accountName || 'Logo'}" style="height:44px;margin-bottom:16px;object-fit:contain;border-radius:8px;background:#fff;padding:6px 10px;display:block">` : ''}
    <h1 style="color:#fff;margin:0 0 6px;font-size:26px;font-weight:800">You're Invited! 🎉</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px">Join ${accountName} on Revanew</p>
  </div>
  <div style="padding:36px 40px">
    <p style="color:#334155;font-size:16px;margin:0 0 16px">Hi${inviteeName ? ` ${inviteeName}` : ''},</p>
    <p style="color:#64748B;font-size:14px;margin:0 0 28px;line-height:1.6">
      You've been invited to join <strong style="color:#0F172A">${accountName}</strong> on Revanew as a <strong style="color:#0F172A">${role || 'team member'}</strong>.
    </p>
    <div style="background:#F0FDF4;border:2px solid #BBF7D0;border-radius:14px;padding:20px 24px;margin:0 0 28px">
      <p style="color:#15803D;font-size:13px;margin:0;font-weight:600">✅ What you get access to:</p>
      <ul style="color:#166534;font-size:13px;margin:8px 0 0;padding-left:20px;line-height:1.8">
        <li>Team workspace & messaging</li>
        <li>Quotes, invoices & client management</li>
        <li>Calendar & job scheduling</li>
      </ul>
    </div>
    <a href="${acceptUrl}" style="display:block;text-align:center;padding:16px 32px;background:linear-gradient(135deg,#2563EB,#0D9488);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800;box-shadow:0 6px 20px rgba(37,99,235,0.35);margin-bottom:16px">
      Accept Invitation →
    </a>
    <p style="color:#94A3B8;font-size:12px;text-align:center;margin:0">This invitation will expire in 7 days</p>
  </div>
`);
}

export function buildMentionHtml({ mentionedName, senderName, accountName, channelName, messageContent, workspaceUrl }) {
  return emailBase(`
  <div style="background:linear-gradient(135deg,#7C3AED,#2563EB);padding:36px 40px">
    <h1 style="color:#fff;margin:0 0 6px;font-size:26px;font-weight:800">You were mentioned 💬</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px">${accountName} · #${channelName}</p>
  </div>
  <div style="padding:36px 40px">
    <p style="color:#334155;font-size:16px;margin:0 0 20px">Hi ${mentionedName || 'there'},</p>
    <p style="color:#64748B;font-size:14px;margin:0 0 20px"><strong style="color:#0F172A">${senderName}</strong> mentioned you in <strong style="color:#0F172A">#${channelName}</strong>:</p>
    <div style="background:#F5F3FF;border-left:4px solid #7C3AED;border-radius:0 12px 12px 0;padding:16px 20px;margin:0 0 28px">
      <p style="color:#4C1D95;font-size:14px;margin:0;line-height:1.6;font-style:italic">"${messageContent}"</p>
    </div>
    <a href="${workspaceUrl}" style="display:block;text-align:center;padding:16px 32px;background:linear-gradient(135deg,#7C3AED,#2563EB);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800;box-shadow:0 6px 20px rgba(124,58,237,0.35)">
      Reply in Workspace →
    </a>
  </div>
`);
}
