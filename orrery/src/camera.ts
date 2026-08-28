// camera.ts — free-fly camera. Position + yaw/pitch orientation, WASD/QE
// movement, mouse-drag look/pan, wheel-controlled flight speed. The view
// matrix is produced with mat4LookAt; the camera's basis vectors are exposed
// so the renderer can build camera-facing billboards.

import {
  Mat4,
  Vec3,
  mat4LookAt,
  vec3,
  vec3Add,
  vec3Cross,
  vec3Normalize,
  vec3Scale,
  vec3Sub,
} from "./math.js";

const CLAMP_PITCH = 1.55;
const MIN_SPEED = 4;
const MAX_SPEED = 8000;

export interface FlyInput {
  /** Multipliers in [0,1] applied to the base axes this frame. */
  forward: number;
  strafe: number;
  vertical: number;
}

export class FreeCamera {
  eye: Vec3 = vec3(0, 90, 190);
  yaw = 0;
  pitch = -0.28;
  speed = 80;

  private keyForward = 0;
  private keyStrafe = 0;
  private keyVertical = 0;

  /** Target for the movement keys; move() reads and resets these. */
  private consumeInput(): FlyInput {
    const input: FlyInput = {
      forward: this.keyForward,
      strafe: this.keyStrafe,
      vertical: this.keyVertical,
    };
    this.keyForward = 0;
    this.keyStrafe = 0;
    this.keyVertical = 0;
    return input;
  }

  setKey(axis: "forward" | "strafe" | "vertical", value: number): void {
    if (axis === "forward") this.keyForward = Math.max(-1, Math.min(1, value));
    else if (axis === "strafe") this.keyStrafe = Math.max(-1, Math.min(1, value));
    else this.keyVertical = Math.max(-1, Math.min(1, value));
  }

  /** Rotate by (dyaw, dpitch) radians. */
  rotate(dyaw: number, dpitch: number): void {
    this.yaw += dyaw;
    this.pitch = Math.max(-CLAMP_PITCH, Math.min(CLAMP_PITCH, this.pitch + dpitch));
  }

  /** Multiply the flight speed by a factor, clamped. */
  scaleSpeed(factor: number): void {
    this.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, this.speed * factor));
  }

  /** Move along the camera's basis by the accumulated key input. */
  move(dt: number): void {
    const { forward, strafe, vertical } = this.consumeInput();
    const f = this.forward();
    const r = this.right();
    const dist = this.speed * dt;
    const dx = r.x * strafe + f.x * forward;
    const dy = vertical;
    const dz = r.z * strafe + f.z * forward;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-9) return;
    const s = dist / len;
    this.eye = vec3Add(this.eye, vec3(dx * s, dy * s, dz * s));
  }

  /** Pan the camera in its own plane (right-drag): dx/dy are pixel deltas. */
  pan(dx: number, dy: number): void {
    const r = this.right();
    const up = this.up();
    const dist = this.speed * 0.008;
    this.eye = vec3Add(this.eye, vec3Add(vec3Scale(r, -dx * dist), vec3Scale(up, dy * dist)));
  }

  forward(): Vec3 {
    const cp = Math.cos(this.pitch);
    return vec3(cp * Math.sin(this.yaw), Math.sin(this.pitch), cp * Math.cos(this.yaw));
  }

  right(): Vec3 {
    return vec3Normalize(vec3Cross(this.forward(), vec3(0, 1, 0)));
  }

  up(): Vec3 {
    return vec3Cross(this.right(), this.forward());
  }

  /** Snap orientation to look from `eye` toward `target`. */
  lookAt(target: Vec3): void {
    const dir = vec3Normalize(vec3Sub(target, this.eye));
    this.yaw = Math.atan2(dir.x, dir.z);
    this.pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
  }

  /** Continuous-damping approach toward a target position. */
  approach(target: Vec3, dt: number): void {
    const k = 1 - Math.exp(-dt * 2.6);
    const to = vec3Sub(target, this.eye);
    this.eye = vec3Add(this.eye, vec3Scale(to, Math.min(1, k)));
  }

  /** View matrix for the current pose. */
  viewMatrix(): Mat4 {
    return mat4LookAt(this.eye, vec3Add(this.eye, this.forward()), this.up());
  }

  /** Rotation-only view matrix (stars stay fixed at "infinity"). */
  viewRotationMatrix(): Mat4 {
    const view = this.viewMatrix();
    const out = new Float32Array(16);
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) out[c * 4 + r] = view[c * 4 + r];
    }
    out[15] = 1;
    return out;
  }
}