// geometry.ts — CPU mesh generators. All meshes use a fixed interleaved
// layout of 8 floats per vertex (position.xyz, normal.xyz, uv.xy) except the
// position-only meshes used by the unlit program (lines, points).

import { Vec3 } from "./math.js";

export interface InterleavedMesh {
  /** Float32Array, 8 floats per vertex: x y z nx ny nz u v. */
  vertices: Float32Array;
  indices: Uint16Array;
}

export interface PositionMesh {
  /** Float32Array, 3 floats per vertex. */
  vertices: Float32Array;
}

/** Stride (bytes) for the interleaved layout. */
export const VERTEX_STRIDE = 8 * 4;

/**
 * UV sphere (y-up, north pole +Y, seam at +X). `u` runs around the equator,
 * `v` from the north pole (0) to the south pole (1).
 */
export const sphereGeometry = (radius: number, widthSegments: number, heightSegments: number): InterleavedMesh => {
  const v = new Float32Array((widthSegments + 1) * (heightSegments + 1) * 8);
  const idx = new Uint16Array(widthSegments * heightSegments * 6);
  let vi = 0;
  let ii = 0;
  for (let j = 0; j <= heightSegments; j++) {
    const vv = j / heightSegments;
    const theta = vv * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    for (let i = 0; i <= widthSegments; i++) {
      const uu = i / widthSegments;
      const phi = uu * Math.PI * 2;
      const px = radius * sinTheta * Math.cos(phi);
      const py = radius * cosTheta;
      const pz = radius * sinTheta * Math.sin(phi);
      const il = 1 / radius;
      v[vi++] = px; v[vi++] = py; v[vi++] = pz;
      v[vi++] = px * il; v[vi++] = py * il; v[vi++] = pz * il;
      v[vi++] = uu; v[vi++] = vv;
    }
  }
  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < widthSegments; i++) {
      const a = j * (widthSegments + 1) + i;
      const b = a + 1;
      const c = a + (widthSegments + 1);
      const d = c + 1;
      idx[ii++] = a; idx[ii++] = c; idx[ii++] = b;
      idx[ii++] = b; idx[ii++] = c; idx[ii++] = d;
    }
  }
  return { vertices: v, indices: idx };
};

/**
 * Annulus in the XY plane (z = 0), normal +Z, centered at the origin. UVs:
 * `u` sweeps the angle, `v` runs 0 (inner edge) to 1 (outer edge) so a radial
 * texture (e.g. Saturn's rings) can be mapped naturally.
 */
export const ringGeometry = (innerRadius: number, outerRadius: number, segments: number): InterleavedMesh => {
  const v = new Float32Array((segments + 1) * 2 * 8);
  const idx = new Uint16Array(segments * 2 * 3);
  let vi = 0;
  let ii = 0;
  for (let i = 0; i <= segments; i++) {
    const uu = i / segments;
    const phi = uu * Math.PI * 2;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    for (let ring = 0; ring < 2; ring++) {
      const rr = ring === 0 ? innerRadius : outerRadius;
      const vv = ring === 0 ? 0 : 1;
      v[vi++] = rr * cosPhi; v[vi++] = rr * sinPhi; v[vi++] = 0;
      v[vi++] = 0; v[vi++] = 0; v[vi++] = 1;
      v[vi++] = uu; v[vi++] = vv;
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    idx[ii++] = a; idx[ii++] = b; idx[ii++] = c;
    idx[ii++] = b; idx[ii++] = d; idx[ii++] = c;
  }
  return { vertices: v, indices: idx };
};

/** Unit quad in the XY plane (z = 0), normal +Z, uv 0..1. Used for billboards. */
export const quadGeometry = (): InterleavedMesh => {
  const v = new Float32Array([
    -0.5, -0.5, 0, 0, 0, 1, 0, 0,
     0.5, -0.5, 0, 0, 0, 1, 1, 0,
     0.5,  0.5, 0, 0, 0, 1, 1, 1,
    -0.5,  0.5, 0, 0, 0, 1, 0, 1,
  ]);
  const idx = new Uint16Array([0, 1, 2, 0, 2, 3]);
  return { vertices: v, indices: idx };
};

/** Closed polyline through the given points (GL_LINE_LOOP). */
export const polylineGeometry = (points: Vec3[]): PositionMesh => {
  const v = new Float32Array(points.length * 3);
  let i = 0;
  for (const p of points) {
    v[i++] = p.x;
    v[i++] = p.y;
    v[i++] = p.z;
  }
  return { vertices: v };
};

/** Point cloud (GL_POINTS). */
export const pointGeometry = (points: Vec3[]): PositionMesh => {
  const v = new Float32Array(points.length * 3);
  let i = 0;
  for (const p of points) {
    v[i++] = p.x;
    v[i++] = p.y;
    v[i++] = p.z;
  }
  return { vertices: v };
};

/** Points uniformly distributed on the unit sphere (star directions). */
export const unitSpherePoints = (count: number, random: () => number): Vec3[] => {
  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const u = random() * 2 - 1;
    const phi = random() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - u * u));
    out.push({ x: r * Math.cos(phi), y: u, z: r * Math.sin(phi) });
  }
  return out;
};

/** Unit circle in the XY plane (closed line loop). */
export const unitCircle = (segments: number): Vec3[] => {
  const out: Vec3[] = [];
  for (let i = 0; i < segments; i++) {
    const phi = (i / segments) * Math.PI * 2;
    out.push({ x: Math.cos(phi), y: 0, z: Math.sin(phi) });
  }
  return out;
};