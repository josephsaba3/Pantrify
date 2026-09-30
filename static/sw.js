// Network-first service worker: always show fresh data when online,
// fall back to the last copy seen when the shop has no signal.
// Assets are matched ignoring ?v= so cache-busting versions still hit offline.
const CACHE = 'pantrify-v1';
const SHELL = [
  '/',
  '/static/styles.css',
  '/static/autocomplete.css',
  '/static/new-list-dialog.css',
  '/static/cute-toggle.css',
  '/static/app.js',
  '/static/manifest.webmanifest',
  '/static/icons/icon-192.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/tabletennis')) return;
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })
        .then(cached => cached || (request.mode === 'navigate' ? caches.match('/') : Response.error())))
  );
});
