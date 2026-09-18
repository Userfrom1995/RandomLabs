// Tester round-2 verification suite for M3 audio + persistence (PR #365, Refs #362).
// Supplements test-m3-tester-qa.mjs (prior run): pins the NaN-guard FIX
// verification plus independent chaos probes from this run - Infinity clamp
// semantics, concurrent write isolation, MUS fuzz batch, 10k SFX saturation
// bound, and a 5k mixer/SFX soak. All assertions passed on the fixed tree
// (mixer.js coerceMenu/set guards, sfxEngine.js NaN-drop + finite-gain gate).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMixer, menuToGain } from '../src/audio/mixer.js';
import { createSfxEngine, SFX_VOICES } from '../src/audio/sfxEngine.js';
import { createMemoryProvider } from '../src/storage/provider.js';
import { musToMidi } from '../src/audio/mus2mid.js';

describe('tester-verify: non-finite guards hold after fix', () => {
  it('Infinity clamps to bounds, NaN keeps current value', () => {
    const mx = createMixer();
    mx.set('sfx', Infinity);
    assert.equal(mx.state.sfx, 15);
    mx.set('sfx', -Infinity);
    assert.equal(mx.state.sfx, 0);
    mx.set('sfx', 7);
    mx.set('sfx', NaN);
    assert.equal(mx.state.sfx, 7);
    mx.set('sfx', 'abc');
    assert.equal(mx.state.sfx, 7);
  });
  it('menuToGain maps every hostile pref to finite 0..1', () => {
    for (const h of [NaN, 'x', Infinity, -Infinity, undefined, {}, []]) {
      const g = menuToGain(h);
      assert.ok(Number.isFinite(g) && g >= 0 && g <= 1, `menuToGain(${String(h)}) = ${g}`);
    }
  });
  it('NaN SFX volume drops with -1 and bumps dropped.count', () => {
    const eng = createSfxEngine({ seed: 7 });
    const buf = { data: new Float32Array(8000), sampleRate: 11025 };
    const before = eng.dropped.count;
    assert.equal(eng.play({ name: 'nan', buffer: buf, volume: NaN, distance: 0 }), -1);
    assert.equal(eng.dropped.count, before + 1);
  });
});

describe('tester-verify: concurrency, fuzz, and soak', () => {
  it('50 parallel slot writes isolate without loss', async () => {
    const m = createMemoryProvider();
    await Promise.all(Array.from({ length: 50 }, (_, i) =>
      m.writeFile(`doom/saves/slot${i % 6}.dsg`, new Uint8Array([i & 0xff]))));
    for (let s = 0; s < 6; s++) {
      const bytes = await m.readFile(`doom/saves/slot${s}.dsg`);
      assert.ok(bytes.length === 1);
    }
  });
  it('500 random MUS truncations all reject with coded E_MUS_*', () => {
    for (let i = 0; i < 500; i++) {
      const n = 4 + Math.floor(Math.random() * 40);
      const b = new Uint8Array(n);
      b.set([0x4d, 0x55, 0x53, 0x1a]);
      for (let j = 4; j < n; j++) b[j] = Math.floor(Math.random() * 256);
      assert.throws(() => musToMidi(b), (e) => !!e.code && e.code.startsWith('E_MUS'));
    }
  });
  it('10k SFX plays stay bounded at 8 voices', () => {
    const eng = createSfxEngine({ seed: 11 });
    const buf = { data: new Float32Array(8000), sampleRate: 11025 };
    for (let i = 0; i < 10000; i++) {
      eng.play({ name: `f${i}`, buffer: buf, volume: 100, distance: 0 });
    }
    assert.equal(eng.voices.length, SFX_VOICES);
    assert.ok(eng.voices.every((v) => v.busy));
  });
  it('5k mixer/SFX soak completes with finite state', async () => {
    const mx = createMixer();
    const eng = createSfxEngine({ seed: 3 });
    const buf = { data: new Float32Array(8000), sampleRate: 11025 };
    for (let i = 0; i < 5000; i++) {
      mx.set('sfx', i % 16);
      eng.play({ name: `s${i}`, buffer: buf, volume: i % 128, distance: i % 1300 });
      eng.update(i);
    }
    const e = mx.effective();
    assert.ok([e.master, e.sfx, e.music].every(Number.isFinite));
  });
});
