/**
 * Continuous database health monitor
 * - Runs every 30 seconds
 * - Verifies DB connection is alive
 * - Logs warnings if DB is degraded
 * - Never crashes the server
 */

import { db, dbType } from './client.js';

let consecutiveFailures = 0;
let lastSuccessAt = Date.now();
let isHealthy = true;

export function getDbHealth() {
  return {
    healthy: isHealthy,
    type: dbType,
    persistent: dbType === 'supabase',
    lastSuccessAt: new Date(lastSuccessAt).toISOString(),
    consecutiveFailures,
  };
}

export function startDbHealthMonitor() {
  const check = async () => {
    try {
      await db.execute('SELECT 1');
      consecutiveFailures = 0;
      lastSuccessAt = Date.now();
      if (!isHealthy) {
        console.log('✅ Database connection restored');
        isHealthy = true;
      }
    } catch (e) {
      consecutiveFailures++;
      isHealthy = false;
      console.error(`⚠️  DB health check failed (${consecutiveFailures} in a row): ${e.message}`);
      if (consecutiveFailures === 3) {
        console.error('🚨 CRITICAL: Database has been unreachable for 90+ seconds');
      }
    }
  };

  // Start immediately then every 30s
  check();
  return setInterval(check, 30000);
}
