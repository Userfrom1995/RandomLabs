# Progress: Next-Gen D2 Recalibration (issue #199) - Research Phase

- **Branch:** `opencode/issue199-20260830-d2-recalibration`
- **Issue:** #199 (successor to #130)
- **Status:** COMPLETE (research recalibration, handoff to Architect)
- **Date:** 2026-08-30

## Summary

D1 research spec projected P1 (JXL adaptive spatial predictor bank) at 3.00-3.05 bpp
per-sample. NG-2 measured P1 at **3.71297 bpp** (+15.4% regression over X6b 3.21751).
This is a 20% projection error in the wrong direction.

Root cause identified: P1 operates on YCoCg-R colour-transformed planes where neighbour
correlation is lower (~0.85-0.90 for Co/Cg vs ~0.98 for raw RGB). The spatial residuals
have HIGHER dynamic range than the input planes, and the wavelet + bitplane pipeline
cannot compensate.

## Revised architecture

The correct JXL-Modular architecture reorders the pipeline:

```
Current Prism (P1 failed):
  Raw pixels -> YCoCg-R -> Spatial predictor -> Wavelet -> Coefficient predictor -> Entropy

Correct JXL-Modular (D2 recommendation):
  Raw pixels -> Spatial predictor (on RAW RGB) -> Wavelet -> Colour transform -> Entropy
```

OR, replace the entropy backend with transmitted histograms (the LARGER gain component).

## Two viable paths

**Path 1:** Reorder colour transform (spatial predictor on raw RGB before YCoCg-R).
Estimated: 2.97-3.07 per-sample, ~60-70% M2, ~15-25% M3.

**Path 2:** Replace entropy backend with transmitted histograms + ANS (JXL Modular proper).
Estimated: 2.87-3.02 per-sample, ~70-80% M2, ~40-55% M3.

**Path 3 (recommended):** Both. Estimated: 2.72-2.92 per-sample, ~85-90% M2, ~60-75% M3.

## Deliverables

- `prism/docs/research-nextgen-d2-recalibration.md` - full D2 specification
- This progress file
- Decision: `{"action":"architect"}`

## References

- D1 spec: `prism/docs/research-nextgen-predictor-transform-d1.md`
- P1 measurement: `prism/benchmarks/results/2026-08-30-nextgen-p1-kodak24.csv`
- P1 progress: `progress/199-nextgen-predictor-transform-d1.md`
- Exhaustion ledger: `prism/docs/negative-ledger-v2-prism-routes-r3-r9.md`
- X6b floor: `prism/benchmarks/results/2026-08-29-x6b-kodak24.csv`

- Dr. Mob, the Researcher
