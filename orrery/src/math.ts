// math.ts — minimal 3D math for the orrery: 3-vectors and 4×4 matrices.
// Column-major Float32Array matrices (WebGL convention). No external deps.

export const EPSILON = 1e-7;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export const vec3Add = (a: Vec3, b: Vec3): Vec3 => vec3(a.x + b.x, a.y + b.y, a.z + b.z);

export const vec3Sub = (a: Vec3, b: Vec3): Vec3 => vec3(a.x - b.x, a.y - b.y, a.z - b.z);

export const vec3Scale = (a: Vec3, s: number): Vec3 => vec3(a.x * s, a.y * s, a.z * s);

export const vec3Dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

export const vec3Cross = (a: Vec3, b: Vec3): Vec3 =>
  vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);

export const vec3Length = (a: Vec3): number => Math.sqrt(vec3Dot(a, a));

export const vec3Distance = (a: Vec3, b: Vec3): number => vec3Length(vec3Sub(a, b));

export const vec3Normalize = (a: Vec3): Vec3 => {
  const len = vec3Length(a);
  if (len < EPSILON) return vec3(0, 0, 0);
  return vec3Scale(a, 1 / len);
};

export const vec3Lerp = (a: Vec3, b: Vec3, t: number): Vec3 => {
  const k = Math.min(1, Math.max(0, t));
  return vec3(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
};

export const vec3Transform = (m: Mat4, v: Vec3): Vec3 => {
  const d = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15];
  const w = Math.abs(d) < EPSILON ? 1 : 1 / d;
  return vec3(
    (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12]) * w,
    (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13]) * w,
    (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14]) * w,
  );
};

// vec3TransformDirection applies only the linear (rotation/scale) part.
export const vec3TransformDir = (m: Mat4, v: Vec3): Vec3 =>
  vec3(m[0] * v.x + m[4] * v.y + m[8] * v.z, m[1] * v.x + m[5] * v.y + m[9] * v.z, m[2] * v.x + m[6] * v.y + m[10] * v.z);

export type Mat4 = Float32Array;

export const mat4Identity = (): Mat4 =>
  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export const mat4Multiply = (a: Mat4, b: Mat4): Mat4 => {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
};

export const mat4Perspective = (fovyRad: number, aspect: number, near: number, far: number): Mat4 => {
  const f = 1 / Math.tan(fovyRad / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
};

export const mat4LookAt = (eye: Vec3, center: Vec3, up: Vec3): Mat4 => {
  const f = vec3Normalize(vec3Sub(center, eye));
  const s = vec3Normalize(vec3Cross(f, up));
  const u = vec3Cross(s, f);
  const out = new Float32Array(16);
  out[0] = s.x; out[4] = s.y; out[8] = s.z;
  out[1] = u.x; out[5] = u.y; out[9] = u.z;
  out[2] = -f.x; out[6] = -f.y; out[10] = -f.z;
  out[12] = -vec3Dot(s, eye);
  out[13] = -vec3Dot(u, eye);
  out[14] = vec3Dot(f, eye);
  out[15] = 1;
  return out;
};

export const mat4Translation = (v: Vec3): Mat4 =>
  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, v.x, v.y, v.z, 1]);

export const mat4RotationX = (rad: number): Mat4 => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
};

export const mat4RotationY = (rad: number): Mat4 => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
};

export const mat4RotationZ = (rad: number): Mat4 => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
};

export const mat4Scale = (s: Vec3): Mat4 =>
  new Float32Array([s.x, 0, 0, 0, 0, s.y, 0, 0, 0, 0, s.z, 0, 0, 0, 0, 1]);

// Compose a model transform T * R * S (applied in that order to a vertex).
export const mat4Trs = (translation: Vec3, rotation: Mat4, scale: Vec3): Mat4 =>
  mat4Multiply(mat4Multiply(mat4Translation(translation), rotation), mat4Scale(scale));

export const mat4Inverse = (m: Mat4): Mat4 => {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return mat4Identity();
  det = 1 / det;
  const out = new Float32Array(16);
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
};

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

// Radians wrapped into [0, 2π).
export const wrapAngle = (rad: number): number => {
  const tau = Math.PI * 2;
  const w = rad % tau;
  return w < 0 ? w + tau : w;
};

// Linear interpolation clamped to [0,1] with easing (smoothstep).
export const smoothstep = (t: number): number => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};