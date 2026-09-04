// Folio service worker: cache-then-network shell.
// M1: on-demand packs were purged with the OCR/Office facades; versioned
// pack caches return in M3 with the real vendored engines.
const SHELL = "folio-shell-v2";
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
