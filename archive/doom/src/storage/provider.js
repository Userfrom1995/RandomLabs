// StorageProvider interface (research spec 6.1-6.2). One interface, three
// implementations, feature-detected in order (never UA-sniffed):
// OPFS primary, IndexedDB secondary, localStorage last resort (config-only).
//
// interface StorageProvider {
//   tier: 'opfs' | 'idb' | 'local' | 'memory';
//   readFile(path): Promise<Uint8Array>;            // throws E_NOENT
//   writeFile(path, data): Promise<void>;           // atomic
//   remove(path): Promise<void>;
//   list(prefix): Promise<string[]>;
//   readJSON(path): Promise<unknown>;               // throws E_NOENT
//   writeJSON(path, value): Promise<void>;
// }
//
// Paths (spec 6.2): doom/saves/slotN.dsg + slotN.json,
// doom/meta/progression.json, doom/config.json, doom/bindings.json.
// WAD bytes live in Cache Storage, never in a save provider.
export const SAVE_SLOTS = 6;
export const PATHS = {
  saveData: (n) => `doom/saves/slot${n}.dsg`,
  saveMeta: (n) => `doom/saves/slot${n}.json`,
  progression: 'doom/meta/progression.json',
  config: 'doom/config.json',
  bindings: 'doom/bindings.json',
};

export function assertValidPath(path) {
  if (typeof path !== 'string' || path.length === 0) {
    throw Object.assign(new Error('empty storage path'), { code: 'E_PATH' });
  }
  if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
    throw Object.assign(new Error(`unsafe storage path '${path}'`), { code: 'E_PATH' });
  }
  return path;
}

export function enoent(path) {
  return Object.assign(new Error(`not found: ${path}`), { code: 'E_NOENT', path });
}

// In-memory provider: always available, backs unit tests and private-mode
// last-resort when even localStorage is blocked.
export function createMemoryProvider() {
  const files = new Map();
  return {
    tier: 'memory',
    async readFile(path) {
      assertValidPath(path);
      if (!files.has(path)) throw enoent(path);
      return files.get(path).slice();
    },
    async writeFile(path, data) {
      assertValidPath(path);
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      files.set(path, u8.slice());
    },
    async remove(path) {
      assertValidPath(path);
      files.delete(path);
    },
    async list(prefix) {
      const out = [];
      for (const k of files.keys()) if (k.startsWith(prefix)) out.push(k);
      return out.sort();
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

// Ladder: first available provider wins. Providers carrying an async probe()
// (OPFS, IndexedDB) must pass a real round-trip before selection; a tier
// that throws, reports available:false, fails its probe, or never resolves
// within probeTimeoutMs falls through (OPFS getDirectory throw in WebKit,
// hung handles, quota software wedges). Fault-injection friendly.
export async function selectProvider(factories, { probeTimeoutMs = 2500 } = {}) {
  const tried = [];
  for (const make of factories) {
    let p = null;
    try {
      p = await make();
    } catch (e) {
      tried.push((e && e.tier) || 'error');
      continue;
    }
    if (!p || p.available === false) {
      tried.push((p && p.tier) || 'unknown');
      continue;
    }
    if (typeof p.probe === 'function') {
      let ok = false;
      try {
        ok = await Promise.race([
          Promise.resolve().then(() => p.probe()).then(() => true, () => false),
          new Promise((resolve) => setTimeout(() => resolve(false), probeTimeoutMs)),
        ]);
      } catch {
        ok = false;
      }
      if (!ok) {
        tried.push(p.tier || 'unknown');
        continue;
      }
    }
    return { provider: p, tier: p.tier, fallbacks: tried };
  }
  return { provider: createMemoryProvider(), tier: 'memory', fallbacks: tried };
}
