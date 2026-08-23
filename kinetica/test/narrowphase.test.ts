import { describe, it, expect } from 'vitest';
import { createBody, resetBodyIdCounter } from '../src/core/body.js';
import { createBox } from '../src/core/shapes.js';
import { collide } from '../src/collision/narrowphase.js';
import { updateWorldVerts } from '../src/core/shapes.js';

describe('narrowphase', () => {
  it('circle-circle contact normal and penetration', () => {
    resetBodyIdCounter();
    const a = createBody({ shape: { kind: 'circle', radius: 1 }, p: { x: 0, y: 0 } });
    const b = createBody({ shape: { kind: 'circle', radius: 1 }, p: { x: 1.5, y: 0 } });
    const m = collide(a, b)!;
    expect(m).not.toBeNull();
    expect(m.normal.x).toBeCloseTo(1, 6);
    expect(m.points[0]!.penetration).toBeCloseTo(0.5, 6);
  });
  it('circle-circle no contact', () => {
    resetBodyIdCounter();
    const a = createBody({ shape: { kind: 'circle', radius: 1 }, p: { x: 0, y: 0 } });
    const b = createBody({ shape: { kind: 'circle', radius: 1 }, p: { x: 5, y: 0 } });
    expect(collide(a, b)).toBeNull();
  });
  it('polygon-polygon face-face yields manifold', () => {
    resetBodyIdCounter();
    const boxA = createBox(0.5, 0.5);
    const boxB = createBox(0.5, 0.5);
    const a = createBody({ shape: boxA, p: { x: 0, y: 0 } });
    const b = createBody({ shape: boxB, p: { x: 0, y: 0.9 } });
    updateWorldVerts(boxA, a.p, a.q);
    updateWorldVerts(boxB, b.p, b.q);
    const m = collide(a, b);
    expect(m).not.toBeNull();
    expect(m!.points.length).toBeGreaterThanOrEqual(1);
    // normal should be roughly up (A->B)
    expect(m!.normal.y).toBeGreaterThan(0.5);
  });
  it('circle-polygon inside case', () => {
    resetBodyIdCounter();
    const poly = createBox(1, 1);
    const a = createBody({ shape: poly, p: { x: 0, y: 0 } });
    const b = createBody({ shape: { kind: 'circle', radius: 0.2 }, p: { x: 0, y: 0 } });
    const m = collide(a, b);
    expect(m).not.toBeNull();
  });
});
