// bodies.ts — the solar-system catalog: Keplerian elements (J2000, IAU/NASA
// values) plus per-body visual configuration. Pure data, no DOM/WebGL.

import { KeplerElements } from "./kepler.js";

/** One world unit = this many AU. 100 → Earth's orbit sits at radius 100. */
export const AU_SCALE = 100;

/** Simulation speed at the 1× notch: days simulated per real second. */
export const DAYS_PER_SECOND = 365.25 / 60; // Earth orbits once per 60 s at 1×

/** Epoch: J2000.0 = 2000-01-01 12:00 TT. */
export const EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Time-warp notches exposed by the +/- controls and the slider. */
export const TIME_WARP_STEPS = [0.05, 0.25, 1, 4, 16, 64, 256, 1024, 4096];

export type TextureKind =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export interface RingSpec {
  /** Inner radius as a multiple of the body radius. */
  innerRatio: number;
  /** Outer radius as a multiple of the body radius. */
  outerRatio: number;
}

export interface BodyVisual {
  kind: TextureKind;
  /** Display radius in world units (exaggerated for visibility — see README). */
  radius: number;
  /** Dominant surface tint, used as the procedural texture's base hue. */
  baseColor: [number, number, number];
  /** 0..1 diffuse boost. */
  albedo: number;
  /** Specular intensity 0..1. */
  specular: number;
  /** Specular power (exponent). */
  shininess: number;
  rings?: RingSpec;
}

export interface Body {
  id: string;
  name: string;
  elements: KeplerElements;
  visual: BodyVisual;
}

const el = (
  a: number,
  periodDays: number,
  e: number,
  i: number,
  node: number,
  peri: number,
  L0: number,
): KeplerElements => ({
  semiMajorAxisAU: a,
  periodDays,
  eccentricity: e,
  inclinationDeg: i,
  nodeLongitudeDeg: node,
  perihelionArgDeg: peri,
  meanLongitudeEpochDeg: L0,
});

export const SUN: Body = {
  id: "sun",
  name: "Sun",
  elements: el(0, 0, 0, 0, 0, 0, 0),
  visual: { kind: "sun", radius: 6, baseColor: [1.0, 0.85, 0.45], albedo: 0, specular: 0, shininess: 1 },
};

const PLANETS: Body[] = [
  {
    id: "mercury",
    name: "Mercury",
    elements: el(0.387098, 87.9691, 0.20563, 7.005, 48.331, 29.124, 252.251),
    visual: { kind: "mercury", radius: 0.7, baseColor: [0.55, 0.55, 0.58], albedo: 0.55, specular: 0.05, shininess: 2 },
  },
  {
    id: "venus",
    name: "Venus",
    elements: el(0.723332, 224.701, 0.00677, 3.395, 76.68, 54.884, 181.98),
    visual: { kind: "venus", radius: 1.0, baseColor: [0.92, 0.82, 0.55], albedo: 0.9, specular: 0.25, shininess: 8 },
  },
  {
    id: "earth",
    name: "Earth",
    elements: el(1.000001, 365.256, 0.01671, 0.0, 0.0, 114.208, 100.464),
    visual: { kind: "earth", radius: 1.1, baseColor: [0.2, 0.5, 0.9], albedo: 0.55, specular: 0.35, shininess: 16 },
  },
  {
    id: "mars",
    name: "Mars",
    elements: el(1.523679, 686.98, 0.0934, 1.85, 49.558, 286.502, 355.453),
    visual: { kind: "mars", radius: 0.9, baseColor: [0.75, 0.35, 0.2], albedo: 0.6, specular: 0.12, shininess: 6 },
  },
  {
    id: "jupiter",
    name: "Jupiter",
    elements: el(5.202603, 4332.589, 0.04849, 1.303, 100.556, 273.867, 34.404),
    visual: { kind: "jupiter", radius: 5.2, baseColor: [0.85, 0.72, 0.55], albedo: 0.8, specular: 0.15, shininess: 4 },
  },
  {
    id: "saturn",
    name: "Saturn",
    elements: el(9.537, 10759.22, 0.05551, 2.489, 113.716, 339.392, 49.945),
    visual: {
      kind: "saturn", radius: 4.4, baseColor: [0.9, 0.82, 0.62], albedo: 0.85, specular: 0.1, shininess: 4,
      rings: { innerRatio: 1.24, outerRatio: 2.27 },
    },
  },
  {
    id: "uranus",
    name: "Uranus",
    elements: el(19.19126, 30688.5, 0.0463, 0.773, 74.229, 96.998, 313.238),
    visual: { kind: "uranus", radius: 2.9, baseColor: [0.55, 0.85, 0.9], albedo: 0.85, specular: 0.2, shininess: 6 },
  },
  {
    id: "neptune",
    name: "Neptune",
    elements: el(30.11, 60182, 0.00899, 1.77, 131.784, 276.336, 304.88),
    visual: { kind: "neptune", radius: 2.8, baseColor: [0.25, 0.35, 0.9], albedo: 0.85, specular: 0.2, shininess: 6 },
  },
];

export const BODIES: Body[] = [SUN, ...PLANETS];

/** All bodies except the Sun (things you can orbit-focus meaningfully). */
export const PLANETS_ONLY: Body[] = PLANETS;

export const findBody = (id: string): Body | undefined => BODIES.find((b) => b.id === id);

export const bodyIndex = (id: string): number => BODIES.findIndex((b) => b.id === id);