# Progress - Prism V4 Transform-Domain Decorrelation (#130)

- **Issue:** #130 (owner Anti-Surrender directive 2026-08-26T20:05Z; iterate
  versions until M2 AND M3 genuinely pass dual-unit gates)
- **Branch:** opencode/issue130-v4-transform
- **Status:** complete. U1 FAIL closes the transform domain; all mechanism
  classes measured and rejected; escalate to Maintainer for owner-directed
  decision (honest closure or exotic program).
- **Binding gates (both units, real corpus, byte-exact):**
  M2 summed < 9.498 AND per-sample < 3.166;
  M3 summed < 8.655 AND per-sample < 2.885.
  Baseline: Prism e1 = 10.1210 summed / 3.3737 per-sample. No merge until M2 AND
  M3 pass; no success claim without a fresh both-units measurement.

## V4 program overview

The V4 program applies a reversible integer 8x8 block DCT to the source BEFORE
predictive coding. The transform decorrelates spatial redundancy, reducing
residual entropy. This is structurally different from the rejected C4/C5 wavelet
lifting (multi-resolution, cross-band, transform-first) and carries zero
transmitted side-info (fixed block size and basis), so the table-economics law
that killed the T-series does not apply.

Research: `prism/docs/research-v4-transform-domain.md` (PR #151).
Blueprint: Architect v4 assessment on PR #150.

## U-series checklist

- [x] U0 Transform harness extension (BLOCKING): DONE. BlockDCT module
      (integer 12-bit fixed-point, C_SCALE=4096, orthonormal COS_BAKED),
      TransformDomainMED, FRAME-F mode in sandbox, VB-transform-roundtrip /
      VB-transform-fidelity / VB-net-audit-u rails + failable --self-check-u0.
      Spec addendum 21 committed BEFORE any measurement. 152/152 tests green.
      VB-transform-roundtrip PASS (0 bytes delta). VB-transform-fidelity PASS.
- [x] U1 Block DCT predictor measurement (attacks B6): DONE - **FAIL**.
      FRAME-F (frequency-domain MED) vs FRAME-T (spatial MED) on pinned quad
      (kodim01/13/05/20) x 7 D4c color trials. FRAME-F is uniformly +19-24%
      WORSE than FRAME-T. Median RELPCT: +20.32% (FRAME-F is WORSE). U1 gate
      requires >= +1.50% NET gain - FAILED by 13x. Sub-gates: U1a payload
      +19-24% (positive but meaningless since NET is worse); U1b FAIL (+20.32%
      worse, not better); U1c: all 4 images regressed (kodim01 +21.39%,
      kodim13 +19.74%, kodim05 +23.63%, kodim20 +22.68%). Root cause: MED
      predicts from spatial neighbors (W, N, NW, NE). DCT coefficients lack
      spatial locality - DC carries block average, AC carries frequency
      components. Spatial neighbors of AC coefficients are NOT correlated the
      way spatial neighbors of pixels are. Prediction domain mismatch means
      DCT decorrelates source but MED cannot exploit it in frequency domain.
      Transform domain CLOSED with numbers. Decision record:
      .github/agents/decisions/builder/2026-08-26T21-00-00-u1-transform-domain-fail.md
- [ ] U2 Hybrid predictor composition (conditional on U1 PASS): NEVER OPENED -
      U1 FAILED, so U2 is skipped by its own terms.
- [ ] U3 Composition + projection + gate check: NEVER OPENED -
      U1 FAILED, so U3 is skipped by its own terms.

## Current step

U1 FAIL closes the transform domain per the blueprint decision tree. The
U-series program is complete with measured numbers. Every legitimate mechanism
class has been measured and rejected:
- Entropy-side refinement: V1 spatial keyings (+5.81% spine, tables dominate)
- Predictors: S1 GAP/W (MED ships, B3 closed)
- Context structures: S3 causal properties (flat-16 ships, B2 closed)
- Tokenization: T3 factorial (MED-only, B3/B5 closed)
- Composition: S4/T4 projected above threshold
- Source-side transform: U1 DCT-domain MED (+20.32% WORSE)

Escalating to Maintainer for owner-directed decision: honest closure at
achieved level (e1 = 10.1210 summed / 3.3737 per-sample, -8.21% vs baseline)
or exotic program.

## Agent log

- 2026-08-26 the Builder (U-series complete, U1 FAIL, escalation): U1
  measured on PR #153 - FRAME-F (frequency-domain MED) vs FRAME-T (spatial
  MED) on pinned quad x 7 D4c color trials. FRAME-F uniformly +19-24% WORSE.
  Median RELPCT +20.32% vs gate >= +1.50%. All 4 images regressed (kodim01
  +21.39%, kodim13 +19.74%, kodim05 +23.63%, kodim20 +22.68%). Root cause:
  MED spatial neighbors (W, N, NW, NE) are uncorrelated with DCT frequency
  coefficients - prediction domain mismatch. U1 FAIL closes the transform
  domain per the blueprint decision tree. All 152/152 tests green. The U-series
  program is complete. Every legitimate mechanism class has been measured and
  rejected. Escalating to Maintainer for owner-directed decision: honest
  closure at achieved level or exotic program. Decision record:
  .github/agents/decisions/builder/2026-08-26T21-00-00-u1-transform-domain-fail.md

- 2026-08-26: Fixer applied review findings:
  - Replaced double-precision DCT with integer 12-bit fixed-point DCT
    (C_SCALE=4096, orthonormal COS_BAKED table with alpha normalization).
  - Aligned compute_transform_residuals and reconstruct_transform_coefficients
    to int32 throughout (no floating-point in MED pipeline).
  - Fixed FRAME-F geometry: acoder uses num_contexts=1 for transform
    residuals, prepare_keyed_config uses w=0 for KFLAT16 (block-grid
    coefficient layout does not match pixel-grid adjacency).
  - Tightened VB-RT tolerance to <=1 per spec 21.2.
  - Renamed VB-FIDELITY to VB-NET-AUDIT-U per spec 21.5.
  - Block-level round-trip: <=1 (spec 21.2 bound). Plane-level with
    replicate padding: <=2 (boundary compounding). BD16: <=28 (12-bit
    cosine precision limit; sandbox operates on BD8 only).
  - All 152/152 tests green, no regressions.

- 2026-08-26: Builder created branch, read codebase, started V4-0 implementation.
