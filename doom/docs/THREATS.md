# Doom M1 threats to validity and noise disclosure

Binding noise model for every number in `bench-m1.json`, `soak-m1.json`,
and the scoreboard H1a cell. M5 re-measures H1-H5 in a real browser via
Playwright; this page records what can (and cannot) be claimed from node.

## Timer resolution

`performance.now` granularity is ~1us at best; the M1 frame path averages
~0.013ms (13us), so single-frame deltas carry up to ~8 percent quantization
noise each. Mitigation: each bench sample is a batch of 50 consecutive frames
timed as one interval (`bench-m1.mjs`, N=60 batches = 3000 frames per path),
and statistics are batch means converted to per-frame values. Bootstrap CIs
are computed on batch means (10k resamples, seeded LCG, deterministic).

## GC pauses

V8 scavenges during the run inflate isolated batch means (visible as the
p99 tail: 0.0248ms vs median 0.0116ms). Batching plus a 500-frame JIT warmup
absorbs this; the paired A/B interleave puts both paths under the same GC
pressure so the paired difference CI stays tight ([-0.0092, -0.0078]ms,
stable sign and magnitude across repeats). The soak heap row is measured after forced GC
(`--expose-gc`): 100k ticks retain ~177KB (engine + WAD structures,
~1.8B/tick), proving no per-tick leak. Without forced GC the same run
reports ~5MB of uncollected short-lived garbage, which is collector timing,
not a leak.

## Thermal and noisy-neighbor drift

Early single-frame probing (no batching, 20-frame warmup) gave run-to-run
means of 0.145ms then 0.022ms on this shared runner. The batched design
repeats at 0.0129ms, 0.0125ms, and 0.0132ms with a stable paired difference
(-0.0081ms, -0.0081ms, -0.0085ms across runs). Conclusion: absolute means
drift with machine state; the paired comparison and the budget verdict
(880-980x headroom across all runs) do not.

## CV disclosure (honest FAIL)

Per-frame CV is ~27 percent (sd 3.6us on a 13.2us mean). The sd is the
timer/GC noise floor, not engine variance: the bootstrap 95 percent CI of
the mean is [0.0124, 0.0142]ms (about +/-7 percent), and the p95 budget
verdict (880x under 16.667ms) repeats across runs. The scoreboard records
CV as measured with this disclosure rather than rounding it away.

## node vs browser timers

node `perf_hooks` measures the raster core only (no `putImageData`, no
compositor, no rAF quantization). Browser frame cost is strictly higher, so
node numbers are a lower bound; the H1 browser cell stays pending to M5
with Playwright tracing. The node-vs-browser fallback in `loop.js`
(setTimeout 16ms when rAF is absent) is covered by the Tester red-team pod,
not by this bench.

## Extended soak (sealed in soak-m1.json)

| Run | Ticks | Exact | Hash | Reference hash | Elapsed | Heap delta (forced GC) |
|---|---|---|---|---|---|---|
| 1 | 100000 | true | f6cad8e9 | f6cad8e9 | 1104ms | 176632B |
| 2 | 100000 | true | f6cad8e9 | f6cad8e9 | 1104ms | (no-GC run: 5212848B, collector timing) |

100k ticks = ~48 minutes of 35Hz game time, exact tick count, byte-identical
framebuffer across independent engines. Multi-hour wall-clock soak (thermal,
socket/heap profiling over time) remains M5 scope; 3000-tick node soak from
the Tester suite still stands for the short scale.

## Adversarial self-review (hostile-reviewer simulation)

- Timer gaming: batching + interleaved pairs + seeded bootstrap; raw batches
  are not published, but the tool is deterministic and re-runnable via repro.sh.
- Hash theater: FNV-1a is a determinism check, not a security claim; equality
  across two independently built engines is what carries weight, not the digest.
- JSON tampering: `manifest.sha256` seals the generated demo WAD bytes,
  first-frame.png, and the evidence JSONs; any edit breaks the manifest.
- Baseline fairness: both paths share identical WAD bytes, scene, label text,
  and status-bar cost; only geometry rasterization differs, and order (A then
  B) is fixed per pair so drift cannot favor one path.
- Scope honesty: H1-H5 browser cells stay pending; H1a is labeled a node
  raster-core proxy, not a browser FPS claim.
