# Blueprint: Route 7 - In-Subband Value Prediction + Adaptive Transform (issue #130)

- **Author:** the Builder (realized from the Architect's design decisions, 2026-08-29)
- **Precedes:** `prism/docs/research-route7-transform-prediction.md` (Dr. Mob) and the
  architect comment on PR #185. The research spec attacks the value-decorrelation axis
  (Axis B); this blueprint realizes it in code.
- **Status:** BUILDING.

## 1. Design decisions (pinned before coding)

- **R7-A** is a value-domain residual path, structurally identical to X6a (lever L1) but
  with a new `InSubbandPredictor` instead of the learned MLP `CoefficientPredictor`.
  The coder bitplane-codes `r = c - c_hat` (value domain); on decode `c_hat` is formed
  in a raster post-pass from already-reconstructed same-subband neighbours, so
  `c = c_hat + r` is byte-exact. Zero side-info (invariant I29).
- **Predictor neighbours:** the standard JPEG-LS / LOCO-I predictor transform uses the
  raster-causal 4-neighbourhood `W=(x-1,y), N=(x,y-1), NW=(x-1,y-1), NE=(x+1,y-1)`, all
  available in raster order (I26 symmetry). Two modes, selected per subband by real coded
  bytes (C3, no energy proxy):
  - `MED` (R7A_PRED=0): `med_predictor(W, N, NW)` - the genuine LOCO-I median edge detector
    (existing `prism::codec::med_predictor`, matches `frame_spatial_payload`).
  - `GRADIENT` (R7A_PRED=1): `W + N - NW` (JXL gradient predictor), clamped to the int32
    range of the reconstructed neighbour sum.
  - Borders mirror/symmetry: out-of-bounds neighbours read 0 (identical encode/decode).
- **R7-B** = per-decomposition-level filter selection via `WaveletLift` with a new
  `WaveletParams::per_level_filter` array. The winner per level is chosen by a greedy C3
  trial-encoding using REAL rANS bytes (I11: not an L1/energy proxy). 2-bit/level tag in
  the header. Default (empty `per_level_filter`) keeps the single `filter` for every level
  so the change is format- and behaviour-compatible with all existing frames.
- **Pinned constants (Addendum 29 / frozen):**
  - `R7A_FLAG = 32` (residual_mode bit 5)
  - `R7B_FLAG = 64` (residual_mode bit 6)
  - `static_assert(R7A_FLAG <= (1 << 6))` and `static_assert(R7B_FLAG <= (1 << 7))`:
    `residual_mode` is `uint8_t`; bit 7 is reserved so the next extension needs a wider
    type. Documented overflow guard.
- **Header additions** (`WaveletHeader`): `sub_r7a_pred` (per-subband predictor mode, 1
  byte each) gated by `R7A_FLAG`; `level_filter` (per-level filter id, 1 byte each) gated
  by `R7B_FLAG`. Overhead well under I29 / 0.02 bpp.

## 2. Module breakdown

- `prism/include/prism/codec/r7_predictor.h` + `prism/src/codec/r7_predictor.cpp`
  - `enum class R7PredictorMode { MED=0, GRADIENT=1 }`
  - `class InSubbandPredictor` with `predict(recon, w, h, x, y, mode)` reading W/N/NW/NE
    from the SAME subband's `recon` buffer (causal; border read 0).
- `prism/include/prism/codec/wavelet.h`
  - `WaveletParams::per_level_filter` + `filter_for_level(int lvl)` helper.
- `prism/src/codec/wavelet.cpp`
  - `forward`/`inverse` use `filter_for_level(lvl)` at each decomposition level (lvl
    1..levels), so a per-level filter assignment is exactly reversible.
- `prism/include/prism/codec/wavelet_container.h`
  - `R7A_FLAG`, `R7B_FLAG`, overflow `static_assert`; `sub_r7a_pred`, `level_filter`
    fields; declaration `frame_wavelet_encode_r7(...)`.
- `prism/src/codec/wavelet_container.cpp`
  - `frame_wavelet_encode_r7`: lift (per-level filter when R7B), build per-subband
    residual `R = c - c_hat` (R7-A in-subband MED/gradient, C3 per-subband mode by real
    bytes), C3 per-subband X6c scale code by real bytes, `coder.encode(R)`; pack header
    with `R7A_FLAG`/`R7B_FLAG`, `sub_r7a_pred`, `level_filter`.
  - `frame_wavelet_decode`: dispatch R7A post-pass (`InSubbandPredictor`) and R7B
    per-level inverse; gate the X5a luma reference OFF whenever R7A_FLAG is set (it is a
    residual frame with no luma context, like X6a).
  - `wavelet_container_encode`/`decode`: serialize `sub_r7a_pred` (R7A_FLAG) and
    `level_filter` (R7B_FLAG).
- `prism/src/cli/main.cpp`: `wavelet-r7` (single-image harness, roundtrip + bpp) and
  `bench-r7` (Kodak-24 dual-unit bench with `--r7b` to compose R7-B; emits the same CSV
  shape as `bench-r6b` for `bench_gate.sh`).
- `prism/tests/unit/test_r7.cpp`: `VB-R7-ROUNDTRIP` (byte-exact across filters/depths/
  sizes/both flags), `VB-R7-SYMMETRY` (in-subband residual reconstructs the true
  coefficient set), `VB-R7-FILTER` (per-level filter round-trips).

## 3. Test matrix (T1-T9)

- T1 frame roundtrip, BD8, 3 ch, all 3 filters, levels 1..5 (R7-A alone).
- T2 frame roundtrip, BD16 + odd sizes 1/2/3/7/33.
- T3 in-subband residual reconstructs true subband coeffs (symmetry proof).
- T4 MED and GRADIENT modes both byte-exact standalone.
- T5 R7-B per-level filter assignment round-trips (random per-level filter vectors).
- T6 R7-A + R7-B composed roundtrip.
- T7 decode(encode(x)) 24/24 on real Kodak planes (fuzz-style, no crash).
- T8 `bench-r7` R7-1 gate on held-out kodim02/07/17/21 (median NET <= -1.5% vs X6b).
- T9 R7-0: zero container bytes for the predictor (R7-A adds no model bytes).

## 4. Gate cascade (from research spec, honest)

- R7-0: decode(encode(x)) byte-exact 24/24; zero container bytes.
- R7-1: R7-A alone vs X6b on held-out kodim02/07/17/21, median NET <= -1.5%. (binding)
- R7-2: R7-B adds >= -0.5% over R7-1; overhead <= 0.001 bpp.
- R7-3: compose -> M2 (summed <= 9.498 AND per-sample <= 3.166).
- R7-4: stack with R6-D -> M3 (summed <= 8.655 AND per-sample <= 2.885).
- R7-1 FAIL -> STOP-AND-REPORT (value-decorrelation axis exhausted); escalate Route 8 only
  on owner authorization. No re-tuning to force a pass.

- the Builder
