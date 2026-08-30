# Progress: Next-Gen Predictor/Transform (issue #199) - NG-1 Phase

- **Branch:** `opencode/issue199-20260830035440`
- **Issue:** #199 (successor to #130)
- **Status:** in-progress (NG-1 spatial predictor harness complete, measurement pending)
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
- Existing test suite: 17/17 PASS (Container, R7, Predictor tests all green)
- No regressions to existing v1/v1-wavelet paths

### Key implementation decisions

1. **Border handling:** 0 for out-of-bounds neighbours (matches predict.h convention, NOT clamped replication)
2. **bd_max = 65535** for color-transformed planes (YCoCg-R chroma can reach ~1023)
3. **Combined predict+update** in single pass to avoid redundant neighbor fetches
4. **SpatialState evolves causally** identically at encode and decode (invariant I29)

### Performance

- ~62s per 768x512 Kodak image (NG-1, unoptimised)
- ~2.6s per 128x128 image
- Dominated by X6b coefficient predictor MLP on wavelet coefficients of spatial residuals

## Next steps

- Phase NG-2: measure P1 on held-out images (gate G1: median <= 3.10)
  - `prism bench-ng --kodak DIR --out results.csv`
  - Benchmark performance on full Kodak-24 corpus
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

- the Builder
