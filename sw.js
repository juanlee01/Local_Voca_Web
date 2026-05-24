/* ==========================================================================
   VocaFlow - PWA Service Worker (Offline Cache Engine)
   ========================================================================== */

const CACHE_SHELL_NAME = 'vocaflow-shell-v2';
const CACHE_DATA_NAME = 'vocaflow-data-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './index.css',
  './manifest.json',
  './js/app.js',
  './js/router.js',
  './js/state.js',
  './js/db.js',
  './js/tts.js',
  './js/views/dashboard.js',
  './js/views/study.js',
  './js/views/quiz.js',
  './js/views/words.js',
  './js/views/search.js',
  './js/views/settings.js',
  './fonts/inter-400.woff2',
  './fonts/inter-700.woff2',
  './fonts/outfit-400.woff2',
  './fonts/outfit-700.woff2'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_SHELL_NAME).then(cache => {
      console.log('Service Worker: Pre-caching application shell...');
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_SHELL_NAME && key !== CACHE_DATA_NAME) {
            console.log('Service Worker: Clearing obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Strategy for Vocabulary JSON Data files: Stale-While-Revalidate
  if (requestUrl.pathname.includes('/data/vocabulary/')) {
    event.respondWith(
      caches.open(CACHE_DATA_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            console.warn('SW fetch failed (offline mode):', err);
          });
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategy for Static Shell Assets & Fonts: Cache-First, fallback to network
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        // Cache newly fetched static assets on the fly if they are first-party
        if (networkResponse.ok && requestUrl.origin === self.location.origin) {
          const isAsset = SHELL_ASSETS.some(asset => event.request.url.endsWith(asset.replace(/^\.\//, '')));
          if (isAsset) {
            return caches.open(CACHE_SHELL_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
        }
        return networkResponse;
      });
    })
  );
});
