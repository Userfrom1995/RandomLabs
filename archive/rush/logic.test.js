'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./logic.js');
const C = R.CONFIG;

// ---- Math helpers ---------------------------------------------------------

test('clamp clamps to both bounds', () => {
  assert.equal(R.clamp(5, 0, 10), 5);
  assert.equal(R.clamp(-3, 0, 10), 0);
  assert.equal(R.clamp(42, 0, 10), 10);
  assert.equal(R.clamp(5, 5, 5), 5);
});

test('lerp interpolates and extrapolates', () => {
  assert.equal(R.lerp(0, 10, 0.5), 5);
  assert.equal(R.lerp(0, 10, 0), 0);
  assert.equal(R.lerp(0, 10, 1), 10);
  assert.equal(R.lerp(0, 10, 2), 20);
});

test('smoothstep is clamped and eases through endpoints', () => {
  assert.equal(R.smoothstep(-1), 0);
  assert.equal(R.smoothstep(0), 0);
  assert.equal(R.smoothstep(1), 1);
  assert.equal(R.smoothstep(2), 1);
  assert.equal(R.smoothstep(0.5), 0.5);
  // Eases in: below linear early, above linear late.
  assert.ok(R.smoothstep(0.25) < 0.25);
  assert.ok(R.smoothstep(0.75) > 0.75);
});

// ---- Difficulty -----------------------------------------------------------

test('scrollSpeedAt starts at min and ramps monotonically to max', () => {
  assert.equal(R.scrollSpeedAt(0), C.minScrollSpeed);
  assert.equal(R.scrollSpeedAt(1e9), C.maxScrollSpeed);
  let prev = C.minScrollSpeed;
  for (let d = 0; d <= 20000; d += 500) {
    const s = R.scrollSpeedAt(d);
    assert.ok(s >= prev, `speed dropped at distance ${d}`);
    assert.ok(s >= C.minScrollSpeed && s <= C.maxScrollSpeed);
    prev = s;
  }
});

test('spawnIntervalAt shrinks and is bounded', () => {
  assert.equal(R.spawnIntervalAt(0), C.spawnIntervalMax);
  assert.ok(Math.abs(R.spawnIntervalAt(1e9) - C.spawnIntervalMin) < 1e-9);
  assert.ok(R.spawnIntervalAt(5000) <= C.spawnIntervalMax);
  assert.ok(R.spawnIntervalAt(5000) >= C.spawnIntervalMin);
});

test('groupSizeAt stays within [1, lanes-1] for any distance and rng', () => {
  for (let d = 0; d <= 30000; d += 1000) {
    for (const rn of [() => 0.0, () => 0.99, () => 0.5]) {
      const g = R.groupSizeAt(d, rn);
      assert.ok(g >= 1 && g <= C.lanes - 1, `group ${g} out of range at ${d}`);
    }
  }
});

// ---- Geometry ------------------------------------------------------------

test('collides detects overlapping and separated boxes', () => {
  assert.ok(R.collides(0, 0, 10, 10, 5, 5, 10, 10));
  assert.ok(R.collides(0, 0, 10, 10, 0, 0, 10, 10));
  assert.ok(!R.collides(0, 0, 10, 10, 20, 20, 10, 10));
  assert.ok(!R.collides(0, 0, 10, 10, 10, 0, 10, 10)); // touching edges only
});

test('collides with shrink is forgiving for near-misses', () => {
  // Full boxes overlap ...
  assert.ok(R.collides(0, 0, 10, 10, 6, 0, 10, 10));
  // ... but shrunk hitboxes no longer touch, so the scrape is a near-miss.
  assert.ok(!R.collides(0, 0, 10, 10, 6, 0, 10, 10, 0.5));
  // A 2px gap is never a hit, shrunk or not.
  assert.ok(!R.collides(0, 0, 10, 10, 12, 0, 10, 10, 0.8));
});

test('laneCenterFraction and laneIndexForOffset are consistent', () => {
  const lanes = 4;
  for (let i = 0; i < lanes; i++) {
    const frac = R.laneCenterFraction(i, lanes);
    const idx = R.laneIndexForOffset(frac * 100, 100, lanes);
    assert.equal(idx, i);
  }
  assert.equal(R.laneIndexForOffset(-5, 100, 4), 0);   // off left -> clamp
  assert.equal(R.laneIndexForOffset(999, 100, 4), 3);  // off right -> clamp
});

// ---- Scoring --------------------------------------------------------------

test('scoreForDistance floors and never goes negative', () => {
  assert.equal(R.scoreForDistance(0), 0);
  assert.equal(R.scoreForDistance(100), 1);
  assert.equal(R.scoreForDistance(150), 1);
  assert.equal(R.scoreForDistance(-50), 0);
});

test('formatScore groups thousands', () => {
  assert.equal(R.formatScore(0), '0');
  assert.equal(R.formatScore(999), '999');
  assert.equal(R.formatScore(1000), '1,000');
  assert.equal(R.formatScore(1234567), '1,234,567');
  assert.equal(R.formatScore(-5), '0');
});

// ---- High score persistence ----------------------------------------------

function fakeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    _map: map
  };
}

test('sanitizeScore rejects junk and normalises', () => {
  assert.equal(R.sanitizeScore(42, 0), 42);
  assert.equal(R.sanitizeScore('42', 0), 42);
  assert.equal(R.sanitizeScore(42.9, 0), 42);
  assert.equal(R.sanitizeScore(-1, 0), 0);
  assert.equal(R.sanitizeScore(NaN, 0), 0);
  assert.equal(R.sanitizeScore(Infinity, 0), 0);
  assert.equal(R.sanitizeScore(undefined, 0), 0);
  assert.equal(R.sanitizeScore(null, 0), 0);
});

test('loadScore/saveScore round-trip and fall back safely', () => {
  const store = fakeStorage();
  assert.equal(R.loadScore(store, 'k', 10), 10); // missing -> fallback
  assert.ok(R.saveScore(store, 'k', 12345));
  assert.equal(R.loadScore(store, 'k', 10), 12345);

  const junk = fakeStorage({ k: 'not a number' });
  assert.equal(R.loadScore(junk, 'k', 7), 7);
});

test('loadScore tolerates a throwing storage (private browsing)', () => {
  const throwing = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); }
  };
  assert.equal(R.loadScore(throwing, 'k', 99), 99);
  assert.equal(R.loadFlag(throwing, 'k', true), true);
  assert.equal(R.saveScore(throwing, 'k', 5), false);
  assert.equal(R.saveFlag(throwing, 'k', true), false);
});

test('loadFlag/saveFlag store booleans', () => {
  const store = fakeStorage();
  assert.equal(R.loadFlag(store, 'k', false), false);
  R.saveFlag(store, 'k', true);
  assert.equal(R.loadFlag(store, 'k', false), true);
  R.saveFlag(store, 'k', false);
  assert.equal(R.loadFlag(store, 'k', true), false);
});

// ---- Fuel -----------------------------------------------------------------

test('fuel drains faster at higher speed and clamps to bounds', () => {
  const slow = R.fuelDrainPerSecond(C.minScrollSpeed);
  const fast = R.fuelDrainPerSecond(C.maxScrollSpeed);
  assert.ok(fast > slow);
  assert.equal(R.fuelAfter(100, 1000, C.maxScrollSpeed), 0); // drains fully
  assert.equal(R.fuelAfter(1, 1000, C.minScrollSpeed), 0);
  assert.ok(R.fuelAfter(100, 0.01, C.minScrollSpeed) < 100);
  assert.equal(R.fuelWithPickup(90), C.fuelMax); // caps at max
  assert.equal(R.fuelWithPickup(10), 10 + C.fuelPickupAmount);
});

// ---- Spawner --------------------------------------------------------------

test('spawner plan always leaves a free lane with distinct lanes', () => {
  const s = R.createSpawner(Math.random, 4);
  for (let i = 0; i < 500; i++) {
    const group = s.plan(1 + Math.floor(Math.random() * 5));
    assert.ok(group.length >= 1 && group.length <= 3);
    assert.equal(new Set(group).size, group.length); // no duplicates
    assert.ok(group.every((l) => l >= 0 && l < 4));
    // at least one lane is free
    const free = [0, 1, 2, 3].filter((l) => group.indexOf(l) === -1);
    assert.ok(free.length >= 1);
  }
});

test('spawner clamps oversized groups to lanes - 1', () => {
  const s = R.createSpawner(() => 0.5, 4);
  assert.equal(s.plan(99).length, 3);
  assert.equal(s.plan(1).length, 1);
});

test('spawner bias reuses the previous free lane most of the time', () => {
  // Deterministic rng: always < corridorBias, so the previous free lane is
  // always carried into the next batch when the batch leaves room for it.
  const s = R.createSpawner(() => 0.1, 4);
  const first = s.plan(2);
  const free1 = [0, 1, 2, 3].filter((l) => first.indexOf(l) === -1);
  const second = s.plan(2);
  assert.ok(free1.length === 2);
  const free2 = [0, 1, 2, 3].filter((l) => second.indexOf(l) === -1);
  // One of the two free lanes from batch 1 must carry over (bias pushed it in).
  assert.ok(free2.some((l) => free1.indexOf(l) !== -1));
});

// ---- Near miss ------------------------------------------------------------

function mkPlayer(x, y) {
  return { x, y, w: 40, h: 70 };
}
function mkCar(x, y, passed) {
  return { x, y, w: 40, h: 70, passedNearMiss: !!passed };
}

test('nearMissed only rewards cars that just passed close by', () => {
  // Car still ahead of the player -> no.
  assert.equal(R.nearMissed(mkPlayer(100, 500), mkCar(100, 400), 60), false);
  // Car passed, same lane -> yes.
  assert.equal(R.nearMissed(mkPlayer(100, 500), mkCar(100, 590), 60), true);
  // Car passed but far to the side -> no.
  assert.equal(R.nearMissed(mkPlayer(100, 500), mkCar(300, 590), 60), false);
  // Already rewarded -> no repeat.
  assert.equal(R.nearMissed(mkPlayer(100, 500), mkCar(100, 590, true), 60), false);
  // Boundary: exactly the reward distance still counts.
  assert.equal(R.nearMissed(mkPlayer(100, 500), mkCar(160, 590), 60), true);
});

// ---- Config completeness ---------------------------------------------------

test('CONFIG exposes every gameplay key the browser game depends on', () => {
  const required = [
    'lanes', 'roadWidth', 'playerCarWidth', 'playerCarHeight',
    'trafficCarWidth', 'trafficCarHeight', 'collisionShrink',
    'minScrollSpeed', 'maxScrollSpeed', 'speedRampDistance',
    'spawnIntervalMin', 'spawnIntervalMax', 'spawnRampDistance',
    'maxGroupSize', 'groupRampDistance', 'brakeMultiplier',
    'nearMissDistance', 'nearMissScore', 'fuelPickupScore',
    'fuelMax', 'fuelPickupAmount', 'fuelDrainBase', 'fuelDrainPerSpeed',
    'fuelPickupEvery', 'fuelLowThreshold', 'lives', 'invincibleTime',
    'scorePerPixel', 'speedToKmh', 'highScoreKey', 'muteKey'
  ];
  for (const key of required) {
    assert.ok(key in C, `CONFIG is missing "${key}"`);
    if (typeof C[key] === 'number') {
      assert.ok(Number.isFinite(C[key]), `CONFIG["${key}"] must be finite`);
    }
  }
});
