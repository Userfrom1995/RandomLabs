import { computeCircleMass, computePolygonMass, updateWorldVerts } from './shapes.js';
let nextId = 1;
export function resetBodyIdCounter() { nextId = 1; }
export function allocBodyId() { return nextId++; }
export function createBody(def) {
    const p = def.p ?? { x: 0, y: 0 };
    const q = def.q ?? 0;
    const v = def.v ?? { x: 0, y: 0 };
    const w = def.w ?? 0;
    const isStatic = !!def.isStatic;
    const friction = def.friction ?? 0.4;
    const restitution = def.restitution ?? 0.0;
    const density = def.density ?? 1;
    let mass = 0, invMass = 0, inertia = 0, invI = 0;
    if (!isStatic) {
        if (def.shape.kind === 'circle') {
            const md = computeCircleMass(def.shape.radius, density);
            mass = md.mass;
            invMass = md.invMass;
            inertia = md.inertia;
            invI = md.invI;
        }
        else {
            const md = computePolygonMass(def.shape.localVerts, density);
            mass = md.mass;
            invMass = md.invMass;
            inertia = md.inertia;
            invI = md.invI;
        }
    }
    const id = allocBodyId();
    if (def.shape.kind === 'polygon') {
        updateWorldVerts(def.shape, p, q);
    }
    return {
        id, p: { ...p }, q, v: { ...v }, w,
        invMass, invI, mass, inertia,
        shape: def.shape,
        friction, restitution,
        isStatic,
        sleeping: false, sleepTimer: 0,
        f: { x: 0, y: 0 }, tau: 0
    };
}
export function bodyApplyForce(body, force) {
    if (body.isStatic || body.sleeping) {
        body.sleeping = false;
        body.sleepTimer = 0;
    }
    body.f.x += force.x;
    body.f.y += force.y;
}
export function bodyApplyTorque(body, torque) {
    if (body.isStatic || body.sleeping) {
        body.sleeping = false;
        body.sleepTimer = 0;
    }
    body.tau += torque;
}
export function bodyApplyImpulse(body, impulse, r) {
    if (body.isStatic)
        return;
    if (body.sleeping) {
        body.sleeping = false;
        body.sleepTimer = 0;
    }
    body.v.x += impulse.x * body.invMass;
    body.v.y += impulse.y * body.invMass;
    if (r)
        body.w += body.invI * (r.x * impulse.y - r.y * impulse.x);
}
//# sourceMappingURL=body.js.map