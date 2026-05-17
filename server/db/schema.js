import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/plex.db');

// MUST run before createClient — Railway container has no /app/data dir by default
mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = createClient({ url: `file:${DB_PATH}` });

export async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      website TEXT,
      logo_initial TEXT DEFAULT 'P',
      logo_url TEXT,
      primary_color TEXT DEFAULT '#13B5EA',
      plan TEXT DEFAULT 'starter',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      stripe_account_id TEXT,
      stripe_onboarded INTEGER DEFAULT 0,
      subscription_status TEXT DEFAULT 'trialing',
      trial_ends_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Add owner_id column if upgrading existing DB
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN owner_id TEXT`);
  } catch { /* already exists — fine */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN stripe_customer_id TEXT`);
  } catch { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN stripe_subscription_id TEXT`);
  } catch { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN subscription_status TEXT DEFAULT 'trialing'`);
  } catch { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN trial_ends_at TEXT`);
  } catch { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN logo_url TEXT`);
  } catch { /* already exists */ }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      business TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      number TEXT NOT NULL,
      contact_id TEXT,
      client_name TEXT,
      client_biz TEXT,
      client_email TEXT,
      client_phone TEXT,
      status TEXT DEFAULT 'draft',
      billing_mode TEXT DEFAULT 'monthly',
      yearly_discount REAL DEFAULT 15,
      disc_type TEXT DEFAULT 'pct',
      disc_value REAL DEFAULT 0,
      disc_setup INTEGER DEFAULT 1,
      disc_monthly INTEGER DEFAULT 1,
      notes TEXT,
      valid_days INTEGER DEFAULT 30,
      setup_total REAL DEFAULT 0,
      monthly_total REAL DEFAULT 0,
      public_token TEXT UNIQUE,
      accepted_at TEXT,
      sent_at TEXT,
      viewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      section_id TEXT,
      section_label TEXT,
      service_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      setup_price REAL DEFAULT 0,
      monthly_price REAL DEFAULT 0,
      is_included INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      quote_id TEXT,
      number TEXT NOT NULL,
      contact_id TEXT,
      client_name TEXT,
      client_biz TEXT,
      client_email TEXT,
      client_phone TEXT,
      status TEXT DEFAULT 'draft',
      billing_mode TEXT DEFAULT 'monthly',
      setup_total REAL DEFAULT 0,
      monthly_total REAL DEFAULT 0,
      amount_due REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      due_date TEXT,
      paid_at TEXT,
      sent_at TEXT,
      viewed_at TEXT,
      stripe_payment_link TEXT,
      stripe_payment_intent TEXT,
      notes TEXT,
      public_token TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      section_label TEXT,
      name TEXT NOT NULL,
      description TEXT,
      setup_price REAL DEFAULT 0,
      monthly_price REAL DEFAULT 0,
      is_included INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_sections (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      label TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_items (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      setup_price REAL DEFAULT 0,
      monthly_price REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES custom_sections(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      sent_at TEXT DEFAULT (datetime('now')),
      type TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);

  // Seed PLEX master account (only when no auth configured)
  const existing = await db.execute(`SELECT id FROM accounts WHERE id = 'plex-master'`);
  if (existing.rows.length === 0) {
    await db.execute(`
      INSERT INTO accounts (id, name, email, phone, website, logo_initial, primary_color, plan, subscription_status)
      VALUES ('plex-master', 'PLEX Automation', 'hello@plexautomation.io',
              '256-609-4618', 'plexautomation.io', 'P', '#13B5EA', 'agency', 'active')
    `);
  }

  console.log('✓ Database initialized at', DB_PATH);
}

// ── Schema additions for V2 features ─────────────────────────────
export async function initSchemaV2() {

  // F1: Granular read tracking — extend invoices + add engagement log
  const invoiceCols = [
    `ALTER TABLE invoices ADD COLUMN delivered_at TEXT`,
    `ALTER TABLE invoices ADD COLUMN opened_at TEXT`,
    `ALTER TABLE invoices ADD COLUMN first_viewed_at TEXT`,
    `ALTER TABLE invoices ADD COLUMN total_view_seconds INTEGER DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN view_count INTEGER DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN clicked_pay_at TEXT`,
    `ALTER TABLE invoices ADD COLUMN read_status TEXT DEFAULT 'sent'`,
  ];
  for (const sql of invoiceCols) { try { await db.execute(sql); } catch {} }

  // F1: Engagement event log
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_engagement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id TEXT NOT NULL,
      event TEXT NOT NULL,
      ts TEXT DEFAULT (datetime('now')),
      duration_seconds INTEGER,
      ip TEXT,
      ua TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);

  // F2: Incoming webhook rules
  await db.execute(`
    CREATE TABLE IF NOT EXISTS webhook_rules (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      event_key TEXT NOT NULL,
      match_field TEXT,
      match_value TEXT,
      action TEXT NOT NULL DEFAULT 'create_draft_invoice',
      template_json TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // F3: Client payment behavior history
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payment_behavior (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      contact_id TEXT,
      client_email TEXT,
      paid_at TEXT NOT NULL,
      day_of_week INTEGER,
      hour_of_day INTEGER,
      days_to_pay INTEGER,
      invoice_id TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // F3: Scheduled smart reminders
  await db.execute(`
    CREATE TABLE IF NOT EXISTS smart_reminders (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      sent_at TEXT,
      status TEXT DEFAULT 'pending',
      basis TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);

  // F6: Line-item split payment status
  try { await db.execute(`ALTER TABLE invoice_items ADD COLUMN line_status TEXT DEFAULT 'pending'`); } catch {}
  try { await db.execute(`ALTER TABLE invoice_items ADD COLUMN line_paid_at TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE invoice_items ADD COLUMN stripe_payment_intent TEXT`); } catch {}

  // F9: Invoice versioning
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN version INTEGER DEFAULT 1`); } catch {}
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN invoice_group_id TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN is_latest INTEGER DEFAULT 1`); } catch {}
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN parent_invoice_id TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN change_summary TEXT`); } catch {}

  // F8: Fee pass-through rules per account
  await db.execute(`
    CREATE TABLE IF NOT EXISTS fee_rules (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL UNIQUE,
      early_pay_hours INTEGER DEFAULT 48,
      waive_fee_if_early INTEGER DEFAULT 0,
      ach_only_above REAL DEFAULT 0,
      ach_only_enabled INTEGER DEFAULT 0,
      processing_fee_pct REAL DEFAULT 2.9,
      processing_fee_flat REAL DEFAULT 0.30,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // F10: Cached cashflow predictions (refreshed on demand)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cashflow_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL UNIQUE,
      data_json TEXT,
      computed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  console.log('✓ Schema V2 initialized');
}
