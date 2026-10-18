// M5 Tester red-team suite: hostile boundary, degenerate-input, soak, and
// determinism probes for the integration gate verdicts (src/perf/m5gates.js)
// plus the bench-m5.json cell schema (every H-cell resolved, eco 4/4).
// Headless (node:test), no DOM. All cases pass against the M5 milestone.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyTTFF, summarizeTTFF, evaluateFrameTrace, compareRenderPaths,
  ingestVerdict, corruptVerdict, onboardingVerdict, audioUnlockVerdict,
  savePersistVerdict, assertCellState, CELL_STATES,
} from '../src/perf/m5gates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bench = JSON.parse(readFileSync(join(root, 'docs/bench-m5.json'), 'utf8'));

describe('M5 hostile input rejection (must throw, never garbage)', () => {
  it('classifyTTFF rejects NaN, Infinity, negatives, unknown bands', () => {
    assert.throws(() => classifyTTFF(NaN, 'broadband'), /finite/);
    assert.throws(() => classifyTTFF(Infinity, 'broadband'), /finite/);
    assert.throws(() => classifyTTFF(-0.1, 'broadband'), /non-negative/);
    assert.throws(() => classifyTTFF('fast', 'broadband'), /finite/);
    assert.throws(() => classifyTTFF(undefined, 'broadband'), /finite/);
    assert.throws(() => classifyTTFF(100, 'dialup'), /unknown TTFF band/);
    assert.throws(() => classifyTTFF(100, ''), /unknown TTFF band/);
  });
  it('summarizeTTFF rejects empty, NaN, negative, unknown-band samples', () => {
    assert.throws(() => summarizeTTFF([], 'broadband'), /non-empty/);
    assert.throws(() => summarizeTTFF([100, NaN], 'broadband'), /finite/);
    assert.throws(() => summarizeTTFF([100, Infinity], 'broadband'), /finite/);
    assert.throws(() => summarizeTTFF([100, -5], 'broadband'), /non-negative/);
    assert.throws(() => summarizeTTFF([100], 'nope'), /unknown TTFF band/);
    assert.throws(() => summarizeTTFF('100,200', 'broadband'), /non-empty/);
  });
  it('evaluateFrameTrace rejects empty, zero, negative, non-finite deltas', () => {
    assert.throws(() => evaluateFrameTrace([]), /non-empty/);
    assert.throws(() => evaluateFrameTrace([16, 0, 16]), /positive/);
    assert.throws(() => evaluateFrameTrace([16, -2]), /positive/);
    assert.throws(() => evaluateFrameTrace([16, NaN]), /finite/);
    assert.throws(() => evaluateFrameTrace([16, Infinity]), /finite/);
    assert.throws(() => evaluateFrameTrace('16,16'), /non-empty/);
  });
  it('verdict inputs reject fractional and negative counters', () => {
    assert.throws(
      () => ingestVerdict({ fileAccepted: true, viableCount: 1.5, runningAfter: true }),
      /integer/,
    );
    assert.throws(
      () => ingestVerdict({ fileAccepted: true, viableCount: -1, runningAfter: true }),
      /non-negative/,
    );
    assert.throws(
      () => audioUnlockVerdict({ lockedBefore: true, runningAfter: true, preUnlockEvents: -1 }),
      /non-negative/,
    );
    assert.throws(
      () => audioUnlockVerdict({ lockedBefore: true, runningAfter: true, preUnlockEvents: 0.5 }),
      /integer/,
    );
    assert.throws(
      () => savePersistVerdict({ savedBytes: -5, slotPresentAfterReload: true }),
      /non-negative/,
    );
    assert.throws(() => compareRenderPaths([1, 2], [1]), /match/);
    assert.throws(() => assertCellState('pending'), /unknown cell state/);
    assert.throws(() => assertCellState('MEASURED '), /unknown cell state/);
  });
});

describe('M5 verdict determinism (same input, same verdict)', () => {
  it('paired render-path compare is sign-stable across repeat calls', () => {
    const a = Array.from({ length: 30 }, (_, i) => 2.0 + (i % 4) * 0.05);
    const b = Array.from({ length: 30 }, (_, i) => 1.0 + (i % 4) * 0.05);
    const first = compareRenderPaths(a, b);
    const second = compareRenderPaths(a, b);
    assert.equal(first.excludesZero, true);
    assert.equal(second.excludesZero, true);
    assert.ok(Math.sign(first.meanDiffMs) === Math.sign(second.meanDiffMs));
  });
  it('identical paths never claim significance', () => {
    const a = Array.from({ length: 30 }, (_, i) => 1.5 + (i % 3) * 0.01);
    assert.equal(compareRenderPaths(a, [...a]).excludesZero, false);
    assert.equal(compareRenderPaths(a, [...a]).meanDiffMs, 0);
  });
  it('frame-trace budget verdict is monotonic in junk injection', () => {
    const clean = Array.from({ length: 120 }, (_, i) => 16.0 + (i % 5) * 0.1);
    assert.equal(evaluateFrameTrace(clean).withinBudget, true);
    const janky = Array.from({ length: 120 }, (_, i) => (i % 10 === 0 ? 40 : 16));
    assert.equal(evaluateFrameTrace(janky).withinBudget, false);
  });
});

describe('M5 verdict soak (5000 calls, no hang, no state leak)', () => {
  it('runs 5000 mixed verdict calls in well under 5s', () => {
    const t0 = Date.now();
    for (let i = 0; i < 5000; i++) {
      ingestVerdict({ fileAccepted: true, viableCount: i % 3, runningAfter: i % 2 === 0 });
      corruptVerdict({ rejected: true, runningAfter: true, errorShown: true });
      onboardingVerdict({ visibleOnFirstVisit: true, hiddenAfterDismiss: true, hiddenAfterReload: true });
    }
    assert.ok(Date.now() - t0 < 5000, 'soak exceeded 5s budget');
  });
});

describe('M5 bench ledger schema (tester-side pin, mirrors audit-m5)', () => {
  it('every H-cell resolves to a deterministic state, no pending rows', () => {
    for (const k of ['H1', 'H2browser', 'H3', 'H4', 'H5', 'ecosystem']) {
      assert.ok(bench.cells[k], `missing cell ${k}`);
      assert.ok(CELL_STATES.includes(bench.cells[k].state), `unresolved cell ${k}`);
    }
    assert.ok(!JSON.stringify(bench).includes('pending'), 'bare pending row in ledger');
  });
  it('H1 reports zero dropped vsyncs and H4 sits within band ceilings', () => {
    assert.equal(bench.cells.H1.pooled.droppedVsyncs, 0);
    assert.equal(bench.cells.H4.cold.within, true);
    assert.equal(bench.cells.H4.warm.within, true);
  });
  it('ecosystem verdicts pass 4/4', () => {
    for (const k of ['ingest', 'corrupt', 'onboarding', 'save']) {
      assert.equal(bench.cells.ecosystem[k].verdict.pass, true, `eco ${k} fails`);
    }
  });
});
