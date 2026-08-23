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
adapts at dual rates (shift 4 fast, shift 6 slow) and the coded probability
is an equal-weight hierarchical mix of the per-context estimate and a shared
per-class estimate that sees ~74x more samples. Streams carry container flag
bit3 (`ACODER_V2_FLAG`); legacy bit2-only streams stay decodable, unknown
flag bits are now a hard decode error.

## Measured (pinned kodim01/kodim13, sha256-verified pre-measurement)

| image | v1 win | v2 win | captures | context gain |
|---|---|---|---|---|
| kodim01 | -5.16% | -5.18% | 102% | +1.08% |
| kodim13 | -3.42% | -3.45% | 101% | +0.85% |

A1 (>=80 percent of V1 win) passes on both images. A2 (context benefit
>=3 percent on kodim13) is honestly NOT met yet: 0.85 percent versus the
0.9 percent legacy baseline - real but partial progress toward the ~6
percent oracle delta. Next levers, in order tried/planned: directional class
keys for the zero-kind (sum-key collapses edge orientation), logistic mixing
over {resdiff, qg, activity} estimators (P7 pulled forward), SSE map.
Faster class EMAs were tested and REJECTED (kodim13 regressed to -2.56%).

## Notes

- Probe calibration: probe v0 reproduces the real legacy file size for
  kodim01 exactly (584218 bytes), so probe deltas transfer to reality; the
  research replica's 571 KB figure carried a small stage-replica offset.
- Naive Rice-k quotient adaptation remains prohibited (research V2/V4).

- the Builder
