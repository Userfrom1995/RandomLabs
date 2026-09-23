/**
 * Umbra M2 combos: hit-counter plus damage scaling.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 */

/** Ticks without a landed hit before the combo counter drops. */
export const COMBO_WINDOW = 90;
/** Damage-scale floor so long combos still chip through. */
export const COMBO_MIN_SCALE = 0.35;
/** Scale lost per combo hit after the first. */
export const COMBO_DECAY = 0.12;

/**
 * Damage multiplier for the Nth consecutive hit (1-indexed).
 * @param {number} hits hit count including the current hit
 * @returns {number} max(0.35, 1 - 0.12 * (hits - 1))
 */
export function comboScale(hits) {
  const n = Number.isFinite(hits) ? Math.max(1, Math.floor(hits)) : 1;
  return Math.max(COMBO_MIN_SCALE, 1 - COMBO_DECAY * (n - 1));
}

/**
 * Whether a combo that last landed at lastTick has expired by tick.
 * @param {number} lastTick tick of the most recent landed hit
 * @param {number} tick current tick
 * @returns {boolean} true when tick - lastTick > 90
 */
export function comboExpired(lastTick, tick) {
  if (!Number.isFinite(lastTick) || !Number.isFinite(tick)) return true;
  return tick - lastTick > COMBO_WINDOW;
}

/**
 * Single owner of the combo-advance algorithm. The live sim (fighter.js
 * resolveHit) is the runtime owner of combo/comboTick fields; this helper
 * computes the next count and scale so comboTrack/registerHit below and the
 * sim can never drift apart.
 * @param {number} hits current consecutive-hit count (0 when none)
 * @param {number} lastTick tick of the most recent landed hit
 * @param {number} tick current tick
 * @returns {{hits:number, scale:number}} next count plus its damage scale
 */
export function advanceCombo(hits, lastTick, tick) {
  const h = Number.isFinite(hits) ? Math.max(0, Math.floor(hits)) : 0;
  const now = Number.isFinite(tick) ? tick : 0;
  const next = comboExpired(lastTick, now) ? 1 : h + 1;
  return { hits: next, scale: comboScale(next) };
}

/**
 * Per-fighter combo tracker factory.
 * @returns {{hits:number, lastTick:number, scaleFor:(tick:number)=>number, register:(tick:number)=>number, reset:()=>void}}
 */
export function comboTrack() {
  const track = {
    hits: 0,
    lastTick: Number.NEGATIVE_INFINITY,
    /**
     * Peek the scale the next hit at tick would use (no mutation).
     * @param {number} tick current tick
     */
    scaleFor(tick) {
      if (comboExpired(track.lastTick, tick)) return comboScale(1);
      return comboScale(track.hits + 1);
    },
    /**
     * Record a landed hit at tick. Returns the scale applied to that hit.
     * @param {number} tick current tick
     */
    register(tick) {
      const adv = advanceCombo(track.hits, track.lastTick, tick);
      track.hits = adv.hits;
      track.lastTick = Number.isFinite(tick) ? tick : 0;
      return adv.scale;
    },
    /** Drop the combo immediately. */
    reset() {
      track.hits = 0;
      track.lastTick = Number.NEGATIVE_INFINITY;
    },
  };
  return track;
}

/**
 * Reset a combo tracker when its window has elapsed.
 * @param {{hits:number, lastTick:number}} track tracker to inspect
 * @param {number} tick current tick
 * @returns {boolean} true when the combo was dropped
 */
export function comboReset(track, tick) {
  if (track == null || typeof track !== "object") return false;
  if (comboExpired(track.lastTick, tick)) {
    track.hits = 0;
    return true;
  }
  return false;
}

/**
 * Register a landed hit for one side of a bout state.
 * Operates on FightState-shaped objects whose fighters carry
 * combo/comboTick fields (see fighter.js); falls back to a plain
 * {hits, lastTick} tracker pair when present.
 * @param {0|1} side attacking side
 * @param {{tick?:number, fighters?:Array}} state bout or tracker-holder state
 * @param {number} [tick] current tick (defaults to state.tick)
 * @returns {number} damage scale applied to this hit
 */
export function registerHit(side, state, tick) {
  const t = Number.isFinite(tick) ? tick : state?.tick;
  const now = Number.isFinite(t) ? t : 0;
  const s = side === 1 ? 1 : 0;
  const holder = state?.fighters?.[s] ?? state?.combos?.[s] ?? state;
  if (holder == null || typeof holder !== "object") return comboScale(1);
  const last = Number.isFinite(holder.comboTick)
    ? holder.comboTick
    : holder.lastTick;
  const base = "combo" in holder ? holder.combo : holder.hits;
  const adv = advanceCombo(base, last, now);
  if ("combo" in holder) {
    holder.combo = adv.hits;
    holder.comboTick = now;
  } else {
    holder.hits = adv.hits;
    holder.lastTick = now;
  }
  return adv.scale;
}
