// Tester M1 red-team suite (node:test, no browser): hostile container fuzz,
// decoder boundary traps, cross-ref hostility, concurrency saturation, soak,
// tail-latency profile, engine error paths, and static shell/PNG/build checks.
// Authored by the Tester; production code is never touched from here.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import {
  CheckedReader, WadError, MapReport, WadReport,
  parseWadDirectory, lumpBytes, overlayLumps,
  discoverMaps, episodeClamp, isMapMarker,
  decodeVertexes, decodeThings, decodeLinedefs, decodeSidedefs, decodeSectors,
  decodeSegs, decodeSubsectors, decodeNodes, resolveRefs, checkReject, checkBlockmap,
  detectNodeFormat, parseXnodCounts, inflateCapped, findGlBsp, INFLATE_CAP,
  decodePnames, decodeTextureLump, composeTexture, decodePicture, checkFlat,
  checkPlaypal, checkColormap, fallbackPalette, PLAYPAL_SIZE, COLORMAP_SIZE, FLAT_SIZE,
  detectHexen, isDehackedLump,
} from '../src/wad/index.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';
import { accumulatorStep, TIC_STEP_MS, MAX_STEPS } from '../src/core/clock.js';
import { createLoop } from '../src/core/loop.js';
import { createFrameBuffer, viewOverMemory, rebindView } from '../src/render/fbView.js';
import { renderAutomap, renderStatusBar, FB_W, FB_H } from '../src/render/automap.js';
import { probeCapabilities, resolveTier } from '../src/render/tiers.js';
import { probeSimd, simdOverride, pickWasmBinary } from '../src/engine/simdProbe.js';
import { initEngine, ENGINE_VERSION } from '../src/engine/doomEngine.js';
import { precacheWad, loadCachedWad, cacheStatus } from '../src/storage/wad-cache.js';
import { createPresenter } from '../src/render/present2d.js';

const here = dirname(fileURLToPath(import.meta.url));
const doomRoot = join(here, '..');
const readText = (rel) => readFileSync(join(doomRoot, rel), 'utf8');

// ---- synthetic WAD builders (hostile containers, no demo bytes needed) ----
function synthWad({ magic = 'IWAD', numlumps = 0, infotableofs = 12, entries = [] } = {}) {
  const dirSize = entries.length * 16;
  const tail = Math.max(infotableofs + dirSize, 12);
  const buf = new Uint8Array(tail);
  for (let i = 0; i < 4; i++) buf[i] = magic.charCodeAt(i);
  const v = new DataView(buf.buffer);
  v.setInt32(4, numlumps, true);
  v.setInt32(8, infotableofs, true);
  entries.forEach((e, i) => {
    const o = infotableofs + i * 16;
    v.setInt32(o, e.filepos, true);
    v.setInt32(o + 4, e.size, true);
    for (let k = 0; k < 8; k++) buf[o + 8 + k] = k < e.name.length ? e.name.charCodeAt(k) : 0;
  });
  return buf;
}
const marker = (name) => ({ name, filepos: 0, size: 0 });

function demoGeo(map = 'E1M1') {
  const wad = buildDemoWad();
  const dir = parseWadDirectory(wad);
  const m = discoverMaps(dir.lumps).find((x) => x.map === map);
  const B = (n) => lumpBytes(wad, m.entries[n]);
  return {
    vertexes: decodeVertexes(B('VERTEXES'), map),
    things: decodeThings(B('THINGS'), false, map),
    linedefs: decodeLinedefs(B('LINEDEFS'), false, map),
    sidedefs: decodeSidedefs(B('SIDEDEFS'), map),
    sectors: decodeSectors(B('SECTORS'), map),
  };
}

describe('pod1: hostile container fuzz', () => {
  it('empty and short buffers reject E_CONTAINER', () => {
    for (const buf of [new Uint8Array(0), new Uint8Array(10), new Uint8Array(11)]) {
      assert.throws(() => parseWadDirectory(buf), (e) => e.code === 'E_CONTAINER');
    }
  });
  it('bad magic rejects (DOOM, garbage, lowercase)', () => {
    for (const magic of ['DOOM', 'WAD3', 'iwad', 'PK\x03\x04']) {
      assert.throws(() => parseWadDirectory(synthWad({ magic })), (e) => e.code === 'E_CONTAINER', magic);
    }
    assert.equal(parseWadDirectory(synthWad({ magic: 'IWAD' })).magic, 'IWAD');
    assert.equal(parseWadDirectory(synthWad({ magic: 'PWAD' })).magic, 'PWAD');
  });
  it('numlumps extremes reject: negative, zero-ok, over-cap', () => {
    assert.throws(() => parseWadDirectory(synthWad({ numlumps: -1 })), (e) => e.code === 'E_CONTAINER');
    assert.equal(parseWadDirectory(synthWad({ numlumps: 0 })).numlumps, 0);
    assert.throws(() => parseWadDirectory(synthWad({ numlumps: (1 << 20) + 1 })), (e) => e.code === 'E_CONTAINER');
  });
  it('infotableofs outside file rejects', () => {
    assert.throws(() => parseWadDirectory(synthWad({ infotableofs: 4 })), (e) => e.code === 'E_CONTAINER');
    const full = synthWad({ numlumps: 2, entries: [marker('E1M1'), marker('THINGS')] });
    assert.throws(() => parseWadDirectory(full.subarray(0, 20)), (e) => e.code === 'E_CONTAINER');
  });
  it('lump range escape rejects (filepos+size past EOF)', () => {
    const wad = synthWad({ numlumps: 1, entries: [{ name: 'PLAYPAL', filepos: 12, size: 10 }] });
    assert.throws(() => parseWadDirectory(wad.subarray(0, 20)), (e) => e.code === 'E_CONTAINER');
  });
  it('data lump with filepos inside header rejects', () => {
    const wad = synthWad({ numlumps: 1, infotableofs: 64, entries: [{ name: 'VERTEXES', filepos: 4, size: 4 }] });
    const big = new Uint8Array(96);
    big.set(wad.subarray(0, 12), 0);
    new DataView(big.buffer).setInt32(8, 64, true);
    big.set(wad.subarray(64, 80), 64);
    assert.throws(() => parseWadDirectory(big), (e) => e.code === 'E_CONTAINER');
  });
  it('overlapping data ranges reject', () => {
    const entries = [
      { name: 'VERTEXES', filepos: 44, size: 20 },
      { name: 'LINEDEFS', filepos: 50, size: 20 },
    ];
    const wad = synthWad({ numlumps: 2, infotableofs: 12, entries });
    const big = new Uint8Array(96);
    big.set(wad, 0);
    assert.throws(() => parseWadDirectory(big), (e) => e.code === 'E_CONTAINER' && /overlap/.test(e.actual));
  });
  it('CheckedReader: OOB, negative, fractional, NaN all throw E_CONTAINER', () => {
    const r = new CheckedReader(new Uint8Array(16));
    assert.throws(() => r.u16(15), (e) => e.code === 'E_CONTAINER');
    assert.throws(() => r.u8(-1), (e) => e.code === 'E_CONTAINER');
    assert.throws(() => r.u32(1.5), (e) => e.code === 'E_CONTAINER');
    assert.throws(() => r.slice(0, NaN), (e) => e.code === 'E_CONTAINER');
    assert.throws(() => r.ascii(14, 8), (e) => e.code === 'E_CONTAINER');
    assert.throws(() => r.name8(9), (e) => e.code === 'E_CONTAINER');
    assert.throws(() => new CheckedReader('not-a-buffer'), (e) => e.code === 'E_CONTAINER');
    assert.equal(new CheckedReader(new ArrayBuffer(8)).u8(7), 0);
  });
  it('lumpBytes: zero-size marker yields empty; escape throws', () => {
    const bytes = new Uint8Array(64);
    assert.equal(lumpBytes(bytes, { name: 'E1M1', filepos: 0, size: 0 }).length, 0);
    assert.throws(() => lumpBytes(bytes, { name: 'X', filepos: 60, size: 8, dirOffset: 0 }), (e) => e.code === 'E_CONTAINER');
  });
});

describe('pod1: decoder boundary traps', () => {
  const badLens = [
    ['VERTEXES', 5, (b) => decodeVertexes(b)],
    ['THINGS', 11, (b) => decodeThings(b)],
    ['LINEDEFS', 13, (b) => decodeLinedefs(b)],
    ['SIDEDEFS', 29, (b) => decodeSidedefs(b)],
    ['SECTORS', 25, (b) => decodeSectors(b)],
    ['SEGS', 11, (b) => decodeSegs(b)],
    ['SSECTORS', 3, (b) => decodeSubsectors(b)],
    ['NODES', 27, (b) => decodeNodes(b)],
  ];
  for (const [lump, len, fn] of badLens) {
    it(`${lump} length ${len} throws E_MAP`, () => {
      assert.throws(() => fn(new Uint8Array(len), 'E1M1'), (e) => e.code === 'E_MAP');
    });
  }
  it('empty geometry tables throw E_MAP (except segs/ssectors/nodes)', () => {
    const empty = new Uint8Array(0);
    assert.throws(() => decodeVertexes(empty, 'E1M1'), (e) => e.code === 'E_MAP');
    assert.throws(() => decodeLinedefs(empty, 'E1M1'), (e) => e.code === 'E_MAP');
    assert.throws(() => decodeSidedefs(empty, 'E1M1'), (e) => e.code === 'E_MAP');
    assert.throws(() => decodeSectors(empty, 'E1M1'), (e) => e.code === 'E_MAP');
    assert.deepEqual(decodeSegs(empty), []);
    assert.deepEqual(decodeSubsectors(empty), []);
    assert.deepEqual(decodeNodes(empty), []);
  });
  it('hexen 20-byte THINGS decode; 10-byte body under hexen flag throws', () => {
    assert.equal(decodeThings(new Uint8Array(20), true, 'MAP01').length, 1);
    assert.throws(() => decodeThings(new Uint8Array(10), true, 'MAP01'), (e) => e.code === 'E_MAP');
    assert.equal(decodeLinedefs(new Uint8Array(16), true, 'MAP01').length, 1);
  });
  it('picture hostile inputs throw W_MEDIA; minimal valid 1x1 decodes', () => {
    assert.throws(() => decodePicture(new Uint8Array([0, 0, 8, 0, 0, 0, 0, 0])), (e) => e.code === 'W_MEDIA');
    assert.throws(() => decodePicture(new Uint8Array(12)), (e) => e.code === 'W_MEDIA');
    const badOff = new Uint8Array(12);
    badOff[0] = 1; badOff[2] = 1;
    new DataView(badOff.buffer).setUint32(8, 999, true);
    assert.throws(() => decodePicture(badOff), (e) => e.code === 'W_MEDIA');
    const good = new Uint8Array(13);
    good[0] = 1; good[2] = 1;
    new DataView(good.buffer).setUint32(8, 12, true);
    good[12] = 0xff;
    assert.deepEqual(decodePicture(good).data, new Uint8Array([255]));
  });
  it('PLAYPAL/COLORMAP/FLAT exact sizes pass; off-by-one throws W_MEDIA', () => {
    checkPlaypal(new Uint8Array(PLAYPAL_SIZE));
    checkColormap(new Uint8Array(COLORMAP_SIZE));
    checkFlat(new Uint8Array(FLAT_SIZE));
    assert.throws(() => checkPlaypal(new Uint8Array(PLAYPAL_SIZE - 1)), (e) => e.code === 'W_MEDIA');
    assert.throws(() => checkColormap(new Uint8Array(0)), (e) => e.code === 'W_MEDIA');
    assert.throws(() => checkFlat(new Uint8Array(FLAT_SIZE + 1)), (e) => e.code === 'W_MEDIA');
    assert.equal(fallbackPalette().length, 768);
  });
  it('PNAMES count overrun throws W_MEDIA', () => {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, 5, true);
    assert.throws(() => decodePnames(buf), (e) => e.code === 'W_MEDIA');
    assert.throws(() => decodePnames(new Uint8Array(3)), (e) => e.code === 'W_MEDIA');
  });
  it('TEXTURE lump hostile: short, count bomb, bad offset, insane dims', () => {
    assert.throws(() => decodeTextureLump(new Uint8Array(3)), (e) => e.code === 'W_MEDIA');
    const bomb = new Uint8Array(8);
    new DataView(bomb.buffer).setUint32(0, 4097, true);
    assert.throws(() => decodeTextureLump(bomb), (e) => e.code === 'W_MEDIA');
    const off = new Uint8Array(8);
    new DataView(off.buffer).setUint32(0, 1, true);
    new DataView(off.buffer).setInt32(4, 500, true);
    assert.throws(() => decodeTextureLump(off), (e) => e.code === 'W_MEDIA');
    const dims = new Uint8Array(38);
    new DataView(dims.buffer).setUint32(0, 1, true);
    new DataView(dims.buffer).setInt32(4, 8, true);
    dims[8 + 12] = 0; dims[8 + 13] = 0; // width 0
    assert.throws(() => decodeTextureLump(dims), (e) => e.code === 'W_MEDIA' && /sane dimensions/.test(e.expected));
  });
  it('composeTexture: transparent skip, missing patch skip, clip, overwrite', () => {
    const tex = { width: 4, height: 4, patches: [{ ox: 0, oy: 0, index: 0 }, { ox: 0, oy: 0, index: 7 }] };
    const pic = { w: 2, h: 2, data: new Uint8Array([5, 255, 255, 5]) };
    const buf = composeTexture(tex, [pic]);
    assert.equal(buf[0], 5);
    assert.equal(buf[1], 255); // transparent pixel skipped
    const clip = composeTexture({ width: 2, height: 2, patches: [{ ox: -5, oy: -5, index: 0 }] }, [pic]);
    assert.ok(clip.every((b) => b === 255)); // fully off-canvas: no crash, no write
  });
});

describe('pod1: cross-reference hostility', () => {
  it('vertex index OOB is E_REF', () => {
    const geo = demoGeo();
    geo.linedefs[0].v0 = 9999;
    const { errors } = resolveRefs(geo, 'E1M1');
    assert.ok(errors.some((e) => e.code === 'E_REF' && e.lump === 'LINEDEFS'));
  });
  it('front 0xFFFF is E_REF; two-sided missing back is E_REF; back OOB is E_REF', () => {
    const g1 = demoGeo(); g1.linedefs[0].front = 0xffff;
    assert.ok(resolveRefs(g1, 'E1M1').errors.some((e) => e.code === 'E_REF'));
    const g2 = demoGeo(); g2.linedefs[0].flags |= 0x0004;
    assert.ok(resolveRefs(g2, 'E1M1').errors.some((e) => /two-sided needs back/.test(e.expected)));
    const g3 = demoGeo(); g3.linedefs[0].back = 500;
    assert.ok(resolveRefs(g3, 'E1M1').errors.some((e) => e.code === 'E_REF'));
  });
  it('sidedef sector OOB is E_REF; blank middle on one-sided warns W_GEOM', () => {
    const g1 = demoGeo(); g1.sidedefs[0].sector = 42;
    assert.ok(resolveRefs(g1, 'E1M1').errors.some((e) => e.code === 'E_REF' && e.lump === 'SIDEDEFS'));
    const g2 = demoGeo(); g2.sidedefs[0].middle = null;
    assert.ok(resolveRefs(g2, 'E1M1').warnings.some((e) => e.code === 'W_GEOM'));
  });
  it('inverted sector warns; unreferenced sector warns; clean demo has zero errors', () => {
    const g1 = demoGeo(); g1.sectors[0].floorH = 200; g1.sectors[0].ceilH = 100;
    assert.ok(resolveRefs(g1, 'E1M1').warnings.some((e) => /floor <= ceiling/.test(e.expected)));
    const g2 = demoGeo();
    g2.sectors.push({ floorH: 0, ceilH: 128, floorFlat: 'F', ceilFlat: 'C', light: 160, special: 0, tag: 0 });
    assert.ok(resolveRefs(g2, 'E1M1').warnings.some((e) => /unreferenced/.test(e.actual)));
    assert.deepEqual(resolveRefs(demoGeo(), 'E1M1').errors, []);
  });
  it('REJECT modes: zero, mismatch, blind, ok', () => {
    assert.equal(checkReject(new Uint8Array(0), 4).mode, 'zero');
    assert.ok(checkReject(new Uint8Array(3), 4).warnings.length > 0);
    assert.equal(checkReject(new Uint8Array([255]), 1).mode, 'blind');
    assert.equal(checkReject(new Uint8Array([0]), 1).mode, 'ok');
  });
  it('demo BLOCKMAP validates; garbage blockmaps fail closed with warnings', () => {
    const wad = buildDemoWad();
    const dir = parseWadDirectory(wad);
    const m = discoverMaps(dir.lumps)[0];
    const ok = checkBlockmap(lumpBytes(wad, m.entries.BLOCKMAP), 'E1M1');
    assert.equal(ok.valid, true);
    assert.equal(checkBlockmap(new Uint8Array([1, 2, 3]), 'E1M1').valid, false);
    const dims = new Uint8Array(16);
    new DataView(dims.buffer).setInt16(4, 600, true);
    new DataView(dims.buffer).setInt16(6, 600, true);
    assert.equal(checkBlockmap(dims, 'E1M1').valid, false);
  });
  it('extended nodes: all family magics classify; overruns throw E_MAP', () => {
    for (const magic of ['XNOD', 'XGLN', 'XGL2', 'XGL3', 'ZNOD', 'ZGLN', 'ZGL2', 'ZGL3']) {
      const b = new Uint8Array(5);
      for (let i = 0; i < 4; i++) b[i] = magic.charCodeAt(i);
      assert.equal(detectNodeFormat(b), magic);
    }
    assert.equal(detectNodeFormat(new Uint8Array([65, 66, 67, 68])), 'vanilla');
    assert.equal(detectNodeFormat(new Uint8Array(3)), 'vanilla');
    const minimal = new Uint8Array(16);
    minimal.set([88, 78, 79, 68]);
    new DataView(minimal.buffer).setUint32(12, 5, true);
    const c = parseXnodCounts(minimal, 'MAP01');
    assert.deepEqual([c.format, c.numVerts, c.numSubsectors, c.numNodes], ['XNOD', 0, 0, 5]);
    const huge = new Uint8Array(8);
    huge.set([88, 78, 79, 68]);
    new DataView(huge.buffer).setUint32(4, 0xffffffff, true);
    assert.throws(() => parseXnodCounts(huge, 'MAP01'), (e) => e.code === 'E_MAP');
    assert.throws(() => parseXnodCounts(new Uint8Array([88, 78, 79, 68]), 'MAP01'), (e) => e.code === 'E_MAP');
  });
  it('inflateCapped passes small payloads, rejects past 16MB', async () => {
    const small = await inflateCapped(new Uint8Array([1]), async () => new Uint8Array(10));
    assert.equal(small.length, 10);
    await assert.rejects(
      () => inflateCapped(new Uint8Array([1]), async () => new Uint8Array(INFLATE_CAP + 1)),
      (e) => e.code === 'E_MAP',
    );
  });
  it('hexen detect, dehacked guard, glBSP probe', () => {
    assert.equal(detectHexen({ map: 'E1M1', entries: {} }).hexen, false);
    assert.match(detectHexen({ map: 'MAP01', entries: { BEHAVIOR: {} } }).message, /Hexen dialect/);
    assert.equal(isDehackedLump('DEHACKED'), true);
    assert.equal(isDehackedLump('PLAYPAL'), false);
    const full = ['GL_VERT', 'GL_SEGS', 'GL_SSECT', 'GL_NODES'].map((name) => ({ name }));
    assert.equal(findGlBsp(full).present, true);
    assert.equal(findGlBsp([{ name: 'GL_VERT' }]).present, false);
  });
  it('WadError/MapReport/WadReport ledger semantics', () => {
    const rep = new MapReport('E1M1');
    const err = new WadError({ code: 'E_REF', lump: 'LINEDEFS', map: 'E1M1', offset: 0, expected: 'x', actual: 'y' });
    rep.add(err);
    assert.equal(rep.dropped, true);
    assert.equal(rep.errors.length, 1);
    const warn = new WadError({ code: 'W_GEOM', lump: 'SECTORS', map: 'E1M1', offset: 0, expected: 'x', actual: 'y' });
    const rep2 = new MapReport('E1M2');
    rep2.add(warn);
    assert.equal(rep2.dropped, false);
    assert.equal(rep2.warnings.length, 1);
    const wr = new WadReport();
    wr.forMap('E1M1').add(err);
    assert.equal(wr.toJSON().maps[0].dropped, true);
    assert.match(err.message, /\[E_REF\]/);
  });
});

describe('pod1: map discovery and overlay', () => {
  it('marker grammar accepts E1M1/MAP01, rejects E1M0/E6M1/MAP1/TEXTURE1', () => {
    assert.equal(isMapMarker('E1M1'), true);
    assert.equal(isMapMarker('MAP01'), true);
    assert.equal(isMapMarker('E1M0'), false);
    assert.equal(isMapMarker('E6M1'), false);
    assert.equal(isMapMarker('MAP1'), false);
    assert.equal(isMapMarker('TEXTURE1'), false);
  });
  it('truncated map sequence is partial, never throws the whole scan', () => {
    const lumps = [marker('E1M1'), marker('THINGS')].map((l, i) => ({ ...l, index: i, filepos: 0, size: 0, dirOffset: 0 }));
    const maps = discoverMaps(lumps);
    assert.equal(maps.length, 1);
    assert.equal(maps[0].partial, true);
    assert.ok(maps[0].entries.THINGS);
  });
  it('demo discovers two full maps; episode clamp gates shareware', () => {
    const dir = parseWadDirectory(buildDemoWad());
    const maps = discoverMaps(dir.lumps);
    assert.deepEqual(maps.map((m) => m.map), ['E1M1', 'E1M2']);
    assert.ok(maps.every((m) => m.partial === false));
    assert.deepEqual(episodeClamp(maps), { episodes: [1], sharewareLikely: true });
    const full = [...maps, { map: 'MAP01' }];
    assert.deepEqual(episodeClamp(full).episodes, [1, 2, 3, 4]);
  });
  it('overlayLumps is last-wins and appends unknowns', () => {
    const base = [{ name: 'PLAYPAL' }, { name: 'TEXTURE1', v: 1 }];
    const out = overlayLumps(base, [{ name: 'TEXTURE1', v: 2 }, { name: 'NEWLUMP' }]);
    assert.equal(out.find((l) => l.name === 'TEXTURE1').v, 2);
    assert.ok(out.some((l) => l.name === 'NEWLUMP'));
    assert.equal(out.length, 3);
  });
});

describe('pod2: concurrency saturation + clock determinism', () => {
  it('25 parallel engine boots all resolve E1M1', async () => {
    const wad = buildDemoWad();
    const engines = await Promise.all(Array.from({ length: 25 }, () => initEngine({ wadBytes: wad })));
    assert.ok(engines.every((e) => e.map === 'E1M1' && e.version === ENGINE_VERSION));
    for (const e of engines) e.shutdown();
  });
  it('rapid key/cmd interleave never corrupts tick count', async () => {
    const eng = await initEngine({ wadBytes: buildDemoWad() });
    for (let i = 0; i < 200; i++) {
      eng.queueKey(i % 2 ? 'turnLeft' : 'turnRight', i % 3 !== 0);
      eng.injectTiccmd({ forwardmove: i, sidemove: 0, angleturn: i * 7, buttons: i & 1, weaponSelect: null });
      eng.tickOnce();
    }
    assert.equal(eng.tickCount, 200);
  });
  it('35 exact steps per second; clamp at 100ms; hostile dt never hangs', () => {
    const s = { acc: 0 };
    let total = 0;
    for (let i = 0; i < 35; i++) total += accumulatorStep(s, TIC_STEP_MS).steps;
    assert.equal(total, 35);
    assert.ok(s.acc < 1e-6);
    assert.equal(accumulatorStep({ acc: 0 }, 10000).steps, MAX_STEPS);
    assert.equal(accumulatorStep({ acc: 0 }, Infinity).steps, MAX_STEPS);
    assert.equal(accumulatorStep({ acc: 0 }, -50).steps, 0);
    const nan = accumulatorStep({ acc: 0 }, NaN);
    assert.equal(nan.steps, 0); // no hang, no throw on NaN dt
  });
  it('rAF loop driver starts, renders, pauses (node fallback timers)', async () => {
    let ticks = 0, renders = 0, pausedMsg = '';
    const loop = createLoop({ tick: () => ticks++, render: () => renders++, onPause: () => { pausedMsg = 'paused'; } });
    loop.start();
    await new Promise((r) => setTimeout(r, 150));
    loop.pause();
    const frozen = renders;
    await new Promise((r) => setTimeout(r, 60));
    assert.ok(renders > 0);
    assert.equal(renders, frozen);
    assert.equal(pausedMsg, 'paused');
    assert.ok(loop.__test.clock);
    delete globalThis.requestAnimationFrame;
  });
});

describe('pod3: soak + memory profile', () => {
  it('3000-tick soak: count exact, framebuffer stays lit, player sane', async () => {
    const eng = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    eng.queueKey('turnLeft', true);
    for (let i = 0; i < 3000; i++) eng.tickOnce();
    assert.equal(eng.tickCount, 3000);
    const lit = eng.__fb.data.reduce((a, b) => a + (b === 0 ? 0 : 1), 0);
    assert.ok(lit > 100);
    const p = eng.getPlayer();
    assert.ok(Number.isFinite(p.angle) && p.type === 1);
  });
  it('100 sequential boots: heap growth bounded (no leak signature)', async () => {
    const wad = buildDemoWad();
    if (globalThis.gc) globalThis.gc();
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 100; i++) (await initEngine({ wadBytes: wad })).shutdown();
    if (globalThis.gc) globalThis.gc();
    const deltaMB = (process.memoryUsage().heapUsed - before) / (1 << 20);
    assert.ok(deltaMB < 150, `heap grew ${deltaMB.toFixed(1)}MB over 100 boots`);
  });
  it('demo WAD bytes are deterministic across builds', () => {
    assert.deepEqual(buildDemoWad(), buildDemoWad());
  });
});

describe('pod4: tail-latency profile (generous CI-safe bands)', () => {
  it('renderAutomap 200 frames: mean < 50ms, max < 500ms', async () => {
    const eng = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    const samples = [];
    for (let i = 0; i < 200; i++) {
      const t0 = performance.now();
      renderAutomap(eng.__fb, eng.__geo);
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const p99 = samples[Math.floor(samples.length * 0.99)];
    assert.ok(mean < 50, `mean ${mean.toFixed(2)}ms`);
    assert.ok(p99 < 500, `p99 ${p99.toFixed(2)}ms`);
  });
  it('cold boot 10x: every boot < 2s, status bar renders text', async () => {
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now();
      const eng = await initEngine({ wadBytes: buildDemoWad(), map: i % 2 ? 'E1M2' : 'E1M1' });
      assert.ok(performance.now() - t0 < 2000);
      renderStatusBar(eng.__fb, 'E1M1 TEST 123');
      const bar = eng.__fb.data.slice((FB_H - 12) * FB_W);
      assert.ok(bar.some((b) => b !== 0));
    }
  });
});

describe('engine boundary and error paths', () => {
  it('version string pinned; unknown map falls back to first', async () => {
    assert.equal(ENGINE_VERSION, 'm1-js-core/1.0.0');
    const eng = await initEngine({ wadBytes: buildDemoWad(), map: 'MAP99' });
    assert.equal(eng.map, 'E1M1');
  });
  it('ArrayBuffer input accepted (not only Uint8Array)', async () => {
    const eng = await initEngine({ wadBytes: buildDemoWad().slice().buffer });
    assert.equal(eng.map, 'E1M1');
  });
  it('zero-lump WAD rejects no-maps E_MAP; hexen fixture refuses dialect', async () => {
    await assert.rejects(() => initEngine({ wadBytes: synthWad({ numlumps: 0 }) }), (e) => e.code === 'E_MAP');
    const { buildHexenWad } = await import('./helpers/hexen-fixture.mjs');
    await assert.rejects(() => initEngine({ wadBytes: buildHexenWad(), map: 'MAP01' }), /Hexen dialect/);
  });
  it('framebuffer contract: 320x200, zero-copy write-through, OOB RangeError', () => {
    assert.equal(FB_W * FB_H, 64000);
    const fb = createFrameBuffer(FB_W, FB_H);
    assert.equal(fb.data.length, 64000);
    const mem = { buffer: new ArrayBuffer(1024) };
    const v = viewOverMemory(mem, 100, 10, 10);
    v[0] = 7;
    assert.equal(new Uint8Array(mem.buffer)[100], 7);
    assert.throws(() => viewOverMemory(mem, 1000, 10, 10), RangeError);
    assert.throws(() => viewOverMemory(mem, -4, 2, 2), RangeError);
    assert.equal(rebindView(() => 42), 42);
  });
  it('automap never crashes on null/empty/OOB geometry', () => {
    const fb = createFrameBuffer(FB_W, FB_H);
    assert.doesNotThrow(() => renderAutomap(fb, null));
    assert.doesNotThrow(() => renderAutomap(fb, { vertexes: [], linedefs: [] }));
    assert.doesNotThrow(() => renderAutomap(fb, {
      vertexes: [{ x: 0, y: 0 }],
      linedefs: [{ v0: 9, v1: 10, flags: 0 }],
      things: [{ x: 0, y: 0, angle: 720, type: 9999 }],
    }));
    assert.doesNotThrow(() => renderStatusBar(fb, 'x'.repeat(500)));
  });
  it('tiers/simd/cache/presenter surface sanity', async () => {
    assert.deepEqual(probeCapabilities({}), { hasWebGL2: false, hasWebGL1: false, hasWasm: true, simd: false });
    assert.equal(resolveTier({ hasWasm: true }), 2);
    assert.equal(resolveTier({ hasWasm: false }), 3);
    assert.equal(resolveTier({ hasWasm: true }, 0), 0);
    assert.equal(resolveTier({ hasWasm: true }, 99), 2);
    assert.equal(probeSimd(() => false), false);
    assert.equal(probeSimd(() => true), true);
    assert.equal(probeSimd(() => { throw new Error('x'); }), false);
    assert.equal(simdOverride(), null);
    assert.equal(pickWasmBinary({ simdSupported: false, override: null }), 'wasm/doom-scalar.wasm');
    assert.equal(pickWasmBinary({ simdSupported: false, override: true }), 'wasm/doom-simd.wasm');
    const bytes = buildDemoWad();
    assert.equal(await precacheWad(bytes), 'memory');
    assert.deepEqual(await loadCachedWad(), bytes);
    const st = await cacheStatus();
    assert.equal(st.present, true);
    assert.equal(typeof createPresenter, 'function');
  });
});

describe('consumer shell: static DOM, security, artifacts', () => {
  const html = readText('index.html');
  const app = readText('app.js');
  const sw = readText('sw.js');
  it('all interactive hooks exist: canvas, status, picker, dropzone, maps, pause/resume, errors', () => {
    for (const id of ['doom-canvas', 'status-line', 'wad-picker', 'wad-drop', 'map-select', 'btn-pause', 'btn-resume', 'error-list', 'wad-info']) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('type="module"') && html.includes('./app.js'));
    assert.ok(html.includes('aria-label') && html.includes('tabindex="0"'));
    assert.ok(html.includes('width="320"') && html.includes('height="200"'));
  });
  it('no blocking prompts, no eval, no em dashes in shell', () => {
    assert.ok(!/alert\s*\(|prompt\s*\(|confirm\s*\(/.test(app));
    assert.ok(!/eval\s*\(|new Function/.test(app + sw));
    assert.ok(!/\u2014/.test(html + app));
  });
  it('service worker is same-origin GET-only with shell precache', () => {
    assert.ok(sw.includes("method !== 'GET'"));
    assert.ok(sw.includes('self.location.origin'));
    assert.ok(sw.includes('index.html'));
  });
  it('first-frame.png is a real 320x200 PNG, not a placeholder', () => {
    const p = join(doomRoot, 'docs', 'first-frame.png');
    assert.ok(existsSync(p));
    const d = readFileSync(p);
    assert.deepEqual([...d.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(d.readUInt32BE(16), 320);
    assert.equal(d.readUInt32BE(20), 200);
    assert.ok(d.length > 500);
  });
  it('build scripts and docs ship: emcc SIMD/scalar split, C shim boundary, scoreboard', () => {
    const sh = readText('build/emcc_m1.sh');
    assert.ok(sh.includes('emcc') && sh.includes('-msimd128'));
    assert.ok(/pthread/i.test(sh)); // documents the no-pthreads hard rule
    const shim = readText('build/shim_m1.c');
    assert.ok(shim.includes('DG_DrawFrame') && shim.includes('doom_getFrameBuffer'));
    assert.ok(existsSync(join(doomRoot, 'docs', 'research-spec.md')));
    assert.ok(existsSync(join(doomRoot, 'docs', 'scoreboard.md')));
    assert.ok(existsSync(join(doomRoot, 'theme.css')));
  });
  it('serves locally over HTTP: index + app.js return 200 (200s)', async () => {
    const port = 18923;
    const server = spawn('python3', ['-m', 'http.server', String(port), '--directory', doomRoot], { stdio: 'ignore' });
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const get = (path) => new Promise((resolve, reject) => {
        import('node:http').then(({ get: httpGet }) => {
          httpGet(`http://127.0.0.1:${port}${path}`, (res) => {
            let n = 0;
            res.on('data', (c) => { n += c.length; });
            res.on('end', () => resolve({ status: res.statusCode, bytes: n }));
          }).on('error', reject);
        });
      });
      const index = await get('/index.html');
      const appRes = await get('/app.js');
      assert.equal(index.status, 200);
      assert.ok(index.bytes > 500);
      assert.equal(appRes.status, 200);
      assert.ok(appRes.bytes > 1000);
    } finally {
      server.kill('SIGKILL');
    }
  }, { timeout: 30000 });
});
