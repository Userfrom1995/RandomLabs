import type { Vec2 } from '../core/vec2.js';

export interface ContactPoint {
  point: Vec2;
  penetration: number;
  Pn: number;
  Pt: number;
  featureId: number;
}

export interface Manifold {
  A: number;
  B: number;
  normal: Vec2; // from A to B
  points: ContactPoint[];
}
