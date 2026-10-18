// M5 Tester round-3 suite: pins per-row corpus taxonomy, soak machine proof,
// and gate boundary semantics not covered by the earlier red-team/qc2 suites.
// Headless (node:test), no DOM. No em dash in this file.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeLatency, CELL_STATES } from '../src/perf/m5gates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bench = JSON.parse(readFileSync(join(root, 'docs/bench-m5.json'), 'utf8'));
const fuzz = JSON.parse(readFileSync(join(root, 'docs/fuzz-m5.json'), 'utf8'));
const soak = JSON.parse(readFileSync(join(root, 'docs/soak-m5.json'), 'utf8'));

describe('M5 corpus fuzz per-row taxonomy pins', () => {
  it('hostile E1M2 patches drop with E_MAP taxonomy and droppedCodes', () => {
    const hostile = fuzz.rows.filter((r) => /hostile-e1m2/i.test(r.file));
    assert.ok(hostile.length >= 3, `expected >=3 hostile E1M2 rows, got ${hostile.length}`);
    for (const r of hostile) {
      assert.equal(r.taxonomy, 'E_MAP', `${r.file} taxonomy`);
      assert.ok(r.droppedCodes.length > 0, `${r.file} carries no droppedCodes`);
      assert.ok(r.droppedCodes.every((c) => /^E1M2:/.test(c)), `${r.file} code shape`);
      assert.equal(r.e1m1Alive, true, `${r.file} killed E1M1`);
      assert.equal(r.pass, true, `${r.file} row failed`);
    }
  });
  it('every non-accepted row carries a real E_* taxonomy code', () => {
    const rejects = fuzz.rows.filter((r) => r.taxonomy !== 'accepted');
    assert.ok(rejects.length >= 20, `expected >=20 reject rows, got ${rejects.length}`);
    for (const r of rejects) {
      assert.ok(/^E_/.test(r.taxonomy), `${r.file} taxonomy ${r.taxonomy} is not E_*`);
    }
    const tolerated = fuzz.rows.filter((r) => /accept-tolerant|accept-or-drop/.test(r.expect));
    for (const r of tolerated) {
      assert.equal(r.taxonomy, 'accepted', `${r.file} tolerated row must be accepted`);
      assert.equal(r.e1m1Alive, true, `${r.file} tolerated row killed E1M1`);
    }
  });
  it('E1M1 survives every one of the 32 drops with 32/32 pass', () => {
    assert.equal(fuzz.rows.length, 32);
    assert.ok(fuzz.rows.every((r) => r.e1m1Alive === true), 'E1M1 died on some drop');
    assert.ok(fuzz.rows.every((r) => r.pass === true), 'some fuzz row failed');
    assert.equal(bench.cells.Gfuzz.n, 32);
    assert.equal(bench.cells.Gfuzz.passed, 32);
    assert.equal(bench.cells.Gfuzz.failed, 0);
  });
});

describe('M5 bounded soak machine-proof pins', () => {
  it('multi-hour wall-clock deferral carries meminfo plus CPU machine proof', () => {
    const mh = soak.multiHourWallClock;
    assert.equal(mh.state, 'UNSUPPORTED_BY_DESIGN');
    assert.ok(CELL_STATES.includes(mh.state));
    assert.ok(/MemTotal:\s+\d+ kB/.test(mh.machineProof), 'machineProof lacks meminfo');
    assert.ok(/Mem:/.test(mh.machineProof), 'machineProof lacks free output');
    assert.ok(mh.owner && mh.owner.length > 10, 'deferral names no owner');
    assert.ok(mh.date, 'deferral carries no date');
  });
  it('bounded deterministic soak shows no per-tick leak under forced GC', () => {
    assert.equal(soak.tickCountExact, true);
    assert.equal(soak.deterministic, true);
    assert.equal(soak.framebufferHash, soak.referenceHash);
    assert.ok(soak.heapDeltaPerTickBytes < 16, `per-tick growth ${soak.heapDeltaPerTickBytes}`);
    assert.equal(bench.cells.Gsoak.ticks, 200000);
  });
});

describe('M5 gate boundary semantics', () => {
  it('zero ceiling is meaningful: positive samples fail, no throw', () => {
    const s = summarizeLatency([5], 0);
    assert.equal(s.within, false);
    assert.equal(s.ceilingMs, 0);
  });
  it('H4 cold retains the raw N=30 non-negative finite distribution', () => {
    const cold = bench.cells.H4.cold;
    assert.equal(cold.samplesMs.length, 30);
    assert.ok(cold.samplesMs.every((s) => Number.isFinite(s) && s >= 0));
    assert.ok(cold.maxMs <= cold.ceilingMs, 'cold max above ceiling');
  });
});
