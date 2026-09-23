// Umbra M5: combat VFX model (src/vfx.js) and haptic map (src/input/haptics.js).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  burstsFor,
  sparkPoints,
  slowMoFor,
  SLOWMO_TICKS,
  BURST_LIFE,
} from '../src/vfx.js';
import {
  HAPTIC_PATTERNS,
  patternFor,
  shouldPlayHaptic,
} from '../src/input/haptics.js';

describe('vfx constants', () => {
  it('BURST_LIFE is 18 and SLOWMO_TICKS is 45', () => {
    assert.equal(BURST_LIFE, 18);
    assert.equal(SLOWMO_TICKS, 45);
  });
});

describe('burstsFor', () => {
  it('empty event log yields no bursts', () => {
    assert.deepEqual(burstsFor([], 100), []);
  });
  it('non-array input yields no bursts', () => {
    assert.deepEqual(burstsFor(null, 100), []);
    assert.deepEqual(burstsFor(undefined, 100), []);
  });
  it('unknown event types are ignored', () => {
    const events = [
      { t: 'jump', tick: 100 },
      { t: 'dash', tick: 100 },
      { t: 'whiff', tick: 100 },
      { t: '', tick: 100 },
    ];
    assert.deepEqual(burstsFor(events, 100), []);
  });
  it('hit produces a spark at the contact point', () => {
    const out = burstsFor([{ t: 'hit', tick: 100, x: 0.3, y: 0.7 }], 100);
    assert.equal(out.length, 1);
    assert.equal(out[0].kind, 'spark');
    assert.equal(out[0].x, 0.3);
    assert.equal(out[0].y, 0.7);
    assert.equal(out[0].age, 0);
    assert.equal(out[0].life, BURST_LIFE);
    assert.ok(Number.isFinite(out[0].n) && out[0].n > 0);
    assert.ok(Number.isFinite(out[0].seed));
  });
  it('parried produces a spark', () => {
    const out = burstsFor([{ t: 'parried', tick: 50, x: -0.2, y: 0.5 }], 50);
    assert.equal(out.length, 1);
    assert.equal(out[0].kind, 'spark');
  });
  it('block produces a ring', () => {
    const out = burstsFor([{ t: 'block', tick: 50, x: 0.1, y: 0.4 }], 50);
    assert.equal(out.length, 1);
    assert.equal(out[0].kind, 'ring');
  });
  it('ko produces dust plus ring', () => {
    const out = burstsFor([{ t: 'ko', tick: 50, x: 0, y: 0.3 }], 50);
    assert.equal(out.length, 2);
    assert.deepEqual(out.map((b) => b.kind), ['dust', 'ring']);
  });
  it('round produces dust plus ring', () => {
    const out = burstsFor([{ t: 'round', tick: 50 }], 50);
    assert.equal(out.length, 2);
    assert.deepEqual(out.map((b) => b.kind), ['dust', 'ring']);
  });
  it('finite coords clamp to the arena box x[-1,1] y[0,1.2]', () => {
    const out = burstsFor(
      [
        { t: 'hit', tick: 10, x: 5, y: -2 },
        { t: 'hit', tick: 10, x: -5, y: 9 },
      ],
      10,
    );
    assert.equal(out[0].x, 1);
    assert.equal(out[0].y, 0);
    assert.equal(out[1].x, -1);
    assert.equal(out[1].y, 1.2);
  });
  it('missing coords fall back to a finite in-box default', () => {
    const out = burstsFor([{ t: 'hit', tick: 10 }], 10);
    assert.equal(out.length, 1);
    assert.ok(Number.isFinite(out[0].x) && Number.isFinite(out[0].y));
    assert.ok(out[0].x >= -1 && out[0].x <= 1);
    assert.ok(out[0].y >= 0 && out[0].y <= 1.2);
  });
  it('caps at 12 bursts', () => {
    const events = [];
    for (let i = 0; i < 20; i++) events.push({ t: 'hit', tick: 100, x: 0, y: 0.5 });
    const out = burstsFor(events, 100);
    assert.equal(out.length, 12);
  });
  it('events older than 18 ticks expire', () => {
    const events = [{ t: 'hit', tick: 100, x: 0, y: 0.5 }];
    assert.equal(burstsFor(events, 118).length, 1);
    assert.deepEqual(burstsFor(events, 119), []);
  });
  it('future events are ignored', () => {
    assert.deepEqual(burstsFor([{ t: 'hit', tick: 120, x: 0, y: 0.5 }], 100), []);
  });
  it('identical input yields identical output', () => {
    const events = [
      { t: 'hit', tick: 90, x: 0.2, y: 0.6 },
      { t: 'block', tick: 95, x: -0.1, y: 0.5 },
      { t: 'ko', tick: 99, x: 0, y: 0.3 },
    ];
    assert.deepEqual(burstsFor(events, 100), burstsFor(events, 100));
    assert.equal(
      JSON.stringify(burstsFor(events, 100)),
      JSON.stringify(burstsFor(structuredClone(events), 100)),
    );
  });
});

describe('sparkPoints', () => {
  it('emits exactly burst.n points', () => {
    const b = burstsFor([{ t: 'hit', tick: 100, x: 0, y: 0.5 }], 100)[0];
    const pts = sparkPoints(b, 100);
    assert.equal(pts.length, b.n);
  });
  it('alpha stays within 0..1 with linear fade', () => {
    const fresh = { kind: 'spark', x: 0, y: 0.5, age: 0, life: 18, n: 12, seed: 7 };
    const mid = { ...fresh, age: 9 };
    const done = { ...fresh, age: 18 };
    const aFresh = sparkPoints(fresh, 0)[0].a;
    const aMid = sparkPoints(mid, 0)[0].a;
    const aDone = sparkPoints(done, 0)[0].a;
    assert.equal(aFresh, 1);
    assert.ok(Math.abs(aMid - 0.5) < 1e-12);
    assert.equal(aDone, 0);
    for (const p of [...sparkPoints(fresh, 0), ...sparkPoints(mid, 0)]) {
      assert.ok(p.a >= 0 && p.a <= 1);
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    }
  });
  it('fresh bursts sit at the origin and aged bursts radiate outward', () => {
    const fresh = { kind: 'spark', x: 0.2, y: 0.5, age: 0, life: 18, n: 12, seed: 42 };
    for (const p of sparkPoints(fresh, 0)) {
      assert.equal(p.x, 0.2);
      assert.equal(p.y, 0.5);
    }
    const aged = { ...fresh, age: 18 };
    const pts = sparkPoints(aged, 0);
    assert.ok(pts.some((p) => Math.hypot(p.x - 0.2, p.y - 0.5) > 0.01));
  });
  it('deterministic for identical input', () => {
    const b = { kind: 'dust', x: 0, y: 0.4, age: 5, life: 18, n: 10, seed: 99 };
    assert.deepEqual(sparkPoints(b, 120), sparkPoints(b, 120));
  });
});

describe('slowMoFor', () => {
  it('returns 0.25 for the 45 ticks after a ko', () => {
    const events = [{ t: 'ko', tick: 100 }];
    assert.equal(slowMoFor(events, 100), 0.25);
    assert.equal(slowMoFor(events, 144), 0.25);
  });
  it('returns 1 once the window closes or before the ko', () => {
    const events = [{ t: 'ko', tick: 100 }];
    assert.equal(slowMoFor(events, 145), 1);
    assert.equal(slowMoFor(events, 99), 1);
  });
  it('returns 1 without events or without a ko', () => {
    assert.equal(slowMoFor([], 100), 1);
    assert.equal(slowMoFor([{ t: 'hit', tick: 100 }], 100), 1);
    assert.equal(slowMoFor([{ t: 'round', tick: 100 }], 100), 1);
    assert.equal(slowMoFor(null, 100), 1);
  });
});

describe('haptics', () => {
  it('pattern map carries the specified patterns', () => {
    assert.deepEqual(HAPTIC_PATTERNS.hit, [15]);
    assert.deepEqual(HAPTIC_PATTERNS.block, [10]);
    assert.deepEqual(HAPTIC_PATTERNS.parried, [10, 40, 20]);
    assert.deepEqual(HAPTIC_PATTERNS.ko, [40, 60, 40]);
    assert.deepEqual(HAPTIC_PATTERNS.whiff, [0]);
    assert.deepEqual(HAPTIC_PATTERNS.ui, [8]);
  });
  it('patternFor resolves every known kind', () => {
    for (const [kind, want] of Object.entries(HAPTIC_PATTERNS)) {
      assert.deepEqual(patternFor(kind), want, kind);
    }
  });
  it('patternFor falls back to [8] for unknown types', () => {
    assert.deepEqual(patternFor('hadouken'), [8]);
    assert.deepEqual(patternFor(undefined), [8]);
    assert.deepEqual(patternFor(null), [8]);
  });
  it('patternFor returns a copy that cannot mutate the map', () => {
    const p = patternFor('hit');
    p.push(999);
    assert.deepEqual(HAPTIC_PATTERNS.hit, [15]);
  });
  it('throttle enforces a 90 ms same-kind gap', () => {
    assert.equal(shouldPlayHaptic('hit', null, 1000), true);
    assert.equal(shouldPlayHaptic('hit', 1000, 1089), false);
    assert.equal(shouldPlayHaptic('hit', 1000, 1090), true);
    assert.equal(shouldPlayHaptic('hit', 1000, 1200), true);
  });
  it('ko and round bypass the throttle', () => {
    assert.equal(shouldPlayHaptic('ko', 1000, 1001), true);
    assert.equal(shouldPlayHaptic('round', 1000, 1001), true);
    assert.equal(shouldPlayHaptic('ko', 1000, 1000), true);
  });
});
