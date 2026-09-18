// Save bundle export/import (research spec 6.3). Single JSON plus base64
// file, no dependencies, works offline. Import validates format plus version
// and applies atomically or rejects whole (never half-applied).
export const BUNDLE_FORMAT = 'doom-save-bundle';
export const BUNDLE_VERSION = 1;

export function encodeB64(u8) {
  if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

export function decodeB64(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(String(b64), 'base64'));
  const s = atob(String(b64));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// state: {config, bindings, progression, saves:[{slot,name,data:Uint8Array}]}.
export function exportBundle(state, { exportedAt = new Date().toISOString() } = {}) {
  const saves = (state.saves || []).map((s) => ({
    slot: s.slot,
    name: s.name || `slot${s.slot}`,
    dataBase64: encodeB64(s.data instanceof Uint8Array ? s.data : new Uint8Array(s.data || [])),
  }));
  return {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    exportedAt,
    config: state.config ?? {},
    bindings: state.bindings ?? {},
    progression: state.progression ?? {},
    saves,
  };
}

export function serializeBundle(bundle) {
  return JSON.stringify(bundle);
}

export function parseBundle(text) {
  let obj;
  try {
    obj = JSON.parse(String(text));
  } catch {
    throw Object.assign(new Error('bundle is not valid JSON'), { code: 'E_BUNDLE_FORMAT' });
  }
  if (!obj || obj.format !== BUNDLE_FORMAT) {
    throw Object.assign(new Error(`bundle format '${obj && obj.format}', want '${BUNDLE_FORMAT}'`), {
      code: 'E_BUNDLE_FORMAT',
    });
  }
  if (obj.version !== BUNDLE_VERSION) {
    throw Object.assign(new Error(`bundle version ${obj.version}, want ${BUNDLE_VERSION}`), {
      code: 'E_BUNDLE_VERSION',
    });
  }
  if (!Array.isArray(obj.saves)) {
    throw Object.assign(new Error('bundle saves must be an array'), { code: 'E_BUNDLE_FORMAT' });
  }
  const saves = obj.saves.map((s) => {
    if (!Number.isInteger(s.slot) || s.slot < 0 || typeof s.dataBase64 !== 'string') {
      throw Object.assign(new Error(`bundle save entry invalid (slot ${s && s.slot})`), { code: 'E_BUNDLE_FORMAT' });
    }
    let data;
    try {
      data = decodeB64(s.dataBase64);
    } catch {
      throw Object.assign(new Error(`bundle save slot ${s.slot} base64 corrupt`), { code: 'E_BUNDLE_FORMAT' });
    }
    return { slot: s.slot, name: s.name || `slot${s.slot}`, data };
  });
  return {
    format: obj.format,
    version: obj.version,
    exportedAt: obj.exportedAt || '',
    config: obj.config ?? {},
    bindings: obj.bindings ?? {},
    progression: obj.progression ?? {},
    saves,
  };
}

// Apply a parsed bundle through a provider atomically: stage every write,
// then commit; any failure rolls back staged paths to their prior bytes.
export async function applyBundle(provider, parsed) {
  const staged = [];
  const prior = new Map();
  async function remember(path) {
    if (prior.has(path)) return;
    try {
      prior.set(path, await provider.readFile(path));
    } catch (e) {
      if (e && e.code === 'E_NOENT') prior.set(path, null);
      else throw e;
    }
  }
  try {
    const { PATHS } = await import('./provider.js');
    const jsonWrites = [
      [PATHS.config, parsed.config],
      [PATHS.bindings, parsed.bindings],
      [PATHS.progression, parsed.progression],
    ];
    for (const [path] of jsonWrites) await remember(path);
    for (const s of parsed.saves) {
      await remember(PATHS.saveData(s.slot));
      await remember(PATHS.saveMeta(s.slot));
    }
    for (const [path, value] of jsonWrites) {
      await provider.writeJSON(path, value);
      staged.push(path);
    }
    for (const s of parsed.saves) {
      await provider.writeFile(PATHS.saveData(s.slot), s.data);
      staged.push(PATHS.saveData(s.slot));
      await provider.writeJSON(PATHS.saveMeta(s.slot), { name: s.name, importedAt: new Date().toISOString() });
      staged.push(PATHS.saveMeta(s.slot));
    }
    return { applied: staged.length, saves: parsed.saves.length };
  } catch (e) {
    for (const [path, bytes] of prior) {
      try {
        if (bytes === null) await provider.remove(path);
        else await provider.writeFile(path, bytes);
      } catch { /* best-effort rollback */ }
    }
    throw e;
  }
}
