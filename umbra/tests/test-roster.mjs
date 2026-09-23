// Umbra M3: roster data integrity (3 playable + 5 enemies, rigs, AI refs).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYABLES,
  ENEMIES,
  IDENTITY_RIG,
  fighterById,
  validateRoster,
} from '../src/roster.js';
import { ARCHETYPES } from '../src/combat/ai.js';
import { idleAngles, solveRig, hashRig } from '../src/poses.js';

describe('roster shape', () => {
  it('ships exactly 3 playables and 5 enemies', () => {
    assert.equal(PLAYABLES.length, 3);
    assert.equal(ENEMIES.length, 5);
  });
  it('validates clean', () => {
    assert.deepEqual(validateRoster(), []);
  });
  it('fighterById resolves every id and rejects unknowns', () => {
    for (const f of [...PLAYABLES, ...ENEMIES]) {
      assert.equal(fighterById(f.id), f);
    }
    assert.equal(fighterById('nope'), null);
    assert.equal(fighterById(42), null);
  });
  it('every AI archetype is a real seeded temperament', () => {
    for (const f of [...PLAYABLES, ...ENEMIES]) {
      assert.ok(ARCHETYPES.includes(f.ai), `${f.id}: bad ai ${f.ai}`);
    }
  });
  it('difficulty spreads 0..2 across the enemy ladder', () => {
    const ds = new Set(ENEMIES.map((e) => e.difficulty));
    assert.ok(ds.has(0) && ds.has(1) && ds.has(2), `enemy difficulties ${[...ds]} miss a tier`);
  });
  it('enemy hp is non-decreasing along the act order', () => {
    const hps = ENEMIES.map((e) => e.hp);
    for (let i = 1; i < hps.length; i++) {
      assert.ok(hps[i] >= hps[i - 1], `enemy ${i} hp ${hps[i]} < ${hps[i - 1]}`);
    }
  });
  it('rejects duplicates, bad stats, bad rigs', () => {
    const dup = [...PLAYABLES, { ...PLAYABLES[0] }];
    assert.ok(validateRoster(dup, ENEMIES).some((p) => p.includes('duplicate')));
    const badHp = PLAYABLES.map((f) => (f.id === 'kaito' ? { ...f, hp: 0 } : f));
    assert.ok(validateRoster(badHp, ENEMIES).some((p) => p.includes('hp')));
    const badAi = ENEMIES.map((f) => (f.id === 'ash' ? { ...f, ai: 'ninja' } : f));
    assert.ok(validateRoster(PLAYABLES, badAi).some((p) => p.includes('ai')));
    const badRig = ENEMIES.map((f) => (f.id === 'vex' ? { ...f, rig: { height: 9, bulk: 1, head: 1, limb: 1 } } : f));
    assert.ok(validateRoster(PLAYABLES, badRig).some((p) => p.includes('rig.height')));
  });
});

describe('rig identity', () => {
  it('default solveRig path is bit-identical with and without rig opts', () => {
    const a = idleAngles(1.37, 2.4);
    const plain = hashRig(solveRig(a, { x: 0.34, groundY: 0.14, facing: -1 }));
    const ident = hashRig(solveRig(a, { x: 0.34, groundY: 0.14, facing: -1, rig: IDENTITY_RIG }));
    const kaito = hashRig(
      solveRig(a, { x: 0.34, groundY: 0.14, facing: -1, rig: fighterById('kaito').rig }),
    );
    assert.equal(ident, plain);
    assert.equal(kaito, plain);
  });
  it('every roster rig solves finite and changes the silhouette', () => {
    const a = idleAngles(0.6, 0);
    const base = hashRig(solveRig(a, { x: 0, groundY: 0.14, facing: 1 }));
    let changed = 0;
    for (const f of [...PLAYABLES, ...ENEMIES]) {
      const segs = solveRig(a, { x: 0, groundY: 0.14, facing: 1, rig: f.rig });
      assert.equal(segs.length, 11);
      for (const s of segs) {
        for (const k of ['ax', 'ay', 'bx', 'by', 'w']) assert.ok(Number.isFinite(s[k]));
        assert.ok(s.w > 0 && s.w < 0.3, `${f.id}.${s.name} width insane`);
      }
      if (hashRig(segs) !== base) changed += 1;
    }
    // Kaito is the identity rig; every other silhouette must differ.
    assert.equal(changed, PLAYABLES.length + ENEMIES.length - 1);
  });
  it('goran is bulkier and mira is taller than kaito', () => {
    const a = idleAngles(0.6, 0);
    const width = (id) =>
      solveRig(a, { x: 0, groundY: 0.14, facing: 1, rig: fighterById(id).rig })
        .find((s) => s.name === 'torso').w;
    const top = (id) =>
      solveRig(a, { x: 0, groundY: 0.14, facing: 1, rig: fighterById(id).rig })
        .find((s) => s.name === 'head').by;
    assert.ok(width('goran') > width('kaito'), 'goran torso not bulkier');
    assert.ok(top('mira') > top('kaito'), 'mira not taller');
  });
});
