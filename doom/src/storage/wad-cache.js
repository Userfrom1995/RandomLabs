// Shareware WAD cache (spec 9): Cache Storage precache + memory fallback.
// WAD bytes live in Cache Storage ('doom-wad-v1'), never in OPFS save space.
const CACHE = 'doom-wad-v1';
const KEY = 'doom1.wad';
let memFallback = null;

export async function precacheWad(bytes) {
  memFallback = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  try {
    if (typeof caches === 'undefined') return 'memory';
    const c = await caches.open(CACHE);
    await c.put(KEY, new Response(memFallback, { headers: { 'Content-Type': 'application/octet-stream' } }));
    return 'cache';
  } catch {
    return 'memory';
  }
}

export async function loadCachedWad() {
  if (memFallback) return memFallback;
  try {
    if (typeof caches === 'undefined') return null;
    const c = await caches.open(CACHE);
    const res = await c.match(KEY);
    if (!res) return null;
    const buf = await res.arrayBuffer();
    memFallback = new Uint8Array(buf);
    return memFallback;
  } catch {
    return memFallback;
  }
}

export async function cacheStatus() {
  const bytes = await loadCachedWad();
  return { present: !!bytes, bytes: bytes ? bytes.length : 0, store: typeof caches === 'undefined' ? 'memory' : CACHE };
}
