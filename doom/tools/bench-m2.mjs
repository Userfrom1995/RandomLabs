// M2 bench: headless upload-expand cost (H2c) plus governor observe cost (G1).
// CPU-only paths measurable without GL: R8 memcpy (64 KB zero-copy proxy) vs
// RGBA expandToRGBA (64K indices to 256 KB), interleaved N>=30 with paired
// bootstrap 95 percent CIs via src/perf/stats.js. Browser frame-time cells
// stay UNSUPPORTED_BY_DESIGN headless (see scoreboard); this bench covers the
// headless-measurable CPU cost plus governor control latency in frames.
// Writes doom/docs/bench-m2.json.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { expandToRGBA } from '../src/render/upload.js';
import { createResolutionGovernor } from '../src/render/resolution.js';
import { summary, bootstrapMeanCI, pairedBootstrapCI } from '../src/perf/stats.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const N = 60;
const FRAMES_PER_SAMPLE = 20;
const RESAMPLES = 10000;
const W = 320, H = 200, PIX = W * H;

const fb = new Uint8Array(PIX);
for (let i = 0; i < PIX; i++) fb[i] = i & 255;
const palette = new Uint8Array(768);
for (let i = 0; i < 768; i++) palette[i] = (i * 37) & 255;
const r8dst = new Uint8Array(PIX);

// Warmup so JIT settles before timed batches.
for (let i = 0; i < 50; i++) expandToRGBA(fb, palette);
for (let i = 0; i < 50; i++) r8dst.set(fb);

const rgbaMs = new Array(N);
const r8Ms = new Array(N);
for (let i = 0; i < N; i++) {
  let t0 = performance.now();
  for (let f = 0; f < FRAMES_PER_SAMPLE; f++) expandToRGBA(fb, palette);
  rgbaMs[i] = (performance.now() - t0) / FRAMES_PER_SAMPLE;
  t0 = performance.now();
  for (let f = 0; f < FRAMES_PER_SAMPLE; f++) r8dst.set(fb);
  r8Ms[i] = (performance.now() - t0) / FRAMES_PER_SAMPLE;
}

const sRgba = summary(rgbaMs);
const sR8 = summary(r8Ms);
const ciRgba = bootstrapMeanCI(rgbaMs, { resamples: RESAMPLES });
const ciR8 = bootstrapMeanCI(r8Ms, { resamples: RESAMPLES });
const pair = pairedBootstrapCI(rgbaMs, r8Ms, { resamples: RESAMPLES });

// Governor control latency: deterministic frame counts to step down under
// sustained 40ms load and to recover under 4ms ease, N=60 fresh governors.
const stepFrames = new Array(N);
const recoverFrames = new Array(N);
for (let i = 0; i < N; i++) {
  let t = 0;
  const g = createResolutionGovernor({ initial: 1, now: () => t });
  let n = 0;
  while (g.index !== 2 && n < 5000) { g.observe(40); n++; }
  stepFrames[i] = n;
  t += 600; // pass the 500ms interval lock before recovery can fire
  n = 0;
  while (g.index !== 1 && n < 5000) { g.observe(4); n++; }
  recoverFrames[i] = n;
}
const sStep = summary(stepFrames);
const sRec = summary(recoverFrames);
const ciStep = bootstrapMeanCI(stepFrames, { resamples: RESAMPLES });
const ciRec = bootstrapMeanCI(recoverFrames, { resamples: RESAMPLES });

// Headless GL probe: machine evidence for UNSUPPORTED_BY_DESIGN browser cells.
const glProbe = {
  hasWindow: typeof window !== 'undefined',
  hasDocument: typeof document !== 'undefined',
  webgl: 'unavailable-headless (no DOM canvas, GlUnavailable by design)',
  playwright: 'no browser installed in this runner (node-only audit)',
};

const result = {
  suite: 'm2-headless-upload-governor',
  scene: '320x200 (64000 indices), 768-byte palette, node CPU path',
  n: N,
  framesPerSample: FRAMES_PER_SAMPLE,
  resamples: RESAMPLES,
  timer: 'performance.now batch intervals, per-frame stats converted from batch means',
  node: process.version,
  platform: process.platform,
  rgbaExpand_ms: { ...sRgba, ci95: ciRgba },
  r8Memcpy_ms: { ...sR8, ci95: ciR8 },
  paired_rgbaMinusR8_ms: pair,
  governor_stepFrames_40msLoad: { ...sStep, ci95: ciStep },
  governor_recoverFrames_4msEase: { ...sRec, ci95: ciRec },
  glProbe,
  gate: {
    minN: 30,
    cvBelow: 0.05,
    rgbaCvMet: sRgba.cv < 0.05,
    r8CvMet: sR8.cv < 0.05,
  },
  generatedAt: new Date().toISOString(),
};

mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'bench-m2.json'), JSON.stringify(result, null, 2) + '\n');

const f = (x, d = 4) => Number(x).toFixed(d);
console.log(`M2 bench: headless upload-expand + governor, N=${N} batches x ${FRAMES_PER_SAMPLE} (node ${process.version})`);
console.log(`RGBA expand : mean ${f(sRgba.mean)}ms median ${f(sRgba.median)}ms p95 ${f(sRgba.p95)}ms CV ${(sRgba.cv * 100).toFixed(2)}%`);
console.log(`  95% CI    : [${f(ciRgba.lo)}, ${f(ciRgba.hi)}]ms (${RESAMPLES} resamples)`);
console.log(`R8 memcpy   : mean ${f(sR8.mean)}ms median ${f(sR8.median)}ms p95 ${f(sR8.p95)}ms CV ${(sR8.cv * 100).toFixed(2)}%`);
console.log(`  95% CI    : [${f(ciR8.lo)}, ${f(ciR8.hi)}]ms`);
console.log(`paired RGBA-R8: mean diff ${f(pair.meanDiff)}ms 95% CI [${f(pair.lo)}, ${f(pair.hi)}]ms`);
console.log(`governor step-down frames   : mean ${f(sStep.mean, 1)} 95% CI [${f(ciStep.lo, 1)}, ${f(ciStep.hi, 1)}]`);
console.log(`governor recovery frames    : mean ${f(sRec.mean, 1)} 95% CI [${f(ciRec.lo, 1)}, ${f(ciRec.hi, 1)}]`);
console.log(`gate: N>=30 ${N >= 30 ? 'PASS' : 'FAIL'}, CV<5% rgba ${sRgba.cv < 0.05 ? 'PASS' : 'FAIL (disclosed)'} r8 ${sR8.cv < 0.05 ? 'PASS' : 'FAIL (disclosed)'}`);
console.log('wrote doom/docs/bench-m2.json');
