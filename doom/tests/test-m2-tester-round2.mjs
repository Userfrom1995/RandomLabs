// Tester round-2 QA for M2 renderer + input (PR #364, post-QC-hardening).
// Independent angles beyond test-m2-tester-qa.mjs and test-m2-fixer-qc.mjs:
// paired bootstrap reproduction of the H2c CPU-cost gap, governor hysteresis
// under an injected clock, bindings conflict-swap roundtrip plus corrupt-store
// fallback, tier fallback chain, palette upload-once contract, expandToRGBA
// bit-exactness, and interleaved hostile input pump determinism.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expandToRGBA, frameBytes, chooseUploadFormat } from '../src/render/upload.js';
import { tierForFailure, resolveTier } from '../src/render/tiers.js';
import { createResolutionGovernor, LADDER, RES, initialStepIndex } from '../src/render/resolution.js';
import { createPaletteManager, PALETTE_BYTES, uploadPaletteGL } from '../src/render/palette.js';
import { GlUnavailable } from '../src/render/glQuad.js';
import {
  defaultBindings, loadBindings, saveBindings, findConflict, assignBinding,
} from '../src/input/bindings.js';
import { buildTiccmd, latchTiccmd } from '../src/input/tic.js';
import { summary, bootstrapMeanCI, pairedBootstrapCI } from '../src/perf/stats.js';

const W = 320;
const H = 200;
const N = W * H;

function makePalette() {
  const p = new Uint8Array(PALETTE_BYTES);
  for (let i = 0; i < 256; i++) { p[i * 3] = i; p[i * 3 + 1] = 255 - i; p[i * 3 + 2] = (i * 7) & 255; }
  return p;
}

describe('tester r2: H2c paired gap reproduces with bootstrap CI excluding zero', () => {
  it('RGBA-expand costs strictly more than R8 memcpy, N=30 paired', () => {
    const fb = new Uint8Array(N);
    for (let i = 0; i < N; i++) fb[i] = i & 255;
    const pal = makePalette();
    const r8 = new Uint8Array(N);
    const pairs = [];
    for (let b = 0; b < 30; b++) {
      const t0 = process.hrtime.bigint();
      for (let k = 0; k < 5; k++) expandToRGBA(fb, pal);
      const t1 = process.hrtime.bigint();
      for (let k = 0; k < 5; k++) r8.set(fb);
      const t2 = process.hrtime.bigint();
      pairs.push([Number(t1 - t0) / 5 / 1e6, Number(t2 - t1) / 5 / 1e6]);
    }
    const ci = pairedBootstrapCI(pairs.map(([a]) => a), pairs.map(([, b]) => b), { resamples: 2000 });
    assert.ok(ci.lo > 0, `paired RGBA-R8 CI must exclude zero, got [${ci.lo}, ${ci.hi}]`);
    const s = summary(pairs.map(([a]) => a));
    assert.ok(Number.isFinite(s.mean) && s.mean > 0);
  });
  it('frameBytes keeps the 4x R8-vs-RGBA arithmetic pin', () => {
    assert.equal(frameBytes('rgba', W, H), 4 * frameBytes('r8', W, H));
    assert.equal(frameBytes('r8', W, H), 64000);
  });
});

describe('tester r2: expandToRGBA bit-exactness and hostile indices', () => {
  it('matches a reference loop pixel for pixel, alpha always 255', () => {
    const fb = new Uint8Array([0, 1, 127, 255, 300 % 256, 0]);
    const pal = makePalette();
    const out = expandToRGBA(fb, pal);
    assert.equal(out.length, fb.length * 4);
    for (let i = 0; i < fb.length; i++) {
      const c = fb[i];
      assert.equal(out[i * 4], pal[c * 3]);
      assert.equal(out[i * 4 + 1], pal[c * 3 + 1]);
      assert.equal(out[i * 4 + 2], pal[c * 3 + 2]);
      assert.equal(out[i * 4 + 3], 255);
    }
  });
  it('out-of-range indices clamp to entry 0, never throw', () => {
    const fb = new Int16Array([-5, -1, 256, 999, 0]);
    const out = expandToRGBA(fb, makePalette());
    for (const i of [0, 1, 2, 3]) {
      assert.equal(out[i * 4], 0);
      assert.equal(out[i * 4 + 3], 255);
    }
  });
});

describe('tester r2: governor hysteresis with injected clock', () => {
  it('steps down at most one rung per 500 ms window, then recovers', () => {
    let t = 0;
    const seen = [];
    const g = createResolutionGovernor({ now: () => t, onChange: (s, i) => seen.push(i) });
    assert.equal(g.index, 0);
    for (let i = 0; i < 40; i++) { g.observe(40); t += 16; }
    assert.ok(g.index >= 1, `heavy load must step down, at index ${g.index}`);
    const afterBurst = g.index;
    for (let i = 0; i < 10; i++) { g.observe(40); t += 16; }
    assert.ok(g.index - afterBurst <= 1, 'hysteresis: at most one rung per window');
    t += 600;
    for (let i = 0; i < 400 && g.index > 0; i++) { g.observe(4); t += 16; if (i % 40 === 39) t += 600; }
    assert.equal(g.index, 0, 'light load must recover to the top rung');
  });
  it('hostile frame times never move the ladder and never poison EWMA', () => {
    let t = 0;
    const g = createResolutionGovernor({ now: () => t });
    for (const bad of [NaN, Infinity, -Infinity, -1, undefined, 'fast', null]) {
      const before = g.index;
      const size = g.observe(bad);
      assert.equal(g.index, before, `hostile ${String(bad)} must not move ladder`);
      assert.ok(size && Number.isFinite(size.w) && Number.isFinite(size.h));
    }
    assert.ok(Number.isFinite(g.ewma), 'EWMA stays finite after hostile feed');
  });
  it('battery saver floors at 320x200 and manual pins hold under load', () => {
    let t = 0;
    const g = createResolutionGovernor({ now: () => t, batterySaver: true });
    assert.ok(g.index >= 2, 'battery saver starts at or below 320x200');
    g.setBatterySaver(true);
    t += 1000;
    for (let i = 0; i < 60; i++) { g.observe(4); t += 100; }
    assert.ok(g.index >= 2, 'battery saver never climbs above 320x200');
    const m = createResolutionGovernor({ now: () => t });
    assert.ok(m.setManual(3));
    t += 1000;
    for (let i = 0; i < 60; i++) { m.observe(40); t += 100; }
    assert.equal(m.index, 3, 'manual pin holds under heavy load');
    assert.ok(!m.setManual(99) && !m.setManual(-1), 'out-of-range manual rejected');
    m.setAuto();
    assert.ok(!m.manual);
  });
  it('initial steps: desktop 0, mobile 1, saver 2', () => {
    assert.equal(initialStepIndex({}), 0);
    assert.equal(initialStepIndex({ mobile: true }), 1);
    assert.equal(initialStepIndex({ batterySaver: true }), 2);
    assert.equal(LADDER.length, 4);
    assert.equal(RES.MIN_INTERVAL_MS, 500);
  });
});

describe('tester r2: bindings conflict-swap roundtrip and corrupt stores', () => {
  function memStore(seed = null) {
    const m = new Map();
    if (seed !== null) m.set('doom-bindings', seed);
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => { m.set(k, v); },
    };
  }
  it('assigning a taken key swaps, original key moves to the victim', () => {
    const b = defaultBindings();
    const { bindings: next, swapped } = assignBinding(b, 'forward', 'KeyA');
    assert.equal(swapped, 'turnLeft');
    assert.equal(next.actions.forward.keys[0], 'KeyA');
    assert.ok(next.actions.turnLeft.keys.includes('KeyW'), 'displaced KeyW lands on turnLeft');
    assert.equal(b.actions.forward.keys[0], 'KeyW', 'input never mutated');
    assert.equal(findConflict(next, 'KeyA', 'forward'), null, 'no residual conflict');
  });
  it('save/load roundtrip preserves versioned bindings', () => {
    const store = memStore();
    const { bindings } = assignBinding(defaultBindings(), 'fire', 'KeyG');
    assert.ok(saveBindings(store, bindings));
    const back = loadBindings(store);
    assert.equal(back.actions.fire.keys[0], 'KeyG');
    assert.equal(back.version, 1);
  });
  it('corrupt, hostile, and missing stores fall back to defaults', () => {
    for (const seed of ['{broken', '[1,2', '"str"', 'null', '{"format":"x"}', null]) {
      const b = loadBindings(memStore(seed));
      assert.equal(b.actions.forward.keys[0], 'KeyW', `seed ${String(seed)} falls back`);
    }
    const evil = memStore(JSON.stringify({
      format: 'doom-bindings', version: 1,
      actions: { forward: { keys: ['KeyZ', 42, null, { x: 1 }], mouse: 'evil', touch: 7 } },
    }));
    const m = loadBindings(evil);
    assert.deepEqual(m.actions.forward.keys, ['KeyZ'], 'non-string keys filtered');
    assert.equal(m.actions.forward.mouse, null);
    assert.equal(m.actions.forward.touch, null);
    assert.equal(loadBindings(null).actions.forward.keys[0], 'KeyW');
    assert.equal(loadBindings({}).actions.forward.keys[0], 'KeyW');
    assert.equal(saveBindings(null, defaultBindings()), false);
  });
});

describe('tester r2: tier fallback chain and upload capability matrix', () => {
  it('one rung per failure, terminal at 4, garbage to 2', () => {
    assert.deepEqual([0, 1, 2, 3, 4].map(tierForFailure), [1, 2, 3, 4, 4]);
    assert.equal(tierForFailure(-1), 1, 'negative clamps to 0 then steps one rung');
    for (const bad of [NaN, null, undefined, 'x', 2.5]) assert.equal(tierForFailure(bad), 2);
  });
  it('upload matrix: webgl2 first, webgl fallback, cpu otherwise', () => {
    assert.equal(chooseUploadFormat({ webgl2: true }), 'r8');
    assert.equal(chooseUploadFormat({ hasWebGL2: true }), 'r8');
    assert.equal(chooseUploadFormat({ webgl: true }), 'rgba');
    assert.equal(chooseUploadFormat({ hasWebGL1: true }), 'rgba');
    assert.equal(chooseUploadFormat({}), 'cpu');
    assert.equal(resolveTier({ hasWasm: true }), 2);
    assert.equal(resolveTier({ hasWebGL2: true }), 0);
    assert.equal(resolveTier({ hasWebGL1: true }), 1);
  });
  it('GlUnavailable is a real Error subclass for the fallback chain', () => {
    const e = new GlUnavailable('no gl');
    assert.ok(e instanceof Error);
    assert.match(e.message, /no gl/);
  });
});

describe('tester r2: palette upload-once contract', () => {
  it('identical bytes never bump, changed bytes bump once, short rejected', () => {
    const pm = createPaletteManager(makePalette());
    assert.ok(pm.needsUpload(), 'fresh manager needs one upload');
    pm.markUploaded();
    assert.ok(!pm.needsUpload());
    assert.equal(pm.setPalette(makePalette()), false, 'identical set is a no-op');
    assert.ok(!pm.needsUpload());
    const alt = makePalette();
    alt[0] ^= 255;
    assert.equal(pm.setPalette(alt), true);
    assert.ok(pm.needsUpload());
    const v = pm.version;
    pm.markUploaded();
    assert.ok(!pm.needsUpload());
    assert.equal(pm.setPalette(new Uint8Array(10)), false, 'short palette rejected');
    assert.equal(pm.version, v, 'rejected set never bumps version');
  });
  it('uploadPaletteGL throws without GL so the app can fall back', () => {
    assert.throws(() => uploadPaletteGL(null, {}, makePalette()), /no GL texture/);
    assert.throws(() => uploadPaletteGL({}, {}, new Uint8Array(8)), /short bytes/);
  });
});

describe('tester r2: interleaved hostile input pump stays finite and clamped', () => {
  const HOSTILE = [NaN, Infinity, -Infinity, 1e12, -1e12, undefined, null, '7', {}, []];
  it('buildTiccmd over the hostile cross product never yields NaN/Infinity', () => {
    let checked = 0;
    for (const turn of HOSTILE) {
      for (const move of HOSTILE) {
        for (const strafe of HOSTILE) {
          const c = buildTiccmd({ turn, move, strafe });
          for (const k of ['angleturn', 'forwardmove', 'sidemove']) {
            assert.ok(Number.isFinite(c[k]), `${k} finite for ${String(turn)}/${String(move)}/${String(strafe)}`);
          }
          assert.ok(Math.abs(c.forwardmove) <= 50 && Math.abs(c.sidemove) <= 50, 'move clamp holds');
          assert.ok(Math.abs(c.angleturn) <= 32767, 'turn clamp holds');
          checked++;
        }
      }
    }
    assert.ok(checked >= 900, `cross product covered, checked ${checked}`);
  });
  it('same hostile script latched twice converges bit-exact (determinism)', () => {
    const script = [
      { angleturn: 320, forwardmove: 25, sidemove: 0, buttons: 1 },
      { angleturn: -99999, forwardmove: 999, sidemove: -999, buttons: 3 },
      { angleturn: NaN, forwardmove: Infinity, sidemove: undefined, buttons: 0 },
    ];
    const run = () => {
      let slot = null;
      for (const s of script) slot = latchTiccmd(slot, s);
      return slot;
    };
    assert.deepEqual(run(), run());
  });
});
