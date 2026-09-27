import type { Body } from './body.js';

function fnv1a(bytes: Uint8Array): number {
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hashState(bodies: Body[]): string {
  // deterministic: sort by id, then serialize p.x,p.y,q,v.x,v.y,w as fixed precision
  const sorted = [...bodies].sort((a, b) => a.id - b.id);
  let str = '';
  for (const b of sorted) {
    str += `${b.id}:${b.p.x.toFixed(6)},${b.p.y.toFixed(6)},${b.q.toFixed(6)},${b.v.x.toFixed(6)},${b.v.y.toFixed(6)},${b.w.toFixed(6)};`;
  }
  const bytes = new TextEncoder().encode(str);
  const h = fnv1a(bytes);
  return h.toString(16).padStart(8, '0');
}

export function hashStateDetailed(bodies: Body[]): string {
  const sorted = [...bodies].sort((a, b) => a.id - b.id);
  let str = '';
  for (const b of sorted) {
    str += `${b.id}:${b.p.x.toFixed(10)},${b.p.y.toFixed(10)},${b.q.toFixed(10)},${b.v.x.toFixed(10)},${b.v.y.toFixed(10)},${b.w.toFixed(10)},${b.mass},${b.inertia};`;
  }
  const bytes = new TextEncoder().encode(str);
  const h = fnv1a(bytes);
  return h.toString(16).padStart(8, '0');
}
