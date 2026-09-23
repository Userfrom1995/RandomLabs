// Umbra M2: seeded AI tests (headless, node:test + assert).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../src/rng.js";
import { createAI, aiInput, ARCHETYPES } from "../src/combat/ai.js";

const selfInRange = { x: 0, hp: 100, state: "idle" };
const foeInRange = { x: 0.2, hp: 100, state: "idle" };
const foeAttacking = { x: 0.25, hp: 100, state: "attack" };

function runAI({ seed, difficulty, archetype }, self, foe, ticks) {
  const ai = createAI({ seed, difficulty, archetype });
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const inputs = [];
  for (let t = 0; t < ticks; t++) inputs.push(aiInput(ai, self, foe, rng, t));
  return inputs;
}

function countStrikes(inputs) {
  return inputs.filter((i) => i.punch || i.kick || i.special).length;
}

describe("ai determinism", () => {
  it("same seed + same states give identical inputs", () => {
    for (const archetype of ARCHETYPES) {
      const a = runAI({ seed: 375, difficulty: 1, archetype }, selfInRange, foeInRange, 300);
      const b = runAI({ seed: 375, difficulty: 1, archetype }, selfInRange, foeInRange, 300);
      assert.deepEqual(a, b);
    }
  });
  it("different seeds diverge", () => {
    const a = runAI({ seed: 1, difficulty: 1, archetype: "brawler" }, selfInRange, foeInRange, 300);
    const b = runAI({ seed: 2, difficulty: 1, archetype: "brawler" }, selfInRange, foeInRange, 300);
    assert.notDeepEqual(a, b);
  });
  it("unknown archetype falls back to brawler deterministically", () => {
    const a = runAI({ seed: 5, difficulty: 0, archetype: "nope" }, selfInRange, foeInRange, 100);
    const b = runAI({ seed: 5, difficulty: 0, archetype: "brawler" }, selfInRange, foeInRange, 100);
    assert.deepEqual(a, b);
  });
});

describe("ai difficulty", () => {
  it("higher difficulty attacks measurably more in range", () => {
    const strikes = [0, 1, 2].map(
      (difficulty) =>
        countStrikes(runAI({ seed: 375, difficulty, archetype: "brawler" }, selfInRange, foeInRange, 600)),
    );
    assert.ok(strikes[2] > strikes[0], `d2=${strikes[2]} not above d0=${strikes[0]}`);
    assert.ok(strikes[1] >= strikes[0], `d1=${strikes[1]} below d0=${strikes[0]}`);
  });
  it("higher difficulty reacts on a shorter schedule", () => {
    const fast = createAI({ seed: 1, difficulty: 2 });
    const slow = createAI({ seed: 1, difficulty: 0 });
    assert.ok(fast.nextThink === 0 && slow.nextThink === 0);
    aiInput(fast, selfInRange, foeInRange, mulberry32(1), 0);
    aiInput(slow, selfInRange, foeInRange, mulberry32(1), 0);
    assert.ok(fast.nextThink <= slow.nextThink, `fast=${fast.nextThink} slow=${slow.nextThink}`);
  });
  it("turtle blocks more than brawler under pressure", () => {
    const turtle = runAI({ seed: 11, difficulty: 1, archetype: "turtle" }, selfInRange, foeAttacking, 300);
    const brawler = runAI({ seed: 11, difficulty: 1, archetype: "brawler" }, selfInRange, foeAttacking, 300);
    const blocks = (xs) => xs.filter((i) => i.block).length;
    assert.ok(blocks(turtle) > blocks(brawler), `turtle=${blocks(turtle)} brawler=${blocks(brawler)}`);
  });
  it("zoner keeps distance from a close foe", () => {
    const close = { x: 0.1, hp: 100, state: "idle" };
    const zoner = runAI({ seed: 21, difficulty: 1, archetype: "zoner" }, selfInRange, close, 200);
    const retreats = zoner.filter((i) => i.move === -1).length;
    assert.ok(retreats > 40, `zoner retreated only ${retreats}/200 ticks`);
  });
});

describe("ai output validity", () => {
  it("600 ticks across archetypes and difficulties stay valid with no NaN", () => {
    for (const archetype of ARCHETYPES) {
      for (let difficulty = 0; difficulty <= 2; difficulty++) {
        const inputs = runAI({ seed: 99, difficulty, archetype }, selfInRange, foeAttacking, 600);
        for (const i of inputs) {
          assert.ok([-1, 0, 1].includes(i.move), `bad move ${i.move}`);
          assert.ok([-1, 0, 1].includes(i.dash), `bad dash ${i.dash}`);
          for (const k of ["crouch", "jump", "punch", "kick", "block", "special"]) {
            assert.equal(typeof i[k], "boolean", `bad ${k}: ${i[k]}`);
          }
          assert.ok(!Object.values(i).some((v) => typeof v === "number" && Number.isNaN(v)));
        }
      }
    }
  });
});
