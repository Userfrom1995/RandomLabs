# Obsidian - Architect blueprint R13: recursive self-correcting adaptive predictor (TM-WP) and genuine CDF 5/3 lifting transform (the JPEG XL 8.71 gate)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-20
- **Mode:** `/oc architect` on PR #93 (existing build, iteration over the R0-R11 codec). Companion to `docs/research-r13-architectural-predictor-spec.md` (Dr. Mob, 2026-08-20) and `docs/architect-r12-per-band-weighted-ma-tree-blueprint.md` (proven moot: Squeeze is never selected on photographic Kodak).
- **Action:** `build` (the Builder implements R13-A, re-measures REAL Kodak, then adds R13-B on the corrected substrate).

---

## 0. Executive summary

The `+0.8108` bpp gap to JPEG XL (8.71) versus the codec's 9.5208 bpp is a **structural architectural ceiling of the single-pixel, four-neighbor linear predictor pipeline**, not a context-granularity or tuning deficit. Six independent Builder axes confirmed this exhaustively (the table in section 4 of the research spec). Every one of them kept the predictor `P` a linear function of the four-tuple `(L, T, TL, TR)` (with a static bias): they only varied (a) which coefficients per context, or (b) the entropy context around it. None changed `P`'s functional form.

Two levers actually change `P`'s functional form (or the transform that feeds it):

- **R13-A (PRIMARY, build first): a recursive self-correcting adaptive multi-tap predictor (TM-WP class).** The prediction becomes a history-dependent linear combination of an **extended causal property vector** (`M = 9` or more properties, not just the 4 neighbors), whose coefficients are **recursively updated online via least-mean-squares (LMS) on the residual**. This is the mechanism that lets JPEG XL's modular mode beat LOCO-I by ~1 bpp, and it is a genuine change in functional form, not a per-context retuning of the same 4-tap linear map.
- **R13-B (SECONDARY, additive): a genuine lifting wavelet transform (CDF 5/3).** The current `transforms::squeeze` is a *quincunx subsampling* (it stores raw even/odd samples minus a linear LL interpolation), so its HF bands carry ~as much entropy as the original and the never-expand net correctly rejects it. A real lifting scheme adds an **UPDATE step** that makes the low-pass band a true low-frequency approximation, compacting energy into LL. R13-B is the *correct* substrate for per-band prediction (the moot R12-A idea): now the net will *select* the transform because it actually decorrelates.

**Build order:** R13-A first (target `< 8.71`); if it lands at ~8.8-9.0, add R13-B as a transform path with R13-A applied per-band on LL. Both are strict supersets of the current codec, so the never-expand net plus per-image auto-selection make regression structurally impossible.

**Explicit non-recommendation:** do NOT invest further in context-model refinement (R3-A residual-DIFF context, R11-D combined MA fold, 64-leaf weight context, R12-B MA-tree context). That axis is exhausted. The gate is the predictor functional form and the transform's energy compaction.

---

## 1. Root cause (grounded in the current source)

`predict.rs` defines the entire shipped predictor space as a function of the four neighbors `(L, T, TL, TR)`:

- Fixed bank (ids 0..=16): `P = f(L, T, TL, TR)`, a fixed integer formula.
- R8-A `AdaptiveWeighted` (id 17): `P = (wL*L + wT*T + wTL*TL + wTR*TR) / (wL+wT+wTL+wTR)` with inverse-gradient weights. Still a **linear** map of `(L,T,TL,TR)`.
- R9-B `WeightedTree` (id 18): `P = (w . (L,T,TL,TR,1)) >> shift`, with `(w, shift)` chosen per `weight_context` leaf by a least-squares fit. Still a **4-tap linear** map plus a bias.

`model.rs::analyze` (lines ~321-437) and `analyze_bands` (line ~495) fit exactly one `WeightedTree` table per plane (or per Squeeze band), and the per-image never-expand net rejects the table when it does not lower the summed residual. The entropy backend is the already-verified `H(p)+epsilon` CMARC (R4), so any residual-energy reduction passes through to the bitstream 1:1. The residual floor is therefore set by the **4-tap linear functional form**, not by the coder or by context fineness.

The R11-D / R11-A / 64-leaf / R12-A / R12-B axes each refined the *context granularity* or *coefficient selection* of that 4-tap map. None widened it. The conclusion (proven by six axes, two of them regressions) is robust: to beat 8.71 we must change `P`'s functional form (R13-A) and/or feed it from a decorrelating transform (R13-B).

---

## 2. R13-A: recursive self-correcting adaptive multi-tap predictor (TM-WP class)

### 2.1 The extended causal property vector

Add a compile-time constant `R13_M = 9` properties `p_1..p_M` for each pixel, all computable from already-decoded samples (so the decoder reconstructs them identically):

```
p1 = L        (left,           x-1,  y)
p2 = T        (top,            x,    y-1)
p3 = TL       (top-left,       x-1,  y-1)
p4 = TR       (top-right,      x+1,  y-1)
p5 = L2       (left-left,      x-2,  y)      // longer-range horizontal persistence
p6 = T2       (top-top,        x,    y-2)     // longer-range vertical persistence
p7 = L - TL   (horizontal gradient)
p8 = T - TL   (vertical gradient)
p9 = TL - TR  (diagonal gradient)
```

All nine live in the already-decoded causal cone (rows `<= y`; same row only `x' < x`), so a streaming decoder has them. `R13_M` is a compile-time constant; widening it directly raises the AR order the predictor can realize. A small ring buffer (the prior row's `L2`/`T2`, and the current row's `L`/`L2` history) supplies `p5`/`p6` without re-reading the plane.

### 2.2 Prediction

Carry a per-context weight vector `w_cid = (w_1..w_M, bias)` in `i32`. The prediction:

```
acc  = bias + sum_{m=1..M} w_m * p_m
pred = (acc + (1 << (SHIFT-1))) >> SHIFT      // deterministic rounding, fixed SHIFT
```

`SHIFT` is a fixed global right-shift (start at 10) so stored weights live near unity scale and the dot product stays in `i32`. The prediction is clamped to the plane range by `predict_clamped`, exactly as today.

### 2.3 Online LMS update (the functional-form change)

After each pixel, update the per-context weights from the just-observed residual `r = v - pred`:

```
for m in 1..M:
    w_m  += clamp_signed_i32( (r * p_m) >> GAIN , WMIN, WMAX )
bias    += clamp_signed_i32( (r * SCALE_B) >> GAIN , BMIN, BMAX )
```

`GAIN` is a fixed right-shift learning rate (start at the existing `M3_WP_GAIN = 13`). `WMIN/WMAX` reuse `WEIGHT_MIN..=WEIGHT_MAX` (`-48..48`) and `BMIN/BMAX` bound the bias so no direction diverges; the product `r * p_m` is computed in `i64` before the `>>`, then clamped to `i32`. This is the classic sign-sign LMS / delta rule on `0.5 r^2`; it drives `w` toward the local least-squares optimum of the *held-out* stream, tracking local structure (edges, gradients, texture) as the scan proceeds.

### 2.4 Base-weight initialization (reuse R9-B machinery)

Initialize `w_cid` per context from a least-squares fit over the analysis pass, generalizing `solve_weighted_tree` from the 4-tuple `(L,T,TL,TR,1)` to the `(M+1)`-tuple `(p_1..p_M, 1)`. The analysis pass accumulates the `(M+1)x(M+1)` normal equations and RHS per `weight_context` leaf (reusing the existing `weight_context` partition so the per-plane table stays `WC_LEAVES * (M+1)` small integers, O(1) model bytes), solves with the existing ridge-Gauss-Jordan routine (mirror `solve_weighted_tree` at predict.rs:373, generalized to size `M+1`), and signals the base weights exactly like R9-B (`weighted_wc_table`, `WC_LEAVES` leaves).

This makes R13-A a **strict superset**: with zero online updates (or if the per-image net finds adaptation unhelpful) it reduces to R9-B; if R9-B is not selected per context it reduces to GAP/med. No model-level regression is possible, and the per-image never-expand auto-selection rejects it per image if it ever expands.

### 2.5 Bit-exact lockstep proof (the correction of the M3-B bug)

The previous `OBSIDIAN_M3_WP` seam (encoder.rs:1309-1318, decoder.rs:321-330) broke the never-expand invariant because it ran its online correction **only when `p == Weighted`**: when the map chose `WeightedTree` (id 18) for some contexts, those fell back to the static tree and the two sides diverged on the `m3_wp_*` tests. R13-A fixes this by making adaptation part of the **predictor's own defined behavior**, keyed per context `cid`, independent of which `PredictorId` the map selects elsewhere.

**Lemma (lockstep).** At pixel `i`, encoder and decoder hold identical `(w_cid[i], p_cid[i])`.
- *Base:* `w_cid[0]` is read from the signaled model (byte-identical both sides); `p_cid[0]` is a pure function of the already-decoded border neighborhood (identical both sides by induction from earlier pixels).
- *Step:* both compute the same `pred` (pure function of identical `(w, p)`), hence the same `r = v - pred` (the decoder's decoded `v` equals the original `v` under lossless round-trip). Both apply the identical LMS update to the identical `(r, p)`, so `w_cid[i+1]` is identical. The update depends **only** on `(r, p)` of the *same* context; it does not read or mutate any other context's weights, so selecting R13-A for some contexts and GAP for others cannot desynchronize anything. QED.

Therefore R13-A needs **no online signaled bytes** and **no global seam**: the decoder reconstructs the weight trajectory from the residual stream alone, by induction. (The base weights are the only signaled state, exactly as R9-B.) Remove the `OBSIDIAN_M3_WP` seam and its two tests; replace them with the R13-A lockstep tests of section 5.

### 2.6 Integration points (the Builder's contract)

- `predict.rs`:
  - Add `PredictorId::AdaptiveRecursive = 19` (after `WeightedTree`), bump `PREDICTOR_COUNT` to 20, extend `from_u8`/`to_u8`/`name`/`predict`.
  - Add `pub const R13_M: usize = 9;` and `pub const R13_SHIFT: u32 = 10;` `pub const R13_SCALED_B: i32 = 1;` (the bias learning scale `SCALE_B`).
  - Add `pub fn r13_properties(n: &Neighbors, plane: &[i16], x: usize, y: usize, w: usize, h: usize, ring: &R13Ring) -> [i32; R13_M]` computing `p1..p9` (border-safe: `L2`/`T2` use the same clamp rules as `neighbors`).
  - Add `pub fn predict_recursive(w: &[i32; R13_M+1], props: &[i32; R13_M], range: PlaneRange) -> i32` (dot product + bias + fixed shift + clamp).
  - Add `pub fn adapt_recursive(w: &mut [i32; R13_M+1], r: i32, props: &[i32; R13_M])` (in-place LMS step with the `WMIN/WMAX/BMIN/BMAX` clamps and the `GAIN` shift).
  - Define `pub type R13Leaf = [i16; R13_M + 1];` as the signaled per-leaf base weight tuple (replacing `WLeaf` for this predictor, same `WC_LEAVES` count), plus a generalized `solve_r13_least_squares(s: &[[i64; R13_M+1]; R13_M+1], b: &[i64; R13_M+1]) -> Option<R13Leaf>` mirroring `solve_weighted_tree` generalized to size `R13_M+1`.
- `model.rs`:
  - Add `weighted_r13_table: Option<Vec<Option<Vec<R13Leaf>>>>` to `ModelConfig` (parallel to `weighted_wc_table`), signaled like R9-B (only when `AdaptiveRecursive` is a candidate and used per plane).
  - In `analyze`/`analyze_bands`, accumulate the `(M+1)x(M+1)` normal equations per `weight_context` leaf over `(p_1..p_M, 1)` and `v*(p_1..p_M,1)`, solve with `solve_r13_least_squares`, store the base `R13Leaf` per leaf (`WC_LEAVES * (R13_M+1)` `i16`). Keep the `WC_LEAVES` partition so the table size class is unchanged.
  - Add `predictor_for(cid)` returns `AdaptiveRecursive`; expose `r13_leaf_for(plane, cid)` (parallel to `weighted_tree_for`).
  - Extend `MODEL_SIZE_FRACTION` accounting to include the `R13Leaf` table (it is the same O(1) byte class as `WeightedTree`).
- `encoder.rs` / `decoder.rs`:
  - Maintain a `Vec<[i32; R13_M+1]>` `wrstate` per plane, one entry per reduced context `cid` (mirroring the existing `wp[cid]` allocation that the M3 seam used), seeded from `r13_leaf_for(plane, cid)` (fallback: the neutral `R13Leaf` = the L+T average extended to `M+1` terms, i.e. `w_1=w_2=8<<(SHIFT-4)`, `bias=0`, rest `0`).
  - On each coded pixel: look up `wrstate[cid]`, compute `props = r13_properties(...)`, `pred = predict_recursive(&wrstate[cid], &props, range)`, emit/read `zigzag(r)`; then `adapt_recursive(&mut wrstate[cid], r, &props)`. Both sides do this **unconditionally whenever the map selects `AdaptiveRecursive` for that `cid`** (replacing the `m3_wp && matches!(p, Weighted)` condition).
  - Remove the `OBSIDIAN_M3_WP` env seam and the `wp[cid].adapt_online` calls; keep `Weighted` (id 7) and `WeightedTree` (id 18) as-is for legacy/other contexts.
  - The never-expand net and per-image CMARC/MA auto-selection are unchanged and remain the regression guard.

### 2.7 Complexity

- Time: `O(N * M)` per plane (`M ~ 9-12`), a handful of integer ops per pixel, dominated by the existing rANS cost. No change to throughput class.
- Space: per-context weight vector, `O(reduced_contexts * (M+1) * 4 bytes)` per plane (e.g. `256 * 10 * 4 = 10 KiB`), inside the existing budget.
- Model bytes: `WC_LEAVES * (M+1) * 2` per plane (~`15 * 10 * 2 = 300 bytes`), the same O(1) cost class as R9-B, covered by `MODEL_SIZE_FRACTION`.

### 2.8 Honest expected gain and risk

JPEG XL's adaptive multi-tap predictor is the dominant reason it beats LOCO-I by ~1 bpp on Kodak; R13-A replicates that mechanism (wider AR order + online self-correction). Expected: a substantial fraction of the +0.81 gap removed, **target `< 8.71`** with reasonable `GAIN`/`SHIFT`/property tuning. Risk: a poorly tuned gain schedule could make adaptation neutral, but base-init from R9-B guarantees no worse than 9.5208 and the net rejects it per image. Report the real-Kodak number honestly at each tuning step.

---

## 3. R13-B: genuine lifting wavelet transform (CDF 5/3)

### 3.1 Why the current `squeeze` fails

`transforms::squeeze` (transforms.rs:74) splits a plane into even/odd quadrants, then predicts each HF band from the LL band with a **fixed linear** interpolator (`(LL_a + LL_b) >> 1` and `>> 2`), storing the raw HF residual. For photographic Kodak the HF bands still carry ~as much entropy as the original, so the never-expand net correctly rejects Squeeze at every level (Builder measured forced Squeeze at 12.62 vs 10.12 bpp no-squeeze). The transform does **not** compact energy; it only rearranges samples. This also made the R12-A per-band decorrelation inert: there was no transform to decorate.

### 3.2 CDF 5/3 lifting (JPEG 2000 lossless wavelet)

Add `cdf53_lift_one_d` / `cdf53_unlift_one_d` (1-D) and separable 2-D `cdf53_lift(plane, w, h, levels)` / `cdf53_unlift(bands, w, h, levels)`. Integer, invertible, floor rounding:

```
// 1-D over samples x[0..n]
split:  even[i] = x[2i],          odd[i] = x[2i+1]
PREDICT (high-pass):
    d[i] = odd[i] - floor((even[i] + even[i+1]) / 2)
UPDATE (low-pass):
    s[i] = even[i] + floor((d[i-1] + d[i]) / 4)
// outputs: low-pass s[0..n/2], high-pass d[0..n/2]
```

Apply separably: lift every row, then every column, to get LL / HL / LH / HH; recurse on LL. The inverse (`UNPREDICT`, `UNSPLIT`) is exact integer. This is the standard lossless CDF 5/3; it genuinely compacts energy because smooth regions produce near-zero `d` coefficients and edges produce sparse, localized `d`.

### 3.3 Border handling for raster lockstep

The lift reads neighbors at index `-1` and `n` (the half-sample boundaries). Use symmetric extension / clamp: `even[-1] := even[0]`, `d[-1] := 0` (or clamp to `d[0]`), and the last odd/even use the in-bounds neighbor. The encoder and decoder use the **identical** extension rule, so the bijection inverts exactly. Because the transform is global over the plane (not causal per pixel), it runs as a **pre-pass** over the whole plane, exactly like the current `squeeze` (which is already a pre-pass). Memory: `O(width)` for the row lift, plus the full set of band buffers already allocated by the banded coder. Reuse `transforms::squeeze_band_layout` geometry: the CDF 5/3 produces the same 4-band-per-level layout, so the existing banded coder and `analyze_bands` path apply unchanged; only the band *content* differs (true low/high pass instead of raw subsampled residuals).

### 3.4 Per-band R13-A (the corrected R12-A)

With R13-B, the LL band is smooth (low-frequency) and the HF bands are small residuals. Apply **R13-A per band**: the LL band gets the full multi-tap adaptive predictor; the HF bands get a cheap fixed predictor (`GapLite` id 6 or `Gradient2` id 10) because their residuals are already near-zero-mean. This is the idea R12-A tried, but now it sits on a transform that *actually* decorrelates, so the never-expand net will **select** it (R12-A was inert only because the underlying Squeeze was inert). Energy compaction (R13-B) + adaptive per-band prediction (R13-A) is the combination that closes the gap.

### 3.5 Complexity and honest risk

- Time `O(N)` pre-pass (two separable lifts per level), same order as `squeeze`. Space `O(width)` + existing band buffers. No throughput-class change.
- Risk / honesty: JPEG 2000 (CDF 5/3) on Kodak is typically *slightly worse* than JPEG XL, so **R13-B alone will not clear 8.71** (expected ~9.0-9.3). It is a *complement* to R13-A, not a replacement. The strongest path is **R13-B (energy compaction) feeding R13-A (adaptive per-band prediction on LL)**. Do not expect R13-B by itself to hit the gate.

---

## 4. Explicitly out of scope (do not re-litigate)

The following six independent Builder axes all failed to reduce the real-Kodak mean below 9.5208 bpp, confirming the bottleneck is the predictor functional form / transform, not the entropy context. The Builder must NOT spend effort on them for the JXL gate:

| Axis | Result |
|---|---|
| R11-D `combined_ma_context` (gradient+residual MA fold, gated) | wash (never-expand net disabled it on every Kodak image) |
| R11-A cross-band `wLL` in-loop predictor | wash + 45x slowdown (reverted) |
| 64-leaf `weight_context` (4-tier), attempt 1 (empty bins) | +0.0054 regression |
| 64-leaf `weight_context`, attempt 2 (populated bins) | identical +0.0054 regression (per-leaf sample starvation) |
| R12-A per-band decorrelation | non-regressive but inert (Squeeze never selected on photographic Kodak) |
| R12-B MA-tree context | Squeeze-gated, equally insufficient on its own |

---

## 5. Build order and test matrix

### 5.1 Build order

1. **R13-A first, in isolation.** Implement `PredictorId::AdaptiveRecursive` (id 19) with `R13_M = 9` properties, LMS update with `GAIN = M3_WP_GAIN` (start), base weights from a generalized `solve_weighted_tree` over the `(M+1)` system, signaled like R9-B. Remove the `OBSIDIAN_M3_WP` seam (replace its two tests with the new lockstep tests). Re-measure REAL Kodak (`run_kodak.sh --effort 4`); record `benchmarks/results/2026-08-20-r13a-recursive-adaptive.csv`. **Target: `< 8.71` (JPEG XL).**
2. **If R13-A lands ~8.8-9.0, add R13-B.** Implement CDF 5/3 lifting in `transforms.rs` (reusing `squeeze_band_layout` geometry), then per-band R13-A on LL (the corrected R12-A). Re-measure; record `benchmarks/results/2026-08-20-r13b-lifting.csv`.
3. Keep all seams / the never-expand net / per-image auto-selection ON as the regression guard. Report the real-Kodak number honestly at each stage; a partial win is a measured milestone, not a failure.

### 5.2 Test matrix (Builder)

- `r13_adaptive_recursive_lockstep`: synthetic gradient + edge + noise planes; capture the encoder's and decoder's per-context weight vectors and `assert_eq!` the sequences, and assert the round-trip is bit-exact.
- `r13_adaptive_recursive_beats_r9b`: on a gradient+edge image, the recursive predictor's coded bpp is `<=` the R9-B `WeightedTree` bpp (strict-superset contract).
- `r13_lifting_inverts`: `cdf53_unlift(cdf53_lift(p), levels) == p` for varied sizes/levels (mirrors the existing `squeeze_inverts_various_sizes` test, extended to the UPDATE step).
- `r13_no_kodak_regression`: 24-image Kodak mean `<= 9.5208` when R13-A is off (guaranteed by superset) and a recorded measurement when on.
- Real-Kodak gate: PNG 13.05, WebP 9.61, AND JPEG XL 8.71 all beaten bit-exactly before any merge (owner override). If R13-A alone beats 8.71 on REAL Kodak, the gate is MET and the merge may proceed; otherwise continue to R13-B, then loop via `continue` until all three clear.

---

## 6. Module breakdown (files, functions, contracts)

| File | Add / change | Contract |
|---|---|---|
| `predict.rs` | `PredictorId::AdaptiveRecursive = 19`; `R13_M`, `R13_SHIFT`, `R13_SCALED_B`; `R13Leaf`/`[i32; R13_M+1]` types; `r13_properties`, `predict_recursive`, `adapt_recursive`, `solve_r13_least_squares` | Deterministic given `(n, plane, ring, base weights)`; lockstep by induction; no signaled online bytes. |
| `model.rs` | `weighted_r13_table` field; accumulate `(M+1)x(M+1)` normal eqns per `weight_context` leaf in `analyze`/`analyze_bands`; `r13_leaf_for(plane, cid)`; extend `MODEL_SIZE_FRACTION` accounting | Table size `WC_LEAVES*(M+1)*2` bytes/plane; signaled only when `AdaptiveRecursive` is used; `None` when unused. |
| `encoder.rs` | `wrstate[cid]` per context; unconditional `predict_recursive` + `adapt_recursive` when map selects `AdaptiveRecursive`; remove `OBSIDIAN_M3_WP` seam | Mirror decoder exactly; never-expand net compares R13-A candidate against best non-R13 backend and keeps the smaller. |
| `decoder.rs` | Symmetric to encoder: `wrstate[cid]`; unconditional `predict_recursive` + `adapt_recursive` on the same `cid` | Identical trajectory by induction. |
| `transforms.rs` | `cdf53_lift_one_d`/`cdf53_unlift_one_d`, `cdf53_lift`/`cdf53_unlift` (separable, levels); reuse `squeeze_band_layout` geometry | Exact integer invertibility with clamp border rule shared by both sides. |
| `benchmarks/measure_kodak.sh` / `run_kodak.sh` | Add R13-A / R13-B measurement rows | Real Kodak effort 4, recorded CSV. |

---

## 7. Gate map (owner override)

| Gate | Target | Status before R13 | Path to clear |
|---|---|---|---|
| PNG (optipng) | 13.05 bpp | MET (9.5208) | unchanged |
| WebP lossless | 9.61 bpp | MET (9.5208) | unchanged |
| JPEG XL modular | 8.71 bpp | NOT MET (+0.8108) | **R13-A** (then R13-B if needed) |

No merge until the default codec beats all three bit-exactly and reproducibly on the real Kodak set per owner override #2. Issue #68 stays open by standing directive.

- the Architect
