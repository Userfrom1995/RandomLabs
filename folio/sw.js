// Folio service worker: cache-then-network shell + versioned pack caches.
// Pack caches fill only after consent (see packs/loader).
const SHELL = "folio-shell-v1";
const CORE = ["./index.html", "./manifest.webmanifest", "./vendor/pdf-lib.min.js", "./vendor/pdf.mjs", "./vendor/pdf.worker.mjs", "./src/ui/shell/app.js"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(CORE).catch(() => null)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL && !k.startsWith("folio-pack-")).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
