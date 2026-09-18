// M4 service worker: versioned offline-first cache for the app shell
// (same-origin GET only). The WAD cache ('doom-wad-v1') is owned by the
// storage layer and is NEVER evicted here: activate only retires older
// shell versions (keys starting with 'doom-m'), leaving every other
// cache (WAD bytes, browser internals) untouched.
const VERSION = 'doom-m4-v1';
const SHELL = ['./', './index.html', './app.js', './theme.css'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION && k.startsWith('doom-m')).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(event.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html'))),
  );
});
