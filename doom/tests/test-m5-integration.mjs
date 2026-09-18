// M5 integration gate tests: pins the pure end-to-end verdict logic in
// src/perf/m5gates.js (TTFF bands, frame-trace budget, paired render-path
// comparison, ingest/corrupt/onboarding/unlock/save verdicts). Headless
// (node:test), no DOM. Hostile probes included.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAME_BUDGET_MS, CELL_STATES, assertCellState, TTFF_BANDS,
  classifyTTFF, summarizeTTFF, evaluateFrameTrace, compareRenderPaths,
  ingestVerdict, corruptVerdict, onboardingVerdict, audioUnlockVerdict,
  savePersistVerdict,
} from '../src/perf/m5gates.js';

describe('cell states and budget constants', () => {
  it('pins the four deterministic states and the 60 FPS budget', () => {
    assert.deepEqual(CELL_STATES, [
      'MEASURED', 'SATURATION_COLLAPSE', 'UNSUPPORTED_BY_DESIGN', 'INVALID_SPECIFICATION',
    ]);
    assert.equal(FRAME_BUDGET_MS, 1000 / 60);
    assert.ok(Math.abs(FRAME_BUDGET_MS - 16.667) < 0.001);
  });
  it('assertCellState accepts the four states and rejects anything else', () => {
    for (const s of CELL_STATES) assert.equal(assertCellState(s), s);
    assert.throws(() => assertCellState('pending'), /unknown cell state/);
    assert.throws(() => assertCellState('MEASURED '), /unknown cell state/);
    assert.throws(() => assertCellState(''), /unknown cell state/);
  });
  it('pins the four TTFF bands from the research spec', () => {
    assert.deepEqual(Object.keys(TTFF_BANDS).sort(), ['broadband', 'solid4g', 'warm', 'weak4g']);
    assert.equal(TTFF_BANDS.broadband.hiMs, 2000);
    assert.equal(TTFF_BANDS.warm.hiMs, 1000);
  });
});

describe('classifyTTFF', () => {
  it('passes a localhost-fast sample (faster than the floor is fine)', () => {
    const v = classifyTTFF(320, 'broadband');
    assert.equal(v.within, true);
    assert.equal(v.ceilingMs, 2000);
  });
  it('fails a sample past the ceiling', () => {
    assert.equal(classifyTTFF(2500, 'broadband').within, false);
  });
  it('treats the ceiling as inclusive', () => {
    assert.equal(classifyTTFF(2000, 'broadband').within, true);
  });
  it('rejects hostile inputs', () => {
    assert.throws(() => classifyTTFF(-1, 'broadband'), /non-negative/);
    assert.throws(() => classifyTTFF(NaN, 'broadband'), /finite/);
    assert.throws(() => classifyTTFF(Infinity, 'broadband'), /finite/);
    assert.throws(() => classifyTTFF('fast', 'broadband'), /finite/);
    assert.throws(() => classifyTTFF(100, 'dialup'), /unknown TTFF band/);
  });
});

describe('summarizeTTFF', () => {
  it('summarizes N samples with CI under the ceiling', () => {
    const samples = Array.from({ length: 30 }, (_, i) => 300 + (i % 7) * 12);
    const s = summarizeTTFF(samples, 'broadband');
    assert.equal(s.n, 30);
    assert.ok(s.meanCI95.hi <= 2000);
    assert.equal(s.within, true);
    assert.ok(s.p95Ms >= s.medianMs);
    assert.ok(s.p99Ms >= s.p95Ms);
  });
  it('fails when the CI sits above the ceiling', () => {
    const samples = Array.from({ length: 30 }, (_, i) => 2100 + (i % 5));
    assert.equal(summarizeTTFF(samples, 'broadband').within, false);
  });
  it('rejects empty and hostile samples', () => {
    assert.throws(() => summarizeTTFF([], 'broadband'), /non-empty/);
    assert.throws(() => summarizeTTFF([100, NaN], 'broadband'), /finite/);
    assert.throws(() => summarizeTTFF([100, -5], 'broadband'), /non-negative/);
    assert.throws(() => summarizeTTFF([100], 'nope'), /unknown TTFF band/);
  });
});

describe('evaluateFrameTrace', () => {
  it('passes a smooth 60 FPS trace', () => {
    const deltas = Array.from({ length: 120 }, (_, i) => 16.0 + (i % 5) * 0.1);
    const v = evaluateFrameTrace(deltas);
    assert.equal(v.n, 120);
    assert.equal(v.withinBudget, true);
    assert.ok(Math.abs(v.impliedFps - 1000 / v.meanMs) < 1e-9);
  });
  it('fails a janky trace past the p95 budget', () => {
    const deltas = Array.from({ length: 120 }, (_, i) => (i % 10 === 0 ? 40 : 16));
    assert.equal(evaluateFrameTrace(deltas).withinBudget, false);
  });
  it('rejects hostile traces', () => {
    assert.throws(() => evaluateFrameTrace([]), /non-empty/);
    assert.throws(() => evaluateFrameTrace([16, 0, 16]), /positive/);
    assert.throws(() => evaluateFrameTrace([16, -2]), /positive/);
    assert.throws(() => evaluateFrameTrace([16, NaN]), /finite/);
    assert.throws(() => evaluateFrameTrace([16, Infinity]), /finite/);
    assert.throws(() => evaluateFrameTrace('16,16'), /non-empty/);
  });
});

describe('compareRenderPaths', () => {
  it('detects a real paired difference with CI excluding zero', () => {
    const a = Array.from({ length: 30 }, (_, i) => 2.0 + (i % 4) * 0.05);
    const b = Array.from({ length: 30 }, (_, i) => 1.0 + (i % 4) * 0.05);
    const c = compareRenderPaths(a, b);
    assert.equal(c.n, 30);
    assert.ok(c.meanDiffMs > 0.9 && c.meanDiffMs < 1.1);
    assert.equal(c.excludesZero, true);
  });
  it('reports overlap on identical paths', () => {
    const a = Array.from({ length: 30 }, (_, i) => 1.5 + (i % 3) * 0.01);
    const c = compareRenderPaths(a, [...a]);
    assert.equal(c.excludesZero, false);
    assert.equal(c.meanDiffMs, 0);
  });
  it('rejects unpaired samples', () => {
    assert.throws(() => compareRenderPaths([1, 2], [1]), /match/);
  });
});

describe('ecosystem verdicts', () => {
  it('ingest passes only on accept plus viable plus surviving level', () => {
    assert.equal(ingestVerdict({ fileAccepted: true, viableCount: 2, runningAfter: true }).pass, true);
    assert.equal(ingestVerdict({ fileAccepted: false, viableCount: 2, runningAfter: true }).pass, false);
    assert.equal(ingestVerdict({ fileAccepted: true, viableCount: 0, runningAfter: true }).pass, false);
    assert.equal(ingestVerdict({ fileAccepted: true, viableCount: 2, runningAfter: false }).pass, false);
    assert.throws(() => ingestVerdict({ fileAccepted: true, viableCount: -1, runningAfter: true }), /non-negative/);
    assert.throws(() => ingestVerdict({ fileAccepted: true, viableCount: 1.5, runningAfter: true }), /integer/);
  });
  it('corrupt verdict needs reject plus error plus survival', () => {
    assert.equal(corruptVerdict({ rejected: true, runningAfter: true, errorShown: true }).pass, true);
    const v = corruptVerdict({ rejected: true, runningAfter: true, errorShown: false });
    assert.equal(v.pass, false);
    assert.ok(v.reasons.join(' ').includes('alert box'));
  });
  it('onboarding needs first-visit show plus dismiss plus reload persistence', () => {
    const good = onboardingVerdict({ visibleOnFirstVisit: true, hiddenAfterDismiss: true, hiddenAfterReload: true });
    assert.equal(good.pass, true);
    assert.deepEqual(good.reasons, []);
    assert.equal(onboardingVerdict({ visibleOnFirstVisit: false, hiddenAfterDismiss: true, hiddenAfterReload: true }).pass, false);
    assert.equal(onboardingVerdict({ visibleOnFirstVisit: true, hiddenAfterDismiss: true, hiddenAfterReload: false }).pass, false);
  });
  it('audio unlock needs locked-before, running-after, zero pre events', () => {
    assert.equal(audioUnlockVerdict({ lockedBefore: true, runningAfter: true, preUnlockEvents: 0 }).pass, true);
    const v = audioUnlockVerdict({ lockedBefore: true, runningAfter: true, preUnlockEvents: 2 });
    assert.equal(v.pass, false);
    assert.ok(v.reasons.join(' ').includes('2 events'));
    assert.throws(() => audioUnlockVerdict({ lockedBefore: true, runningAfter: true, preUnlockEvents: -1 }), /non-negative/);
  });
  it('save persistence needs bytes plus a slot after reload', () => {
    assert.equal(savePersistVerdict({ savedBytes: 512, slotPresentAfterReload: true }).pass, true);
    assert.equal(savePersistVerdict({ savedBytes: 0, slotPresentAfterReload: true }).pass, false);
    assert.equal(savePersistVerdict({ savedBytes: 512, slotPresentAfterReload: false }).pass, false);
  });
});
