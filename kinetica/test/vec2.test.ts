import { describe, it, expect } from 'vitest';
import { vec, vAdd, vSub, vDot, vCross, vLength, vNormalize, vPerp, vRotate } from '../src/core/vec2.js';

describe('vec2', () => {
  it('add/sub/dot', () => {
    const a = vec(1, 2), b = vec(3, 4);
    expect(vAdd(a, b)).toEqual({ x: 4, y: 6 });
    expect(vSub(b, a)).toEqual({ x: 2, y: 2 });
    expect(vDot(a, b)).toBe(11);
  });
  it('cross/perp', () => {
    expect(vCross(vec(1, 0), vec(0, 1))).toBe(1);
    const pr = vPerp(vec(1, 0));
    expect(pr.x).toBeCloseTo(0, 9);
    expect(pr.y).toBeCloseTo(1, 9);
  });
  it('length/normalize', () => {
    expect(vLength(vec(3, 4))).toBe(5);
    const n = vNormalize(vec(3, 4));
    expect(n.x).toBeCloseTo(0.6, 9);
    expect(n.y).toBeCloseTo(0.8, 9);
    expect(vLength(n)).toBeCloseTo(1, 9);
  });
  it('normalize zero gives (1,0)', () => {
    expect(vNormalize(vec(0, 0))).toEqual({ x: 1, y: 0 });
  });
  it('rotate 90deg', () => {
    const v = vec(1, 0);
    const r = vRotate(v, 0, 1);
    expect(r.x).toBeCloseTo(0, 9);
    expect(r.y).toBeCloseTo(1, 9);
  });
});
