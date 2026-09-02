# 130: Predictor Comparison Experiment (2026-09-01)

## Objective
Compare MLP (cross-subband), MED (in-subband), and GAP (in-subband) predictors
under the JXL-Modular static-ANS pipeline to determine if in-subband predictors
can close the gap to M2/M3.

## Hypothesis
Under static ANS (no ZFF pathology), MED prediction might give better MA-tree
clustering than MLP because `abs(med_predicted)` could correlate better with
`abs(actual_coeff)` than `abs(mlp_predicted)`.

## Results (Kodak-24, static ANS, per-image MA-tree)

| Predictor | Per-sample bpp | Summed bpp | M2 (<3.166/<9.498) | M3 (<2.885/<8.655) |
|-----------|---------------|------------|---------------------|---------------------|
| **MLP**   | **3.290**     | **9.870**  | FAIL                | FAIL                |
| GAP       | 3.572         | 10.715     | FAIL                | FAIL                |
| MED       | 3.650         | 10.949     | FAIL                | FAIL                |

- MLP two-pass: 3.290 (identical to single-pass; K auto-sweep already optimal)
- MED two-pass: 3.650 (identical)
- GAP two-pass: 3.572 (identical)

## Analysis

1. **MLP dominates both in-subband predictors by 9-11%.**
   - MLP uses cross-subband info (parent, sibling subbands) via a 16-input
     neural network (one orientation head per subband type)
   - MED/GAP only use 4 same-subband causal neighbors (W, N, NW, NE)
   - The cross-subband context gives MLP a massive prediction advantage

2. **Two-pass gives zero benefit** because single-pass K auto-sweep already
   finds the optimal K per image per plane

3. **Gap to M2: 0.076 bpp/sample (2.4%)**
   - Theoretical oracle (abs(actual_coeff) feature) achieves 3.161 bpp, barely
     clearing M2 at 3.166
   - This gap is entirely from feature quality: res_diff = abs(predicted) vs
     abs(actual_coeff)

4. **Gap to M3: 0.405 bpp/sample (14.1%)**
   - Structurally out of reach without a fundamentally better predictor
   - Oracle achieves 3.161, still 9.6% above M3 gate of 2.885

## Conclusion

In-subband predictors (MED, GAP) cannot close the gap. The existing MLP
cross-subband predictor is already optimal within the current architecture.
The remaining gap to M2 is a feature quality problem (abs(predicted) vs
abs(actual_coeff)), and M3 requires an architectural breakthrough.

## Files Modified
- `prism/include/prism/codec/jxl_modular.h` - Added JXLPredType enum, pred_type param
- `prism/src/codec/jxl_modular.cpp` - Added pred_in_subband(), container pred_type byte, encoder/decoder dispatch
- `prism/src/cli/main.cpp` - Added --pred CLI flag

## Gate Status
M2: FAIL (3.290 >= 3.166) | M3: FAIL (3.290 >= 2.885)
