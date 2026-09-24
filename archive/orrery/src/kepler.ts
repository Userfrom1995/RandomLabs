// kepler.ts — Keplerian orbital mechanics. Pure functions, no DOM/WebGL.
//
// Uses the classical six elements. Angles in degrees (the way they are
// catalogued), positions returned in AU in the J2000 ecliptic frame with the
// Sun at the origin.

import { Vec3, vec3, wrapAngle } from "./math.js";

export interface KeplerElements {
  /** Semi-major axis in AU. */
  semiMajorAxisAU: number;
  /** Sidereal orbital period in days (real value, independent of the fit). */
  periodDays: number;
  /** Orbital eccentricity, 0 ≤ e < 1. */
  eccentricity: number;
  /** Inclination to the ecliptic, degrees. */
  inclinationDeg: number;
  /** Longitude of the ascending node, degrees. */
  nodeLongitudeDeg: number;
  /** Argument of perihelion, degrees. */
  perihelionArgDeg: number;
  /** Mean longitude at epoch (Ω + ω + M₀), degrees. */
  meanLongitudeEpochDeg: number;
}

const DEG2RAD = Math.PI / 180;

/** Solve Kepler's equation M = E − e·sin E for the eccentric anomaly E. */
export const solveKepler = (meanAnomaly: number, eccentricity: number): number => {
  const e = eccentricity;
  let E = e < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 40; i++) {
    const d = E - e * Math.sin(E) - meanAnomaly;
    const denom = 1 - e * Math.cos(E);
    const step = denom === 0 ? d * 0.5 : d / denom;
    E -= step;
    if (Math.abs(step) < 1e-11) break;
  }
  return E;
};

/** Mean anomaly at a given time (days from epoch). */
export const meanAnomalyAt = (elements: KeplerElements, daysFromEpoch: number): number => {
  const m0 = (elements.meanLongitudeEpochDeg - elements.nodeLongitudeDeg - elements.perihelionArgDeg) * DEG2RAD;
  const n = (2 * Math.PI) / elements.periodDays;
  return wrapAngle(m0 + n * daysFromEpoch);
};

/**
 * Kepler's third law, T ∝ a^(3/2), with T=1 (in Earth-orbit units, i.e. one
 * Earth year = 365.25 days) for a = 1 AU. Returns the period in days implied
 * by the semi-major axis — used as a consistency check against the catalogued
 * real periods, which are stored independently.
 */
export const orbitalPeriodDays = (semiMajorAxisAU: number): number =>
  365.25 * Math.pow(semiMajorAxisAU, 1.5);

/** Heliocentric position (AU, J2000 ecliptic frame) of a body at time t. */
export const orbitalPosition = (elements: KeplerElements, daysFromEpoch: number): Vec3 => {
  const M = meanAnomalyAt(elements, daysFromEpoch);
  const e = elements.eccentricity;
  const E = solveKepler(M, e);
  const sinE = Math.sin(E);
  const cosE = Math.cos(E);

  const xOrb = elements.semiMajorAxisAU * (cosE - e);
  const yOrb = elements.semiMajorAxisAU * Math.sqrt(1 - e * e) * sinE;

  const inc = elements.inclinationDeg * DEG2RAD;
  const node = elements.nodeLongitudeDeg * DEG2RAD;
  const peri = elements.perihelionArgDeg * DEG2RAD;
  const cosNode = Math.cos(node), sinNode = Math.sin(node);
  const cosInc = Math.cos(inc), sinInc = Math.sin(inc);
  const cosPeri = Math.cos(peri), sinPeri = Math.sin(peri);

  return vec3(
    (cosNode * cosPeri - sinNode * sinPeri * cosInc) * xOrb +
      (-cosNode * sinPeri - sinNode * cosPeri * cosInc) * yOrb,
    (sinNode * cosPeri + cosNode * sinPeri * cosInc) * xOrb +
      (-sinNode * sinPeri + cosNode * cosPeri * cosInc) * yOrb,
    (sinPeri * sinInc) * xOrb + (cosPeri * sinInc) * yOrb,
  );
};

/** Orbital velocity (AU/day) computed by central finite difference. */
export const orbitalSpeedAUPerDay = (elements: KeplerElements, daysFromEpoch: number): number => {
  const h = Math.max(elements.periodDays / 4000, 1e-4);
  const a = orbitalPosition(elements, daysFromEpoch - h);
  const b = orbitalPosition(elements, daysFromEpoch + h);
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) / (2 * h);
};

/** Sample a full orbit as a polyline of Vec3 (AU, ecliptic frame). */
export const orbitPath = (elements: KeplerElements, segments: number): Vec3[] => {
  const pts: Vec3[] = [];
  for (let i = 0; i < segments; i++) {
    const days = (i / segments) * elements.periodDays;
    pts.push(orbitalPosition(elements, days));
  }
  return pts;
};