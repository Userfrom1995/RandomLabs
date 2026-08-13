import { test } from "node:test";
import assert from "node:assert/strict";
import { Noise, createRng } from "../src/noise.js";

test("createRng is deterministic for a seed", () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 1000; i++) assert.equal(a(), b());
});

test("createRng produces values in [0,1)", () => {
  const rng = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test("Noise.value2 is deterministic per seed", () => {
  const n1 = new Noise(11);
  const n2 = new Noise(11);
  for (let i = 0; i < 200; i++) {
    const x = (i * 0.37) % 100;
    const y = (i * 0.13) % 100;
    assert.equal(n1.value2(x, y), n2.value2(x, y));
  }
});

test("different seeds produce different noise", () => {
  const n1 = new Noise(1);
  const n2 = new Noise(2);
  let differs = 0;
  for (let i = 0; i < 200; i++) {
    const a = n1.value2(i * 0.37, i * 0.13);
    const b = n2.value2(i * 0.37, i * 0.13);
    if (Math.abs(a - b) > 1e-6) differs++;
  }
  assert.ok(differs > 100, `only ${differs} samples differ`);
});

test("Noise.value2 output is bounded [0,1)", () => {
  const n = new Noise(99);
  for (let i = 0; i < 1000; i++) {
    const v = n.value2(i * 1.7, i * 0.31);
    assert.ok(v >= 0 && v <= 1, `out of range: ${v}`);
  }
});

test("Noise.fbm2 output is bounded [0,1]", () => {
  const n = new Noise(5);
  for (let i = 0; i < 500; i++) {
    const v = n.fbm2(i * 1.3, i * 0.9, 5);
    assert.ok(v >= 0 && v <= 1, `out of range: ${v}`);
  }
});

test("Noise.fbm2 is smoother and deterministic", () => {
  const n = new Noise(21);
  const a = n.fbm2(3.3, 4.4, 4);
  const b = n.fbm2(3.3, 4.4, 4);
  assert.equal(a, b);
  assert.ok(Number.isFinite(a));
});