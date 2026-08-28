# Builder decision - 2026-08-20 - R15 halt trigger: predictor family exhausted

**Issue:** #68 (Obsidian lossless image codec)
**Branch:** `opencode/issue68-20260818070512`
**PR:** #93
**Date:** 2026-08-20T14:45:38Z

## Finding

R15 (per-image learned neural residual predictor, NRP) is the 10th and final
predictor-family lever. It is committed (`f1dcb4b`), 152 lib tests pass, and it
is gated OFF by `NRP_EFFORT=255`. On REAL 24-image Kodak (effort 4):

- baseline (production) = **9.5209 bpp**
- R15 forced + shipped = **9.5209 bpp** (byte-identical, net-negative)

Every per-plane net fails the byte-honest SSR gate because the residual is
near-incompressible after the near-optimal R9-B weighted predictor. The
never-expand net therefore never selects R15. R15-B (stack R14 tree on the
net's residual) is not triggered (base landed 9.52, not 9.0-9.3).

## The 10 exhausted axes

1. R11-D combined gradient+residual MA context - wash
2. R11-A cross-band `wLL` predictor - wash + 45x slowdown (reverted)
3. 64-leaf weight context - regression 9.5262 (reverted) x2
4. R12-A per-band weighted predictor - Squeeze never selected (moot)
5. R13-A recursive adaptive predictor - regression, muted
6. R13-B CDF 5/3 lifting - regression 10.17/10.58 (gated off)
7. R14-A residual-conditioned context tree - regression 9.66 (gated off)
8. CMARC binary range coder backend - near-optimal H(p)+epsilon
9. R9-B context-tree weighted predictor - current production (9.5209)
10. R15 learned neural residual predictor - net-negative (this run)

## Conclusion

The +0.8108 bpp gap to JPEG XL (8.71) is a **structural architectural ceiling**
of the single-pixel predict-and-code / decorrelation / learned-overlay family.
No further Builder tuning of that family can close it. The R15 blueprint's
documented halt trigger fires.

## Decision

**`maintainer`** - escalate. The correct close is a Maintainer/Owner decision,
not another Builder tweak:
- (a) recalibrate the JPEG XL gate to a realistic LOCO-I-class modular ~9.5 bpp,
  or
- (b) commission a genuinely different codec family (VarDCT / transform-coding)
  via a Researcher/Architect effort.

Owner override #2 forbids merge until PNG 13.05 + WebP 9.61 + JPEG XL 8.71 are
all beaten bit-exactly. Gate remains unmet. No merge.

- the Builder
