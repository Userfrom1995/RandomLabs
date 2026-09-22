// Umbra WebGPU pass 1: fighter silhouettes. Capsule SDF over 22 segments
// (11 per fighter), near-black fill with soft antialiased edge.

struct SegUniforms {
  res: vec4f, // w, h, aspect, unused
  ab: array<vec4f, 22>, // (ax, ay, bx, by) in frame UV with y-up
  w: array<vec4f, 22>,  // width in x
};

@group(0) @binding(0) var<uniform> u: SegUniforms;

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

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = u.res.xy;
  let uv = pos.xy / res;
  let aspect = u.res.z;
  var d = 1e6;
  for (var i = 0u; i < 22u; i++) {
    let a = vec2f((u.ab[i].x * 0.5 + 0.5) * aspect, u.ab[i].y);
    let b = vec2f((u.ab[i].z * 0.5 + 0.5) * aspect, u.ab[i].w);
    let dd = segDist(vec2f(uv.x * aspect, uv.y), a, b) - u.w[i].x * 0.5;
    d = min(d, dd);
  }
  let px = 1.2 / res.y;
  let alpha = 1.0 - smoothstep(-px, px, d);
  if (alpha <= 0.001) { discard; }
  return vec4f(vec3f(0.02, 0.023, 0.04), alpha);
}
