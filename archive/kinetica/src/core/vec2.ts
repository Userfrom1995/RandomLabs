export type Vec2 = { x: number; y: number };

export function vec(x: number, y: number): Vec2 { return { x, y }; }
export function vAdd(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y }; }
export function vSub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; }
export function vScale(v: Vec2, s: number): Vec2 { return { x: v.x * s, y: v.y * s }; }
export function vDot(a: Vec2, b: Vec2): number { return a.x * b.x + a.y * b.y; }
export function vCross(a: Vec2, b: Vec2): number { return a.x * b.y - a.y * b.x; }
export function vCrossSV(s: number, v: Vec2): Vec2 { return { x: -s * v.y, y: s * v.x }; }
export function vCrossVS(v: Vec2, s: number): Vec2 { return { x: s * v.y, y: -s * v.x }; }
export function vLength(v: Vec2): number { return Math.sqrt(v.x * v.x + v.y * v.y); }
export function vLengthSq(v: Vec2): number { return v.x * v.x + v.y * v.y; }
export function vNormalize(v: Vec2): Vec2 {
  const len = vLength(v);
  if (len < 1e-12) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}
export function vPerp(v: Vec2): Vec2 { return { x: -v.y, y: v.x }; }
export function vNeg(v: Vec2): Vec2 { return { x: -v.x, y: -v.y }; }
export function vLerp(a: Vec2, b: Vec2, t: number): Vec2 { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
export function vRotate(v: Vec2, cos: number, sin: number): Vec2 {
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}
export function vEqual(a: Vec2, b: Vec2, eps = 1e-9): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}
export function vClone(v: Vec2): Vec2 { return { x: v.x, y: v.y }; }
