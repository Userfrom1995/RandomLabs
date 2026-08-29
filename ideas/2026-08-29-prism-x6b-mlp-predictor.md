# Prism X6b - MLP wavelet coefficient predictor (Route 4 / beyond-predictive)

**Date:** 2026-08-29 | **Author:** the Builder | **Issue:** #130 (true JXL parity)

## What it is

X6b replaces the X6a *linear* per-orientation coefficient predictor with a small
**per-orientation multilayer perceptron**, exercised on the already-shipped
residual coding path (`frame_wavelet_encode_residual`): it codes
`r = c - c_hat` instead of `c`, where `c_hat` is a baked MLP over a causal window
of already-reconstructed neighbours.

The predictor removes *source entropy* (the structural gap the X2 entropy
diagnostic located: the bitplane rANS is entropy-near-optimal given its context,
so the remaining bits live in the coefficient field itself). No predictor state
is transmitted (invariant I29) and the round trip stays byte-exact.

## Design

- **Model:** 4 independent MLPs, one per subband orientation (LL/HL/LH/HH).
  Shape `16 input features -> 32 ReLU hidden -> 1 linear output` (`c_hat`).
- **Features (16):** JPEG-LS median edge term, the 3x3 same-subband causal
  neighbourhood (L, U, UL, UR), parent and two sibling orientations, their
  magnitudes, the U-L gradient, and the subband level. Normalised by /64.
- **Training (`prism train-predictor`):** collects (window, c) samples on the real
  Kodak-24 transform coefficients, then trains each orientation's MLP with Adam to
  minimise the residual **L1 norm** - a tight proxy for the Laplacian-optimal
  bitplane codelength. A smooth pseudo-Huber gradient (`r/sqrt(r^2+1)`, correctly
  signed `-r/...`) keeps training stable (a first attempt with a constant-magnitude
  L1 sign gradient diverged; the gradient must point toward the target).

## Results (real Kodak-24, byte-exact 24/24)

| Method | per-sample bpp | summed bpp/img | vs X6a |
|---|---|---|---|
| Prism v1 e7 | 3.3737 | 10.1210 | - |
| Prism X3a (learned-ctx only) | 3.2477 | 9.743 | - |
| Prism X6a (linear predictor) | 3.25548 | - | baseline |
| **Prism X6b (MLP predictor)** | **3.2175** | **9.6525** | **-1.17%** |

X6b is the best Prism result to date (-0.81% over the X3b+X5a merged rate of
3.24386). On the freshly-measured corpus it sits ~0.4% per-sample above real WebP
lossless m6 (3.2043) - essentially WebP parity - and 12.1% above real JPEG XL
-d0 -e9 (2.8700).

## Honest status / next lever

Variance explained reached 0.745 (up from X6a's ~0.72) but the residual path only
beats the source entropy above ~0.85 variance explained, because it still pays a
significance+sign bit for every coefficient that was exactly zero in `c`. So M2
(<3.166 / <9.498) and M3 (<2.885 / <8.655) are **not met** yet. The remaining levers
(stacking with the X3b learned-ctx parent fix, PR #167, and the X6c learned
hyperprior side-stream) remain open; this run yields `continue`.

- the Builder
