// Umbra M4: weapon trail ribbons in the shared SceneDesc.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSceneDesc, weaponTrail, TRAIL_POINTS, FISTS_TRAIL } from '../src/render/scene.js';
import { WEAPONS, WEAPON_TABLES } from '../src/weapons.js';
import { createFight, stepFight } from '../src/combat/engine.js';

const spear = WEAPONS.find((w) => w.id === 'spear');
const NEUTRAL = { move: 0, crouch: false, jump: false, punch: false, kick: false, block: false, special: false, dash: 0 };

describe('weaponTrail', () => {
  it('null unless mid-swing with a move id', () => {
    assert.equal(weaponTrail(null), null);
    assert.equal(weaponTrail({ state: 'idle', moveId: null }), null);
    assert.equal(weaponTrail({ state: 'walk', moveId: 'jab', moveTick: 2 }), null);
  });

  it('emits 6 deterministic points with weapon color and width', () => {
    const sim = { state: 'attack', moveId: 'kick', moveTick: 5, x: 0.1, facing: 1, y: 0 };
    const a = weaponTrail(sim, WEAPON_TABLES.spear, spear);
    const b = weaponTrail(sim, WEAPON_TABLES.spear, spear);
    assert.deepEqual(a, b);
    assert.equal(a.points.length, TRAIL_POINTS);
    assert.deepEqual(a.color, spear.trail.color);
    assert.equal(a.width, spear.trail.width);
    for (const pt of a.points) {
      assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y));
    }
    // Progress moves the ribbon: later ticks shift the head.
    const late = weaponTrail({ ...sim, moveTick: 20 }, WEAPON_TABLES.spear, spear);
    assert.notDeepEqual(a.points[0], late.points[0]);
    // Facing mirrors the ribbon across the fighter.
    const left = weaponTrail({ ...sim, facing: -1 }, WEAPON_TABLES.spear, spear);
    assert.ok(Math.abs(left.points[0].x - (2 * sim.x - a.points[0].x)) < 1e-9);
  });

  it('falls back to fists trail without a weapon def', () => {
    const sim = { state: 'attack', moveId: 'jab', moveTick: 2, x: 0, facing: 1, y: 0 };
    const t = weaponTrail(sim, undefined, undefined);
    assert.deepEqual(t.color, FISTS_TRAIL.color);
  });
});

describe('scene weapons field', () => {
  it('ambient scenes keep the M1 empty contract', () => {
    const s = buildSceneDesc({ tick: 30, arena: 0 });
    assert.deepEqual(s.weapons, [[], []]);
  });

  it('idle fight scenes stay empty, swings gain ribbons', () => {
    const f = createFight({ seed: 5 });
    for (let i = 0; i < 61; i++) stepFight(f, NEUTRAL, NEUTRAL);
    const idle = buildSceneDesc({ tick: f.tick, arena: 0, fight: f });
    assert.deepEqual(idle.weapons, [[], []]);
    stepFight(f, { ...NEUTRAL, punch: true }, NEUTRAL);
    const swing = buildSceneDesc({
      tick: f.tick,
      arena: 0,
      fight: f,
      tables: [WEAPON_TABLES.spear, WEAPON_TABLES.fists],
      weapons: [spear, undefined],
    });
    assert.equal(swing.weapons[0].length, 1);
    assert.equal(swing.weapons[1].length, 0);
    assert.equal(swing.weapons[0][0].points.length, TRAIL_POINTS);
  });
});
