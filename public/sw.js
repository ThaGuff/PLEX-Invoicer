/**
 * Revanew Service Worker
 * Enables: offline support, install prompt, background sync
 * Strategy: Cache-first for assets, Network-first for API calls
 */

const CACHE_NAME   = 'revanew-v1';
const STATIC_CACHE = 'revanew-static-v1';
const API_CACHE    = 'revanew-api-v1';

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ───────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and chrome-extension requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (request.url.startsWith('chrome-extension://')) return;

  // API calls: Network-first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: Cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // HTML navigation: Network-first, cache fallback (SPA shell)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match('/') // Return app shell for offline navigation
        )
    );
    return;
  }
});

// ── Push notifications ─────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Revanew', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Revanew', {
      body:    payload.body    || '',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-96.png',
      tag:     payload.tag    || 'revanew-notification',
      data:    payload.data   || {},
      actions: payload.actions || [],
      vibrate: [200, 100, 200],
      requireInteraction: payload.requireInteraction || false,
    })
  );
});

// ── Notification click ────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        const existing = windowClients.find(c => c.url.includes(self.location.origin));
        if (existing) { existing.focus(); existing.navigate(url); return; }
        clients.openWindow(url);
      })
  );
});

// ── Background sync ───────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  // TODO: Sync any offline-queued quote/invoice actions
  console.log('[SW] Background sync fired');
}
