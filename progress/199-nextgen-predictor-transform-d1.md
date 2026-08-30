# Progress: Next-Gen Predictor/Transform (issue #199) - Architectural Phase

- **Branch:** `opencode/issue199-20260830035440`
- **Issue:** #199 (successor to #130)
- **Status:** in-progress (D1 research complete, architectural blueprint produced)
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

## Architectural Blueprint Complete

The Architect produced the comprehensive blueprint for Option A covering:

1. **Module boundaries:** New `spatial_predictor.h/cpp` module with P1/P2/P4
   implementations, extending existing `predictor.h/cpp` for P3 cross-band.

2. **Wavelet integration point:** Between `apply_color()` and `wavelet.forward()`.
   New `frame_wavelet_encode_nextgen()` function in `wavelet_container.cpp`.

3. **Coefficient predictor stacking:** P3 (13->32->1 cross-band) alongside X6b,
   with weighted blend via baked alpha constant.

4. **Container format:** Version bump to v2, `residual_mode` widened to uint16_t
   with new bits for spatial predictor type and cross-band flag.

5. **Training pipeline:** Offline Python trainer for P2 (MSE + L2, Adam, 50 epochs),
   baked weights exported to `.inc` files.

6. **Benchmarking:** `--spatial-pred` CLI flag, bench_gate.sh extensions for G1-G5.

7. **Test matrix:** Round-trip, bijection, invariant, fuzz, overhead, legacy tests.

8. **Phased gates:** NG-1 through NG-8 with clear deliverables and acceptance criteria.

## Next steps

- Builder to scaffold NG-1: create `spatial_predictor.h/cpp`, wire P1 into pipeline
- Phase NG-2: measure P1 on held-out images (gate G1: median <= 3.10)
- Phase NG-3: train P2 MLP, replace P1 if better
- Phase NG-4: implement P3 cross-band, stack with best of P1/P2
- Phase NG-5: full M2 measurement (gate G3)
- Phase NG-6: full M3 measurement (gate G4)
- Phase NG-7: P4 attention if M3 fails
- Phase NG-8: stabilisation

## References

- Research spec: `prism/docs/research-nextgen-predictor-transform-d1.md`
- Architectural blueprint: `ideas/2026-08-30-architect-nextgen-option-a.md`
- Exhaustion ledger: `prism/docs/negative-ledger-v2-prism-routes-r3-r9.md`
- X6b floor: `prism/benchmarks/results/2026-08-29-x6b-kodak24.csv`
- Issue #199, Refs #130

- the Architect
