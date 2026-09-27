import type { Body } from './body.js';
import type { Manifold } from '../collision/manifold.js';
import type { Joint } from '../solver/joints.js';

const SLEEP_LINEAR = 0.1;
const SLEEP_TIME = 0.5;

export function updateSleep(
  bodies: Body[],
  manifolds: Manifold[],
  joints: Joint[],
  dt: number,
  deterministicNoSleep: boolean
): void {
  if (deterministicNoSleep) return;

  // build islands via union-find
  const n = bodies.length;
  const idToIdx = new Map<number, number>();
  for (let i = 0; i < n; i++) idToIdx.set(bodies[i]!.id, i);
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) { parent[x] = parent[parent[x]!]!; x = parent[x]!; }
    return x;
  }
  function union(a: number, b: number): void {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }
  for (const m of manifolds) {
    const ia = idToIdx.get(m.A), ib = idToIdx.get(m.B);
    if (ia !== undefined && ib !== undefined) union(ia, ib);
  }
  for (const j of joints) {
    const ia = idToIdx.get(j.A), ib = idToIdx.get(j.B);
    if (ia !== undefined && ib !== undefined) union(ia, ib);
  }
  // group by root
  const islands = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (bodies[i]!.isStatic) continue;
    const r = find(i);
    if (!islands.has(r)) islands.set(r, []);
    islands.get(r)!.push(i);
  }
  // evaluate each island
  for (const indices of islands.values()) {
    // check if all bodies are slow
    let allSlow = true;
    for (const idx of indices) {
      const b = bodies[idx]!;
      const motion = b.v.x * b.v.x + b.v.y * b.v.y + b.w * b.w * 1; // approx radius 1
      if (motion >= SLEEP_LINEAR * SLEEP_LINEAR) { allSlow = false; break; }
    }
    if (allSlow) {
      for (const idx of indices) {
        const b = bodies[idx]!;
        b.sleepTimer += dt;
        if (b.sleepTimer >= SLEEP_TIME) {
          b.sleeping = true;
          b.v.x = 0; b.v.y = 0; b.w = 0;
        }
      }
    } else {
      for (const idx of indices) {
        bodies[idx]!.sleepTimer = 0;
        bodies[idx]!.sleeping = false;
      }
    }
  }
  // wake islands touching a non-sleeping body
  // (handled implicitly by above, but also wake if any dynamic waking contact)
  for (const m of manifolds) {
    const ia = idToIdx.get(m.A), ib = idToIdx.get(m.B);
    if (ia === undefined || ib === undefined) continue;
    const a = bodies[ia]!, b = bodies[ib]!;
    if (!a.sleeping && b.sleeping && !b.isStatic) {
      // wake island of b
      const root = find(ib);
      const isl = islands.get(root);
      if (isl) for (const idx of isl) { bodies[idx]!.sleeping = false; bodies[idx]!.sleepTimer = 0; }
      else { b.sleeping = false; b.sleepTimer = 0; }
    }
    if (!b.sleeping && a.sleeping && !a.isStatic) {
      const root = find(ia);
      const isl = islands.get(root);
      if (isl) for (const idx of isl) { bodies[idx]!.sleeping = false; bodies[idx]!.sleepTimer = 0; }
      else { a.sleeping = false; a.sleepTimer = 0; }
    }
  }
}
