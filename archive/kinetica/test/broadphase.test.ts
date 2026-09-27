import { describe, it, expect } from 'vitest';
import { sweepAndPrune } from '../src/collision/broadphase.js';
import { createBody, resetBodyIdCounter } from '../src/core/body.js';
import { createBox } from '../src/core/shapes.js';

describe('broadphase', () => {
  it('finds overlapping pairs deterministically', () => {
    resetBodyIdCounter();
    const a = createBody({ shape: createBox(0.5, 0.5), p: { x: 0, y: 0 } });
    const b = createBody({ shape: createBox(0.5, 0.5), p: { x: 0.5, y: 0 } });
    const c = createBody({ shape: createBox(0.5, 0.5), p: { x: 10, y: 10 } });
    const pairs = sweepAndPrune([a, b, c]);
    expect(pairs).toEqual([[a.id, b.id]]);
    // order stable after shuffle
    const pairs2 = sweepAndPrune([c, b, a]);
    expect(pairs2).toEqual([[a.id, b.id]]);
  });
  it('no dupes and sorted', () => {
    resetBodyIdCounter();
    const bodies = [];
    for (let i = 0; i < 5; i++) bodies.push(createBody({ shape: createBox(0.5, 0.5), p: { x: i * 0.8, y: 0 } }));
    const pairs = sweepAndPrune(bodies as any);
    const keys = pairs.map(([a, b]) => `${a}-${b}`);
    expect(new Set(keys).size).toBe(keys.length);
    // sorted
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i]![0] >= pairs[i - 1]![0]).toBeTruthy();
    }
  });
});
