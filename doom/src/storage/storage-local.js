// localStorage provider (research spec 6.1): last resort, strings only.
// Persists config, bindings, and progression; savegame slots are rejected
// with E_SAVE_UNAVAILABLE plus a warning (single-slot base64 aside, binary
// saves do not belong in a 5 MB string store). Accepts any {getItem,
// setItem, removeItem} store so M2's app store and tests inject fakes.
const PREFIX = 'doom:';

function bytesToB64(u8) {
  if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  if (typeof btoa !== 'undefined') return btoa(s);
  throw Object.assign(new Error('no base64 encoder'), { code: 'E_ENV' });
}

function b64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  if (typeof atob === 'undefined') {
    throw Object.assign(new Error('no base64 decoder'), { code: 'E_ENV' });
  }
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function createLocalProvider(store) {
  const mem = new Map();
  const backend = store || {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
  let blocked = false;
  try {
    backend.setItem(`${PREFIX}__probe`, '1');
    backend.removeItem(`${PREFIX}__probe`);
  } catch {
    blocked = true;
  }
  if (blocked) return { tier: 'local', available: false };
  const noent = (path) => Object.assign(new Error(`not found: ${path}`), { code: 'E_NOENT', path });
  const key = (path) => `${PREFIX}${path}`;
  const isSaveSlot = (path) => path.startsWith('doom/saves/') && path.endsWith('.dsg');
  return {
    tier: 'local',
    async readFile(path) {
      const { assertValidPath } = await import('./provider.js');
      assertValidPath(path);
      let raw;
      try {
        raw = backend.getItem(key(path));
      } catch {
        throw noent(path);
      }
      if (raw === null || raw === undefined) throw noent(path);
      return b64ToBytes(String(raw));
    },
    async writeFile(path, data) {
      const { assertValidPath } = await import('./provider.js');
      assertValidPath(path);
      if (isSaveSlot(path)) {
        throw Object.assign(new Error(`save slots need OPFS/IndexedDB; '${path}' refused on localStorage`), {
          code: 'E_SAVE_UNAVAILABLE',
          path,
        });
      }
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      backend.setItem(key(path), bytesToB64(u8));
    },
    async remove(path) {
      const { assertValidPath } = await import('./provider.js');
      assertValidPath(path);
      try {
        backend.removeItem(key(path));
      } catch { /* idempotent */ }
    },
    async list(prefix) {
      void prefix;
      return [];
    },
    async readJSON(path) {
      return JSON.parse(new TextDecoder().decode(await this.readFile(path)));
    },
    async writeJSON(path, value) {
      await this.writeFile(path, new TextEncoder().encode(JSON.stringify(value)));
    },
  };
}
