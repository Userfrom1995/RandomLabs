import { vSub, vDot, vCross, vLength, vNormalize } from '../core/vec2.js';
export function createRevoluteJoint(A, B, worldAnchor, bodies) {
    const bA = bodies.find(b => b.id === A), bB = bodies.find(b => b.id === B);
    const ca = Math.cos(bA.q), sa = Math.sin(bA.q);
    const cb = Math.cos(bB.q), sb = Math.sin(bB.q);
    // local = R^T (worldAnchor - p)
    const dA = vSub(worldAnchor, bA.p);
    const dB = vSub(worldAnchor, bB.p);
    const localA = { x: dA.x * ca + dA.y * sa, y: -dA.x * sa + dA.y * ca };
    const localB = { x: dB.x * cb + dB.y * sb, y: -dB.x * sb + dB.y * cb };
    return { kind: 'revolute', A, B, localAnchorA: localA, localAnchorB: localB, accImpulses: [0, 0] };
}
export function createDistanceJoint(A, B, anchorA, anchorB, bodies) {
    const bA = bodies.find(b => b.id === A), bB = bodies.find(b => b.id === B);
    const ca = Math.cos(bA.q), sa = Math.sin(bA.q);
    const cb = Math.cos(bB.q), sb = Math.sin(bB.q);
    const dA = vSub(anchorA, bA.p);
    const dB = vSub(anchorB, bB.p);
    const localA = { x: dA.x * ca + dA.y * sa, y: -dA.x * sa + dA.y * ca };
    const localB = { x: dB.x * cb + dB.y * sb, y: -dB.x * sb + dB.y * cb };
    const len = Math.sqrt((anchorB.x - anchorA.x) ** 2 + (anchorB.y - anchorA.y) ** 2);
    return { kind: 'distance', A, B, localAnchorA: localA, localAnchorB: localB, length: len, accImpulses: [0] };
}
export function createPrismaticJoint(A, B, worldAnchor, axis, bodies) {
    const bA = bodies.find(b => b.id === A), bB = bodies.find(b => b.id === B);
    const ca = Math.cos(bA.q), sa = Math.sin(bA.q);
    const cb = Math.cos(bB.q), sb = Math.sin(bB.q);
    const dA = vSub(worldAnchor, bA.p);
    const dB = vSub(worldAnchor, bB.p);
    const localA = { x: dA.x * ca + dA.y * sa, y: -dA.x * sa + dA.y * ca };
    const localB = { x: dB.x * cb + dB.y * sb, y: -dB.x * sb + dB.y * cb };
    const axisN = vNormalize(axis);
    // axis in local A
    const localAxis = { x: axisN.x * ca + axisN.y * sa, y: -axisN.x * sa + axisN.y * ca };
    return { kind: 'prismatic', A, B, localAnchorA: localA, localAnchorB: localB, axis: localAxis, accImpulses: [0, 0] };
}
export function solveJoint(joint, bodies) {
    const bA = bodies.find(b => b.id === joint.A);
    const bB = bodies.find(b => b.id === joint.B);
    if (!bA || !bB)
        return;
    if (joint.kind === 'revolute')
        solveRevolute(joint, bA, bB);
    else if (joint.kind === 'distance')
        solveDistance(joint, bA, bB);
    else if (joint.kind === 'prismatic')
        solvePrismatic(joint, bA, bB);
}
function worldAnchor(body, local) {
    const c = Math.cos(body.q), s = Math.sin(body.q);
    return { x: body.p.x + local.x * c - local.y * s, y: body.p.y + local.x * s + local.y * c };
}
function worldVector(body, local) {
    const c = Math.cos(body.q), s = Math.sin(body.q);
    return { x: local.x * c - local.y * s, y: local.x * s + local.y * c };
}
function solveRevolute(j, A, B) {
    const rA = vSub(worldAnchor(A, j.localAnchorA), A.p);
    const rB = vSub(worldAnchor(B, j.localAnchorB), B.p);
    // relative velocity at anchors: dv = (vB + wB x rB) - (vA + wA x rA)
    const vA = { x: A.v.x - A.w * rA.y, y: A.v.y + A.w * rA.x };
    const vB = { x: B.v.x - B.w * rB.y, y: B.v.y + B.w * rB.x };
    const dv = vSub(vB, vA);
    // solve two axes: x and y independently (simplified, ignores coupling)
    for (let axis = 0; axis < 2; axis++) {
        const n = axis === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 };
        const rnA = vCross(rA, n);
        const rnB = vCross(rB, n);
        const k = A.invMass + B.invMass + A.invI * rnA * rnA + B.invI * rnB * rnB;
        const mass = k > 1e-9 ? 1 / k : 0;
        const vn = vDot(dv, n);
        const dImp = mass * (-vn);
        const old = j.accImpulses[axis] ?? 0;
        const next = old + dImp;
        const delta = next - old;
        j.accImpulses[axis] = next;
        const imp = { x: n.x * delta, y: n.y * delta };
        if (!A.isStatic) {
            A.v.x -= imp.x * A.invMass;
            A.v.y -= imp.y * A.invMass;
            A.w -= A.invI * vCross(rA, imp);
        }
        if (!B.isStatic) {
            B.v.x += imp.x * B.invMass;
            B.v.y += imp.y * B.invMass;
            B.w += B.invI * vCross(rB, imp);
        }
        // update dv for next axis (approx)
        // recompute would be more accurate but this incremental is okay for now
    }
}
function solveDistance(j, A, B) {
    const worldA = worldAnchor(A, j.localAnchorA);
    const worldB = worldAnchor(B, j.localAnchorB);
    const d = vSub(worldB, worldA);
    const len = vLength(d);
    if (len < 1e-9)
        return;
    const n = { x: d.x / len, y: d.y / len };
    const rA = vSub(worldA, A.p);
    const rB = vSub(worldB, B.p);
    const vA = { x: A.v.x - A.w * rA.y, y: A.v.y + A.w * rA.x };
    const vB = { x: B.v.x - B.w * rB.y, y: B.v.y + B.w * rB.x };
    const dv = vSub(vB, vA);
    const vn = vDot(dv, n);
    const rnA = vCross(rA, n);
    const rnB = vCross(rB, n);
    const k = A.invMass + B.invMass + A.invI * rnA * rnA + B.invI * rnB * rnB;
    const mass = k > 1e-9 ? 1 / k : 0;
    // position bias for distance constraint (Baumgarte-like): keep length = j.length
    const posError = len - j.length;
    const bias = 0.1 * posError; // simple bias
    const dImp = mass * (-vn - bias);
    const old = j.accImpulses[0] ?? 0;
    // optional limits: if min/max set, clamp accumulated
    let next = old + dImp;
    // we treat distance as bilateral unless limits specified
    const delta = next - old;
    j.accImpulses[0] = next;
    const imp = { x: n.x * delta, y: n.y * delta };
    if (!A.isStatic) {
        A.v.x -= imp.x * A.invMass;
        A.v.y -= imp.y * A.invMass;
        A.w -= A.invI * vCross(rA, imp);
    }
    if (!B.isStatic) {
        B.v.x += imp.x * B.invMass;
        B.v.y += imp.y * B.invMass;
        B.w += B.invI * vCross(rB, imp);
    }
}
function solvePrismatic(j, A, B) {
    const worldA = worldAnchor(A, j.localAnchorA);
    const worldB = worldAnchor(B, j.localAnchorB);
    const axis = worldVector(A, j.axis);
    const perp = { x: -axis.y, y: axis.x };
    const rA = vSub(worldA, A.p);
    const rB = vSub(worldB, B.p);
    // error vector between anchors
    const err = vSub(worldB, worldA);
    // constrain perpendicular distance and relative angle
    // Row 1: perpendicular translation
    {
        const n = perp;
        const rnA = vCross(rA, n);
        const rnB = vCross(rB, n);
        const k = A.invMass + B.invMass + A.invI * rnA * rnA + B.invI * rnB * rnB;
        const mass = k > 1e-9 ? 1 / k : 0;
        const vA = { x: A.v.x - A.w * rA.y, y: A.v.y + A.w * rA.x };
        const vB = { x: B.v.x - B.w * rB.y, y: B.v.y + B.w * rB.x };
        const vn = vDot(vSub(vB, vA), n);
        const bias = 0.1 * vDot(err, n);
        const dImp = mass * (-vn - bias);
        const old = j.accImpulses[0] ?? 0;
        const next = old + dImp;
        const delta = next - old;
        j.accImpulses[0] = next;
        const imp = { x: n.x * delta, y: n.y * delta };
        if (!A.isStatic) {
            A.v.x -= imp.x * A.invMass;
            A.v.y -= imp.y * A.invMass;
            A.w -= A.invI * vCross(rA, imp);
        }
        if (!B.isStatic) {
            B.v.x += imp.x * B.invMass;
            B.v.y += imp.y * B.invMass;
            B.w += B.invI * vCross(rB, imp);
        }
    }
    // Row 2: angular lock (relative angle zero)
    {
        const dw = B.w - A.w;
        const k = A.invI + B.invI;
        const mass = k > 1e-9 ? 1 / k : 0;
        const bias = 0.1 * (B.q - A.q);
        const dImp = mass * (-dw - bias);
        const old = j.accImpulses[1] ?? 0;
        const next = old + dImp;
        const delta = next - old;
        j.accImpulses[1] = next;
        if (!A.isStatic)
            A.w -= delta * A.invI;
        if (!B.isStatic)
            B.w += delta * B.invI;
    }
}
//# sourceMappingURL=joints.js.map