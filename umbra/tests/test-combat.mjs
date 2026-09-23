// Umbra M2: deterministic combat core tests (headless, node:test + assert).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mulberry32 } from "../src/rng.js";
import { MOVES, moveList, validateMoves } from "../src/combat/moves.js";
import {
  attackHits,
  hitRange,
  segmentsOverlap,
  segSegDist,
} from "../src/combat/hitboxes.js";
import { createFighter, stepFighter } from "../src/combat/fighter.js";
import {
  COMBO_WINDOW,
  comboScale,
  comboTrack,
  comboReset,
  registerHit,
  advanceCombo,
} from "../src/combat/combos.js";
import {
  createFight,
  stepFight,
  sanitizeInput,
  hashState,
  resetRound,
  edgeGate,
  movesDigest,
  INTRO_TICKS,
} from "../src/combat/engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function makeDuel(seed = 375) {
  const events = [];
  const base = { seed, events, moveTable: MOVES };
  return {
    events,
    step(att, def, attInput, defInput, tick) {
      stepFighter(att, attInput, { ...base, tick, foe: def, side: 0 });
      stepFighter(def, defInput, { ...base, tick, foe: att, side: 1 });
    },
  };
}

/** Random but seeded input script of n ticks. */
function scriptedInputs(seed, n) {
  const rng = mulberry32(seed);
  const p1 = [];
  const p2 = [];
  for (let i = 0; i < n; i++) {
    const one = () => {
      const r = rng;
      const dash = r() < 0.05 ? (r() < 0.5 ? -1 : 1) : 0;
      return {
        move: Math.floor(r() * 3) - 1,
        crouch: r() < 0.1,
        jump: r() < 0.04,
        punch: r() < 0.15,
        kick: r() < 0.12,
        block: r() < 0.1,
        special: r() < 0.03,
        dash,
      };
    };
    p1.push(one());
    p2.push(one());
  }
  return { p1, p2 };
}

function runBout(seed, p1, p2, roundTicks = 3600) {
  const s = createFight({ seed, roundTicks });
  for (let i = 0; i < p1.length; i++) stepFight(s, p1[i], p2[i]);
  return s;
}

describe("frame-data invariants", () => {
  it("validateMoves() reports no violations for the FISTS table", () => {
    assert.deepEqual(validateMoves(), []);
  });
  it("move table holds the five FISTS moves with positive tick times", () => {
    for (const id of ["jab", "cross", "kick", "sweep", "uppercut"]) {
      assert.ok(MOVES[id], `missing move ${id}`);
    }
    assert.equal(moveList.length, 5);
    for (const m of moveList) {
      assert.ok(Number.isInteger(m.startup) && m.startup > 0);
      assert.ok(Number.isInteger(m.active) && m.active > 0);
      assert.ok(Number.isInteger(m.recovery) && m.recovery > 0);
    }
  });
  it("cancel graph is jab->cross->uppercut and kick->sweep", () => {
    assert.deepEqual(MOVES.jab.cancelInto, ["cross"]);
    assert.deepEqual(MOVES.cross.cancelInto, ["uppercut"]);
    assert.deepEqual(MOVES.kick.cancelInto, ["sweep"]);
    assert.deepEqual(MOVES.sweep.cancelInto, []);
    assert.deepEqual(MOVES.uppercut.cancelInto, []);
  });
  it("flags a table with a dangling cancel target", () => {
    const bad = { ...MOVES, jab: { ...MOVES.jab, cancelInto: ["nope"] } };
    assert.ok(validateMoves(bad).length > 0);
  });
});

describe("golden bout replay", () => {
  it("same seed + same scripts yield byte-identical events and hash", () => {
    const { p1, p2 } = scriptedInputs(375, 600);
    const a = runBout(375, p1, p2);
    const b = runBout(375, p1, p2);
    assert.equal(JSON.stringify(a.events), JSON.stringify(b.events));
    assert.equal(hashState(a), hashState(b));
    assert.match(hashState(a), /^[0-9a-f]{8}$/);
  });
  it("different seeds diverge", () => {
    const { p1, p2 } = scriptedInputs(375, 600);
    const a = runBout(375, p1, p2);
    const b = runBout(376, p1, p2);
    assert.notEqual(hashState(a), hashState(b));
  });
  it("hash is sensitive to mid-bout state", () => {
    const { p1, p2 } = scriptedInputs(7, 300);
    const a = runBout(7, p1, p2);
    const seen = new Set();
    const s = createFight({ seed: 7 });
    for (let i = 0; i < 300; i++) {
      stepFight(s, p1[i], p2[i]);
      if (i % 50 === 0) seen.add(hashState(s));
    }
    assert.ok(seen.size > 1);
    assert.equal(hashState(s), hashState(a));
  });
});

describe("hitbox symmetry", () => {
  it("attackHits mirrors across the origin", () => {
    assert.equal(attackHits(0.2, 1, 0.25, 0.35), attackHits(-0.2, -1, 0.25, -0.35));
    assert.equal(attackHits(0, 1, 0.25, 0.2), attackHits(0, -1, 0.25, -0.2));
    assert.equal(attackHits(0.1, 1, 0.22, 0.5), attackHits(-0.1, -1, 0.22, -0.5));
  });
  it("hitRange mirrors as a negated interval", () => {
    for (const [ax, f, r] of [[0.2, 1, 0.25], [-0.1, -1, 0.3], [0, 1, 0.22]]) {
      const a = hitRange(ax, f, r);
      const b = hitRange(-ax, f === 1 ? -1 : 1, r);
      assert.equal(b.lo, -a.hi);
      assert.equal(b.hi, -a.lo);
    }
  });
  it("segmentsOverlap is symmetric and sane", () => {
    const segA = { ax: 0, ay: 0, bx: 1, by: 0, r: 0.1 };
    const segB = { ax: 0.5, ay: -0.05, bx: 0.5, by: 0.05, r: 0.1 };
    const segFar = { ax: 5, ay: 5, bx: 6, by: 6, r: 0.1 };
    assert.equal(segmentsOverlap(segA, segB), segmentsOverlap(segB, segA));
    assert.equal(segmentsOverlap(segA, segFar), false);
    assert.equal(
      segmentsOverlap(0, 0, 1, 0, 0.5, -0.05, 0.5, 0.05, 0.1, 0.1),
      true,
    );
    assert.ok(segSegDist(0, 0, 1, 0, 0, 1, 1, 1) > 0.99);
    assert.equal(segSegDist(0, 0, 1, 1, 0, 1, 1, 0), 0);
  });
  it("mirrored one-sided bout yields side-flipped identical events", () => {
    const N = 220;
    const neutral = () => ({
      move: 0, crouch: false, jump: false, punch: false,
      kick: false, block: false, special: false, dash: 0,
    });
    const atk = [];
    for (let i = 0; i < N; i++) {
      const inp = neutral();
      if (i > INTRO_TICKS) inp.move = 1;
      if (i === 100 || i === 130 || i === 160) inp.punch = true;
      atk.push(inp);
    }
    const idle = Array.from({ length: N }, neutral);
    const runA = createFight({ seed: 375 });
    runA.fighters[0].x = -0.15;
    runA.fighters[1].x = 0.15;
    for (let i = 0; i < N; i++) stepFight(runA, atk[i], idle[i]);
    const runB = createFight({ seed: 375 });
    runB.fighters[0].x = -0.15;
    runB.fighters[1].x = 0.15;
    const atkMirrored = atk.map((m) => ({ ...m, move: -m.move, dash: -m.dash }));
    for (let i = 0; i < N; i++) stepFight(runB, idle[i], atkMirrored[i]);
    const flip = (e) => ({ ...e, side: e.side === 0 ? 1 : e.side === 1 ? 0 : e.side });
    // Damage jitter is domain-separated per side by design, so mirrored
    // events compare exactly except for damage; mechanics must still mirror.
    const noDmg = (e) => ({ ...e, damage: 0 });
    assert.deepEqual(runB.events.map(flip).map(noDmg), runA.events.map((e) => noDmg({ ...e })));
    assert.ok(runA.events.some((e) => e.t === "hit"), "mirror bout must land hits");
    // HP may drift by at most the per-hit jitter bound (±1 per landed hit).
    const hits = runA.events.filter((e) => e.t === "hit").length;
    assert.ok(Math.abs(runB.fighters[0].hp - runA.fighters[1].hp) <= hits);
    assert.ok(Math.abs(runB.fighters[1].hp - runA.fighters[0].hp) <= hits);
    // Positions mirror within walk-speed drift: per-side jitter perturbs
    // damage-derived hitstop by <= 1 frozen tick per hit (0.008/tick).
    const xTol = hits * 0.01 + 1e-9;
    assert.ok(Math.abs(runB.fighters[0].x + runA.fighters[1].x) < xTol);
    assert.ok(Math.abs(runB.fighters[1].x + runA.fighters[0].x) < xTol);
  });
});

describe("block and parry windows", () => {
  function closePair() {
    const att = createFighter({ x: 0, facing: 1 });
    const def = createFighter({ x: 0.15, facing: -1 });
    return { att, def };
  }
  const HOLD = {
    move: 0, crouch: false, jump: false, punch: false,
    kick: false, block: true, special: false, dash: 0,
  };
  const IDLE = {
    move: 0, crouch: false, jump: false, punch: false,
    kick: false, block: false, special: false, dash: 0,
  };
  it("clean hit lands full damage on an idle defender", () => {
    const { att, def } = closePair();
    const duel = makeDuel();
    duel.step(att, def, { ...IDLE, punch: true }, IDLE, 0);
    for (let t = 1; t <= 6; t++) duel.step(att, def, IDLE, IDLE, t);
    const hits = duel.events.filter((e) => e.t === "hit");
    assert.equal(hits.length, 1);
    assert.ok(hits[0].damage >= 5, `jab damage ${hits[0].damage}`);
    assert.equal(def.hp, 100 - hits[0].damage);
    assert.ok(["hit", "stun"].includes(def.state));
  });
  it("rising-edge block parries inside 6 ticks", () => {
    const { att, def } = closePair();
    const duel = makeDuel();
    duel.step(att, def, { ...IDLE, punch: true }, HOLD, 0);
    for (let t = 1; t <= 6; t++) duel.step(att, def, IDLE, HOLD, t);
    const parries = duel.events.filter((e) => e.t === "parried");
    assert.equal(parries.length, 1);
    assert.equal(def.hp, 100);
    assert.equal(def.state, "parry");
    assert.equal(att.state, "stun");
  });
  it("long-held block absorbs chip instead of parrying", () => {
    const { att, def } = closePair();
    const duel = makeDuel();
    // Hold block 10 ticks so the 6-tick parry window expires.
    for (let t = 0; t < 10; t++) duel.step(att, def, IDLE, HOLD, t);
    duel.step(att, def, { ...IDLE, punch: true }, HOLD, 10);
    for (let t = 11; t <= 17; t++) duel.step(att, def, IDLE, HOLD, t);
    const blocked = duel.events.filter((e) => e.t === "blocked");
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].damage, MOVES.jab.chip);
    assert.equal(def.hp, 100 - MOVES.jab.chip);
    assert.ok(def.stamina < 100);
  });
  it("knockdown launches on heavy knockback and recovers to idle", () => {
    const att = createFighter({ x: 0, facing: 1 });
    const def = createFighter({ x: 0.15, facing: -1 });
    const duel = makeDuel();
    duel.step(att, def, { ...IDLE, special: true }, IDLE, 0);
    for (let t = 1; t <= 14; t++) duel.step(att, def, IDLE, IDLE, t);
    assert.ok(duel.events.some((e) => e.t === "hit" && e.move === "uppercut"));
    assert.equal(def.state, "knockdown");
    for (let t = 15; t < 15 + 45 + 30 + 2; t++) duel.step(att, def, IDLE, IDLE, t);
    assert.equal(def.state, "idle");
  });
  it("KO at hp<=0 emits ko and ends the round via the engine", () => {
    const s = createFight({ seed: 9 });
    s.phase = "fight";
    s.fighters[0].x = -0.1;
    s.fighters[1].x = 0.1;
    s.fighters[1].hp = 3;
    const punch = {
      move: 0, crouch: false, jump: false, punch: true,
      kick: false, block: false, special: false, dash: 0,
    };
    const idle = { ...punch, punch: false };
    for (let i = 0; i < 30 && !s.over; i++) stepFight(s, punch, idle);
    assert.ok(s.events.some((e) => e.t === "ko")), "expected a ko event";
    assert.ok(s.events.some((e) => e.t === "round")), "expected a round event";
    assert.equal(s.wins[0], 1);
  });
});

describe("combo scaling", () => {
  it("comboScale starts at 1, decays 0.12/hit, floors at 0.35", () => {
    assert.equal(comboScale(1), 1);
    assert.ok(Math.abs(comboScale(2) - 0.88) < 1e-12);
    assert.ok(Math.abs(comboScale(3) - 0.76) < 1e-12);
    assert.equal(comboScale(40), 0.35);
    assert.equal(comboScale(400), 0.35);
  });
  it("scaling is monotonically non-increasing", () => {
    let prev = comboScale(1);
    for (let h = 2; h <= 20; h++) {
      const cur = comboScale(h);
      assert.ok(cur <= prev + 1e-12, `hits=${h}: ${cur} > ${prev}`);
      prev = cur;
    }
  });
  it("comboTrack drops the combo after 90 ticks without a hit", () => {
    const track = comboTrack();
    assert.equal(track.register(10), 1);
    assert.ok(Math.abs(track.register(11) - 0.88) < 1e-12);
    assert.equal(track.hits, 2);
    assert.ok(Math.abs(track.scaleFor(12) - 0.76) < 1e-12);
    assert.ok(comboReset(track, 11 + COMBO_WINDOW + 1));
    assert.equal(track.scaleFor(200), 1);
    assert.equal(track.register(200), 1);
    assert.equal(track.hits, 1);
  });
  it("registerHit scales consecutive hits on bout state", () => {
    const s = createFight({ seed: 1 });
    assert.equal(registerHit(0, s, 5), 1);
    assert.ok(Math.abs(registerHit(0, s, 6) - 0.88) < 1e-12);
    assert.equal(registerHit(0, s, 6 + COMBO_WINDOW + 1), 1);
  });
});

describe("soak and sanitize", () => {  it("10k ticks stay finite with valid states and no undefined fields", () => {
    const { p1, p2 } = scriptedInputs(2026, 10000);
    const s = createFight({ seed: 2026 });
    const valid = new Set([
      "idle", "walk", "crouch", "jump", "attack", "block",
      "parry", "hit", "stun", "knockdown", "down", "ko",
    ]);
    const eventKinds = new Set(["hit", "blocked", "parried", "whiff", "ko", "round", "phase"]);
    for (let i = 0; i < 10000; i++) {
      stepFight(s, p1[i], p2[i]);
      if (i % 500 === 0) {
        for (const f of s.fighters) {
          for (const k of ["x", "vx", "y", "vy", "hp", "stamina", "stateTick", "moveTick", "stunTick", "combo"]) {
            assert.ok(Number.isFinite(f[k]), `tick ${i}: ${k} = ${f[k]}`);
          }
          assert.ok(f.x >= -0.9 && f.x <= 0.9, `tick ${i}: x out of arena`);
          assert.ok(valid.has(f.state), `tick ${i}: bad state ${f.state}`);
          assert.ok(f.hp >= 0 && f.hp <= f.maxHp);
          assert.ok(f.facing === 1 || f.facing === -1);
        }
      }
    }
    for (const e of s.events) {
      assert.ok(eventKinds.has(e.t), `bad event kind ${e.t}`);
      assert.ok(Number.isFinite(e.tick) && Number.isFinite(e.damage));
    }
    assert.match(hashState(s), /^[0-9a-f]{8}$/);
  });
  it("hitstop freezes fighters but advances tick and timer", () => {
    const s = createFight({ seed: 3 });
    s.phase = "fight";
    s.hitstop = 3;
    const x0 = s.fighters[0].x;
    const timer0 = s.timer;
    const tick0 = s.tick;
    stepFight(s, { move: 1 }, { move: -1 });
    assert.equal(s.fighters[0].x, x0);
    assert.equal(s.tick, tick0 + 1);
    assert.equal(s.timer, timer0 - 1);
    assert.equal(s.hitstop, 2);
  });
  it("sanitizeInput clamps and coerces", () => {
    assert.deepEqual(sanitizeInput(null), sanitizeInput({}));
    const dirty = sanitizeInput({
      move: 5, dash: -9, crouch: 1, jump: "yes",
      punch: 0, kick: null, block: undefined, special: 7,
    });
    assert.deepEqual(dirty, {
      move: 1, dash: -1, crouch: true, jump: true,
      punch: false, kick: false, block: false, special: true,
    });
    assert.deepEqual(sanitizeInput({ move: -5 }), { ...sanitizeInput({}), move: -1 });
  });
  it("no Math.random or Date.now calls in the combat sources", () => {
    for (const f of ["types.js", "moves.js", "hitboxes.js", "fighter.js", "combos.js", "ai.js", "engine.js"]) {
      const src = readFileSync(path.join(here, "..", "src", "combat", f), "utf8");
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert.ok(!code.includes("Math.random"), `${f} uses Math.random`);
      assert.ok(!code.includes("Date.now"), `${f} uses Date.now`);
    }
  });
});

describe("reviewer fixes: contact vs combo, trades, guard, edges", () => {
  const IDLE = {
    move: 0, crouch: false, jump: false, punch: false,
    kick: false, block: false, special: false, dash: 0,
  };
  const HOLD = { ...IDLE, block: true };

  it("blocked and parried hits make contact (no whiff) but never feed combo", () => {
    for (const holdTicks of [0, 10]) {
      const att = createFighter({ x: 0, facing: 1 });
      const def = createFighter({ x: 0.15, facing: -1 });
      const events = [];
      const base = { seed: 375, events, moveTable: MOVES };
      for (let t = 0; t < holdTicks; t++) {
        stepFighter(att, IDLE, { ...base, tick: t, foe: def, side: 0 });
        stepFighter(def, HOLD, { ...base, tick: t, foe: att, side: 1 });
      }
      const t0 = holdTicks;
      stepFighter(att, { ...IDLE, punch: true }, { ...base, tick: t0, foe: def, side: 0 });
      stepFighter(def, HOLD, { ...base, tick: t0, foe: att, side: 1 });
      for (let t = t0 + 1; t <= t0 + 7; t++) {
        stepFighter(att, IDLE, { ...base, tick: t, foe: def, side: 0 });
        stepFighter(def, HOLD, { ...base, tick: t, foe: att, side: 1 });
      }
      const kind = holdTicks === 0 ? "parried" : "blocked";
      assert.ok(events.some((e) => e.t === kind), `expected a ${kind} event`);
      assert.equal(att.combo, 0, `${kind} must not inflate combo`);
      assert.equal(att.didHit, true, `${kind} is contact, not a whiff`);
      assert.ok(!events.some((e) => e.t === "whiff"), `${kind} must not whiff`);
    }
  });

  it("same-tick trades damage both sides (no forced side-0 win)", () => {
    const s = createFight({ seed: 11 });
    s.phase = "fight";
    s.fighters[0].x = -0.1;
    s.fighters[1].x = 0.1;
    const jab = { ...IDLE, punch: true };
    for (let i = 0; i < 20; i++) stepFight(s, { ...jab }, { ...jab });
    const hits0 = s.events.filter((e) => e.t === "hit" && e.side === 0);
    const hits1 = s.events.filter((e) => e.t === "hit" && e.side === 1);
    assert.ok(hits0.length > 0, "side 0 must land its simultaneous hit");
    assert.ok(hits1.length > 0, "side 1 must land its simultaneous hit");
    assert.ok(s.fighters[0].hp < 100 && s.fighters[1].hp < 100);
  });

  it("holding block to 0 stamina breaks guard passively", () => {
    const f = createFighter({ x: 0, facing: 1 });
    const foe = createFighter({ x: 0.5, facing: -1 });
    const events = [];
    f.stamina = 1;
    for (let t = 0; t < 10; t++) {
      stepFighter(f, HOLD, { seed: 1, events, tick: t, foe, side: 0 });
    }
    assert.equal(f.state, "stun");
    assert.ok(events.some((e) => e.t === "hit" && e.move === "guardbreak"));
  });

  it("airborne fighters at 0 hp enter ko instead of hanging", () => {
    const f = createFighter({ x: 0, facing: 1 });
    const foe = createFighter({ x: 0.5, facing: -1 });
    const events = [];
    stepFighter(f, { ...IDLE, jump: true }, { seed: 1, events, tick: 0, foe, side: 0 });
    assert.equal(f.grounded, false);
    f.hp = 0;
    stepFighter(f, IDLE, { seed: 1, events, tick: 1, foe, side: 0 });
    assert.equal(f.state, "ko");
    assert.ok(events.some((e) => e.t === "ko"));
  });

  it("holding punch fires one jab and never auto-cancels into cross", () => {
    const s = createFight({ seed: 21 });
    s.phase = "fight";
    s.fighters[0].x = -0.5;
    s.fighters[1].x = 0.5;
    const hold = { ...IDLE, punch: true };
    for (let i = 0; i < 40; i++) stepFight(s, { ...hold }, { ...IDLE });
    assert.equal(s.events.filter((e) => e.t === "whiff" && e.move === "jab").length, 1);
    assert.equal(s.events.filter((e) => e.move === "cross").length, 0);
  });

  it("idle crouch+kick starts sweep on the same tick", () => {
    const f = createFighter({ x: 0, facing: 1 });
    const events = [];
    const foe = createFighter({ x: 0.5, facing: -1 });
    stepFighter(f, { ...IDLE, crouch: true, kick: true }, { seed: 1, events, tick: 0, foe, side: 0, moveTable: MOVES });
    assert.equal(f.state, "attack");
    assert.equal(f.moveId, "sweep");
  });

  it("edgeGate passes levels but only rising edges", () => {
    const neutral = sanitizeInput({});
    const held = { ...neutral, move: 1, crouch: true, jump: true, punch: true, kick: true, block: true, special: true, dash: 1 };
    const gated = edgeGate(held, held);
    assert.equal(gated.move, 1);
    assert.equal(gated.crouch, true);
    assert.equal(gated.block, true);
    assert.equal(gated.punch, false);
    assert.equal(gated.kick, false);
    assert.equal(gated.special, false);
    assert.equal(gated.jump, false);
    assert.equal(gated.dash, 0);
    const fresh = edgeGate(held, neutral);
    assert.equal(fresh.punch, true);
    assert.equal(fresh.dash, 1);
  });

  it("mid-jump dodges jabs but not uppercuts (height gate)", () => {
    assert.equal(attackHits(0, 1, 0.22, 0.15), true);
    assert.equal(attackHits(0, 1, 0.22, 0.15, 0.05, "jab"), true);
    assert.equal(attackHits(0, 1, 0.22, 0.15, 0.2, "jab"), false);
    assert.equal(attackHits(0, 1, 0.22, 0.15, 0.2, "uppercut"), true);
  });

  it("hashState pins didHit, phase counters, and the move table", () => {
    const a = createFight({ seed: 5 });
    const b = createFight({ seed: 5 });
    assert.equal(hashState(a), hashState(b));
    a.fighters[0].didHit = true;
    assert.notEqual(hashState(a), hashState(b));
    const c = createFight({ seed: 5, moves: { ...MOVES, jab: { ...MOVES.jab, damage: 7 } } });
    assert.notEqual(hashState(c), hashState(b));
    assert.match(movesDigest(MOVES), /^[0-9a-f]{8}$/);
  });

  it("createFight owns its move table: frozen and immune to caller mutation", () => {
    const custom = {
      jab: { ...MOVES.jab, cancelInto: ["cross"] },
      cross: { ...MOVES.cross },
      kick: { ...MOVES.kick },
      sweep: { ...MOVES.sweep },
      uppercut: { ...MOVES.uppercut },
    };
    const s = createFight({ seed: 5, moves: custom });
    assert.ok(Object.isFrozen(s.moves));
    custom.jab.damage = 999;
    assert.notEqual(s.moves.jab.damage, 999);
    assert.equal(movesDigest(s.moves), movesDigest(MOVES));
  });

  it("resetRound preserves asymmetric maxHp per side", () => {
    const s = createFight({ seed: 5 });
    s.fighters[0].maxHp = 120;
    s.fighters[0].hp = 10;
    s.fighters[1].maxHp = 80;
    s.fighters[1].hp = 5;
    resetRound(s);
    assert.equal(s.fighters[0].maxHp, 120);
    assert.equal(s.fighters[0].hp, 120);
    assert.equal(s.fighters[1].maxHp, 80);
    assert.equal(s.fighters[1].hp, 80);
  });

  it("advanceCombo is the single owner: registerHit and the sim agree", () => {
    assert.deepEqual(advanceCombo(0, Number.NEGATIVE_INFINITY, 100), { hits: 1, scale: 1 });
    const second = advanceCombo(1, 100, 101);
    assert.equal(second.hits, 2);
    assert.ok(Math.abs(second.scale - 0.88) < 1e-12);
    assert.deepEqual(advanceCombo(5, 100, 100 + COMBO_WINDOW + 1), { hits: 1, scale: 1 });
    const s = createFight({ seed: 1 });
    assert.equal(registerHit(0, s, 5), advanceCombo(0, Number.NEGATIVE_INFINITY, 5).scale);
  });
});
