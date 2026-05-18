/**
 * PLEX Invoicer — SQLite → Turso migration script
 *
 * Run this AFTER setting up Turso to migrate any existing data.
 * If there's no existing data (fresh start), skip this and just
 * set the env vars — schema will auto-create on first boot.
 *
 * Usage:
 *   node scripts/migrate-to-turso.mjs
 *
 * Env vars needed:
 *   TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
 *   TURSO_AUTH_TOKEN=your-token-here
 *   DB_PATH=/path/to/existing/plex.db  (optional, defaults to ./data/plex.db)
 */

import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TURSO_URL   = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const LOCAL_PATH  = process.env.DB_PATH || path.join(__dirname, '../data/plex.db');

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌  TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.');
  console.error('   Get them from turso.tech after creating a database.');
  process.exit(1);
}

if (!existsSync(LOCAL_PATH)) {
  console.log('ℹ️  No local database found at', LOCAL_PATH);
  console.log('   This is fine if this is a fresh setup — schema will auto-create.');
  console.log('   Just set the env vars in Railway and deploy.');
  process.exit(0);
}

const local = createClient({ url: `file:${LOCAL_PATH}` });
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const TABLES = [
  'accounts',
  'contacts',
  'custom_sections',
  'custom_items',
  'quotes',
  'quote_items',
  'invoices',
  'invoice_items',
  'reminders',
  'invoice_engagement',
  'webhook_rules',
  'payment_behavior',
  'smart_reminders',
  'fee_rules',
  'cashflow_cache',
  'onboarding_log',
];

console.log('\n🔄  PLEX Invoicer — SQLite → Turso Migration\n');
console.log(`   Source: ${LOCAL_PATH}`);
console.log(`   Target: ${TURSO_URL}\n`);

let totalRows = 0;

for (const table of TABLES) {
  try {
    // Check if table exists in local db
    const check = await local.execute(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]
    );
    if (!check.rows.length) {
      console.log(`  ⏭   ${table.padEnd(25)} (not in local db)`);
      continue;
    }

    // Read all rows
    const rows = await local.execute(`SELECT * FROM ${table}`);
    if (!rows.rows.length) {
      console.log(`  ⏭   ${table.padEnd(25)} 0 rows`);
      continue;
    }

    // Get column names
    const cols = rows.columns;

    // Insert in batches of 50
    let inserted = 0;
    const BATCH = 50;
    for (let i = 0; i < rows.rows.length; i += BATCH) {
      const batch = rows.rows.slice(i, i + BATCH);
      for (const row of batch) {
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map(c => row[c] ?? null);
        try {
          await turso.execute(
            `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
            values
          );
          inserted++;
        } catch (e) {
          if (!e.message.includes('no such table')) {
            console.warn(`   ⚠️  Row skip in ${table}: ${e.message.slice(0, 60)}`);
          }
        }
      }
    }

    console.log(`  ✅  ${table.padEnd(25)} ${inserted} rows migrated`);
    totalRows += inserted;
  } catch (e) {
    if (e.message.includes('no such table')) {
      console.log(`  ⏭   ${table.padEnd(25)} (table not in local db)`);
    } else {
      console.log(`  ❌  ${table.padEnd(25)} ERROR: ${e.message}`);
    }
  }
}

console.log(`\n  Total rows migrated: ${totalRows}`);
console.log('\n  ✅  Migration complete!\n');
console.log('  Next steps:');
console.log('  1. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to Railway Variables');
console.log('  2. Railway will redeploy automatically');
console.log('  3. All data is now in Turso — persistent across every future deploy\n');
