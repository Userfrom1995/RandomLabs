/* Tabula offline shell (Phase 5): versioned cache over the full shell.
 * Scope is /tabula/ so previews never leak. Version bump on every
 * shell change; old caches are purged on activate. Network-first for
 * navigations is deliberately NOT used: the app is fully static, so
 * cache-first with background refresh keeps it offline-capable while
 * staying fresh within one reload.
 */
const CACHE = "tabula-phase5-v1";
const SHELL = [
  "index.html",
  "manifest.webmanifest",
  "assets/icon.svg",
  "web/app.js",
  "web/charts.js",
  "web/editor.js",
  "web/engine.js",
  "web/format.js",
  "web/grid.js",
  "web/inspector.js",
  "web/sample.js",
  "web/storage.js",
  "web/styles.css",
  "web/views.js",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (ev) => {
  if (ev.request.method !== "GET") return;
  ev.respondWith(
    caches.match(ev.request).then((hit) => hit || fetch(ev.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(ev.request, copy));
      return res;
    }).catch(() => caches.match("index.html")))
  );
});
