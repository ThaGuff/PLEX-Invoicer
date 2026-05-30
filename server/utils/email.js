/**
 * Email utility — sends via Resend (primary) or SMTP/nodemailer (fallback)
 *
 * Setup (Railway Variables):
 *   RESEND_API_KEY   — recommended, free at resend.com (3k emails/month free)
 *   RESEND_FROM      — must be from verified domain (verify revanew.io at resend.com/domains)
 *   OR
 *   SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_PORT
 *
 * IMPORTANT: If RESEND_FROM is onboarding@resend.dev, Resend will only deliver to
 * verified email addresses. Verify revanew.io to send to any address.
 */
export async function sendEmail({ to, subject, html, text, from }) {
  const resendFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const smtpFrom   = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromAddr   = from || (process.env.RESEND_API_KEY ? resendFrom : smtpFrom) || 'onboarding@resend.dev';
  if (!to || !subject) throw new Error('to and subject are required');

  const toList = Array.isArray(to) ? to : [to];
  console.log(`[Email] Sending to ${toList.join(',')} via ${process.env.RESEND_API_KEY ? 'Resend' : 'SMTP'} | Subject: ${subject}`);

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: fromAddr,
      to: toList,
      subject,
      html: html || `<p>${(text||'').replace(/\n/g,'<br>')}</p>`,
      text: text || '',
    });

    if (result.error) {
      const msg = result.error.message || '';
      console.error('[Email] Resend error:', msg);

      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        console.log('[Email] Falling back to SMTP...');
        return sendViaSMTP({ to: toList, from: smtpFrom || fromAddr, subject, html, text });
      }

      if (msg.includes('testing emails') || msg.includes('verify a domain') || msg.includes('only send') || msg.includes('unverified')) {
        console.error('[Email] ACTION REQUIRED: Verify revanew.io at https://resend.com/domains');
        console.error('[Email] Then set RESEND_FROM=invoices@revanew.io in Railway Variables');
        console.error(`[Email] Until then, emails only deliver to: guffey.ryan@gmail.com`);
      }

      throw new Error(`Email delivery failed: ${msg}`);
    }

    console.log('[Email] Sent via Resend:', result.data?.id);
    return { provider: 'resend', id: result.data?.id };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return sendViaSMTP({ to: toList, from: smtpFrom || fromAddr, subject, html, text });
  }

  throw new Error('Email not configured. Set RESEND_API_KEY or SMTP_HOST+SMTP_USER in Railway Variables.');
}

async function sendViaSMTP({ to, from, subject, html, text }) {
  const nodemailer = (await import('nodemailer')).default;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const info = await transporter.sendMail({
    from, to: Array.isArray(to) ? to.join(', ') : to,
    subject, text: text || '',
    html: html || `<p>${(text||'').replace(/\n/g,'<br>')}</p>`,
  });
  console.log('[Email] Sent via SMTP:', info.messageId);
  return { provider: 'smtp', id: info.messageId };
}

export const isEmailConfigured = () =>
  !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER));

export function buildInvoiceHtml({ clientName, agencyName, invoiceNum, amount, dueDate, portalUrl }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
  <div style="background:linear-gradient(135deg,#2563EB,#0D9488);padding:32px 40px">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800">Invoice from ${agencyName||'Revanew'}</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Invoice #${invoiceNum}</p>
  </div>
  <div style="padding:32px 40px">
    <p style="color:#334155;font-size:15px;margin:0 0 24px">Hi ${clientName||'there'},</p>
    <p style="color:#334155;font-size:15px;margin:0 0 24px">Your invoice is ready. Please click below to view and pay online.</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;margin:0 0 28px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#64748B;font-size:13px">Amount due</span>
        <span style="color:#0F172A;font-size:18px;font-weight:800">${amount}</span>
      </div>
      ${dueDate ? `<div style="display:flex;justify-content:space-between">
        <span style="color:#64748B;font-size:13px">Due date</span>
        <span style="color:#0F172A;font-size:14px;font-weight:600">${dueDate}</span>
      </div>` : ''}
    </div>
    <a href="${portalUrl}" style="display:block;text-align:center;padding:16px 32px;background:linear-gradient(135deg,#2563EB,#0D9488);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800;letter-spacing:-0.01em;box-shadow:0 4px 14px rgba(37,99,235,0.4)">
      View &amp; Pay Invoice →
    </a>
    <p style="color:#94A3B8;font-size:12px;text-align:center;margin:24px 0 0">Powered by Revanew · <a href="https://revanew.io" style="color:#2563EB;text-decoration:none">revanew.io</a></p>
  </div>
</div>
</body></html>`;
}

export function buildQuoteHtml({ clientName, agencyName, quoteNum, amount, expiryDate, portalUrl }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
  <div style="background:linear-gradient(135deg,#2563EB,#0D9488);padding:32px 40px">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800">Quote from ${agencyName||'Revanew'}</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Quote #${quoteNum}</p>
  </div>
  <div style="padding:32px 40px">
    <p style="color:#334155;font-size:15px;margin:0 0 24px">Hi ${clientName||'there'},</p>
    <p style="color:#334155;font-size:15px;margin:0 0 24px">Your quote is ready to review. Click below to view the details and e-sign from any device.</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;margin:0 0 28px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#64748B;font-size:13px">Total amount</span>
        <span style="color:#0F172A;font-size:18px;font-weight:800">${amount}</span>
      </div>
      ${expiryDate ? `<div style="display:flex;justify-content:space-between">
        <span style="color:#64748B;font-size:13px">Valid until</span>
        <span style="color:#0F172A;font-size:14px;font-weight:600">${expiryDate}</span>
      </div>` : ''}
    </div>
    <a href="${portalUrl}" style="display:block;text-align:center;padding:16px 32px;background:linear-gradient(135deg,#2563EB,#0D9488);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800;letter-spacing:-0.01em;box-shadow:0 4px 14px rgba(37,99,235,0.4)">
      Review &amp; Sign Quote →
    </a>
    <p style="color:#94A3B8;font-size:12px;text-align:center;margin:24px 0 0">Powered by Revanew · <a href="https://revanew.io" style="color:#2563EB;text-decoration:none">revanew.io</a></p>
  </div>
</div>
</body></html>`;
}
