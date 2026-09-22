/**
 * Umbra perf stats: mean/median/p95 over frame-time samples. Pure, no DOM.
 */

/**
 * @param {number[]} xs samples
 * @returns {number} arithmetic mean, NaN when empty
 */
export function mean(xs) {
  if (!xs.length) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/**
 * @param {number[]} xs samples
 * @returns {number} median, NaN when empty
 */
export function median(xs) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Nearest-rank percentile.
 * @param {number[]} xs samples
 * @param {number} p percentile 0..100
 * @returns {number} value, NaN when empty
 */
export function percentile(xs, p) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const rank = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[rank];
}

/**
 * @param {number[]} xs frame times in ms
 * @returns {{n:number, mean:number, median:number, p95:number, min:number, max:number}}
 */
export function summarize(xs) {
  if (!xs.length) return { n: 0, mean: NaN, median: NaN, p95: NaN, min: NaN, max: NaN };
  return {
    n: xs.length,
    mean: mean(xs),
    median: median(xs),
    p95: percentile(xs, 95),
    min: Math.min(...xs),
    max: Math.max(...xs),
  };
}
