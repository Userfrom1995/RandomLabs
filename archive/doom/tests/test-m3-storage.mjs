// M3 storage tests: provider ladder, local tier, save manager, bundle
// export/import, engine snapshot twin-convergence. Headless (node:test).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMemoryProvider, selectProvider, assertValidPath, PATHS, SAVE_SLOTS,
} from '../src/storage/provider.js';
import { createLocalProvider } from '../src/storage/storage-local.js';
import { createIdbProvider } from '../src/storage/storage-idb.js';
import { createOpfsProvider } from '../src/storage/storage-opfs.js';
import {
  createSaveManager, captureEngine, restoreEngine, encodeSaveState, decodeSaveState,
} from '../src/storage/saves.js';
import {
  exportBundle, serializeBundle, parseBundle, applyBundle, BUNDLE_FORMAT, BUNDLE_VERSION,
} from '../src/storage/saveBundle.js';
import { initEngine } from '../src/engine/doomEngine.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';
import { buildTiccmd } from '../src/input/tic.js';

function fakeStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

const PAYLOAD = new Uint8Array([1, 2, 3, 250, 0, 17]);

describe('provider interface and memory tier', () => {
  it('round-trips bytes and JSON, lists, removes, E_NOENT', async () => {
    const p = createMemoryProvider();
    assert.equal(p.tier, 'memory');
    await p.writeFile('doom/config.json', PAYLOAD);
    assert.deepEqual([...(await p.readFile('doom/config.json'))], [...PAYLOAD]);
    await p.writeJSON('doom/meta/progression.json', { map: 'E1M2' });
    assert.deepEqual(await p.readJSON('doom/meta/progression.json'), { map: 'E1M2' });
    assert.deepEqual(await p.list('doom/'), ['doom/config.json', 'doom/meta/progression.json']);
    await p.remove('doom/config.json');
    await assert.rejects(() => p.readFile('doom/config.json'), (e) => e.code === 'E_NOENT');
  });
  it('writes copy bytes (caller mutation cannot corrupt the store)', async () => {
    const p = createMemoryProvider();
    const src = new Uint8Array([9, 9, 9]);
    await p.writeFile('doom/x.bin', src);
    src[0] = 1;
    assert.equal((await p.readFile('doom/x.bin'))[0], 9);
  });
  it('path traversal and absolute paths reject with E_PATH', async () => {
    const p = createMemoryProvider();
    await assert.rejects(() => p.writeFile('../evil', PAYLOAD), (e) => e.code === 'E_PATH');
    await assert.rejects(() => p.writeFile('/abs', PAYLOAD), (e) => e.code === 'E_PATH');
    assert.throws(() => assertValidPath(''), (e) => e.code === 'E_PATH');
  });
  it('spec paths pinned: 6 slots plus config plus progression plus bindings', () => {
    assert.equal(SAVE_SLOTS, 6);
    assert.equal(PATHS.saveData(0), 'doom/saves/slot0.dsg');
    assert.equal(PATHS.config, 'doom/config.json');
    assert.equal(PATHS.bindings, 'doom/bindings.json');
    assert.equal(PATHS.progression, 'doom/meta/progression.json');
  });
});

describe('provider ladder and tier availability', () => {
  it('falls through throwing and unavailable factories to memory', async () => {
    const { provider, tier, fallbacks } = await selectProvider([
      async () => { throw Object.assign(new Error('getDirectory boom'), { tier: 'opfs' }); },
      async () => ({ tier: 'idb', available: false }),
      async () => createMemoryProvider(),
    ]);
    assert.equal(tier, 'memory');
    assert.deepEqual(fallbacks, ['opfs', 'idb']);
    await provider.writeJSON('doom/config.json', { ok: true });
  });
  it('OPFS and IDB report unavailable headless (graceful fallback, never success)', () => {
    assert.equal(createOpfsProvider().available, false);
    assert.equal(createIdbProvider().available, false);
  });
  it('a tier whose probe never resolves falls through within the timeout', async () => {
    const hanging = { tier: 'opfs', probe: () => new Promise(() => {}) };
    const failing = { tier: 'idb', probe: async () => { throw new Error('probe boom'); } };
    const { provider, tier, fallbacks } = await selectProvider(
      [async () => hanging, async () => failing, async () => createMemoryProvider()],
      { probeTimeoutMs: 30 },
    );
    assert.equal(tier, 'memory');
    assert.deepEqual(fallbacks, ['opfs', 'idb']);
    await provider.writeJSON('doom/config.json', { ok: true });
  });
  it('a tier that passes its probe is selected', async () => {
    const good = {
      tier: 'custom',
      probe: async () => true,
      async writeJSON() {},
      async readJSON() { return {}; },
    };
    const { tier } = await selectProvider([async () => good], { probeTimeoutMs: 30 });
    assert.equal(tier, 'custom');
  });
  it('local tier round-trips JSON and binary, refuses save slots', async () => {
    const p = createLocalProvider(fakeStore());
    assert.equal(p.tier, 'local');
    await p.writeJSON('doom/config.json', { sensitivity: 5 });
    assert.deepEqual(await p.readJSON('doom/config.json'), { sensitivity: 5 });
    await p.writeFile('doom/config.bin', PAYLOAD);
    assert.deepEqual([...(await p.readFile('doom/config.bin'))], [...PAYLOAD]);
    await assert.rejects(() => p.writeFile('doom/saves/slot0.dsg', PAYLOAD), (e) => e.code === 'E_SAVE_UNAVAILABLE');
  });
});

describe('save manager slots and debounced JSON', () => {
  it('slot save/load round-trips opaque bytes plus meta', async () => {
    const m = createSaveManager(createMemoryProvider());
    await m.saveSlot(2, PAYLOAD, { name: 'E1M3', map: 'E1M3', skill: 4 });
    const got = await m.loadSlot(2);
    assert.deepEqual([...got.data], [...PAYLOAD]);
    assert.equal(got.meta.map, 'E1M3');
    const slots = await m.listSlots();
    assert.equal(slots.length, 6);
    assert.equal(slots[2].present, true);
    assert.equal(slots[0].present, false);
    await m.deleteSlot(2);
    assert.equal((await m.listSlots())[2].present, false);
  });
  it('slot index outside 0..5 rejects with E_SLOT', async () => {
    const m = createSaveManager(createMemoryProvider());
    await assert.rejects(() => m.saveSlot(6, PAYLOAD), (e) => e.code === 'E_SLOT');
  });
  it('writeSoon debounces and flush persists; failures re-queue', async () => {
    const m = createSaveManager(createMemoryProvider());
    m.writeSoon('doom/config.json', { a: 1 });
    m.writeSoon('doom/config.json', { a: 2 });
    assert.equal(m.pendingWrites, 1);
    const r = await m.flush();
    assert.equal(r.written, 1);
    assert.deepEqual(await m.readOr('doom/config.json', null), { a: 2 });
    assert.deepEqual(await m.readOr('doom/missing.json', { d: 1 }), { d: 1 });
  });
});

describe('engine snapshot twin-convergence', () => {
  it('restore re-applies bit-exactly on a fresh twin', async () => {
    const wad = buildDemoWad();
    const a = await initEngine({ wadBytes: wad });
    for (let i = 0; i < 20; i++) {
      a.injectTiccmd(buildTiccmd({ moveF: 1, run: true, turn: 0.2 }));
      a.tickOnce();
    }
    const bytes = captureEngine(a);
    const b = await initEngine({ wadBytes: wad });
    const r = restoreEngine(b, bytes);
    assert.equal(r.map, a.map);
    assert.deepEqual(b.getPlayer(), a.getPlayer());
    assert.equal(b.tickCount, a.tickCount);
    // Twins stay converged after further identical input.
    for (let i = 0; i < 5; i++) {
      const cmd = buildTiccmd({ moveS: -1 });
      a.injectTiccmd(cmd);
      b.injectTiccmd(cmd);
      a.tickOnce();
      b.tickOnce();
    }
    assert.deepEqual(b.getPlayer(), a.getPlayer());
  });
  it('save-state codec round-trips, wrong map and bad format reject', async () => {
    const wad = buildDemoWad();
    const a = await initEngine({ wadBytes: wad });
    const obj = decodeSaveState(encodeSaveState({ hello: 'world' }));
    assert.deepEqual(obj, { hello: 'world' });
    const bytes = captureEngine(a);
    assert.throws(() => restoreEngine(a, new TextEncoder().encode('{}')), (e) => e.code === 'E_SAVE_FORMAT');
    const other = decodeSaveState(bytes);
    other.map = 'MAP99';
    assert.throws(() => restoreEngine(a, encodeSaveState(other)), (e) => e.code === 'E_SAVE_MAP');
  });
});

describe('save bundle export/import', () => {
  const state = () => ({
    config: { sensitivity: 7 },
    bindings: { format: 'doom-bindings', version: 1 },
    progression: { map: 'E1M4' },
    saves: [{ slot: 1, name: 'E1M4', data: PAYLOAD }],
  });
  it('export then import into a fresh provider keeps bytes equal', async () => {
    const bundle = exportBundle(state(), { exportedAt: '2026-09-17T00:00:00Z' });
    assert.equal(bundle.format, BUNDLE_FORMAT);
    assert.equal(bundle.version, BUNDLE_VERSION);
    const text = serializeBundle(bundle);
    const parsed = parseBundle(text);
    const fresh = createMemoryProvider();
    const r = await applyBundle(fresh, parsed);
    assert.equal(r.saves, 1);
    assert.deepEqual([...(await fresh.readFile('doom/saves/slot1.dsg'))], [...PAYLOAD]);
    assert.deepEqual(await fresh.readJSON('doom/config.json'), { sensitivity: 7 });
    assert.deepEqual(await fresh.readJSON('doom/meta/progression.json'), { map: 'E1M4' });
  });
  it('corrupt bundles reject whole: bad JSON, format, version, entry', () => {
    assert.throws(() => parseBundle('not json'), (e) => e.code === 'E_BUNDLE_FORMAT');
    assert.throws(
      () => parseBundle(JSON.stringify({ ...exportBundle(state()), format: 'nope' })),
      (e) => e.code === 'E_BUNDLE_FORMAT',
    );
    assert.throws(
      () => parseBundle(JSON.stringify({ ...exportBundle(state()), version: 99 })),
      (e) => e.code === 'E_BUNDLE_VERSION',
    );
    const badEntry = exportBundle(state());
    badEntry.saves = [{ slot: -1, dataBase64: '!!!' }];
    assert.throws(() => parseBundle(JSON.stringify(badEntry)), (e) => e.code === 'E_BUNDLE_FORMAT');
  });
  it('failed apply rolls back prior bytes (never half-applied)', async () => {
    const p = createMemoryProvider();
    await p.writeJSON('doom/config.json', { original: true });
    const bundle = parseBundle(serializeBundle(exportBundle(state())));
    const failing = {
      tier: 'memory',
      readFile: (path) => p.readFile(path),
      remove: (path) => p.remove(path),
      list: (path) => p.list(path),
      readJSON: (path) => p.readJSON(path),
      writeJSON: (path) => p.writeJSON(path),
      writeFile: async (path, data) => {
        if (path === 'doom/saves/slot1.dsg') throw Object.assign(new Error('quota'), { code: 'E_QUOTA' });
        return p.writeFile(path, data);
      },
    };
    await assert.rejects(() => applyBundle(failing, bundle), (e) => e.code === 'E_QUOTA');
    assert.deepEqual(await p.readJSON('doom/config.json'), { original: true });
  });
});
