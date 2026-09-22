// Umbra M1: rng determinism (mulberry32 is the sim's only RNG).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashStr, mulberry32, hash01, frac } from '../src/rng.js';

describe('mulberry32', () => {
  it('same seed yields identical sequences', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    for (let i = 0; i < 50; i++) assert.equal(a(), b());
  });
  it('different seeds diverge', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seq = (g) => Array.from({ length: 10 }, () => g());
    assert.notDeepEqual(seq(a), seq(b));
  });
  it('outputs stay in [0, 1)', () => {
    const g = mulberry32(0xdeadbeef);
    for (let i = 0; i < 1000; i++) {
      const v = g();
      assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
    }
  });
  it('seed 375 first value is pinned', () => {
    assert.equal(mulberry32(375)().toFixed(10), '0.2971441925');
  });
});

describe('hash helpers', () => {
  it('hashStr is stable and 32-bit', () => {
    assert.equal(hashStr('umbra-mote'), hashStr('umbra-mote'));
    assert.ok(hashStr('umbra-mote') <= 0xffffffff);
    assert.notEqual(hashStr('a'), hashStr('b'));
  });
  it('hash01 stays in [0, 1) and is coordinate-sensitive', () => {
    assert.ok(hash01(375, 1, 2) >= 0 && hash01(375, 1, 2) < 1);
    assert.notEqual(hash01(0, 0, 1), hash01(0, 0, 2));
  });
  it('frac wraps negatives into [0, 1)', () => {
    assert.equal(frac(1.7), 0.7);
    assert.ok(Math.abs(frac(-0.3) - 0.7) < 1e-12);
  });
});
