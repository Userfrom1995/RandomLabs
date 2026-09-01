# Progress: R6-A Correct Training Harness (issue #130)

- **Branch:** `opencode/issue130-r6a-correct-training`
- **Issue:** #130 (true JXL parity)
- **Status:** complete
- **Goal:** Fix the train-learned harness to match production inference, retrain MLP with real weights, measure M2 gate
- **Binding gates (both units, real corpus, byte-exact):**
  M2 summed < 9.498 AND per-sample < 3.166;
  M3 summed < 8.655 AND per-sample < 2.885.
  Baseline: Prism e7 = 11.026 summed / 3.675 per-sample.

## What was wrong (training/inference asymmetry)

The old `train-learned` CLI (main.cpp:5980) collected samples per-plane independently.
For chroma planes (Co/Cg), `luma_mag` was always nullptr, so `lc_mag`/`lc_sig`
features were always 0 during training. Production path (wavelet_container.cpp:362-375)
passes Y subbands as luma_mag for chroma planes, making these features non-zero at
inference. Training-inference asymmetry confirmed.

## What we fixed (R6-A)

1. **Luma context for chroma**: Process all planes' wavelet subbands first, pass Y
   subbands as `luma_mag` for Co/Cg (matches production inference exactly)
2. **Held-out validation**: kodim02/07/17/21 held out (4/24 images), early stopping
   with patience=3
3. **Input dropout**: 0.1 probability, inverted dropout scaling
4. **Epochs**: 14 -> 40 (default, configurable via --epochs)
5. **Blend sweep**: 0.0-1.0 in 0.1 steps on held-out data, pick best
6. **New CLI flags**: --pseudo, --dropout, --patience

## Training results

- Train samples: 1,349,865 (stride=128, 20 train images)
- Held-out samples: 267,148 (4 images)
- Best held-out BCE: 0.3047 (improved from 0.313 with old trainer)
- Early stopping: epoch 4 (patience=3 triggered)
- Optimal blend: 1.0 (pure MLP, no EMA mixing)

## Gate measurement results (effort 9)

| Run | Per-sample | Summed | M2 gap | Delta |
|-----|-----------|--------|--------|-------|
| Previous e9 (old weights) | 3.3783 | 10.1350 | +6.7% | - |
| New e9 (R6-A weights) | 3.3774 | 10.1323 | +6.7% | -0.001 bpp |

## Conclusion

The training/inference asymmetry fix is a correctness improvement (BCE 0.313 -> 0.305),
but the effect on actual compression quality is negligible (~0.001 bpp at effort 9).
The MLP context model is not the bottleneck. The single-pipeline approach has been
exhaustively measured across 9 programs / 44+ phases and cannot reach M2.

The only measured approach passing M2 is the two-pass JXL-modular route (PR #235),
which achieves 3.1606/9.4819 (M2 PASS at -0.2% gap).

## Milestones completed

- [x] R6-A0: Fix train-learned sample collection (luma context for chroma)
- [x] R6-A0: Add held-out validation with early stopping
- [x] R6-A0: Add input dropout and blend/pseudo sweep
- [x] R6-A0: Train on Kodak-24, verify BCE improvement (0.313 -> 0.305)
- [x] R6-A1: Build with trained weights, measure full Kodak-24 dual-unit M2 gate
- [x] R6-A: Open PR, hand off to Reviewer

## Unit tests

All 7 R6C + R6D tests pass with new weights. bench_gate.sh self-check passes.

- the Builder
