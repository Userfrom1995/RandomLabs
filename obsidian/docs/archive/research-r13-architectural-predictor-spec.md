# Obsidian - Researcher specification R13: recursive adaptive multi-tap predictor and genuine lifting transform (the JPEG XL gate)

- **Issue:** #68
- **Author:** Dr. Mob (the Researcher)
- **Date:** 2026-08-20
- **Mode:** `/oc research` triggered by the Maintainer after six Builder tuning axes (R11-D combined MA context, R11-A cross-band `wLL`, the 64-leaf weight context twice, R12-A per-band decorrelation, and the CMARC backend) all failed to move the real-Kodak mean below 9.5208 bpp. JPEG XL 8.71 is NOT MET (+0.8108 bpp). The gzip/png 13.05 and WebP 9.61 gates are MET.
- **Companion docs:** `docs/architect-r12-per-band-weighted-ma-tree-blueprint.md` (proven moot: Squeeze is never selected), `docs/architect-r9-spatial-lz-weighted-predictor.md` (R9-B WeightedTree, the current best predictor), `docs/architect-r8-adaptive-weighted-predictor-blueprint.md`, `progress/68-obsidian-lossless-image-codec.md`, and the Builder escalation `docs/decisions/builder/2026-08-20-deepen-weighted-predictor-reverted-structural-ceiling.md`.
- **Handoff:** this is the algorithmic blueprint for the Architect. It does NOT contain production code; the Architect turns it into a build plan and the Builder implements it. Decision: `{"action":"architect"}`.

---

## 0. Executive summary and the decision

The +0.8108 bpp gap to JPEG XL (8.71) is a **structural architectural ceiling of the single-pixel, four-neighbor linear predictor pipeline**, not a context-granularity or tuning deficit. Six independent Builder axes confirmed this (the table in section 4). Every axis kept the predictor `P` a **linear function of the four-tuple `(L, T, TL, TR)`** (with a static bias); they only changed (a) which coefficients per context, or (b) the entropy context around it. None changed `P`'s functional form.

Two levers actually change `P`'s functional form (or the transform that feeds it). This spec defines both rigorously:

- **R13-A (PRIMARY, recommended first): a recursive self-correcting adaptive multi-tap predictor (TM-WP class).** The prediction becomes a history-dependent linear combination of an **extended causal property vector** (more than the 4 neighbors), whose coefficients are **recursively updated online via least-mean-squares (LMS) on the residual**. This is exactly the mechanism that makes JPEG XL's modular mode beat LOCO-I by ~1 bpp, and it is a genuine change in functional form, not a per-context tuning of the same 4-tap linear map.
- **R13-B (SECONDARY, additive): a genuine lifting wavelet transform (CDF 5/3).** The current `transforms::squeeze` is a *quincunx subsampling* (it stores raw even/odd samples minus a linear LL interpolation), so its HF bands carry ~as much entropy as the original and the never-expand net correctly rejects it. A real lifting scheme adds an **UPDATE step** that makes the low-pass band a true low-frequency approximation, compacting energy into LL. R13-B is the *correct* substrate for per-band decorrelation (the moot R12-A idea): now the net will *select* Squeeze because the transform actually decorrelates.

**Recommended build order:** R13-A first (target `< 8.71`); if it lands at ~8.8-9.0, add R13-B as a transform path with R13-A applied per-band on the LL band. Both are strict supersets of the current codec, so the never-expand net plus per-image auto-selection make regression structurally impossible.

**Explicit non-recommendation:** do NOT invest further in context-model refinement (R3-A residual-DIFF context, R11-D combined MA fold, 64-leaf weight context, R12-B MA-tree context). That axis is exhausted (six axes, two regressions). The gate is the predictor functional form and the transform's energy compaction, addressed only by R13-A and R13-B.

---

## 1. Formal model of the residual floor

Let the coded plane be `v[i]` for `i = 0..N` in raster order. The codec emits the residual `r[i] = v[i] - P(n[i])`, where `n[i]` is the causal neighborhood and `P` is the predictor. The per-pixel codelength is approximately the conditional entropy `H(r[i] | n[i])`, and the bitrate is `R = (1/N) * sum_i H(r[i] | n[i])` (the CMARC backend is already verified at `H(p)+epsilon`, so the coder adds no slack: any residual-energy reduction passes through to the bitstream 1:1).

**Current `P` (all shipped variants):**
- Fixed bank (Left, Top, TL, TR, Avg, Med, GAP-lite `id 6`, `id 8..16`): `P = f(L, T, TL, TR)`, a fixed integer formula.
- R8-A `AdaptiveWeighted` (`id 17`): `P = (wL*L + wT*T + wTL*TL + wTR*TR) / (wL+wT+wTL+wTR)` with inverse-gradient weights. Still a **linear** map of `(L,T,TL,TR)`.
- R9-B `WeightedTree` (`id 18`): `P = (w . (L,T,TL,TR,1)) >> shift`, with `(w, shift)` chosen per `weight_context` leaf by a least-squares fit on the analysis pass. Still a **4-tap linear** map, just with locally (per-leaf) optimized coefficients and a bias term.

So the entire shipped codec computes `P` as a 4-tap (or 4-tap-plus-bias) **linear** predictor. Natural images are well described as 2D **autoregressive (AR) processes of order > 1**: `v[i] ≈ sum_k a_k * v[i - k]` over a *wider* causal neighborhood that includes second-order gradients, curvature, and longer-range horizontal/vertical persistence. A 4-tap model leaves the higher-order AR structure in the residual `r`.

**Quantification of the ceiling.** On the committed 24-image Kodak set (effort 4), the optimal 4-tap linear predictor residual entropy is ~9.5208 bpp. JPEG XL's modular mode reaches 8.71 bpp on the same corpus. The ~0.81 bpp (8.5%) difference is the higher-order AR structure that a 4-tap linear `P` cannot capture. Because the backend is already `H(p)+epsilon`, and because six axes that only re-partitioned the 4-tap coefficient space / entropy context all washed or regressed, the residual floor is set by the **linear 4-tap functional form itself**. Closing the gap requires `P` to become (a) **multi-tap** (wider neighborhood) and (b) **history-dependent / adaptive** (coefficients that track local statistics), i.e. R13-A; and/or the input to `P` to come from a **decorrelating transform** that compacts energy, i.e. R13-B.

---

## 2. R13-A: recursive self-correcting adaptive multi-tap predictor (TM-WP class)

This is the primary lever. It generalizes the existing (and brittle) `OBSIDIAN_M3_WP` seam into a **first-class predictor** whose online state evolution is identical on both sides regardless of which predictor the map selects per context.

### 2.1 The extended causal property vector

Define `M` properties `p_1..p_M` for the current pixel, all computable from already-decoded samples (so the decoder reconstructs them identically). A concrete, JXL-aligned choice with `M = 9`:

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

All nine are within the already-decoded causal cone (rows `<= y`, and for `y` the same row only `x'` `< x`), so a streaming decoder has them. `M` is a compile-time constant (9, or up to 12 by adding `T-TL`, `L-T` curvature and the previous residual `r_prev` from a small ring buffer). Widening `M` directly increases the AR order the predictor can realize.

### 2.2 Prediction

Carry a per-context weight vector `w_cid = (w_1..w_M, bias)` in `i32`. The prediction:

```
acc = bias + sum_{m=1..M} w_m * p_m
pred = (acc + (1 << (SHIFT-1))) >> SHIFT      // deterministic rounding, fixed SHIFT
```

`SHIFT` is a fixed global right-shift (e.g. 10) so the stored weights live near unity scale and the dot product stays in `i32`. Predictions are clamped to the plane range by `predict_clamped`, exactly as today.

### 2.3 Online LMS update (the functional-form change)

The recursion is the whole point: after each pixel, update the per-context weights from the just-observed residual `r = v - pred`:

```
for m in 1..M:
    w_m  += clamp_signed( (r * p_m) >> GAIN , WMIN, WMAX )
bias    += clamp_signed( (r * SCALE_B) >> GAIN , BMIN, BMAX )
```

where `GAIN` is a fixed right-shift learning rate (the existing `M3_WP_GAIN = 13` is a reasonable starting point), `WMIN/WMAX` (`-48..48`, reusing `WEIGHT_MIN/MAX`) and `BMIN/BMAX` bound the coefficients so no direction diverges, and `>>` is floor shift on `i64` intermediates. This is the classic sign-sign LMS / delta rule on `0.5 r^2`; it drives `w` toward the local least-squares optimum of the *held-out* stream, tracking local image structure (edges, gradients, texture) as the scan proceeds.

### 2.4 Base-weight initialization (reuse R9-B machinery)

Initialize `w_cid` per context from a least-squares fit over the analysis pass, generalizing `solve_weighted_tree` from the 4-tuple `(L,T,TL,TR,1)` to the `M+1`-tuple `(p_1..p_M, 1)`. The analysis pass accumulates the `(M+1)x(M+1)` normal equations and RHS per `weight_context` leaf (reusing the existing `weight_context` partition so the per-plane table stays `WC_LEAVES * (M+1)` small integers, O(1) model bytes), solves with the existing ridge-Gauss-Jordan routine, and signals the base weights exactly like R9-B (`weighted_wc_table`, `WC_LEAVES` leaves, ~`WC_LEAVES*(2M+2)` bytes/plane).

This makes R13-A a **strict superset**: with zero online updates (or if the per-image net finds adaptation unhelpful) it reduces to R9-B; if R9-B is not selected per context it reduces to GAP/med. No model-level regression is possible, and the per-image never-expand auto-selection rejects it per image if it ever expands.

### 2.5 Bit-exact lockstep proof (the correction of the M3-B bug)

The previous `OBSIDIAN_M3_WP` seam broke the never-expand invariant because it ran its online correction **only when `p == Weighted`**: when the map chose `WeightedTree` (id 18) for some contexts, those fell back to the static tree and the two sides diverged on the two `m3_wp_*` tests. R13-A fixes this by making adaptation part of the **predictor's own defined behavior**, keyed per context `cid`, independent of which `PredictorId` the map selects elsewhere.

**Lemma (lockstep).** At pixel `i`, encoder and decoder hold identical `(w_cid[i], p_cid[i])`.
- *Base:* `w_cid[0]` is read from the signaled model (byte-identical both sides); `p_cid[0]` is a pure function of the already-decoded border neighborhood (identical both sides by induction from earlier pixels).
- *Step:* both compute the same `pred` (pure function of identical `(w, p)`), hence the same `r = v - pred` (the decoder's decoded `v` equals the original `v` under lossless round-trip). Both apply the identical LMS update to the identical `(r, p)`, so `w_cid[i+1]` is identical. The update depends **only** on `(r, p)` of the *same* context; it does not read or mutate any other context's weights, so selecting R13-A for some contexts and GAP for others cannot desynchronize anything. QED.

Therefore R13-A needs **no online signaled bytes** and **no global seam**: the decoder reconstructs the weight trajectory from the residual stream alone, by induction. (The base weights are the only signaled state, exactly as R9-B.)

### 2.6 Integration points (for the Architect)

- `predict.rs`: add `PredictorId::AdaptiveRecursive = 19`. Add `predict_recursive(n, wstate) -> i32` and `adapt_recursive(wstate, r, props)`. Thread the per-context `WState` (the `M+1` weights) through `predict`/`predict_clamped` instead of the brittle seam. Remove `OBSIDIAN_M3_WP` (its behavior is now intrinsic to the predictor id).
- `model.rs`: generalize `WLeaf` to `M+1` weights; generalize `solve_weighted_tree` to the `M+1` system; generalize `weighted_wc_table` signaling. `analyze` accumulates the larger normal equations per leaf.
- `encoder.rs` / `decoder.rs`: maintain a `Vec<WState>` per plane keyed by `cid` (mirroring the existing `wp[cid]` allocation that the M3 seam used). On each coded pixel, look up `wstate[cid]`, predict, then `adapt` with `r`. Both sides do this unconditionally whenever the map selects `AdaptiveRecursive` for that `cid`.
- The never-expand net and per-image CMARC/MA auto-selection are unchanged and remain the regression guard.

### 2.7 Complexity

- Time: `O(N * M)` per plane (`M` ~ 9-12), a handful of integer ops per pixel, dominated by the existing rANS cost. No change to throughput class.
- Space: per-context weight vector, `O(reduced_contexts * (M+1) * 2 bytes)` per plane (e.g. `256 * 10 * 2 = 5 KiB`), far inside the existing budget.
- Model bytes: `WC_LEAVES * (M+1) * 2` per plane (~`15 * 10 * 2 = 300 bytes`), the same O(1) cost class as R9-B, covered by `MODEL_SIZE_FRACTION`.

### 2.8 Honest expected gain and risk

JPEG XL's adaptive multi-tap predictor is the dominant reason it beats LOCO-I by ~1 bpp on Kodak; R13-A replicates that mechanism (wider AR order + online self-correction). Expected: a substantial fraction of the +0.81 gap removed, **target `< 8.71`** with reasonable gain/property tuning. Risk: a poorly tuned gain schedule could make adaptation neutral, but base-init from R9-B guarantees no worse than 9.5208 and the net rejects it per image. Report the real-Kodak number honestly at each tuning step.

---

## 3. R13-B: genuine lifting wavelet transform (CDF 5/3)

### 3.1 Why the current `squeeze` fails

`transforms::squeeze` (transforms.rs) splits a plane into even/odd quadrants, then predicts each HF band from the LL band with a **fixed linear** interpolator (`(LL_a + LL_b) >> 1` and `>> 2`), storing the raw HF residual. For photographic Kodak the HF bands still carry ~as much entropy as the original, so the never-expand net correctly rejects Squeeze at every level (Builder measured forced Squeeze at 12.62 vs 10.12 bpp no-squeeze). The transform does **not** compact energy; it only rearranges samples.

### 3.2 CDF 5/3 lifting (the JPEG 2000 lossless wavelet)

A true lifting scheme has two steps per dimension: a PREDICT (high-pass) and an UPDATE (low-pass) that together make the low-pass band an actual low-frequency approximation. Integer, invertible, with floor rounding:

```
// 1-D, over the row/column samples x[0..n]
split:  even[i] = x[2i],          odd[i] = x[2i+1]
PREDICT (high-pass):
    d[i] = odd[i] - floor((even[i] + even[i+1]) / 2)
UPDATE (low-pass):
    s[i] = even[i] + floor((d[i-1] + d[i]) / 4)
// outputs: low-pass s[0..n/2], high-pass d[0..n/2]
```

Apply separably: lift every row, then every column, to get LL / HL / LH / HH; recurse on LL. The inverse (UNPREDICT, UNSPLIT) is exact integer. This is the standard lossless CDF 5/3; it genuinely compacts energy because smooth regions produce near-zero `d` coefficients and edges produce sparse, localized `d`.

### 3.3 Border handling for raster lockstep

The lift reads neighbors at index `-1` and `n` (the half-sample boundaries). Use symmetric extension / clamp: `even[-1] := even[0]`, `d[-1] := 0` (or clamp to `d[0]`), and the last odd/even use the in-bounds neighbor. The encoder and decoder use the **identical** extension rule, so the bijection inverts exactly. Because the transform is global over the plane (not causal per pixel), it runs as a **pre-pass** over the whole plane, exactly like the current `squeeze` (which is already a pre-pass). Memory: `O(width)` for the row lift, plus the full set of band buffers already allocated by the banded coder.

### 3.4 Per-band R13-A (the corrected R12-A)

With R13-B, the LL band is smooth (low-frequency) and the HF bands are small residuals. Apply **R13-A per band**: the LL band gets the full multi-tap adaptive predictor; the HF bands get a cheap fixed predictor (GAP or `id 10`) because their residuals are already near-zero-mean. This is the idea R12-A tried, but now it sits on a transform that *actually* decorrelates, so the never-expand net will **select** it (R12-A was inert only because the underlying Squeeze was inert). Energy compaction (R13-B) + adaptive per-band prediction (R13-A) is the combination that closes the gap.

### 3.5 Complexity and honest risk

- Time `O(N)` pre-pass (two separable lifts per level), same order as `squeeze`. Space `O(width)` + existing band buffers. No throughput-class change.
- Risk / honesty: JPEG 2000 (CDF 5/3) on Kodak is typically *slightly worse* than JPEG XL, so **R13-B alone will not clear 8.71** (expected ~9.0-9.3). It is a *complement* to R13-A, not a replacement. The strongest path is **R13-B (energy compaction) feeding R13-A (adaptive per-band prediction on LL)**. Do not expect R13-B by itself to hit the gate.

---

## 4. Research finding: the context-model axis is exhausted (do not re-litigate)

The following six independent Builder axes all failed to reduce the real-Kodak mean below 9.5208 bpp, confirming the bottleneck is the predictor functional form / transform, not the entropy context:

| Axis | Result |
|---|---|
| R11-D `combined_ma_context` (gradient+residual MA fold, gated) | wash (never-expand net disabled it on every Kodak image) |
| R11-A cross-band `wLL` in-loop predictor | wash + 45x slowdown (reverted) |
| 64-leaf `weight_context` (4-tier), attempt 1 (empty bins) | +0.0054 regression |
| 64-leaf `weight_context`, attempt 2 (populated bins) | identical +0.0054 regression (per-leaf sample starvation) |
| R12-A per-band decorrelation | non-regressive but inert (Squeeze never selected on photographic Kodak) |
| R12-B MA-tree context | Squeeze-gated, equally insufficient on its own |

Every axis refined the *context granularity* or *coefficient selection* of a 4-tap linear predictor over an `H(p)+epsilon` backend. None changed `P`'s functional form. Therefore **no further context-model refinement can close the gap**; only R13-A (functional-form change) and R13-B (energy-compacting transform) remain. The Architect should not spend effort on R12-B, 64-leaf, or any further MA/context widening.

---

## 5. Build order (for the Architect)

1. **R13-A first, in isolation.** Implement `PredictorId::AdaptiveRecursive` with `M = 9` properties, LMS update with `GAIN` starting at `M3_WP_GAIN`, base weights from a generalized `solve_weighted_tree` over the `M+1` system, signaled like R9-B. Remove the `OBSIDIAN_M3_WP` seam (replace its two tests with the new lockstep tests). Re-measure REAL Kodak (`run_kodak.sh --effort 4`); record `benchmarks/results/2026-08-20-r13a-recursive-adaptive.csv`. **Target: `< 8.71` (JPEG XL).**
2. **If R13-A lands ~8.8-9.0, add R13-B.** Implement CDF 5/3 lifting in `transforms.rs`, then per-band R13-A on LL (the corrected R12-A). Re-measure; record `2026-08-20-r13b-lifting.csv`.
3. Keep all seams / the never-expand net / per-image auto-selection ON as the regression guard. Report the real-Kodak number honestly at each stage; a partial win is a measured milestone, not a failure.

---

## 6. Test matrix (for the Builder)

- `r13_adaptive_recursive_lockstep`: synthetic gradient + edge + noise planes; assert the encoder's and decoder's per-context weight vectors evolve identically (capture the weight state both sides and `assert_eq!` the sequences), and that the round-trip is bit-exact.
- `r13_adaptive_recursive_beats_r9b`: on a gradient+edge image, the recursive predictor's coded bpp is `<=` the R9-B `WeightedTree` bpp (strict-superset contract).
- `r13_lifting_inverts`: `unsqueeze(lift(p)) == p` for varied sizes/levels (mirrors the existing `squeeze_inverts_various_sizes` test, extended to the update step).
- `r13_no_kodak_regression`: 24-image Kodak mean `<= 9.5208` when R13-A is off (guaranteed by superset) and a recorded measurement when on.
- Real-Kodak gate: PNG 13.05, WebP 9.61, AND JPEG XL 8.71 all beaten bit-exactly before any merge (owner override).

---

## 7. Pseudocode (compact reference for the Architect)

```text
// Analysis pass (once, per plane): for each weight_context leaf, accumulate the
// (M+1)x(M+1) normal equations over (p_1..p_M, 1) and RHS over v*(p_1..p_M,1);
// solve with ridge-Gauss-Jordan; store base WState per leaf. (Generalizes
// solve_weighted_tree from 5 to M+1 basis terms.)

// Per-pixel coding loop (encoder AND decoder, identical):
wstate = base_wstate[ map[cid] ][ weight_context(n) ]   // per-context, signaled
props  = properties(n, ring_buffer)                    // the M extended properties
pred   = clamp( (bias + dot(wstate.w, props) + half) >> SHIFT , rmin, rmax )
r      = v - pred                                       // decoder: v already decoded
emit/read zigzag(r)
// online self-correction (both sides, unconditionally when map[cid]==AdaptiveRecursive):
for m in 1..M: wstate.w[m] += clamp( (r * props[m]) >> GAIN , WMIN, WMAX )
wstate.bias += clamp( (r * SCALE_B) >> GAIN , BMIN, BMAX )

// R13-B pre-pass (if enabled), per plane, before the coding loop:
bands = cdf53_lift(plane, levels)    // LL, HL, LH, HH (recurse on LL)
// code each band; apply R13-A on LL, fixed cheap predictor on HF bands.
plane = cdf53_unlift(bands, levels)   // exact inverse
```

- Dr. Mob, the Researcher
