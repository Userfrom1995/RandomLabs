/**
 * Umbra render-tier resolution: pure choice logic (probe lives in caps.js,
 * which touches navigator/canvas and is therefore not Node-importable).
 */

export const TIER_NAMES = ['WebGPU', 'WebGL2', 'Canvas2D'];

/**
 * Resolve the active tier: explicit override wins, then cached choice,
 * then the fresh probe result. Unknown values fall through safely.
 * @param {{override?: string|number, cached?: string|number, probed?: number}} s
 * @returns {0|1|2}
 */
export function resolveTier(s) {
  const valid = (v) => v === 0 || v === 1 || v === 2 || v === '0' || v === '1' || v === '2';
  if (valid(s.override) && String(s.override) !== 'auto') return Number(s.override);
  if (s.override === 0 || s.override === '0') return 0;
  if (valid(s.cached)) return Number(s.cached);
  if (valid(s.probed)) return Number(s.probed);
  return 2;
}

/**
 * Fallback chain when a tier fails to initialize at runtime.
 * @param {0|1|2} failedTier
 * @returns {1|2|-1} next tier to try, or -1 when nothing remains
 */
export function tierForFailure(failedTier) {
  if (failedTier === 0) return 1;
  if (failedTier === 1) return 2;
  return -1;
}
