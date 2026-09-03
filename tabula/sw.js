/* Tabula offline shell (Phase 0 minimal; Phase 5 fleshes out versioned
   cache + bundle + sample). Scope is /tabula/ so previews never leak. */
const CACHE = "tabula-phase0-v1";
const SHELL = ["index.html", "web/app.js", "web/styles.css", "manifest.webmanifest"];

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
