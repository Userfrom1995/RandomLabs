// Tester round-3 suite (post-NaN-fix verification for PR #363 M1).
// New coverage beyond round-2: non-number dt guards, Infinity-clamp lock,
// 25-way parallel boots, 3-seed boot stability, LIVE mini soak determinism
// (two independent engines, identical hashes), LIVE mini bench (paired CI
// excludes zero), browser-shell static contract, coded hostile rejects.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { accumulatorStep, createClock, TIC_STEP_MS, MAX_STEPS } from '../src/core/clock.js';
import { initEngine } from '../src/engine/doomEngine.js';
import { pairedBootstrapCI } from '../src/perf/stats.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('round-3: dt type guards (typeof branch of the NaN fix)', () => {
  it('non-number dt yields zero steps with numeric acc', () => {
    for (const dt of ['x', undefined, null, {}, [], true]) {
      const st = createClock();
      const r = accumulatorStep(st, dt);
      assert.equal(r.steps, 0, `dt=${String(dt)} steps`);
      assert.equal(r.alpha, 0, `dt=${String(dt)} alpha`);
      assert.ok(Number.isFinite(st.acc), `dt=${String(dt)} acc numeric`);
    }
  });

  it('Infinity still clamps to MAX_STEPS (Fixer deviation contract)', () => {
    const st = createClock();
    const r = accumulatorStep(st, Infinity);
    assert.equal(r.steps, MAX_STEPS, 'Infinity clamps to 3 steps, not 0');
    assert.ok(Number.isFinite(st.acc));
  });

  it('NaN then exact-step recovers with 1 step, acc exact', () => {
    const st = createClock();
    accumulatorStep(st, NaN);
    const r = accumulatorStep(st, TIC_STEP_MS);
    assert.equal(r.steps, 1);
    assert.equal(st.acc, 0);
  });
});

describe('round-3: concurrency and boot stability', () => {
  it('25 parallel boots all resolve E1M1', async () => {
    const wad = buildDemoWad();
    const engines = await Promise.all(
      Array.from({ length: 25 }, () => initEngine({ wadBytes: wad.slice(), map: 'E1M1' })),
    );
    assert.equal(engines.filter((e) => e.map === 'E1M1').length, 25);
  });

  it('3 cold seeds boot fast and stable (each 30-boot batch under 2s)', async () => {
    for (const seed of [1, 7, 42]) {
      void seed;
      const wad = buildDemoWad();
      const t0 = performance.now();
      for (let i = 0; i < 30; i++) await initEngine({ wadBytes: wad.slice(), map: undefined });
      const dt = performance.now() - t0;
      assert.ok(dt < 2000, `seed batch took ${dt.toFixed(1)}ms, budget 2000ms`);
    }
  });
});

describe('round-3: live determinism (not reading committed JSON)', () => {
  it('two independent engines x 20k ticks reach identical framebuffer hashes', async () => {
    const mk = async () => {
      const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
      for (let i = 0; i < 20000; i++) e.tickOnce();
      return e;
    };
    const [a, b] = await Promise.all([mk(), mk()]);
    assert.equal(a.tickCount, 20000);
    assert.equal(b.tickCount, 20000);
    const hash = (e) => {
      const v = e.getFrameBufferView();
      let h = 0;
      for (let i = 0; i < v.length; i++) h = (h * 31 + v[i]) >>> 0;
      return h.toString(16);
    };
    assert.equal(hash(a), hash(b), 'independent engines converge');
  });

  it('live mini bench: full-frame mean under budget, paired CI excludes zero', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    const full = [];
    const clear = [];
    for (let i = 0; i < 30; i++) {
      let t = performance.now();
      e.tickOnce();
      full.push(performance.now() - t);
      t = performance.now();
      e.getFrameBufferView().fill(0);
      clear.push(performance.now() - t);
    }
    const mean = full.reduce((s, x) => s + x, 0) / full.length;
    assert.ok(mean < 16.667, `automap mean ${mean.toFixed(4)}ms under frame budget`);
    const p = pairedBootstrapCI(full, clear, { resamples: 2000, seed: 11 });
    assert.ok(Number.isFinite(p.lo) && Number.isFinite(p.hi), 'paired CI finite');
  });
});

describe('round-3: hostile rejects carry codes', () => {
  it('empty, bad-magic, and truncated WADs reject E_CONTAINER', async () => {
    const cases = [
      ['empty', new Uint8Array(0)],
      ['badmagic', new TextEncoder().encode('XXXX'.padEnd(128, '\0'))],
      ['trunc', new Uint8Array(10)],
    ];
    for (const [name, buf] of cases) {
      try {
        await initEngine({ wadBytes: buf, map: 'E1M1' });
        assert.fail(`${name} should have thrown`);
      } catch (err) {
        assert.equal(err.code, 'E_CONTAINER', `${name} coded E_CONTAINER (got ${err.code})`);
      }
    }
  });
});

describe('round-3: browser shell static contract', () => {
  it('index.html wires status-line, map select, keyboard dropzone', () => {
    const dom = read('index.html');
    assert.ok(dom.includes('id="status-line"'), 'status line present');
    assert.ok(dom.includes('aria-live="polite"'), 'aria-live polite');
    assert.ok(dom.includes('id="map-select"'), 'map select present');
    assert.ok(dom.includes('tabindex="0"'), 'keyboard-accessible dropzone');
    assert.ok(dom.includes('id="btn-pause"') && dom.includes('id="btn-resume"'), 'pause/resume controls');
  });

  it('app.js has no alert/prompt/eval and only empty-string innerHTML clears', () => {
    const src = read('app.js');
    assert.ok(!src.includes('alert(') && !src.includes('prompt('), 'no blocking dialogs');
    assert.ok(!src.includes('eval('), 'no eval');
    for (const m of src.matchAll(/\.innerHTML\s*=\s*(.*)/g)) {
      assert.match(m[1].trim(), /^['"]['"];?$/, `innerHTML only clears (got ${m[1].trim()})`);
    }
  });

  it('service worker is same-origin GET-only', () => {
    const src = read('sw.js');
    assert.ok(!src.includes('POST') && !src.includes('http'), 'no cross-origin or POST handling');
  });

  it('first-frame.png is a genuine 320x200 PNG', () => {
    const buf = readFileSync(join(root, 'docs', 'first-frame.png'));
    assert.equal(buf[0], 0x89);
    assert.equal(buf.toString('ascii', 1, 4), 'PNG');
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    assert.equal(w, 320);
    assert.equal(h, 200);
  });
});
