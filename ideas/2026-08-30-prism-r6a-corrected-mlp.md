# Prism R6-A Corrected MLP

A wider 15-feature MLP context model for Prism's learned entropy coder, extending
the Route 6 research track with sibling-orientation and parent bitplane lag features.

## What Was Built

A corrected implementation of the R6-A architecture from the research spec
(`prism/docs/research-route6-learned-histogram-fusion.md`, section 2):

- **15->64->32->1 MLP** replacing the previous 13->32->16->1, with wider hidden
  layers to absorb the new features
- **F7: sibling-orientation magnitude** - correlation between LH and HL subbands
  at the same wavelet level, exploiting cross-orientation coefficient similarity
- **F8: parent bitplane lag** - autocorrelation metric measuring how many bitplanes
  the parent coefficient is above the current bitplane, capturing hierarchical
  magnitude structure
- **`build_sibling_map()`** helper for O(1) sibling subband lookup
- Updated normalize lambda, zero-init `learned_ctx_data.inc` placeholder
- Trained on Kodak-24 (14 epochs, BCE=0.312968, blend=0.6)

## Result

**FAILS M2 gate**: effort 2 = 3.37 bpp/sample (requires <3.166, 6.1% above target).
BCE 0.312968 is *worse* than the 13->32->16 baseline (0.312058), indicating the
wider net + new features did not improve the model. Root cause identified by
Reviewer: F7 significance check used the wrong subband's `sig[]` array, making
the feature semantically dead during training. The fix is applied in this PR.

## Why It Matters

This negative result (with the F7 bug fix) provides a clean baseline for
evaluating whether wider MLPs with cross-orientation features can close the 1.6%
gap to M2. The corrected F7 feature may yield the missing lift when retrained.
