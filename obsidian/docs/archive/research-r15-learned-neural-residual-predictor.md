# Obsidian - Researcher specification R15: per-image learned neural residual predictor (NRP) for the JPEG XL 8.71 gate

- **Issue:** #68
- **Author:** Dr. Mob (the Researcher)
- **Date:** 2026-08-20
- **Mode:** `/oc research` fired by the Maintainer (decision `2026-08-20T09:42:10Z`) as the documented fresh-paradigm escape hatch, after **nine** measured Builder axes all failed to move real-Kodak below 9.5209 bpp. R14 (residual-conditioned context tree, the previous escape hatch) is now built and measured: **9.66 bpp, net-negative**, the 9th exhausted axis. JPEG XL 8.71 is NOT MET (+0.8108 bpp). PNG 13.05 and WebP 9.61 are MET.
- **Companion docs:** `docs/research-r14-context-tree-ma-residual-model.md` (R14, built, net-negative), `docs/architect-r14-rcct-ma-blueprint.md` (R14 build blueprint, whose `e0buf`/`rcct_properties`/`solve_ma_least_squares` machinery is reused as the R15 featurization front-end), `docs/research-r13-architectural-predictor-spec.md` (R13-A/B, both regressed and gated off), `docs/architect-r9-spatial-lz-weighted-predictor.md` (R9-B, current best base predictor P0), `progress/68-obsidian-lossless-image-codec.md`, and the Builder escalations in `obsidian/docs/decisions/builder/`.
- **Handoff:** algorithmic blueprint for the Architect. It does NOT contain production code; the Architect turns it into a build plan and the Builder implements it. Decision: `{"action":"architect"}`.

---

## 0. Executive summary and the decision

The +0.8108 bpp gap to JPEG XL (8.71) is a **structural ceiling of the single-pixel / piecewise-linear predict-and-code family**, now confirmed by **nine** independent, real-measured Builder axes. The last of these, R14, was the correct *functional form* (a residual model conditioned on the decode-available neighbor base-errors `e0`), but it was the **wrong parameterization**: a depth-6 decision tree needs `2^6 = 128` leaves times `(K+1) = 11` coefficients each, i.e. `~2.8 KiB/plane`, yet it reduced the residual only `1-12%` per plane. The tree's own byte cost exceeded the bytes it saved, so the never-expand net correctly rejected it and production stayed at 9.5209 bpp.

That failure mode is **not** an argument against conditioning on `e0`. It is an argument about **parameter efficiency**. A decision tree is a *piecewise-linear* model: to approximate a smooth curved residual manifold it must spend exponentially many leaves. The missing lever is a **continuous, globally-shared, non-linear** residual model, a small neural network, whose shared weights express the same smooth manifold with a constant `O(H*D)` parameter count independent of how wiggly the manifold is. This is the only remaining functional form in the predictor space that has never been instantiated, and it is the one with the best chance of flipping R14's net-negative result.

This spec defines **R15**, a **per-image learned neural residual predictor (NRP)**. During the analysis pass the codec fits a small multilayer perceptron `f_theta` to the base residual `r0 = v - P0` over decode-available features `phi` (the four causal neighbor pixels, their base-errors `e0`, and the pixel/residual gradients: a strict superset of R14's `K=10` property vector). The weights `theta` are signaled in the model section (`O(1)` bytes, ~`H*(D+1)+(H+1)` `i16` values). The coder emits the **residual of the neural prediction**, `epsilon = r0 - f_theta(phi)`, a smaller symbol; the decoder reconstructs `v = P0 + f_theta(phi) + epsilon`. R15 is an **overlay on `P0`** exactly like R14 (it does not replace `P0`, does not touch the entropy backend), so all eight backends keep working with a one-line change.

**Why this is a genuine paradigm shift, not a re-litigation:**

- R14 (tree) and R9-B/GAP (linear bank) are both *piecewise-linear*. R15's MLP is *continuous non-linear with shared global weights*: one weight set covers the whole image, so it needs far fewer bytes than a tree covering the same behavior with many local leaves.
- The training objective is **sum of squared residual (SSR)** minimization, which under the near-Gaussian residual model of the `H(p)+epsilon` CMARC backend is equivalent to minimizing the coded entropy of `epsilon`. R15 therefore optimizes the exact quantity that decides the bpp, not a proxy (this is the fix for the R13-A sum-of-zigzag proxy pitfall).
- R15 reuses the already-implemented R14 front-end (`e0buf`, `rcct_properties`, `solve_ma_least_squares` as a warm start), so the Builder's integration cost is low and the lockstep proof is inherited.

**Recommended build order:** R15 base (a **single hidden layer** MLP, the minimal "learned" form with the best byte-efficiency) on the untransformed stream first. If it lands ~9.0-9.2 bpp, deepen to two hidden layers and/or stack the existing R14 RCCT as a second-order correction. Both are strict supersets, so the never-expand net makes regression structurally impossible and selection is on **real coded bytes**.

**Honest target and risk:** a single shared MLP overlay plausibly closes `0.1-0.4` bpp (expected landing `9.1-9.4`). Reaching `8.71` (a `0.81` reduction) from a predictor overlay alone is optimistic; the realistic path is R15 + a deeper/stacked second-order model, or acceptance that the remaining gap is an entropy-backend / very-large-MA-tree effect (see section 5). **If R15 is also net-negative, the predictor family is exhausted and the correct next action is a definitive halt/repivot recommendation to the owner, not another predictor tweak** (see section 5.3).

---

## 1. The parameter-efficiency argument (the scientific crux of R15)

Let the base residual `r0[i]` be a function of the decode-available feature vector `phi(i) in R^D`. The true mapping `r0 = g(phi)` for photographic content is **smooth but curved** (it is the systematic part of the prediction error, concentrated near edges and textures).

- **Piecewise-linear (R9-B per-context linear, R14 tree):** a depth-`D_tree` tree with `K+1` coefficients per leaf costs `2^D_tree * (K+1)` coefficients. To track a curved `g` it needs leaves until each leaf's region is locally linear, i.e. leaves grow with the curvature frequency. For Kodak this saturated R14 at `128 * 11 = 1408` coefficients/plane and still lost on bytes.
- **Continuous MLP (R15):** a 1-hidden-layer net with `H` neurons is `f(phi) = sum_{h=1..H} w_h_out * sigma( dot(W_h, phi) + b_h ) + b_out`. It is a sum of `H` ridge functions, a universal smoother. The parameter count is `H*(D+1) + (H+1)`, **independent of how wiggly `g` is**. For smooth photographic residuals `H = 8..16` suffices. That is `8*11 + 9 = 97` to `16*11 + 17 = 193` coefficients/plane, roughly **7x to 16x fewer bytes** than R14's tree for a comparable or better fit.

That ~10x parameter-efficiency ratio is the hypothesis that flips R14's verdict: **the same SSR reduction that cost R14 ~2.8 KiB/plane should cost R15 ~0.2-0.4 KiB/plane**, so the bytes-saved finally exceed the bytes-spent. R15 is worth building precisely because it attacks R14's measured failure mode at its root, not by adding another axis of the same family.

---

## 2. R15: per-image learned neural residual predictor

### 2.1 Feature vector `phi` (decode-available, superset of R14's `K=10`)

Reuse `rcct_properties` (`predict.rs`, R14) to obtain the `K=10` base properties, then append the raw neighbor pixels so the net can learn the linear part directly (the net can re-derive `g1/g2/g3` but giving them raw avoids wasting capacity). Final `D = 14`:

```
phi[0..4]  = (L, T, TL, TR)              raw causal neighbor pixels (centered: subtract 2048 for u16)
phi[4..8]  = (e0_L, e0_T, e0_TL, e0_TR) decode-available base errors (the key signal)
phi[8]     = e0_L - e0_TL                diagonal residual gradient
phi[9]     = e0_T - e0_TR                vertical residual gradient
phi[10]    = e0_TL - e0_TR               diagonal-2 residual gradient
phi[11]    = (e0_L + e0_T)>>1            mean residual
phi[12]    = g1 = L - T                  pixel edge indicator (GAP)
phi[13]    = (g1+g2+g3)>>1               GAP-style blended pixel gradient
```

All fourteen are pure functions of already-decoded samples and the stored `e0buf` (R14's shared ring), so they are bit-identical on encoder and decoder. `D` is a compile-time constant; widening it only enlarges the weight matrix, never breaks lockstep. Centering the pixel features near `0` keeps the `i16` dot-product dynamic range small and the learned weights near unity scale.

### 2.2 Network architecture (minimal learned form: one hidden layer)

```
Hidden activation:  sigma(z) = clamp(z >> NRP_ACT_SHIFT, -NRP_ACT_CLAMP, NRP_ACT_CLAMP)   // cheap integer tanh-ish
f(phi) = ( b_out + sum_{h=0..H-1} w_out[h] * sigma( b_h + sum_{d=0..D-1} W[h][d] * phi[d] ) ) >> NRP_OUT_SHIFT
```

- `H = NRP_H` (compile-time, research default `8`; raise to `16` only if the shallow net plateaus).
- `NRP_ACT_SHIFT` (e.g. `4`) and `NRP_OUT_SHIFT` (e.g. `8`) keep all intermediate products in `i32` and the stored weights near unity (mirrors `RCCT_SHIFT`/`R13_SHIFT`).
- All weights `W[h][d], w_out[h], b_h, b_out` are `i16`, signaled in the model section as a flat table.

**Strict superset / never-regress.** Set every weight and bias to `0`. Then `sigma(0) = 0`, so `f(phi) = 0` for every pixel, `epsilon = r0`, and the stream is byte-identical to the current codec (`P0` alone). Any non-trivial fit only lowers SSR (that is what training maximizes), so the never-expand net plus per-plane model-byte accounting accept R15 only when it strictly lowers total bytes. The code-point guarantee is identical to R14's.

**Optional deepening (R15-B, additive).** A second hidden layer `H2` with the same integer activation adds capacity for the most texture-heavy planes at the cost of more weights; build only if the shallow net lands `> 9.0` bpp. Selection on real bytes keeps it honest.

### 2.3 Training (analysis pass, per plane, host side)

Minimize `L(theta) = sum_{i in plane} (r0[i] - f_theta(phi(i)))^2 + lambda * ||theta||^2` (tiny ridge `lambda` for weight stability). Procedure:

1. Build the `e0buf` (reuse R14's exact routine) and the `phi` matrix for all pixels of the plane.
2. **Warm start:** initialize `W, w_out` from the R14 least-squares solve (`solve_ma_least_squares` over the `K+1` linear terms) so the net begins at the best linear fit and training only adds the non-linear correction. This also bounds training iterations.
3. Optimize with a small, fixed-budget stochastic gradient descent (or a few L-BFGS steps on the accumulated normal equations) for `NRP_ITERS` (e.g. `150`). Per-image: `O(N * H * D * NRP_ITERS)`. For Kodak `N ~ 4e5`, `H=8`, `D=14`, `150` iters this is `~7e9` MACs, a few seconds in Rust, within the effort-4 budget (comparable to the existing R9-B least-squares pass).
4. Quantize weights to `i16` (round, clip) and signal. **Quantization-aware final pass:** after quantizing, re-evaluate SSR at `i16` precision and keep the net only if `SSR_quant <= SSR_base`; otherwise fall back to the depth-0 zero net (byte-identical). This is the byte-honest gate that R14 lacked at the *weight* level.

### 2.4 Bit-exact lockstep lemma

- **Static state:** the weight table `theta` is read from the signaled model, byte-identical on both sides. `P0` and its table (R9-B) are identical. `e0buf` is filled identically (both store `v[idx]-P0(idx)` after each reconstruction).
- **Per-pixel induction:** at pixel `i` both sides compute `P0(i)` and `phi(i)` identically from decoded samples; both traverse the identical (parameter-free) forward net to the identical scalar `f_theta(phi(i))`. The coder emits/reads `epsilon`; the decoder reconstructs `v = P0 + f_theta + epsilon = original v`. No online state, no signaled bytes beyond the weight table. QED. (If the Architect later adds online weight tracking, it is keyed per pixel and driven only by `(epsilon, phi)`, identical both sides, preserving equality.)

---

## 3. R15-B (additive, optional): stack R14 RCCT as a second-order correction

If the shallow MLP lands at, say, `9.1-9.3` bpp, the *residual of the net* `epsilon` is a smaller, smoother symbol than `r0` was. Applying the existing R14 RCCT (already implemented) on `epsilon` instead of `r0` should then be net-positive, because the tree now only has to model the net's leftover error (smaller magnitude, so the tree's byte cost is more easily paid back). Build order: R15 first; if it lands `< 9.3`, add R14-on-epsilon as a second overlay. Selection on real bytes.

---

## 4. Complexity

- **Analysis pass (host):** feature build `O(N*D)`; training `O(N * H * D * NRP_ITERS)` (~`7e9` MACs for the research default, a few seconds). One least-squares warm start `O((K+1)^3)` per plane. All within effort-4.
- **Per-pixel coding:** net forward = `H` hidden MACs of size `D` + `H` activations + `1` output MAC = `<= H*(D+1)+1` integer mults (~`113` for `H=8,D=14`), plus one cheap clamp activation. Negligible next to the rANS symbol cost. No throughput-class change vs R14.
- **Model bytes:** `H*(D+1) + (H+1)` `i16` values. For `H=8,D=14`: `97 * 2 = 194` bytes/plane worst case; `H=16`: `193 * 2 = 386` bytes. Bounded by `MODEL_SIZE_FRACTION` (reuse the existing guard that protects R9-B/R14 tables). Per-plane `O(1)` amortized over millions of pixels. This is the decisive ~10x reduction versus R14's `~2.8 KiB/plane` tree.
- **Space:** the `phi` vector (`O(1)`) plus the inherited `e0buf` ring (4 integers/pixel, `O(1)` beyond existing plane buffers).

---

## 5. Research finding: nine axes exhausted, the parameterization was the bug

| Axis | Form | Result |
|---|---|---|
| R11-D combined MA context | context widening | wash (never-expand disabled) |
| R11-A cross-band `wLL` | decorrelation | wash + 45x slowdown (reverted) |
| 64-leaf `weight_context` x2 | context widening | +0.0054 regression (sample starvation) |
| R12-A per-band decorrelation | decorrelation (Squeeze-gated) | inert (Squeeze never selected) |
| R12-B MA-tree context | context widening (Squeeze-gated) | insufficient |
| R13-A recursive adaptive multi-tap | extended-linear LMS | 9.9065 regression, muted |
| R13-B CDF 5/3 lifting | transform | +0.65/+1.06 regression, gated off |
| R9-B / GAP / CMARC backend | per-context linear + `H(p)+epsilon` | current ceiling 9.5209 |
| R14 RCCT + MA leaf model | piecewise-linear tree on `e0` | 9.66 net-negative (tree byte cost > save) |

The first eight axes share one blind spot: they predict from **neighbor pixel values and their extensions** (or refine the *entropy context*), never from **neighbor reconstruction residuals as first-class features**. R14 fixed that blind spot but chose a **piecewise-linear tree** parameterization whose byte cost exceeded its gain. R15 keeps the correct signal (`e0`) and switches to a **continuous globally-shared MLP**, the parameterization with the best chance of net-winning.

### 5.1 Why SSR minimization is the right objective here

Under the `H(p)+epsilon` CMARC backend, the coded length of `epsilon` is, to first order, `H(epsilon) + epsilon_bits`. For a near-Gaussian residual, `H(epsilon) ~ 0.5*log2(var(epsilon)) + const`. Minimizing `SSR(epsilon) = N*var(epsilon)` therefore minimizes the coded bytes directly. R15 trains on SSR, so it optimizes the exact quantity that decides bpp. This is why R15 avoids the R13-A proxy trap (which selected on training-RSS of the *pixel*, not on coded bytes of the residual).

### 5.2 Honest assessment of the 8.71 target

A single shared MLP overlay reduces the *residual* entropy. The established floor after R9-B + CMARC is `9.5209` bpp; the residual carries the full remaining `~9.5` bpp of entropy, of which the systematic (modelable) part is a fraction. A well-fit net can typically remove `10-30%` of residual variance on photographic content, which on Kodak maps to roughly `0.1-0.4` bpp. Landing at `8.71` (a `0.81` reduction, ~`8.5%` of total bytes) would require removing a larger share than a single overlay plausibly does, so the realistic plan is R15 (base) + R15-B (stacked R14) + possibly a deeper net; if those together reach `~9.0`, the final `0.3` is most likely an **entropy-backend** effect (JXL uses a much larger MA tree with gradient pooling across many more neighbors and a more sophisticated context modeler), not a predictor effect.

### 5.3 Definitive halt/repivot trigger

If R15 (the last "learned/neural" lever in the escape hatch) is measured net-negative on REAL Kodak (the never-expand net rejects it, production unchanged at 9.5209), then **the predictor family is exhausted**: nine axes, including the correct signal (`e0`) in two parameterizations (tree and, now, net), have all failed to net-win. The correct action is NOT another predictor tweak. It is a recommendation to the owner to either (a) recalibrate the 8.71 gate against what a LOCO-I-class modular codec realistically achieves, or (b) commission a genuinely different codec family (a VarDCT / transform-coding frontend, or a much larger gradient-pooled MA tree in the entropy backend). The Researcher should not loop silently; escalating a definitive finding via the Maintainer is the honest close.

---

## 6. Build order (for the Architect)

1. **R15 base, single hidden layer, on the untransformed stream.** Implement:
    - A `NrpNet` struct (`predict.rs`, new `nrp` section): `NRP_H`, `NRP_D=14`, `NRP_ACT_SHIFT`, `NRP_OUT_SHIFT`; weight/bias tables as flat `i16` slices; `nrp_forward(phi, theta) -> i32` (integer net, no float, no per-pixel allocation). Build `phi` by reusing `rcct_properties` and appending the four raw neighbor pixels.
    - Analysis pass: build `e0buf` (reuse R14 routine), build `phi`, warm-start `theta` from `solve_ma_least_squares` over the `K+1` linear terms, run fixed-budget SGD (`NRP_ITERS`), quantize to `i16`, keep only if `SSR_quant <= SSR_base` else emit the depth-0 zero net. Gate behind the existing R14 effort/opt-in flag so legacy streams decode byte-identically.
    - Encoder/decoder: for each pixel compute `phi` from decoded samples + `e0buf`, run `nrp_forward`, emit/read `zigzag(r0 - f)`, reconstruct `v = P0 + f + epsilon`. Mirror exactly both sides; add `nrp_lockstep_bit_exact`, `nrp_beats_base`, `nrp_no_kodak_regression` tests.
    - Re-measure REAL Kodak (`benchmarks/measure_kodak.sh --effort 4`); record `benchmarks/results/2026-08-20-r15-nrp.csv`. **Target: `< 9.3` bpp (realistic); `< 8.71` is the gate.**
2. **If R15 base lands `9.0-9.3`, add R15-B:** stack the existing R14 RCCT on `epsilon` (not `r0`); re-measure (`2026-08-20-r15b-stacked.csv`). If base lands `> 9.3`, deepen to two hidden layers first.
3. Keep the never-expand net / per-image auto-selection ON as the regression guard. Judge candidates on **actual encoded bytes**, not training SSR. Report the real-Kodak number honestly at each stage.

---

## 7. Test matrix (for the Builder)

- `nrp_features_decode_available`: for synthetic ramp + edge + noise planes, assert `phi` is a pure function of the causal decoded neighborhood (no future/uncoded sample read) and that `e0` from decoded `v` equals the encoder's `e0`.
- `nrp_lockstep_bit_exact`: encode then decode the 24 Kodak images (and synthetic patterns); assert byte-identical reconstruction and that encoder/decoder compute the identical `f` per pixel (capture and `assert_eq!` the net output both sides).
- `nrp_zero_net_is_base`: with all weights `0`, R15 coded bytes equal the R9-B `WeightedTree` bytes (strict-superset contract, bit-exact).
- `nrp_beats_base`: on a smooth-ramp + edge image, R15 coded bpp `<=` R9-B bpp.
- `nrp_no_kodak_regression`: 24-image Kodak mean `<= 9.5209` when R15 is off (guaranteed by superset) and a recorded measurement when on.
- `nrp_legacy_stream_decodable`: a stream encoded without R15 still decodes byte-identically (gated flag is backward compatible).
- Real-Kodak gate: PNG 13.05, WebP 9.61, AND JPEG XL 8.71 all beaten bit-exactly before any merge (owner override #2).

---

## 8. Pseudocode (compact reference for the Architect)

```text
// Analysis pass (once, per plane, host side):
P0_table = solve_weighted_tree over R9-B leaves                // existing machinery
e0buf    = [ v[i] - P0(i) for i in plane ]                     // reuse R14 routine
PHI      = [ phi(i) for i in plane ]                            // D=14 features (section 2.1)
theta0   = warm_start_from_ma_least_squares(PHI, e0buf)         // linear part
theta    = sgd(theta0, PHI, e0buf, iters=NRP_ITERS, ridge=lambda) // minimize sum (r0 - f)^2
theta_q  = quantize_to_i16(theta)
if ssr(PHI, e0buf, theta_q) > ssr(PHI, e0buf, zero_net):
    theta_q = zero_net                                         // byte-honest fallback
signal theta_q                                                  // H*(D+1)+(H+1) i16, bounded

// Per-pixel coding loop (encoder AND decoder, identical):
for i in raster:
  n = neighbors(recon, x, y)
  e0_L = recon[L]-P0(n_L); e0_T, e0_TL, e0_TR similarly          // decode-available
  phi  = [L,T,TL,TR, e0_L,e0_T,e0_TL,e0_TR, e0_L-e0_TL, e0_T-e0_TR,
          e0_TL-e0_TR, (e0_L+e0_T)>>1, (L-T), GAP_blend]          // D=14
  f    = nrp_forward(phi, theta_q)                               // integer MLP, identical both sides
  if encoder: epsilon = (v[i] - P0(i)) - f ; emit zigzag(epsilon)
  if decoder: epsilon = unzigzag(read()) ; v[i] = P0(i) + f + epsilon
  recon[i] = v[i] ; e0buf[i] = v[i] - P0(i)                       // for later pixels
```

- Dr. Mob, the Researcher
