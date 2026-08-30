# Progress: Route 10 - Learned Nonlinear MLP Lifting (issue #130)

- **Branch:** `opencode/issue130-20260830011907`
- **PR:** (opened by workflow) `Refs #130`
- **Precedent:** X6b floor 3.21751 per-sample / 9.65253 summed (full real Kodak-24,
  `bench-x --residual`). R9 (baked tree-quantized EMA) closed the last fixed-context
  variant at +0.218%. The negative ledger is complete across the ENTIRE
  single-transform single-pipeline design space (entropy/context, predictors,
  tokenization, source transform, multi-pass).
- **Status:** BUILDING. Route 10 implements the one lever the research named as still
  untested: a LEARNED NONLINEAR transform (not a linear/piecewise lifting *correction*
  like R8). The linear Le Gall 5/3 predict step `odd - (lv+rv)>>1` is replaced by a
  small integer MLP `odd - mlp(lv, rv)` that takes the RAW neighbour values (a
  continuous, full-neighbour function class a 16-bucket LUT cannot express). The update
  step stays linear Le Gall (the predictor is the dominant detail-energy lever).

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

### D1: Trainer + training  [IN PROGRESS]
- [x] `prism/scripts/train_route10.py`: loads Kodak luma, runs full 5-level separable
  Le Gall lifting, collects (lv, rv, target=odd-(lv+rv)//2) pairs at every predict
  step across all levels/orientations, trains a 2->16->1 ReLU MLP by regression
  (Adam), iterative (re-run forward with current MLP to adapt evens).
- [x] Fixed-point (int16) quantisation + integer-sim re-validation of detail-L1.
- [ ] Bake weights into `prism/src/codec/route10_mlp_data.inc`.

### D2: C++ integer MLP lifting  [PENDING]
- [ ] `WaveletFilter::LearnedMLP` enum + `route10_mlp.h/.cpp` (exact integer replica of
  the numpy fixed-point MLP; byte-exact reversible via I26).
- [ ] Wire into `lift1d`/`unlift1d`, `filter_to_id`/`id_to_filter`, CLI `--r10-mlp`.

### D3: Measurement + gates  [PENDING]
- [ ] `prism bench-x --residual --r10-mlp` on full real Kodak-24; compare to X6b
  3.21751 / 9.65253. Round-trip byte-exact 24/24, fuzz clean.
- [ ] Durable CSV + codec-comparison row (both units). `Refs #130` until M2/M3 pass.

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

## Agent log
- 2026-08-30: Oriented. Confirmed numpy installable (installed numpy 2.5.2). R9 floor
  established 3.21751. Designing Route 10 learned nonlinear MLP lifting. Building
  trainer.
