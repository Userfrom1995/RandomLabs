/**
 * Umbra M2 seeded AI: tier-1 finite-state-machine opponents.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 * Deterministic given the same seed plus the same state sequence.
 * Per-tick coin flips use hash01(seed, tick, salt) so they never
 * disturb the think-time mulberry32 stream.
 */

import { mulberry32, hash01 } from "../rng.js";
import { MOVES } from "./moves.js";

/**
 * @typedef {import("./types.js").CombatInput} CombatInput
 */

/** FSM nodes. */
export const AI_STATES = ["neutral", "approach", "punish", "retreat"];

/** Playable AI temperaments. */
export const ARCHETYPES = ["brawler", "turtle", "zoner"];

/** Reaction delay (ticks between decisions) per difficulty 0..2. */
export const REACTION_TICKS = [18, 10, 5];
/** Strike/block eagerness per difficulty 0..2. */
export const AGGRESSION = [0.25, 0.5, 0.8];

/** @typedef {"brawler"|"turtle"|"zoner"} AIArchetype */

/**
 * @typedef {object} AIState
 * @property {number} seed ai seed (unsigned 32-bit)
 * @property {0|1|2} difficulty 0 novice, 1 sparring, 2 relentless
 * @property {AIArchetype} archetype temperament
 * @property {string} fsm current FSM node
 * @property {number} nextThink tick at which the FSM re-decides
 * @property {()=>number} rng think-time seeded stream (mulberry32)
 * @property {{r1:number, r2:number, r3:number}} plan frozen rolls for this decision window
 */

const clampDifficulty = (d) => {
  const n = Number(d);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(2, Math.round(n)));
};

/**
 * Create an AI controller.
 * @param {{seed?:number, difficulty?:number, archetype?:string}} [opts]
 * @returns {AIState}
 */
export function createAI({ seed = 1, difficulty = 1, archetype = "brawler" } = {}) {
  const cleanSeed = (Number.isFinite(seed) ? seed : 1) >>> 0;
  const cleanDiff = clampDifficulty(difficulty);
  const cleanArch = ARCHETYPES.includes(archetype) ? archetype : "brawler";
  return {
    seed: cleanSeed,
    difficulty: cleanDiff,
    archetype: cleanArch,
    fsm: "neutral",
    nextThink: 0,
    rng: mulberry32(cleanSeed),
    plan: { r1: 0.5, r2: 0.5, r3: 0.5 },
  };
}

function think(ai, self, foe, dist, tick) {
  // Fixed draw count per decision keeps the stream aligned and replayable.
  const r1 = ai.rng();
  const r2 = ai.rng();
  const r3 = ai.rng();
  ai.plan = { r1, r2, r3 };
  const reaction = REACTION_TICKS[ai.difficulty];
  ai.nextThink = tick + reaction + Math.floor(r3 * reaction);

  const selfHp = Number.isFinite(self.hp) ? self.hp : 100;
  if (ai.archetype === "brawler") {
    if (selfHp < 30 && r2 < 0.3) ai.fsm = "retreat";
    else if (dist > 0.34) ai.fsm = "approach";
    else ai.fsm = r1 < 0.65 ? "punish" : "approach";
  } else if (ai.archetype === "turtle") {
    if (dist < 0.3 && r1 < 0.6) ai.fsm = "neutral";
    else if (dist > 0.34) ai.fsm = r2 < 0.5 ? "approach" : "neutral";
    else ai.fsm = r1 < 0.5 ? "punish" : "neutral";
  } else {
    // zoner: keeps its preferred kicking band, retreats from pressure.
    if (dist < 0.22 && r1 < 0.8) ai.fsm = "retreat";
    else if (dist > 0.42) ai.fsm = "approach";
    else ai.fsm = r1 < 0.5 ? "punish" : "neutral";
  }
}

/**
 * Sample one tick of input for the AI.
 * @param {AIState} ai controller (mutated: fsm schedule advances)
 * @param {{x:number, hp?:number, state?:string}} self controlled fighter snapshot
 * @param {{x:number, hp?:number, state?:string}} foe opponent snapshot
 * @param {()=>number} [rng] optional external stream (defaults to the AI stream)
 * @param {number} [tick] current tick
 * @returns {CombatInput}
 */
export function aiInput(ai, self, foe, rng, tick) {
  const now = Number.isFinite(tick) ? Math.floor(tick) : 0;
  const sx = Number.isFinite(self?.x) ? self.x : 0;
  const fx = Number.isFinite(foe?.x) ? foe.x : 0;
  const dist = Math.abs(fx - sx);
  const dir = fx >= sx ? 1 : -1;
  const foeState = typeof foe?.state === "string" ? foe.state : "idle";
  const foeAttacking = foeState === "attack";
  const foeVulnerable = foeState === "attack" || foeState === "stun" || foeState === "hit";
  const aggr = AGGRESSION[ai.difficulty] ?? 0.5;

  if (now >= ai.nextThink) think(ai, self ?? {}, foe ?? {}, dist, now);
  void rng;

  /** @type {CombatInput} */
  const out = {
    move: 0,
    crouch: false,
    jump: false,
    punch: false,
    kick: false,
    block: false,
    special: false,
    dash: 0,
  };

  const strikeRoll = hash01(ai.seed, now, 21);
  const specialRoll = hash01(ai.seed, now, 23);
  const sweepRoll = hash01(ai.seed, now, 29);
  const blockRoll = hash01(ai.seed, now, 31);
  const dashRoll = hash01(ai.seed, now, 37);
  const driftRoll = hash01(ai.seed, now, 41);

  // Strike bands derive from the live move table (minus epsilon) so the AI
  // never plans strikes outside real reach: jab is the punch button's move,
  // kick/sweep share one range, uppercut is the special.
  const punchReach = MOVES.jab.range - 0.01;
  const kickReach = MOVES.kick.range - 0.01;
  const sweepReach = MOVES.sweep.range - 0.01;
  const uppercutReach = MOVES.uppercut.range - 0.01;

  const tryStrike = (prob) => {
    if (strikeRoll >= prob) return;
    if (dist <= punchReach) {
      if (sweepRoll < 0.12 * aggr && dist <= sweepReach) {
        out.crouch = true;
        out.kick = true;
      } else if (specialRoll < 0.12 * aggr && dist <= uppercutReach) {
        out.special = true;
      } else {
        out.punch = true;
      }
    } else if (dist <= kickReach) {
      out.kick = true;
    }
  };

  switch (ai.fsm) {
    case "approach": {
      out.move = dir;
      if (dist > 0.4 && dashRoll < 0.2 + 0.15 * aggr) out.dash = dir;
      tryStrike(aggr);
      if (foeAttacking && dist < 0.35) {
        const guard = ai.archetype === "turtle" ? 0.85 : 0.25 * aggr;
        if (blockRoll < guard) {
          out.block = true;
          out.move = 0;
          out.dash = 0;
        }
      }
      break;
    }
    case "punish": {
      if (foeVulnerable) {
        if (dist <= kickReach) tryStrike(Math.min(1, aggr + 0.25));
        else out.move = dir;
      } else if (dist > kickReach) {
        out.move = dir;
        if (dist > 0.45 && dashRoll < 0.15 * aggr) out.dash = dir;
      } else {
        tryStrike(aggr * 0.6);
        if (driftRoll < 0.3) out.move = dir;
      }
      break;
    }
    case "retreat": {
      out.move = -dir;
      if (dist < 0.15 && driftRoll < 0.05) out.jump = true;
      if (foeAttacking && dist < 0.4) {
        const guard = ai.archetype === "turtle" ? 0.9 : 0.5;
        if (blockRoll < guard) {
          out.block = true;
          out.move = 0;
        }
      }
      break;
    }
    default: {
      // neutral
      if (foeAttacking && dist < 0.4) {
        const guard =
          ai.archetype === "turtle" ? 0.85 : ai.archetype === "zoner" ? 0.5 : 0.3;
        if (blockRoll < guard) out.block = true;
      } else if (ai.archetype === "turtle" && dist < 0.3 && blockRoll < 0.3) {
        out.block = true;
      } else if (foeVulnerable && dist <= kickReach) {
        tryStrike(aggr);
      } else if (driftRoll < 0.25) {
        out.move = dist > 0.36 ? dir : -dir;
      }
      break;
    }
  }

  return out;
}
