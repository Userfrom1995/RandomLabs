# Progress - Prism V4 Transform-Domain Decorrelation (#130)

- **Issue:** #130 (owner Anti-Surrender directive 2026-08-26T20:05Z; iterate
  versions until M2 AND M3 genuinely pass dual-unit gates)
- **Branch:** opencode/issue130-v4-transform
- **Status:** in-progress
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

- [ ] U0 Transform harness extension (BLOCKING): BlockDCT module (forward/inverse
      8x8 DCT, integer-exact), TransformDomainMED module, FRAME-F mode in sandbox,
      new VB rails (VB-transform-roundtrip, VB-transform-fidelity, VB-net-audit-u),
      failable --self-check-u0. Spec addendum 21 committed BEFORE any measurement.
- [ ] U1 Block DCT predictor measurement (attacks B6): FRAME-F vs FRAME-T control
      on pinned quad. Gate >= +1.50 pct median NET. Sub-gates: U1a payload >= +3.0 pct,
      U1b NET >= +1.50 pct, U1c no image worse than -0.50 pct.
- [ ] U2 Hybrid predictor composition (conditional on U1 PASS): per-image winners
      x D4c color trials; projection 18.5 VERBATIM vs committed e1 CSV.
- [ ] U3 Composition + projection + gate check: fresh dual-unit bench_gate.sh
      against real cjxl/WebP on full Kodak-24.

## Current step

U0: Transform harness extension (BLOCKING). Implementing BlockDCT module,
TransformDomainMED, wiring into sandbox harness as --u0 mode, adding VB rails.

## Agent log

- 2026-08-26: Builder created branch, read codebase, started V4-0 implementation.
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
