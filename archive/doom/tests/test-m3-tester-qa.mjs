// Tester QA suite for M3 audio + persistence (PR #365, Refs #362).
// Hostile red-team regression net: corrupt MUS lumps, storage traversal,
// wedged-backend fallbacks, bundle forgeries, atomic-rollback proof, and
// mixer/SFX/unlock boundary guards. The final describe block pins the
// NaN-poisoning defect (corrupt persisted audio prefs wedge mixer state to
// NaN, violating the "corrupt config keeps mixer defaults" contract in
// doom/app.js:611) and FAILS until the Fixer coerces non-finite gains.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { musToMidi, musChannelToMidi, scaleMusVolume } from '../src/audio/mus2mid.js';
import {
  assertValidPath, createMemoryProvider, selectProvider,
} from '../src/storage/provider.js';
import {
  exportBundle, parseBundle, applyBundle, encodeB64, decodeB64,
} from '../src/storage/saveBundle.js';
import { createMixer, menuToGain } from '../src/audio/mixer.js';
import {
  createSfxEngine, distanceGain, separationPan, jitterPitch, SFX_VOICES,
} from '../src/audio/sfxEngine.js';
import { createAudioUnlock } from '../src/audio/audioUnlock.js';

describe('tester-qa: MUS hostile inputs all reject with coded errors', () => {
  const cases = {
    empty: new Uint8Array(0),
    'short-header': new Uint8Array(5),
    'bad-magic': new Uint8Array(16),
  };
  for (const [name, bytes] of Object.entries(cases)) {
    it(`${name} throws E_MUS_*`, () => {
      assert.throws(() => musToMidi(bytes), (e) => !!e.code && e.code.startsWith('E_MUS'));
    });
  }
  it('score without end-of-score event throws E_MUS_TRUNCATED', () => {
    const b = new Uint8Array(20);
    b.set([0x4d, 0x55, 0x53, 0x1a]);
    new DataView(b.buffer).setUint16(4, 4, true);
    new DataView(b.buffer).setUint16(6, 16, true);
    assert.throws(() => musToMidi(b), (e) => e.code === 'E_MUS_TRUNCATED');
  });
  it('unknown event type throws E_MUS_TRUNCATED (never misdecoded)', () => {
    const b = new Uint8Array(18);
    b.set([0x4d, 0x55, 0x53, 0x1a]);
    new DataView(b.buffer).setUint16(4, 2, true);
    new DataView(b.buffer).setUint16(6, 16, true);
    b[16] = 0x50; b[17] = 0x00; // type 5 is undefined
    assert.throws(() => musToMidi(b), (e) => e.code === 'E_MUS_TRUNCATED');
  });
  it('volume scaling is continuous and drum map holds', () => {
    assert.equal(scaleMusVolume(200, 200), 127);
    assert.equal(scaleMusVolume(100, 100), 100);
    assert.equal(scaleMusVolume(300, 200), 127);
    assert.equal(musChannelToMidi(15), 9);
    assert.equal(musChannelToMidi(9), 10);
    assert.equal(musChannelToMidi(0), 0);
  });
});

describe('tester-qa: storage ladder hostile matrix', () => {
  it('traversal and absolute paths rejected with E_PATH', () => {
    for (const p of ['../x', '/abs', 'a\\b', '', '..', 'doom/../evil']) {
      assert.throws(() => assertValidPath(p), (e) => e.code === 'E_PATH', `path ${JSON.stringify(p)}`);
    }
    assert.equal(assertValidPath('doom/saves/slot0.dsg'), 'doom/saves/slot0.dsg');
  });
  it('memory provider copies isolate readers from writers', async () => {
    const m = createMemoryProvider();
    await m.writeFile('doom/saves/slot0.dsg', new Uint8Array([1, 2, 3]));
    const r1 = await m.readFile('doom/saves/slot0.dsg');
    r1[0] = 99;
    assert.equal((await m.readFile('doom/saves/slot0.dsg'))[0], 1);
  });
  it('never-resolving OPFS probe falls through on timeout', async () => {
    const hanging = { tier: 'opfs', available: true, probe: () => new Promise(() => {}) };
    const sel = await selectProvider(
      [async () => hanging, async () => createMemoryProvider()],
      { probeTimeoutMs: 50 },
    );
    assert.equal(sel.tier, 'memory');
    assert.deepEqual(sel.fallbacks, ['opfs']);
  });
  it('throwing factory falls through to memory', async () => {
    const sel = await selectProvider(
      [async () => { throw { tier: 'boom' }; }, async () => createMemoryProvider()],
    );
    assert.equal(sel.tier, 'memory');
  });
});

describe('tester-qa: bundle forgeries rejected, rollback atomic', () => {
  const bad = {
    'not-json': '{{{',
    'wrong-format': JSON.stringify({ format: 'x', version: 1, saves: [] }),
    'wrong-version': JSON.stringify({ format: 'doom-save-bundle', version: 99, saves: [] }),
    'saves-not-array': JSON.stringify({ format: 'doom-save-bundle', version: 1, saves: {} }),
    'bad-slot': JSON.stringify({ format: 'doom-save-bundle', version: 1, saves: [{ slot: -1, dataBase64: 'AA==' }] }),
    'missing-b64': JSON.stringify({ format: 'doom-save-bundle', version: 1, saves: [{ slot: 0 }] }),
  };
  for (const [name, text] of Object.entries(bad)) {
    it(`${name} throws E_BUNDLE_*`, () => {
      assert.throws(() => parseBundle(text), (e) => !!e.code && e.code.startsWith('E_BUNDLE'));
    });
  }
  it('base64 round-trips empty, binary, and 1 KiB payloads', () => {
    for (const bytes of [new Uint8Array(0), new Uint8Array([0, 255, 1, 2, 3]), new Uint8Array(1024).fill(7)]) {
      const rt = decodeB64(encodeB64(bytes));
      assert.ok(rt.length === bytes.length && rt.every((v, i) => v === bytes[i]));
    }
  });
  it('wedged provider mid-apply rolls back to prior bytes', async () => {
    const base = createMemoryProvider();
    await base.writeFile('doom/config.json', new TextEncoder().encode('ORIGINAL'));
    let writes = 0;
    const flaky = {
      ...base,
      tier: 'flaky',
      async writeJSON(p, v) { writes++; if (writes === 2) throw new Error('wedged'); return base.writeJSON(p, v); },
      async writeFile(p, d) { writes++; if (writes === 2) throw new Error('wedged'); return base.writeFile(p, d); },
      async readFile(p) { return base.readFile(p); },
      async remove(p) { return base.remove(p); },
    };
    const parsed = parseBundle(JSON.stringify(exportBundle({
      config: { a: 1 }, bindings: {}, progression: {},
      saves: [{ slot: 0, name: 's', data: new Uint8Array([9, 9]) }],
    })));
    await assert.rejects(() => applyBundle(flaky, parsed), /wedged/);
    assert.equal(new TextDecoder().decode(await base.readFile('doom/config.json')), 'ORIGINAL');
  });
});

describe('tester-qa: mixer, sfx pool, and unlock gate boundaries', () => {
  it('menu gains clamp, mute zeroes, unmute restores', () => {
    const mx = createMixer();
    mx.set('sfx', 999);
    assert.equal(mx.state.sfx, 15);
    mx.set('sfx', -5);
    assert.equal(mx.state.sfx, 0);
    mx.set('sfx', 15);
    mx.set('muted', true);
    assert.equal(mx.effective().sfx, 0);
    assert.equal(mx.effective().music, 0);
    mx.set('muted', false);
    assert.ok(mx.effective().sfx > 0);
  });
  it('sfx pool drops empty buffers, culls beyond clip, stays bounded', () => {
    const eng = createSfxEngine({ seed: 1 });
    const buf = { data: new Float32Array(8000), sampleRate: 11025 };
    assert.equal(eng.play({}), -1);
    assert.equal(eng.play({ buffer: { data: new Float32Array(0), sampleRate: 11025 } }), -1);
    assert.equal(eng.play({ name: 'a', buffer: buf, volume: 100, distance: 99999 }), -1);
    assert.ok(eng.play({ name: 'shot', buffer: buf, volume: 100, distance: 0 }) >= 0);
    for (let i = 0; i < 20; i++) eng.play({ name: `n${i}`, buffer: buf, volume: 10 + i, distance: 0 });
    assert.equal(eng.voices.length, SFX_VOICES);
    assert.ok(eng.voices.every((v) => v.busy));
    eng.update(99999999);
    assert.ok(eng.voices.some((v) => !v.busy));
  });
  it('distance/pan/pitch math stays in range at extremes', () => {
    assert.equal(distanceGain(0), 1);
    assert.equal(distanceGain(99999), 0);
    assert.ok(distanceGain(99999, { map08: true }) > 0);
    assert.ok(Math.abs(separationPan(0, 0)) <= 1 && Math.abs(separationPan(255, Math.PI)) <= 1);
    assert.ok(jitterPitch(300, 'misc', 255) <= 255 && jitterPitch(-5, 'saw', 0) >= 0);
  });
  it('unlock gate blocks pre-gesture scheduling (H5), opens on gesture', () => {
    const u = createAudioUnlock();
    assert.equal(u.trySchedule(), false);
    assert.equal(u.canSchedule(), false);
    assert.equal(u.scheduledBefore, 1);
    u.gesture(); u.gesture();
    assert.equal(u.trySchedule(), true);
    assert.equal(u.scheduledAfter, 1);
    u.suspend();
    assert.equal(u.trySchedule(), false);
  });
});

describe('tester-qa: FAILING - non-finite gain poisoning (fixer target)', () => {
  it('mixer.set coerces corrupt persisted values to finite menu range', () => {
    const mx = createMixer();
    for (const hostile of [NaN, 'abc', Infinity, -Infinity, {}]) {
      mx.set('sfx', hostile);
      assert.ok(
        Number.isFinite(mx.state.sfx) && mx.state.sfx >= 0 && mx.state.sfx <= 15,
        `set('sfx', ${String(hostile)}) left state=${mx.state.sfx}, want finite 0..15`,
      );
    }
  });
  it('menuToGain never yields NaN for hostile restored prefs', () => {
    for (const hostile of [NaN, 'x', Infinity, -Infinity, undefined, {}]) {
      const g = menuToGain(hostile);
      assert.ok(Number.isFinite(g) && g >= 0 && g <= 1, `menuToGain(${String(hostile)}) = ${g}`);
    }
  });
  it('effective() stays finite after hostile sets (WebAudio takes no NaN)', () => {
    const mx = createMixer();
    mx.set('master', 'corrupt');
    mx.set('sfx', NaN);
    mx.set('music', Infinity);
    const e = mx.effective();
    assert.ok(
      Number.isFinite(e.master) && Number.isFinite(e.sfx) && Number.isFinite(e.music),
      `effective() poisoned: ${JSON.stringify(e)}`,
    );
  });
  it('sfxEngine drops or sanitizes NaN volume (no NaN-gain voice)', () => {
    const eng = createSfxEngine({ seed: 7 });
    const buf = { data: new Float32Array(8000), sampleRate: 11025 };
    const idx = eng.play({ name: 'nan', buffer: buf, volume: NaN, distance: 0 });
    assert.ok(
      idx === -1 || Number.isFinite(eng.voices[idx].gain),
      `NaN volume scheduled voice ${idx} with gain=${idx >= 0 && eng.voices[idx].gain}`,
    );
  });
});
