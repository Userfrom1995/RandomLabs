# P2 Learned Spatial MLP Predictor (issue #130)

- **Date:** 2026-08-30
- **Issue:** #130 (Prism true JXL parity)
- **Architecture:** Option A - Spatial predictor BEFORE wavelet (D1 Research, P2 candidate)

## What was built

A 17->64->32->1 fully-connected neural network (3,425 parameters) that predicts
each pixel value from a causal spatial neighbourhood of raw pixels. The prediction
is subtracted from the pixel, and the residual goes through the standard wavelet
+ bitplane pipeline.

### Input features (17, all int16, raw pixel-scale)
0-6: W, N, NW, NE, W-N, N-NW, W-NW (spatial)
7-10: W-WW, N-NN, avg_gradient, triple_avg (gradient)
11-12: (x%8)<<4, (y%8)<<4 (position)
13-16: local_std, edge_mag, range, local_mean (texture)

### Network
```
h1 = relu(W1 @ feat + B1) >> 16     (17 -> 64, ReLU)
h2 = relu(W2 @ h1 + B2) >> 16      (64 -> 32, ReLU)
pred = (W3 @ h2 + B3) >> 16        (32 -> 1, linear)
```

All weights are int16 Q=256, biases int32 Q=256^2=65536.
Accumulation in int64. Both encoder and decoder compute the identical integer
prediction from the same causal neighbours (byte-exact round-trip, invariant I29).

### Training
- Trained on Kodak-24 (2M pixel pairs, causal raster scan)
- MSE loss + L2 regularization, Adam optimizer, 50 epochs
- Per-pair training: each pixel is visited in raster order, features extracted
  from already-reconstructed neighbours

## Why it didn't help

P2 measures 3.244 bpp/sample on Kodak-24, nearly identical to the X6b baseline
(3.2175 bpp/sample). The spatial predictor + wavelet pipeline is architecturally
neutral: the LeGall 5/3 wavelet already removes spatial correlation from natural
images. Pre-removing it via spatial prediction provides no net gain because:

1. The wavelet is designed for spatial correlations in natural images
2. Spatial prediction residuals are high-frequency noise that the wavelet
   cannot compress better than the original signal
3. The coefficient predictor (EMA + MLP) in X6b already captures the same
   structure that P2's spatial MLP captures

This is consistent with P1 (adaptive bank, 3.74 bpp) being worse: both spatial
predictors trade spatial correlation removal at the input for noise-like residuals
that the wavelet can't help with.

## Files
- `prism/scripts/train_p2.py` - Python trainer
- `prism/src/codec/spatial_predictor_p2_data.inc` - baked int16 weights
- `prism/src/codec/spatial_predictor.cpp` - C++ inference (spatial_predict_p2)
- `prism/include/prism/codec/spatial_predictor.h` - public API
- `prism/include/prism/codec/wavelet_container.h` - P2_FLAG, uint16_t residual_mode
- `prism/src/codec/wavelet_container.cpp` - encode/decode for P2
- `prism/src/cli/main.cpp` - bench-p2, wavelet-p2 CLI
- `prism/benchmarks/results/2026-08-30-p2-spatial-mlp-kodak24.csv` - measurement

## Conclusion

P2 FAILS M2/M3 gates. The spatial predictor + wavelet architecture provides no
improvement over the X6b coefficient-predictor-only baseline. The gap to JXL
parity does NOT live in the spatial predictor; it is architectural.
