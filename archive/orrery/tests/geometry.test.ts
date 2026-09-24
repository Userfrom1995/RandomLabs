import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VERTEX_STRIDE,
  polylineGeometry,
  pointGeometry,
  quadGeometry,
  ringGeometry,
  sphereGeometry,
  unitCircle,
  unitSpherePoints,
} from "../src/geometry.js";
import { vec3, vec3Length } from "../src/math.js";

const close = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) < tol;

test("sphere vertices lie on the unit sphere with matching normals and clamped UVs", () => {
  const { vertices, indices } = sphereGeometry(1, 16, 8);
  for (let i = 0; i < vertices.length; i += 8) {
    const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
    const nx = vertices[i + 3], ny = vertices[i + 4], nz = vertices[i + 5];
    assert.ok(close(Math.hypot(x, y, z), 1, 1e-5), "vertex on unit sphere");
    assert.ok(close(nx, x, 1e-5) && close(ny, y, 1e-5) && close(nz, z, 1e-5), "normal = position");
    assert.ok(vertices[i + 6] >= 0 && vertices[i + 6] <= 1, "u in range");
    assert.ok(vertices[i + 7] >= 0 && vertices[i + 7] <= 1, "v in range");
  }
  assert.equal(indices.length, 16 * 8 * 6);
  for (const idx of indices) assert.ok(idx < vertices.length / 8, "index in bounds");
});

test("ring annulus keeps the inner/outer radii and the +Z normal", () => {
  const { vertices, indices } = ringGeometry(0.5, 1, 32);
  for (let i = 0; i < vertices.length; i += 8) {
    const r = Math.hypot(vertices[i], vertices[i + 1]);
    assert.ok(r >= 0.49 && r <= 1.01, `radius ${r}`);
    assert.equal(vertices[i + 2], 0, "z = 0");
    assert.ok(close(vertices[i + 5], 1), "+Z normal");
    assert.equal(indices.length, 32 * 6);
  }
});

test("quad has 4 vertices and 6 indices with UVs 0..1", () => {
  const { vertices, indices } = quadGeometry();
  assert.equal(vertices.length / 8, 4);
  assert.equal(indices.length, 6);
  for (let i = 0; i < vertices.length; i += 8) {
    assert.ok(vertices[i + 6] >= 0 && vertices[i + 6] <= 1);
    assert.ok(vertices[i + 7] >= 0 && vertices[i + 7] <= 1);
  }
});

test("polyline and point meshes carry one vertex per 3 floats", () => {
  const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0)];
  assert.equal(polylineGeometry(pts).vertices.length, 9);
  assert.equal(pointGeometry(pts).vertices.length, 9);
});

test("unit circle is closed on the XY plane at radius 1", () => {
  const circle = unitCircle(64);
  assert.equal(circle.length, 64);
  for (const p of circle) {
    assert.ok(close(p.y, 0));
    assert.ok(close(Math.hypot(p.x, p.z), 1));
  }
});

test("unit sphere points are all unit-length", () => {
  let rngState = 42;
  const rng = (): number => {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  };
  const pts = unitSpherePoints(200, rng);
  assert.equal(pts.length, 200);
  for (const p of pts) assert.ok(close(vec3Length(p), 1, 1e-6), `len ${vec3Length(p)}`);
});

test("VERTEX_STRIDE matches the interleaved layout", () => {
  assert.equal(VERTEX_STRIDE, 8 * 4);
});