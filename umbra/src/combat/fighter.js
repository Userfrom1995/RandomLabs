/**
 * Umbra M2 headless fighter: one-tick state machine.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 * The sim's only randomness is hash01 from ../rng.js; damage jitter is
 * a stateless hash01(seed, tick, sideSalt, moveSalt) draw, domain-separated
 * per side and per move so mirrored bouts stay symmetric while same-tick
 * trades are never lockstep-correlated. Replays are byte-identical.
 */

import { attackHits } from "./hitboxes.js";
import { advanceCombo } from "./combos.js";
import { hash01, hashStr } from "../rng.js";

/**
 * @typedef {import("./types.js").CombatInput} CombatInput
 * @typedef {import("./types.js").FighterState} FighterState
 * @typedef {import("./types.js").FightEvent} FightEvent
 */

/** All fighter state-machine nodes. */
export const STATES = [
  "idle",
  "walk",
  "crouch",
  "jump",
  "attack",
  "block",
  "parry",
  "hit",
  "stun",
  "knockdown",
  "down",
  "ko",
];

/** Ticks of held block after the rising edge that convert a hit into a parry. */
export const PARRY_WINDOW = 6;
export const WALK_SPEED = 0.008;
export const AIR_DRIFT = 0.004;
export const DASH_SPEED = 0.024;
export const DASH_COST = 2;
export const JUMP_V = 0.05;
export const GRAVITY = 0.004;
export const BLOCK_DRAIN = 0.3;
export const STAMINA_REGEN = 0.5;
export const STAMINA_MAX = 100;
export const ARENA_X = 0.9;
/** knockback at or above this value launches into knockdown. */
export const KNOCKDOWN_KB = 0.14;
/** Ticks spent in knockdown before crumpling to down. */
export const KNOCKDOWN_TICKS = 45;
/** Ticks spent in down before getting up. */
export const DOWN_TICKS = 30;

const clampDir = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, Math.round(n)));
};

const clampX = (x) => Math.max(-ARENA_X, Math.min(ARENA_X, x));

/**
 * Create a fresh fighter state object.
 * @param {{x?:number, facing?:1|-1, hp?:number}} [opts]
 * @returns {FighterState}
 */
export function createFighter({ x = 0, facing = 1, hp = 100 } = {}) {
  const cleanHp = Number.isFinite(hp) ? Math.max(1, Math.round(hp)) : 100;
  return {
    x: Number.isFinite(x) ? x : 0,
    vx: 0,
    y: 0,
    vy: 0,
    facing: facing === -1 ? -1 : 1,
    hp: cleanHp,
    maxHp: cleanHp,
    stamina: STAMINA_MAX,
    state: "idle",
    stateTick: 0,
    moveId: null,
    moveTick: 0,
    didHit: false,
    blockHeld: false,
    wantBlock: false,
    parryWindow: 0,
    stunTick: 0,
    combo: 0,
    comboTick: Number.NEGATIVE_INFINITY,
    grounded: true,
  };
}

/**
 * Whether the defender's held block can absorb the incoming strike
 * (chip damage instead of a clean hit).
 * @param {FighterState} f defender
 */
export function isBlocking(f) {
  return (
    f.blockHeld &&
    f.grounded &&
    (f.state === "block" ||
      f.state === "idle" ||
      f.state === "walk" ||
      f.state === "crouch")
  );
}

/**
 * Whether an input edge starts the given move.
 * @param {string} id move id
 * @param {CombatInput} inp sanitized input
 */
export function matchesTrigger(id, inp) {
  if (id === "uppercut") return !!inp.special;
  if (id === "sweep") return !!inp.kick && !!inp.crouch;
  if (id === "kick") return !!inp.kick && !inp.crouch;
  if (id === "jab" || id === "cross") return !!inp.punch;
  return false;
}

/**
 * Pick a neutral-state attack for an input edge.
 * @param {CombatInput} inp sanitized input
 * @param {string} state current fighter state
 * @returns {string|null} move id or null when no attack edge is present
 */
export function selectMove(inp, state) {
  if (inp.special) return "uppercut";
  if (inp.kick) return inp.crouch || state === "crouch" ? "sweep" : "kick";
  if (inp.punch) return "jab";
  return null;
}

function startAttack(f, id) {
  f.state = "attack";
  f.stateTick = 0;
  f.moveId = id;
  f.moveTick = 0;
  f.didHit = false;
  f.vx = 0;
}

function enterKo(f, ev, moveId) {
  if (f.state === "ko") return;
  f.hp = 0;
  f.state = "ko";
  f.stateTick = 0;
  f.moveId = null;
  f.moveTick = 0;
  f.stunTick = 0;
  ev({ t: "ko", move: moveId ?? null, damage: 0 });
}

function resolveHit(att, def, mv, ctx, ev) {
  const seed = Number.isFinite(ctx.seed) ? ctx.seed : 0;
  const side = ctx.side === 1 ? 1 : 0;
  // Per-side damage scale (M4 upgrades, boss enrage): sanitized to a
  // positive finite multiplier, default 1, so legacy callers replay
  // byte-identically.
  const dmgScale = Number.isFinite(ctx.dmgScale) && ctx.dmgScale > 0 ? ctx.dmgScale : 1;
  // Domain-separated per side and per move: same-tick trades never share
  // a jitter draw, while mirrored bouts stay symmetric.
  const moveSalt = hashStr(typeof mv.id === "string" ? mv.id : "");
  const jitter = Math.floor(hash01(seed, ctx.tick, side ? 0x9e37 : 0x51f7, moveSalt) * 3) - 1;

  // Parry: held block inside the rising-edge window, grounded.
  // Contact (no whiff) but no combo: parries and blocks never feed combo.
  if (def.parryWindow > 0 && def.blockHeld && def.grounded) {
    def.state = "parry";
    def.stateTick = 0;
    def.stunTick = 18;
    def.moveId = null;
    def.moveTick = 0;
    def.parryWindow = 0;
    att.state = "stun";
    att.stateTick = 0;
    att.stunTick = 20;
    att.moveId = null;
    att.moveTick = 0;
    att.didHit = true;
    ev({ t: "parried", move: mv.id, damage: 0 });
    return;
  }

  // Block: chip damage plus stamina drain. Contact but no combo.
  if (isBlocking(def)) {
    const chip = Math.max(0, Math.round(mv.chip));
    def.hp = Math.max(0, def.hp - chip);
    def.stamina = Math.max(0, def.stamina - (4 + chip * 2));
    def.x = clampX(def.x + att.facing * mv.knockback * 0.5);
    att.didHit = true;
    ev({ t: "blocked", move: mv.id, damage: chip });
    if (def.stamina <= 0 && def.hp > 0) {
      def.state = "stun";
      def.stateTick = 0;
      def.stunTick = 30;
      def.moveId = null;
      def.moveTick = 0;
    }
    if (def.hp <= 0) enterKo(def, ev, mv.id);
    return;
  }

  // Clean hit only: advance the combo counter and scale damage.
  const adv = advanceCombo(att.combo, att.comboTick, ctx.tick);
  att.combo = adv.hits;
  att.comboTick = ctx.tick;
  att.didHit = true;
  const scale = adv.scale;
  // Clean hit: scaled damage, knockback, stun or launch.
  const dmg = Math.max(1, Math.round(mv.damage * scale * dmgScale) + jitter);
  def.hp = Math.max(0, def.hp - dmg);
  def.x = clampX(def.x + att.facing * mv.knockback);
  def.stamina = Math.max(0, def.stamina - 6);
  def.stateTick = 0;
  def.moveId = null;
  def.moveTick = 0;
  def.parryWindow = 0;
  ev({ t: "hit", move: mv.id, damage: dmg });
  if (def.hp <= 0) {
    enterKo(def, ev, mv.id);
  } else if (mv.knockback >= KNOCKDOWN_KB) {
    def.state = "knockdown";
    def.stunTick = KNOCKDOWN_TICKS;
  } else {
    def.state = mv.stun >= 20 ? "stun" : "hit";
    def.stunTick = Math.max(1, Math.round(mv.stun));
  }
}

function attackTick(f, inp, ctx, ev) {
  const mv = ctx.moveTable?.[f.moveId];
  if (mv == null || typeof mv !== "object") {
    f.state = "idle";
    f.stateTick = 0;
    f.moveId = null;
    f.moveTick = 0;
    return;
  }
  f.moveTick += 1;
  const total = mv.startup + mv.active + mv.recovery;

  // Cancel window: after startup, an edge for a listed target starts it.
  if (f.moveTick >= mv.startup && Array.isArray(mv.cancelInto)) {
    for (const target of mv.cancelInto) {
      if (ctx.moveTable[target] && matchesTrigger(target, inp)) {
        startAttack(f, target);
        return;
      }
    }
  }

  // Active window: single hit test per swing.
  const foe = ctx.foe;
  if (
    !f.didHit &&
    f.moveTick >= mv.startup &&
    f.moveTick < mv.startup + mv.active &&
    foe != null &&
    foe.state !== "ko" &&
    foe.state !== "knockdown" &&
    foe.state !== "down" &&
    attackHits(f.x, f.facing, mv.range, foe.x, foe.y, mv.id)
  ) {
    resolveHit(f, foe, mv, ctx, ev);
  }

  if (f.moveTick >= total) {
    if (!f.didHit) ev({ t: "whiff", move: f.moveId, damage: 0 });
    f.state = "idle";
    f.stateTick = 0;
    f.moveId = null;
    f.moveTick = 0;
  }
}

/**
 * Advance one fighter by a single tick.
 * @param {FighterState} f fighter to advance (mutated in place)
 * @param {CombatInput} input raw input edges for this tick
 * @param {{rng?:()=>number, seed?:number, events?:FightEvent[], tick?:number, foe?:FighterState, moveTable?:Record<string, import("./types.js").MoveDef>, side?:0|1, dmgScale?:number}} [ctx]
 * @returns {FighterState} the same fighter object
 */
export function stepFighter(f, input, ctx = {}) {
  const tick = Number.isFinite(ctx.tick) ? Math.floor(ctx.tick) : 0;
  const events = Array.isArray(ctx.events) ? ctx.events : [];
  const side = ctx.side === 1 ? 1 : 0;
  /** @param {{t:FightEvent["t"], move?:string|null, damage?:number}} e */
  const ev = (e) => {
    events.push({
      t: e.t,
      tick,
      side,
      move: e.move ?? null,
      damage: e.damage ?? 0,
    });
  };
  const inp = {
    move: clampDir(input?.move),
    crouch: !!input?.crouch,
    jump: !!input?.jump,
    punch: !!input?.punch,
    kick: !!input?.kick,
    block: !!input?.block,
    special: !!input?.special,
    dash: clampDir(input?.dash),
  };
  const step = {
    rng: ctx.rng,
    seed: ctx.seed,
    events,
    tick,
    foe: ctx.foe ?? null,
    moveTable: ctx.moveTable ?? {},
    side,
    dmgScale: ctx.dmgScale,
  };

  if (!STATES.includes(f.state)) f.state = "idle";
  if (f.state === "ko") return f;

  f.stateTick += 1;
  if (f.parryWindow > 0) f.parryWindow -= 1;

  // Block hold tracks the input every tick; the rising edge opens parry.
  // wantBlock remembers raw intent separately: at 0 stamina blockHeld drops
  // but wantBlock stays true so the passive guard-break below can fire.
  const wasHeld = f.blockHeld;
  f.wantBlock = inp.block && f.grounded;
  f.blockHeld = f.wantBlock && f.stamina > 0;
  if (!wasHeld && f.blockHeld) f.parryWindow = PARRY_WINDOW;

  // A fighter at 0 hp is KO even mid-air: check before the airborne
  // early-return below, which would otherwise skip the KO fallback.
  if (f.hp <= 0 && f.state !== "ko") {
    enterKo(f, ev, f.moveId);
    return f;
  }

  // Airborne: integrate jump physics, ignore attacks/blocks.
  if (!f.grounded) {
    f.vy -= GRAVITY;
    f.y += f.vy;
    f.x = clampX(f.x + f.vx + inp.move * AIR_DRIFT);
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      f.vx = 0;
      f.grounded = true;
      if (f.state === "jump") {
        f.state = "idle";
        f.stateTick = 0;
      }
    }
    return f;
  }

  switch (f.state) {
    case "idle":
    case "walk": {
      // Same-tick crouch+attack starts the crouch attack directly (sweep or
      // uppercut) instead of dropping the attack edge on the way to crouch.
      if (inp.crouch && (inp.kick || inp.special)) {
        const crouchId = selectMove(inp, f.state);
        if (crouchId && step.moveTable[crouchId]) {
          startAttack(f, crouchId);
          break;
        }
      }
      if (inp.crouch) {
        f.state = "crouch";
        f.stateTick = 0;
        f.vx = 0;
      } else if (inp.jump) {
        f.vy = JUMP_V;
        f.grounded = false;
        f.state = "jump";
        f.stateTick = 0;
        f.vx = inp.move * WALK_SPEED;
      } else if (f.blockHeld) {
        f.state = "block";
        f.stateTick = 0;
        f.vx = 0;
      } else {
        const id = selectMove(inp, f.state);
        if (id && step.moveTable[id]) {
          startAttack(f, id);
        } else if (inp.dash !== 0) {
          f.x = clampX(f.x + inp.dash * DASH_SPEED);
          f.vx = inp.dash * DASH_SPEED;
          f.stamina = Math.max(0, f.stamina - DASH_COST);
          f.state = "walk";
          f.stateTick = 0;
        } else if (inp.move !== 0) {
          f.x = clampX(f.x + inp.move * WALK_SPEED);
          f.vx = inp.move * WALK_SPEED;
          f.state = "walk";
          f.stateTick = 0;
        } else {
          f.state = "idle";
          f.vx = 0;
        }
        if (f.state === "idle" || f.state === "walk") {
          f.stamina = Math.min(STAMINA_MAX, f.stamina + STAMINA_REGEN);
        }
      }
      break;
    }
    case "crouch": {
      f.vx = 0;
      if (!inp.crouch) {
        f.state = "idle";
        f.stateTick = 0;
      } else if (f.blockHeld) {
        f.state = "block";
        f.stateTick = 0;
      } else {
        const id = selectMove(inp, f.state);
        if (id && step.moveTable[id]) startAttack(f, id);
      }
      f.stamina = Math.min(STAMINA_MAX, f.stamina + STAMINA_REGEN);
      break;
    }
    case "block": {
      f.vx = 0;
      if (!f.wantBlock) {
        f.state = "idle";
        f.stateTick = 0;
      } else if (f.stamina <= 0) {
        // Guard break: block still held with no stamina left.
        f.state = "stun";
        f.stateTick = 0;
        f.stunTick = 30;
        ev({ t: "hit", move: "guardbreak", damage: 0 });
      } else {
        f.stamina = Math.max(0, f.stamina - BLOCK_DRAIN);
      }
      break;
    }
    case "parry": {
      if (f.stunTick > 0) f.stunTick -= 1;
      else {
        f.state = "idle";
        f.stateTick = 0;
      }
      break;
    }
    case "attack": {
      attackTick(f, inp, step, ev);
      break;
    }
    case "hit":
    case "stun": {
      if (f.stunTick > 0) f.stunTick -= 1;
      else {
        f.state = "idle";
        f.stateTick = 0;
        f.moveId = null;
      }
      break;
    }
    case "knockdown": {
      if (f.stunTick > 0) f.stunTick -= 1;
      else {
        f.state = "down";
        f.stateTick = 0;
        f.stunTick = DOWN_TICKS;
      }
      break;
    }
    case "down": {
      if (f.stunTick > 0) f.stunTick -= 1;
      else {
        f.state = "idle";
        f.stateTick = 0;
      }
      break;
    }
    case "jump": {
      // Grounded but still flagged jump: re-enter the air.
      f.vy = JUMP_V;
      f.grounded = false;
      f.stateTick = 0;
      break;
    }
    default: {
      f.state = "idle";
      f.stateTick = 0;
      break;
    }
  }

  f.x = clampX(f.x);
  if (f.hp <= 0 && f.state !== "ko") enterKo(f, ev, f.moveId);
  return f;
}
