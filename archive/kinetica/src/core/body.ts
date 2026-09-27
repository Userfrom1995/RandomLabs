import type { Vec2 } from './vec2.js';
import type { Shape } from './shapes.js';
import { computeCircleMass, computePolygonMass, updateWorldVerts } from './shapes.js';

export type BodyType = 'dynamic' | 'static' | 'kinematic';

export interface Body {
  id: number;
  p: Vec2;
  q: number;
  v: Vec2;
  w: number;
  invMass: number;
  invI: number;
  mass: number;
  inertia: number;
  shape: Shape;
  friction: number;
  restitution: number;
  isStatic: boolean;
  sleeping: boolean;
  sleepTimer: number;
  f: Vec2;
  tau: number;
}

let nextId = 1;
export function resetBodyIdCounter(): void { nextId = 1; }
export function allocBodyId(): number { return nextId++; }

export interface BodyDef {
  shape: Shape;
  p?: Vec2;
  q?: number;
  v?: Vec2;
  w?: number;
  density?: number;
  isStatic?: boolean;
  friction?: number;
  restitution?: number;
}

export function createBody(def: BodyDef): Body {
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
      mass = md.mass; invMass = md.invMass; inertia = md.inertia; invI = md.invI;
    } else {
      const md = computePolygonMass(def.shape.localVerts, density);
      mass = md.mass; invMass = md.invMass; inertia = md.inertia; invI = md.invI;
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

export function bodyApplyForce(body: Body, force: Vec2): void {
  if (body.isStatic || body.sleeping) { body.sleeping = false; body.sleepTimer = 0; }
  body.f.x += force.x; body.f.y += force.y;
}
export function bodyApplyTorque(body: Body, torque: number): void {
  if (body.isStatic || body.sleeping) { body.sleeping = false; body.sleepTimer = 0; }
  body.tau += torque;
}
export function bodyApplyImpulse(body: Body, impulse: Vec2, r?: Vec2): void {
  if (body.isStatic) return;
  if (body.sleeping) { body.sleeping = false; body.sleepTimer = 0; }
  body.v.x += impulse.x * body.invMass;
  body.v.y += impulse.y * body.invMass;
  if (r) body.w += body.invI * (r.x * impulse.y - r.y * impulse.x);
}
