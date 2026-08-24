# D0 harness result: recorded A2 oracle aggregates not reproducible; D1 offline rejected

- **Date:** 2026-08-24
- **Role:** the Builder
- **Issue:** #130 (D-series, re-scope `prism/docs/architecture-jxl-parity-rescope.md`)
- **Trigger:** D0 acceptance requires the committed harness to reproduce the
  A2-recalibration aggregates; it does not, and cannot.

## Decision 1: A2 aggregates retracted as magnitudes, superseded by harness-citable numbers

The table recorded on 2026-08-23 in
`progress/130-prism-true-jxl-parity.md` (shared -13.62 / class16-pooled
-18.38 / 343-context oracle -18.57 percent vs v0 payload, kodim01+kodim13
aggregate) is NOT reproducible by the committed D0 harness in any documented
interpretation. Measured today (same streams: shipped YCoCg-R + MED,
resdiff-343 contexts, same v0 baseline bytes 1269358 B - byte-matching the
committed probe CSVs):

| bracket (pooled over both images) | bin-coarse | bin-fine | value alphabet H(E|x) |
|---|---|---|---|
| shared      | +1.31 percent | -0.78 percent | -0.81 percent |
| class16     | -4.99 percent | -11.48 percent | -11.51 percent |
| ctx343      | -5.33 percent | -12.61 percent | -12.98 percent |

Decisive fact: the recorded -18.57 percent oracle figure is information-
theoretically impossible for these streams against this baseline - the
measured conditional alphabet entropy H(E | exact context) is -12.98 percent,
and no context-conditioned code can undercut that floor. The original numbers
came from ephemeral continuation-run tooling that no longer exists (stated in
the old provenance note itself), so the discrepancy cannot be audited after
the fact. This is precisely the failure mode invariant I7 was written to end.

Consequences, stated plainly:

1. The magnitude claims built on that table are retracted: "static refinement
   adds only ~0.19 points" is replaced by the harness-measured 1.14 points
   (bin-fine class16 to ctx343) and 1.50 points (value mode); the qualitative
   conclusion survives (per-context static refinement buys little), now with
   auditable evidence.
2. The re-scope's L2 framing ("the real coder collects roughly half of even
   the SHARED ideal gain") is inverted by measurement: the adaptive v2 coder
   (-5.53 percent aggregate) BEATS every shared-static bracket (+1.31 /
   -0.78 / -0.81) by a wide margin. Adaptivity outperforms static shared
   models on nonstationary data; the recorded table had this backwards.
3. The actionable headroom claim gets STRONGER and stays honest: real v2
   (-5.53 percent) vs context-conditioned fine-bin bracket (-12.61 percent)
   leaves about 7 points of collection-efficiency gap. L2 (mixer + SSE) is
   the lever aimed exactly at that gap, so D2 proceeds with better evidence
   than it had before.
4. `probe_ideal.sh` pins the fresh harness-measured row as its G-repro
   regression anchor (tolerance 0.05 points) instead of the impossible
   recorded figures.

## Decision 2: D1 adaptive blended prediction REJECTED offline - no format work

Re-scope section D1 gate: harness-projected >= ~2 percent payload reduction
vs MED on kodim01/kodim13 before ANY container/format change, confirmed on
unseen kodim05/kodim20.

Measured via the committed harness (`--blend` presets, durable CSV
`benchmarks/results/2026-08-24-ideal-probe-d1-blend.csv`), real v2 payload per
image vs the same image's MED v2 payload:

| preset | kodim01 | kodim13 | kodim05 | kodim20 |
|---|---|---|---|---|
| nlms (value bases)     | +14.13 percent | +7.04 percent | +6.62 percent | +12.59 percent |
| nlms-med (lr5)         | +0.53 percent | +0.49 percent | +0.73 percent | -0.92 percent |
| nlms-med-lr1           | +0.30 percent | +0.25 percent | +0.93 percent | -1.11 percent |
| nlms-med-lr2           | +0.40 percent | +0.32 percent | +0.85 percent | -1.07 percent |
| nlms-med-lr3           | +0.45 percent | +0.39 percent | +0.75 percent | -1.01 percent |

Best case is +0.27 percent WORSE on a probe image; the only wins are ~1
percent on kodim20 alone, with mixed sign across the corpus - an order of
magnitude short of the bar and directionally inconsistent. Two blend families
(value-base NLMS; MED-anchored correction NLMS with identity at init) x five
adaptation rates all fail. Per the re-scope STOP rule, no FEATURE_EXT byte,
no container change, no format work is spent on this.

Interpretation consistent with prior evidence: C3 measured the FIXED bank
nearly exhausted (7 wins / 17 ties / 0 losses); this run measured ADAPTIVE
linear blending out too. Under the v2 backend's 343-context class-hierarchy
modeling, MED residuals already sit close to what local linear adaptivity can
extract on photographic content. The predictor lever (L1) is closed by
measurement, joining the closed static-transform directions.

## What ships from this slice

- `prism bench-ideal` CLI + `benchmarks/probe_ideal.sh` rail (ordering gate,
  G-repro anchor, self-check proving ranking works both ways and gates can
  fail): the I7 instrument for all future go/no-go calls.
- Blend machinery in `predict.{h,cpp}` behind `BlendConfig` (library-level,
  tested bijection/determinism/borders; NOT wired into any format path).
- Harness-citable replacement numbers for the A2 chain.
- The D1 negative result, durably recorded here and in the tracker.

## Consequence for build order

L1 closed means everything now rides on L2 collection efficiency (real v2
-5.53 percent vs conditional-ideal -12.61 percent). Next phase per the
re-scope: extend the committed harness to score mixer+SSE variants offline
(gate >= 3 percent projected) BEFORE any ext-byte format work.

- the Builder
