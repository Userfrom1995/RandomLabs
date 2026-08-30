# Progress: Next-Gen Predictor/Transform (issue #199) - NG-2 Phase

- **Branch:** `opencode/issue199-20260830035440`
- **Issue:** #199 (successor to #130)
- **Status:** in-progress (NG-2 measurement complete, G1 gate FAIL)
- **Date:** 2026-08-30

## NG-1: Spatial Predictor Harness (P1) - COMPLETE

Builder implemented the P1 JXL-style adaptive spatial predictor bank and wired it
into the prism encode/decode pipeline per the Architect's Option A blueprint.

### Files created/modified

- **Created:** `include/prism/codec/spatial_predictor.h` - P1 API, SpatialPredType, P1Config, SpatialState
- **Created:** `src/codec/spatial_predictor.cpp` - P1 implementation (4 sub-predictors: median, gradient, NE slope, WE slope, adaptive blending)
- **Modified:** `include/prism/codec/wavelet_container.h` - widened residual_mode to uint16_t, added SPATIAL_P1_FLAG (bit 8), frame_wavelet_encode_nextgen() declaration
- **Modified:** `src/codec/wavelet_container.cpp` - added frame_wavelet_encode_nextgen(), v2 container serialization, spatial predictor decode path
- **Modified:** `src/cli/main.cpp` - added wavelet-ng and bench-ng subcommands
- **Modified:** `CMakeLists.txt` - added spatial_predictor.cpp to prism_core

### Pipeline

```
Raw pixels
  -> Color transform (YCoCg-R)           [color.cpp] UNCHANGED
  -> Spatial predictor P1                [spatial_predictor.cpp] NEW
     -> R_spatial = pixel - spatial_hat
  -> Wavelet lift (LeGall 5/3, 5 levels) [wavelet.cpp] UNCHANGED
  -> Coefficient predictor (X6b)         [predictor.cpp] UNCHANGED
     -> R_final = wavelet_coeff - coeff_hat
  -> Bitplane rANS coder                 [bitplane.cpp] UNCHANGED
  -> Container (PRSM v2)                 [container.cpp] EXTENDED
```

### Container format changes

- Version bumped from 1 to 2 when residual_mode uses high-byte flags
- residual_mode widened from uint8_t to uint16_t on wire (v2 only)
- New flag: SPATIAL_P1_FLAG = 0x100 (bit 8) - P1 adaptive spatial predictor active
- v1 streams fully backward-compatible (version 1, uint8_t residual_mode)

### Round-trip verification

- `prism wavelet-ng`: byte-exact roundtrip OK on kodim01/02/03 (768x512, BD8)
- Existing test suite: 228/228 PASS (no regressions)
- No regressions to existing v1/v1-wavelet paths

### Key implementation decisions

1. **Border handling:** 0 for out-of-bounds neighbours (matches predict.h convention, NOT clamped replication)
2. **bd_max = 65535** for color-transformed planes (YCoCg-R chroma can reach ~1023)
3. **Combined predict+update** in single pass to avoid redundant neighbor fetches
4. **SpatialState evolves causally** identically at encode and decode (invariant I29)

## NG-2: P1 Measurement on Kodak-24 - COMPLETE (G1 FAIL)

Full Kodak-24 measurement with `prism bench-ng`. CSV: `prism/benchmarks/results/2026-08-30-nextgen-p1-kodak24.csv`

### Results

| Metric | Value | Gate | Status |
|--------|-------|------|--------|
| Mean per-sample | 3.71297 bpp | < 3.166 (M2) | FAIL |
| Mean summed | 11.1389 bpp/img | < 9.498 (M2) | FAIL |
| Median per-sample (all 24) | 3.60527 bpp | - | - |
| Held-out median (kodim02/07/17/21) | 3.56952 bpp | <= 3.10 (G1) | **FAIL** |
| Min per-sample | 3.25964 (kodim03) | - | - |
| Max per-sample | 4.43932 (kodim13) | - | - |
| All 24 roundtrip | 24/24 byte-exact | 24/24 | PASS |

### Comparison with X6b baseline

| Config | Mean per-sample | Mean summed |
|--------|----------------|-------------|
| X6b only (no spatial) | 3.21751 bpp | 9.65253 bpp/img |
| P1 + X6b (next-gen) | 3.71297 bpp | 11.1389 bpp/img |
| **Delta** | **+0.49546 bpp (+15.4%)** | **+1.4864 bpp (+15.4%)** |

### Analysis

**P1 spatial predictor HURTS compression by +0.495 bpp (+15.4%).** The spatial
predictor adds prediction residuals with HIGHER dynamic range than the original
YCoCg-R planes, and the wavelet + X6b pipeline cannot compensate.

Root cause: the P1 adaptive bank produces mediocre predictions on color-transformed
planes (bd_max=65535 clamping, slow convergence of adaptive weights). The spatial
residuals R_spatial have larger variance than the original pixels, so the wavelet
transform produces larger coefficients, and the bitplane coder needs more bits.

This is an honest negative result. The D1 research spec predicted P1 would achieve
3.00-3.05 bpp; actual is 3.71 bpp (20% error in projection).

### Next steps

- Phase NG-3: train P2 MLP spatial predictor (may be significantly better than P1 bank)
  - If P2 also fails G1, the "spatial predictor before wavelet" architecture may be
    fundamentally flawed for this pipeline
- Phase NG-4: P3 cross-band (operates AFTER wavelet, may be more promising)
- Honest gate evaluation: G1 FAILS, proceed to P2 or reassess architecture

## References

- Research spec: `prism/docs/research-nextgen-predictor-transform-d1.md`
- Architectural blueprint: `ideas/2026-08-30-architect-nextgen-option-a.md`
- Exhaustion ledger: `prism/docs/negative-ledger-v2-prism-routes-r3-r9.md`
- X6b floor: `prism/benchmarks/results/2026-08-29-x6b-kodak24.csv`
- P1 measurement: `prism/benchmarks/results/2026-08-30-nextgen-p1-kodak24.csv`
- Issue #199, Refs #130

- the Builder
