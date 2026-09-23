/**
 * Umbra M5 haptic pattern map: pure data plus throttling, no DOM.
 * The shell calls patternFor(eventType) to get a vibrate() pattern
 * (durations and pauses in ms; [0] means skip) and passes it to
 * navigator.vibrate. No navigator access inside this module.
 */

/** Vibrate patterns per combat/UI event type ([0] means skip). */
export const HAPTIC_PATTERNS = {
  hit: [15],
  block: [10],
  blocked: [10],
  parried: [10, 40, 20],
  ko: [40, 60, 40],
  whiff: [0],
  ui: [8],
};

/** Fallback pattern for unknown event types. */
export const HAPTIC_DEFAULT = [8];

/** Minimum gap between two vibrations of the same kind (ms). */
export const HAPTIC_MIN_GAP_MS = 90;

/** Event types that bypass the throttle (always play immediately). */
const BYPASS = new Set(['ko', 'round']);

/**
 * Pattern for an event type: a copy of the mapped array, or [8] when the
 * type is unknown. Always returns a fresh array so callers cannot mutate
 * the map.
 * @param {string} eventType combat/UI event type
 * @returns {number[]} vibrate() pattern
 */
export function patternFor(eventType) {
  const p = typeof eventType === 'string' ? HAPTIC_PATTERNS[eventType] : undefined;
  return Array.isArray(p) ? p.slice() : HAPTIC_DEFAULT.slice();
}

/**
 * Throttle gate: true when a haptic of this kind may play now.
 * Same-kind plays need a 90 ms gap; ko/round bypass the throttle and
 * always return true. A non-finite lastMs (never played) returns true;
 * a non-finite nowMs returns false (no valid schedule time).
 * @param {string} kind event kind
 * @param {number|null} lastMs last play time of this kind (null = never)
 * @param {number} nowMs current time in ms
 * @returns {boolean}
 */
export function shouldPlayHaptic(kind, lastMs, nowMs) {
  if (typeof kind === 'string' && BYPASS.has(kind)) return true;
  if (!Number.isFinite(lastMs)) return true;
  if (!Number.isFinite(nowMs)) return false;
  return nowMs - lastMs >= HAPTIC_MIN_GAP_MS;
}
