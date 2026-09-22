/**
 * Umbra StorageProvider interface (JSDoc) plus config-only localStorage
 * provider. OPFS/IndexedDB backends arrive with persistence v1 in M4;
 * the interface is frozen now so callers never change.
 *
 * @typedef {object} StorageProvider
 * @property {(path: string) => Promise<unknown>} readJSON
 * @property {(path: string, value: unknown) => Promise<void>} writeJSON
 * @property {(path: string) => Promise<void>} remove
 */

/**
 * Create a JSON document provider over any synchronous key-value store.
 * Pass window.localStorage from the app; tests inject a Map-backed fake.
 * @param {{getItem:(k:string)=>string|null,setItem:(k:string,v:string)=>void,removeItem:(k:string)=>void}} store
 * @returns {StorageProvider}
 */
export function createLocalProvider(store) {
  if (!store || typeof store.getItem !== 'function') {
    throw new TypeError('createLocalProvider requires a Storage-like store');
  }
  return {
    async readJSON(path) {
      const raw = store.getItem(`umbra/${path}`);
      if (raw == null) return null;
      return JSON.parse(raw);
    },
    async writeJSON(path, value) {
      store.setItem(`umbra/${path}`, JSON.stringify(value));
    },
    async remove(path) {
      store.removeItem(`umbra/${path}`);
    },
  };
}

/**
 * In-memory Map-backed store with the Storage shape (for tests and
 * environments without localStorage).
 * @returns {{getItem,setItem,removeItem}}
 */
export function createMemoryStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
  };
}
