# Progress: Prism #130 - Two-Pass JXL-Modular Encoder (issue #130)

- **Branch:** `opencode/issue130-two-pass-jxl-modular`
- **Status:** COMPLETE (measured NEGATIVE - two-pass oracle features hurt; ceiling confirmed at 3.29 bpp)
- **Date:** 2026-09-01 (Builder run, `/oc continue` trigger)
- **Precedent:** Real JXL-modular encoder at 3.291 bpp (PR #233). Theoretical oracle at 3.161 bpp (PR #224). Gap is 4.0%, from `res_diff` feature: real uses `abs(predicted)`, oracle uses `abs(actual_coeff)`.

## Binding gates
- M2: summed < 9.498 AND per-sample < 3.166
- M3: summed < 8.655 AND per-sample < 2.885

## This run

### Experiment 1: Two-pass with oracle features for tree building
- Built MA-tree using8f features (`res_diff = abs(actual_coeff)`), evaluated on 7f features
- **Result: 3.423 bpp - WORSE than single-pass (3.29 bpp) by +4.0%**
- Root cause: tree splits optimized for 8f feature distributions produce suboptimal clustering when evaluated on 7f features. The `res_diff` split thresholds are at different scales.
- **Conclusion: using oracle information for tree building HURTS when the evaluation features differ**

### Experiment 2: Two-pass with 7f features (same as single-pass)
- Rebuilt two-pass to use7f features for both tree building and evaluation
- **Result: 3.29 bpp - IDENTICAL to single-pass** (as expected)
- Confirmed: two-pass architecture with same features gives same result

### Experiment 3: res_diff clamping to 255
- Changed `build_sample_feature_7f` to clamp `res_diff` to 255 (matching oracle's range)
- **Result: 3.29 bpp - NO CHANGE** (tree builder's quantile thresholds adapt to any range)
- Confirmed: clamping range is not the source of the gap

## Honest ceiling (re-confirmed)

| Configuration | per-sample bpp | summed bpp | vs M2 | vs M3 |
|---|---|---|---|---|
| Single-pass auto-K (this run) | 3.29 | 9.87 | FAIL (+3.9%) | FAIL (+14.1%) |
| Two-pass oracle features (this run) | 3.423 | 10.27 | FAIL (+8.1%) | FAIL (+18.7%) |
| Theoretical oracle (PR #224) | 3.161 | 9.483 | PASS (barely) | FAIL (+9.6%) |
| M2 gate | < 3.166 | < 9.498 | TARGET | - |
| M3 gate | < 2.885 | < 8.655 | - | TARGET |

## Diagnosis

The entire 4% gap (3.29 vs 3.161) is from the `res_diff` feature quality:
- Oracle: `res_diff = abs(actual_coeff)` - directly represents coefficient magnitude
- Real: `res_diff = abs(predicted)` - noisy proxy for coefficient magnitude
- No decoder-available feature can substitute for `abs(actual_coeff)`

The MLP predictor is at its ceiling (BCE ~0.31). The gap is structural: the decoder cannot know the actual coefficient until it decodes the residual, creating a chicken-and-egg problem. Two-pass cannot help because the decoder still needs decode-time features.

## What was built
1. Two-pass encoder function (`jxl_modular_encode_real_two_pass`) in `jxl_modular.cpp`
2. `--two-pass` CLI flag in `bench-jxl-modular-real`
3. Header declaration in `jxl_modular.h`
4. Updated `build_sample_feature_7f` with 255-clamped `res_diff`

## Roundtrip verification
All 24 Kodak images byte-exact roundtrip verified (single-pass and two-pass paths).

## Escalation

Per builder.md: `{"action":"maintainer"}` - the JXL-modular real encoder has a hard, reproducible ceiling at 3.29 bpp. The theoretical oracle barely passes M2 at 3.161 bpp, and the gap is structural (predictor quality). No two-pass, feature engineering, or tree optimization can close it because the decoder cannot know actual coefficient magnitudes. The only remaining path to M2/M3 is a fundamentally different predictor/transform architecture (neural codec, learned analysis transform, etc.).

- the Builder
