import type { Vec2 } from './vec2.js';
import type { Body } from './body.js';

export type AABB = { minX: number; minY: number; maxX: number; maxY: number };

export function aabbFromBody(body: Body): AABB {
  const shape = body.shape;
  if (shape.kind === 'circle') {
    const r = shape.radius;
    return { minX: body.p.x - r, minY: body.p.y - r, maxX: body.p.x + r, maxY: body.p.y + r };
  } else {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of shape.worldVerts) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
    // pad slightly
    const pad = 0.01;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
