// M1 bench: Tier 2 automap frame time on demo E1M1 (N >= 30 batches) plus one
// fair baseline pair, both on identical demo WAD bytes and scene.
//
// Path A (Tier 2 full): renderAutomap(geo) + renderStatusBar, the exact M1
// frame path used by doomEngine drawFrame.
// Path B (degraded fallback): background clear + renderStatusBar only
// (geometry rasterization skipped), representing the Tier 3/4 degraded core.
//
// Each sample is a batch of FRAMES_PER_SAMPLE consecutive frames timed as one
// performance.now interval (batching suppresses sub-microsecond timer
// granularity noise on this ~0.02ms frame path); per-frame statistics are the
// batch statistics divided by the batch size, and the bootstrap CI is computed
// on batch means then converted. FPS equivalents are converted from frame
// times, never averaged as FPS. Samples interleave A/B per iteration so the
// paired bootstrap sees the same machine state.
//
// Writes doom/docs/bench-m1.json and prints a human-readable table.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { buildDemoWad } from './make-demo-wad.mjs';
import { initEngine } from '../src/engine/doomEngine.js';
import { renderAutomap, renderStatusBar } from '../src/render/automap.js';
import { createFrameBuffer } from '../src/render/fbView.js';
import { summary, bootstrapMeanCI, pairedBootstrapCI } from '../src/perf/stats.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const N = 60;
const FRAMES_PER_SAMPLE = 50;
const WARMUP_FRAMES = 500;
const RESAMPLES = 10000;

const eng = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
const geo = eng.__geo;
const fb = createFrameBuffer(320, 200);
const label = 'E1M1 E1 SK3 T0';

function frameFull() {
  renderAutomap(fb, geo);
  renderStatusBar(fb, label);
}

function frameClear() {
  fb.data.fill(0);
  renderStatusBar(fb, label);
}

for (let i = 0; i < WARMUP_FRAMES; i++) frameFull();

const batchA = new Array(N);
const batchB = new Array(N);
for (let i = 0; i < N; i++) {
  let t0 = performance.now();
  for (let f = 0; f < FRAMES_PER_SAMPLE; f++) frameFull();
  batchA[i] = (performance.now() - t0) / FRAMES_PER_SAMPLE;
  t0 = performance.now();
  for (let f = 0; f < FRAMES_PER_SAMPLE; f++) frameClear();
  batchB[i] = (performance.now() - t0) / FRAMES_PER_SAMPLE;
}

const sA = summary(batchA);
const sB = summary(batchB);
const ciA = bootstrapMeanCI(batchA, { resamples: RESAMPLES });
const pair = pairedBootstrapCI(batchB, batchA, { resamples: RESAMPLES });

const fps = (ms) => (ms > 0 ? 1000 / ms : Infinity);
const BUDGET_MS = 16.667;
const result = {
  suite: 'm1-automap-frame-time',
  scene: 'demo E1M1 (generated PWAD, identical bytes both paths)',
  frame: '320x200 automap + status bar (path A) vs clear + status bar (path B)',
  n: N,
  framesPerSample: FRAMES_PER_SAMPLE,
  warmupFrames: WARMUP_FRAMES,
  resamples: RESAMPLES,
  timer: 'performance.now batch intervals, per-frame stats converted from batch means',
  node: process.version,
  platform: process.platform,
  budgetMs: BUDGET_MS,
  pathA_fullAutomap_ms: { ...sA, ci95: ciA, fpsMean: fps(sA.mean), fpsP95: fps(sA.p95) },
  pathB_clearOnly_ms: sB,
  paired_clearMinusFull_ms: pair,
  headroomVsBudget: { p95: BUDGET_MS / sA.p95, mean: BUDGET_MS / sA.mean },
  gate: { minN: 30, cvBelow: 0.05, cvMet: sA.cv < 0.05 },
  generatedAt: new Date().toISOString(),
};

mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'bench-m1.json'), JSON.stringify(result, null, 2) + '\n');

const f = (x, d = 4) => Number(x).toFixed(d);
console.log(`M1 bench: demo E1M1 automap frame time, N=${N} batches x ${FRAMES_PER_SAMPLE} frames (node ${process.version})`);
console.log(`path A full automap : mean ${f(sA.mean)}ms median ${f(sA.median)}ms p95 ${f(sA.p95)}ms p99 ${f(sA.p99)}ms sd ${f(sA.sd)}ms CV ${(sA.cv * 100).toFixed(2)}%`);
console.log(`  95% CI of mean    : [${f(ciA.lo)}, ${f(ciA.hi)}]ms (${RESAMPLES} resamples)`);
console.log(`  frame-rate equiv  : mean ${fps(sA.mean).toFixed(1)} fps, p95 ${fps(sA.p95).toFixed(1)} fps`);
console.log(`  budget headroom   : p95 ${(BUDGET_MS / sA.p95).toFixed(1)}x under ${BUDGET_MS}ms`);
console.log(`path B clear-only   : mean ${f(sB.mean)}ms median ${f(sB.median)}ms p95 ${f(sB.p95)}ms`);
console.log(`paired B-A          : mean diff ${f(pair.meanDiff)}ms 95% CI [${f(pair.lo)}, ${f(pair.hi)}]ms`);
console.log(`gate: N>=30 ${N >= 30 ? 'PASS' : 'FAIL'}, CV<5% ${sA.cv < 0.05 ? 'PASS' : `FAIL (${(sA.cv * 100).toFixed(2)}%, see THREATS.md noise disclosure)`}`);
console.log('wrote doom/docs/bench-m1.json');
