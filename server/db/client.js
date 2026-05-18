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
      .replace(/datetime\('now'\)/gi,           'NOW()')
      .replace(/CURRENT_TIMESTAMP/gi,            'NOW()')
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
      .replace(/\bINTEGER\b(?=\s+DEFAULT\s+0)/gi,    'SMALLINT')  // boolean-like integers
      .replace(/julianday\(([^)]+)\)/gi,         (_, v) => `EXTRACT(EPOCH FROM ${v}::timestamp)/86400`)
      .replace(/CAST\(([^)]+) AS REAL\)/gi,      'CAST($1 AS FLOAT)')
      .replace(/INSERT OR IGNORE/gi,             'INSERT')
      .replace(/ON CONFLICT\(([^)]+)\) DO NOTHING/gi, 'ON CONFLICT ($1) DO NOTHING')
      // SQLite uses ON CONFLICT(...) DO UPDATE SET — PostgreSQL too, keep as-is
      ;

    // Fix INSERT OR IGNORE that doesn't have ON CONFLICT clause — add it
    // We handle this case-by-case where needed

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
    const result = await this.client.execute({ sql, args: params });
    return {
      rows:         result.rows || [],
      columns:      result.columns || [],
      rowsAffected: result.rowsAffected || 0,
    };
  }
}

// ── Connect to the right database ─────────────────────────────────
let db;
let dbType;

if (process.env.SUPABASE_DB_URL) {
  // ✅ Supabase PostgreSQL — persistent, survives all Railway deploys
  const { default: pg } = await import('pg');
  const { Pool } = pg;

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Test the connection
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('🔒 Database: Supabase PostgreSQL (persistent — data survives deploys)');
  } catch (e) {
    console.error('❌ Supabase DB connection failed:', e.message);
    console.error('   Check SUPABASE_DB_URL in Railway env vars');
    process.exit(1);
  }

  db = new PgAdapter(pool);
  dbType = 'supabase';

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

  if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
    console.warn('⚠️  WARNING: Using local SQLite in production — ALL DATA LOST ON EVERY DEPLOY');
    console.warn('   Set SUPABASE_DB_URL in Railway to use your Supabase PostgreSQL database');
  } else {
    console.log('📁 Database: Local SQLite (dev mode)');
  }
}

export { db, dbType };
