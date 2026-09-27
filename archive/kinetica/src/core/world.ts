import type { Vec2 } from './vec2.js';
import type { Body } from './body.js';
import { updateWorldVerts } from './shapes.js';
import type { Joint } from '../solver/joints.js';
import { sweepAndPrune } from '../collision/broadphase.js';
import { collide } from '../collision/narrowphase.js';
import type { Manifold } from '../collision/manifold.js';
import { solveVelocity } from '../solver/sequentialImpulse.js';
import { solveJoint } from '../solver/joints.js';
import { updateSleep } from './sleep.js';

export interface WorldOptions {
  gravity?: Vec2;
  dt?: number;
  solverIters?: number;
  beta?: number;
  slop?: number;
  restThreshold?: number;
  deterministicNoSleep?: boolean;
  seed?: number;
}

export class World {
  bodies: Body[] = [];
  joints: Joint[] = [];
  gravity: Vec2;
  dt: number;
  accumulator: number = 0;
  solverIters: number;
  beta: number;
  slop: number;
  restThreshold: number;
  deterministicNoSleep: boolean;
  rng: () => number;

  // warm start cache keyed by pair
  private warmCache = new Map<string, { Pn: number[]; Pt: number[] }>();

  constructor(opts: WorldOptions = {}) {
    this.gravity = opts.gravity ?? { x: 0, y: -9.81 };
    this.dt = opts.dt ?? 1 / 60;
    this.solverIters = opts.solverIters ?? 12;
    this.beta = opts.beta ?? 0.2;
    this.slop = opts.slop ?? 0.005;
    this.restThreshold = opts.restThreshold ?? 1.0;
    this.deterministicNoSleep = !!opts.deterministicNoSleep;
    // simple seeded rng
    const seed = opts.seed ?? 12345;
    let a = seed | 0;
    this.rng = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  addBody(b: Body): void { this.bodies.push(b); }
  addJoint(j: Joint): void { this.joints.push(j); }
  removeBody(id: number): void { this.bodies = this.bodies.filter(b => b.id !== id); }

  stepFrame(frameDelta: number): void {
    this.accumulator += frameDelta;
    let steps = 0;
    const MAX = 5;
    while (this.accumulator >= this.dt && steps < MAX) {
      this.step(this.dt);
      this.accumulator -= this.dt;
      steps++;
    }
    if (steps === MAX) this.accumulator = 0;
  }

  step(dt: number): void {
    // 1. integrate velocities from forces
    for (const b of this.bodies) {
      if (b.isStatic || b.sleeping) continue;
      b.v.x += dt * (b.f.x * b.invMass + this.gravity.x);
      b.v.y += dt * (b.f.y * b.invMass + this.gravity.y);
      b.w += dt * b.tau * b.invI;
    }

    // update world verts for polygons before broadphase
    for (const b of this.bodies) {
      if (b.shape.kind === 'polygon') updateWorldVerts(b.shape, b.p, b.q);
    }

    // 2. broadphase
    const pairs = sweepAndPrune(this.bodies);

    // 3. narrowphase -> manifolds
    const manifolds: Manifold[] = [];
    for (const [idA, idB] of pairs) {
      const A = this.bodies.find(bb => bb.id === idA)!;
      const B = this.bodies.find(bb => bb.id === idB)!;
      if (A.sleeping && B.sleeping) continue;
      // skip two statics
      if (A.isStatic && B.isStatic) continue;
      const m = collide(A, B);
      if (m) {
        // warm start restore
        const key = `${Math.min(idA, idB)}-${Math.max(idA, idB)}`;
        const cached = this.warmCache.get(key);
        if (cached && cached.Pn.length === m.points.length) {
          for (let i = 0; i < m.points.length; i++) {
            m.points[i]!.Pn = cached.Pn[i] ?? 0;
            m.points[i]!.Pt = cached.Pt[i] ?? 0;
          }
          // apply warm start impulses
          for (const cp of m.points) {
            const tangent = { x: -m.normal.y, y: m.normal.x };
            const impulseN = { x: m.normal.x * cp.Pn, y: m.normal.y * cp.Pn };
            const impulseT = { x: tangent.x * cp.Pt, y: tangent.y * cp.Pt };
            const imp = { x: impulseN.x + impulseT.x, y: impulseN.y + impulseT.y };
            if (!A.isStatic) {
              const rA = { x: cp.point.x - A.p.x, y: cp.point.y - A.p.y };
              A.v.x -= imp.x * A.invMass;
              A.v.y -= imp.y * A.invMass;
              A.w -= A.invI * (rA.x * imp.y - rA.y * imp.x);
            }
            if (!B.isStatic) {
              const rB = { x: cp.point.x - B.p.x, y: cp.point.y - B.p.y };
              B.v.x += imp.x * B.invMass;
              B.v.y += imp.y * B.invMass;
              B.w += B.invI * (rB.x * imp.y - rB.y * imp.x);
            }
          }
        }
        manifolds.push(m);
      }
    }

    // sort manifolds deterministically by (A,B)
    manifolds.sort((a, b) => a.A - b.A || a.B - b.B);

    // 4. solver iterations
    for (let iter = 0; iter < this.solverIters; iter++) {
      for (const m of manifolds) {
        const A = this.bodies.find(bb => bb.id === m.A)!;
        const B = this.bodies.find(bb => bb.id === m.B)!;
        solveVelocity(m, A, B, this.beta, this.slop, this.restThreshold, dt);
      }
      for (const j of this.joints) {
        solveJoint(j, this.bodies);
      }
    }

    // 5. integrate positions
    for (const b of this.bodies) {
      if (b.isStatic || b.sleeping) continue;
      b.p.x += dt * b.v.x;
      b.p.y += dt * b.v.y;
      b.q += dt * b.w;
    }

    // 6. position correction already via Baumgarte; optional slop

    // 7. sleep update
    updateSleep(this.bodies, manifolds, this.joints, dt, this.deterministicNoSleep);

    // 8. store warm start
    for (const m of manifolds) {
      const key = `${Math.min(m.A, m.B)}-${Math.max(m.A, m.B)}`;
      this.warmCache.set(key, { Pn: m.points.map(p => p.Pn), Pt: m.points.map(p => p.Pt) });
    }

    // clear forces
    for (const b of this.bodies) { b.f.x = 0; b.f.y = 0; b.tau = 0; }
  }

  getBody(id: number): Body | undefined { return this.bodies.find(b => b.id === id); }

  kineticEnergy(): number {
    let ke = 0;
    for (const b of this.bodies) {
      if (b.isStatic) continue;
      ke += 0.5 * b.mass * (b.v.x * b.v.x + b.v.y * b.v.y) + 0.5 * b.inertia * b.w * b.w;
    }
    return ke;
  }
}
