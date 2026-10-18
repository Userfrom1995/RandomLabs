// IndexedDB provider (research spec 6.1): secondary tier. One database
// 'doom-store': object store 'files' keyed by path holding {data, mtime},
// plus 'kv' for small JSON. Single-transaction put per write = atomic.
// Node-safe: available:false without indexedDB.
const DB_NAME = 'doom-store';

function idb() {
  if (typeof indexedDB === 'undefined') return null;
  return indexedDB;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = idb().open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('files', { keyPath: 'path' });
      req.result.createObjectStore('kv', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    let out;
    try {
      out = fn(os);
    } catch (e) {
      reject(e);
      return;
    }
    t.oncomplete = () => resolve(out && out.value !== undefined ? out.value : undefined);
    t.onerror = () => reject(t.error);
  });
}

export function createIdbProvider() {
  if (!idb()) return { tier: 'idb', available: false };
  const noent = (path) => Object.assign(new Error(`not found: ${path}`), { code: 'E_NOENT', path });
  let dbp = null;
  const db = () => (dbp || (dbp = openDb()));
  return {
    tier: 'idb',
    // Real round-trip probe for the ladder (raced against probeTimeoutMs).
    async probe() {
      await this.writeFile('doom-probe.tmp', new Uint8Array([7]));
      const back = await this.readFile('doom-probe.tmp');
      await this.remove('doom-probe.tmp');
      if (back.length !== 1 || back[0] !== 7) throw new Error('idb probe mismatch');
      return true;
    },
    async readFile(path) {
      const { assertValidPath } = await import('./provider.js');
      assertValidPath(path);
      const d = await db();
      const rec = await new Promise((resolve, reject) => {
        const t = d.transaction('files', 'readonly');
        const rq = t.objectStore('files').get(path);
        rq.onsuccess = () => resolve(rq.result || null);
        rq.onerror = () => reject(rq.error);
      });
      if (!rec) throw noent(path);
      return new Uint8Array(rec.data);
    },
    async writeFile(path, data) {
      const { assertValidPath } = await import('./provider.js');
      assertValidPath(path);
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      const d = await db();
      await tx(d, 'files', 'readwrite', (os) => {
        os.put({ path, data: u8.slice(), mtime: Date.now() });
        return {};
      });
    },
    async remove(path) {
      const { assertValidPath } = await import('./provider.js');
      assertValidPath(path);
      const d = await db();
      await tx(d, 'files', 'readwrite', (os) => {
        os.delete(path);
        return {};
      });
    },
    async list(prefix) {
      const d = await db();
      return new Promise((resolve, reject) => {
        const t = d.transaction('files', 'readonly');
        const out = [];
        const cursor = t.objectStore('files').openCursor();
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (!c) {
            resolve(out.sort());
            return;
          }
          if (c.key.startsWith(prefix)) out.push(c.key);
          c.continue();
        };
        cursor.onerror = () => reject(cursor.error);
      });
    },
    async readJSON(path) {
      const raw = await this.readFile(path);
      return JSON.parse(new TextDecoder().decode(raw));
    },
    async writeJSON(path, value) {
      await this.writeFile(path, new TextEncoder().encode(JSON.stringify(value)));
    },
  };
}
