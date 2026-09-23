/* Umbra service worker: versioned offline-first shell, scope /umbra/. */
const UMBRA_CACHE = 'umbra-v5';

const SHELL = [
  './',
  './index.html',
  './theme.css',
  './app.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './src/rng.js',
  './src/poses.js',
  './src/arenas.js',
  './src/roster.js',
  './src/story.js',
  './src/dialogue.js',
  './src/weapons.js',
  './src/bosses.js',
  './src/dojo.js',
  './src/economy.js',
  './src/storage/bundle.js',
  './src/render/scene.js',
  './src/render/tiers.js',
  './src/render/caps.js',
  './src/render/resolution.js',
  './src/render/webgpu/pipeline.js',
  './src/render/webgpu/background.wgsl',
  './src/render/webgpu/silhouette.wgsl',
  './src/render/webgpu/rimlight.wgsl',
  './src/render/webgpu/particles.wgsl',
  './src/render/webgl2/shaders.js',
  './src/render/webgl2/renderer.js',
  './src/render/canvas2d/painter.js',
  './src/storage/provider.js',
  './src/storage/profile.js',
  './src/perf/stats.js',
  './src/perf/gates.js',
  './src/combat/types.js',
  './src/combat/moves.js',
  './src/combat/fighter.js',
  './src/combat/hitboxes.js',
  './src/combat/engine.js',
  './src/combat/combos.js',
  './src/combat/ai.js',
  './src/input/bindings.js',
  './src/input/keyboard.js',
  './src/input/gamepad.js',
  './src/input/touch.js',
  './src/input/combine.js',
  './src/input/haptics.js',
  './src/vfx.js',
  './src/tutorial.js',
  './src/audio/sfx.js',
  './src/audio/music.js',
  './src/audio/engine.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(UMBRA_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== UMBRA_CACHE && k.startsWith('umbra-')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        if (res.ok && url.pathname.includes('/umbra/')) {
          const copy = res.clone();
          caches.open(UMBRA_CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    }),
  );
});
