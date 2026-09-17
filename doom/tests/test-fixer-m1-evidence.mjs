// Fixer M1 evidence suite: stats harness math, sealed evidence artifacts,
// probe-order fix, README command, layout/contrast assertions, and a 20k-tick
// determinism slice (the full 100k row is sealed by tools/soak-m1.mjs).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mean, median, quantileSorted, sortedCopy, sd, cv, summary,
  bootstrapMeanCI, pairedBootstrapCI,
} from '../src/perf/stats.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';
import { initEngine } from '../src/engine/doomEngine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('stats harness math', () => {
  it('mean/median/quantiles on a known sample', () => {
    const xs = [1, 2, 3, 4, 5];
    assert.equal(mean(xs), 3);
    assert.equal(median(xs), 3);
    assert.equal(quantileSorted(sortedCopy(xs), 0.95), 4.8);
    assert.equal(quantileSorted(sortedCopy(xs), 0), 1);
    assert.equal(quantileSorted(sortedCopy(xs), 1), 5);
  });

  it('sd/cv match textbook values (sample sd, n-1)', () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9]; // classic example: mean 5, sample sd 2.138...
    assert.equal(mean(xs), 5);
    assert.ok(Math.abs(sd(xs) - 2.138089935299395) < 1e-9);
    assert.ok(Math.abs(cv(xs) - 2.138089935299395 / 5) < 1e-9);
  });

  it('summary carries n/mean/median/p95/p99/sd/cv', () => {
    const s = summary([1, 2, 3, 4, 5]);
    assert.equal(s.n, 5);
    assert.equal(s.mean, 3);
    assert.equal(s.median, 3);
    assert.equal(s.p95, 4.8);
    assert.equal(s.min, 1);
    assert.equal(s.max, 5);
  });

  it('bootstrap CI is deterministic for a fixed seed', () => {
    const xs = [0.011, 0.013, 0.012, 0.014, 0.012, 0.015, 0.011, 0.013];
    const a = bootstrapMeanCI(xs, { resamples: 1000, seed: 42 });
    const b = bootstrapMeanCI(xs, { resamples: 1000, seed: 42 });
    assert.deepEqual(a, b);
    assert.ok(a.lo <= mean(xs) && mean(xs) <= a.hi, 'CI brackets the mean');
  });

  it('paired bootstrap on identical paths gives zero diff', () => {
    const xs = [0.011, 0.013, 0.012, 0.014, 0.012];
    const p = pairedBootstrapCI(xs, xs, { resamples: 1000, seed: 7 });
    assert.equal(p.meanDiff, 0);
    assert.equal(p.medianDiff, 0);
    assert.ok(p.lo <= 0 && 0 <= p.hi, 'CI contains zero');
  });

  it('paired bootstrap detects a real difference', () => {
    const a = Array(30).fill(0.02);
    const b = Array(30).fill(0.01);
    const p = pairedBootstrapCI(a, b, { resamples: 1000, seed: 7 });
    assert.ok(p.lo > 0, 'CI excludes zero for a 2x gap');
  });

  it('empty samples throw', () => {
    assert.throws(() => mean([]));
    assert.throws(() => summary([]));
    assert.throws(() => bootstrapMeanCI([]));
    assert.throws(() => pairedBootstrapCI([], []));
    assert.throws(() => pairedBootstrapCI([1], [1, 2]));
  });
});

describe('sealed evidence artifacts', () => {
  it('bench-m1.json: N>=30 with bootstrap CI and paired baseline', () => {
    assert.ok(existsSync(join(root, 'docs', 'bench-m1.json')), 'bench artifact committed');
    const j = JSON.parse(read('docs/bench-m1.json'));
    assert.ok(j.n >= 30, `N=${j.n} >= 30`);
    const A = j.pathA_fullAutomap_ms;
    for (const k of ['mean', 'median', 'p95', 'p99', 'sd', 'cv', 'ci95', 'fpsMean', 'fpsP95']) {
      assert.ok(Number.isFinite(A[k]) || (k === 'ci95' && Number.isFinite(A.ci95.lo)), `pathA.${k} finite`);
    }
    assert.ok(A.ci95.lo <= A.mean && A.mean <= A.ci95.hi, 'CI brackets mean');
    assert.ok(A.p95 < j.budgetMs, `p95 ${A.p95}ms under ${j.budgetMs}ms budget`);
    assert.ok(j.paired_clearMinusFull_ms.hi < 0, 'full-vs-clear paired CI excludes zero (geometry costs real time)');
    assert.ok(j.headroomVsBudget.p95 > 100, 'p95 headroom above 100x');
  });

  it('soak-m1.json: 100k ticks exact and deterministic', () => {
    assert.ok(existsSync(join(root, 'docs', 'soak-m1.json')), 'soak artifact committed');
    const j = JSON.parse(read('docs/soak-m1.json'));
    assert.equal(j.ticks, 100000);
    assert.equal(j.tickCountExact, true);
    assert.equal(j.deterministic, true);
    assert.equal(j.framebufferHash, j.referenceHash);
  });

  it('layout-audit.md: all static checks pass', () => {
    assert.ok(existsSync(join(root, 'docs', 'layout-audit.md')), 'audit artifact committed');
    assert.match(read('docs/layout-audit.md'), /ALL PASS/);
  });

  it('THREATS.md discloses timer/GC/CV/node-vs-browser limits', () => {
    const t = read('docs/THREATS.md');
    for (const k of ['Timer resolution', 'GC pauses', 'CV disclosure', 'node vs browser', 'f6cad8e9']) {
      assert.ok(t.includes(k), `THREATS.md covers: ${k}`);
    }
  });

  it('manifest.sha256 seals 5 artifacts', () => {
    assert.ok(existsSync(join(root, 'docs', 'manifest.sha256')), 'manifest committed');
    const lines = read('docs/manifest.sha256').trim().split('\n');
    assert.equal(lines.length, 5);
    for (const l of lines) assert.match(l, /^[0-9a-f]{64}  \S+$/);
  });
});

describe('reviewer-noted fixes', () => {
  it('app.js probes WebGL on throwaway canvases, webgl2 first', () => {
    const src = read('app.js');
    assert.ok(!src.includes("canvas.getContext('webgl')"), 'no same-canvas double probe');
    assert.ok(src.includes('probeGL'), 'probeGL helper present');
    const i2 = src.indexOf("getContext('webgl2')");
    const i1 = src.indexOf("getContext('webgl')");
    assert.ok(i2 !== -1 && i1 !== -1 && i2 < i1, 'webgl2 probed before webgl');
  });

  it('README documents the passing glob test command', () => {
    assert.match(read('README.md'), /node --test "doom\/tests\/\*\.mjs"/);
  });

  it('no em dashes in new evidence files', () => {
    for (const f of ['src/perf/stats.js', 'tools/bench-m1.mjs', 'tools/soak-m1.mjs',
      'tools/audit-layout.mjs', 'tools/seal-manifest.mjs', 'docs/THREATS.md',
      'repro.sh', 'tests/test-fixer-m1-evidence.mjs']) {
      assert.ok(!read(f).includes('\u2014'), `${f} has no em dash`);
    }
  });
});

describe('determinism slice (20k ticks)', () => {
  it('two engines agree exactly after 20k ticks', async () => {
    const wad = buildDemoWad();
    const e1 = await initEngine({ wadBytes: wad, map: 'E1M1' });
    for (let i = 0; i < 20000; i++) e1.tickOnce();
    const e2 = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    for (let i = 0; i < 20000; i++) e2.tickOnce();
    assert.equal(e1.tickCount, 20000);
    assert.deepEqual([...e1.__fb.data], [...e2.__fb.data]);
  });
});
