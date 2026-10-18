// M5 Fixer QC suite: pins the Quality Council 8.8/10 rejection fixes
// (H5 N>=30 with CI, H4 CV gate plus per-run samples, H1 run-to-run
// stability, scoreboard-to-bench numeric sync, corpus fuzz plus bounded
// soak ledger rows, summarizeLatency unit pins). Headless (node:test).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  summarizeLatency, CELL_STATES,
} from '../src/perf/m5gates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bench = JSON.parse(readFileSync(join(root, 'docs/bench-m5.json'), 'utf8'));
const fuzz = JSON.parse(readFileSync(join(root, 'docs/fuzz-m5.json'), 'utf8'));
const soak = JSON.parse(readFileSync(join(root, 'docs/soak-m5.json'), 'utf8'));
const score = readFileSync(join(root, 'docs/scoreboard.md'), 'utf8');

describe('summarizeLatency unit pins', () => {
  it('summarizes N samples with a finite CI under the ceiling', () => {
    const s = summarizeLatency(Array.from({ length: 30 }, (_, i) => 30 + (i % 7)), 1000);
    assert.equal(s.n, 30);
    assert.ok(Number.isFinite(s.meanCI95.lo) && Number.isFinite(s.meanCI95.hi));
    assert.ok(s.meanCI95.lo <= s.meanMs && s.meanMs <= s.meanCI95.hi);
    assert.equal(s.within, true);
    assert.ok(s.p95Ms >= s.medianMs && s.p99Ms >= s.p95Ms);
  });
  it('reports within null without a ceiling', () => {
    assert.equal(summarizeLatency([10, 20, 30]).within, null);
  });
  it('rejects empty and hostile samples', () => {
    assert.throws(() => summarizeLatency([], 1000), /non-empty/);
    assert.throws(() => summarizeLatency([10, NaN], 1000), /finite/);
    assert.throws(() => summarizeLatency([10, -1], 1000), /non-negative/);
  });
});

describe('H5 N>=30 with bootstrap CI (Dim 1)', () => {
  it('meets the scoreboard N bar with a finite mean CI', () => {
    assert.ok(bench.cells.H5.n >= 30, `H5 n=${bench.cells.H5.n}`);
    const l = bench.cells.H5.latencySummary;
    assert.ok(l && Number.isFinite(l.meanCI95.lo) && Number.isFinite(l.meanCI95.hi));
    assert.ok(l.meanCI95.lo <= l.meanMs && l.meanMs <= l.meanCI95.hi);
    assert.equal(l.within, true);
  });
});

describe('H4 CV gate plus per-run distributions (Dim 1)', () => {
  it('cold CV sits under 5 percent with 30 pinned samples', () => {
    assert.ok(bench.cells.H4.cold.cv < 0.05, `cold CV=${bench.cells.H4.cold.cv}`);
    assert.equal(bench.cells.H4.cold.samplesMs.length, 30);
    assert.equal(bench.cells.H4.warm.samplesMs.length, 30);
  });
  it('every cold sample lands under the broadband ceiling', () => {
    assert.equal(bench.cells.H4.cold.allUnderCeiling, true);
    assert.ok(Math.max(...bench.cells.H4.cold.samplesMs) <= 2000);
  });
});

describe('H1 run-to-run stability (Dim 1)', () => {
  it('reports per-run drops with zero in every run', () => {
    const r = bench.cells.H1.runToRun;
    assert.ok(r.runs >= 10);
    assert.ok(r.droppedEveryRun.every((d) => d === 0));
    assert.equal(r.stable, true);
    assert.equal(bench.cells.H1.pooled.droppedVsyncs, 0);
  });
});

describe('scoreboard matches bench-m5.json to the digit (Dim 1)', () => {
  it('carries the exact rounded CI bounds plus p95s', () => {
    const r1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
    for (const n of [
      r1(bench.cells.H4.cold.meanCI95.lo), r1(bench.cells.H4.cold.meanCI95.hi),
      r1(bench.cells.H4.cold.p95Ms),
      r1(bench.cells.H4.warm.meanCI95.lo), r1(bench.cells.H4.warm.meanCI95.hi),
      r1(bench.cells.H4.warm.p95Ms),
      r1(bench.cells.H5.latencySummary.meanCI95.lo),
      r1(bench.cells.H5.latencySummary.meanCI95.hi),
      String(bench.cells.H1.pooled.n),
    ]) {
      assert.ok(score.includes(n), `scoreboard missing bench number ${n}`);
    }
  });
});

describe('corpus fuzz plus bounded soak ledger (Dim 4)', () => {
  it('fuzz resolves MEASURED at N>=30 with E1M1 alive every drop', () => {
    assert.equal(fuzz.n >= 30, true);
    assert.equal(fuzz.failed, 0);
    assert.equal(fuzz.e1m1SurvivedEveryDrop, true);
    assert.equal(bench.cells.Gfuzz.state, 'MEASURED');
    assert.ok(CELL_STATES.includes(bench.cells.Gfuzz.state));
  });
  it('soak is deterministic with a leak profile and a signed deferral', () => {
    assert.equal(soak.deterministic, true);
    assert.equal(soak.tickCountExact, true);
    assert.equal(bench.cells.Gsoak.state, 'MEASURED');
    assert.equal(soak.multiHourWallClock.state, 'UNSUPPORTED_BY_DESIGN');
    assert.ok(soak.multiHourWallClock.machineProof.length > 0);
  });
});
