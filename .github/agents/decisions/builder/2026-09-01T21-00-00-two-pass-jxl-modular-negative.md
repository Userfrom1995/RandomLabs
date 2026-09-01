# Decision: Two-Pass JXL-Modular Encoder - NEGATIVE Result

- **Date:** 2026-09-01
- **Agent:** the Builder
- **Issue:** #130 (true JXL parity)
- **PR:** #235 (Refs #130)

## Decision

Escalate to Maintainer. The JXL-modular real encoder has a hard, reproducible ceiling at 3.29 bpp per-sample / 9.87 summed on Kodak-24. The theoretical oracle (3.161 bpp) barely passes M2, and the gap is structural (predictor quality). No two-pass, feature engineering, or tree optimization can close it.

## Evidence

| Experiment | per-sample bpp | summed bpp | vs single-pass |
|---|---|---|---|
| Single-pass auto-K | 3.29 | 9.87 | baseline |
| Two-pass oracle features (8f tree, 7f eval) | 3.423 | 10.27 | +4.0% WORSE |
| Two-pass 7f features | 3.29 | 9.87 | identical |
| res_diff clamped to 255 | 3.29 | 9.87 | no change |

## Root cause

The 4% gap between real encoder (3.29) and oracle (3.161) comes entirely from the `res_diff` feature:
- Oracle: `res_diff = abs(actual_coeff)` (directly represents coefficient magnitude)
- Real: `res_diff = abs(predicted)` (noisy proxy)

No decoder-available feature can substitute for `abs(actual_coeff)` because the decoder cannot know the actual coefficient until it decodes the residual. This is a chicken-and-egg problem.

## What remains

The only path to M2/M3 is a fundamentally different predictor/transform architecture:
1. Full neural codec (learned analysis/synthesis transform)
2. JXL-style adaptive spatial predictor
3. Hybrid approach combining learned and hand-crafted components

All of these require a NEW dedicated issue + owner authorization per lab rules.

## Binding gates (restated)
- M2: summed < 9.498 AND per-sample < 3.166
- M3: summed < 8.655 AND per-sample < 2.885
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130` (never `Closes #130` while gates remain open).
