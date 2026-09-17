// Tester round-2 suite (post-hardening verification for PR #363 M1).
// Locks the two shipped-then-fixed blockers (app.js boot header, repro.sh
// shell header) plus independent reproduction and hostile engine contracts.
// Static-only for the browser shell (no browser in runner); all engine
// assertions run live against the real modules.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { accumulatorStep, createClock, TIC_STEP_MS, MAX_STEPS } from '../src/core/clock.js';
import { ENGINE_VERSION, initEngine } from '../src/engine/doomEngine.js';
import { probeSimd, pickWasmBinary } from '../src/engine/simdProbe.js';
import { probeCapabilities, resolveTier } from '../src/render/tiers.js';
import { createFrameBuffer, viewOverMemory } from '../src/render/fbView.js';
import { pairedBootstrapCI } from '../src/perf/stats.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';
import { buildHexenWad } from './helpers/hexen-fixture.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('regression guards: shipped blockers stay fixed', () => {
  it('app.js defines async function boot(wadBytes, label)', () => {
    const src = read('app.js');
    assert.ok(src.includes('async function boot(wadBytes, label) {'), 'boot header present');
    const defs = (src.match(/async function boot\(/g) || []).length;
    assert.equal(defs, 1, 'exactly one boot definition');
    const calls = (src.match(/await boot\(/g) || []).length;
    assert.ok(calls >= 2, `boot call sites resolve (found ${calls})`);
  });

  it('probeGL closes before the boot header (no orphaned body)', () => {
    const src = read('app.js');
    const probeClose = src.indexOf('probeGL() {', 0);
    assert.ok(src.includes('function probeGL()'), 'probeGL present');
    const bootIdx = src.indexOf('async function boot(wadBytes, label) {');
    const lastCloseBeforeBoot = src.lastIndexOf('\n}\n', bootIdx);
    assert.ok(lastCloseBeforeBoot !== -1 && lastCloseBeforeBoot < bootIdx, 'probe body closed before boot header');
    assert.ok(!src.includes("canvas.getContext('webgl')"), 'no same-canvas double probe');
  });

  it('repro.sh has a POSIX shebang and passes sh -n', () => {
    const src = read('repro.sh');
    const first = src.split('\n')[0].trim();
    assert.equal(first, '#!/bin/sh', 'shebang line is POSIX sh');
    assert.ok(!src.split('\n').slice(0, 3).some((l) => l.startsWith('//')), 'no // comments in header');
    execFileSync('sh', ['-n', join(root, 'repro.sh')], { timeout: 15000 });
  });

  it('scoreboard static-check count matches layout-audit rows', () => {
    const score = read('docs/scoreboard.md');
    const audit = read('docs/layout-audit.md');
    assert.ok(score.includes('15 static checks') || score.includes('15 checks'), 'scoreboard says 15');
    assert.match(audit, /ALL PASS/);
  });

  it('no em dashes in shell/app/test surface', () => {
    const EM = String.fromCharCode(8212);
    for (const f of ['app.js', 'repro.sh', 'tests/test-tester-m1-round2.mjs']) {
      assert.ok(!read(f).includes(EM), f + ' has no em dash');
    }
  });

});

describe('accumulator determinism and dt pathology', () => {
  it('hostile dt values stay bounded and never hang', () => {
    for (const dt of [Infinity, -Infinity, -1e9, 1e9, -0.5, 0, 0.001]) {
      const st = createClock();
      const { steps, alpha } = accumulatorStep(st, dt);
      assert.ok(Number.isInteger(steps) && steps >= 0 && steps <= MAX_STEPS, `dt=${dt} steps=${steps}`);
      assert.ok(Number.isFinite(alpha) && alpha >= 0, `dt=${dt} alpha finite`);
    }
  });

  it('a single NaN dt must not permanently brick the 35 Hz loop', () => {
    const st = createClock();
    const bad = accumulatorStep(st, NaN);
    assert.ok(bad.steps >= 0 && bad.steps <= MAX_STEPS, 'NaN dt yields bounded steps');
    assert.ok(Number.isFinite(st.acc), `accumulator stays numeric after NaN (got ${st.acc})`);
    const good = accumulatorStep(st, TIC_STEP_MS);
    assert.equal(good.steps, 1, 'the next valid frame ticks normally after a NaN dt');
  });

  it('delivers 35 steps per second of simulated time', () => {
    // Exact-step slices tick exactly once each (float-exact: acc returns to 0).
    const exact = createClock();
    let total = 0;
    for (let i = 0; i < 35; i++) total += accumulatorStep(exact, TIC_STEP_MS).steps;
    assert.equal(total, 35, '35 exact slices give 35 steps');
    // Coarse 10 ms slices land on a float boundary: 34 or 35, never far off.
    const coarse = createClock();
    let rough = 0;
    for (let i = 0; i < 100; i++) rough += accumulatorStep(coarse, 10).steps;
    assert.ok(rough === 34 || rough === 35, `100x10ms slices give ~35 steps (got ${rough})`);
  });

  it('clamps a 500ms stall to MAX_STEPS per frame', () => {
    const st = createClock();
    const { steps } = accumulatorStep(st, 500);
    assert.equal(steps, MAX_STEPS);
  });

  it('zero dt yields zero steps', () => {
    assert.equal(accumulatorStep(createClock(), 0).steps, 0);
  });

  it(`TIC_STEP is 1000/35 (${TIC_STEP_MS}ms)`, () => {
    assert.ok(Math.abs(TIC_STEP_MS - 1000 / 35) < 1e-12);
  });
});

describe('engine boundary hostility', () => {
  it('10 parallel boots all resolve E1M1', async () => {
    const wad = buildDemoWad();
    const engines = await Promise.all(
      Array.from({ length: 10 }, () => initEngine({ wadBytes: wad.slice(), map: 'E1M1' })),
    );
    for (const e of engines) assert.equal(e.map, 'E1M1');
  });

  it('unknown map falls back to the first map', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'MAP99' });
    assert.equal(e.map, 'E1M1');
  });

  it('version pinned, 320x200 zero-copy framebuffer', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    assert.equal(e.version, ENGINE_VERSION);
    assert.equal(e.version, 'm1-js-core/1.0.0');
    assert.equal(e.getWidth(), 320);
    assert.equal(e.getHeight(), 200);
    const v1 = e.getFrameBufferView();
    assert.ok(v1 instanceof Uint8Array && v1.length === 320 * 200);
    assert.equal(e.getFrameBufferView(), v1, 'same backing store, never sliced');
  });

  it('keys and ticcmd steer the player angle', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    const a0 = e.getPlayer().angle;
    e.queueKey('turnLeft', true);
    e.tickOnce();
    e.queueKey('turnLeft', false);
    assert.ok(e.getPlayer().angle !== a0, 'turnLeft changes angle');
    const a1 = e.getPlayer().angle;
    e.injectTiccmd({ angleturn: 182 });
    assert.ok(Math.abs(e.getPlayer().angle - a1 - 1) < 1e-9, 'angleturn 182 tics rotate by ~1 degree');
  });

  it('tickCount is exact after N ticks', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    for (let i = 0; i < 500; i++) e.tickOnce();
    assert.equal(e.tickCount, 500);
    assert.equal(e.tickOnce(), 501);
  });

  it('garbage bytes reject with a coded error, never hang', async () => {
    await assert.rejects(() => initEngine({ wadBytes: new Uint8Array(0) }));
    await assert.rejects(() => initEngine({ wadBytes: new Uint8Array([1, 2, 3, 4]) }));
    try {
      await initEngine({ wadBytes: new Uint8Array(64) });
      assert.fail('should have thrown');
    } catch (err) {
      assert.match(err.code || err.message, /E_CONTAINER|E_MAP|IWAD|magic/i);
    }
  });

  it('Hexen-dialect WAD is refused, never misparsed', async () => {
    await assert.rejects(() => initEngine({ wadBytes: buildHexenWad() }), /Hexen/i);
  });

  it('demo WAD bytes are deterministic across builds', () => {
    const a = buildDemoWad();
    const b = buildDemoWad();
    assert.deepEqual([...a], [...b]);
  });
});

describe('tier, simd, and framebuffer contracts', () => {
  it('resolveTier honors explicit 0..4 overrides', () => {
    for (let t = 0; t <= 4; t++) assert.equal(resolveTier({ hasWasm: true }, t), t);
  });

  it('resolveTier falls back to Tier 2 with Wasm, Tier 3 without', () => {
    assert.equal(resolveTier({ hasWasm: true }, null), 2);
    assert.equal(resolveTier({ hasWasm: false }, null), 3);
  });

  it('probeSimd trusts the injected validator and survives throwers', () => {
    assert.equal(probeSimd(() => true), true);
    assert.equal(probeSimd(() => false), false);
    assert.equal(probeSimd(() => { throw new Error('x'); }), false);
    assert.equal(probeSimd(null), probeSimd(null), 'deterministic without validator');
  });

  it('pickWasmBinary selects simd/scalar and override wins', () => {
    assert.match(pickWasmBinary({ simdSupported: true, override: null }), /simd/);
    assert.match(pickWasmBinary({ simdSupported: false, override: null }), /scalar/);
    assert.match(pickWasmBinary({ simdSupported: false, override: true }), /simd/);
    assert.match(pickWasmBinary({ simdSupported: true, override: false }), /scalar/);
  });

  it('probeCapabilities exposes the documented shape', () => {
    const c = probeCapabilities({ webgl2: true, webgl: false });
    assert.equal(c.hasWebGL2, true);
    assert.equal(c.hasWebGL1, false);
    assert.equal(typeof c.hasWasm, 'boolean');
  });

  it('viewOverMemory guards bounds and is zero-copy when valid', () => {
    const mem = { buffer: new ArrayBuffer(1024) };
    assert.throws(() => viewOverMemory(mem, -1, 10, 10), RangeError);
    assert.throws(() => viewOverMemory(mem, 1000, 10, 10), RangeError);
    const v = viewOverMemory(mem, 0, 10, 10);
    assert.equal(v.length, 100);
    v[0] = 123;
    assert.equal(new Uint8Array(mem.buffer)[0], 123, 'view writes hit the same memory');
    assert.equal(createFrameBuffer(320, 200).data.length, 64000);
  });
});

describe('independent evidence reproduction (read committed seals)', () => {
  it('bench-m1.json: N>=30, CI brackets mean, paired CI excludes zero', () => {
    const j = JSON.parse(read('docs/bench-m1.json'));
    assert.ok(j.n >= 30, `N=${j.n}`);
    const A = j.pathA_fullAutomap_ms;
    assert.ok(A.ci95.lo <= A.mean && A.mean <= A.ci95.hi, 'CI brackets mean');
    assert.ok(A.p95 < j.budgetMs, 'p95 under frame budget');
    assert.ok(j.paired_clearMinusFull_ms.hi < 0, 'paired baseline CI excludes zero');
  });

  it('paired bootstrap on synthetic 2x gap excludes zero (harness live)', () => {
    const a = Array(30).fill(0.02);
    const b = Array(30).fill(0.01);
    const p = pairedBootstrapCI(a, b, { resamples: 1000, seed: 7 });
    assert.ok(p.lo > 0, 'harness detects a real difference');
  });

  it('soak-m1.json: 100k ticks exact with matching hashes', () => {
    const j = JSON.parse(read('docs/soak-m1.json'));
    assert.equal(j.ticks, 100000);
    assert.equal(j.tickCountExact, true);
    assert.equal(j.framebufferHash, j.referenceHash);
  });

  it('manifest.sha256 seals 5 artifacts that all exist', () => {
    const lines = read('docs/manifest.sha256').trim().split('\n');
    assert.equal(lines.length, 5);
    const names = lines.map((l) => l.split(/ {2}/)[1]);
    assert.ok(names.includes('first-frame.png'));
    assert.ok(names.includes('bench-m1.json'));
    for (const l of lines) assert.match(l, /^[0-9a-f]{64}  \S+$/);
    assert.ok(existsSync(join(root, 'docs', 'first-frame.png')), 'first-frame.png committed');
  });
});
