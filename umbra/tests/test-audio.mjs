// Umbra M5: audio track tests (sfx descriptors, music patterns, engine import-safety).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SFX_NAMES, SFX_MAX_DUR, sfxDesc } from '../src/audio/sfx.js';
import { THEMES, INTENSITIES, themePattern, patternHash } from '../src/audio/music.js';
import { createAudio } from '../src/audio/engine.js';
import { ARENAS } from '../src/arenas.js';

const NUM_KEYS = ['freq', 'freqEnd', 'dur', 'gain', 'at'];

/**
 * Count sounding steps in a pattern (non-rest bass/lead plus hats).
 * @param {{bass:number[],lead:number[],hats:number[]}} p pattern
 * @returns {number} density
 */
function density(p) {
  const bass = p.bass.filter((n) => n > 0).length;
  const lead = p.lead.filter((n) => n > 0).length;
  const hats = p.hats.filter((h) => h === 1).length;
  return bass + lead + hats;
}

describe('sfxDesc factory', () => {
  it('exposes the 11 canonical names', () => {
    assert.deepEqual(SFX_NAMES, [
      'hit', 'block', 'parry', 'whiff', 'dash', 'ko',
      'round', 'ui', 'unlock', 'trial', 'countdown',
    ]);
  });

  it('every canonical name yields a descriptor with finite numbers', () => {
    for (const name of SFX_NAMES) {
      const d = sfxDesc(name);
      assert.equal(d.name, name);
      assert.ok(Number.isFinite(d.dur), `${name}: dur not finite`);
      assert.ok(d.nodes.length > 0, `${name}: no nodes`);
      for (const n of d.nodes) {
        assert.ok(n.type === 'osc' || n.type === 'noise', `${name}: bad type`);
        for (const k of NUM_KEYS) {
          assert.ok(Number.isFinite(n[k]), `${name}: node.${k} not finite`);
        }
        assert.ok(n.gain >= 0 && n.gain <= 1, `${name}: gain out of range`);
        assert.ok(n.at >= 0, `${name}: negative at`);
        assert.ok(n.at + n.dur <= d.dur + 1e-9, `${name}: node overflows dur`);
      }
    }
  });

  it('unknown names fall back to ui (including undefined and empty)', () => {
    for (const bad of ['zap', '', undefined, null, 42, 'HIT']) {
      const d = sfxDesc(bad);
      assert.equal(d.name, 'ui', `no fallback for ${String(bad)}`);
      assert.deepEqual(d, sfxDesc('ui'));
    }
  });

  it('same seed gives the same descriptor (deterministic)', () => {
    for (const name of SFX_NAMES) {
      assert.deepEqual(sfxDesc(name, { seed: 375 }), sfxDesc(name, { seed: 375 }));
    }
  });

  it('default seed equals explicit seed 0', () => {
    assert.deepEqual(sfxDesc('hit'), sfxDesc('hit', { seed: 0 }));
  });

  it('seed only retunes noise nodes, osc nodes stay fixed', () => {
    const a = sfxDesc('hit', { seed: 1 });
    const b = sfxDesc('hit', { seed: 2 });
    const oscA = a.nodes.filter((n) => n.type === 'osc');
    const oscB = b.nodes.filter((n) => n.type === 'osc');
    assert.deepEqual(oscA, oscB);
    assert.notDeepEqual(a.nodes, b.nodes);
  });

  it('all durations stay within 1.2s across names and seeds', () => {
    for (const name of SFX_NAMES) {
      for (const seed of [0, 1, 7, 375, -5, 999999]) {
        const d = sfxDesc(name, { seed });
        assert.ok(d.dur <= SFX_MAX_DUR + 1e-9, `${name}@${seed}: dur ${d.dur}`);
        assert.ok(d.dur <= 1.2 + 1e-9, `${name}@${seed}: dur ${d.dur}`);
      }
    }
  });

  it('descriptors survive a JSON round trip', () => {
    for (const name of SFX_NAMES) {
      const d = sfxDesc(name, { seed: 9 });
      assert.deepEqual(JSON.parse(JSON.stringify(d)), d);
    }
  });

  it('sfx.js uses no Math.random (fully deterministic)', () => {
    const src = readFileSync(new URL('../src/audio/sfx.js', import.meta.url), 'utf8');
    assert.ok(!src.includes('Math.random'), 'Math.random found in sfx.js');
  });
});

describe('themePattern generator', () => {
  it('THEMES matches the 5 arena ids in order', () => {
    assert.equal(THEMES.length, 5);
    assert.deepEqual(THEMES, ARENAS.map((a) => a.id));
    assert.deepEqual(THEMES, [
      'moonlit-temple', 'ember-forge', 'storm-bridge', 'void-sanctum', 'eclipse-rooftop',
    ]);
  });

  it('pattern shape is an 8-bar loop with finite values', () => {
    for (let a = 0; a < 5; a++) {
      for (const level of [0, 1, 2]) {
        const p = themePattern(a, level);
        assert.ok(Number.isFinite(p.bpm) && p.bpm > 0, `arena ${a}: bad bpm`);
        assert.equal(p.bass.length, 32);
        assert.equal(p.lead.length, 64);
        assert.equal(p.hats.length, 64);
        for (const n of [...p.bass, ...p.lead]) {
          assert.ok(Number.isInteger(n) && n >= 0 && n <= 96, `arena ${a}: bad midi ${n}`);
        }
        for (const h of p.hats) assert.ok(h === 0 || h === 1, `arena ${a}: bad hat ${h}`);
      }
    }
  });

  it('accepts theme ids as well as indices', () => {
    assert.deepEqual(themePattern('ember-forge', 1), themePattern(1, 1));
    assert.deepEqual(themePattern('nope', 1), themePattern(0, 1));
  });

  it('is deterministic per arena and intensity', () => {
    for (let a = 0; a < 5; a++) {
      for (const level of [0, 1, 2]) {
        assert.deepEqual(themePattern(a, level), themePattern(a, level));
      }
    }
  });

  it('different arenas give different patterns', () => {
    const hashes = new Set([0, 1, 2, 3, 4].map((a) => patternHash(themePattern(a, 1))));
    assert.equal(hashes.size, 5);
  });

  it('boss is denser than fight is denser than calm, for every arena', () => {
    for (let a = 0; a < 5; a++) {
      const calm = density(themePattern(a, 0));
      const fight = density(themePattern(a, 1));
      const boss = density(themePattern(a, 2));
      assert.ok(fight > calm, `arena ${a}: fight ${fight} <= calm ${calm}`);
      assert.ok(boss > fight, `arena ${a}: boss ${boss} <= fight ${fight}`);
    }
  });

  it('calm notes are a subset of boss notes (same seed stream)', () => {
    for (let a = 0; a < 5; a++) {
      const calm = themePattern(a, 0);
      const boss = themePattern(a, 2);
      for (let i = 0; i < calm.bass.length; i++) {
        if (calm.bass[i] > 0) assert.ok(boss.bass[i] > 0, `arena ${a} bass ${i}`);
      }
      for (let i = 0; i < calm.lead.length; i++) {
        if (calm.lead[i] > 0) assert.ok(boss.lead[i] > 0, `arena ${a} lead ${i}`);
      }
      for (let i = 0; i < calm.hats.length; i++) {
        if (calm.hats[i] === 1) assert.equal(boss.hats[i], 1, `arena ${a} hat ${i}`);
      }
    }
  });

  it('tempo rises with intensity', () => {
    for (let a = 0; a < 5; a++) {
      const bpms = [0, 1, 2].map((l) => themePattern(a, l).bpm);
      assert.ok(bpms[1] > bpms[0] && bpms[2] > bpms[1], `arena ${a}: bpms ${bpms}`);
    }
  });

  it('invalid intensity falls back to a finite fight-level pattern', () => {
    for (const bad of ['loud', undefined, null, 5, -1]) {
      const d = themePattern(0, bad);
      assert.deepEqual(d, themePattern(0, 1));
    }
  });

  it('patternHash is stable and arena-sensitive', () => {
    const p = themePattern(3, 2);
    assert.equal(typeof patternHash(p), 'string');
    assert.equal(patternHash(p), patternHash(themePattern(3, 2)));
    assert.notEqual(patternHash(themePattern(0, 1)), patternHash(themePattern(1, 1)));
    assert.notEqual(patternHash(themePattern(0, 0)), patternHash(themePattern(0, 2)));
  });

  it('music.js derives from mulberry32 and uses no Math.random', () => {
    const src = readFileSync(new URL('../src/audio/music.js', import.meta.url), 'utf8');
    assert.ok(src.includes('mulberry32'), 'missing mulberry32 import');
    assert.ok(!src.includes('Math.random'), 'Math.random found in music.js');
  });

  it('INTENSITIES lists the three levels', () => {
    assert.deepEqual(INTENSITIES, [0, 1, 2]);
  });
});

describe('createAudio engine (node-safe)', () => {
  it('imports safely with no AudioContext present', () => {
    assert.equal(typeof AudioContext, 'undefined');
    const eng = createAudio();
    assert.ok(eng && typeof eng.ensure === 'function');
  });

  it('all methods no-op without a context', () => {
    const eng = createAudio();
    assert.equal(eng.ensure(), false);
    assert.equal(eng.playSfx(sfxDesc('hit', { seed: 1 })), false);
    assert.equal(eng.startMusic(themePattern(0, 1)), false);
    assert.equal(eng.stopMusic(), true);
    assert.equal(eng.isMuted(), false);
  });

  it('handles garbage input without throwing', () => {
    const eng = createAudio();
    assert.equal(eng.playSfx(null), false);
    assert.equal(eng.playSfx({}), false);
    assert.equal(eng.startMusic(null), false);
    assert.equal(eng.startMusic({}), false);
    assert.doesNotThrow(() => eng.setIntensity(99));
    assert.doesNotThrow(() => eng.stopMusic());
  });

  it('persists mute only via injected callbacks', () => {
    let saved = null;
    const eng = createAudio({ getMuted: () => true, setMuted: (m) => { saved = m; } });
    assert.equal(eng.isMuted(), true);
    assert.equal(eng.setMuted(false), false);
    assert.equal(saved, false);
    assert.equal(eng.isMuted(), false);
  });

  it('setIntensity clamps to 0..2 and defaults to 1', () => {
    const eng = createAudio();
    assert.equal(eng.setIntensity(0), 0);
    assert.equal(eng.setIntensity(2), 2);
    assert.equal(eng.setIntensity(7), 1);
  });

  it('engine.js touches neither storage nor top-level browser globals', () => {
    const src = readFileSync(new URL('../src/audio/engine.js', import.meta.url), 'utf8');
    assert.ok(!src.includes('localStorage'), 'localStorage found in engine.js');
    assert.ok(!src.includes('sessionStorage'), 'sessionStorage found in engine.js');
    assert.ok(!src.includes('Math.random'), 'Math.random found in engine.js');
    const lines = src.split('\n');
    const topLevelHits = lines.filter((ln, i) => {
      void i;
      const t = ln.trim();
      if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return false;
      if (/^\s/.test(ln)) return false;
      return /AudioContext|window\.|document\./.test(t);
    });
    assert.deepEqual(topLevelHits, []);
  });
});
