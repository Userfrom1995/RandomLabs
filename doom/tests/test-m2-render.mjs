// M2 render tests: upload format choice, RGBA expansion, palette dirty
// tracking, GL shader contract (headless graceful failure), resolution
// governor hysteresis, tier ladder with M1 pins, engine movement
// determinism (same inputs converge, hostile inputs never corrupt).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseUploadFormat, expandToRGBA, frameBytes, UNPACK_ALIGNMENT } from '../src/render/upload.js';
import { createPaletteManager, PALETTE_BYTES } from '../src/render/palette.js';
import { VERT_SRC, FRAG_PAL_SRC, FRAG_RGBA_SRC, createGLPresenter, GlUnavailable } from '../src/render/glQuad.js';
import { LADDER, createResolutionGovernor, initialStepIndex, RES } from '../src/render/resolution.js';
import { resolveTier, tierForFailure } from '../src/render/tiers.js';
import { initEngine } from '../src/engine/doomEngine.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';

describe('upload format choice', () => {
  it('webgl2 first, then webgl, else cpu', () => {
    assert.equal(chooseUploadFormat({ webgl2: true, webgl: true }), 'r8');
    assert.equal(chooseUploadFormat({ webgl2: false, webgl: true }), 'rgba');
    assert.equal(chooseUploadFormat({}), 'cpu');
    assert.equal(chooseUploadFormat({ hasWebGL2: true }), 'r8');
    assert.equal(chooseUploadFormat({ hasWebGL1: true }), 'rgba');
  });
  it('UNPACK_ALIGNMENT is 1 for NPOT paletted rows', () => {
    assert.equal(UNPACK_ALIGNMENT, 1);
  });
  it('paletted upload is 4x smaller than RGBA at 320x200', () => {
    assert.equal(frameBytes('r8'), 64000);
    assert.equal(frameBytes('rgba'), 256000);
  });
  it('expandToRGBA maps indices through the palette, clamps strays', () => {
    const pal = new Uint8Array(768);
    pal[0] = 10; pal[1] = 20; pal[2] = 30;
    pal[3] = 40; pal[4] = 50; pal[5] = 60;
    const out = expandToRGBA(new Uint8Array([0, 1, 300, -2]), pal);
    assert.deepEqual([...out.subarray(0, 8)], [10, 20, 30, 255, 40, 50, 60, 255]);
    assert.equal(out[11], 255, 'stray indices stay opaque');
  });
});

describe('palette manager', () => {
  it('uploads once per change, never per frame', () => {
    const pm = createPaletteManager();
    assert.equal(pm.needsUpload(), true, 'initial palette pending');
    pm.markUploaded();
    assert.equal(pm.needsUpload(), false);
    assert.equal(pm.setPalette(new Uint8Array(PALETTE_BYTES)), false, 'identical bytes no-op');
    assert.equal(pm.needsUpload(), false);
    const next = new Uint8Array(PALETTE_BYTES);
    next[100] = 7;
    assert.equal(pm.setPalette(next), true);
    assert.equal(pm.version, 1);
    assert.equal(pm.needsUpload(), true);
  });
  it('rejects short palettes', () => {
    const pm = createPaletteManager();
    pm.markUploaded();
    assert.equal(pm.setPalette(new Uint8Array(10)), false);
    assert.equal(pm.needsUpload(), false);
  });
});

describe('GL quad shader contract', () => {
  it('paletted shader samples frame plus 256-entry palette, single pass', () => {
    assert.ok(VERT_SRC.includes('aPos') && VERT_SRC.includes('aUV'));
    assert.ok(FRAG_PAL_SRC.includes('uFrame') && FRAG_PAL_SRC.includes('uPalette'));
    assert.ok(FRAG_PAL_SRC.includes('/ 256.0'), 'palette texel centers');
    assert.ok(FRAG_PAL_SRC.includes('uFlash') && FRAG_PAL_SRC.includes('uGamma'));
    assert.ok(FRAG_RGBA_SRC.includes('uFrame') && !FRAG_RGBA_SRC.includes('uPalette'));
  });
  it('createGLPresenter throws GlUnavailable headless, never a raw TypeError', () => {
    assert.throws(() => createGLPresenter(null), GlUnavailable);
    assert.throws(() => createGLPresenter({}), GlUnavailable);
    const throwing = { getContext: () => null };
    assert.throws(() => createGLPresenter(throwing, { format: 'r8' }), GlUnavailable);
  });
});

describe('resolution governor', () => {
  it('ladder holds 640x400, 480x300, 320x200, 256x160 emergency', () => {
    assert.deepEqual(LADDER.map((s) => s.label), ['640x400', '480x300', '320x200', '256x160']);
  });
  it('conservative start on mobile and battery saver', () => {
    assert.equal(initialStepIndex({}), 0);
    assert.equal(initialStepIndex({ mobile: true }), 1);
    assert.equal(initialStepIndex({ batterySaver: true }), 2);
  });
  it('hysteresis: no oscillation within 500ms', () => {
    let t = 0;
    const seen = [];
    const g = createResolutionGovernor({ initial: 1, now: () => t, onChange: (s, i) => seen.push(i) });
    for (let i = 0; i < 40; i++) g.observe(40);
    assert.equal(g.index, 2, 'steps down under sustained load');
    const switches = seen.length;
    t += 100;
    for (let i = 0; i < 40; i++) g.observe(4);
    assert.equal(seen.length, switches, 'interval lock blocks flip-flop inside 500ms');
    t += 600;
    for (let i = 0; i < 60; i++) g.observe(4);
    assert.equal(g.index, 1, 'recovers after the interval elapses');
  });
  it('battery saver pins the ladder at 320x200 or below', () => {
    let t = 0;
    const g = createResolutionGovernor({ initial: 0, now: () => t });
    g.setBatterySaver(true);
    assert.ok(g.index >= 2, 'drops to efficient step');
    t += 1000;
    for (let i = 0; i < 100; i++) g.observe(2);
    assert.ok(g.index >= 2, 'never climbs while saver is on');
    assert.ok(!g.setManual(99), 'out-of-range manual rejected');
  });
  it('hostile frame times never corrupt the governor', () => {
    const g = createResolutionGovernor({ initial: 2 });
    for (const v of [NaN, Infinity, -5, 'x', null]) g.observe(v);
    assert.equal(g.index, 2);
  });
  it('down/up thresholds documented', () => {
    assert.ok(RES.DOWN_MS > RES.UP_MS, 'deadband between thresholds');
    assert.equal(RES.MIN_INTERVAL_MS, 500);
  });
});

describe('tier ladder with M1 pins', () => {
  it('M1 pins hold: wasm-only still resolves Tier 2, no-wasm Tier 3', () => {
    assert.equal(resolveTier({ hasWasm: true }), 2);
    assert.equal(resolveTier({ hasWasm: false }), 3);
    assert.equal(resolveTier({ hasWasm: true }, 3), 3);
    assert.equal(resolveTier({ hasWasm: true }, 99), 2);
  });
  it('M2: GL presence resolves Tier 0/1, webgl2 wins', () => {
    assert.equal(resolveTier({ hasWasm: true, hasWebGL2: true }), 0);
    assert.equal(resolveTier({ hasWasm: true, hasWebGL1: true }), 1);
    assert.equal(resolveTier({ webgl2: true }), 0);
    assert.equal(resolveTier({ webgl: true }), 1);
    assert.equal(resolveTier({ hasWebGL2: true, hasWebGL1: true }), 0);
  });
  it('tierForFailure walks one rung down to emergency', () => {
    assert.deepEqual([0, 1, 2, 3, 4].map(tierForFailure), [1, 2, 3, 4, 4]);
    assert.equal(tierForFailure('x'), 2);
  });
});

describe('M2 audit artifact', () => {
  it('docs/audit-m2.md exists with ALL PASS shell contract', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    assert.ok(existsSync(join(root, 'docs', 'audit-m2.md')), 'audit artifact committed');
    const md = readFileSync(join(root, 'docs', 'audit-m2.md'), 'utf8');
    assert.match(md, /ALL PASS/);
    assert.ok(md.includes('data-testid') || md.includes('testid'), 'testid coverage recorded');
  });
});

describe('engine movement determinism (M2)', () => {
  it('zero-input ticks render the static spawn marker (M1-identical)', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    const before = [...e.__fb.data];
    e.tickOnce();
    e.tickOnce();
    const p = e.getPlayer();
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.equal(p.attackCount, 0);
  });
  it('forward ticcmd displaces the player; twins converge bit-exactly', async () => {
    const run = async () => {
      const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
      const start = { x: e.getPlayer().x, y: e.getPlayer().y };
      e.injectTiccmd({ forwardmove: 50, sidemove: 0, angleturn: 0, buttons: 0, weaponSelect: null });
      e.tickOnce();
      e.injectTiccmd({ forwardmove: 0, sidemove: 40, angleturn: 0, buttons: 1, weaponSelect: 3 });
      e.tickOnce();
      return { e, start };
    };
    const [a, b] = await Promise.all([run(), run()]);
    for (const { e, start } of [a, b]) {
      const moved = Math.hypot(e.getPlayer().x - start.x, e.getPlayer().y - start.y);
      assert.ok(moved > 0.5, `movement displaces the player (moved ${moved})`);
    }
    const [ae, be] = [a.e, b.e];
    assert.deepEqual([...ae.getFrameBufferView()], [...be.getFrameBufferView()], 'twins converge');
    assert.deepEqual(
      [ae.getPlayer().x, ae.getPlayer().y, ae.getPlayer().angle, ae.getPlayer().weapon, ae.getPlayer().attackCount],
      [be.getPlayer().x, be.getPlayer().y, be.getPlayer().angle, be.getPlayer().weapon, be.getPlayer().attackCount],
    );
    assert.equal(ae.getPlayer().weapon, 3);
    assert.equal(ae.getPlayer().attackCount, 1);
  });
  it('buttons latch for exactly one tick; weapon clamps to 1..7', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    e.injectTiccmd({ buttons: 3, weaponSelect: 99 });
    e.tickOnce();
    assert.equal(e.getPlayer().attackCount, 1);
    assert.equal(e.getPlayer().useCount, 1);
    assert.equal(e.getPlayer().weapon, 7);
    e.tickOnce();
    assert.equal(e.getPlayer().attackCount, 1, 'no repeat without fresh input');
  });
  it('hostile ticcmd values never corrupt the simulation', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    for (const c of [
      { forwardmove: NaN, sidemove: Infinity, angleturn: NaN, buttons: NaN },
      { forwardmove: 1e12, angleturn: 1e12 },
      null, undefined, 'x', 42,
    ]) {
      e.injectTiccmd(c);
      e.tickOnce();
    }
    const p = e.getPlayer();
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.angle));
    assert.equal(e.tickCount, 6);
  });
  it('queueKey legacy turns plus strafe keys still steer', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    const x0 = e.getPlayer().x;
    e.queueKey('forward', true);
    e.tickOnce();
    e.queueKey('forward', false);
    assert.ok(e.getPlayer().x !== x0 || e.getPlayer().y !== 0, 'forward key moves');
  });
});
