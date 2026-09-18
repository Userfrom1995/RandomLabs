// Save manager (research spec 6.2): slots, config, progression, and bindings
// over any StorageProvider. Savegames stay opaque Uint8Array end to end.
// Writes debounce ~500 ms and flush on visibilitychange/pagehide (wired by
// app code via flush()); every debounced write is coalesced per path.
import { PATHS, SAVE_SLOTS } from './provider.js';

export function encodeSaveState(obj) {
  return new TextEncoder().encode(JSON.stringify(obj));
}

export function decodeSaveState(bytes) {
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function createSaveManager(provider) {
  const pending = new Map();
  let timer = 0;
  const schedule = () => {
    if (typeof setTimeout === 'undefined') return;
    if (timer) return;
    timer = setTimeout(() => {
      timer = 0;
      void api.flush();
    }, 500);
  };
  const api = {
    provider,
    get tier() { return provider.tier; },
    // Immediate atomic write (slots, explicit user Save).
    async saveSlot(slot, data, meta = {}) {
      if (!Number.isInteger(slot) || slot < 0 || slot >= SAVE_SLOTS) {
        throw Object.assign(new Error(`slot ${slot} outside 0..${SAVE_SLOTS - 1}`), { code: 'E_SLOT' });
      }
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      await provider.writeFile(PATHS.saveData(slot), u8);
      await provider.writeJSON(PATHS.saveMeta(slot), {
        name: meta.name || `slot${slot}`,
        episode: meta.episode ?? 1,
        map: meta.map || 'E1M1',
        skill: meta.skill ?? 3,
        timestamp: new Date().toISOString(),
      });
      return { slot, bytes: u8.length };
    },
    async loadSlot(slot) {
      const data = await provider.readFile(PATHS.saveData(slot));
      let meta = null;
      try {
        meta = await provider.readJSON(PATHS.saveMeta(slot));
      } catch { /* meta optional */ }
      return { slot, data, meta };
    },
    async listSlots() {
      const out = [];
      for (let n = 0; n < SAVE_SLOTS; n++) {
        try {
          const meta = await provider.readJSON(PATHS.saveMeta(n));
          const data = await provider.readFile(PATHS.saveData(n));
          out.push({ slot: n, present: true, bytes: data.length, meta });
        } catch {
          out.push({ slot: n, present: false, bytes: 0, meta: null });
        }
      }
      return out;
    },
    async deleteSlot(slot) {
      await provider.remove(PATHS.saveData(slot));
      await provider.remove(PATHS.saveMeta(slot));
    },
    // Debounced JSON writes (config/progression/bindings/audio prefs).
    writeSoon(path, value) {
      pending.set(path, value);
      schedule();
    },
    async flush() {
      if (timer && typeof clearTimeout !== 'undefined') {
        clearTimeout(timer);
        timer = 0;
      }
      const entries = [...pending];
      pending.clear();
      for (const [path, value] of entries) {
        try {
          await provider.writeJSON(path, value);
        } catch {
          pending.set(path, value);
        }
      }
      return { written: entries.length, pending: pending.size };
    },
    get pendingWrites() { return pending.size; },
    async readOr(path, fallback) {
      try {
        return await provider.readJSON(path);
      } catch (e) {
        if (e && e.code === 'E_NOENT') return fallback;
        throw e;
      }
    },
  };
  return api;
}

// Engine snapshot helpers: capture the full JS-core sim state (player
// transform, weapon, counters, tick clock, map/skill/episode) as opaque
// bytes; restore re-applies bit-exactly (twin-convergence tested).
export function captureEngine(engine) {
  const p = engine.getPlayer();
  return encodeSaveState({
    format: 'doom-save-state',
    version: 1,
    map: engine.map,
    skill: engine.skill,
    episode: engine.episode,
    ticks: engine.tickCount,
    player: {
      x: p.x,
      y: p.y,
      angle: p.angle,
      type: p.type,
      weapon: p.weapon,
      attackCount: p.attackCount,
      useCount: p.useCount,
    },
  });
}

export function restoreEngine(engine, bytes) {
  const s = decodeSaveState(bytes);
  if (!s || s.format !== 'doom-save-state' || s.version !== 1) {
    throw Object.assign(new Error('not a doom save state'), { code: 'E_SAVE_FORMAT' });
  }
  if (s.map !== engine.map) {
    throw Object.assign(new Error(`save is for ${s.map}, engine runs ${engine.map}`), {
      code: 'E_SAVE_MAP',
      map: s.map,
    });
  }
  engine.setPlayerState(s.player, s.ticks);
  return { ticks: s.ticks, map: s.map };
}
