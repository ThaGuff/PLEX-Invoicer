/**
 * Database client — Supabase PostgreSQL via REST (primary) or local SQLite (dev)
 *
 * PRIMARY: Supabase REST API using service_role key
 *   - No direct PG connection needed (no password issues, no IPv6 problems)
 *   - Uses SUPABASE_URL + SUPABASE_SERVICE_KEY (already confirmed working)
 *   - If SUPABASE_DB_URL or SUPABASE_POOLER_URL is set, uses direct PG as fallback
 *
 * DEV: Local SQLite via @libsql/client
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Supabase REST adapter ──────────────────────────────────────────
// Translates SQL-style execute() calls to Supabase PostgREST API
// This uses the service_role JWT — no DB password required
class SupabaseRestAdapter {
  constructor(url, serviceKey) {
    this.url = url.replace(/\/$/, '');
    this.key = serviceKey;
    this.headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }

  async execute(sql, params = []) {
    // Use Supabase's /rest/v1/rpc for raw SQL via stored procedure
    // OR for simple queries, use the table endpoints directly
    // For complex SQL, use the pg REST extension
    
    // Replace ? params with $1, $2 etc
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    
    // Call the pg extension's sql endpoint
    const res = await fetch(`${this.url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query: pgSql, params: params }),
    });

    if (!res.ok) {
      // Fallback: try the /pg endpoint
      const res2 = await fetch(`${this.url}/pg?statement=${encodeURIComponent(pgSql)}`, {
        headers: { ...this.headers, 'Prefer': '' },
      });
      if (res2.ok) {
        const data = await res2.json();
        return { rows: Array.isArray(data) ? data : [], columns: [], rowsAffected: data?.length || 0 };
      }
      
      const errText = await res.text();
      throw new Error(`DB query failed: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return {
      rows: Array.isArray(data) ? data : (data?.result || []),
      columns: [],
      rowsAffected: Array.isArray(data) ? data.length : 0,
    };
  }
}

// ── PostgreSQL adapter (direct connection) ─────────────────────────
class PgAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  async execute(sql, params = []) {
    let pgSql = sql;
    let i = 0;
    pgSql = pgSql.replace(/\?/g, () => `$${++i}`);
    pgSql = pgSql
      .replace(/datetime\('now'\)/gi, "NOW()")
      .replace(/CURRENT_TIMESTAMP/gi, "NOW()")
      .replace(/GROUP_CONCAT\(([^,)]+),\s*'([^']+)'\)/gi, "STRING_AGG($1::text, '$2')")
      .replace(/GROUP_CONCAT\(([^)]+)\)/gi, "STRING_AGG($1::text, ',')")
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, "SERIAL PRIMARY KEY")
      .replace(/julianday\(([^)]+)\)/gi, (_, v) => `EXTRACT(EPOCH FROM (${v})::timestamp)/86400`)
      .replace(/CAST\(([^)]+) AS REAL\)/gi, "CAST($1 AS FLOAT)")
      .replace(/INSERT OR IGNORE INTO (\w+)/gi, "INSERT INTO $1")
      .replace(/ON CONFLICT\(([^)]+)\) DO NOTHING/gi, "ON CONFLICT ($1) DO NOTHING");

    try {
      const result = await this.pool.query(pgSql, params);
      return {
        rows: result.rows || [],
        columns: result.fields?.map(f => f.name) || [],
        rowsAffected: result.rowCount || 0,
      };
    } catch (e) {
      e.sql = pgSql.slice(0, 200);
      throw e;
    }
  }
}

// ── SQLite adapter (dev only) ──────────────────────────────────────
class SqliteAdapter {
  constructor(client) {
    this.client = client;
  }

  async execute(sql, params = []) {
    let sqliteSql = sql
      .replace(/NOW\(\)::text/gi, "datetime('now')")
      .replace(/NOW\(\)::timestamp/gi, "datetime('now')")
      .replace(/NOW\(\)/gi, "datetime('now')")
      .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/CAST\(([^)]+) AS FLOAT\)/gi, 'CAST($1 AS REAL)')
      .replace(/INSERT INTO (\w+) \(([^)]+)\) ON CONFLICT DO NOTHING/gi, 'INSERT OR IGNORE INTO $1 ($2)')
      .replace(/ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS/gi, 'ALTER TABLE $1 ADD COLUMN')
      .replace(/::(text|timestamp|timestamptz|float|real|int|integer|bigint|boolean|date|uuid)/gi, '')
      .replace(/INTERVAL '(\d+) days'/gi, (_, n) => `${n} days`)
      .replace(/NOW\(\) \+ INTERVAL '(\d+) days'/gi, (_, n) => `datetime('now', '+${n} days')`)
      .replace(/NOW\(\) - INTERVAL '(\d+) hours'/gi, (_, n) => `datetime('now', '-${n} hours')`);

    try {
      const result = await this.client.execute({ sql: sqliteSql, args: params });
      return {
        rows: result.rows || [],
        columns: result.columns || [],
        rowsAffected: result.rowsAffected || 0,
      };
    } catch (e) {
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

const hasDirectPg = !!(process.env.SUPABASE_POOLER_URL || process.env.SUPABASE_DB_URL);
const hasSupabaseRest = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

if (hasDirectPg) {
  // Direct PostgreSQL via pg Pool — fastest, most compatible
  const { default: pg } = await import('pg');
  const { Pool } = pg;

  const connStr = process.env.SUPABASE_POOLER_URL || process.env.SUPABASE_DB_URL;

  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    family: 4, // Force IPv4 — avoids Railway IPv6 issues with Supabase
  });

  db = new PgAdapter(pool);
  dbType = 'supabase-pg';

  pool.connect()
    .then(client => {
      client.release();
      console.log('🔒 Database: Supabase PostgreSQL direct ✓');
    })
    .catch(e => {
      console.error('⚠️  PostgreSQL connection failed:', e.message);
      console.error('   Check SUPABASE_POOLER_URL or SUPABASE_DB_URL in Railway Variables');
    });

} else {
  // Local SQLite — dev only
  const { createClient } = await import('@libsql/client');
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/plex.db');
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const client = createClient({ url: `file:${DB_PATH}` });
  db = new SqliteAdapter(client);
  dbType = 'sqlite';

  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID) {
    console.error('🚨 FATAL: Running on Railway without SUPABASE_POOLER_URL set.');
    console.error('   Set SUPABASE_POOLER_URL in Railway Variables:');
    console.error('   Get it from Supabase → Database → Connection Pooler → Session mode');
    setInterval(() => {
      console.error('🚨 NO PERSISTENT DATABASE — DATA IS NOT BEING SAVED');
    }, 60000);
  } else {
    console.log('📁 Database: Local SQLite (dev mode)');
  }
}

export { db, dbType };
