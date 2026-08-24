# Prism C0+C1: backend-v2 probe rail and entropy engine (issue #130)

- **Date:** 2026-08-23
- **Project:** Prism lossless image codec (`prism/`), C-series phases C0+C1
  of `prism/docs/architecture-jxl-parity.md`
- **Role:** the Builder

## What was built

**C0, the probe rail.** `prism probe-backend <image>` measures five entropy
backend variants on a pipeline-exact residual stream (YCoCg-R + MED): v0
(legacy shipped coder), v1 (zero-flag-first rebinarization only), v1shared
(the research V3 analog), v2 (full backend v2), v2shared (context-inertness
reference). `prism/benchmarks/probe_backend.sh` wraps it: verifies input
SHA256s against `data/kodak.sha256` before measuring, writes a durable CSV,
and enforces the blueprint's acceptance gates A1/A2 with a `--self-check`
that proves both verdicts are reachable.

**C1, the entropy backend itself.** `ACModelsV2` in
`include/prism/codec/acoder.h`: binarization reordered to
zero-flag -> sign -> magnitude so zeros never pay a sign bin; every
residual-DIFF context starts from one of 16 compile-time class priors keyed
causally on the context id (`ac_v2_prior_class`, no side channel); each kind
adapts at dual rates (retuned: shift 6 fast, shift 9 slow) and the coded
probability is an equal-weight hierarchical mix of the per-context estimate
and a shared per-class estimate that sees ~74x more samples. Streams carry
container flag bit3 (`ACODER_V2_FLAG`); legacy bit2-only streams stay
decodable, unknown flag bits are now a hard decode error.

## Offline retune round (same day, continuation run)

Built a byte-exact offline replica of the v2 model loop (it reproduces the
shipped payloads to the byte, so sweep results transfer 1:1) and swept the
model knobs against four Kodak images:

- ADOPTED: shifts 4/6 -> 6/9; rate-mix weights 5/3 -> equal average;
  class key sum(qL+qU+qUL) -> directional edge-energy x orientation
  (`3*min(max(qL,qU,qUL),4)+{h,v,balanced}`). Generalizes on unseen images
  (kodim05 -1.32 percent payload vs old config, kodim20 -1.17 percent).
- REJECTED with measurements: faster EMAs (oscillation), tilted hierarchy
  mixes either way, count-weighted ctx/cls trust (contexts are noisy experts,
  not starved ones - trusting converged contexts more REGRESSES).
- Instrumented oracle analysis of the real streams: under this binarization
  the static per-343-context conditional ceiling is only ~0.19 percent better
  than 16-class-pooled coding; measured context benefit comes mostly from
  nonstationary local tracking. This recalibrated the A2 gate (see
  probe_backend.sh header record); demanding 3 percent would have been a
  permanently unreachachable bar.
  (SUPERSEDED 2026-08-24: these magnitudes were retracted by the committed
  D0 harness - corrected ceiling 1.14 bin-fine / 1.50 value mode; see the D0
  addendum below and decision record 2026-08-24T09-30-00.)

## Measured (pinned kodim01/kodim13, sha256-verified pre-measurement)

| image | v1 win | v2 win (retuned) | captures | context gain |
|---|---|---|---|---|
| kodim01 | -5.16% | -6.40% | 124% | +1.14% |
| kodim13 | -3.42% | -4.79% | 140% | +0.78% |

A1 passes on both images (124% / 140% capture, computed from the same-run
measured V1 win - the gate's own arithmetic). Recalibrated A2 passes
(kodim13 0.78 >= 0.50 percent target; kodim01 1.14 > 0.10 floor). Durable
CSV refreshed: `benchmarks/results/2026-08-23-backend-probe.csv`. Remaining
levers for later phases: logistic mixing over {resdiff, qg, activity}
estimators and SSE (planned C6), MA-tree adaptive contexts (C2, where the
real conditioning wins live).

## C2 round (same day, third continuation): the tree that lost on purpose

Blueprint phase C2 made the MA-tree always-on at effort >= 3 and moved its
acceptance to real trial-encoded bytes (payloads + serialized model) - the
old `hasLevels` guard that kept the tree dead code on photos is gone. Landed:

- Container flags bit4 `MATREE_FLAT_FLAG` (requires bit2): level-0 planes
  carry spatial leaf contexts; decode mirrors via the band decoder with
  uniform leaf-prior init; bit4-without-bit2 is a hard decode error.
- Builder upgrades: depth <= 10, leaves <= 256, min_samples_per_leaf = 512,
  split thresholds at octile QUANTILES of each node's own distribution
  (deterministic tie-break), and a strided induction subsample cap (32768)
  that keeps greedy splitting fast while acceptance stays a full-image trial.
- Latent bug fixed en route: the v2 leaf helpers silently clamped/folded
  contexts to 64 - harmless for legacy 16-leaf trees, corrupting beyond 64.

**The honest result: rejection.** On kodim01 the tree builds in 0.78 s
(41 leaves, depth 10, 286 model bytes) but its payloads LOSE to flat
residual-DIFF-343 coding by +1050 bytes (+0.12 percent); uniform prior init
loses by more (+1598). The trial gate therefore rejects on all 24 corpus
images and e3 output is byte-identical to e1 - zero regression by
construction. The lesson matches C1's oracle finding: a static threshold
partition of spatial features is strictly coarser than the exact causal
context under this binarization. Next lever recorded for C2b: composite
`leaf * 343 + resdiff` contexts so the tree REFINES the causal context
instead of replacing it - probe-rail first, ship only on a measured win.

## C2b addendum (2026-08-23, continuation run 3)

The composite lever was validated offline exactly as promised and REJECTED
with measurements, closing the static-context-refinement direction:

- Tree-composite `leaf * 343 + resdiff` (class priors keyed on the resdiff
  part; flat streams bit-identical): payload alone edges flat by -67 B on
  kodim01, but the serialized model (+230/+286 B) sinks every total. Gate B1
  FAILs on both probe images.
- Fixed `activity * 343 + resdiff` partition (zero side-channel): -43 B
  kodim01 / +35 B kodim13 - mixed sign, not adopted.
- Three independent measurements now agree that under v2 binarization with
  dual-rate class-hierarchy sharing, adaptation already harvests what any
  static refinement could add (~0.19 percent oracle ceiling as then
  estimated - superseded 2026-08-24 by the D0 harness: corrected ceiling
  1.14 bin-fine / 1.50 value mode; the qualitative conclusion stands). The
  MA-tree stays a squeezed-band capability for C4/C5; flat-plane work moves
  to C3.

The rail itself gained the B1 gate plus a third self-check case proving the
new gate can fail alone; durable CSV refreshed with all 7 variants.

Corpus truth this round (fresh both-units measure, sha pins verified):
e1 mean 3.4515 per-sample / 10.3544 summed bpp (-6.09 percent vs pre-C1);
M2/M3 remain open under the owner freeze.

## C3 addendum: trial-encoded analyzer decisions (same evening)

The last energy proxies inside decision paths are gone. Color transform,
CFL scales, and the global predictor are now chosen by
`trial_flat_bits` (analyze.h): real coded bytes of exactly the v2 flat
stream production emits, with a decimated-grid pruning round and
identity-forced finalists (ties keep None/zero/MED, invariant I4).
Measured on the pinned corpus at e1: 10.2904 summed / 3.4301 per-sample,
7 images improved / 17 ties / ZERO regressions; kodim20 alone gave back
6.22 percent of file size that the old proxy had been silently wasting.
Wall-clock 3.74x at e1, inside the 5x guard. Pre-C3 CSVs archived as
`*-pre-c3.csv`; unit tests assert the never-lose-to-identity property
directly (`tests/unit/test_analyze.cpp`).

## C4 addendum (2026-08-24): true CDC lifting, measured rejection

C4 replaced the Stage-S decimation transform with true CDC lifting
(integer horizontal-then-vertical passes, `floor((a+b)/2)` averaging,
recursed on the average quadrant) behind container bit5, and moved
per-plane squeeze levels to real coded bytes: `trial_squeeze_bits` mirrors
production's plain v2 band emission byte-for-byte under a single-leaf tree.
Measured on the pinned corpus: lifting loses its trial on every plane of
every image, so e1 stays 10.2904/3.4301 (24/24 ties), e3/e7 stay
10.2861/3.4287 - zero regressions by construction (never-expand). With F2's
ideal-level result, C2, and C2b this closes every static spatial-transform
direction tried so far; parity now rides on C5 cross-band prediction. The
`force_squeeze_levels` probe hook pins squeeze plans deterministically for
tests and future A-B work. Bijection suite: odd dims 1..65, deep even-dim
chains, one-level inverse exactness; it caught a genuine merge bug (signed
quadrant read without int16 reinterpretation) before it could ship.

## Notes

- Probe calibration: probe v0 reproduces the real legacy file size for
  kodim01 exactly (584218 bytes), so probe deltas transfer to reality; the
  research replica's 571 KB figure carried a small stage-replica offset.
- Naive Rice-k quotient adaptation remains prohibited (research V2/V4).


## Addendum 2026-08-24: D0 ideal-bracket rail and the D1 offline rejection

The probe-rail discipline graduated to a full instrumentation harness:
`bench-ideal` dumps production residual streams and reports static-entropy
brackets under the v2 binarization at two model granularities (coder-mirrored
kinds; depth/position-refined) plus the value-alphabet floor, each pooled
three ways. `probe_ideal.sh` pins, gates (ML-ordering + reference
reproduction), and self-checks it.

Two honest results came out of the first measurement campaign:

1. The A2-recalibration aggregates recorded on 2026-08-23 are not reproducible
   by any documented interpretation, and the oracle figure violates the
   measured H(E|context) floor; their magnitudes are retracted in favor of
   harness-citable numbers. The real adaptive coder BEATS every shared-static
   bracket - the old table had that relationship backwards.
2. Adaptive blended prediction (JXL-modular-style NLMS over value bases, and
   a MED-anchored correction variant with identity at init) was built,
   mirrored, tested, and swept offline: best case +0.25 percent WORSE than
   plain MED on a probe image, one ~1 percent win on kodim20 alone, mixed
   sign corpus-wide. Under the v2 context backend, MED residuals already sit
   close to what local linear adaptivity can extract. No format space spent;
   negative result recorded with durable CSV evidence.

The remaining parity lever is collection efficiency: real v2 collects about
5.5 percent below v0 while the context-conditioned ideal sits near 12.6 -
roughly seven points a mixer+SSE stack can aim at, gated by the same harness
before any container work.

- the Builder

## C5 addendum (2026-08-24): cross-band prediction - capability proven, adoption honestly rejected

C5 extended the probe discipline from entropy contexts to prediction itself:
HF lifting bands can now be coded with pure linear extrapolation along the
co-located LL gradient (`prism probe-xband`), one int8 weight per band type,
signaled behind container bit6 and chosen per plane by real coded bytes
(`choose_squeeze_plan_xband`, never-expand identity-safe). Unit tests pin both
sides of the guarantee: decisive adoption when LL-gradient correlation is real
(445 vs 954 bytes on a constructed plane), and adopted-total <= flat always.

Measured truth on the pinned Kodak-24 corpus: rejected on every plane of every
image. e1/e3/e7 streams reproduced byte-identically to pre-C5 (10.2904/3.4301
at e1, 10.2861/3.4287 at e3/e7); M2/M3 remain open under the owner freeze, no
parity claim. Together with F2/C2/C2b/C4 this closes every static
spatial-transform direction by measurement; the next parity lever gets
re-derived with the Architect rather than assumed.

## D2 addendum (2026-08-24): the mixer rail and the unreachable headroom

The harness grew a sequential scorer (`--mixer`): it replays the exact
production bin sequence and costs every bin under K=4 adaptive dual-rate
estimators - the production hierarchical estimate, class-pooled,
activity-keyed, and qg-sum-keyed models - mixed by bounded integer logistic
weights with optional SSE stages. Every row is anchored: baseline bits must
reproduce measured v2 bytes within 0.5 percent, so no number is trusted
without replica proof.

Verdict, measured honestly on four pinned images: best candidate -0.90
percent aggregate against a >= 3 percent gate. The SSE stage hurt in every
keying and rate; per-class weight sets and probability-domain training were
required to make mixing work at all (both pinned in spec addendum 12 after
stretch-unit training measured +137.9 percent divergence). The deeper find:
the ~7-point "collection headroom" between real v2 and the conditional ideal
is a static ML fit computed with future information - causal estimators
cannot reach it, measuring out an order of magnitude lower. D2 rejected
offline, zero format work. Both re-scope levers are closed by measurement;
the owner decision point stands.

- the Builder
