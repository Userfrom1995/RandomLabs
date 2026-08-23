import type { Body } from '../core/body.js';
import { aabbFromBody, aabbOverlap } from '../core/aabb.js';

export function sweepAndPrune(bodies: Body[]): [number, number][] {
  // compute AABBs
  const items = bodies.map(b => ({ id: b.id, aabb: aabbFromBody(b) }));
  // sort by minX tie-break id
  items.sort((a, b) => a.aabb.minX - b.aabb.minX || a.id - b.id);
  const active: typeof items = [];
  const pairs: [number, number][] = [];
  for (const cur of items) {
    // remove from active those whose maxX < cur.minX
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i]!.aabb.maxX < cur.aabb.minX) active.splice(i, 1);
    }
    for (const other of active) {
      if (aabbOverlap(cur.aabb, other.aabb)) {
        const a = Math.min(cur.id, other.id), b = Math.max(cur.id, other.id);
        pairs.push([a, b]);
      }
    }
    active.push(cur);
  }
  // dedupe and sort
  const seen = new Set<string>();
  const deduped: [number, number][] = [];
  for (const [a, b] of pairs) {
    const k = `${a}-${b}`;
    if (!seen.has(k)) { seen.add(k); deduped.push([a, b]); }
  }
  deduped.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return deduped;
}
