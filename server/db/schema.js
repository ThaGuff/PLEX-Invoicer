import { db, dbType } from './client.js';
export { db, dbType };

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
      created_at TEXT DEFAULT (NOW()::text)
    )
  `);

  // Add owner_id column if upgrading existing DB
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS owner_id TEXT`);
  } catch { /* already exists — fine */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
  } catch { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`);
  } catch { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing'`);
  } catch { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_ends_at TEXT`);
  } catch { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS logo_url TEXT`);
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
      created_at TEXT DEFAULT (NOW()::text),
      updated_at TEXT DEFAULT (NOW()::text),
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
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      public_token TEXT UNIQUE,
      accepted_at TEXT,
      sent_at TEXT,
      viewed_at TEXT,
      created_at TEXT DEFAULT (NOW()::text),
      updated_at TEXT DEFAULT (NOW()::text),
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
      created_at TEXT DEFAULT (NOW()::text),
      updated_at TEXT DEFAULT (NOW()::text),
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
      sent_at TEXT DEFAULT (NOW()::text),
      type TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);


  // Performance indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_quotes_account_id ON quotes(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token)`,
    `CREATE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes(public_token)`,
    `CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id)`,
    `CREATE INDEX IF NOT EXISTS idx_custom_sections_account_id ON custom_sections(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_custom_items_account_id ON custom_items(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id)`,
    `CREATE INDEX IF NOT EXISTS idx_invoice_engagement_invoice_id ON invoice_engagement(invoice_id)`,
  ];
  for (const sql of indexes) { try { await db.execute(sql); } catch {} }

  // Seed PLEX master account (only when no auth configured)
  const existing = await db.execute(`SELECT id FROM accounts WHERE id = 'plex-master'`);
  if (existing.rows.length === 0) {
    await db.execute(`
      INSERT INTO accounts (id, name, email, phone, website, logo_initial, primary_color, plan, subscription_status)
      VALUES ('plex-master', 'PLEX Automation', 'hello@plexautomation.io',
              '256-609-4618', 'plexautomation.io', 'P', '#13B5EA', 'agency', 'active')
    `);
  }
  // Ensure plex-master always has owner email set (owner_id set dynamically on first login)
  await db.execute(`
    UPDATE accounts SET email = 'guffey.ryan@gmail.com' WHERE id = 'plex-master' AND (email IS NULL OR email = 'hello@plexautomation.io')
  `).catch(() => {});

  // ── New feature tables ──────────────────────────────────────────
  const newTables = [
    `CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      duration INTEGER DEFAULT 60,
      location TEXT,
      notes TEXT,
      status TEXT DEFAULT 'scheduled',
      client_name TEXT,
      client_email TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      doc_type TEXT DEFAULT 'other',
      size INTEGER,
      mime_type TEXT,
      storage_key TEXT,
      url TEXT,
      linked_to TEXT,
      linked_type TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name TEXT,
      job_site TEXT,
      size INTEGER,
      mime_type TEXT,
      storage_key TEXT,
      url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS workspace_channels (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      private INTEGER DEFAULT 0,
      description TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS workspace_messages (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL,
      content TEXT NOT NULL,
      sender_name TEXT,
      sender_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_calendar_account ON calendar_events(account_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_account ON documents(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_photos_account ON photos(account_id, job_site)`,
    `CREATE INDEX IF NOT EXISTS idx_workspace_msgs ON workspace_messages(account_id, channel_id, created_at)`,
    // File attachments for workspace messages
    `CREATE TABLE IF NOT EXISTS workspace_attachments (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      uploader_id TEXT,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_data TEXT,
      file_size INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_push_account ON push_subscriptions(account_id)`,
    `CREATE TABLE IF NOT EXISTS google_calendar_tokens (
      user_id TEXT PRIMARY KEY,
      account_id TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS account_members (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      invited_email TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_id, user_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_members_account ON account_members(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_members_user ON account_members(user_id)`,
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS assigned_to TEXT`,
  ];
  for (const sql of newTables) { try { await db.execute(sql); } catch(e) { if (!e.message?.includes('already exists')) console.warn('Schema:', e.message?.slice(0,80)); } }

  console.log('✓ Database initialized');
}

// ── Schema additions for V2 features ─────────────────────────────
export async function initSchemaV2() {

  // F1: Granular read tracking — extend invoices + add engagement log
  const invoiceCols = [
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminded_at TEXT`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_reminder_sent_at TIMESTAMP`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivered_at TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS opened_at TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS first_viewed_at TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_view_seconds INTEGER DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS clicked_pay_at TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS read_status TEXT DEFAULT 'sent'`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe'`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate REAL DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount REAL DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS processing_fee REAL DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS net_amount REAL DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email TEXT`,
  ];

  // invoice_items: quantity, tax per line item
  const newItemCols = [
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS quantity REAL DEFAULT 1`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit_price REAL DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_rate REAL DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_amount REAL DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS line_total REAL DEFAULT 0`,
  ];
  for (const sql of newItemCols) {
    try { await db.execute(sql); } catch (e) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) throw e;
    }
  }

  // accounts: tax settings
  const newAccountCols = [
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS default_tax_rate REAL DEFAULT 0`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tax_name TEXT DEFAULT 'Sales Tax'`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tax_number TEXT`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS business_address TEXT`,
  ];
  for (const sql of newAccountCols) {
    try { await db.execute(sql); } catch (e) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) throw e;
    }
  }
  for (const sql of invoiceCols) { try { await db.execute(sql); } catch {} }

  // F1: Engagement event log
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_engagement (
      id SERIAL PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      event TEXT NOT NULL,
      ts TEXT DEFAULT (NOW()::text),
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
      created_at TEXT DEFAULT (NOW()::text),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // F3: Client payment behavior history
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payment_behavior (
      id SERIAL PRIMARY KEY,
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
  try { await db.execute(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS line_status TEXT DEFAULT 'pending'`); } catch {}
  try { await db.execute(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS line_paid_at TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT`); } catch {}

  // F9: Invoice versioning
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1`); } catch {}
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_group_id TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_latest INTEGER DEFAULT 1`); } catch {}
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS parent_invoice_id TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS change_summary TEXT`); } catch {}

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
      created_at TEXT DEFAULT (NOW()::text),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // F10: Cached cashflow predictions (refreshed on demand)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cashflow_cache (
      id SERIAL PRIMARY KEY,
      account_id TEXT NOT NULL UNIQUE,
      data_json TEXT,
      computed_at TEXT DEFAULT (NOW()::text),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // quotes: tax columns
  const quoteTaxCols = [
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tax_rate REAL DEFAULT 0`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tax_amount REAL DEFAULT 0`,
  ];
  for (const sql of quoteTaxCols) {
    try { await db.execute(sql); } catch (e) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) throw e;
    }
  }


  // ── Add signature columns to quotes ────────────────────────────
  const sigCols = [
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signature_data TEXT`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signer_name TEXT`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signer_ip TEXT`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signed_at TEXT`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_paid REAL DEFAULT 0`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_stripe_id TEXT`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS selected_package TEXT`,
  ];
  for (const sql of sigCols) {
    try { await db.execute(sql); } catch(e) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) throw e;
    }
  }

  // ── Automation sequences ────────────────────────────────────────
  await db.execute(`CREATE TABLE IF NOT EXISTS automation_sequences (
    id          TEXT PRIMARY KEY,
    account_id  TEXT NOT NULL REFERENCES accounts(id),
    name        TEXT NOT NULL,
    trigger     TEXT NOT NULL, -- quote_viewed|quote_ignored|invoice_overdue|deposit_unpaid|repeat_customer
    active      INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (NOW()::text)
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS automation_steps (
    id              TEXT PRIMARY KEY,
    sequence_id     TEXT NOT NULL REFERENCES automation_sequences(id) ON DELETE CASCADE,
    step_order      INTEGER NOT NULL,
    delay_hours     INTEGER DEFAULT 24,
    channel         TEXT DEFAULT 'email', -- email|sms
    subject         TEXT,
    body            TEXT NOT NULL,
    ai_generated    INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (NOW()::text)
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS automation_runs (
    id          TEXT PRIMARY KEY,
    sequence_id TEXT NOT NULL REFERENCES automation_sequences(id),
    step_id     TEXT NOT NULL REFERENCES automation_steps(id),
    invoice_id  TEXT REFERENCES invoices(id),
    quote_id    TEXT REFERENCES quotes(id),
    contact_id  TEXT REFERENCES contacts(id),
    status      TEXT DEFAULT 'pending', -- pending|sent|failed|skipped
    scheduled_at TEXT,
    sent_at     TEXT,
    error       TEXT,
    created_at  TEXT DEFAULT (NOW()::text)
  )`);

  // ── CRM: contact notes + activity timeline ──────────────────────
  await db.execute(`CREATE TABLE IF NOT EXISTS contact_notes (
    id          TEXT PRIMARY KEY,
    contact_id  TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    account_id  TEXT NOT NULL,
    note        TEXT NOT NULL,
    note_type   TEXT DEFAULT 'manual', -- manual|ai_summary|call|email|visit
    created_at  TEXT DEFAULT (NOW()::text)
  )`);

  // Add CRM fields to contacts if missing
  const crmCols = [
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]'`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lifetime_value REAL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contact_at TEXT`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS close_probability REAL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS customer_since TEXT`,
  ];
  for (const sql of crmCols) {
    try { await db.execute(sql); } catch(e) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) throw e;
    }
  }

  // ── Analytics events (section tracking) ────────────────────────
  await db.execute(`CREATE TABLE IF NOT EXISTS analytics_events (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id  TEXT,
    quote_id    TEXT REFERENCES quotes(id),
    invoice_id  TEXT REFERENCES invoices(id),
    contact_id  TEXT REFERENCES contacts(id),
    event_type  TEXT NOT NULL, -- quote_view|section_view|pricing_click|accept|reject|link_click
    section     TEXT,
    duration_ms INTEGER DEFAULT 0,
    metadata    TEXT DEFAULT '{}',
    ip          TEXT,
    ua          TEXT,
    created_at  TEXT DEFAULT (NOW()::text)
  )`);

  console.log('✓ Schema V2 initialized');
}


// ── Force-create workspace tables (safe to call multiple times) ───
export async function ensureWorkspaceTables() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS workspace_channels (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_private INTEGER DEFAULT 0,
      description TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS workspace_messages (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      content TEXT NOT NULL,
      sender_name TEXT,
      sender_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ws_channels_account ON workspace_channels(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ws_msgs_channel ON workspace_messages(account_id, channel_id, created_at)`,
  ];
  for (const sql of stmts) {
    try { await db.execute(sql); } catch(e) {
      if (!e.message?.includes('already exists')) console.warn('Workspace migration:', e.message?.slice(0,100));
    }
  }
  console.log('✓ Workspace tables ready');
}

// ── Migrate calendar_events table with new columns ─────────────────

// ── Full User Profile & Presence System ──────────────────────────
export async function migrateUserProfileSystem() {
  const migrations = [
    // Rename 'desc' reserved word column to 'description' in workspace_channels
    // Uses quoted identifier to handle the reserved keyword; safe to fail if already renamed
    `ALTER TABLE workspace_channels RENAME COLUMN "desc" TO description`,
    // Add reply_to to workspace_messages
    `ALTER TABLE workspace_messages ADD COLUMN IF NOT EXISTS reply_to TEXT`,
    // Add discount_pct to automation_steps if missing
    `ALTER TABLE automation_steps ADD COLUMN IF NOT EXISTS discount_pct TEXT DEFAULT '10'`,
    // Add trial_reminder_sent_at to accounts if missing
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_reminder_sent_at TIMESTAMPTZ`,
    // Add username to user_profiles
    `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username TEXT`,
    
    // Add invite_token + accept tracking to account_members
    `ALTER TABLE account_members ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE`,
    `ALTER TABLE account_members ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE account_members ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`,
    `ALTER TABLE account_members ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ`,
    `ALTER TABLE account_members ADD COLUMN IF NOT EXISTS invite_accepted_by_user_id TEXT`,

    // User profiles table - full directory profile per user
    `CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      display_name TEXT,
      username TEXT UNIQUE,
      avatar_url TEXT,
      title TEXT,
      phone TEXT,
      bio TEXT,
      timezone TEXT DEFAULT 'America/Chicago',
      notification_email BOOLEAN DEFAULT TRUE,
      notification_push BOOLEAN DEFAULT TRUE,
      notification_mentions BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Presence / online status table
    `CREATE TABLE IF NOT EXISTS user_presence (
      user_id TEXT PRIMARY KEY,
      account_id TEXT,
      status TEXT DEFAULT 'offline',
      custom_status TEXT,
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      last_active TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Notification log table (sent notifications audit trail)
    `CREATE TABLE IF NOT EXISTS notification_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT,
      type TEXT NOT NULL,
      title TEXT,
      body TEXT,
      url TEXT,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_notif_user ON notification_log(user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_presence_account ON user_presence(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profiles_user ON user_profiles(user_id)`,
  ];

  for (const sql of migrations) {
    try {
      await db.execute(sql);
    } catch (e) {
      const msg = e.message || '';
      // Suppress expected migration errors (idempotent operations)
      const isExpected = 
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        msg.includes('does not exist') ||    // column already renamed
        msg.includes('syntax error') ||       // reserved word issue resolved in live DB
        msg.includes('column') && msg.includes('of relation');
      if (!isExpected) {
        console.warn('[Profile Migration]', msg.slice(0, 100));
      }
    }
  }
  console.log('✓ User profile system migrated');
}

export async function migrateCalendarEvents() {
  const cols = [
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_time TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Job'`,
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#2563EB'`,
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS assigned_to TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS tags TEXT`,
  ];
  for (const sql of cols) {
    try { await db.execute(sql); } catch(e) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
        console.warn('Calendar migration:', e.message?.slice(0,80));
      }
    }
  }
}

export async function initStripeConnect() {
  // Ensure all Stripe Connect columns exist
  const cols = [
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_account_id TEXT`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_onboarded INTEGER DEFAULT 0`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_charges_enabled INTEGER DEFAULT 0`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_payouts_enabled INTEGER DEFAULT 0`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_connect_email TEXT`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS platform_fee_pct REAL DEFAULT 0`,
  ];
  for (const sql of cols) { try { await db.execute(sql); } catch {} }
  console.log('✓ Stripe Connect columns ready');
}
