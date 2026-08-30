# Progress: Route 10 (D2 Corrected) Blueprint - Architect Phase

- **Branch:** `opencode/issue198-20260830152328`
- **Issue:** #199 (successor to #130)
- **Status:** in-progress (Architect blueprint complete, awaiting Builder)
- **Date:** 2026-08-30
- **Depends on:** D1 blueprint (ideas/2026-08-30-architect-nextgen-option-a.md),
  D2 recalibration (issue #199 comments), NG-1/NG-2 measured failure

## Previous State (D1 Option A - FAILED)

- NG-1: P1 spatial predictor on YCoCg-R planes - COMPLETE (byte-exact roundtrip OK)
- NG-2: P1 measurement - **G1 FAIL** (3.71297 bpp, +15.4% worse than X6b baseline)
- Root cause: spatial predictor on YCoCg-R expanded-range planes produces higher-
  dynamic-range residuals

## D2 Architectural Correction

The Architect has produced the corrected blueprint incorporating D2 findings:

### Key Changes from D1
1. **Spatial predictor domain:** YCoCg-R planes -> raw RGB (before colour transform)
2. **Colour transform position:** before spatial -> after spatial (pipeline reorder)
3. **Entropy backend:** EMA-only -> transmitted histogram PRIMARY + EMA SECONDARY
4. **bd_max:** 1023 -> 255 (corrected clamping for raw RGB)
5. **Container version:** v2 -> v3 (new flags for transmitted histogram)
6. **New gate RG2:** transmitted histogram backend measurement

### New Pipeline (Route 10, D2)
```
Raw RGB -> Spatial pred (raw RGB) -> YCoCg-R -> Wavelet -> Coeff pred -> Transmitted histogram
```

### Gates
- RG1: Spatial predictor alone on raw RGB, median <= 3.00 per-sample
- RG2: Transmitted histogram backend, >= +2.0% NET over RG1
- RG3: M2 parity (summed < 9.498, per-sample < 3.166)
- RG4: M3 parity (summed < 8.655, per-sample < 2.885)
- RG5: P3/P4 extension if RG3 pass but RG4 fail

### Phases
- R10-1: P1 on raw RGB harness
- R10-2: P1 measurement (held-out)
- R10-3: P2 MLP training (if P1 fails RG1)
- R10-4: Transmitted histogram backend
- R10-5: M2 measurement (RG3)
- R10-6: M3 measurement (RG4)
- R10-7: P3/P4 extension (if RG4 fails)
- R10-8: Stabilisation

## Deliverables

- `ideas/2026-08-30-architect-route10-d2.md` - Comprehensive architectural blueprint
- `progress/199-route10-blueprint.md` - This progress file

## Next Steps

- Builder to implement R10-1: P1 spatial predictor on raw RGB, wired into prism
  encode/decode pipeline
- Modified files: spatial_predictor.h/cpp, wavelet_container.cpp, main.cpp
- Gate: decode(encode(x)) byte-exact 24/24 on Kodak-24

## References

- D1 Research spec: `prism/docs/research-nextgen-predictor-transform-d1.md`
- D1 Blueprint: `ideas/2026-08-30-architect-nextgen-option-a.md`
- D2 Blueprint: `ideas/2026-08-30-architect-route10-d2.md`
- NG-1/NG-2 failure: `progress/199-nextgen-predictor-transform-d1.md`
- X6b baseline: `prism/benchmarks/results/2026-08-29-x6b-kodak24.csv`
- P1 failure: `prism/benchmarks/results/2026-08-30-nextgen-p1-kodak24.csv`
- Issue #199, Refs #130

- the Architect
