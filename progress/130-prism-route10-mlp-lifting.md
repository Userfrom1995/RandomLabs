# Progress: Route 10 - Learned Nonlinear MLP Lifting (issue #130)

- **Branch:** `opencode/issue130-20260830011907`
- **PR:** (opened by workflow) `Refs #130`
- **Precedent:** X6b floor 3.21751 per-sample / 9.65253 summed (full real Kodak-24,
  `bench-x --residual`). R9 (baked tree-quantized EMA) closed the last fixed-context
  variant at +0.218%. The negative ledger is complete across the ENTIRE
  single-transform single-pipeline design space (entropy/context, predictors,
  tokenization, source transform, multi-pass).
- **Status:** COMPLETE (implemented + measured; NEGATIVE result, gates NOT met).
   Route 10 implements the one lever the research named as still untested: a LEARNED
   NONLINEAR transform (not a linear/piecewise lifting *correction* like R8). The
   linear Le Gall 5/3 predict step `odd - (lv+rv)>>1` is replaced by a small integer
   MLP `odd - mlp(lv, rv)` that takes the RAW neighbour values (a continuous,
   full-neighbour function class a 16-bucket LUT cannot express). The update step stays
   linear Le Gall (the predictor is the dominant detail-energy lever).

## Why this is genuinely new (not R8)

- R8 added a **per-context constant offset** on top of the linear base (16 buckets of
  the signed local gradient). It failed (+4.7%) because a constant per coarse bucket
  cannot model "predict toward the larger neighbour on an edge" etc.
- Route 10's MLP takes **lv and rv directly** (raw integers, continuous domain), so it
  can learn a smooth, globally-varying nonlinear prediction. This is the "small neural
  network applied in the transform domain" the R9 closing note identified as the sole
  remaining untested lever.

## Milestone Checklist

### D0: Scaffold + PR  [DONE]
- [x] progress + ideas entry; branch push; PR opened `Refs #130`.

### D1: Trainer + training  [DONE]
- [x] `prism/scripts/train_route10.py`: loads Kodak luma (YCoCgR Y/Co/Cg planes), runs
   full 5-level separable Le Gall lifting, collects (lv, rv, target=odd-(lv+rv)//2)
   pairs at every predict step across all levels/orientations (14.4M pairs), trains a
   2->16->1 ReLU MLP by regression (Adam, MAE).
- [x] Fixed-point (int16, Q=1024) quantisation + integer-sim re-validation:
   linear baseline MAE 7.9603 -> int-MLP MAE 6.1781 (22.39% predict-error energy
   reduction on held-out Kodak). Bake weights into `prism/src/codec/route10_mlp_data.inc`.

### D2: C++ integer MLP lifting  [DONE]
- [x] `WaveletFilter::LearnedMLP = 4` enum + `route10_mlp.h/.cpp` (exact integer replica
   of the numpy fixed-point MLP; byte-exact reversible via I26, validated by unit tests).
- [x] Wired into `lift1d`/`unlift1d`, `filter_to_id`/`id_to_filter` (id 4), CLI
   `--r10-mlp` in `bench-x`, plus `X_FILTER_ID_LEARNED_MLP`. Unit tests added
   (test_x0_wavelet.cpp: X0Route10.MLPLiftReversible, X0Route10.FrameRoundtrip).

### D3: Measurement + gates  [DONE - measured, gates NOT met]
- [x] `prism bench-x --residual --r10-mlp` on full real Kodak-24 (24 images).
  Result: mean per-sample **3.22352**, mean summed **9.67055** bpp/img.
- [x] Authoritative `bench_gate.sh` dual-unit check (CSV
  `2026-08-30-route10-mlp-prism-e0.csv`):
  - M2 (summed<9.498 AND per-sample<3.166): **FAIL** (9.6706 / 3.2235)
  - M3 (summed<8.655 AND per-sample<2.885): **FAIL** (9.6706 / 3.2235)
- [x] Round-trip byte-exact verified by unit tests (X0Route10.FrameRoundtrip,
  X0Route10.MLPLiftReversible) and `frame_wavelet_decode` path.
- [x] Durable CSV (`2026-08-30-route10-mlp-kodak24.csv`) + codec-comparison row
  (both units) added to `results/2026-08-23-kodak24-codec-comparison.md`.
- [x] `Refs #130` retained: gates remain open, so this is NOT a parity win.

### Result & interpretation
The learned nonlinear MLP predict reduces the raw predict-error energy by
**22.39%** (linear MAE 7.9603 -> int-MLP MAE 6.1781 on held-out Kodak) yet the
END-TO-END lossless residual (coefficient predictor + rANS) is **unchanged to
within noise and marginally worse** than X6b (3.22352 vs 3.21751 per-sample).
The entropy backend already models the coefficient structure, so the smoother
integer prediction does not translate into fewer bytes. This is a clean, fully
implemented-and-measured NEGATIVE result: it empirically exhausts the single
remaining untested lever named by the R9 closing note (a learned nonlinear
transform in the predict step). The single-pipeline negative ledger for #130 is
now COMPLETE (entropy/context, predictors, tokenization, source transform,
multi-pass, and finally the learned nonlinear lifting all tested, none reaching
WebP/JXL parity). Remaining parity paths are architectural (multi-pipeline / E-series
endgame), outside the single-transform single-pipeline scope of this route.

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

## Agent log
- 2026-08-30 (scaffold): Oriented. Confirmed numpy installable. R9 floor established
  3.21751. Designed Route 10 learned nonlinear MLP lifting. Scaffold + ideas/ + progress/.
- 2026-08-30 (build/continue): Implemented D1-D3 end to end.
  - D1: `prism/scripts/train_route10.py` (numpy) collects 14.4M (lv,rv,target) pairs
    across 5 levels/orientations on real Kodak YCoCgR planes, trains 2->16->1 ReLU MLP
    (Adam, MAE), bakes int16 fixed-point (Q=1024) weights to
    `prism/src/codec/route10_mlp_data.inc`. Integer-sim: linear MAE 7.9603 ->
    int-MLP MAE 6.1781 (22.39% predict-error energy reduction).
  - D2: `route10_mlp.h/.cpp` exact integer replica of the numpy MLP (floor-shift
    semantics, byte-exact reversible via I26); `WaveletFilter::LearnedMLP = 4` wired
    into `lift1d`/`unlift1d` + `filter_to_id`/`id_to_filter`; CLI `--r10-mlp` in bench-x.
    Unit tests X0Route10.MLPLiftReversible + X0Route10.FrameRoundtrip added/passing.
  - D3: full Kodak-24 `bench-x --residual --r10-mlp` -> per-sample 3.22352, summed
    9.67055. `bench_gate.sh` M2/M3 both FAIL. Codec-comparison row added. Negative
    result: single-pipeline negative ledger for #130 now COMPLETE. `Refs #130` retained.
