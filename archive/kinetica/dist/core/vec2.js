export function vec(x, y) { return { x, y }; }
export function vAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
export function vSub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
export function vScale(v, s) { return { x: v.x * s, y: v.y * s }; }
export function vDot(a, b) { return a.x * b.x + a.y * b.y; }
export function vCross(a, b) { return a.x * b.y - a.y * b.x; }
export function vCrossSV(s, v) { return { x: -s * v.y, y: s * v.x }; }
export function vCrossVS(v, s) { return { x: s * v.y, y: -s * v.x }; }
export function vLength(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
export function vLengthSq(v) { return v.x * v.x + v.y * v.y; }
export function vNormalize(v) {
    const len = vLength(v);
    if (len < 1e-12)
        return { x: 1, y: 0 };
    return { x: v.x / len, y: v.y / len };
}
export function vPerp(v) { return { x: -v.y, y: v.x }; }
export function vNeg(v) { return { x: -v.x, y: -v.y }; }
export function vLerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
export function vRotate(v, cos, sin) {
    return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}
export function vEqual(a, b, eps = 1e-9) {
    return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}
export function vClone(v) { return { x: v.x, y: v.y }; }
//# sourceMappingURL=vec2.js.map