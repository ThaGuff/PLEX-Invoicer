import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve DB path — must be done BEFORE createClient
const DB_PATH = process.env.DB_PATH
  || path.join(__dirname, '../../data/plex.db');

// Ensure the directory exists BEFORE createClient tries to open the file
// This must happen at module load time, not in initDB()
mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = createClient({ url: `file:${DB_PATH}` });

export async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      website TEXT,
      logo_initial TEXT DEFAULT 'P',
      primary_color TEXT DEFAULT '#13B5EA',
      plan TEXT DEFAULT 'starter',
      stripe_account_id TEXT,
      stripe_onboarded INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

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

  // Seed PLEX master account if not exists
  const existing = await db.execute(
    `SELECT id FROM accounts WHERE id = 'plex-master'`
  );
  if (existing.rows.length === 0) {
    await db.execute(`
      INSERT INTO accounts (id, name, email, phone, website, logo_initial, primary_color, plan)
      VALUES ('plex-master', 'PLEX Automation', 'hello@plexautomation.io',
              '256-609-4618', 'plexautomation.io', 'P', '#13B5EA', 'agency')
    `);
  }

  console.log('✓ Database initialized at', DB_PATH);
}
