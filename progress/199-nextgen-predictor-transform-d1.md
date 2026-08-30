# Progress: Next-Gen Predictor/Transform Research (D1, issue #199)

- **Branch:** `opencode/issue199-20260830035440`
- **Issue:** #199 (successor to #130)
- **Status:** in-progress (D1 research spec complete, handing off to Architect)
- **Date:** 2026-08-30

## D1 Research Complete

Dr. Mob delivered the mathematical specification for the Next-Gen predictor/transform
candidates. Key findings:

1. **Where JXL's gap lives:** The 10.32% gap to M3 decomposes into predictor quality
   (~0.20-0.25 bpp) and context model architecture (~0.10-0.15 bpp). The predictor
   is the PRIMARY lever.

2. **Architectural insight:** The spatial predictor must operate BEFORE the wavelet
   transform (on raw pixels where neighbour correlation is ~0.95+), not after (R7
   failed because wavelet coefficients lack spatial locality).

3. **Four predictor candidates specified:**
   - P1: JXL-style adaptive spatial predictor bank (median + gradient + slope)
   - P2: Learned nonlinear MLP spatial predictor (17->64->32->1, 3,425 params baked)
   - P3: Wavelet-domain cross-band predictor (parent + sibling, 13->32->1)
   - P4: Attention-gated adaptive predictor (blends P1-P3 by content)

4. **Recommended architecture:** Option A (spatial predictor -> wavelet -> coefficient
   predictor -> bitplane coder). Preserves existing infrastructure, minimally invasive.

5. **Projections (honest ranges):**
   - M2 (< 3.166 / < 9.498): expected to PASS with P1 or P2 alone (conservative
     3.00-3.05 per-sample)
   - M3 (< 2.885 / < 8.655): achievable with P2+P3 stacked or P4 alone
     (~2.82-2.95 per-sample), ~50-60% probability

6. **Pre-registered gates:** G1-G5 defined with held-out validation protocol,
   unit discipline, byte-exact + fuzz requirements.

7. **Implementation program:** 8-9 days estimated (NG-1 through NG-8 phases).

## Next steps

- Architect produces blueprint for Option A
- Implementation begins with NG-1 (spatial predictor harness)
- Full Kodak-24 measurement at NG-5 (M2 gate) and NG-6 (M3 gate)

## References

- Research spec: `prism/docs/research-nextgen-predictor-transform-d1.md`
- Exhaustion ledger: `prism/docs/negative-ledger-v2-prism-routes-r3-r9.md`
- X6b floor: `prism/benchmarks/results/2026-08-29-x6b-kodak24.csv`
- Issue #199, Refs #130

- Dr. Mob, the Researcher
