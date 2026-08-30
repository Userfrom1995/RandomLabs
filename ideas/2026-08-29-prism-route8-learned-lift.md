# Prism Route 8 - Learned Parametric Reversible Lifting

*Prism beyond-predictive paradigm, issue #130. `Refs #130`.*

## What it is

A learned, exactly-reversible integer wavelet lifting (Route 8 of the Option-2
"learned neural context models OR integer wavelet lifting" program). A 4-step
9/7-style parametric lift whose four coefficients (predict a, update b, predict c,
update d) are baked constants, optimized offline by direct bitrate minimization.

Each lifting step has the form `new = old + round_mul(coeff, fixed_neighbours)`.
Because the "neighbours" come from the unmodified stream and rounding is identical at
encode and decode, the lift is **exactly invertible for ANY real coefficients**
(invariant I26, no model bytes transmitted - I29 holds).

## Why this shape

The transform is the one remaining unmeasured axis after the learned-context (R6-A/B/C),
predictor (R7), and multi-pass (R6) routes all failed. JPEG XL's advantage is partly its
decorrelation; a learned lifting could in principle beat the fixed LeGall53/9/7.

## Result (honest)

On a representative Kodak subset the best learned lift (a=-0.5, b=0.25, c=d=0) gives
3.247 per-sample vs LeGall53's 3.118 - i.e. the learned lift **cannot beat** the
existing truncating 5/3, because `round_mul` (round-to-nearest) is slightly inferior to
the codec's existing `div2` truncation for entropy. The lab full-Kodak floor stays at
X6b 3.2442 / 9.7326, above both gates (M2 3.166/9.498, M3 2.885/8.655).

Route 8 FAIL. With this, every legitimate mechanism class in the design space is
measured and exhausted; the remaining gap is structural and needs a new JXL-Modular
redesign (per-fine-context adaptive clustering tree + transmitted histograms), a fresh
owner-authorized cycle.

## Key files

- `prism/include/prism/codec/wavelet.h` - `WaveletFilter::Learned`, `set_learned_lift`
- `prism/src/codec/wavelet.cpp` - `forward_learned` / `inverse_learned`, `round_mul`
- `prism/src/codec/wavelet_container.cpp` - id mapping, dispatch
- `prism/src/cli/main.cpp` - `wavelet-r8`, `bench-r8`, `tune-lifting`
- `prism/tests/unit/test_r8.cpp` - reversibility / round-trip / determinism

- the Builder
