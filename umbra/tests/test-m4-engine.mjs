// Umbra M4: per-side move tables, power scales, boss sim determinism.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFight,
  stepFight,
  hashState,
  tableFor,
  sidePower,
  sanitizePower,
  freshBoss,
  movesDigest,
} from '../src/combat/engine.js';
import { MOVES } from '../src/combat/moves.js';
import { WEAPON_TABLES, movesForWeapon } from '../src/weapons.js';
import { bossFor } from '../src/bosses.js';

const NEUTRAL = { move: 0, crouch: false, jump: false, punch: false, kick: false, block: false, special: false, dash: 0 };
const PUNCH = { ...NEUTRAL, punch: true };
const KICK = { ...NEUTRAL, kick: true };

function run(fight, script) {
  for (const [a, b] of script) stepFight(fight, a, b);
  return fight;
}

function aiScript(n, move) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([move, NEUTRAL]);
  return out;
}

describe('m4 createFight options', () => {
  it('defaults keep legacy shape (null tableB, unit power, no boss)', () => {
    const f = createFight({ seed: 7 });
    assert.equal(f.movesB, null);
    assert.deepEqual(f.power, [1, 1]);
    assert.equal(f.boss, null);
  });

  it('movesB is an owned frozen copy, hostile-safe', () => {
    const src = movesForWeapon('spear');
    const f = createFight({ movesB: src });
    assert.notEqual(f.movesB, src);
    assert.ok(Object.isFrozen(f.movesB));
    assert.equal(createFight({ movesB: 42 }).movesB, null);
    assert.equal(tableFor(f, 0), f.moves);
    assert.equal(tableFor(f, 1), f.movesB);
    const plain = createFight({});
    assert.equal(tableFor(plain, 1), plain.moves);
  });

  it('sanitizePower clamps to unit on garbage', () => {
    assert.deepEqual(sanitizePower(null), [1, 1]);
    assert.deepEqual(sanitizePower([2, 0.5]), [2, 0.5]);
    assert.deepEqual(sanitizePower([0, -3]), [1, 1]);
    assert.deepEqual(sanitizePower(['x', Infinity]), [1, 1]);
    assert.deepEqual(createFight({ power: [1.5, 1] }).power, [1.5, 1]);
  });

  it('unknown boss id yields no boss, known id seeds fresh dynamics', () => {
    assert.equal(createFight({ boss: 'echo' }).boss, null);
    assert.equal(createFight({ boss: 42 }).boss, null);
    const f = createFight({ boss: 'vex' });
    assert.deepEqual(f.boss, freshBoss('vex'));
    assert.deepEqual(f.boss.adds, []);
  });
});

describe('m4 per-side tables and power', () => {
  it('sword side outranges a fists side at spear distance', () => {
    const sword = WEAPON_TABLES.sword;
    const mk = () => {
      const f = createFight({ seed: 11, moves: sword, movesB: MOVES, roundTicks: 600 });
      // Skip intro, then stand at 0.31 apart: sword kick (0.32) connects,
      // fists kick (0.30) falls short.
      for (let i = 0; i < 70; i++) stepFight(f, NEUTRAL, NEUTRAL);
      f.fighters[0].x = -0.155;
      f.fighters[1].x = 0.155;
      return f;
    };
    const a = mk();
    run(a, [[KICK, KICK]]);
    for (let i = 0; i < 40; i++) stepFight(a, NEUTRAL, NEUTRAL);
    const side0Hit = a.events.some((e) => e.side === 0 && e.t === 'hit');
    const side1Hit = a.events.some((e) => e.side === 1 && e.t === 'hit');
    assert.equal(side0Hit, true);
    assert.equal(side1Hit, false);
  });

  it('power scales clean-hit damage and replays byte-identically', () => {
    const close = (f) => {
      for (let i = 0; i < 70; i++) stepFight(f, NEUTRAL, NEUTRAL);
      f.fighters[0].x = -0.075;
      f.fighters[1].x = 0.075;
    };
    const bout = (power) => {
      const f = createFight({ seed: 21, power });
      close(f);
      stepFight(f, PUNCH, NEUTRAL);
      for (let i = 0; i < 60; i++) stepFight(f, NEUTRAL, NEUTRAL);
      return f;
    };
    const a = bout([2, 1]);
    const b = bout([2, 1]);
    const c = bout([1, 1]);
    assert.equal(hashState(a), hashState(b));
    const dmgA = a.events.filter((e) => e.side === 0 && e.t === 'hit').reduce((s, e) => s + e.damage, 0);
    const dmgC = c.events.filter((e) => e.side === 0 && e.t === 'hit').reduce((s, e) => s + e.damage, 0);
    assert.ok(dmgA > 0);
    assert.ok(dmgA > dmgC);
    assert.notEqual(hashState(a), hashState(c));
  });

  it('weapon tables change the bout but stay deterministic', () => {
    const script = aiScript(400, PUNCH);
    const mk = (w) => createFight({ seed: 31, moves: movesForWeapon(w), movesB: movesForWeapon(w) });
    const a = mk('spear');
    const b = mk('spear');
    run(a, script);
    run(b, script);
    assert.equal(hashState(a), hashState(b));
    const fists = createFight({ seed: 31 });
    run(fists, script);
    assert.notEqual(hashState(a), hashState(fists));
  });
});

describe('m4 boss sim', () => {
  it('vex summons telegraphed wisps that wound an idle player', () => {
    const f = createFight({ seed: 41, boss: 'vex', roundTicks: 3600 });
    for (let i = 0; i < 500; i++) stepFight(f, NEUTRAL, NEUTRAL);
    const spawns = f.events.filter((e) => e.t === 'phase' && e.move === 'wisp');
    assert.ok(spawns.length >= 1);
    const wispHits = f.events.filter((e) => e.move === 'wisp' && e.t === 'hit');
    assert.ok(wispHits.length >= 1);
    assert.ok(f.fighters[0].hp < f.fighters[0].maxHp);
  });

  it('vex bout replays byte-identically (hash + events)', () => {
    const script = aiScript(700, PUNCH);
    const a = createFight({ seed: 51, boss: 'vex', roundTicks: 3600 });
    const b = createFight({ seed: 51, boss: 'vex', roundTicks: 3600 });
    run(a, script);
    run(b, script);
    assert.equal(hashState(a), hashState(b));
    assert.equal(a.events.length, b.events.length);
  });

  it('phase crossings emit banners as hp falls', () => {
    const f = createFight({ seed: 61, boss: 'dusk', roundTicks: 3600 });
    for (let i = 0; i < 70; i++) stepFight(f, NEUTRAL, NEUTRAL);
    f.fighters[1].hp = Math.floor(f.fighters[1].maxHp * 0.5);
    stepFight(f, NEUTRAL, NEUTRAL);
    assert.ok(f.events.some((e) => e.t === 'phase' && e.move === 'phase-1'));
    f.fighters[1].hp = Math.floor(f.fighters[1].maxHp * 0.1);
    stepFight(f, NEUTRAL, NEUTRAL);
    assert.ok(f.events.some((e) => e.t === 'phase' && e.move === 'phase-2'));
    assert.equal(f.boss.phase, 2);
  });

  it('dusk enrages at the hp cut and hits harder', () => {
    const f = createFight({ seed: 71, boss: 'dusk', roundTicks: 3600 });
    for (let i = 0; i < 70; i++) stepFight(f, NEUTRAL, NEUTRAL);
    assert.equal(sidePower(f, 1), 1);
    f.fighters[1].hp = Math.floor(f.fighters[1].maxHp * 0.3);
    stepFight(f, NEUTRAL, NEUTRAL);
    assert.equal(f.boss.enraged, true);
    assert.ok(f.events.some((e) => e.t === 'phase' && e.move === 'enrage'));
    const expected = bossFor('dusk').eclipse.power;
    assert.ok(Math.abs(sidePower(f, 1) - expected) < 1e-9);
  });

  it('ruin flips stance on schedule with events', () => {
    const f = createFight({ seed: 81, boss: 'ruin', roundTicks: 3600 });
    for (let i = 0; i < 700; i++) stepFight(f, NEUTRAL, NEUTRAL);
    assert.ok(f.events.some((e) => e.t === 'phase' && e.move === 'stance-1'));
    assert.equal(f.boss.stance, 1);
  });

  it('boss dynamics reset each round but identity persists', () => {
    const f = createFight({ seed: 91, boss: 'vex', rounds: 3, roundTicks: 120 });
    for (let i = 0; i < 400; i++) stepFight(f, NEUTRAL, NEUTRAL);
    assert.ok(f.round >= 1);
    if (f.round > 1) {
      assert.equal(f.boss.id, 'vex');
      assert.deepEqual(f.boss.adds, []);
    }
  });

  it('movesDigest covers each weapon table distinctly', () => {
    const digests = new Set(Object.values(WEAPON_TABLES).map((t) => movesDigest(t)));
    assert.equal(digests.size, Object.keys(WEAPON_TABLES).length);
  });
});
