// M1 perf statistics harness (spec: N >= 30, paired bootstrap 95 percent CIs,
// CV below 5 percent). Frame-time intervals are computed on frame times (ms)
// then converted, never averaged as FPS. Deterministic seeded resampling so
// repeated runs over the same samples produce identical CIs.
export function mean(xs) {
  if (xs.length === 0) throw new Error('mean of empty sample');
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

export function sortedCopy(xs) {
  return [...xs].sort((a, b) => a - b);
}

export function quantileSorted(sorted, p) {
  if (sorted.length === 0) throw new Error('quantile of empty sample');
  if (p <= 0) return sorted[0];
  if (p >= 1) return sorted[sorted.length - 1];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function median(xs) {
  return quantileSorted(sortedCopy(xs), 0.5);
}

export function sd(xs, mu = mean(xs)) {
  if (xs.length < 2) return 0;
  let s = 0;
  for (const x of xs) s += (x - mu) * (x - mu);
  return Math.sqrt(s / (xs.length - 1));
}

// Coefficient of variation (sd / mean). Returns 0 for a zero-mean sample.
export function cv(xs) {
  const mu = mean(xs);
  if (mu === 0) return 0;
  return sd(xs, mu) / Math.abs(mu);
}

export function summary(xs) {
  const sorted = sortedCopy(xs);
  const mu = mean(xs);
  const s = sd(xs, mu);
  return {
    n: xs.length,
    mean: mu,
    median: quantileSorted(sorted, 0.5),
    p95: quantileSorted(sorted, 0.95),
    p99: quantileSorted(sorted, 0.99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    sd: s,
    cv: mu === 0 ? 0 : s / Math.abs(mu),
  };
}

// Deterministic LCG (Numerical Recipes constants) for reproducible resampling.
export function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// Bootstrap 95 percent CI for the mean of one sample.
export function bootstrapMeanCI(xs, { resamples = 10000, seed = 0xC10C } = {}) {
  if (xs.length === 0) throw new Error('bootstrap of empty sample');
  const rand = lcg(seed);
  const n = xs.length;
  const means = new Array(resamples);
  for (let r = 0; r < resamples; r++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += xs[(rand() * n) | 0];
    means[r] = s / n;
  }
  means.sort((a, b) => a - b);
  return {
    lo: quantileSorted(means, 0.025),
    hi: quantileSorted(means, 0.975),
    resamples,
    seed,
  };
}

// Paired bootstrap 95 percent CI for the mean of (a - b) differences.
// Samples must be paired (same iteration index, interleaved measurement).
export function pairedBootstrapCI(a, b, { resamples = 10000, seed = 0x9E3779B9 } = {}) {
  if (a.length !== b.length) throw new Error('paired samples must match in length');
  if (a.length === 0) throw new Error('paired bootstrap of empty samples');
  const diffs = a.map((x, i) => x - b[i]);
  const ci = bootstrapMeanCI(diffs, { resamples, seed });
  return { meanDiff: mean(diffs), medianDiff: median(diffs), ...ci, n: a.length };
}
