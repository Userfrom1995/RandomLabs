import { vDot, vSub, vCross } from '../core/vec2.js';
export function solveVelocity(manifold, A, B, beta, slop, restThreshold, dt) {
    const n = manifold.normal;
    const t = { x: -n.y, y: n.x };
    for (const cp of manifold.points) {
        const rA = { x: cp.point.x - A.p.x, y: cp.point.y - A.p.y };
        const rB = { x: cp.point.x - B.p.x, y: cp.point.y - B.p.y };
        // relative velocity at contact
        const vA = { x: A.v.x + (-A.w * rA.y), y: A.v.y + (A.w * rA.x) };
        const vB = { x: B.v.x + (-B.w * rB.y), y: B.v.y + (B.w * rB.x) };
        const dv = vSub(vB, vA);
        // effective mass normal
        const rnA = vCross(rA, n);
        const rnB = vCross(rB, n);
        const kn = A.invMass + B.invMass + A.invI * rnA * rnA + B.invI * rnB * rnB;
        const massN = kn > 1e-9 ? 1 / kn : 0;
        // Baumgarte bias
        const bias = (beta / dt) * Math.max(cp.penetration - slop, 0);
        // restitution
        const vn = vDot(dv, n);
        let restitutionBias = 0;
        const e = Math.max(A.restitution, B.restitution);
        if (vn < -restThreshold)
            restitutionBias = -e * vn;
        // normal impulse
        const dPn = massN * (-vn + bias + restitutionBias);
        const oldPn = cp.Pn;
        cp.Pn = Math.max(oldPn + dPn, 0);
        const deltaPn = cp.Pn - oldPn;
        const impulseN = { x: n.x * deltaPn, y: n.y * deltaPn };
        if (!A.isStatic) {
            A.v.x -= impulseN.x * A.invMass;
            A.v.y -= impulseN.y * A.invMass;
            A.w -= A.invI * vCross(rA, impulseN);
        }
        if (!B.isStatic) {
            B.v.x += impulseN.x * B.invMass;
            B.v.y += impulseN.y * B.invMass;
            B.w += B.invI * vCross(rB, impulseN);
        }
        // recompute relative velocity after normal impulse for friction
        const vA2 = { x: A.v.x + (-A.w * rA.y), y: A.v.y + (A.w * rA.x) };
        const vB2 = { x: B.v.x + (-B.w * rB.y), y: B.v.y + (B.w * rB.x) };
        const dv2 = vSub(vB2, vA2);
        const vt = vDot(dv2, t);
        const rtA = vCross(rA, t);
        const rtB = vCross(rB, t);
        const kt = A.invMass + B.invMass + A.invI * rtA * rtA + B.invI * rtB * rtB;
        const massT = kt > 1e-9 ? 1 / kt : 0;
        const mu = Math.sqrt(Math.max(0, A.friction) * Math.max(0, B.friction));
        const maxPt = mu * cp.Pn;
        const dPt = massT * (-vt);
        const oldPt = cp.Pt;
        let newPt = oldPt + dPt;
        newPt = Math.max(-maxPt, Math.min(maxPt, newPt));
        const deltaPt = newPt - oldPt;
        cp.Pt = newPt;
        const impulseT = { x: t.x * deltaPt, y: t.y * deltaPt };
        if (!A.isStatic) {
            A.v.x -= impulseT.x * A.invMass;
            A.v.y -= impulseT.y * A.invMass;
            A.w -= A.invI * vCross(rA, impulseT);
        }
        if (!B.isStatic) {
            B.v.x += impulseT.x * B.invMass;
            B.v.y += impulseT.y * B.invMass;
            B.w += B.invI * vCross(rB, impulseT);
        }
    }
}
//# sourceMappingURL=sequentialImpulse.js.map