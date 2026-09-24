import { test } from "node:test";
import assert from "node:assert/strict";
import { FreeCamera } from "../src/camera.js";
import { vec3, vec3Cross, vec3Dot, vec3Length, vec3Scale } from "../src/math.js";

const close = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) < tol;

const approxVec = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, tol = 1e-6): boolean =>
  close(a.x, b.x, tol) && close(a.y, b.y, tol) && close(a.z, b.z, tol);

test("camera basis is orthonormal and right-handed", () => {
  const cam = new FreeCamera();
  const f = cam.forward();
  const r = cam.right();
  const u = cam.up();
  assert.ok(close(vec3Length(f), 1));
  assert.ok(close(vec3Length(r), 1));
  assert.ok(close(vec3Length(u), 1));
  assert.ok(close(vec3Dot(f, r), 0));
  assert.ok(close(vec3Dot(f, u), 0));
  assert.ok(close(vec3Dot(r, u), 0));
  // OpenGL view space is right-handed with +z pointing back toward the eye,
  // so right × up points away from forward.
  assert.ok(approxVec(vec3Cross(r, u), vec3Scale(f, -1)), "right × up should equal −forward");
});

test("lookAt points the camera straight at the target", () => {
  const cam = new FreeCamera();
  cam.eye = vec3(0, 0, 0);
  cam.lookAt(vec3(10, 0, 0));
  const f = cam.forward();
  assert.ok(close(vec3Dot(f, vec3(1, 0, 0)), 1, 1e-9), `forward=${JSON.stringify(f)}`);
});

test("approach converges without overshooting", () => {
  const cam = new FreeCamera();
  cam.eye = vec3(100, 0, 0);
  const target = vec3(0, 0, 0);
  let prev = 100;
  let lastDist = prev;
  let monotonic = true;
  for (let i = 0; i < 600; i++) {
    cam.approach(target, 1 / 60);
    const d = Math.hypot(cam.eye.x, cam.eye.y, cam.eye.z);
    if (d > prev + 1e-6) monotonic = false;
    prev = d;
    lastDist = d;
  }
  assert.ok(monotonic, "distance to target never increases");
  assert.ok(lastDist < 1e-2, `converged to ${lastDist}`);
});

test("move travels exactly speed×dt along the forward axis", () => {
  const cam = new FreeCamera();
  cam.speed = 100;
  cam.setKey("forward", 1);
  const before = { ...cam.eye };
  cam.move(0.5);
  const dx = cam.eye.x - before.x;
  const dy = cam.eye.y - before.y;
  const dz = cam.eye.z - before.z;
  assert.ok(close(Math.hypot(dx, dy, dz), 50, 1e-4), `traveled ${Math.hypot(dx, dy, dz)}`);
});

test("pitch is clamped to prevent gimbal lock", () => {
  const cam = new FreeCamera();
  cam.rotate(0, 10);
  assert.ok(cam.pitch <= 1.55);
  cam.rotate(0, -10);
  assert.ok(cam.pitch >= -1.55);
});

test("scaleSpeed is clamped", () => {
  const cam = new FreeCamera();
  cam.scaleSpeed(1e9);
  assert.ok(cam.speed <= 8000);
  cam.scaleSpeed(1e-9);
  assert.ok(cam.speed >= 4);
});

test("view matrix moves the world so the eye is at the origin", () => {
  const cam = new FreeCamera();
  cam.eye = vec3(1, 2, 3);
  const view = cam.viewMatrix();
  const w = view[3] * 1 + view[7] * 2 + view[11] * 3 + view[15];
  const ox = (view[0] * 1 + view[4] * 2 + view[8] * 3 + view[12]) / w;
  const oy = (view[1] * 1 + view[5] * 2 + view[9] * 3 + view[13]) / w;
  const oz = (view[2] * 1 + view[6] * 2 + view[10] * 3 + view[14]) / w;
  assert.ok(approxVec(vec3(ox, oy, oz), vec3(0, 0, 0), 1e-6), "eye maps to origin");
});