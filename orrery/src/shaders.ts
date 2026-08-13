// shaders.ts — GLSL 1.00 shader sources for the orrery. Three programs:
//
//   lit     — textured Phong lighting (planets, rings, the sun). Light comes
//             from the sun at the origin; direction is passed per-draw.
//   unlit   — flat-colored lines and points (orbits, stars, selection ring).
//   sprite  — camera-facing billboard quads with an alpha texture (sun glow).
//
// All sources are template literals kept at the top for visibility.

const VERTEX_LIT = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vTexCoord;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = uNormalMatrix * aNormal;
  vTexCoord = aTexCoord;
  gl_Position = uProjection * uView * world;
}
`;

const FRAGMENT_LIT = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec3 uLightDir;
uniform vec3 uCameraPos;
uniform vec3 uBaseColor;
uniform float uAlbedo;
uniform float uSpecular;
uniform float uShininess;
uniform float uEmissive;
uniform float uAlpha;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vTexCoord;
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  vec3 texColor = texture2D(uTexture, vTexCoord).rgb * uBaseColor;
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 H = normalize(L + V);
  float ndl = max(dot(N, L), 0.0);
  float ndh = pow(max(dot(N, H), 0.0), uShininess);
  vec3 ambient = texColor * 0.06;
  vec3 diffuse = texColor * uAlbedo * ndl;
  vec3 specular = vec3(uSpecular) * ndh * ndl;
  vec3 emissive = texColor * uEmissive;
  gl_FragColor = vec4(ambient + diffuse + specular + emissive, uAlpha);
}
`;

const VERTEX_UNLIT = `
attribute vec3 aPosition;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform float uPointSize;
void main() {
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  gl_PointSize = uPointSize;
}
`;

const FRAGMENT_UNLIT = `
precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
void main() {
  gl_FragColor = vec4(uColor, uAlpha);
}
`;

const VERTEX_SPRITE = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
varying vec2 vTexCoord;
void main() {
  vTexCoord = aTexCoord;
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}
`;

const FRAGMENT_SPRITE = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uAlpha;
varying vec2 vTexCoord;
void main() {
  float a = texture2D(uTexture, vTexCoord).a;
  gl_FragColor = vec4(uColor, a * uAlpha);
}
`;

export interface ShaderSource {
  vertex: string;
  fragment: string;
}

export const LIT_SOURCE: ShaderSource = { vertex: VERTEX_LIT, fragment: FRAGMENT_LIT };
export const UNLIT_SOURCE: ShaderSource = { vertex: VERTEX_UNLIT, fragment: FRAGMENT_UNLIT };
export const SPRITE_SOURCE: ShaderSource = { vertex: VERTEX_SPRITE, fragment: FRAGMENT_SPRITE };