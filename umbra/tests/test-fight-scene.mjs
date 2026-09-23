/**
 * Umbra M2 fight-scene tests: sim-driven SceneDesc (positions, poses,
 * hit-flash, shake) plus input-script replay determinism (G4).
 * Pure node:test, no DOM, no browser.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSceneDesc, flashShake } from '../src/render/scene.js';
import { createFight, stepFight, hashState } from '../src/combat/engine.js';
import { createAI, aiInput } from '../src/combat/ai.js';
import { hashRig } from '../src/poses.js';

const NEUTRAL = () => ({ move: 0, crouch: false, jump: false, punch: false, kick: false, block: false, special: false, dash: 0 });

describe('flashShake', () => {
  it('is zero with no events', () => {
    assert.deepEqual(flashShake([], 100), { flash: 0, shake: 0 });
    assert.deepEqual(flashShake(null, 100), { flash: 0, shake: 0 });
  });
  it('peaks at the hit tick and decays over 6 ticks', () => {
    const ev = [{ t: 'hit', tick: 50, side: 0, move: 'jab', damage: 6 }];
    assert.equal(flashShake(ev, 50).flash, 1);
    const mid = flashShake(ev, 53).flash;
    assert.ok(mid > 0 && mid < 1, `mid decay in (0,1), got ${mid}`);
    assert.equal(flashShake(ev, 56).flash, 0);
  });
  it('parry flashes, ko shakes, old events expire', () => {
    assert.equal(flashShake([{ t: 'parried', tick: 10 }], 10).flash, 1);
    assert.ok(flashShake([{ t: 'ko', tick: 10 }], 10).shake > 0.9);
    assert.deepEqual(flashShake([{ t: 'hit', tick: 10 }], 100), { flash: 0, shake: 0 });
  });
});

describe('buildSceneDesc with live fight', () => {
  it('ambient tableau unchanged without fight (M1 contract)', () => {
    const a = buildSceneDesc({ tick: 123, arena: 0 });
    const b = buildSceneDesc({ tick: 123, arena: 0 });
    assert.equal(hashRig(a.fighters[0].segs), hashRig(b.fighters[0].segs));
    assert.equal(a.flash, 0);
    assert.equal(a.shake, 0);
  });
  it('fighter x tracks the sim position', () => {
    const fight = createFight({ seed: 7 });
    fight.fighters[0].x = -0.71;
    fight.fighters[1].x = 0.55;
    const scene = buildSceneDesc({ tick: 0, arena: 0, fight });
    const xs = (segs) => segs.reduce((s, g) => s + g.ax + g.bx, 0) / (segs.length * 2);
    assert.ok(Math.abs(xs(scene.fighters[0].segs) - -0.71) < 0.09, 'p0 near sim x');
    assert.ok(Math.abs(xs(scene.fighters[1].segs) - 0.55) < 0.09, 'p1 near sim x');
  });
  it('attack pose differs from idle pose (visible strikes)', () => {
    const fight = createFight({ seed: 7 });
    const idle = buildSceneDesc({ tick: 0, arena: 0, fight });
    const idleHash = hashRig(idle.fighters[0].segs);
    fight.fighters[0].state = 'attack';
    fight.fighters[0].moveId = 'kick';
    fight.fighters[0].moveTick = 8;
    const striking = buildSceneDesc({ tick: 0, arena: 0, fight });
    assert.notEqual(hashRig(striking.fighters[0].segs), idleHash, 'kick pose must differ from guard');
  });
  it('block/hit/ko poses all differ from idle', () => {
    const fight = createFight({ seed: 7 });
    const idleHash = hashRig(buildSceneDesc({ tick: 0, arena: 0, fight }).fighters[0].segs);
    for (const [state, extra] of [['block', {}], ['hit', { stateTick: 3 }], ['ko', {}]]) {
      fight.fighters[0].state = state;
      Object.assign(fight.fighters[0], { moveId: null, moveTick: 0, stateTick: 0 }, extra);
      const h = hashRig(buildSceneDesc({ tick: 0, arena: 0, fight }).fighters[0].segs);
      assert.notEqual(h, idleHash, `${state} pose must differ from guard`);
    }
  });
  it('flash rises after a real landed hit in a scripted bout', () => {
    const fight = createFight({ seed: 375 });
    const walk = { ...NEUTRAL(), move: 1 };
    const jab = { ...NEUTRAL(), punch: true };
    let sawHit = false;
    // Walk into range first (spawn gap 0.68 > jab range 0.22), then strike.
    for (let t = 0; t < 500 && !sawHit; t++) {
      stepFight(fight, t < 120 ? walk : jab, NEUTRAL());
      sawHit = fight.events.some((e) => e.t === 'hit');
    }
    assert.ok(sawHit, 'walk-in jab must land within 500 ticks');
    const scene = buildSceneDesc({ tick: 0, arena: 0, fight });
    assert.ok(scene.flash > 0, `flash must be positive right after a hit, got ${scene.flash}`);
  });
});

describe('input-script replay determinism (G4)', () => {
  it('recorded AI bout replays byte-identical from the input log', () => {
    const seed = 20260923;
    const TICKS = 600;
    // Record: AI vs AI, logging every input pair.
    const live = createFight({ seed });
    const ai0 = createAI({ seed: seed ^ 0x11, difficulty: 1, archetype: 'brawler' });
    const ai1 = createAI({ seed: seed ^ 0x22, difficulty: 1, archetype: 'turtle' });
    const log = [];
    for (let t = 0; t < TICKS && !live.over; t++) {
      const i0 = { ...aiInput(ai0, live.fighters[0], live.fighters[1], live.rng, live.tick) };
      const i1 = { ...aiInput(ai1, live.fighters[1], live.fighters[0], live.rng, live.tick) };
      log.push([i0, i1]);
      stepFight(live, i0, i1);
    }
    const liveHash = hashState(live);
    const liveEvents = JSON.stringify(live.events);
    // Replay: fresh fight, same seed, same logged inputs.
    const replay = createFight({ seed });
    for (const [i0, i1] of log) {
      if (replay.over) break;
      stepFight(replay, i0, i1);
    }
    assert.equal(hashState(replay), liveHash, 'replay hash must match live hash');
    assert.equal(JSON.stringify(replay.events), liveEvents, 'replay events must match live events');
    assert.ok(log.length > 100, `bout must run a real length, got ${log.length} ticks`);
  });
});
