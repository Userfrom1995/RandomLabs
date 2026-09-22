/**
 * Umbra resolution ladder: fixed steps with EWMA frame-time governor and
 * 500 ms switch hysteresis. Pure logic, no DOM (the app applies sizes).
 */

export const LADDER = [
  { w: 1280, h: 720 },
  { w: 960, h: 540 },
  { w: 640, h: 360 },
  { w: 426, h: 240 },
];

export const SWITCH_COOLDOWN_MS = 500;
export const STEP_UP_MS = 19;
export const STEP_DOWN_MS = 11;
export const BATTERY_SAVER_INDEX = 2;

/**
 * Exponentially weighted moving average of frame times.
 * @param {number} prev previous EWMA (ms)
 * @param {number} sample latest frame time (ms)
 * @param {number} alpha blending factor
 * @returns {number} updated EWMA
 */
export function updateEwma(prev, sample, alpha = 0.1) {
  if (!Number.isFinite(prev)) return sample;
  if (!Number.isFinite(sample) || sample < 0) return prev;
  return prev + alpha * (sample - prev);
}

/**
 * Governor: pick the next ladder index.
 * Battery saver pins the ladder at 640x360. Otherwise step down when slow,
 * step up when fast, at most one step per cooldown window.
 * @param {{index:number, ewma:number, nowMs:number, lastSwitchMs:number, batterySaver?:boolean}} s
 * @returns {number} next ladder index
 */
export function nextLadderIndex(s) {
  if (s.batterySaver) return BATTERY_SAVER_INDEX;
  const cur = Math.min(Math.max(s.index | 0, 0), LADDER.length - 1);
  if (s.nowMs - s.lastSwitchMs < SWITCH_COOLDOWN_MS) return cur;
  if (s.ewma > STEP_UP_MS && cur < LADDER.length - 1) return cur + 1;
  if (s.ewma < STEP_DOWN_MS && cur > 0) return cur - 1;
  return cur;
}

/**
 * @param {number} index ladder index
 * @returns {{w:number, h:number}} canvas backing size
 */
export function ladderSize(index) {
  const i = Math.min(Math.max(index | 0, 0), LADDER.length - 1);
  return { ...LADDER[i] };
}
