// M5 integration gates: pure verdict logic for the end-to-end audit.
// Every function is DOM-free so node:test can pin it headless; the browser
// harnesses (tools/capture-m5.mjs, tools/bench-m5.mjs) collect raw samples
// over CDP and call these verdicts to resolve each H-cell deterministically.
// No em dash in this file by repo rule (use hyphen or colon).
import {
  mean, median, quantileSorted, sortedCopy, cv, bootstrapMeanCI,
  pairedBootstrapCI,
} from './stats.js';

// Single-frame budget at 60 FPS (1000/60).
export const FRAME_BUDGET_MS = 1000 / 60;

// The four deterministic empirical states (charter binding).
export const CELL_STATES = [
  'MEASURED',
  'SATURATION_COLLAPSE',
  'UNSUPPORTED_BY_DESIGN',
  'INVALID_SPECIFICATION',
];

export function assertCellState(state) {
  if (!CELL_STATES.includes(state)) throw new Error(`unknown cell state ${state}`);
  return state;
}

// Time-to-first-frame bands from the research spec (ms). Local serving runs
// faster than any band floor, so verdicts pass when at or under the ceiling.
export const TTFF_BANDS = {
  broadband: { loMs: 800, hiMs: 2000, label: 'broadband cold 0.8-2.0s' },
  solid4g: { loMs: 2500, hiMs: 5000, label: 'solid 4G cold 2.5-5s' },
  weak4g: { loMs: 5000, hiMs: 9000, label: 'weak 4G cold 5-9s' },
  warm: { loMs: 500, hiMs: 1000, label: 'warm revisit 0.5-1.0s' },
};

function requireFiniteNumber(v, name) {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`${name} must be a finite number`);
  }
  return v;
}

export function classifyTTFF(ms, band) {
  requireFiniteNumber(ms, 'ttff ms');
  if (ms < 0) throw new Error('ttff ms must be non-negative');
  const spec = TTFF_BANDS[band];
  if (!spec) throw new Error(`unknown TTFF band ${band}`);
  return {
    band,
    ms,
    ceilingMs: spec.hiMs,
    // Faster than the floor is fine (localhost serves in ms); only the
    // ceiling gates. Meeting the ceiling means inside-or-faster.
    within: ms <= spec.hiMs,
    label: spec.label,
  };
}

// Summarize N TTFF samples against one band with a bootstrap 95 percent CI
// on the mean. Passes when the CI upper bound sits under the ceiling.
export function summarizeTTFF(samplesMs, band) {
  if (!Array.isArray(samplesMs) || samplesMs.length === 0) {
    throw new Error('TTFF samples must be a non-empty array');
  }
  for (const s of samplesMs) {
    requireFiniteNumber(s, 'ttff sample');
    if (s < 0) throw new Error('ttff samples must be non-negative');
  }
  const spec = TTFF_BANDS[band];
  if (!spec) throw new Error(`unknown TTFF band ${band}`);
  const sorted = sortedCopy(samplesMs);
  const ci = bootstrapMeanCI(samplesMs, { resamples: 10000 });
  return {
    band,
    n: samplesMs.length,
    meanMs: mean(samplesMs),
    medianMs: median(samplesMs),
    p95Ms: quantileSorted(sorted, 0.95),
    p99Ms: quantileSorted(sorted, 0.99),
    cv: cv(samplesMs),
    meanCI95: { lo: ci.lo, hi: ci.hi },
    ceilingMs: spec.hiMs,
    within: ci.hi <= spec.hiMs,
  };
}

// Evaluate one rAF frame-time trace (ms per frame deltas). Rejects empty,
// NaN, non-finite, and non-positive deltas (a zero or negative delta is a
// broken clock, not a fast frame). Frame intervals convert to implied FPS
// only after the p95 budget verdict is computed, never by averaging FPS.
export function evaluateFrameTrace(deltasMs) {
  if (!Array.isArray(deltasMs) || deltasMs.length === 0) {
    throw new Error('frame trace must be a non-empty array');
  }
  for (const d of deltasMs) {
    requireFiniteNumber(d, 'frame delta');
    if (d <= 0) throw new Error('frame deltas must be positive (broken clock)');
  }
  const sorted = sortedCopy(deltasMs);
  const p95 = quantileSorted(sorted, 0.95);
  return {
    n: deltasMs.length,
    meanMs: mean(deltasMs),
    medianMs: median(deltasMs),
    p95Ms: p95,
    p99Ms: quantileSorted(sorted, 0.99),
    cv: cv(deltasMs),
    budgetMs: FRAME_BUDGET_MS,
    withinBudget: p95 <= FRAME_BUDGET_MS,
    impliedFps: 1000 / mean(deltasMs),
  };
}

// Paired renderer-path comparison (Tier 0 vs Tier 1 traces, interleaved).
// Returns the paired bootstrap CI on the mean diff; excludesZero is the
// significance verdict for the head-to-head claim.
export function compareRenderPaths(aMs, bMs) {
  const pair = pairedBootstrapCI(aMs, bMs, { resamples: 10000 });
  return {
    n: pair.n,
    meanDiffMs: pair.meanDiff,
    medianDiffMs: pair.medianDiff,
    meanDiffCI95: { lo: pair.lo, hi: pair.hi },
    excludesZero: pair.lo > 0 || pair.hi < 0,
  };
}

// WAD ingest round-trip verdict: the staged file must be accepted, at least
// one map must stay viable, and the running level must survive (status line
// still reports a running map after the drop).
export function ingestVerdict({ fileAccepted, viableCount, runningAfter }) {
  const viable = Number(viableCount);
  if (!Number.isInteger(viable) || viable < 0) {
    throw new Error('viableCount must be a non-negative integer');
  }
  const reasons = [];
  if (!fileAccepted) reasons.push('staged file was rejected');
  if (viable === 0) reasons.push('no viable maps survived');
  if (!runningAfter) reasons.push('running level did not survive');
  return { pass: reasons.length === 0, reasons };
}

// Corrupt-WAD verdict: the file must be rejected AND the previous level
// must keep running (the two halves of the per-map isolation promise).
export function corruptVerdict({ rejected, runningAfter, errorShown }) {
  const reasons = [];
  if (!rejected) reasons.push('corrupt file was not rejected');
  if (!errorShown) reasons.push('no error surfaced in the alert box');
  if (!runningAfter) reasons.push('running level died on a bad file');
  return { pass: reasons.length === 0, reasons };
}

// Onboarding verdict across a reload boundary.
export function onboardingVerdict({ visibleOnFirstVisit, hiddenAfterDismiss, hiddenAfterReload }) {
  const reasons = [];
  if (!visibleOnFirstVisit) reasons.push('onboarding missing on first visit');
  if (!hiddenAfterDismiss) reasons.push('dismiss did not hide the panel');
  if (!hiddenAfterReload) reasons.push('dismiss did not persist across reload');
  return { pass: reasons.length === 0, reasons };
}

// Audio unlock verdict: locked before the gesture, running after, and zero
// scheduled events before unlock (the H5 promise).
export function audioUnlockVerdict({ lockedBefore, runningAfter, preUnlockEvents }) {
  const pre = Number(preUnlockEvents);
  if (!Number.isInteger(pre) || pre < 0) {
    throw new Error('preUnlockEvents must be a non-negative integer');
  }
  const reasons = [];
  if (!lockedBefore) reasons.push('audio was not locked pre-gesture');
  if (!runningAfter) reasons.push('audio did not start post-gesture');
  if (pre !== 0) reasons.push(`${pre} events scheduled before unlock`);
  return { pass: reasons.length === 0, reasons };
}

// Save round-trip verdict: a slot write followed by a reload must restore
// the slot list entry (persistence across refresh, the M3 promise).
export function savePersistVerdict({ savedBytes, slotPresentAfterReload }) {
  const bytes = Number(savedBytes);
  if (!Number.isInteger(bytes) || bytes < 0) {
    throw new Error('savedBytes must be a non-negative integer');
  }
  const reasons = [];
  if (bytes === 0) reasons.push('nothing was saved');
  if (!slotPresentAfterReload) reasons.push('slot missing after reload');
  return { pass: reasons.length === 0, reasons };
}
