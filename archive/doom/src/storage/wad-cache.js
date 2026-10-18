// Shareware WAD cache (spec 9): Cache Storage precache + memory fallback.
// WAD bytes live in Cache Storage ('doom-wad-v1'), never in OPFS save space.
// Every Cache Storage call races a timeout: a wedged backend (resolves
// neither success nor error, seen in some headless runners) must fall back
// to memory, never hang the boot past CACHE_TIMEOUT_MS.
const CACHE = 'doom-wad-v1';
const KEY = 'doom1.wad';
export const CACHE_TIMEOUT_MS = 3000;
let memFallback = null;

const TIMED_OUT = Symbol('cache-timeout');

function withTimeout(promise, ms = CACHE_TIMEOUT_MS) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => setTimeout(() => resolve(TIMED_OUT), ms)),
  ]);
}

export async function precacheWad(bytes) {
  memFallback = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  try {
    if (typeof caches === 'undefined') return 'memory';
    const c = await withTimeout(caches.open(CACHE));
    if (c === TIMED_OUT) return 'memory';
    const put = await withTimeout(
      c.put(KEY, new Response(memFallback, { headers: { 'Content-Type': 'application/octet-stream' } })),
    );
    return put === TIMED_OUT ? 'memory' : 'cache';
  } catch {
    return 'memory';
  }
}

export async function loadCachedWad() {
  if (memFallback) return memFallback;
  try {
    if (typeof caches === 'undefined') return null;
    const c = await withTimeout(caches.open(CACHE));
    if (c === TIMED_OUT || !c) return null;
    const res = await withTimeout(c.match(KEY));
    if (!res || res === TIMED_OUT) return null;
    const buf = await withTimeout(res.arrayBuffer());
    if (buf === TIMED_OUT) return null;
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
