# Builder decision: R13-B (CDF 5/3 lifting) implemented + measured — regression, escalate

- **Issue:** #68
- **PR:** #93 (branch `opencode/issue68-20260818070512`)
- **Date:** 2026-08-20
- **Author:** the Builder
- **Action:** `maintainer` (fire the fresh-Researcher escape hatch; the JPEG XL 8.71 gate is a structural ceiling)

## What this run did

Implemented R13-B end-to-end per the Architect blueprint (`obsidian/docs/architect-r13-recursive-adaptive-predictor-and-lifting-blueprint.md` §3):

- `transforms.rs`: `TransformKind::{Squeeze,Lift}`; `cdf53_lift`/`cdf53_unlift` — a genuine separable CDF 5/3 lifting wavelet (PREDICT + UPDATE steps, symmetric-clamp boundary, floor rounding) that produces the **same 4-band-per-level geometry** as `squeeze` (reuses `squeeze_band_layout`), so the banded coder and decoder are unchanged. Bit-exact invertibility verified by `r13_lifting_inverts_various_sizes` and `r13_lifting_band_geometry_matches_squeeze`.
- Wired as candidate config D in the encoder never-expand net, gated by a single `transform_kind` byte appended **last** in the model section (legacy streams decode byte-identically as `Squeeze`). `build_banded`/`decode_banded` dispatch via `transform_plane`/`untransform_plane`. CLI `--transform lift|squeeze` + `OBSIDIAN_LIFT_FORCE` measurement seam.

## Real-Kodak measurement (24-image Kodak, effort 4)

| Config | mean bpp | vs baseline |
|---|---|---|
| production baseline (net picks no transform) | **9.5209** | — |
| forced R13-B lift alone | **10.1708** | +0.65 regression |
| forced R13-B lift + forced R13-A | **10.5814** | +1.06 regression |

Full per-image rows: `obsidian/benchmarks/results/2026-08-20-r13b-lifting.csv`.
141 lib tests pass; production default is byte-identical to pre-R13-B (9.5208/9.5209).

## Why this is decisive, not another tuning miss

The blueprint's own optimistic estimate put R13-B alone at ~9.0-9.3 bpp; the real number is **10.17** — a net regression. The CDF 5/3 update step's rounding + the 4x banding/model overhead is NOT paid back by energy compaction for this codec, because the per-band least-squares weighted predictor (R12-A) already removes most structured redundancy before the transform runs. The never-expand net therefore correctly rejects lift, leaving production unchanged.

R13-B is the **7th independent axis** exhausted on this corpus:
R11-D (MA context), R11-A (cross-band), 64-leaf weight context (x2), R12-A (per-band), R13-A (adaptive multi-tap), R13-B (lifting). Every one refines either the *context granularity* or the *functional form* of a near-optimal predictor/transform — none lowers the residual floor toward 8.71.

## Decision

The JPEG XL 8.71 bpp gap is a **structural architectural ceiling** of the current single-pixel / wavelet-decorrelation pipeline, not a tuning deficit. This triggers the escape hatch the Maintainer documented (2026-08-20T07:00): the next step is a **fresh Researcher brief** on a fundamentally different paradigm (a learned predictor, or context-tree weighted prediction at the transform level) — not another R7/R8/R9/R11/R12/R13-class widening, all of which are now implemented and measured as insufficient.

No merge until PNG 13.05 + WebP 9.61 + JPEG XL 8.71 are all beaten bit-exactly per owner override #2. Issue #68 stays open.

- the Builder
