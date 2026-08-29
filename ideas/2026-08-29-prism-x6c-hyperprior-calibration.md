# Prism X6c - Learned Hyperprior Calibration (Route 4, lever L3)

Author: the Builder (2026-08-29)
Issue: #130 (true JXL parity). Predecessor: X6b (MLP coefficient predictor).

## What it is

The final X6 reserve lever. Instead of sending a full hyperprior model (which
would break invariant I29 - no model tables in the NET), X6c transmits a tiny
per-subband scalar "calibration factor": a quantised code (8-entry codebook
centred on 1.0) stored in the wavelet header. At encode AND decode the factor
multiplies the LearnedModel's predicted P(0)*M probability for every symbol of
that subband. No model bytes are transmitted - only a few bits per subband - so
I29 holds and the round trip stays byte-exact.

The factor recalibrates the learned context model's probability mass. A
super-1 factor sharpens the predicted peak (the model over-spreads the mass); a
sub-1 factor flattens it. The encoder searches the per-plane optimal factor by
minimising the actual rANS payload at bake time.

## Implementation

- `bitplane.h/.cpp` - `BitplaneCoder::encode/decode/generate_symbols` gain an
  optional `const std::vector<float>* sub_scale` indexed by subband; it scales
  `p0` via `scale_p0()` (clamped to [1, 65534] to keep rANS valid). Default
  nullptr = factor 1.0 (no change, fully backward compatible).
- `wavelet_container.h/.cpp` - `WaveletHeader::sub_scale_code` (one uint8 per
  subband, forward() order); serialised/deserialised in the container header.
  `frame_wavelet_encode_residual` searches the best per-plane code;
  `frame_wavelet_decode` rebuilds the per-subband factors for the decoder.

## Results (REAL pinned Kodak-24, byte-exact)

| Method | per-sample | summed | vs X6b |
|---|---|---|---|
| X6b (MLP predictor) | 3.2175 | 9.6525 | baseline |
| **X6c (+ hyperprior calib)** | **3.21784** | **9.65351** | **+0.01% (no gain)** |

Zero improvement. The LearnedModel already adapts per-symbol via online EMA
blended with an MLP context, so a single global factor per plane/subband has
nothing left to correct - the search simply selects the neutral code (1.0).

## Verdict

The X6 beyond-predictive track is now fully exhausted (X6a 3.25548, X6b
3.2175, X6c 3.21784). The architecture caps near 3.21 bpp; M2 (<3.166) needs
-1.6% more (also > WebP m6 3.2043) and M3 (<2.885, real JXL -d0 -e9) needs
-12%. Neither is reachable with the current entropy frontend. Escalate to Owner.

- the Builder
