# Progress: Route 10 R10-1 - Spatial Predictor on Raw RGB (D2 Pipeline Reorder)

- **Branch:** `opencode/issue198-20260830172830`
- **Issue:** #198 (Route 10 tracker, successor to #130; #199 closed)
- **Status:** in-progress (R10-1 complete, awaiting measurement)
- **Date:** 2026-08-30
- **Depends on:** D2 Blueprint (`ideas/2026-08-30-architect-route10-d2.md`)

## R10-1: P1 Spatial Predictor on Raw RGB - IMPLEMENTED

### What was done

Implemented the Route 10 D2 corrected pipeline: spatial predictor operates on RAW RGB
BEFORE the color transform, then YCoCg-R decorrelates the spatial residuals (lower
dynamic range), then wavelet + coefficient predictor + bitplane coder.

### Pipeline (Route 10 D2, corrected)

```
Encode: Raw RGB -> Spatial pred (raw RGB, bd_max=255) -> YCoCg-R (signed int32)
        -> Wavelet lift -> Coeff pred (X6b) -> Bitplane coder -> Container v2

Decode: Bitplane decode -> Coeff pred reconstruct -> Inverse wavelet
        -> Inverse YCoCg-R (signed int32) -> Spatial reconstruct (raw RGB)
```

### Key difference from nextgen (D1, FAILED)

| Aspect | NextGen (D1, FAILED) | Route 10 D2 (CURRENT) |
|--------|----------------------|------------------------|
| Spatial predictor domain | YCoCg-R planes (bd_max=1023) | Raw RGB (bd_max=255) |
| Colour transform position | BEFORE spatial predictor | AFTER spatial predictor |
| Flag | SPATIAL_P1_FLAG (0x100) | SPATIAL_RGB_FLAG (0x200) |
| Expected per-sample | 3.00-3.05 (wrong) | 2.72-2.92 (D2 projection) |

### Files modified

1. **`prism/include/prism/codec/wavelet_container.h`**
   - Added `SPATIAL_RGB_FLAG = 0x200` (bit 9)
   - Updated `SPATIAL_TYPE_MASK` to 0x300
   - Added `frame_wavelet_encode_route10()` declaration

2. **`prism/include/prism/codec/color.h`**
   - Added `apply_color_residual_signed()` and `invert_color_residual_signed()` declarations
   - YCoCg-R on signed int32 planes (no bias, no mask)

3. **`prism/src/codec/color.cpp`**
   - Implemented `apply_color_residual_signed()` and `invert_color_residual_signed()`
   - Same lifting-form YCoCg-R as the unsigned version but on int32 directly

4. **`prism/src/codec/wavelet_container.cpp`**
   - Implemented `frame_wavelet_encode_route10()`:
     1. Compute spatial residuals on raw RGB planes (bd_max=255)
     2. Apply YCoCg-R on signed int32 residuals (BD8 only)
     3. Wavelet forward on decorrelated residuals
     4. Coefficient predictor (X6b) residual
     5. Bitplane code + container v2 with SPATIAL_RGB_FLAG
   - Updated `frame_wavelet_decode()`:
     - Skip standard inverse YCoCg-R when SPATIAL_RGB_FLAG set
     - Post-loop: inverse YCoCg-R on signed residuals, spatial reconstruct on raw RGB

5. **`prism/src/cli/main.cpp`**
   - Added `wavelet-r10` subcommand (encode + roundtrip test)
   - Added `bench-r10` subcommand (Kodak-24 benchmark)

### Roundtrip verification

- 4x4: ROUNDTRIP=OK
- 16x16: ROUNDTRIP=OK
- 64x64: ROUNDTRIP=OK
- 128x128: ROUNDTRIP=OK
- Fuzz: 100/100 PASS

### Measurement (pending)

R10-2: Full Kodak-24 measurement with `bench-r10 --kodak` is the next step.
Expected: per-sample ~3.00-3.10 (RG1 gate: <= 3.00).

### Gate status

- [x] Byte-exact roundtrip verified on small images
- [x] Fuzz clean (100 iters)
- [ ] RG1: Spatial predictor alone on raw RGB, median <= 3.00 per-sample (PENDING)
- [ ] Full Kodak-24 byte-exact verification (PENDING)

## References

- D2 Blueprint: `ideas/2026-08-30-architect-route10-d2.md`
- Issue #198, Refs #130

- the Builder
