// Umbra WebGPU pass 0: arena background (gradient + glow disc + parallax
// ridgelines + ground band + vignette). Fullscreen triangle, opaque output.

struct BGUniforms {
  res: vec4f, // w, h, aspect, unused
  top: vec4f,
  bottom: vec4f,
  glow: vec4f,
  ground: vec4f,
  params: vec4f, // time, glowX, glowY, layerDrift
  ridge: vec4f,  // dark, light, horizonY, seed
};

@group(0) @binding(0) var<uniform> u: BGUniforms;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

fn ridgeY(x: f32, seed: f32, l: f32) -> f32 {
  return u.ridge.z
    + 0.035 * sin(x * (5.0 + seed) + u.params.x * (0.02 + l * 0.05) + seed * 7.0)
    + 0.018 * sin(x * (11.0 + seed * 2.0) - u.params.x * 0.03 + l * 9.0);
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = u.res.xy;
  let uv = pos.xy / res;
  let aspect = u.res.z;
  var col = mix(u.bottom.rgb, u.top.rgb, pow(uv.y, 1.2));

  // Glow disc (moon / forge heart / storm eye) with halo falloff.
  let gp = vec2f(u.params.y, u.params.z);
  let d = distance(vec2f(uv.x * aspect, uv.y), vec2f(gp.x * aspect, gp.y));
  col += u.glow.rgb * (smoothstep(0.16, 0.02, d) * 0.9 + smoothstep(0.5, 0.0, d) * 0.25);

  // Two parallax ridgelines, drifting slowly with the layer clock.
  for (var l = 0u; l < 2u; l++) {
    let lf = f32(l);
    let x = uv.x + u.params.w * (0.004 + lf * 0.008);
    let ry = ridgeY(x, u.ridge.w + lf * 3.7, lf);
    let band = smoothstep(ry + 0.004, ry - 0.004, uv.y);
    let tint = mix(u.ridge.x, u.ridge.y, lf * 0.5);
    col = mix(col, vec3f(tint * (0.6 + 0.4 * u.bottom.r * 3.0)), band * (0.55 + lf * 0.3));
  }

  // Ground band.
  let g = smoothstep(0.145, 0.135, uv.y);
  col = mix(col, u.ground.rgb, g);

  // Vignette.
  let v = distance(uv, vec2f(0.5, 0.55));
  col *= 1.0 - smoothstep(0.45, 0.95, v) * 0.45;
  return vec4f(col, 1.0);
}
