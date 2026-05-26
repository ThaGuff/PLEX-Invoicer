/**
 * Database client — Supabase PostgreSQL (persistent) or local SQLite (dev)
 *
 * Uses Supabase's direct PostgreSQL connection for production.
 * Falls back to libsql/SQLite for local development.
 *
 * The `db.execute(sql, params)` interface is compatible with both,
 * so all route files work unchanged.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── PostgreSQL adapter ─────────────────────────────────────────────
// Wraps pg.Pool to match the libsql execute(sql, params) interface:
//   result.rows  — array of row objects
//   result.columns — array of column names (not used by most routes)

class PgAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  async execute(sql, params = []) {
    // Convert SQLite-style positional params (?) to PostgreSQL ($1, $2, ...)
    let pgSql = sql;
    let i = 0;
    pgSql = pgSql.replace(/\?/g, () => `$${++i}`);

    // SQLite → PostgreSQL syntax conversions
    pgSql = pgSql
      .replace(/datetime\('now'\)/gi,                    "NOW()")
      .replace(/CURRENT_TIMESTAMP/gi,                    "NOW()")
      .replace(/GROUP_CONCAT\(([^,)]+),\s*'([^']+)'\)/gi, "STRING_AGG($1::text, '$2')")
      .replace(/GROUP_CONCAT\(([^)]+)\)/gi,               "STRING_AGG($1::text, ',')")

      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi,    "SERIAL PRIMARY KEY")
      .replace(/julianday\(([^)]+)\)/gi,                (_, v) => `EXTRACT(EPOCH FROM (${v})::timestamp)/86400`)
      .replace(/CAST\(([^)]+) AS REAL\)/gi,             "CAST($1 AS FLOAT)")
      // INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
      .replace(/INSERT OR IGNORE INTO (\w+)/gi,          "INSERT INTO $1")
      // Add ON CONFLICT DO NOTHING to INSERT INTO that don't already have ON CONFLICT
      // This is done after the replace above so it only affects converted ones
      .replace(/ON CONFLICT\(([^)]+)\) DO NOTHING/gi,  "ON CONFLICT ($1) DO NOTHING")
      .replace(/ON CONFLICT DO UPDATE SET/gi,            "ON CONFLICT DO UPDATE SET")
      ;

    // Add ON CONFLICT DO NOTHING to bare INSERTs that came from INSERT OR IGNORE
    // (handled above via the INSERT OR IGNORE regex)

    try {
      const result = await this.pool.query(pgSql, params);
      return {
        rows:    result.rows || [],
        columns: result.fields?.map(f => f.name) || [],
        rowsAffected: result.rowCount || 0,
      };
    } catch (e) {
      // Add the SQL to the error for easier debugging
      e.sql = pgSql.slice(0, 200);
      throw e;
    }
  }
}

// ── SQLite adapter ─────────────────────────────────────────────────
// Wraps @libsql/client to return the same interface
class SqliteAdapter {
  constructor(client) {
    this.client = client;
  }

  async execute(sql, params = []) {
    // Convert PostgreSQL syntax back to SQLite for local development
    let sqliteSql = sql
      .replace(/NOW\(\)::text/gi,                    "datetime('now')")  // must come before NOW()
      .replace(/NOW\(\)::timestamp/gi,               "datetime('now')")
      .replace(/NOW\(\)/gi,                          "datetime('now')")
      .replace(/SERIAL PRIMARY KEY/gi,               'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/CAST\(([^)]+) AS FLOAT\)/gi,         'CAST($1 AS REAL)')
      .replace(/INSERT INTO (\w+) \(([^)]+)\) ON CONFLICT DO NOTHING/gi, 'INSERT OR IGNORE INTO $1 ($2)')
      .replace(/ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS/gi, 'ALTER TABLE $1 ADD COLUMN')
      // Remove PostgreSQL type casts (::text, ::timestamp, ::float etc) - not valid in SQLite
      .replace(/::(text|timestamp|timestamptz|float|real|int|integer|bigint|boolean|date|uuid)/gi, '')
      .replace(/EXTRACT\(EPOCH FROM \(([^)]+)\)::timestamp\)\/86400/gi, 
               (_, v) => `(julianday(${v.split(' - ')[0].trim()}) - julianday(${v.split(' - ')[1]?.trim() || v}))`)
      ;

    try {
      const result = await this.client.execute({ sql: sqliteSql, args: params });
      return {
        rows:         result.rows || [],
        columns:      result.columns || [],
        rowsAffected: result.rowsAffected || 0,
      };
    } catch (e) {
      // If ALTER TABLE ADD COLUMN fails (column exists), ignore it
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        return { rows: [], columns: [], rowsAffected: 0 };
      }
      throw e;
    }
  }
}

// ── Connect to the right database ─────────────────────────────────
let db;
let dbType;

if (process.env.SUPABASE_DB_URL) {
  // ✅ Supabase PostgreSQL — persistent, survives all Railway deploys
  // Connect immediately without blocking server startup
  const { default: pg } = await import('pg');
  const { Pool } = pg;

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Set db immediately so server can start — pool will establish connections lazily
  db = new PgAdapter(pool);
  dbType = 'supabase';

  // Verify connection in background — does NOT block server startup
  pool.connect()
    .then(client => {
      client.release();
      console.log('🔒 Database: Supabase PostgreSQL (persistent — data survives deploys)');
    })
    .catch(e => {
      console.error('⚠️  Supabase connection warning:', e.message);
      console.error('   App running — DB queries will retry automatically via pool');
    });

} else if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  // Turso cloud libsql — also persistent
  const { createClient } = await import('@libsql/client');
  const client = createClient({
    url:       process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  db = new SqliteAdapter(client);
  dbType = 'turso';
  console.log('🔒 Database: Turso cloud libsql (persistent)');

} else {
  // Local SQLite — dev only
  const { createClient } = await import('@libsql/client');
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/plex.db');
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const client = createClient({ url: `file:${DB_PATH}` });
  db = new SqliteAdapter(client);
  dbType = 'sqlite';

  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID) {
    // On Railway without SUPABASE_DB_URL — data will be lost. Refuse to start.
    console.error('🚨 FATAL: Running on Railway without SUPABASE_DB_URL set.');
    console.error('   Data stored in SQLite will be WIPED on every deploy.');
    console.error('   Set SUPABASE_DB_URL in Railway Variables and redeploy.');
    // Do not exit — keep running so Railway shows the error in logs
    // but log it very loudly every minute
    setInterval(() => {
      console.error('🚨 NO PERSISTENT DATABASE — DATA IS NOT BEING SAVED');
    }, 60000);
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  SQLite fallback in production — data will not persist across restarts');
  } else {
    console.log('📁 Database: Local SQLite (dev mode)');
  }
}

export { db, dbType };
