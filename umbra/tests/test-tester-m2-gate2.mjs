// Umbra M2: Tester gate part 2 - regression pins for the Evaluator 9.6 -> 9.8
// fix pass (node:test + assert). Black-box coverage of the five gaps:
// golden hashState literal, maxHp/event-content digest sensitivity,
// bout-table AI bands, keyboard.clear on fight start, multi-seed replay.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mulberry32 } from "../src/rng.js";
import { MOVES } from "../src/combat/moves.js";
import {
  createFight,
  stepFight,
  hashState,
  eventsDigest,
} from "../src/combat/engine.js";
import { aiInput, createAI } from "../src/combat/ai.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

function scriptedInputs(seed, n) {
  const rng = mulberry32(seed);
  const mk = () => {
    const dash = rng() < 0.05 ? (rng() < 0.5 ? -1 : 1) : 0;
    return {
      move: Math.floor(rng() * 3) - 1,
      crouch: rng() < 0.1,
      jump: rng() < 0.04,
      punch: rng() < 0.15,
      kick: rng() < 0.12,
      block: rng() < 0.1,
      special: rng() < 0.03,
      dash,
    };
  };
  const p1 = [];
  const p2 = [];
  for (let i = 0; i < n; i++) {
    p1.push(mk());
    p2.push(mk());
  }
  return { p1, p2 };
}

function runBout(seed, p1, p2) {
  const s = createFight({ seed });
  for (let i = 0; i < p1.length; i++) stepFight(s, p1[i], p2[i]);
  return s;
}

describe("tester gate2: evaluator-gap pins", () => {
  it("golden 600-tick seed-375 hashState stays e9ef3be3", () => {
    const { p1, p2 } = scriptedInputs(375, 600);
    assert.equal(hashState(runBout(375, p1, p2)), "e9ef3be3");
  });

  it("hash is sensitive to maxHp bumps and event-content tweaks", () => {
    const { p1, p2 } = scriptedInputs(375, 600);
    const base = hashState(runBout(375, p1, p2));
    const bumped = runBout(375, p1, p2);
    bumped.fighters[0].maxHp += 1;
    assert.notEqual(hashState(bumped), base);
    const tweaked = runBout(375, p1, p2);
    assert.ok(tweaked.events.length > 0);
    tweaked.events[0] = { ...tweaked.events[0], damage: 999.5 };
    assert.notEqual(hashState(tweaked), base);
    assert.match(eventsDigest(tweaked.events), /^[0-9a-f]{8}$/);
  });

  it("AI strike bands follow the injected bout table, not static MOVES", () => {
    const self = { x: 0, hp: 100, state: "idle" };
    const foeNear = { x: 0.5, hp: 100, state: "idle" };
    const longReach = {
      ...MOVES,
      jab: { ...MOVES.jab, range: 0.9 },
      kick: { ...MOVES.kick, range: 0.9 },
      sweep: { ...MOVES.sweep, range: 0.9 },
      uppercut: { ...MOVES.uppercut, range: 0.9 },
    };
    const count = (moves) => {
      const ai = createAI({ seed: 42, difficulty: 2, archetype: "brawler" });
      let strikes = 0;
      for (let t = 0; t < 600; t++) {
        const inp = aiInput(ai, self, foeNear, undefined, t, moves);
        if (inp.punch || inp.kick || inp.special) strikes++;
      }
      return strikes;
    };
    assert.equal(count(undefined), 0, "default table must whiff at dist 0.5");
    assert.ok(count(longReach) > 0, "bout table reach must unlock strikes");
  });

  it("replay is byte-identical on a 10-seed spot sweep", () => {
    for (let seed = 2000; seed < 2010; seed++) {
      const { p1, p2 } = scriptedInputs(seed, 200);
      const a = runBout(seed, p1, p2);
      const b = runBout(seed, p1, p2);
      assert.equal(hashState(a), hashState(b), `seed ${seed} hash`);
      assert.equal(JSON.stringify(a.events), JSON.stringify(b.events), `seed ${seed} events`);
    }
  });

  it("shell clears keyboard levels on fight start and drains edges on screens", () => {
    const app = read("app.js");
    assert.ok(app.includes("keyboard.clear()"), "startFight must call keyboard.clear()");
    // drainInputs is the screen-transition path; it must clear levels, not just edges.
    const drain = app.match(/function drainInputs\(\)[\s\S]*?\n\}/);
    assert.ok(drain, "drainInputs() must exist");
    assert.ok(drain[0].includes("keyboard.clear()"), "drainInputs must clear keyboard levels");
  });

  it("shell keeps a11y and remap invariants (no live-region spam, safe remap)", () => {
    const html = read("index.html");
    const app = read("app.js");
    assert.equal((html.match(/aria-live/g) || []).length, 0, "no aria-live region may poll at 60Hz");
    assert.ok(html.includes('role="progressbar"'), "health fills need progressbar roles");
    assert.ok(app.includes("stopImmediatePropagation"), "remap capture must isolate Escape");
    assert.ok(!app.includes("prompt("), "no blocking prompt() in shell");
    assert.ok(app.includes("touch.reset") || app.includes("touch.reset()"), "touch state must reset");
  });
});
