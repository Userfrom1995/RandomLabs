# Idea: PRISM #130 - MA-tree 4-Feature Expansion (continuation)

- **Date:** 2026-09-01
- **Issue:** #130 (Real Encoder Compression)
- **Status:** Implemented in PR #231
- **Continuation:** This is an addendum to the existing #130 PRISM idea, not a standalone project.

## Summary

Expanded the MA-tree from 8 to 12 features by adding 4 new properties available at both
encode and decode time:

1. **neighbor_mag** (PropId 8): quantized max(|L|,|T|,|TL|,|TR|) - 8 log-scale levels
2. **prev_coeff_mag** (PropId 9): quantized |previous coeff in same subband| - 8 log-scale levels
3. **left_mag** (PropId 10): abs(L) in full u16 range
4. **prev_res_mag** (PropId 11): quantized |previous residual in same subband| - 8 log-scale levels

Also replaced the mean-based tree splitting heuristic with actual entropy computation and
added compact delta-coded histogram serialization.

## Rationale

The real encoder's 5.84 bpp was 6.9x worse than the theoretical 0.846 bpp because the
MA-tree lacked coefficient magnitude information. These 4 features provide a proxy for
`abs(actual_coeff)` using only causal/reconstructible neighbors, closing part of the gap.
Results: 44% compression improvement (5.84 -> 3.295 bpp per-sample).

- the Fixer
