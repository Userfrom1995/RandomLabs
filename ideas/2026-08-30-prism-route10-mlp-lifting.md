# Prism Route 10 - Learned Nonlinear MLP Lifting

**What it is:** A learned nonlinear integer wavelet lifting step for the Prism lossless
image codec (issue #130). The linear Le Gall 5/3 *predict* `odd - (lv+rv)>>1` is
replaced by a small integer MLP `odd - mlp(lv, rv)` that consumes the RAW neighbour
values (a continuous, full-neighbour function class). The *update* step stays linear
Le Gall. The MLP is trained offline on Kodak luma and baked as int16 fixed-point
weights; both the encoder and decoder run the identical integer MLP, so the lift stays
EXACTLY reversible (invariant I26, byte-exact `decode(encode(x))`).

**Why it is new (vs Route 8):** R8 added a per-context *constant offset* (16 gradient
buckets) on top of the linear base and failed (+4.7%) because a constant-per-bucket
correction cannot model structure such as "predict toward the larger neighbour on an
edge". Route 10's MLP takes `lv` and `rv` directly, learning a smooth nonlinear
prediction. This is the "small neural network applied in the transform domain" the R9
closing note named as the single remaining untested lever after the entire
single-pipeline negative ledger was exhausted (X6b floor 3.21751 per-sample).

**Training method:** For each Kodak luma plane, run the full 5-level separable lifting
(linear update) and, at every predict step of every level/orientation, collect the pair
`(lv, rv, target = odd - (lv+rv)//2)`. Train a 2->16->1 ReLU MLP by regression (Adam,
MAE) to predict `target` from `(lv, rv)`. Iterate: re-run the forward lift with the
current MLP to refresh the evens, re-collect, retrain (adapts the MLP to the
MLP-based decomposition). Weights are quantised to int16 fixed-point and validated in
an integer-sim mirror of the C++ arithmetic before baking.

**Key files:**
- `prism/scripts/train_route10.py` - offline trainer (numpy).
- `prism/src/codec/route10_mlp.h` / `route10_mlp.cpp` - integer MLP + lifting.
- `prism/src/codec/route10_mlp_data.inc` - baked weights.
- `prism/src/codec/wavelet.cpp` - `WaveletFilter::LearnedMLP` dispatch.

**Status:** complete (implemented + measured on full Kodak-24; NEGATIVE result).
The learned nonlinear MLP predict reduces raw predict-error energy by 22.39% yet
the end-to-end lossless residual is within noise of (marginally worse than) X6b
(3.22352 vs 3.21751 per-sample). M2/M3 gates FAIL (9.6706 >= 9.498/8.655). This
exhausts the last untested single-pipeline lever for #130; `Refs #130` retained.
