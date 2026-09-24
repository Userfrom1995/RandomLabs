// textures.ts — deterministic procedural planet textures. Each body kind is
// painted to an RGBA image from seeded value noise (see noise.ts), so the
// same seed always produces the same planet. Textures are painted once at
// startup into ImageData and uploaded straight to WebGL (no canvas needed).
//
// The texture coordinate convention matches the UV sphere: u runs around the
// equator (+X seam), v runs from the north pole (0) to the south pole (1).
// Texture rows are painted top-to-bottom, so row y maps to v = y / size.

import { Noise } from "./noise.js";
import { TextureKind } from "./bodies.js";
import { smoothstep } from "./math.js";
import { createEmptyTexture, uploadTexture } from "./gl.js";

export const TEXTURE_SIZE = 512;
export const RING_TEXTURE_SIZE = 256;
export const GLOW_TEXTURE_SIZE = 128;

/** Stable numeric seed derived from a name string. */
export const hashSeed = (name: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const lerpColor = (a: number[], b: number[], t: number): number[] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const WHITE: number[] = [255, 255, 255];

/** Paint `fn(x, y)` → [r, g, b, a] into an ImageData sized `size × size`. */
export const paintImage = (
  size: number,
  fn: (x: number, y: number) => [number, number, number, number],
): ImageData => {
  const img = new ImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = fn(x, y);
      const i = (y * size + x) * 4;
      d[i] = Math.max(0, Math.min(255, Math.round(r)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      d[i + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }
  return img;
};

/** Distance from the seam at u=0/1, for wrapping textures (0 = on seam). */
const seamDist = (u: number): number => Math.min(u, 1 - u);

/** Latitude factor: 1 at the poles, 0 at the equator (based on v). */
const polarFactor = (v: number): number => Math.abs(Math.cos(v * Math.PI));

const paintSun = (n: Noise, x: number, y: number): [number, number, number, number] => {
  const u = x / TEXTURE_SIZE;
  const v = y / TEXTURE_SIZE;
  const granule = n.fbm2(u * 24, v * 24, 5);
  const base = lerpColor([255, 250, 220], [255, 186, 60], granule);
  const spots = n.fbm2(u * 40 + 13.7, v * 40 - 7.3, 4);
  const spotFactor = smoothstep((spots - 0.7) / 0.12);
  const dark = lerpColor(base, [180, 84, 20], 0.85 * spotFactor);
  return [dark[0], dark[1], dark[2], 255];
};

const paintMercury = (n: Noise, x: number, y: number): [number, number, number, number] => {
  const u = x / TEXTURE_SIZE;
  const v = y / TEXTURE_SIZE;
  const f = n.fbm2(u * 24, v * 24, 6);
  let r = 118 + f * 70;
  let g = 112 + f * 64;
  let b = 104 + f * 56;
  const crater = n.value2(u * 64 + 3, v * 64 - 9);
  if (crater > 0.86) {
    const k = smoothstep((crater - 0.86) / 0.12);
    const shade = lerpColor([r, g, b], [70, 66, 62], k * 0.8);
    r = shade[0]; g = shade[1]; b = shade[2];
  }
  return [r, g, b, 255];
};

const paintVenus = (n: Noise, x: number, y: number): [number, number, number, number] => {
  const u = x / TEXTURE_SIZE;
  const v = y / TEXTURE_SIZE;
  const swirl = n.fbm2(u * 14 + 20, v * 14 - 30, 4, 2, 0.6);
  const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 10 + swirl * 5);
  const cream = lerpColor([226, 203, 142], [250, 232, 178], band);
  const r = cream[0] + (swirl - 0.5) * 24;
  const g = cream[1] + (swirl - 0.5) * 20;
  const b = cream[2] + (swirl - 0.5) * 12;
  return [r, g, b, 255];
};

const paintEarth = (n: Noise, x: number, y: number): [number, number, number, number] => {
  const u = x / TEXTURE_SIZE;
  const v = y / TEXTURE_SIZE;
  const elevation = n.fbm2(u * 8, v * 8, 6);
  const bias = n.fbm2(u * 3 + 11, v * 3 + 7, 4);
  const threshold = 0.46 + (bias - 0.5) * 0.34;
  const land = elevation > threshold;
  const detail = (n.fbm2(u * 48, v * 48, 4) - 0.5) * 0.22;
  if (polarFactor(v) > 0.88) {
    const ice = lerpColor([235, 242, 250], WHITE, n.fbm2(u * 10, v * 10, 3));
    return [ice[0], ice[1], ice[2], 255];
  }
  if (land) {
    const t = Math.min(1, Math.max(0, (elevation - threshold) / 0.5));
    const equator = 1 - Math.max(0, polarFactor(v) * 2 - 0.4);
    const green = lerpColor([60, 120, 48], [150, 140, 90], equator);
    const landColor = lerpColor(green, [178, 152, 108], t);
    const shaded = lerpColor(landColor, [30, 50, 30], Math.max(0, detail * -1));
    return [shaded[0], shaded[1], shaded[2], 255];
  }
  const deep = lerpColor([18, 56, 122], [38, 96, 168], n.fbm2(u * 20 + 5, v * 20 - 5, 4));
  const ocean = lerpColor(deep, [20, 60, 110], detail);
  return [ocean[0], ocean[1], ocean[2], 255];
};

const paintMars = (n: Noise, x: number, y: number): [number, number, number, number] => {
  const u = x / TEXTURE_SIZE;
  const v = y / TEXTURE_SIZE;
  if (polarFactor(v) > 0.9) {
    const ice = lerpColor([250, 245, 235], [220, 210, 195], n.fbm2(u * 12, v * 12, 3));
    return [ice[0], ice[1], ice[2], 255];
  }
  const f = n.fbm2(u * 18, v * 18, 6);
  const base = lerpColor([140, 68, 30], [216, 126, 62], f);
  const darkRegion = n.fbm2(u * 26 + 40, v * 26 - 12, 4);
  const darkFactor = smoothstep((darkRegion - 0.62) / 0.16);
  const shaded = lerpColor(base, [96, 44, 20], darkFactor * 0.75);
  return [shaded[0], shaded[1], shaded[2], 255];
};

const paintStriped = (
  n: Noise,
  x: number,
  y: number,
  bands: number,
  warpStrength: number,
  light: number[],
  dark: number[],
  spot?: { u: number; v: number; radius: number; color: number[] },
): [number, number, number, number] => {
  const u = x / TEXTURE_SIZE;
  const v = y / TEXTURE_SIZE;
  const turbulence = n.fbm2(u * 8 + 3, v * 20 - 7, 3);
  const vv = Math.min(1, Math.max(0, v + (turbulence - 0.5) * warpStrength));
  const phase = turbulence * 4;
  const stripe = Math.sin(vv * Math.PI * bands + phase);
  const tone = lerpColor(dark, light, 0.5 + 0.5 * stripe);
  const bandEdge = Math.abs(stripe) < 0.06;
  const edge = bandEdge ? lerpColor(tone, [0, 0, 0], 0.35) : tone;
  let r = edge[0];
  let g = edge[1];
  let b = edge[2];
  if (spot) {
    const du = seamDist(Math.abs(u - spot.u));
    const dv = Math.abs(v - spot.v);
    const d = Math.sqrt(du * du + dv * dv);
    if (d < spot.radius) {
      const k = smoothstep((d - spot.radius * 0.6) / (spot.radius * 0.4) + 1);
      const mix = lerpColor([r, g, b], spot.color, 1 - k);
      r = mix[0]; g = mix[1]; b = mix[2];
    }
  }
  return [r, g, b, 255];
};

const paintJupiter = (n: Noise, x: number, y: number): [number, number, number, number] =>
  paintStriped(
    n, x, y, 16, 0.09,
    [222, 198, 160], [150, 104, 66],
    { u: 0.78, v: 0.62, radius: 0.05, color: [196, 90, 50] },
  );

const paintSaturn = (n: Noise, x: number, y: number): [number, number, number, number] =>
  paintStriped(n, x, y, 10, 0.04, [224, 200, 150], [176, 148, 102]);

const paintUranus = (n: Noise, x: number, y: number): [number, number, number, number] => {
  const u = x / TEXTURE_SIZE;
  const v = y / TEXTURE_SIZE;
  const f = n.fbm2(u * 8, v * 8, 3) * 0.5 + n.fbm2(u * 4 + 20, v * 4 + 40, 3) * 0.5;
  const r = 138 + (f - 0.5) * 26;
  const g = 214 + (f - 0.5) * 22;
  const b = 228 + (f - 0.5) * 18;
  return [r, g, b, 255];
};

const paintNeptune = (n: Noise, x: number, y: number): [number, number, number, number] =>
  paintStriped(
    n, x, y, 14, 0.05,
    [82, 116, 222], [48, 74, 176],
    { u: 0.35, v: 0.55, radius: 0.05, color: [30, 52, 130] },
  );

/** Saturn's rings: radial bands with soft inner/outer fade. */
const paintRing = (n: Noise, x: number, y: number): [number, number, number, number] => {
  const u = x / RING_TEXTURE_SIZE;
  const t = y / RING_TEXTURE_SIZE;
  const fade = smoothstep(t / 0.08) * (1 - smoothstep((t - 0.86) / 0.14));
  const band = 0.5 + 0.5 * Math.sin(t * 46 + n.fbm2(u * 12, t * 30, 3) * 3);
  const shade = lerpColor([212, 184, 148], [150, 122, 92], band);
  const alpha = fade * (0.72 + 0.28 * band);
  return [shade[0], shade[1], shade[2], alpha * 255];
};

/** Radial glow sprite: white core fading to transparent. */
const paintGlow = (size: number, x: number, y: number): [number, number, number, number] => {
  const dx = (x + 0.5) / size - 0.5;
  const dy = (y + 0.5) / size - 0.5;
  const d = Math.sqrt(dx * dx + dy * dy) * 2;
  const a = d >= 1 ? 0 : Math.pow(1 - d, 2.2);
  return [255, 255, 255, a * 255];
};

type Painter = (n: Noise, x: number, y: number) => [number, number, number, number];

const PAINTERS: Record<TextureKind, Painter> = {
  sun: paintSun,
  mercury: paintMercury,
  venus: paintVenus,
  earth: paintEarth,
  mars: paintMars,
  jupiter: paintJupiter,
  saturn: paintSaturn,
  uranus: paintUranus,
  neptune: paintNeptune,
};

/** Build a deterministic planet texture for a body kind. */
export const makeBodyTexture = (gl: WebGLRenderingContext, kind: TextureKind): WebGLTexture => {
  const painter = PAINTERS[kind];
  const seed = hashSeed(kind);
  const n = new Noise(seed);
  const img = paintImage(TEXTURE_SIZE, (x, y) => painter(n, x, y));
  const texture = createEmptyTexture(gl);
  uploadTexture(gl, texture, img, 0);
  return texture;
};

/** Build Saturn's ring texture (u = angle, v = radius). */
export const makeRingTexture = (gl: WebGLRenderingContext): WebGLTexture => {
  const n = new Noise(hashSeed("saturn-rings"));
  const img = paintImage(RING_TEXTURE_SIZE, (x, y) => paintRing(n, x, y));
  const texture = createEmptyTexture(gl);
  uploadTexture(gl, texture, img, 0);
  return texture;
};

/** Radial falloff sprite used for the sun's glow billboards. */
export const makeGlowTexture = (gl: WebGLRenderingContext): WebGLTexture => {
  const img = paintImage(GLOW_TEXTURE_SIZE, (x, y) => paintGlow(GLOW_TEXTURE_SIZE, x, y));
  const texture = createEmptyTexture(gl);
  uploadTexture(gl, texture, img, 0);
  return texture;
};