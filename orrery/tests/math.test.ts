import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EPSILON,
  vec3,
  vec3Add,
  vec3Sub,
  vec3Scale,
  vec3Dot,
  vec3Cross,
  vec3Normalize,
  vec3Transform,
  vec3TransformDir,
  mat4Identity,
  mat4Multiply,
  mat4Perspective,
  mat4LookAt,
  mat4RotationZ,
  mat4Trs,
  wrapAngle,
  smoothstep,
} from "../src/math.js";

const close = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) < tol;

test("mat4Multiply returns identity when composed with identity", () => {
  const m = mat4Perspective(1, 1.5, 0.1, 1000);
  const id = mat4Identity();
  assert.deepEqual(Array.from(mat4Multiply(id, m)), Array.from(m));
  assert.deepEqual(Array.from(mat4Multiply(m, id)), Array.from(m));
});

test("mat4Perspective maps a point at -near to NDC z = -1", () => {
  const p = mat4Perspective(Math.PI / 2, 1, 0.5, 10);
  const v = vec3Transform(p, vec3(0, 0, -0.5));
  assert.ok(close(v.z, -1, 1e-4), `near plane z = ${v.z}`);
});

test("mat4LookAt puts the eye at the origin in view space", () => {
  const eye = vec3(3, 4, 5);
  const view = mat4LookAt(eye, vec3(0, 0, 0), vec3(0, 1, 0));
  const atEye = vec3Transform(view, eye);
  assert.ok(close(atEye.x, 0) && close(atEye.y, 0) && close(atEye.z, 0));
});

test("mat4LookAt forward axis points toward the target (view −Z)", () => {
  // In view space the camera looks down -Z: the world direction from eye to
  // center must map to (0, 0, -1).
  const view = mat4LookAt(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 1, 0));
  const forward = vec3TransformDir(view, vec3(0, 0, -1));
  assert.ok(close(forward.x, 0) && close(forward.y, 0) && close(forward.z, -1), `forward = ${forward.z}`);
});

test("mat4Trs translates and scales a point correctly", () => {
  const m = mat4Trs(vec3(10, 20, 30), mat4Identity(), vec3(2, 3, 4));
  const out = vec3Transform(m, vec3(1, 1, 1));
  assert.ok(close(out.x, 12) && close(out.y, 23) && close(out.z, 34));
});

test("rotation matrices rotate by the expected angle", () => {
  const rot = mat4RotationZ(Math.PI / 2);
  const out = vec3TransformDir(rot, vec3(1, 0, 0));
  assert.ok(close(out.x, 0, 1e-6) && close(out.y, 1, 1e-6));
});

test("vec3Cross is anti-commutative and perpendicular to inputs", () => {
  const a = vec3(1, 2, 3);
  const b = vec3(-4, 5, 6);
  const c = vec3Cross(a, b);
  assert.deepEqual(vec3Cross(b, a), vec3Scale(c, -1));
  assert.ok(close(vec3Dot(a, c), 0, 1e-9));
  assert.ok(close(vec3Dot(b, c), 0, 1e-9));
});

test("vec3Normalize yields unit length", () => {
  const n = vec3Normalize(vec3(1, 2, 3));
  const len = Math.sqrt(vec3Dot(n, n));
  assert.ok(close(len, 1, 1e-9));
});

test("vec3Normalize of a zero vector is a zero vector (no NaN)", () => {
  const n = vec3Normalize(vec3(0, 0, 0));
  assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z));
});

test("vector add/sub/scale are exact", () => {
  const a = vec3(1, 2, 3);
  const b = vec3(4, 5, 6);
  assert.deepEqual(vec3Add(a, b), vec3(5, 7, 9));
  assert.deepEqual(vec3Sub(a, b), vec3(-3, -3, -3));
  assert.deepEqual(vec3Scale(a, 2), vec3(2, 4, 6));
});

test("wrapAngle keeps angles in [0, 2π)", () => {
  for (const a of [-10, -Math.PI, 0, 0.5, Math.PI * 2, Math.PI * 2 + 0.1, 100]) {
    const w = wrapAngle(a);
    assert.ok(w >= 0 && w < Math.PI * 2, `${a} → ${w}`);
    assert.ok(close(Math.sin(w), Math.sin(a), 1e-9));
  }
});

test("smoothstep stays within [0,1] and hits endpoints", () => {
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(1), 1);
  assert.equal(smoothstep(-5), 0);
  assert.equal(smoothstep(5), 1);
  assert.equal(smoothstep(0.5), 0.5);
});

test("EPSILON exists and is positive", () => {
  assert.ok(EPSILON > 0 && EPSILON < 1e-3);
});