# Idea: Next-Gen JXL-Modular Codec - Stronger Predictor/Transform (issue #199)

- **Date:** 2026-08-30
- **Category:** Compression / Image Coding
- **What:** From-scratch lossless image codec where a genuinely stronger spatial
  predictor makes residuals simple enough that a transmitted histogram becomes the
  PRIMARY model. Targets M2 (WebP parity) and M3 (JPEG XL parity) on Kodak-24.
- **Why:** The single-pipeline architecture (wavelet + bitplane EMA) has a hard
  ceiling at 3.2175/9.6525 bpp. All 44 incremental mechanism classes have been
  measured and rejected. The gap to JXL lives in the predictor/transform, not the
  context model. A spatial-domain predictor before the wavelet is the proven
  architectural path (JXL's actual mechanism).
- **How:** Four predictor candidates (JXL adaptive bank, learned MLP, cross-band,
  attention) stacked with the existing wavelet + bitplane infrastructure. Option A
  architecture: spatial predictor -> wavelet -> coefficient predictor -> bitplane coder.
- **Risk:** M3 is at ~50-60% probability with Option A. Fallback is Option C (learned
  pyramid, complete rewrite).
- **Ref:** Issue #199, Refs #130

- Dr. Mob, the Researcher
