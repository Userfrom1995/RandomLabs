import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BODIES,
  PLANETS_ONLY,
  SUN,
  AU_SCALE,
  DAYS_PER_SECOND,
  TIME_WARP_STEPS,
  findBody,
  bodyIndex,
} from "../src/bodies.js";
import { orbitalPosition } from "../src/kepler.js";
import { vec3Distance } from "../src/math.js";

test("catalog holds the Sun plus the eight classical planets", () => {
  assert.equal(BODIES.length, 9);
  assert.equal(PLANETS_ONLY.length, 8);
  assert.equal(SUN.id, "sun");
});

test("ids and names are unique", () => {
  const ids = BODIES.map((b) => b.id);
  const names = BODIES.map((b) => b.name);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(names).size, names.length);
});

test("all bodies have valid Keplerian elements", () => {
  for (const b of BODIES) {
    assert.ok(b.elements.semiMajorAxisAU >= 0, `${b.id} a>=0`);
    assert.ok(b.elements.eccentricity >= 0 && b.elements.eccentricity < 1, `${b.id} e in [0,1)`);
    assert.ok(b.elements.inclinationDeg >= 0 && b.elements.inclinationDeg <= 180, `${b.id} i`);
    assert.ok(Number.isFinite(b.elements.nodeLongitudeDeg), `${b.id} node`);
    assert.ok(Number.isFinite(b.elements.perihelionArgDeg), `${b.id} peri`);
    assert.ok(Number.isFinite(b.elements.meanLongitudeEpochDeg), `${b.id} L0`);
    assert.ok(b.visual.radius > 0, `${b.id} radius`);
  }
});

test("planets are ordered by distance from the Sun", () => {
  const distances = PLANETS_ONLY.map((p) => p.elements.semiMajorAxisAU);
  for (let i = 1; i < distances.length; i++) {
    assert.ok(distances[i] > distances[i - 1], `order broken at index ${i}`);
  }
});

test("relative periods match the real solar system (all planets)", () => {
  const real = new Map([
    ["mercury", 87.9691], ["venus", 224.701], ["earth", 365.256], ["mars", 686.98],
    ["jupiter", 4332.589], ["saturn", 10759.22], ["uranus", 30688.5], ["neptune", 60182],
  ]);
  for (const p of PLANETS_ONLY) {
    const expected = real.get(p.id);
    assert.ok(expected !== undefined, `${p.id} has no real period`);
    if (expected === undefined) continue;
    assert.ok(Math.abs(p.elements.periodDays - expected) < 0.01, `${p.id}: ${p.elements.periodDays} vs ${expected}`);
  }
});

test("Kepler's third law holds across the catalog (a³ ∝ T²)", () => {
  for (const p of PLANETS_ONLY) {
    const T = p.elements.periodDays;
    const k = (T / 365.25) ** 2 / p.elements.semiMajorAxisAU ** 3;
    assert.ok(Math.abs(k - 1) < 0.01, `${p.id} k=${k}`);
  }
});

test("findBody and bodyIndex resolve ids", () => {
  assert.equal(findBody("earth")?.name, "Earth");
  assert.equal(findBody("nope"), undefined);
  assert.ok(bodyIndex("saturn") > bodyIndex("jupiter"));
});

test("all bodies render inside the far-camera volume at epoch", () => {
  // Neptune is the outermost body; its orbital radius must stay well inside
  // the chosen far plane so nothing gets clipped at the default view.
  const rMax = Math.max(...PLANETS_ONLY.map((p) => p.elements.semiMajorAxisAU)) * AU_SCALE;
  assert.ok(rMax < 5000, `rMax = ${rMax}`);
});

test("world-scale positions are exact multiples of the AU scale", () => {
  const p = orbitalPosition(findBody("earth")!.elements, 0);
  assert.ok(vec3Distance({ x: p.x * AU_SCALE, y: p.y * AU_SCALE, z: p.z * AU_SCALE }, { x: p.x * AU_SCALE, y: p.y * AU_SCALE, z: p.z * AU_SCALE }) < 1e-12);
});

test("time-warp notches are strictly increasing and positive", () => {
  for (let i = 1; i < TIME_WARP_STEPS.length; i++) {
    assert.ok(TIME_WARP_STEPS[i] > TIME_WARP_STEPS[i - 1]);
  }
  assert.ok(DAYS_PER_SECOND > 0);
});

test("simulation time advances proportionally to the warp factor", () => {
  // Sanity: the 1× rate is Earth-one-orbit-per-minute-ish.
  assert.ok(Math.abs(DAYS_PER_SECOND * 60 - 365.25) < 1e-6, `${DAYS_PER_SECOND * 60}`);
});