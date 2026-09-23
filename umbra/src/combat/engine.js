/**
 * Umbra M2 bout engine: pure fixed-tick fight orchestration.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 * The only randomness source is stateless hash01 draws seeded per bout,
 * so replays from the same seed plus the same input log are byte-identical.
 */

import { createFighter, stepFighter, STAMINA_MAX } from "./fighter.js";
import { MOVES } from "./moves.js";
import { hashStr } from "../rng.js";

/**
 * @typedef {import("./types.js").CombatInput} CombatInput
 * @typedef {import("./types.js").FightState} FightState
 * @typedef {import("./types.js").FightEvent} FightEvent
 */

/** Ticks of pre-round intro before fighters may act. */
export const INTRO_TICKS = 60;
/** Ticks of round-end pause before the next round resets. */
export const ROUND_END_TICKS = 90;
/** Default round clock (60 seconds at 60 Hz). */
export const DEFAULT_ROUND_TICKS = 3600;
/** Fighter spawn offsets. */
export const SPAWN_X = 0.34;
/** Movement clamp bound (matches fighter.js ARENA_X). */
export const ARENA_X = 0.9;

const NEUTRAL = Object.freeze({
  move: 0,
  crouch: false,
  jump: false,
  punch: false,
  kick: false,
  block: false,
  special: false,
  dash: 0,
});

const clampDir = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, Math.round(n)));
};

/**
 * Sanitize one tick of raw input into a valid CombatInput.
 * Clamps move/dash to -1|0|1 and coerces buttons to booleans.
 * @param {unknown} input raw input (null/undefined yields neutral)
 * @returns {CombatInput}
 */
export function sanitizeInput(input) {
  if (input == null || typeof input !== "object") return { ...NEUTRAL };
  return {
    move: clampDir(input.move),
    crouch: !!input.crouch,
    jump: !!input.jump,
    punch: !!input.punch,
    kick: !!input.kick,
    block: !!input.block,
    special: !!input.special,
    dash: clampDir(input.dash),
  };
}

/**
 * Deep-copy a move table and freeze it: the bout owns its table, so a
 * caller mutating their object after createFight can never desync a replay.
 * @param {Record<string, import("./types.js").MoveDef>} [moves]
 * @returns {Record<string, import("./types.js").MoveDef>} owned frozen copy
 */
export function copyMoves(moves) {
  const table = moves ?? MOVES;
  const out = {};
  for (const [key, m] of Object.entries(table)) {
    out[key] = Object.freeze({
      ...m,
      cancelInto: Array.isArray(m?.cancelInto) ? [...m.cancelInto] : [],
    });
  }
  return Object.freeze(out);
}

/**
 * Canonical digest of a move table for hashState: sorted keys and fields
 * so table identity is pinned regardless of insertion order.
 * @param {Record<string, import("./types.js").MoveDef>} [moves]
 * @returns {string} 8-char hex string
 */
export function movesDigest(moves) {
  const table = moves ?? {};
  const canon = Object.keys(table)
    .sort()
    .map((key) => {
      const m = table[key] ?? {};
      const fields = Object.keys(m)
        .sort()
        .map((fk) => `${fk}:${Array.isArray(m[fk]) ? m[fk].join("+") : String(m[fk])}`);
      return `${key}={${fields.join(",")}}`;
    });
  return hashStr(canon.join("|")).toString(16).padStart(8, "0");
}

/** Input buttons treated as rising edges (levels pass through untouched). */
const EDGE_KEYS = ["jump", "punch", "kick", "special"];

/**
 * Gate edge buttons to their rising edges against the previous simulated
 * tick: holding punch/kick/special no longer machine-guns attacks or
 * auto-fires cancels. Levels (move/crouch/block) pass through as-is.
 * @param {CombatInput} cur sanitized input for this tick
 * @param {CombatInput} prev sanitized input from the last simulated tick
 * @returns {CombatInput} input with only rising edges set
 */
export function edgeGate(cur, prev) {
  const before = prev ?? NEUTRAL;
  const out = { ...cur };
  for (const key of EDGE_KEYS) out[key] = !!(cur[key] && !before[key]);
  const dashNow = Number(cur.dash) || 0;
  const dashBefore = Number(before.dash) || 0;
  out.dash = dashNow !== 0 && dashBefore === 0 ? Math.max(-1, Math.min(1, Math.round(dashNow))) : 0;
  return out;
}

/**
 * Merge defender-side mutations computed against a pre-tick snapshot back
 * into the live fighter. hp/x/stamina deltas apply additively (the live
 * fighter advanced its own movement/regen meanwhile); a changed state means
 * the foe's strike interrupted this fighter, so the snapshot outcome wins.
 * @param {import("./types.js").FighterState} live live fighter
 * @param {import("./types.js").FighterState} copy snapshot mutated as defender
 * @param {{hp:number, x:number, stamina:number, state:string}} pre pre-tick values
 */
function mergeDefender(live, copy, pre) {
  if (copy.hp !== pre.hp) live.hp = Math.max(0, copy.hp);
  const dx = copy.x - pre.x;
  if (dx !== 0) live.x = Math.max(-ARENA_X, Math.min(ARENA_X, live.x + dx));
  const ds = copy.stamina - pre.stamina;
  if (ds !== 0) {
    const s = (Number.isFinite(live.stamina) ? live.stamina : STAMINA_MAX) + ds;
    live.stamina = Math.max(0, Math.min(STAMINA_MAX, s));
  }
  if (copy.state !== pre.state) {
    live.state = copy.state;
    live.stateTick = copy.stateTick;
    live.stunTick = copy.stunTick;
    live.moveId = copy.moveId;
    live.moveTick = copy.moveTick;
    live.parryWindow = copy.parryWindow;
  }
}

/**
 * Create a fresh bout. The bout deep-copies and freezes the move table;
 * later caller mutations cannot desync the sim.
 * @param {{seed?:number, arena?:number, rounds?:number, roundTicks?:number, moves?:Record<string, import("./types.js").MoveDef>, hp?:number}} [opts]
 * @returns {FightState}
 */
export function createFight({
  seed = 0,
  arena = 0,
  rounds = 3,
  roundTicks = DEFAULT_ROUND_TICKS,
  moves = MOVES,
  hp = 100,
} = {}) {
  const cleanSeed = (Number.isFinite(seed) ? seed : 0) >>> 0;
  const cleanRounds = Number.isInteger(rounds) && rounds >= 1 ? rounds : 3;
  const cleanTimer =
    Number.isInteger(roundTicks) && roundTicks > 0 ? roundTicks : DEFAULT_ROUND_TICKS;
  return {
    seed: cleanSeed,
    arena: Number.isInteger(arena) && arena >= 0 ? arena : 0,
    rounds: cleanRounds,
    roundTicks: cleanTimer,
    moves: copyMoves(moves),
    tick: 0,
    round: 1,
    wins: [0, 0],
    timer: cleanTimer,
    fighters: [
      createFighter({ x: -SPAWN_X, facing: 1, hp }),
      createFighter({ x: SPAWN_X, facing: -1, hp }),
    ],
    hitstop: 0,
    over: false,
    winner: null,
    events: [],
    phase: "intro",
    phaseTick: 0,
    frozenTicks: 0,
    prev: [{ ...NEUTRAL }, { ...NEUTRAL }],
  };
}

function faceBoth(state) {
  const [a, b] = state.fighters;
  for (const [f, foe] of [
    [a, b],
    [b, a],
  ]) {
    if (f.grounded && (f.state === "idle" || f.state === "walk")) {
      f.facing = foe.x < f.x ? -1 : 1;
    }
  }
}

function clampBoth(state) {
  for (const f of state.fighters) {
    f.x = Math.max(-ARENA_X, Math.min(ARENA_X, f.x));
  }
}

function applyHitstop(state, fromIndex) {
  let hs = 0;
  for (let i = fromIndex; i < state.events.length; i++) {
    const e = state.events[i];
    if (e.t === "hit") hs = Math.max(hs, Math.min(12, 4 + Math.floor(e.damage / 3)));
    else if (e.t === "blocked") hs = Math.max(hs, 4);
    else if (e.t === "parried") hs = Math.max(hs, 10);
  }
  state.hitstop = Math.max(state.hitstop, hs);
}

/**
 * Reset fighters, clock, and phase for the next round, preserving each
 * side's own maxHp (asymmetric-hp bouts survive across rounds).
 * @param {FightState} state
 */
export function resetRound(state) {
  const hp = [state.fighters[0].maxHp, state.fighters[1].maxHp];
  state.fighters = [
    createFighter({ x: -SPAWN_X, facing: 1, hp: hp[0] }),
    createFighter({ x: SPAWN_X, facing: -1, hp: hp[1] }),
  ];
  state.timer = state.roundTicks;
  state.hitstop = 0;
  state.phase = "intro";
  state.phaseTick = 0;
}

function endRound(state, winnerSide) {
  state.events.push({
    t: "round",
    tick: state.tick,
    side: winnerSide,
    move: null,
    damage: 0,
  });
  if (winnerSide === 0 || winnerSide === 1) state.wins[winnerSide] += 1;
  const needed = Math.floor(state.rounds / 2) + 1;
  const decided =
    state.wins[0] >= needed || state.wins[1] >= needed || state.round >= state.rounds;
  if (decided) {
    state.over = true;
    state.winner = state.wins[0] > state.wins[1] ? 0 : state.wins[1] > state.wins[0] ? 1 : -1;
    state.phase = "over";
    state.phaseTick = 0;
  } else {
    state.phase = "roundEnd";
    state.phaseTick = 0;
  }
}

function checkRoundEnd(state) {
  if (state.phase !== "fight" || state.over) return;
  const [a, b] = state.fighters;
  if (a.hp <= 0 && b.hp <= 0) endRound(state, -1);
  else if (a.hp <= 0) endRound(state, 1);
  else if (b.hp <= 0) endRound(state, 0);
  else if (state.timer <= 0) {
    if (a.hp > b.hp) endRound(state, 0);
    else if (b.hp > a.hp) endRound(state, 1);
    else endRound(state, -1);
  }
}

/**
 * Advance the bout by exactly one tick.
 * Hitstop freezes fighter simulation but the global tick and the round
 * timer keep running; intro/roundEnd phases run their own counters.
 * @param {FightState} state bout state (mutated in place)
 * @param {unknown} p1Input raw side-0 input
 * @param {unknown} p2Input raw side-1 input
 * @returns {FightState} the same state object
 */
export function stepFight(state, p1Input, p2Input) {
  if (state.over) return state;
  const p1 = sanitizeInput(p1Input);
  const p2 = sanitizeInput(p2Input);
  state.tick += 1;

  // Hitstop: freeze the fighter sim, keep tick + timer running.
  if (state.hitstop > 0) {
    state.hitstop -= 1;
    state.frozenTicks += 1;
    if (state.phase === "fight" && state.timer > 0) state.timer -= 1;
    if (state.phase === "fight") checkRoundEnd(state);
    return state;
  }

  if (state.phase === "intro") {
    state.phaseTick += 1;
    faceBoth(state);
    if (state.phaseTick >= INTRO_TICKS) {
      state.phase = "fight";
      state.phaseTick = 0;
    }
    return state;
  }

  if (state.phase === "roundEnd") {
    state.phaseTick += 1;
    if (state.phaseTick >= ROUND_END_TICKS) {
      state.round += 1;
      resetRound(state);
    }
    return state;
  }

  if (state.phase === "over") return state;

  // Live fight tick. Edges gate against the last SIMULATED tick only, so
  // inputs held or pressed through hitstop/intro buffer instead of dying.
  // Hit tests then run double-buffered: each side steps against a pre-tick
  // snapshot of its foe, so same-tick trades resolve for both sides instead
  // of handing side 0 a forced win through sequential mutation.
  faceBoth(state);
  const [f0, f1] = state.fighters;
  const fromIndex = state.events.length;
  const prev = Array.isArray(state.prev) ? state.prev : [{ ...NEUTRAL }, { ...NEUTRAL }];
  const e1 = edgeGate(p1, sanitizeInput(prev[0]));
  const e2 = edgeGate(p2, sanitizeInput(prev[1]));
  state.prev = [p1, p2];
  const foeFor0 = { ...f1 };
  const foeFor1 = { ...f0 };
  const pre0 = { hp: f0.hp, x: f0.x, stamina: f0.stamina, state: f0.state };
  const pre1 = { hp: f1.hp, x: f1.x, stamina: f1.stamina, state: f1.state };
  stepFighter(f0, e1, {
    seed: state.seed,
    events: state.events,
    tick: state.tick,
    foe: foeFor0,
    moveTable: state.moves,
    side: 0,
  });
  stepFighter(f1, e2, {
    seed: state.seed,
    events: state.events,
    tick: state.tick,
    foe: foeFor1,
    moveTable: state.moves,
    side: 1,
  });
  mergeDefender(f0, foeFor1, pre0);
  mergeDefender(f1, foeFor0, pre1);
  clampBoth(state);
  applyHitstop(state, fromIndex);
  if (state.timer > 0) state.timer -= 1;
  checkRoundEnd(state);
  return state;
}

/**
 * Deterministic 8-hex hash of the bout state. Positions are quantized
 * to 1e-3 so the hash is stable across identical replays.
 * @param {FightState} state
 * @returns {string} 8-char hex string
 */
export function hashState(state) {
  const q = (n) => (Number.isFinite(n) ? Math.round(n * 1000) : 0);
  const parts = [
    state.seed,
    state.tick,
    state.round,
    state.timer,
    state.wins.join(""),
    state.hitstop,
    state.phase,
    state.phaseTick,
    state.frozenTicks,
    movesDigest(state.moves),
    state.over ? 1 : 0,
    state.winner == null ? "x" : String(state.winner),
    state.events.length,
  ];
  for (const f of state.fighters) {
    parts.push(
      [
        q(f.x),
        q(f.y),
        q(f.vx),
        q(f.vy),
        f.facing,
        f.hp,
        Math.round(Number.isFinite(f.stamina) ? f.stamina * 10 : 0),
        f.state,
        f.stateTick,
        f.moveId ?? "-",
        f.moveTick,
        f.didHit ? 1 : 0,
        f.blockHeld ? 1 : 0,
        f.wantBlock ? 1 : 0,
        f.parryWindow,
        f.stunTick,
        f.combo,
        Number.isFinite(f.comboTick) ? f.comboTick : "never",
        f.grounded ? 1 : 0,
      ].join(","),
    );
  }
  return hashStr(parts.join("|")).toString(16).padStart(8, "0");
}
