// Umbra WebGPU pass 2: rim light. Finite-difference normal of the same
// capsule field, lit by the arena key light, tinted by the arena accent.
// Additive blend.

struct RimUniforms {
  res: vec4f, // w, h, aspect, unused
  ab: array<vec4f, 22>,
  w: array<vec4f, 22>,
  light: vec4f,  // keyLight.xy, edgeWidth, intensity
  accent: vec4f, // accent rgb, unused w
};

@group(0) @binding(0) var<uniform> u: RimUniforms;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

fn segDist(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

fn field(p: vec2f, aspect: f32) -> f32 {
  var d = 1e6;
  for (var i = 0u; i < 22u; i++) {
    let a = vec2f((u.ab[i].x * 0.5 + 0.5) * aspect, u.ab[i].y);
    let b = vec2f((u.ab[i].z * 0.5 + 0.5) * aspect, u.ab[i].w);
    let dd = segDist(p, a, b) - u.w[i].x * 0.5;
    d = min(d, dd);
  }
  return d;
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = u.res.xy;
  let uv = pos.xy / res;
  let aspect = u.res.z;
  let p = vec2f(uv.x * aspect, uv.y);
  let e = 1.5 / res.y;
  let d = field(p, aspect);
  let edge = 1.0 - smoothstep(0.0, u.light.z, abs(d));
  if (edge <= 0.002) { discard; }
  let gx = field(p + vec2f(e, 0.0), aspect) - field(p - vec2f(e, 0.0), aspect);
  let gy = field(p + vec2f(0.0, e), aspect) - field(p - vec2f(0.0, e), aspect);
  let n = normalize(vec2f(gx, gy) + vec2f(1e-5, 0.0));
  let l = normalize(u.light.xy);
  let facing = pow(clamp(dot(n, l) * 0.5 + 0.5, 0.0, 1.0), 2.0);
  let glow = edge * facing * u.light.w;
  return vec4f(u.accent.rgb * glow, 1.0);
}
