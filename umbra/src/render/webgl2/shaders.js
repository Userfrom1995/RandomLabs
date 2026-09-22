/**
 * Umbra WebGL2 tier-1 shaders: GLSL ports of the four WGSL passes.
 * Same uniforms, same visuals, one shared SceneDesc. Exported as strings
 * so the renderer (and headless contract tests) share one source.
 */

export const UMBRA_VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

export const UMBRA_BG_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uGlow;
uniform vec3 uGround;
uniform vec4 uParams; // time, glowX, glowY, layerDrift
uniform vec4 uRidge;  // dark, light, horizonY, seed
out vec4 oColor;

float ridgeY(float x, float seed, float l) {
  return uRidge.z
    + 0.035 * sin(x * (5.0 + seed) + uParams.x * (0.02 + l * 0.05) + seed * 7.0)
    + 0.018 * sin(x * (11.0 + seed * 2.0) - uParams.x * 0.03 + l * 9.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 col = mix(uBottom, uTop, pow(uv.y, 1.2));
  vec2 gp = vec2(uParams.y, uParams.z);
  float d = distance(vec2(uv.x * aspect, uv.y), vec2(gp.x * aspect, gp.y));
  col += uGlow * (smoothstep(0.16, 0.02, d) * 0.9 + smoothstep(0.5, 0.0, d) * 0.25);
  for (int l = 0; l < 2; l++) {
    float lf = float(l);
    float x = uv.x + uParams.w * (0.004 + lf * 0.008);
    float ry = ridgeY(x, uRidge.w + lf * 3.7, lf);
    float band = smoothstep(ry + 0.004, ry - 0.004, uv.y);
    float tint = mix(uRidge.x, uRidge.y, lf * 0.5);
    col = mix(col, vec3(tint * (0.6 + 0.4 * uBottom.r * 3.0)), band * (0.55 + lf * 0.3));
  }
  col = mix(col, uGround, smoothstep(0.145, 0.135, uv.y));
  col *= 1.0 - smoothstep(0.45, 0.95, distance(uv, vec2(0.5, 0.55))) * 0.45;
  oColor = vec4(col, 1.0);
}
`;

export const UMBRA_SIL_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec4 uSeg[22]; // (ax, ay, bx, by), ax/bx in -1..1, y in 0..1
uniform vec4 uW[22];   // width in x
out vec4 oColor;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float d = 1e6;
  for (int i = 0; i < 22; i++) {
    vec2 a = vec2((uSeg[i].x * 0.5 + 0.5) * aspect, uSeg[i].y);
    vec2 b = vec2((uSeg[i].z * 0.5 + 0.5) * aspect, uSeg[i].w);
    d = min(d, segDist(p, a, b) - uW[i].x * 0.5);
  }
  float px = 1.2 / uRes.y;
  float alpha = 1.0 - smoothstep(-px, px, d);
  if (alpha <= 0.001) discard;
  oColor = vec4(vec3(0.02, 0.023, 0.04), alpha);
}
`;

export const UMBRA_RIM_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec4 uSeg[22];
uniform vec4 uW[22];
uniform vec4 uLight;  // keyLight.xy, edgeWidth, intensity
uniform vec4 uAccent; // accent rgb
out vec4 oColor;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

float field(vec2 p, float aspect) {
  float d = 1e6;
  for (int i = 0; i < 22; i++) {
    vec2 a = vec2((uSeg[i].x * 0.5 + 0.5) * aspect, uSeg[i].y);
    vec2 b = vec2((uSeg[i].z * 0.5 + 0.5) * aspect, uSeg[i].w);
    d = min(d, segDist(p, a, b) - uW[i].x * 0.5);
  }
  return d;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float e = 1.5 / uRes.y;
  float d = field(p, aspect);
  float edge = 1.0 - smoothstep(0.0, uLight.z, abs(d));
  if (edge <= 0.002) discard;
  float gx = field(p + vec2(e, 0.0), aspect) - field(p - vec2(e, 0.0), aspect);
  float gy = field(p + vec2(0.0, e), aspect) - field(p - vec2(0.0, e), aspect);
  vec2 n = normalize(vec2(gx, gy) + vec2(1e-5, 0.0));
  vec2 l = normalize(uLight.xy);
  float facing = pow(clamp(dot(n, l) * 0.5 + 0.5, 0.0, 1.0), 2.0);
  oColor = vec4(uAccent.rgb * (edge * facing * uLight.w), 1.0);
}
`;

export const UMBRA_PART_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec4 uPts[64]; // x, y, size, brightness
uniform float uCount;
out vec4 oColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 col = vec3(0.0);
  int n = int(min(uCount, 64.0));
  for (int i = 0; i < 64; i++) {
    if (i >= n) break;
    vec4 q = uPts[i];
    float d = distance(vec2(uv.x * aspect, uv.y), vec2(q.x * aspect, q.y));
    col += vec3(0.7, 0.8, 1.0) * (smoothstep(q.z, 0.0, d) * q.w);
  }
  if (dot(col, col) <= 1e-6) discard;
  oColor = vec4(col * 0.5, 1.0);
}
`;
