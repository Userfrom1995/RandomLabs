# Obsidian - Researcher specification R14: residual-conditioned context tree with a multiplier-additive (MA) residual model (the JPEG XL gate)

- **Issue:** #68
- **Author:** Dr. Mob (the Researcher)
- **Date:** 2026-08-20
- **Mode:** `/oc research` fired by the Maintainer via the documented fresh-paradigm escape hatch, after eight measured Builder axes (R11-D, R11-A, 64-leaf x2, R12-A, R13-A, R13-B, and the CMARC backend) all failed to move real-Kodak below 9.5208 bpp. JPEG XL 8.71 is NOT MET (+0.8108 bpp). The PNG 13.05 and WebP 9.61 gates are MET.
- **Companion docs:** `docs/research-r13-architectural-predictor-spec.md` (R13-A/B, now built and measured: both regressed and were gated off), `docs/architect-r9-spatial-lz-weighted-predictor.md` (R9-B WeightedTree, current best predictor), `docs/architect-r8-adaptive-weighted-predictor-blueprint.md`, `progress/68-obsidian-lossless-image-codec.md`, and the Builder escalations in `docs/decisions/builder/`.
- **Handoff:** algorithmic blueprint for the Architect. It does NOT contain production code; the Architect turns it into a build plan and the Builder implements it. Decision: `{"action":"architect"}`.

---

## 0. Executive summary and the decision

The +0.8108 bpp gap to JPEG XL (8.71) is a **structural architectural ceiling of the single-pixel / single-residual-stream predict-and-code pipeline**, now confirmed by **eight** independent, real-measured Builder axes. Every shipped and prototyped predictor, up to and including R13-A, computes the prediction `P` as a function of **neighbor pixel values** `(L, T, TL, TR)` and their long-range/spatial extensions (R13-A added `L2, T2` and pixel gradients). **None of them ever consumed the reconstruction residuals (prediction errors) of the causal neighbors as predictor inputs.**

That omission is the whole game. In lossless raster coding, when pixel `i` is encoded, the residuals `e[L], e[T], e[TL], e[TR]` at the four already-coded neighbors are **known to both encoder and decoder** (they were just decoded). Those neighbor errors are the single most informative signal about the current pixel's error: if the predictor overshot at the left neighbor, it very likely overshoots at `i` too. JPEG XL's modular mode and FLIF's MANIAC tree both exploit exactly this, and it is the dominant reason JXL beats LOCO-I-class predictors by ~1 bpp on Kodak.

This spec defines **R14**, a genuinely new paradigm: a **residual-conditioned context tree (RCCT)** whose leaves carry a **multiplier-additive (MA) residual model**. The base predictor `P0` (the current best, e.g. R9-B) produces a residual `r0 = v - P0`. R14 then fits a **decision tree** (FLIF MANIAC / JXL DECICTREE style) over decode-available *properties* that include the **base errors of the causal neighbors** (`e0_L, e0_T, e0_TL, e0_TR`) plus their gradients and the pixel gradients. Each tree leaf holds a small **MA linear model** `r_pred = a + sum_k b_k * prop_k` that predicts the residual from those properties. The coder then emits the *residual of the residual*, `epsilon = r - r_pred`, whose entropy is far lower.

**Why this is a paradigm shift, not a re-litigation:**
- R3-A already used neighbor residuals, but only as a *condition for the entropy coder* (a context id), giving at most a small gain and (correctly) judged insufficient.
- R13-A used an extended *pixel* property vector with online LMS, but never neighbor residuals; it regressed under auto-selection (9.9065 bpp) and was muted.
- R14 uses neighbor residuals as **first-class predictor features inside an adaptive decision tree**, which non-linearly partitions the residual-error space. This is the JXL/FLIF mechanism and a different functional form from every prior axis.

**Recommended build order:** R14 on the base residual stream first (primary, target `< 8.71`). R14-B (additive, optional): apply R14 on the LL band of the R13-B lifting transform (energy compaction feeds a smoother residual, so the MA tree is even more effective) once the base version is measured. Both are strict supersets, so the never-expand net plus per-image auto-selection make regression structurally impossible.

**Explicit non-recommendation:** do NOT invest further in (a) context-granularity widening (R11-D, 64-leaf, R12-B), (b) Squeeze-gated decorrelation (R12-A), (c) single global extended-linear predictors (R13-A), or (d) lifting alone (R13-B). Those axes are exhausted (eight of them). The gate is the functional form of the *residual model*: it must be (i) conditioned on neighbor residuals and (ii) adaptively partitioned. R14 is that model.

---

## 1. The missing signal: neighbor reconstruction residuals

Let the coded plane be `v[i]` in raster order, `i = 0..N`. A predictor emits `v[i] = P(i) + r[i]`, `r[i]` the residual. Under lossless coding, after pixel `i` is decoded both sides hold the exact tuple `(v[i], P(i), r[i])`, and `r[i] = v[i] - P(i)` is the *decoded residual*. At pixel `i`, the four causal neighbors `L = i-1`, `T = i-W`, `TL = i-W-1`, `TR = i-W+1` have all been decoded, so `e[L], e[T], e[TL], e[TR]` are **simultaneously available to encoder and decoder at the moment of coding `i`**.

The current codec ignores these. Its best predictor (R9-B) fits `v[i] ~ wL*L + wT*T + wTL*TL + wTR*TR + bias` over a pixel-neighborhood context, but `e[L] = v[L] - P(L)` carries information orthogonal to `L` itself: it says how wrong `P` was locally. Conditioning the prediction on `e[L]` is a **second-order** correction that a pixel-only linear map cannot express. Concretely, for a smooth ramp the pixel predictor is near-perfect (`e ~ 0`), but near an edge `e[L]` jumps sign, and `e[L]` is a far better predictor of `e[i]` than `L` is of `v[i]`.

### 1.1 Decode-consistency of the base error

To use neighbor errors without circularity, define a **fixed** base predictor `P0` (NOT the tree). The base error at a neighbor is `e0[X] = v[X] - P0(n_X)`. Both sides can compute `e0[X]` from decoded pixels alone (the decoder knows `v[X]` and `P0(n_X)` is deterministic from the neighbor's decoded neighborhood), so `e0[X]` is decode-available **and independent of the tree's own predictions**. The tree predicts the residual `r` as a function of `(L, T, TL, TR, e0_L, e0_T, e0_TL, e0_TR, gradients)`, all decode-available. Reconstruction is `v = P0 + r_pred + epsilon`, where `r_pred` is the tree's MA prediction and `epsilon` the coded residual-of-residual. No circularity: the tree never reads a neighbor's *tree* residual, only the fixed-base error `e0`.

---

## 2. R14: residual-conditioned context tree with MA leaf model

### 2.1 Property vector (decode-available)

For pixel `i` with neighborhood `n`, compute `K` properties from `(n, e0[n])`. A JXL-aligned base set with `K = 10`:

```
p1  = e0_L      base error at left
p2  = e0_T      base error at top
p3  = e0_TL     base error at top-left
p4  = e0_TR     base error at top-right
p5  = e0_L - e0_TL   diagonal residual gradient
p6  = e0_T - e0_TR   vertical residual gradient
p7  = e0_TL - e0_TR  diagonal-2 residual gradient
p8  = (e0_L + e0_T) >> 1   mean of horizontal/vertical residual
p9  = L - T       pixel edge indicator (gradient across the local neighborhood)
p10 = (L + T)/2 + (TR - TL)/2   GAP-style pixel gradient (reuse context.rs g1/g2/g3)
```

All ten are pure functions of already-decoded samples (`v` at neighbors and their fixed-base errors `e0`), so they are bit-identical on both sides. `K` is a compile-time constant; widening it (e.g. adding `e0_L2, e0_T2` longer-range base errors, or `T - TL`) only enlarges the per-leaf MA fit, never breaks lockstep. The "multiplier-additive" character comes from the fact that the modeled quantity is the residual `r`, and the features are themselves residuals (`e0_*`) and their combinations: the leaf model is `r_pred = a + sum_k b_k * p_k`.

### 2.2 Context tree (MANIAC / DECICTREE style)

A binary tree where every internal node `nd` stores `(prop_index k, threshold tau, sign)` and routes:

```
go_left if prop_k(i) <= tau  (for a "low" node)  else right
```

The tree is **built once on the analysis pass** (host side, not the stream) by recursive greedy splitting:

1. Start with the root covering all pixels of the plane.
2. At a node with pixel set `S`, for every candidate `(k in 0..K, tau in T_k)` (where `T_k` is a small set of quantiles of `prop_k` over `S`, ~16 values), tentatively split `S` into `S_left / S_right` and compute the **residual reduction** of an MA fit in each child. Choose the split maximizing `sum_{i in S} r0[i]^2 - sum_{i in S_left} rhat_left[i]^2 - sum_{i in S_right} rhat_right[i]^2`, where `rhat` is the per-leaf MA prediction (section 2.3). Equivalently: minimize the sum of squared leaf residuals.
3. Recurse until `depth == MAX_DEPTH` (e.g. 6) or `|S| < MIN_LEAF` (e.g. 256). Leaves store their MA coefficients.

The tree is a **fixed structure**, signaled in the model section as a flat list of `(k, tau, sign)` per node (a few hundred bytes/plane, O(1), within `MODEL_SIZE_FRACTION`). Because the split decisions are pure functions of decode-available properties, encoder and decoder traverse the **same path** for every pixel with zero signaled bytes beyond the tree itself.

### 2.3 MA (multiplier-additive) leaf model

Each leaf `l` holds coefficients `theta_l = (a_l, b_l[0..K])` (small integers). The leaf predicts the residual:

```
r_pred(i) = clamp( a_l + sum_{k=0..K-1} b_l[k] * p_k(i) , rmin - rmax, rmax - rmin )
epsilon(i) = r0(i) - r_pred(i)      // the coded symbol, zigzagged
```

The coefficients are fit per leaf on the analysis pass by **ridge-least-squares** minimizing `sum_{i in leaf} (r0[i] - (a + sum b_k p_k))^2` (the existing `solve_weighted_tree` Gauss-Jordan routine generalizes directly to `K+1` basis terms; reuse it). They are signaled in the model section: `leaves * (K+1)` small integers (~`128 * 11 * 2 = 2.8 KiB` worst case, bounded by `MODEL_SIZE_FRACTION`; a typical tree uses far fewer leaves).

**Strict superset / never-regress.** If the tree is built with `MAX_DEPTH = 0` (a single root leaf) and coefficients `(a=0, all b=0)`, then `r_pred = 0` for every pixel, so R14 reduces exactly to the base predictor `P0`. Any non-trivial tree only reduces residual variance (that is what the greedy split maximizes), so per-image the never-expand net accepts R14 only when it strictly lowers bits. No model-level regression is possible; per-image auto-selection rejects it if ever expands.

### 2.4 Bit-exact lockstep lemma

- **Static state:** the tree structure and all leaf MA coefficients are read from the signaled model, byte-identical on both sides. The base predictor `P0` and its coefficient table (R9-B) are likewise identical.
- **Per-pixel induction:** at pixel `i`, both sides compute `P0(i)` identically (deterministic from the decoded causal neighborhood), and `e0` at each neighbor identically (`v[neighbor] - P0(n_neighbor)`, both decoded). Hence all `K` properties are identical. Both traverse the identical tree to the identical leaf, compute the identical `r_pred`. The coder emits/reads `epsilon`; the decoder reconstructs `v = P0 + r_pred + epsilon = original v`. The update of any per-leaf adaptation (none in base R14; if the Architect later adds online MA weight tracking, it is keyed per leaf and driven only by `(epsilon, p)`, identical both sides) preserves equality. QED. No online signaled bytes are needed for the base R14.

---

## 3. R14-B (additive, optional): RCCT on a lifting transform

The R13-B CDF 5/3 lifting (already implemented, gated off because standalone it regressed to 10.17 bpp) compacts energy into LL but exposes HF bands whose *absolute* entropy is not lower. However, the LL band of a lifting transform is a smoother, lower-entropy signal whose **base errors `e0` are even more structured**, so the R14 MA tree on the LL band should compress the LL dramatically, while the HF bands (already near-zero-mean) get a cheap fixed predictor. This is the corrected, now-non-inert form of R12-A: the lifting gives energy compaction, R14 gives the residual model that actually exploits it.

R14-B is **not required for the gate** (the base R14 on the untransformed stream already targets `< 8.71`), but it is the natural second lever if base R14 lands at, say, 8.8-9.0. Build order in section 6.

---

## 4. Research finding: eight axes exhausted, one lever never tried

| Axis | Result |
|---|---|
| R11-D combined MA context (gradient+residual coder fold) | wash (never-expand net disabled it everywhere) |
| R11-A cross-band `wLL` in-loop predictor | wash + 45x slowdown (reverted) |
| 64-leaf `weight_context`, attempt 1 (empty bins) | +0.0054 regression |
| 64-leaf `weight_context`, attempt 2 (populated bins) | identical +0.0054 regression (per-leaf starvation) |
| R12-A per-band decorrelation | inert (Squeeze never selected on photographic Kodak) |
| R12-B MA-tree context | Squeeze-gated, equally insufficient |
| R13-A recursive adaptive multi-tap (pixel+gradient LMS) | regressed to 9.9065 under auto-select; muted |
| R13-B CDF 5/3 lifting | +0.65 (10.17) / +1.06 (10.58) regression; gated off |

Every axis predicted the pixel as a function of **neighbor pixel values and their long-range/gradient extensions**, and/or refined the entropy *context*. **None consumed neighbor reconstruction residuals as predictor features, and none adaptively partitioned the residual-error space with a decision tree.** That is the structural ceiling. R14 is the missing functional form: an adaptive decision tree whose leaves carry an MA model of the residual conditioned on neighbor base-errors. It is exactly the mechanism behind JPEG XL's modular lossless mode and FLIF, and it is the only lever in the eight-axis table that was never instantiated.

---

## 5. Complexity

- **Analysis pass (host):** tree construction visits each pixel once per tree level: `O(N * K * |T| * MAX_DEPTH)` where `|T|` ~ 16 threshold candidates, `MAX_DEPTH` ~ 6, `K` ~ 10. For a 512x768 Kodak image (`N ~ 4e5`) this is `~4e5 * 10 * 16 * 6 ~ 4e8` simple ops in Rust, well within the effort-4 budget (the existing R9-B least-squares pass is the same order). The MA least-squares fit per leaf reuses the existing `O((K+1)^3)` Gauss-Jordan on accumulated normal equations, done once per leaf (`<= 2^MAX_DEPTH` leaves).
- **Per-pixel coding:** tree traversal `<= MAX_DEPTH` comparisons + a `K`-term dot product (`<= 11` integer mults). Negligible next to the rANS cost. No throughput-class change.
- **Model bytes:** tree (`<= 2^(MAX_DEPTH+1)` nodes * ~3 bytes) + leaf MA tables (`<= 2^MAX_DEPTH * (K+1) * 2` bytes). For `MAX_DEPTH = 6, K = 10`: `<= 128 * 11 * 2 = 2.8 KiB` worst case, typically far less; bounded by `MODEL_SIZE_FRACTION` (reuse the existing guard that already protects R9-B tables). Per-plane, O(1) amortized over millions of pixels.
- **Space:** one `K`-property vector per pixel during the pass (reused), plus the decoded-neighbor `e0` ring (4 integers). `O(1)` beyond the existing plane buffers.

---

## 6. Build order (for the Architect)

1. **R14 base, in isolation, on the untransformed stream.** Implement:
   - A `ContextTree` struct (`predict.rs`/`model.rs`): fixed base predictor `P0 = R9-B WeightedTree` (reuse `weighted_tree_for`); property computation `r14_properties(n, e0)`; a tree with `MAX_DEPTH`, `MIN_LEAF`, greedy split selection over `(k, tau)`; per-leaf MA coefficients fit by `solve_r14_least_squares` (generalize `solve_weighted_tree` to `K+1` terms).
   - Analysis pass: build the tree per plane on `r0 = v - P0`, fit leaf MA coefficients, signal tree + coefficients in the model section. Gate behind an opt-in flag / effort >= 4 like R12-A/R13-A so legacy streams decode byte-identically (`transform_kind`/predictor-map path).
   - Encoder/decoder: for each pixel compute `e0` at neighbors (decode-available), compute `K` properties, traverse the signaled tree to the leaf, compute `r_pred`, emit/read `zigzag(r0 - r_pred)`, reconstruct `v = P0 + r_pred + epsilon`. Mirror exactly on both sides; add `r14_lockstep_bit_exact` and `r14_beats_base` tests.
   - Re-measure REAL Kodak (`benchmarks/measure_kodak.sh --effort 4`); record `benchmarks/results/2026-08-20-r14-rcct-ma.csv`. **Target: `< 8.71` (JPEG XL).**
2. **If R14 base lands ~8.8-9.0, add R14-B.** Apply R14 on the LL band of the existing (gated-off) R13-B lifting transform; cheap fixed predictor on HF bands. Re-measure; record `2026-08-20-r14b-lifting-rcct.csv`.
3. Keep the never-expand net / per-image auto-selection ON as the regression guard. Report the real-Kodak number honestly at each stage; a partial win is a measured milestone, not a failure.

---

## 7. Test matrix (for the Builder)

- `r14_properties_decode_available`: for synthetic ramp + edge + noise planes, assert `r14_properties` is a pure function of the causal decoded neighborhood (no future/uncoded sample read), and that `e0` computed from decoded `v` equals the encoder's `e0`.
- `r14_lockstep_bit_exact`: encode then decode the 24 Kodak images (and synthetic patterns); assert byte-identical reconstruction and that encoder/decoder traverse the identical leaf for every pixel (capture leaf ids both sides and `assert_eq!`).
- `r14_beats_base`: on a smooth-ramp + edge image, R14 coded bpp `<=` R9-B `WeightedTree` bpp (strict-superset contract).
- `r14_no_kodak_regression`: 24-image Kodak mean `<= 9.5208` when R14 is off (guaranteed by superset) and a recorded measurement when on.
- `r14_legacy_stream_decodable`: a stream encoded without R14 still decodes byte-identically (gated flag is backward compatible).
- Real-Kodak gate: PNG 13.05, WebP 9.61, AND JPEG XL 8.71 all beaten bit-exactly before any merge (owner override #2).

---

## 8. Pseudocode (compact reference for the Architect)

```text
// Analysis pass (once, per plane, host side):
P0_table = solve_weighted_tree over R9-B leaves        // existing machinery
r0[i] = v[i] - P0(i)                                     // base residual (decode-available)
build tree T:
  split(node S):
    for k in 0..K:
      for tau in quantile_thresholds(prop_k over S):
        (Slo, Shi) = partition S by prop_k <= tau
        cost = ssr(MA_fit(Slo)) + ssr(MA_fit(Shi))        // ssr = sum sq residual
        best = argmin cost
    if best.cost >= ssr(MA_fit(S)) or depth==MAX or |S|<MIN: make LEAF(MA_fit(S))
    else split into children, recurse
signal T (node list) + per-leaf MA coeffs theta_l        // bounded by MODEL_SIZE_FRACTION

// Per-pixel coding loop (encoder AND decoder, identical):
for i in raster:
  n = neighbors(recon, x, y)
  e0_L = recon[L] - P0(n_L);  e0_T, e0_TL, e0_TR similarly   // decode-available
  props = (e0_L, e0_T, e0_TL, e0_TR, e0_L-e0_TL, e0_T-e0_TR,
           e0_TL-e0_TR, (e0_L+e0_T)/2, L-T, GAP_grad)         // K=10
  leaf = traverse(T, props)                                   // identical both sides
  r_pred = clamp( a_leaf + dot(b_leaf, props), rmin-rmax, rmax-rmin )
  if encoder: epsilon = (v[i] - P0(i)) - r_pred ; emit zigzag(epsilon)
  if decoder: epsilon = unzigzag(read()) ; v[i] = P0(i) + r_pred + epsilon
  recon[i] = v[i]
```

- Dr. Mob, the Researcher
