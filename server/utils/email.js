/**
 * Email utility — sends via Resend (primary) or SMTP/nodemailer (fallback)
 *
 * Setup (Railway Variables):
 *   RESEND_API_KEY   — recommended, free at resend.com (3k emails/month free)
 *   OR
 *   SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_PORT
 */
export async function sendEmail({ to, subject, html, text, from }) {
  const fromAddr = from || process.env.SMTP_FROM || process.env.RESEND_FROM || 'invoices@revanew.io';
  if (!to || !subject) throw new Error('to and subject are required');

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: fromAddr,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || `<p>${(text||'').replace(/\n/g,'<br>')}</p>`,
      text: text || '',
    });
    if (result.error) throw new Error(result.error.message);
    return { provider: 'resend', id: result.data?.id };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const nodemailer = (await import('nodemailer')).default;
    const port = parseInt(process.env.SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const info = await transporter.sendMail({
      from: fromAddr, to: Array.isArray(to) ? to.join(', ') : to,
      subject, text: text || '',
      html: html || `<p>${(text||'').replace(/\n/g,'<br>')}</p>`,
    });
    return { provider: 'smtp', id: info.messageId };
  }

  throw new Error('Email not configured. Set RESEND_API_KEY or SMTP_HOST+SMTP_USER in Railway Variables.');
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
    <p style="color:#334155;font-size:15px;margin:0 0 24px">Your invoice is ready. Please review and sign it at your convenience.</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;margin:0 0 28px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#64748B;font-size:13px">Amount due</span>
        <span style="color:#0F172A;font-size:18px;font-weight:800">${amount}</span>
      </div>
      ${dueDate?`<div style="display:flex;justify-content:space-between"><span style="color:#64748B;font-size:13px">Due date</span><span style="color:#0F172A;font-size:13px;font-weight:600">${dueDate}</span></div>`:''}
    </div>
    <a href="${portalUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#2563EB,#0D9488);color:#fff;text-decoration:none;padding:16px 32px;border-radius:12px;font-size:16px;font-weight:800">
      Review &amp; Sign Invoice →
    </a>
    <p style="color:#94A3B8;font-size:12px;text-align:center;margin:16px 0 0">Or copy: <a href="${portalUrl}" style="color:#2563EB">${portalUrl}</a></p>
  </div>
  <div style="background:#F8FAFC;padding:16px 40px;border-top:1px solid #E2E8F0">
    <p style="color:#94A3B8;font-size:11px;margin:0;text-align:center">Powered by <strong>Revanew</strong></p>
  </div>
</div></body></html>`;
}

export function buildQuoteHtml({ clientName, agencyName, quoteNum, amount, validDays, portalUrl }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
  <div style="background:linear-gradient(135deg,#7C3AED,#2563EB);padding:32px 40px">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800">Quote from ${agencyName||'Revanew'}</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Quote #${quoteNum}</p>
  </div>
  <div style="padding:32px 40px">
    <p style="color:#334155;font-size:15px;margin:0 0 16px">Hi ${clientName||'there'},</p>
    <p style="color:#334155;font-size:15px;margin:0 0 24px">Here's your quote. Review and e-sign to accept — no account needed.</p>
    ${amount?`<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;margin:0 0 28px">
      <div style="display:flex;justify-content:space-between"><span style="color:#64748B;font-size:13px">Total</span><span style="color:#0F172A;font-size:18px;font-weight:800">${amount}</span></div>
      ${validDays?`<div style="display:flex;justify-content:space-between;margin-top:8px"><span style="color:#64748B;font-size:13px">Valid for</span><span style="color:#0F172A;font-size:13px;font-weight:600">${validDays} days</span></div>`:''}
    </div>`:''}
    <a href="${portalUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#7C3AED,#2563EB);color:#fff;text-decoration:none;padding:16px 32px;border-radius:12px;font-size:16px;font-weight:800">
      View &amp; Accept Quote →
    </a>
  </div>
  <div style="background:#F8FAFC;padding:16px 40px;border-top:1px solid #E2E8F0">
    <p style="color:#94A3B8;font-size:11px;margin:0;text-align:center">Powered by <strong>Revanew</strong></p>
  </div>
</div></body></html>`;
}
