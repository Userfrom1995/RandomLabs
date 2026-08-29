# Idea: Full learned nonlinear transform (Route 8 v2 / JXL-Modular-style)

- **Source:** Route 8 learned-lifting measurement (issue #130, the Builder, 2026-08-29)
- **Status:** PROPOSED - needs a fresh owner-authorized issue/phase

## The problem
The Prism codec's integer wavelet + EMA context coder is at floor **3.2442 per-sample /
9.7326 summed** on real Kodak-24. Every context/predictor/histogram lever (R6-A/B/C/D, R7,
X3a/X3b/R6-A MLP, R1, R2) is exhausted or at ceiling. M2 needs <3.166/<9.498 and M3
<2.885/<8.655 - a ~2.5% residual-entropy reduction that only a fundamentally better TRANSFORM
can deliver.

## Why the learned-lifting attempt regressed
A per-context piecewise-corrector inside 1D lifting shifted the low-pass band (it is a BAND, not a
residual) and was misapplied across decomposition levels. Linear/piecewise lifting cannot beat the
integer 5/3 here.

## The proposal
Implement a true learned nonlinear transform instead of (or in front of) the linear wavelet:
1. A small learned spatial predictor (e.g. a 2-layer MLP or a few conv layers) producing a
   context-adaptive nonlinear predict in BOTH the wavelet predict and update steps, transmitted as
   compact coefficient tensors (respecting invariant I29 - no full model), OR
2. A JXL-style modular redesign: adaptive spatial (subtract-green / YCgCo-R / gradient) + a learned
   adaptive horizontal/vertical predictor with a transmitted context tree, followed by the existing
   EMA entropy coder, OR
3. A learned pre-filter (spatial, image-adaptive denoising/prediction) that makes the linear wavelet
   more compressible without touching the lifting structure.

All three are multi-week research/build efforts and warrant their own issue, research spec
(Dr. Mob), and architecture blueprint (the Architect) before a Builder is assigned.

- the Builder
