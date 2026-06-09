/**
 * Invoice King Service Worker — Offline Mode
 * Caches core app shell + API responses
 * Queues quote creation/edits when offline for sync when back online
 */
const CACHE_VERSION = 'invoiceking-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const API_CACHE     = `${CACHE_VERSION}-api`;

// Core app shell files to cache for offline
const PRECACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon.svg',
  '/logo-invoiceking.png',
  '/manifest.json',
];

// API routes to cache for offline reading
const CACHE_API_PATTERNS = [
  /\/api\/accounts/,
  /\/api\/contacts/,
  /\/api\/quotes\?/,
  /\/api\/invoices\?/,
];

// Queue for offline mutations (quote create/edit)
const SYNC_QUEUE_NAME = 'invoiceking-offline-queue';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== API_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET non-same-origin requests (except our API)
  if (url.origin !== self.location.origin && !url.hostname.includes('invoiceking.app')) return;

  // For navigation requests — serve index.html from cache (SPA routing)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For GET API calls — network first, fall back to cache
  if (request.method === 'GET' && CACHE_API_PATTERNS.some(p => p.test(url.pathname))) {
    e.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For POST/PATCH (quote creation) while offline — queue for sync
  if ((request.method === 'POST' || request.method === 'PATCH') && url.pathname.startsWith('/api/quotes')) {
    e.respondWith(
      fetch(request.clone()).catch(async () => {
        // We're offline — queue this for later
        const body = await request.clone().json().catch(() => ({}));
        const queueEntry = {
          id: Date.now() + '-' + Math.random().toString(36).slice(2),
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
          body,
          timestamp: new Date().toISOString(),
        };
        // Notify clients to store in IndexedDB
        const clients = await self.clients.matchAll();
        clients.forEach(c => c.postMessage({ type: 'OFFLINE_QUEUE', entry: queueEntry }));
        // Return an optimistic response
        return new Response(JSON.stringify({
          __offline: true,
          __queueId: queueEntry.id,
          id: 'offline-' + queueEntry.id,
          message: 'Saved offline. Will sync when connection is restored.',
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 202,
        });
      })
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && request.method === 'GET') {
        caches.open(STATIC_CACHE).then(cache => cache.put(request, response.clone()));
      }
      return response;
    })).catch(() => caches.match('/index.html'))
  );
});

// Handle background sync
self.addEventListener('sync', (e) => {
  if (e.tag === SYNC_QUEUE_NAME) {
    e.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.postMessage({ type: 'SYNC_START' }));
}
