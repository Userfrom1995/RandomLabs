# Prism Neural Codec E1 - Full Neural Codec End-to-End

## What was built
A complete neural image codec implementing the Ballé/L3C architecture with:
- **Analysis network (g_a):** 4-layer Conv2d with GDN activations, 3->128->128->128->192 channels, stride 2/1/2/1
- **Hyper-analysis (h_a):** 3-layer Conv2d with GDN, 192->128->128->192, stride 1/2/1
- **Synthesis network (g_s):** Mirror of g_a with ConvTranspose2d upsampling and IGDN
- **Hyper-synthesis (h_s):** 2-layer Conv2d with ReLU, 192->32->384, with 2x upsample
- **Integer inference engine:** int8/int16 fixed-point (Q=1024) arithmetic in C++
- **Container format:** wavelet_container with NEURAL_FILTER_ID=20, serializing Y_q + Z_q + sigma + residual
- **Training infrastructure:** Procedural texture generator, three-phase training script, int16 weight exporter, Kodak-24 evaluator

## Key files
- `prism/scripts/gen_training_data.py` - procedural training data (Perlin, fractal, Voronoi, etc.)
- `prism/scripts/train_neural_codec.py` - three-phase training (MSE -> entropy -> joint)
- `prism/scripts/export_weights.py` - PyTorch to int16 C++ header
- `prism/scripts/eval_neural_codec.py` - Kodak-24 evaluation with gate checks
- `prism/include/prism/codec/neural_codec.h` - C++ API
- `prism/src/codec/neural_codec.cpp` - integer inference engine
- `prism/src/codec/neural_codec_data.inc` - baked weights (7.7 MB)
- `prism/src/codec/neural_frame.cpp` - frame encode/decode with lossless round-trip

## How it works
1. Encode: image -> g_a -> quantize -> Y_q, h_a(Y_q) -> quantize -> Z_q, h_s(Z_q) -> sigma
2. Reconstruct: g_s(Y_q) -> X_hat, residual R = X - X_hat
3. Serialize: header + Y_q + Z_q + sigma + R into wavelet_container
4. Decode: deserialize, g_s(Y_q) -> X_hat, X = X_hat + R

## Honest notes
- Training was minimal (20+5+10 epochs on 1000 synthetic 64x64 patches on CPU)
- Raw payload is 120 bpp (no entropy coding) - gates require <3.166 bpp
- The architecture is sound per literature but needs rANS entropy coding to be competitive
- Buffer overrun bug fixed in synthesis layer3 (upsampled2 size)
- Planar-to-CHW conversion bug fixed in frame encode path
