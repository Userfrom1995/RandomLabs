// Umbra M4: boss defs + phase index + trial checker + frame rows.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, BOSS_IDS, PHASE_CUTS, bossFor, bossPhaseIndex, validateBosses } from '../src/bosses.js';
import { TRIALS, trialById, checkTrial, frameRows, validateDojo, MOVE_ORDER } from '../src/dojo.js';
import { MOVES } from '../src/combat/moves.js';
import { ARCHETYPES } from '../src/combat/ai.js';

describe('bosses', () => {
  it('table validates clean with 3 bosses in canonical order', () => {
    assert.deepEqual(validateBosses(), []);
    assert.deepEqual(BOSS_IDS, ['vex', 'ruin', 'dusk']);
    assert.equal(BOSSES.length, 3);
  });

  it('covers one mechanic each, keyed by story enemy', () => {
    const byId = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
    assert.equal(byId.vex.mechanic, 'summoner');
    assert.equal(byId.ruin.mechanic, 'duelist');
    assert.equal(byId.dusk.mechanic, 'eclipse');
    for (const b of BOSSES) assert.equal(b.enemy, b.id);
    assert.equal(byId.ruin.duel.stances.length, 2);
    for (const s of byId.ruin.duel.stances) assert.ok(ARCHETYPES.includes(s));
    assert.ok(byId.dusk.eclipse.power > 1);
  });

  it('bossFor resolves enemies, null otherwise', () => {
    assert.equal(bossFor('vex').id, 'vex');
    assert.equal(bossFor('echo'), null);
    assert.equal(bossFor(null), null);
    assert.equal(bossFor(42), null);
  });

  it('phase index follows the hp cuts, hostile-safe', () => {
    const vex = bossFor('vex');
    assert.equal(bossPhaseIndex(vex, 1), 0);
    assert.equal(bossPhaseIndex(vex, 0.67), 0);
    assert.equal(bossPhaseIndex(vex, 0.66), 1);
    assert.equal(bossPhaseIndex(vex, 0.34), 1);
    assert.equal(bossPhaseIndex(vex, 0.33), 2);
    assert.equal(bossPhaseIndex(vex, 0), 2);
    assert.equal(bossPhaseIndex(vex, NaN), 0);
    assert.equal(bossPhaseIndex(vex, -5), 2);
    assert.equal(bossPhaseIndex(vex, 99), 0);
    assert.equal(bossPhaseIndex(null, 0.1), 0);
    assert.deepEqual(PHASE_CUTS, [0.66, 0.33]);
  });

  it('validator catches defects without throwing', () => {
    assert.ok(validateBosses(null).length > 0);
    assert.ok(validateBosses([{ ...BOSSES[0], phases: [] }]).length > 0);
    assert.ok(validateBosses([{ ...BOSSES[1], duel: { every: 0, stances: ['x'] } }]).length > 0);
  });
});

describe('dojo', () => {
  it('trials validate clean with canonical sequences', () => {
    assert.deepEqual(validateDojo(), []);
    assert.ok(TRIALS.length >= 5);
    for (const t of TRIALS) {
      for (const m of t.sequence) assert.ok(MOVE_ORDER.includes(m));
    }
    assert.equal(trialById('trial-one-two').sequence.join(','), 'jab,cross');
    assert.equal(trialById('nope'), null);
  });

  it('checkTrial matches hit subsequences for the right side', () => {
    const log = [
      { t: 'hit', move: 'jab', side: 0 },
      { t: 'blocked', move: 'kick', side: 0 },
      { t: 'hit', move: 'kick', side: 1 },
      { t: 'hit', move: 'cross', side: 0 },
    ];
    assert.equal(checkTrial('trial-one-two', log, 0).ok, true);
    assert.equal(checkTrial('trial-one-two', log, 1).ok, false);
    const partial = checkTrial('trial-rising-fang', log, 0);
    assert.equal(partial.ok, false);
    assert.equal(partial.matched, 2);
    assert.equal(partial.total, 3);
    assert.equal(checkTrial('trial-one-two', null, 0).ok, false);
    assert.equal(checkTrial('bogus', log, 0).total, 0);
  });

  it('frameRows lists canonical fists data with totals', () => {
    const rows = frameRows(MOVES);
    assert.deepEqual(rows.map((r) => r.move), MOVE_ORDER);
    const jab = rows[0];
    assert.equal(jab.total, jab.startup + jab.active + jab.recovery);
    assert.equal(jab.damage, MOVES.jab.damage);
    assert.deepEqual(frameRows(null), []);
  });
});
