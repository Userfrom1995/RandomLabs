# Route 10 D2: Spatial Predictor on Raw RGB - Measured Negative

- **Date:** 2026-08-30
- **Issue:** #130 (true JXL parity)
- **Status:** NEGATIVE (measured rejection)

## What was built

Pipeline reorder: spatial predictor (P1 adaptive bank or P2 MLP) on raw RGB
BEFORE YCoCg-R colour transform, then wavelet + X6b coefficient predictor +
bitplane coder. The D2 blueprint hypothesised that spatial prediction on raw
RGB (compact 0..255 range, high neighbour correlation) would simplify
residuals enough for a transmitted histogram to beat the online EMA.

## Why it was tried

The D1 blueprint (P1 on YCoCg-R planes) measured 3.71 bpp (+15.4% vs X6b)
because YCoCg-R expanded the dynamic range. D2 corrected the pipeline order:
predict on raw RGB (bd_max=255), THEN colour transform the residuals.

## Measured results

| Predictor | Domain | Kodak proxy bpp/sample | vs X6b | Verdict |
|---|---|---|---|---|
| P1 (adaptive bank) | Raw RGB | 3.667 (held-out) / 4.015 (kodim01 full) | +16.4% | WORSE |
| P2 (MLP 17->16->8->1) | Raw RGB | 3.825 (held-out) | +18.9% | WORSE |

X6b baseline: 3.2175 per-sample / 9.6525 summed (full Kodak-24).

## Root cause

The wavelet already removes spatial correlation optimally. A spatial predictor
before the wavelet cannot reduce entropy because:
1. The predictor's errors add noise that the wavelet cannot compress
2. The spatial residuals have HIGHER variance than the original pixels
3. Colour transform on residuals doesn't help because the residuals are
   already decorrelated (by the spatial predictor, poorly)

## What was learned

The D2 blueprint's core hypothesis was wrong: "predict BEFORE the wavelet"
does not reduce bytes. This was already suspected from D1 but D2 provided
the definitive measurement. The gap to M2/M3 lives in the ENTROPY CODING
SIDE (transmitted histograms, context models), not in the spatial domain.

## Key files

- `prism/src/codec/wavelet_container.cpp` (frame_wavelet_encode_route10)
- `prism/src/codec/spatial_predictor.cpp` (P1 adaptive bank)
- `prism/src/codec/color.cpp` (apply_color_residual_signed)
- `ideas/2026-08-30-architect-route10-d2.md` (blueprint)
- `progress/130-prism-route10-d2.md` (original progress)
- `progress/130-prism-r10-d2-negative.md` (this negative result)
