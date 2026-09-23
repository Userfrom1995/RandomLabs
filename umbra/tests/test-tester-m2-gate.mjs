// Umbra M2: Tester gate - hostile dynamic regression suite (node:test + assert).
// Covers the review-fix invariants from a black-box bout level: determinism,
// soak stability, corrupt-input resilience, same-tick trades, KO reachability,
// guard-break under block pressure, edge-gated strikes, and combo hygiene.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFight, stepFight, hashState } from "../src/combat/engine.js";

const IDLE = {
  move: 0, crouch: false, jump: false, punch: false,
  kick: false, block: false, special: false, dash: 0,
};
const JAB = { ...IDLE, punch: true };
const BLOCK = { ...IDLE, block: true };

function closeQuarters(seed) {
  const s = createFight({ seed });
  s.phase = "fight";
  s.fighters[0].x = -0.1;
  s.fighters[1].x = 0.1;
  s.fighters[1].facing = -1;
  return s;
}

describe("tester gate: determinism and stability", () => {
  it("600-tick scripted bouts are byte-identical across runs", () => {
    const run = () => {
      const s = createFight({ seed: 4242 });
      s.phase = "fight";
      for (let t = 0; t < 600; t++) {
        const p = {
          ...IDLE,
          move: (t % 7) - 3 > 1 ? 1 : (t % 7) - 3 < -1 ? -1 : 0,
          punch: t % 23 === 0,
          kick: t % 31 === 0,
          block: t % 40 < 5,
        };
        stepFight(s, { ...p }, { ...IDLE, punch: t % 29 === 0 });
      }
      return s;
    };
    const a = run();
    const b = run();
    assert.equal(hashState(a), hashState(b));
    assert.equal(JSON.stringify(a.events), JSON.stringify(b.events));
  });

  it("10k hostile ticks stay finite with no NaN leakage", () => {
    const s = createFight({ seed: 7 });
    s.phase = "fight";
    const hot = {
      move: 1, crouch: true, jump: true, punch: true,
      kick: true, block: true, special: true, dash: 1,
    };
    for (let t = 0; t < 10000; t++) stepFight(s, { ...hot }, { ...hot });
    const raw = JSON.stringify(s);
    assert.ok(!raw.includes("NaN"), "NaN leaked into state");
    for (const f of s.fighters) {
      for (const k of ["x", "y", "vx", "vy", "hp", "stamina"]) {
        assert.ok(Number.isFinite(f[k]), `${k} = ${f[k]}`);
      }
    }
  });

  it("corrupt and garbage inputs never throw", () => {
    let s = createFight({ seed: 1 });
    s.phase = "fight";
    const garbage = [
      undefined, null, {}, { p1: null },
      { p1: { move: 9999, attack: 99 } },
      { move: "left", punch: "yes", dash: 1e9 },
      42, "punch", [],
    ];
    for (const bad of garbage) {
      assert.doesNotThrow(() => { s = stepFight(s, bad, bad); });
    }
  });
});

describe("tester gate: fight mechanics under fire", () => {
  it("same-tick trades damage BOTH fighters (no first-stepper win)", () => {
    const s = closeQuarters(5);
    const hp0 = [s.fighters[0].hp, s.fighters[1].hp];
    stepFight(s, { ...JAB }, { ...JAB });
    for (let t = 0; t < 40; t++) stepFight(s, { ...IDLE }, { ...IDLE });
    assert.ok(s.fighters[0].hp < hp0[0], "P0 took no trade damage");
    assert.ok(s.fighters[1].hp < hp0[1], "P1 took no trade damage");
  });

  it("KO is reachable by an attacker that re-approaches", () => {
    const s = closeQuarters(9);
    s.fighters[1].hp = 30;
    let ko = false;
    let t = 0;
    for (; t < 3000 && !ko; t++) {
      const d = s.fighters[1].x - s.fighters[0].x;
      const adv = d > 0.18 ? { ...IDLE, move: 1 } : { ...IDLE };
      stepFight(s, t % 25 === 0 && d <= 0.25 ? { ...adv, punch: true } : adv, { ...IDLE });
      ko = s.fighters.some((f) => f.state === "ko");
    }
    assert.ok(ko, `no KO within ${t} ticks`);
    assert.ok(s.events.some((e) => e.t === "ko"), "expected a ko event");
  });

  it("sustained block pressure emits a guardbreak event", () => {
    const s = closeQuarters(11);
    for (let t = 0; t < 6000; t++) {
      stepFight(s, t % 12 === 0 ? { ...JAB } : { ...IDLE }, { ...BLOCK });
    }
    assert.ok(
      s.events.some((e) => e.move === "guardbreak"),
      "expected a guardbreak event under block pressure",
    );
  });

  it("a held punch does not machine-gun attacks (edge-gated)", () => {
    const s = closeQuarters(21);
    let starts = 0;
    let prev = "idle";
    for (let t = 0; t < 120; t++) {
      stepFight(s, { ...JAB }, { ...IDLE });
      const st = s.fighters[0].state;
      if (st === "attack" && prev !== "attack") starts++;
      prev = st;
    }
    assert.ok(starts <= 3, `held punch started ${starts} attacks in 120 ticks`);
  });

  it("blocked pressure never feeds the attacker's combo", () => {
    const s = closeQuarters(13);
    for (let t = 0; t < 400; t++) {
      stepFight(s, t % 15 === 0 ? { ...JAB } : { ...IDLE }, { ...BLOCK });
    }
    assert.equal(s.fighters[0].combo, 0);
  });
});
