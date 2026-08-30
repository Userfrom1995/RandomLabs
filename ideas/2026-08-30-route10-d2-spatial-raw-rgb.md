# Route 10 D2: Spatial Predictor on Raw RGB (Pipeline Reorder)

- **Date:** 2026-08-30
- **Issue:** #198
- **Status:** R10-1 implemented, roundtrip verified, RG1 FAIL (3.667 per-sample, +1.2% vs D1)

## What

From-scratch JXL-Modular codec where the spatial predictor operates on RAW RGB
BEFORE the color transform (YCoCg-R), rather than after it. The D1 pipeline
(NextGen) failed because the spatial predictor on YCoCg-R expanded-range planes
(0..1023) produced residuals with HIGHER dynamic range than the original pixels.

## Why

The D2 recalibration (Dr. Mob, issue #198 comments) identified the root cause of
the D1 failure:

1. YCoCg-R expands BD8 8-bit RGB (0..255) to 10-bit range (Y: 0..1023, Co/Cg: biased ~0..1023)
2. The spatial predictor on these expanded-range planes produces mediocre predictions
3. The spatial residuals have LARGER variance than the original YCoCg-R planes
4. The wavelet produces larger coefficients, and the bitplane coder needs more bits

The fix: apply spatial prediction on raw RGB where neighbour correlation is ~0.95+
in a compact 0..255 range. The resulting residuals have ~0.3-0.5x the original variance.

## How it works

### Encode pipeline
```
Raw RGB (8-bit, 0..255)
  -> Spatial predictor P1 on raw RGB (bd_max=255)
     -> R_spatial = pixel - spatial_hat (signed int32, range ~[-255, 255])
  -> YCoCg-R on R_spatial (signed int32, no bias)
     -> R_colour (Y, Cg, Co, range ~[-510, 510])
  -> Wavelet lift (LeGall 5/3, 5 levels)
     -> Subbands of R_colour
  -> Coefficient predictor (X6b)
     -> R_final = wavelet_coeff - coeff_hat
  -> Bitplane rANS coder
  -> Container v2 with SPATIAL_RGB_FLAG (0x200)
```

### Decode pipeline (mirror)
```
Bitplane decode -> R_final
  -> Coefficient predictor reconstruct -> subbands
  -> Inverse wavelet -> R_colour (signed int32 stored as int16 in u16 planes)
  -> Inverse YCoCg-R on signed residuals -> R_spatial
  -> Spatial reconstruct on raw RGB (bd_max=255) -> Raw RGB
```

### Signed YCoCg-R transform

The same lifting-form transform as the unsigned version, but on signed int32
without bias or bd_mask:

```cpp
// Forward
Co = R - B;
t = B + (Co >> 1);
Cg = G - t;
Y = t + (Cg >> 1);

// Inverse
t = Y - (Cg >> 1);
G = Cg + t;
B = t - (Co >> 1);
R = B + Co;
```

### Container format

- Version: v2 (residual_mode > 255)
- Flag: SPATIAL_RGB_FLAG = 0x200 (bit 9) in residual_mode
- residual_mode = 0x201 (bit 0 = residual, bit 9 = spatial RGB)

## Key files

- `prism/include/prism/codec/wavelet_container.h` - SPATIAL_RGB_FLAG, route10 declaration
- `prism/include/prism/codec/color.h` - Signed YCoCg-R declarations
- `prism/src/codec/color.cpp` - Signed YCoCg-R implementations
- `prism/src/codec/wavelet_container.cpp` - route10 encode + decode
- `prism/src/cli/main.cpp` - wavelet-r10 and bench-r10 subcommands

## Honest assessment

This is R10-1 (Phase 1): the P1 adaptive bank on raw RGB with the D2 pipeline
reorder. R10-1 measurement on held-out kodim02/07/17/21: mean 3.667 per-sample
(RG1 FAIL, +22% over 3.00 gate). +1.2% improvement over D1 (3.67 vs 3.71) but
far from architect projection 3.00-3.10 / 2.72-2.92. M2 (3.166) and M3 (2.885)
also fail. The next step per the D2 blueprint is R10-4 (transmitted histogram,
the primary entropy driver).

- the Builder
