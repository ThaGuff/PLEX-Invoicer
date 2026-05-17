/**
 * Admin routes — accessible only to the PLEX owner (guffey.ryan@gmail.com).
 * Provides user management, metrics, onboarding email, and broadcast.
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// ── Owner guard ───────────────────────────────────────────────────
function requireOwner(req, res, next) {
  const ownerEmail = process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com';
  if (req.user?.email !== ownerEmail && req.user?.id !== 'dev-user') {
    return res.status(403).json({ error: 'Admin access only.' });
  }
  next();
}
router.use(requireOwner);

// ── Supabase admin client ─────────────────────────────────────────
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── SMTP sender ───────────────────────────────────────────────────
async function sendEmail({ to, subject, html, attachments = [] }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER) throw new Error('SMTP not configured');
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: parseInt(SMTP_PORT) || 587, secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to, subject, html, attachments,
  });
}

// ── GET /api/admin/users — all Supabase users + their accounts ───
router.get('/users', async (req, res) => {
  try {
    const sb = getSupabaseAdmin();
    let supabaseUsers = [];
    if (sb) {
      const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
      if (!error) supabaseUsers = data.users || [];
    }

    // Get all accounts from DB
    const accounts = await db.execute(`SELECT * FROM accounts WHERE id != 'plex-master' ORDER BY created_at DESC`);
    const accountMap = {};
    accounts.rows.forEach(a => { accountMap[a.owner_id] = a; });

    // Quote/invoice counts per account
    const quoteCounts = await db.execute(
      `SELECT account_id, COUNT(*) as cnt FROM quotes GROUP BY account_id`
    );
    const invoiceCounts = await db.execute(
      `SELECT account_id, COUNT(*) as cnt FROM invoices GROUP BY account_id`
    );
    const qMap = {}, iMap = {};
    quoteCounts.rows.forEach(r => { qMap[r.account_id] = r.cnt; });
    invoiceCounts.rows.forEach(r => { iMap[r.account_id] = r.cnt; });

    const users = supabaseUsers
      .filter(u => u.email !== (process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com'))
      .map(u => {
        const acc = accountMap[u.id];
        return {
          id:           u.id,
          email:        u.email,
          name:         u.user_metadata?.full_name || u.user_metadata?.name || null,
          created_at:   u.created_at,
          last_sign_in: u.last_sign_in_at,
          provider:     u.app_metadata?.provider || 'email',
          confirmed:    !!u.email_confirmed_at,
          account:      acc || null,
          plan:         acc?.plan || 'none',
          sub_status:   acc?.subscription_status || 'none',
          quote_count:  acc ? (qMap[acc.id] || 0) : 0,
          invoice_count: acc ? (iMap[acc.id] || 0) : 0,
        };
      });

    res.json({ users, total: users.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/metrics — platform-wide stats ─────────────────
router.get('/metrics', async (req, res) => {
  try {
    const sb = getSupabaseAdmin();
    let totalUsers = 0;
    if (sb) {
      const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
      totalUsers = (data?.users || []).filter(u =>
        u.email !== (process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com')
      ).length;
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [quotes, invoices, revenue, accounts, newUsers] = await Promise.all([
      db.execute(`SELECT COUNT(*) as cnt FROM quotes WHERE account_id != 'plex-master'`),
      db.execute(`SELECT COUNT(*) as cnt FROM invoices WHERE account_id != 'plex-master'`),
      db.execute(`SELECT COALESCE(SUM(amount_paid),0) as total FROM invoices WHERE account_id != 'plex-master'`),
      db.execute(`SELECT COUNT(*) as cnt FROM accounts WHERE id != 'plex-master'`),
      db.execute(`SELECT COUNT(*) as cnt FROM accounts WHERE id != 'plex-master' AND created_at >= ?`, [weekAgo]),
    ]);

    res.json({
      total_users:    totalUsers,
      total_accounts: accounts.rows[0].cnt,
      new_this_week:  newUsers.rows[0].cnt,
      total_quotes:   quotes.rows[0].cnt,
      total_invoices: invoices.rows[0].cnt,
      total_revenue:  revenue.rows[0].total,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/user/:id/account — view a user's account ──────
router.get('/user/:id/account', async (req, res) => {
  try {
    const acc = await db.execute(`SELECT * FROM accounts WHERE owner_id = ?`, [req.params.id]);
    if (!acc.rows.length) return res.json({ account: null });
    const account = acc.rows[0];
    const [sections, items, quotes, invoices] = await Promise.all([
      db.execute(`SELECT * FROM custom_sections WHERE account_id = ? ORDER BY sort_order`, [account.id]),
      db.execute(`SELECT * FROM custom_items WHERE account_id = ? ORDER BY sort_order`, [account.id]),
      db.execute(`SELECT id, number, status, setup_total, monthly_total, created_at FROM quotes WHERE account_id = ? ORDER BY created_at DESC LIMIT 10`, [account.id]),
      db.execute(`SELECT id, number, status, amount_due, amount_paid, created_at FROM invoices WHERE account_id = ? ORDER BY created_at DESC LIMIT 10`, [account.id]),
    ]);
    res.json({
      account: { ...account, customSections: sections.rows, customItems: items.rows },
      recent_quotes:   quotes.rows,
      recent_invoices: invoices.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/user/:id/extend-trial — add 14 days ──────────
router.post('/user/:id/extend-trial', async (req, res) => {
  try {
    const days = req.body.days || 14;
    const newEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    await db.execute(
      `UPDATE accounts SET trial_ends_at = ?, subscription_status = 'trialing' WHERE owner_id = ?`,
      [newEnd, req.params.id]
    );
    res.json({ ok: true, trial_ends_at: newEnd });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/onboard — send onboarding email + welcome PDF ─
router.post('/onboard', async (req, res) => {
  const { user_id, email, name, business_name, custom_message } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const displayName    = name || email.split('@')[0];
  const businessName   = business_name || 'your business';
  const loginUrl       = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';
  const supportEmail   = process.env.PLEX_OWNER_EMAIL || 'hello@plexautomation.io';
  const supportPhone   = '256-609-4618';

  // Generate welcome PDF
  let pdfBuffer = null;
  try {
    pdfBuffer = await generateWelcomePDF({ displayName, businessName, loginUrl, supportEmail, supportPhone });
  } catch (e) {
    console.warn('PDF generation failed, sending email without attachment:', e.message);
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; margin:0; padding:0; background:#f5f7f8; }
  .wrap { max-width: 580px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .header { background: #1a1a1a; padding: 32px 40px; text-align: center; }
  .logo { width: 40px; height: 40px; background: #13B5EA; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 12px; }
  .brand { color: #fff; font-size: 20px; font-weight: 700; margin: 0; }
  .tagline { color: #9ca3af; font-size: 13px; margin: 4px 0 0; }
  .body { padding: 36px 40px; }
  h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; color: #1a1a1a; }
  p { font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 16px; }
  .cta { display: block; background: #13B5EA; color: #fff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-align: center; margin: 24px 0; }
  .steps { background: #f5f7f8; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
  .steps h3 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; margin: 0 0 14px; }
  .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
  .step-num { width: 24px; height: 24px; background: #13B5EA; color: #fff; border-radius: 50%; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step-text { font-size: 14px; color: #374151; padding-top: 3px; }
  .custom-msg { border-left: 3px solid #13B5EA; padding: 12px 16px; background: #f0f9ff; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; color: #374151; }
  .footer { padding: 20px 40px; background: #f9fafb; border-top: 1px solid #f0f0f0; }
  .footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5; }
  .footer a { color: #13B5EA; text-decoration: none; }
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">P</div>
    <p class="brand">PLEX Automation</p>
    <p class="tagline">Quote · Invoice · Get Paid</p>
  </div>
  <div class="body">
    <h1>Welcome, ${displayName}! 👋</h1>
    <p>Your <strong>PLEX Invoicer</strong> account for <strong>${businessName}</strong> is ready. This is the fastest way to send professional quotes, convert them to invoices, and get paid — built specifically for service businesses.</p>
    ${custom_message ? `<div class="custom-msg">${custom_message}</div>` : ''}
    <a href="${loginUrl}" class="cta">Sign in to PLEX Invoicer →</a>
    <div class="steps">
      <h3>Get started in 3 steps</h3>
      <div class="step"><div class="step-num">1</div><div class="step-text"><strong>Set up your account</strong> — Upload your logo, add your brand color, and build your service catalog in Account Settings.</div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text"><strong>Build your first quote</strong> — Select services, set billing mode, apply a discount if needed, and send it to your client with one click.</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text"><strong>Convert to invoice</strong> — When the client accepts, convert the quote to an invoice and collect payment via Stripe or mark it paid manually.</div></div>
    </div>
    <p>Questions? Reply to this email or reach us directly:</p>
    <p><strong>📧</strong> <a href="mailto:${supportEmail}">${supportEmail}</a><br><strong>📞</strong> ${supportPhone}</p>
    <p style="font-size:13px;color:#9ca3af;">Your welcome guide is attached as a PDF — print it out or save it for quick reference.</p>
  </div>
  <div class="footer">
    <p>You're receiving this because you signed up for PLEX Invoicer.<br>
    <a href="${loginUrl}">Log in</a> · <a href="mailto:${supportEmail}">Contact support</a> · PLEX Automation · Birmingham, AL</p>
  </div>
</div>
</body></html>`;

  try {
    const attachments = pdfBuffer ? [{
      filename: 'PLEX-Invoicer-Welcome-Guide.pdf',
      content:  pdfBuffer,
      contentType: 'application/pdf',
    }] : [];

    await sendEmail({
      to:      email,
      subject: `Welcome to PLEX Invoicer, ${displayName}!`,
      html,
      attachments,
    });

    // Log it in DB
    try {
      await db.execute(
        `INSERT OR IGNORE INTO onboarding_log (user_id, email, sent_at) VALUES (?, ?, datetime('now'))`,
        [user_id || null, email]
      );
    } catch { /* table may not exist yet — that's fine */ }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/admin/broadcast — email all users ───────────────────
router.post('/broadcast', async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: 'subject and message required' });

  const sb = getSupabaseAdmin();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  try {
    const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const users = (data?.users || []).filter(u =>
      u.email && u.email !== (process.env.PLEX_OWNER_EMAIL || 'guffey.ryan@gmail.com')
    );

    const loginUrl    = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';
    const supportEmail = process.env.PLEX_OWNER_EMAIL || 'hello@plexautomation.io';

    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1a1a1a; margin:0; padding:0; background:#f5f7f8; }
  .wrap { max-width:580px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
  .header { background:#1a1a1a; padding:24px 40px; }
  .brand { color:#fff; font-size:16px; font-weight:700; margin:0; }
  .body { padding:32px 40px; }
  h1 { font-size:20px; font-weight:700; margin:0 0 16px; }
  p { font-size:15px; line-height:1.7; color:#4b5563; margin:0 0 14px; white-space:pre-wrap; }
  .cta { display:block; background:#13B5EA; color:#fff !important; text-decoration:none; font-weight:700; font-size:14px; padding:12px 24px; border-radius:8px; text-align:center; margin:24px 0; }
  .footer { padding:16px 40px; background:#f9fafb; border-top:1px solid #f0f0f0; font-size:12px; color:#9ca3af; }
  .footer a { color:#13B5EA; text-decoration:none; }
</style></head><body>
<div class="wrap">
  <div class="header"><p class="brand">PLEX Automation</p></div>
  <div class="body">
    <h1>${subject}</h1>
    <p>${message.replace(/\n/g, '<br>')}</p>
    <a href="${loginUrl}" class="cta">Open PLEX Invoicer →</a>
  </div>
  <div class="footer">
    <a href="${loginUrl}">Log in</a> · <a href="mailto:${supportEmail}">Contact support</a> · PLEX Automation
  </div>
</div></body></html>`;

    let sent = 0, failed = 0;
    for (const u of users) {
      try {
        await sendEmail({ to: u.email, subject, html });
        sent++;
      } catch { failed++; }
    }

    res.json({ ok: true, sent, failed, total: users.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Welcome PDF generator ─────────────────────────────────────────
async function generateWelcomePDF({ displayName, businessName, loginUrl, supportEmail, supportPhone }) {
  // Use jsPDF server-side via dynamic import
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = 612, M = 56;
  const BLUE = [19, 181, 234];
  const DARK = [26, 26, 26];
  const GRAY = [107, 114, 128];
  const LIGHT = [245, 247, 248];

  // Header bar
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 90, 'F');

  // Logo circle
  doc.setFillColor(...BLUE);
  doc.roundedRect(M, 22, 46, 46, 8, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('P', M + 23, 52, { align: 'center' });

  // Brand name
  doc.setFontSize(18);
  doc.text('PLEX Automation', M + 58, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLUE);
  doc.text('PLEX Invoicer — Welcome Guide', M + 58, 58);

  // Title
  doc.setTextColor(...DARK);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`Welcome, ${displayName}!`, M, 130);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`Your account for ${businessName} is ready.`, M, 152);

  // Divider
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(2);
  doc.line(M, 165, W - M, 165);

  // Login box
  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, 180, W - M * 2, 56, 6, 6, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('YOUR LOGIN URL', M + 16, 200);
  doc.setFontSize(13);
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.text(loginUrl, M + 16, 220);

  // Steps
  let y = 268;
  const steps = [
    ['1', 'Set up your account', 'Upload your logo, choose your brand color, and build your service catalog in Account Settings. You can scan your website to auto-import services.'],
    ['2', 'Build your first quote', 'Click "New quote", select services from your catalog, set the billing mode (monthly or one-time), and send it to your client.'],
    ['3', 'Convert quote to invoice', 'When your client accepts the quote, convert it to an invoice in one click. Send a payment link or mark it paid manually.'],
    ['4', 'Get paid', 'Stripe payment links are built in. Set up automatic reminders for overdue invoices so you never have to chase a client manually.'],
  ];

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Getting started in 4 steps', M, y);
  y += 20;

  steps.forEach(([num, title, desc]) => {
    // Number circle
    doc.setFillColor(...BLUE);
    doc.circle(M + 12, y + 4, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(num, M + 12, y + 8, { align: 'center' });

    // Title
    doc.setTextColor(...DARK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, M + 32, y + 8);

    // Description
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const lines = doc.splitTextToSize(desc, W - M * 2 - 32);
    doc.text(lines, M + 32, y + 22);
    y += 22 + lines.length * 13 + 10;
  });

  // Support box
  y += 8;
  doc.setFillColor(...DARK);
  doc.roundedRect(M, y, W - M * 2, 70, 8, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Need help?', M + 20, y + 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLUE);
  doc.text(`✉  ${supportEmail}`, M + 20, y + 40);
  doc.text(`✆  ${supportPhone}`, M + 20, y + 56);

  // Footer
  doc.setFillColor(...BLUE);
  doc.rect(0, 742, W, 8, 'F');

  return Buffer.from(doc.output('arraybuffer'));
}

// ── Create onboarding_log table if missing ────────────────────────
(async () => {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS onboarding_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        email TEXT,
        sent_at TEXT DEFAULT (datetime('now'))
      )
    `);
  } catch { /* ignore */ }
})();

export default router;

// ── Account suspension ────────────────────────────────────────────
router.post('/user/:id/suspend', async (req, res) => {
  const sb = getSupabaseAdmin();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    await sb.auth.admin.updateUserById(req.params.id, { ban_duration: '87600h' }); // 10 years
    await db.execute(`UPDATE accounts SET subscription_status = 'suspended' WHERE owner_id = ?`, [req.params.id]);
    res.json({ ok: true, status: 'suspended' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/user/:id/unsuspend', async (req, res) => {
  const sb = getSupabaseAdmin();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    await sb.auth.admin.updateUserById(req.params.id, { ban_duration: 'none' });
    await db.execute(`UPDATE accounts SET subscription_status = 'trialing' WHERE owner_id = ? AND subscription_status = 'suspended'`, [req.params.id]);
    res.json({ ok: true, status: 'active' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Password reset email ──────────────────────────────────────────
router.post('/user/:id/reset-password', async (req, res) => {
  const sb = getSupabaseAdmin();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data: user } = await sb.auth.admin.getUserById(req.params.id);
    if (!user?.user?.email) return res.status(404).json({ error: 'User not found' });
    const appUrl = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';
    const { error } = await sb.auth.resetPasswordForEmail(user.user.email, {
      redirectTo: `${appUrl}/reset-password`,
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, email: user.user.email });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Resend confirmation email ─────────────────────────────────────
router.post('/user/:id/resend-confirmation', async (req, res) => {
  const sb = getSupabaseAdmin();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data: u } = await sb.auth.admin.getUserById(req.params.id);
    if (!u?.user?.email) return res.status(404).json({ error: 'User not found' });
    // Force-confirm their email instead (better UX — no action needed)
    await sb.auth.admin.updateUserById(req.params.id, { email_confirm: true });
    res.json({ ok: true, confirmed: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Override plan ─────────────────────────────────────────────────
router.post('/user/:id/set-plan', async (req, res) => {
  const { plan, status } = req.body;
  if (!plan) return res.status(400).json({ error: 'plan required' });
  try {
    await db.execute(
      `UPDATE accounts SET plan = ?, subscription_status = ? WHERE owner_id = ?`,
      [plan, status || 'active', req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Delete user account ───────────────────────────────────────────
router.delete('/user/:id', async (req, res) => {
  const sb = getSupabaseAdmin();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    // Delete from DB first (cascade)
    const acc = await db.execute(`SELECT id FROM accounts WHERE owner_id = ?`, [req.params.id]);
    for (const a of acc.rows) {
      await db.execute(`DELETE FROM accounts WHERE id = ?`, [a.id]);
    }
    // Delete from Supabase auth
    const { error } = await sb.auth.admin.deleteUser(req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Generate magic login link for user ───────────────────────────
router.post('/user/:id/magic-link', async (req, res) => {
  const sb = getSupabaseAdmin();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data: u } = await sb.auth.admin.getUserById(req.params.id);
    if (!u?.user?.email) return res.status(404).json({ error: 'User not found' });
    const appUrl = process.env.APP_URL || 'https://plex-invoicer.up.railway.app';
    const { data, error } = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email: u.user.email,
      options: { redirectTo: `${appUrl}/dashboard` },
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, link: data.properties?.action_link });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Activity log for a user ───────────────────────────────────────
router.get('/user/:id/activity', async (req, res) => {
  try {
    const acc = await db.execute(`SELECT id FROM accounts WHERE owner_id = ?`, [req.params.id]);
    if (!acc.rows.length) return res.json({ events: [] });
    const accountId = acc.rows[0].id;

    const [quotes, invoices, engagement, reminders] = await Promise.all([
      db.execute(`SELECT 'quote_created' as type, number as ref, created_at as ts FROM quotes WHERE account_id = ? ORDER BY created_at DESC LIMIT 20`, [accountId]),
      db.execute(`SELECT 'invoice_created' as type, number as ref, created_at as ts FROM invoices WHERE account_id = ? ORDER BY created_at DESC LIMIT 20`, [accountId]),
      db.execute(`SELECT ie.event as type, i.number as ref, ie.ts FROM invoice_engagement ie JOIN invoices i ON ie.invoice_id = i.id WHERE i.account_id = ? ORDER BY ie.ts DESC LIMIT 20`, [accountId]),
      db.execute(`SELECT 'reminder_sent' as type, i.number as ref, r.sent_at as ts FROM reminders r JOIN invoices i ON r.invoice_id = i.id WHERE i.account_id = ? ORDER BY r.sent_at DESC LIMIT 10`, [accountId]),
    ]);

    const events = [
      ...quotes.rows, ...invoices.rows, ...engagement.rows, ...reminders.rows,
    ].filter(e => e.ts).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 40);

    res.json({ events });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── System health check ───────────────────────────────────────────
router.get('/health', async (req, res) => {
  const checks = {
    database: false,
    supabase: false,
    smtp:     false,
    openai:   false,
    stripe:   false,
  };

  // DB
  try { await db.execute('SELECT 1'); checks.database = true; } catch {}

  // Supabase
  const sb = getSupabaseAdmin();
  if (sb) { try { await sb.auth.admin.listUsers({ perPage: 1 }); checks.supabase = true; } catch {} }

  // SMTP (just check env vars)
  checks.smtp   = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
  checks.openai = !!process.env.OPENAI_API_KEY;
  checks.stripe       = !!process.env.STRIPE_SECRET_KEY;
  checks.stripe_connect = !!process.env.STRIPE_CLIENT_ID;

  const allOk = Object.values(checks).every(Boolean);
  res.status(allOk ? 200 : 207).json({ ok: allOk, checks, ts: new Date().toISOString() });
});

// ── Subscriptions overview ────────────────────────────────────────
router.get('/subscriptions', async (req, res) => {
  try {
    const accs = await db.execute(`
      SELECT a.*, 
             (SELECT COUNT(*) FROM invoices i WHERE i.account_id = a.id AND i.status = 'paid') as paid_invoices,
             (SELECT COALESCE(SUM(amount_paid),0) FROM invoices i WHERE i.account_id = a.id) as total_revenue,
             (SELECT MAX(created_at) FROM quotes q WHERE q.account_id = a.id) as last_quote_at,
             (SELECT MAX(created_at) FROM invoices iv WHERE iv.account_id = a.id) as last_invoice_at
      FROM accounts a
      WHERE a.id != 'plex-master'
      ORDER BY a.created_at DESC
    `);
    res.json(accs.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
