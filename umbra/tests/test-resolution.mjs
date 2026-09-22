// Umbra M1: resolution ladder, EWMA, hysteresis, battery lock.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LADDER,
  ladderSize,
  nextLadderIndex,
  updateEwma,
  BATTERY_SAVER_INDEX,
} from '../src/render/resolution.js';

describe('ladder', () => {
  it('four rungs from 720p to 240p', () => {
    assert.equal(LADDER.length, 4);
    assert.deepEqual(ladderSize(0), { w: 1280, h: 720 });
    assert.deepEqual(ladderSize(3), { w: 426, h: 240 });
    assert.deepEqual(ladderSize(99), { w: 426, h: 240 });
  });
  it('cooldown blocks switching within 500 ms', () => {
    const s = { index: 1, ewma: 40, nowMs: 1000, lastSwitchMs: 800 };
    assert.equal(nextLadderIndex(s), 1);
  });
  it('steps down one rung when slow, up one when fast', () => {
    assert.equal(nextLadderIndex({ index: 1, ewma: 25, nowMs: 2000, lastSwitchMs: 0 }), 2);
    assert.equal(nextLadderIndex({ index: 1, ewma: 8, nowMs: 2000, lastSwitchMs: 0 }), 0);
    assert.equal(nextLadderIndex({ index: 0, ewma: 8, nowMs: 2000, lastSwitchMs: 0 }), 0);
    assert.equal(nextLadderIndex({ index: 3, ewma: 60, nowMs: 2000, lastSwitchMs: 0 }), 3);
  });
  it('holds steady in the comfort band', () => {
    assert.equal(nextLadderIndex({ index: 1, ewma: 14, nowMs: 2000, lastSwitchMs: 0 }), 1);
  });
  it('battery saver pins 640x360 immediately', () => {
    assert.equal(
      nextLadderIndex({ index: 0, ewma: 5, nowMs: 100, lastSwitchMs: 99, batterySaver: true }),
      BATTERY_SAVER_INDEX,
    );
  });
  it('no oscillation: a switch consumes the cooldown', () => {
    const first = nextLadderIndex({ index: 1, ewma: 30, nowMs: 5000, lastSwitchMs: 0 });
    assert.equal(first, 2);
    const second = nextLadderIndex({ index: first, ewma: 30, nowMs: 5100, lastSwitchMs: 5000 });
    assert.equal(second, 2);
  });
});

describe('updateEwma', () => {
  it('seeds from the first sample, ignores garbage', () => {
    assert.equal(updateEwma(NaN, 16.7), 16.7);
    assert.equal(updateEwma(16, NaN), 16);
    const v = updateEwma(10, 20);
    assert.ok(v > 10 && v < 20);
  });
});
