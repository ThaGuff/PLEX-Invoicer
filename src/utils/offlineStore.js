/**
 * offlineStore.js — IndexedDB wrapper for offline quote creation
 * Stores quotes locally when no internet, syncs when back online
 */

const DB_NAME = 'invoiceking-offline';
const DB_VERSION = 1;
const STORE_DRAFTS = 'offline_drafts';
const STORE_QUEUE  = 'sync_queue';

let db = null;

async function openDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_DRAFTS)) {
        const drafts = database.createObjectStore(STORE_DRAFTS, { keyPath: 'id' });
        drafts.createIndex('account_id', 'account_id', { unique: false });
        drafts.createIndex('updated_at', 'updated_at', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORE_QUEUE)) {
        database.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraftOffline(draft) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_DRAFTS, 'readwrite');
    const entry = { ...draft, id: draft.id || 'draft-' + Date.now(), updated_at: new Date().toISOString(), __offline: true };
    tx.objectStore(STORE_DRAFTS).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDraftOffline(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const req = database.transaction(STORE_DRAFTS, 'readonly').objectStore(STORE_DRAFTS).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllDraftsOffline(accountId) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const store = database.transaction(STORE_DRAFTS, 'readonly').objectStore(STORE_DRAFTS);
    const req = accountId ? store.index('account_id').getAll(accountId) : store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDraftOffline(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_DRAFTS, 'readwrite');
    tx.objectStore(STORE_DRAFTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueForSync(entry) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).put({ ...entry, id: entry.id || Date.now().toString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSyncQueue() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const req = database.transaction(STORE_QUEUE, 'readonly').objectStore(STORE_QUEUE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearSyncQueueItem(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Network status
export const isOnline = () => navigator.onLine;

export function onNetworkChange(callback) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
  return () => {
    window.removeEventListener('online', () => callback(true));
    window.removeEventListener('offline', () => callback(false));
  };
}

// Sync offline queue when back online
export async function syncOfflineQueue(token) {
  const queue = await getSyncQueue();
  const results = [];
  for (const item of queue) {
    try {
      const r = await fetch(item.url, {
        method: item.method,
        headers: { ...item.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });
      if (r.ok) {
        await clearSyncQueueItem(item.id);
        results.push({ id: item.id, status: 'synced' });
      }
    } catch {
      results.push({ id: item.id, status: 'failed' });
    }
  }
  return results;
}
