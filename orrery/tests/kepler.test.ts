import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KeplerElements,
  solveKepler,
  meanAnomalyAt,
  orbitalPeriodDays,
  orbitalPosition,
  orbitalSpeedAUPerDay,
  orbitPath,
} from "../src/kepler.js";
import { vec3Distance } from "../src/math.js";

const DEG = Math.PI / 180;

const earth: KeplerElements = {
  semiMajorAxisAU: 1,
  periodDays: 365.256,
  eccentricity: 0.01671,
  inclinationDeg: 0,
  nodeLongitudeDeg: 0,
  perihelionArgDeg: 114.208,
  meanLongitudeEpochDeg: 100.464,
};

const mercury: KeplerElements = {
  semiMajorAxisAU: 0.387098,
  periodDays: 87.9691,
  eccentricity: 0.20563,
  inclinationDeg: 7.005,
  nodeLongitudeDeg: 48.331,
  perihelionArgDeg: 29.124,
  meanLongitudeEpochDeg: 252.251,
};

test("orbitalPeriodDays follows Kepler's third law (T ∝ a^1.5)", () => {
  assert.ok(Math.abs(orbitalPeriodDays(1) - 365.25) < 1e-9, "Earth period is exactly one year");
  const ratio = orbitalPeriodDays(mercury.semiMajorAxisAU) / orbitalPeriodDays(1);
  assert.ok(Math.abs(ratio - 0.24085) < 0.01, `Mercury/Earth period ratio = ${ratio} (expected ≈0.24085)`);
  const jupiter = orbitalPeriodDays(5.202603);
  assert.ok(Math.abs(jupiter / 365.25 - 11.862) < 0.05, `Jupiter period ≈ 11.86 y, got ${jupiter / 365.25}`);
});

test("catalogued real periods follow Kepler's third law within 1%", () => {
  // The catalog stores real periods; they must be consistent with a^1.5.
  const pairs = [
    [0.387098, 87.9691], [0.723332, 224.701], [1.000001, 365.256], [1.523679, 686.98],
    [5.202603, 4332.589], [9.537, 10759.22], [19.19126, 30688.5], [30.11, 60182],
  ];
  for (const [a, T] of pairs) {
    const implied = orbitalPeriodDays(a);
    const rel = Math.abs(implied - T) / T;
    assert.ok(rel < 0.01, `a=${a}: implied ${implied} vs real ${T} (rel ${rel})`);
  }
});

test("solveKepler satisfies M = E − e·sin(E) for many samples", () => {
  for (const e of [0, 0.1, 0.5, 0.9, 0.98]) {
    for (let i = 0; i < 40; i++) {
      const M = (i / 40) * Math.PI * 2;
      const E = solveKepler(M, e);
      const residual = Math.abs(E - e * Math.sin(E) - M);
      assert.ok(residual < 1e-8, `e=${e} M=${M} residual=${residual}`);
    }
  }
});

test("meanAnomalyAt is periodic with the orbital period", () => {
  const T = earth.periodDays;
  const m0 = meanAnomalyAt(earth, 0);
  assert.ok(Math.abs(meanAnomalyAt(earth, T) - m0) < 1e-9);
  assert.ok(Math.abs(meanAnomalyAt(earth, T * 1000 + 123) - meanAnomalyAt(earth, 123)) < 1e-9);
});

test("position is periodic: p(t) == p(t + T)", () => {
  const T = earth.periodDays;
  for (const t of [0, 10, 1000]) {
    const a = orbitalPosition(earth, t);
    const b = orbitalPosition(earth, t + T);
    assert.ok(vec3Distance(a, b) < 1e-9, `t=${t} Δ=${vec3Distance(a, b)}`);
  }
});

test("a circular orbit (e=0) keeps a constant heliocentric distance", () => {
  const circ: KeplerElements = { ...earth, eccentricity: 0 };
  for (const t of [0, 30, 91, 200, 400]) {
    const p = orbitalPosition(circ, t);
    const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    assert.ok(Math.abs(r - 1) < 1e-9, `t=${t} r=${r}`);
  }
});

test("Earth's zero inclination keeps it in the ecliptic plane (z ≈ 0)", () => {
  for (const t of [0, 10, 123, 500, 1000]) {
    const p = orbitalPosition(earth, t);
    assert.ok(Math.abs(p.z) < 1e-12, `t=${t} z=${p.z}`);
  }
});

test("inner planets move faster than outer ones", () => {
  const neptune: KeplerElements = {
    semiMajorAxisAU: 30.11, periodDays: 60182, eccentricity: 0.00899, inclinationDeg: 1.77,
    nodeLongitudeDeg: 131.784, perihelionArgDeg: 276.336, meanLongitudeEpochDeg: 304.88,
  };
  const vMerc = orbitalSpeedAUPerDay(mercury, 0);
  const vEarth = orbitalSpeedAUPerDay(earth, 0);
  const vNep = orbitalSpeedAUPerDay(neptune, 0);
  assert.ok(vMerc > vEarth && vEarth > vNep, `${vMerc} > ${vEarth} > ${vNep}`);
});

test("orbitalSpeedAUPerDay matches circular-orbit speed for e=0", () => {
  const circ: KeplerElements = { ...earth, eccentricity: 0 };
  const speed = orbitalSpeedAUPerDay(circ, 0);
  const expected = (2 * Math.PI) / 365.25;
  assert.ok(Math.abs(speed - expected) / expected < 1e-3, `got ${speed}, expected ${expected}`);
});

test("orbitPath returns the requested number of points on the ellipse", () => {
  const pts = orbitPath(mercury, 128);
  assert.equal(pts.length, 128);
  const focus = (i: number): number => Math.sqrt(pts[i].x ** 2 + pts[i].y ** 2 + pts[i].z ** 2);
  const a = mercury.semiMajorAxisAU;
  const minR = Math.min(...pts.map((_, i) => focus(i)));
  const maxR = Math.max(...pts.map((_, i) => focus(i)));
  assert.ok(minR >= a * (1 - mercury.eccentricity) - 1e-6, `minR=${minR}`);
  assert.ok(maxR <= a * (1 + mercury.eccentricity) + 1e-6, `maxR=${maxR}`);
});

test("perihelion and aphelion sit on opposite sides", () => {
  // Perihelion is reached when the mean anomaly crosses zero.
  const m0 = (mercury.meanLongitudeEpochDeg - mercury.nodeLongitudeDeg - mercury.perihelionArgDeg) * DEG;
  const n = (2 * Math.PI) / mercury.periodDays;
  const tRaw = -m0 / n;
  const tPeri = tRaw - Math.floor(tRaw / mercury.periodDays) * mercury.periodDays;
  const peri = orbitalPosition(mercury, tPeri);
  const periDist = vec3Distance(peri, { x: 0, y: 0, z: 0 });
  const a = mercury.semiMajorAxisAU;
  assert.ok(Math.abs(periDist - a * (1 - mercury.eccentricity)) < 1e-3, `perihelion ${periDist}`);
  const apo = orbitalPosition(mercury, tPeri + mercury.periodDays / 2);
  const apoDist = vec3Distance(apo, { x: 0, y: 0, z: 0 });
  assert.ok(Math.abs(apoDist - a * (1 + mercury.eccentricity)) < 1e-3, `aphelion ${apoDist}`);
});

test("angles in degrees: DEG constant sanity", () => {
  assert.ok(Math.abs(DEG * 180 - Math.PI) < 1e-12);
});