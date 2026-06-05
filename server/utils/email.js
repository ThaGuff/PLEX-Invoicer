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

export async function sendEmail({ to, subject, html, text, from, replyTo, type } = {}) {
  if (!to || !subject) throw new Error('to and subject are required');

  const toList = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!toList.length) throw new Error('No valid recipients');

  const resendKey  = process.env.RESEND_API_KEY;
  // Determine "from" address based on email type
  const baseDomain = process.env.RESEND_FROM?.split('@')[1] || null;
  const invoiceFrom = baseDomain ? `Revanew Invoices <invoices@${baseDomain}>` : (process.env.RESEND_FROM || 'onboarding@resend.dev');
  const inviteFrom  = baseDomain ? `Revanew Team <invite@${baseDomain}>` : (process.env.RESEND_FROM || 'onboarding@resend.dev');
  const defaultFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';
  
  const resendFrom = type === 'invoice' ? invoiceFrom : type === 'invite' ? inviteFrom : defaultFrom;
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
  
  // When using Resend via SMTP (smtp.resend.com), SMTP_PASS = RESEND_API_KEY
  const smtpPass = process.env.SMTP_PASS || 
    (process.env.SMTP_HOST?.includes('resend.com') ? process.env.RESEND_API_KEY : null);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: smtpPass },
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
<style>
  @media only screen and (max-width:600px) {
    .email-container { margin: 0 !important; border-radius: 0 !important; }
    .email-pad { padding: 24px 20px !important; }
    .email-hero { padding: 28px 20px !important; }
    .amount-text { font-size: 22px !important; }
    .cta-btn { padding: 14px 20px !important; font-size: 15px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<div class="email-container" style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.1)">
${content}
<!-- Footer -->
<div style="padding:20px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="text-align:center">
        <p style="margin:0 0 6px;color:#CBD5E1;font-size:11px;letter-spacing:0.05em;text-transform:uppercase">Powered by</p>
        <a href="https://revanew.io" style="color:${accentColor};text-decoration:none;font-size:14px;font-weight:700">Revanew.io</a>
        <p style="margin:8px 0 0;color:#94A3B8;font-size:11px;line-height:1.6">
          Quotes · Invoices · Get Paid · <a href="https://revanew.io" style="color:#94A3B8">revanew.io</a>
        </p>
      </td>
    </tr>
  </table>
</div>
</div>
</body></html>`;

export function buildInvoiceHtml({ clientName, agencyName, invoiceNum, amount, dueDate, portalUrl, logoUrl, accentColor, agencyPhone = '', agencyEmail = '', agencyAddress = '', agencyCityState = '', agencyLicense = '', agencyTagline = '' }) {
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

export function buildQuoteHtml({ clientName, agencyName, quoteNum, totalAmount, expiryDate, portalUrl, logoUrl, accentColor = '#2563EB', agencyPhone = '', agencyEmail = '', agencyAddress = '', lineItems = [], notes = '' }) {
  const fmtMoney = n => '$' + parseFloat(n||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const itemsHtml = lineItems.length > 0 ? lineItems.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#374151;vertical-align:top">${fmt(item.name)}${item.description ? '<br><span style="font-size:12px;color:#94a3b8">'+fmt(item.description)+'</span>' : ''}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:right;color:${accentColor};font-weight:700;white-space:nowrap">${fmtMoney(item.setup_price || item.price || 0)}</td>
    </tr>`).join('') : '';

  const body = `
  <div style="padding:36px 40px 28px;background:linear-gradient(135deg,${accentColor}10,${accentColor}04);border-bottom:3px solid ${accentColor}">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td>${logoUrl ? `<img src="${logoUrl}" alt="${fmt(agencyName)}" style="height:48px;object-fit:contain;border-radius:8px;background:white;padding:4px">` : `<div style="font-size:22px;font-weight:900;color:${accentColor}">${fmt(agencyName)}</div>`}</td>
      <td style="text-align:right"><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">QUOTE</div><div style="font-size:22px;font-weight:900;color:#0f172a">${fmt(quoteNum)}</div></td>
    </tr></table>
  </div>
  <div style="padding:32px 40px">
    <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.7">Hi <strong>${fmt(clientName || 'there')}</strong>,<br>Your quote is ready. Review the details below and click the button to approve or request changes.</p>
    ${lineItems.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <tr style="background:${accentColor}10"><th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:${accentColor};text-transform:uppercase;letter-spacing:0.06em">Service</th><th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:${accentColor};text-transform:uppercase;letter-spacing:0.06em">Price</th></tr>
      <tr><td colspan="2" style="padding:0 16px">${itemsHtml}</td></tr>
      <tr style="background:${accentColor}08"><td style="padding:12px 16px;font-size:16px;font-weight:800;color:#0f172a">Total</td><td style="padding:12px 16px;font-size:20px;font-weight:900;color:${accentColor};text-align:right">${fmtMoney(totalAmount)}</td></tr>
    </table>` : `<div style="background:${accentColor}08;border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid ${accentColor}20;text-align:center"><div style="font-size:13px;color:#64748b;margin-bottom:6px">Quote Total</div><div style="font-size:36px;font-weight:900;color:${accentColor}">${fmtMoney(totalAmount)}</div>${expiryDate ? `<div style="font-size:12px;color:#94a3b8;margin-top:6px">Valid until ${fmt(expiryDate)}</div>` : ''}</div>`}
    ${notes ? `<div style="background:#fffbeb;border-radius:10px;padding:14px 18px;margin-bottom:24px;border-left:4px solid #f59e0b"><p style="margin:0;font-size:13px;color:#92400e;line-height:1.6">${fmt(notes)}</p></div>` : ''}
    <div style="text-align:center;padding:24px 0">
      <a href="${portalUrl}" style="display:inline-block;padding:15px 40px;background:linear-gradient(135deg,${accentColor},${accentColor}cc);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;box-shadow:0 6px 24px ${accentColor}40;letter-spacing:0.01em">
        View & Approve Quote →
      </a>
    </div>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;text-align:center">Or paste this link: <a href="${portalUrl}" style="color:${accentColor}">${portalUrl}</a></p>
  </div>
  <div style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0">
    <strong style="font-size:14px;color:#0f172a">${fmt(agencyName)}</strong><br>
    <span style="font-size:12px;color:#64748b">${[agencyPhone, agencyEmail, agencyAddress].filter(Boolean).join(' · ')}</span>
  </div>`;

  return emailBase(body, accentColor);
}
