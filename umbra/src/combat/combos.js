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
      if (comboExpired(track.lastTick, tick)) track.hits = 1;
      else track.hits += 1;
      track.lastTick = tick;
      return comboScale(track.hits);
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
  if (comboExpired(last, now)) {
    if ("combo" in holder) holder.combo = 1;
    else holder.hits = 1;
  } else if ("combo" in holder) {
    holder.combo = (Number.isFinite(holder.combo) ? holder.combo : 0) + 1;
  } else {
    holder.hits = (Number.isFinite(holder.hits) ? holder.hits : 0) + 1;
  }
  if ("comboTick" in holder) holder.comboTick = now;
  else holder.lastTick = now;
  const hits = "combo" in holder ? holder.combo : holder.hits;
  return comboScale(hits);
}
