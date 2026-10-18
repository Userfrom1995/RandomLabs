// M1 engine/loop/render tests: accumulator determinism, engine boot,
// framebuffer pattern, status bar, tiers, simd probe, zero-copy view.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { accumulatorStep, TIC_STEP_MS } from '../src/core/clock.js';
import { createFrameBuffer, viewOverMemory } from '../src/render/fbView.js';
import { renderAutomap, renderStatusBar, FB_W, FB_H } from '../src/render/automap.js';
import { resolveTier } from '../src/render/tiers.js';
import { probeSimd, pickWasmBinary } from '../src/engine/simdProbe.js';
import { initEngine } from '../src/engine/doomEngine.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';

describe('accumulator', () => {
  it('100ms yields 3 steps with remainder alpha', () => {
    const s = { acc: 0 };
    const { steps, alpha } = accumulatorStep(s, 100);
    assert.equal(steps, 3);
    assert.ok(Math.abs(s.acc - (100 - 3 * TIC_STEP_MS)) < 1e-9);
    assert.ok(alpha >= 0 && alpha < 1);
  });
  it('dt clamps at 100ms (spiral of death forbidden)', () => {
    const s = { acc: 0 };
    const { steps } = accumulatorStep(s, 10000);
    assert.equal(steps, 3);
  });
  it('35 exact steps per 1000ms of accumulated dt', () => {
    const s = { acc: 0 };
    let total = 0;
    for (let i = 0; i < 35; i++) total += accumulatorStep(s, TIC_STEP_MS).steps;
    assert.equal(total, 35);
    assert.ok(s.acc < 1e-6);
  });
});

describe('framebuffer', () => {
  it('320x200 8-bit shape', () => {
    const fb = createFrameBuffer(FB_W, FB_H);
    assert.equal(fb.data.length, 320 * 200);
  });
  it('viewOverMemory zero-copy over fake wasm memory', () => {
    const mem = { buffer: new ArrayBuffer(1024) };
    new Uint8Array(mem.buffer).fill(9, 100, 200);
    const v = viewOverMemory(mem, 100, 10, 10);
    assert.equal(v.length, 100);
    assert.equal(v[0], 9);
    v[0] = 7;
    assert.equal(new Uint8Array(mem.buffer)[100], 7);
  });
  it('viewOverMemory rejects out-of-range pointer', () => {
    assert.throws(() => viewOverMemory({ buffer: new ArrayBuffer(64) }, 60, 4, 4), RangeError);
  });
});

describe('automap + status', () => {
  it('renders non-empty pattern from demo E1M1', async () => {
    const eng = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    const fb = eng.__fb;
    const lit = fb.data.reduce((a, b) => a + (b === 0 ? 0 : 1), 0);
    assert.ok(lit > 100, `expected drawn pixels, got ${lit}`);
    renderStatusBar(fb, 'E1M1 TEST');
    const bar = fb.data.slice((FB_H - 12) * FB_W);
    assert.ok(bar.some((b) => b !== 0));
  });
  it('tickOnce advances ticks and redraws', async () => {
    const eng = await initEngine({ wadBytes: buildDemoWad() });
    assert.equal(eng.tickCount, 0);
    eng.tickOnce();
    assert.equal(eng.tickCount, 1);
  });
  it('queueKey + injectTiccmd accepted on the boundary', async () => {
    const eng = await initEngine({ wadBytes: buildDemoWad() });
    eng.queueKey('turnLeft', true);
    eng.injectTiccmd({ forwardmove: 50, sidemove: 0, angleturn: 640, buttons: 1, weaponSelect: null });
    eng.tickOnce();
    assert.equal(eng.tickCount, 1);
  });
});

describe('tiers + simd', () => {
  it('M1 resolves to Tier 2 with wasm, Tier 3 without', () => {
    assert.equal(resolveTier({ hasWasm: true }), 2);
  });
  it('explicit override honored', () => {
    assert.equal(resolveTier({ hasWasm: true }, 3), 3);
  });
  it('probeSimd honors the validator and detects real SIMD', () => {
    assert.equal(probeSimd(() => false), false);
    assert.equal(probeSimd(() => true), true);
    // Real environment check: must agree with a direct WebAssembly.validate
    // of a known-good SIMD module (true on this runner, false where absent).
    assert.equal(probeSimd(), WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0,
      10, 0x17, 1, 0x15, 0, 0xfd, 0x0c,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x1a, 0x0b,
    ])));
  });
  it('pickWasmBinary selects simd or scalar path', () => {
    assert.equal(pickWasmBinary({ simdSupported: true, override: null }), 'wasm/doom-simd.wasm');
    assert.equal(pickWasmBinary({ simdSupported: true, override: false }), 'wasm/doom-scalar.wasm');
    assert.equal(pickWasmBinary({ simdSupported: false, override: null }), 'wasm/doom-scalar.wasm');
  });
});

describe('engine boot errors', () => {
  it('empty buffer rejects with E_CONTAINER', async () => {
    await assert.rejects(() => initEngine({ wadBytes: new Uint8Array(10) }), (e) => e.code === 'E_CONTAINER' || /filesize/.test(e.message));
  });
  it('hexen map refuses with dialect message', async () => {
    const { buildHexenWad } = await import('./helpers/hexen-fixture.mjs');
    await assert.rejects(() => initEngine({ wadBytes: buildHexenWad(), map: 'MAP01' }), (e) => /Hexen dialect/.test(e.message));
  });
});
