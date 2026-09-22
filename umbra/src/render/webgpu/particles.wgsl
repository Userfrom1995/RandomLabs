// Umbra WebGPU pass 3: ambient particles. Soft additive discs from a
// fixed-size uniform array (x, y, size, brightness in frame UV).

struct PUniforms {
  res: vec4f, // w, h, aspect, unused
  pts: array<vec4f, 64>,
  count: vec4f, // active count in x
};

@group(0) @binding(0) var<uniform> u: PUniforms;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = u.res.xy;
  let uv = pos.xy / res;
  let aspect = u.res.z;
  var col = vec3f(0.0);
  let n = u32(clamp(u.count.x, 0.0, 64.0));
  for (var i = 0u; i < 64u; i++) {
    if (i >= n) { break; }
    let q = u.pts[i];
    let d = distance(vec2f(uv.x * aspect, uv.y), vec2f(q.x * aspect, q.y));
    col += vec3f(0.7, 0.8, 1.0) * (smoothstep(q.z, 0.0, d) * q.w);
  }
  if (dot(col, col) <= 1e-6) { discard; }
  return vec4f(col * 0.5, 1.0);
}
