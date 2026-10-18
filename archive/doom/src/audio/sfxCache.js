// Lazy SFX lump cache (research spec 5.2). Pure: maps lump names to decoded
// float32 buffers with an LRU cap. About 100 lumps at 10-30 KB each decode
// to a few MB; the cap keeps worst-case memory bounded on mobile.
import { parseDmxLump, dmxToFloat32 } from './wadAudio.js';

export const SFX_DEFAULT_CAP = 64;

export function createSfxCache({ maxEntries = SFX_DEFAULT_CAP } = {}) {
  const map = new Map();
  const stats = { hits: 0, misses: 0, evictions: 0, decoded: 0 };
  function decode(name, lumpBytes) {
    const parsed = parseDmxLump(lumpBytes, name);
    return { data: dmxToFloat32(parsed.samples), sampleRate: parsed.sampleRate, samples: parsed.sampleCount };
  }
  return {
    stats,
    get size() { return map.size; },
    has(name) { return map.has(name); },
    // Decode on first use; refresh recency on every hit (Map order = LRU).
    get(name, lumpBytes) {
      if (map.has(name)) {
        const entry = map.get(name);
        map.delete(name);
        map.set(name, entry);
        stats.hits++;
        return entry;
      }
      if (lumpBytes === undefined) return null;
      const entry = decode(name, lumpBytes);
      map.set(name, entry);
      stats.misses++;
      stats.decoded++;
      while (map.size > Math.max(1, maxEntries)) {
        map.delete(map.keys().next().value);
        stats.evictions++;
      }
      return entry;
    },
    // Prefetch a map's sprite/sound set; undecodable lumps are skipped and
    // reported so one corrupt lump never kills the prefetch.
    prefetch(entries) {
      const skipped = [];
      for (const [name, lumpBytes] of entries) {
        try { this.get(name, lumpBytes); } catch { skipped.push(name); }
      }
      return { loaded: entries.length - skipped.length, skipped };
    },
    evict(name) { return map.delete(name); },
    clear() { map.clear(); },
  };
}
