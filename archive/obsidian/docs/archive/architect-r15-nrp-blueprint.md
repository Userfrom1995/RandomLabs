# Obsidian - Architect blueprint R15: per-image learned neural residual predictor (NRP) for the JPEG XL 8.71 gate

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-20
- **Mode:** `/oc architect` on PR #93 (existing build). Companion to `docs/research-r15-learned-neural-residual-predictor.md` (Dr. Mob, 2026-08-20) and `docs/architect-r14-rcct-ma-blueprint.md` (R14 now built and measured: **9.66 bpp, net-negative**, the 9th exhausted axis). The nine exhausted axes are catalogued in the R15 research spec, section 5.
- **Action:** `build` (the Builder implements R15 base - a single-hidden-layer integer MLP residual overlay - on the untransformed stream, re-measures REAL Kodak, then adds R15-B, the existing R14 RCCT stacked on the net's residual, only if base R15 lands ~9.0-9.3 bpp).

---

## 0. Executive summary

The +0.8108 bpp gap to JPEG XL (8.71) at the codec's 9.5209 bpp is a **structural ceiling of the single-pixel / piecewise-linear predict-and-code family**, confirmed by **nine** independent, real-measured Builder axes. R14 was the correct *functional form* (a residual model conditioned on the decode-available neighbor base-errors `e0`), but the **wrong parameterization**: a depth-6 decision tree needs ~2.8 KiB/plane and reduced the residual only 1-12%, so its byte cost exceeded its savings and the never-expand net correctly rejected it.

R15 keeps R14's correct signal (`e0`) and switches to a **continuous, globally-shared non-linear** residual model: a small integer multilayer perceptron (MLP). A 1-hidden-layer net with `H=8..16` neurons has a constant `O(H*D)` weight count (97-193 `i16` values, ~194-386 bytes/plane), roughly **7x to 16x fewer bytes** than R14's tree for a comparable or better fit. That parameter-efficiency ratio is the hypothesis that flips R14's verdict: the same SSR reduction that cost R14 ~2.8 KiB/plane should cost R15 ~0.2-0.4 KiB/plane, so bytes-saved finally exceed bytes-spent.

**Crucial architectural decision (inherited from R14):** R15 is a **residual-model overlay** on the existing per-context pixel predictor `P0` (today GAP / R9-B `WeightedTree`). It does NOT replace `P0` and does NOT touch the entropy backend. The single coding-loop change is `r = (v - P0) - f_theta(phi)` instead of `r = v - P0`; the entropy backend codes the smaller `r` unchanged. The decoder reconstructs `v = P0 + f_theta + r`. All eight backends keep working with a one-line overlay, and R15 is an orthogonal, stackable layer over the production codec.

**Strict superset / never-regress proof:** set every weight and bias to `0`. Then `sigma(0)=0`, so `f_theta = 0` for every pixel, `r = r0`, and the stream is byte-identical to the current codec. Any non-trivial fit only lowers residual variance (that is what training maximizes), so the never-expand net plus per-plane model-byte accounting accept R15 only when it strictly lowers total bytes. No regression can ship.

**Target:** `< 8.71` bpp on REAL 24-image Kodak at effort 4. Realistic landing `9.1-9.4` (a `0.1-0.4` bpp reduction); `< 8.71` is the gate. **Definitive halt/repivot trigger:** if R15 is also net-negative on REAL Kodak (the never-expand net rejects it, production unchanged at 9.5209), the predictor family is exhausted and the correct action is a recommended halt/repivot to the owner - not another predictor tweak (R15 research spec, section 5.3).

---

## 1. The decode-available signal and the `e0buf` front-end (reused from R14)

R14 already implemented the infrastructure R15 needs. In `predict.rs`, `rcct_apply` / `rcct_compute_pred` (lines ~863-935) read the four decode-available base errors `e0[L],e0[T],e0[TL],e0[TR]` from the per-plane `e0buf` (already stored for every causal neighbor by the encoder at `encoder.rs:1318-1941` and the decoder at `decoder.rs:261-959`) and build the `K=10` property vector via `rcct_properties`. The same `e0buf` buffer, the same border-0 reads, and the same `rcct_properties` routine are reused verbatim by R15 - they are entirely backend-agnostic and side-effect free. R15 only (a) widens the feature vector to `D=14` by appending the four raw centered causal pixels, and (b) replaces the tree traversal `rcct_predict` with the continuous `nrp_forward`.

`r0[i] = v[i] - P0(i)` is computed identically by encoder and decoder; `e0buf[idx]` is stored as `r0` after reconstruction on both sides (border reads = 0). The decode-consistency lemma (R14 blueprint, section 1) therefore holds identically for R15: the net reads only `e0`, never a neighbor's `f_theta`, so there is no circularity and the forward pass is bit-exact by induction exactly like R14's `rcct_predict`.

---

## 2. R15 data structures (`predict.rs`, new `nrp` section)

Add a new section after the R14 `rcct` block (~`predict.rs:1155`):

```rust
// ===== R15: per-image learned neural residual predictor (NRP) =====

/// Hidden-layer width (compile-time). Research default 8; raise to 16 only if the
/// shallow net plateaus. The full weight count is `H*(D+1) + (H+1)` i16 values.
pub const NRP_H: usize = 8;
/// Input feature dimension (see `nrp_features`, section 2.1).
pub const NRP_D: usize = 14;
/// Right-shift applied to the hidden activation so it stays a cheap integer tanh-ish
/// and weights live near unity scale (mirrors `RCCT_SHIFT`).
pub const NRP_ACT_SHIFT: u32 = 4;
/// Right-shift applied to the final output sum so `f_theta` lands in the residual
/// magnitude range (mirrors `R13_OUT_SHIFT`).
pub const NRP_OUT_SHIFT: u32 = 8;
/// Clamp bound on the clamped hidden activation `sigma(z)`.
pub const NRP_ACT_CLAMP: i32 = 1 << (NRP_ACT_SHIFT + 3); // ~128 in pre-shift units

/// A complete per-plane NRP: integer 1-hidden-layer MLP weights, all `i16`.
/// `W` is the flat hidden weight matrix `[h*D + d]`; `w_out[h]` is the output weight
/// of hidden neuron `h`; `b[h]` is the hidden bias of neuron `h`; `b_out` is the
/// final bias. A zero net (all `0`) yields `f_theta = 0` => byte-identical to base.
pub struct NrpNet {
    pub w: Vec<i16>,      // NRP_H * NRP_D
    pub w_out: Vec<i16>,  // NRP_H
    pub b: Vec<i16>,      // NRP_H + 1 (b_out is last)
}
```

### 2.1 Feature vector `phi` (decode-available, superset of `rcct_properties`)

Reuse `rcct_properties` to obtain the `K=10` base properties, then append the four raw centered causal pixels. Add:

```rust
/// Build the R15 `D=14` input vector from the decoded neighborhood. Reuses the
/// R14 `K=10` properties, then appends the four raw centered causal pixels
/// `(L-2048, T-2048, TL-2048, TR-2048)`. All entries are pure functions of already
/// decoded samples + `e0buf`, identical on both sides. `D` is a compile-time const.
pub fn nrp_features(nb: &Neighbors, e0: &[i32; 4], g1: i32, g2: i32, g3: i32) -> [i32; NRP_D] {
    let p = rcct_properties(nb, e0, g1, g2, g3); // [0..10]
    let mut v = [0i32; NRP_D];
    v[0..10].copy_from_slice(&p);
    v[10] = (nb.l as i32) - 2048; // center u16 pixels near 0
    v[11] = (nb.t as i32) - 2048;
    v[12] = (nb.tl as i32) - 2048;
    v[13] = (nb.tr as i32) - 2048;
    v
}
```

### 2.2 Integer forward net (no float, no per-pixel allocation)

```rust
/// Integer MLP forward pass. `sigma(z) = clamp(z >> NRP_ACT_SHIFT, -CLAMP, CLAMP)`.
/// `f = (b_out + sum_h w_out[h]*sigma(b_h + sum_d W[h*D+d]*phi[d])) >> NRP_OUT_SHIFT`,
/// clamped to the plane range. Deterministic, side-effect free => identical both sides.
pub fn nrp_forward(net: &NrpNet, phi: &[i32; NRP_D], range: PlaneRange) -> i32 {
    let mut hidden = [0i32; NRP_H];
    for h in 0..NRP_H {
        let mut acc: i64 = net.b[h] as i64;
        for d in 0..NRP_D {
            acc += (net.w[h * NRP_D + d] as i64) * (phi[d] as i64);
        }
        let shifted = acc >> NRP_ACT_SHIFT;
        let c = shifted.max(-NRP_ACT_CLAMP).min(NRP_ACT_CLAMP);
        hidden[h] = c;
    }
    let mut out: i64 = net.b[NRP_H] as i64; // b_out
    for h in 0..NRP_H {
        out += (net.w_out[h] as i64) * (hidden[h] as i64);
    }
    let half = 1i64 << (NRP_OUT_SHIFT - 1);
    range.clamp(((out + half) >> NRP_OUT_SHIFT) as i32)
}
```

### 2.3 Overlay helpers (mirror `rcct_apply` / `rcct_compute_pred`)

Add `nrp_apply` (encoder) and `nrp_compute_pred` (decoder) that read the four `e0buf` neighbor errors exactly like `rcct_apply` (lines 863-895), call `nrp_features` + `nrp_forward`, and return `r0 - f` / `f` respectively. The `e0buf[idx] = r0` store is unchanged and stays the caller's responsibility (after the neighbor reads), identical to R14.

### 2.4 Generic MA least-squares reused as the warm start

R14 already generalized the R13 solver into `solve_ma_least_squares<const D: usize>` (`predict.rs:943`). R15 calls it with `D = NRP_D` over the linear part (`phi` is the design matrix, target is `r0`) to obtain the best linear fit; that becomes the warm-start for the non-linear correction and bounds training iterations.

---

## 3. The NRP builder (`model.rs`, analysis pass)

### 3.1 Where it fits

Add `pub nrp: Option<Vec<Option<NrpNet>>>` to `ModelConfig` immediately after the `rcct` field (`model.rs:189`), and a `ModelConfig::nrp_for(band, parent_plane) -> Option<&NrpNet>` accessor mirroring `rcct_for` (`model.rs:261`).

In the analysis/candidate path, mirror `build_rcct_trees` (`model.rs:1118`): when R15 is enabled (effort >= `NRP_EFFORT` AND the opt-in seam, OR forced via `OBSIDIAN_R15_FORCE`), for each plane compute `r0[i] = v[i] - P0(i)` over the whole plane (reuse `collect_rcct_r0` in the encoder / the same `predict_clamped` call used in the analysis cost loop), build the `phi` matrix, and call `build_nrp_nets`.

### 3.2 `build_nrp_nets` (per plane, host side)

`build_nrp_nets(planes, r0s, ranges, dims, parents, model) -> Vec<Option<NrpNet>>` (signature twin of `build_rcct_trees`, `model.rs:1118`):

1. For each plane, build `phi[i] = nrp_features(nb(i), e0(i), g1,g2,g3)` for all pixels (reuse the same `Neighbors` construction `build_rcct_trees` uses at `model.rs:1154`).
2. **Warm start:** `theta0 = solve_ma_least_squares::<NRP_D>(phi, r0)` -> store the linear part across `W`/`w_out`/`b` so the net begins at the best linear fit.
3. **Train:** fixed-budget SGD minimizing `L(theta) = sum_i (r0[i] - f_theta(phi(i)))^2 + lambda*||theta||^2` with ridge `lambda` (tiny, scaled to mean diagonal like `predict.rs:666`). `NRP_ITERS` default `150`. For Kodak `N~4e5`, `H=8`, `D=14`: ~`7e9` MACs, a few seconds in Rust, within effort-4 (comparable to the existing R9-B least-squares pass).
4. **Quantize** weights to `i16` (round, clip) and evaluate SSR at `i16` precision: `SSR_quant = sum_i (r0[i] - nrp_forward(theta_q, phi(i)))^2`.
5. **Byte-honest gate (the fix for R14's missing weight-level gate):** keep `theta_q` only if `SSR_quant <= SSR_base` (the depth-0 zero net's SSR, which equals the raw `r0` energy). Otherwise emit the depth-0 zero net (`w/w_out/b` all `0`) for that plane. This guarantees R15 can only ship when the *quantized* net actually lowers the residual - exactly the condition the never-expand net later double-checks on real bytes.

### 3.3 Serialization (append LAST, legacy-safe)

In `write_model` (`model.rs:1478`), append AFTER the `rcct` block the NRP block, mirroring the `transform_kind` -> `rcct` append sequence:

```
[nrp_flag: u8]                       // 1 if any plane uses NRP
  per plane:
    [plane_flag: u8]                 // 1 if this plane has a net
      [H: u8][D: u8]                 // echo dimensions (guards future widening)
      for h in 0..H:  [D x i16 LE]   // W[h][d]
      [H x i16 LE]                   // w_out[h]
      [(H+1) x i16 LE]               // b[h] (b_out last)
```

Model-byte budget: `NRP_H*(NRP_D+1) + (NRP_H+1)` i16 = `97` i16 (`H=8,D=14`) = `194` bytes worst case/plane; `H=16` = `386` bytes. Enforce the existing `MODEL_SIZE_FRACTION` guard (`encoder.rs:43`, already protecting R9-B/R14) around the NRP candidate. `read_model` (`model.rs:1942`) reads this trailing block; a legacy stream has none, so `nrp = None` and the coding loop takes the base path - byte-identical decode for every non-NRP stream.

---

## 4. Coding-loop integration (`encoder.rs` / `decoder.rs`) - the one-line overlay

The R14 overlay is already threaded into every backend branch via `rcct_overlay` (`encoder.rs:1318-1941`) and `rcct_decoder_pred` (`decoder.rs:261-959`), each reading `e0buf` and returning `r0 - r_pred` / `r_pred`. R15 replaces these two helpers with `nrp_overlay` / `nrp_decoder_pred` that call `nrp_features` + `nrp_forward` instead of `rcct_properties` + `rcct_predict`. The `e0buf[idx] = r0` store line in every branch is **unchanged**. Concretely:

- **Encoder:** at each branch where today `let r = rcct_overlay(model, pi, parent, r0, &nb, &e0buf[pi], …)` is called, switch the helper to `nrp_overlay`. `nrp_overlay` returns `r0 - nrp_forward(net, phi)` when `model.nrp_for(pi, parent)` is `Some`, else `r0`.
- **Decoder:** at each branch where today `let r_pred = rcct_decoder_pred(model, pi, band, &nb, &e0buf, …)` is called, switch to `nrp_decoder_pred`, which returns `nrp_forward(net, phi)` when `Some`, else `0`. Reconstruction `v = pred + r_pred + r` is unchanged and exact by induction.

Because `phi` is a pure function of decoded samples + `e0buf` and `nrp_forward` is deterministic and parameter-free (weights come from the signaled model), encoder and decoder compute the identical `f_theta` per pixel. The decoder's `e0buf[idx] = v - pred` equals the encoder's `r0` (identical reconstruction), so all future neighbor reads match. Bit-exact lockstep holds with zero online state.

---

## 5. Selection / never-expand net

R15 is a per-plane candidate in the existing never-expand machinery, exactly like R14. In the analysis/candidate evaluation, when R15 is enabled, build the net and measure the plane's **total** bytes (residual stream + the NRP block's serialized bytes, already counted in the model section). Keep R15 for the plane only when `total_nrp <= total_base`. Because the depth-0 zero net == base (identical residual AND zero model bytes), R15 can only win when strictly smaller; the `MODEL_SIZE_FRACTION` guard additionally drops it if model overhead is disproportionate. Per-image auto-selection is preserved; when R15 is OFF the codec is byte-identical to the current 9.5209 bpp.

Selection is on **actual coded bytes** (residual stream + model), NOT on a training-SSR proxy - this is the explicit fix for the R13-A sum-of-zigzag pitfall and the reason R15 trains on SSR (section 6.4 of the research spec proves minimizing SSR minimizes near-Gaussian residual coded bytes under `H(p)+epsilon` CMARC).

---

## 6. Opt-in seam and effort gating (mirror existing seams)

- `EncodeOpts { nrp: Option<bool> }` in `encoder.rs` (`EncodeOpts`, lines 74-), threaded into the analysis/candidate path alongside `rcct`.
- `OBSIDIAN_R15_FORCE` env (`"1"`) - mirror `OBSIDIAN_R14_FORCE` (`encoder.rs:524`) - forces NRP on every plane for measurement.
- CLI `--nrp` flag in `cli.rs` (mirror `--rcct`/`--transform`/`--predictor`), setting `EncodeOpts::nrp`.
- Auto-enable in the analysis/candidate path when `effort >= NRP_EFFORT` (recommend `6`) AND the never-expand net accepts it. Default OFF at effort <= 5 so production stays on the verified 9.5209 path until R15 is measured.

---

## 7. Build order (for the Builder)

1. **`predict.rs`:** NRP section (`NRP_H/D/ACT_SHIFT/OUT_SHIFT/ACT_CLAMP`, `NrpNet`, `nrp_features`, `nrp_forward`, `nrp_apply`/`nrp_compute_pred`). Unit tests: `nrp_features_decode_available` (pure function of decoded neighborhood, no future sample; `e0` from decoded `v` equals encoder's `e0`), `nrp_zero_net_is_base` (all-zero `NrpNet` => `f=0`), `nrp_forward_deterministic` (identical output for identical input on both "sides" simulated).
2. **`model.rs`:** `nrp` field + `nrp_for` accessor; `build_nrp_nets` in the analysis/candidate path; serialize/deserialize block appended LAST; `MODEL_SIZE_FRACTION` guard; per-plane never-expand candidate eval on real bytes. Reuse `solve_ma_least_squares::<NRP_D>` for the warm start.
3. **`encoder.rs` + `decoder.rs`:** replace the two `rcct_*` overlay helpers with the two `nrp_*` helpers in EVERY backend branch (carc_lz, carc_mix, cmarc_run, cmarc_cache/plain, gr_cm, gr_lz, gr_m2, capped) - decoder mirrors encoder exactly. Add tests `nrp_lockstep_bit_exact` (encode then decode 24 Kodak + synthetic ramp/edge/noise; assert byte-identical reconstruction AND identical `f` captured both sides) and `nrp_legacy_stream_decodable` (a non-NRP stream decodes byte-identically).
4. **CLI seam:** `--nrp` + `OBSIDIAN_R15_FORCE` + `EncodeOpts::nrp`.
5. **Measure REAL Kodak (effort 4):** `benchmarks/measure_kodak.sh --effort 4`; record `benchmarks/results/2026-08-20-r15-nrp.csv`. **Target `< 9.3` bpp realistic; `< 8.71` is the gate.** Also assert `nrp_no_kodak_regression` (off = 9.5209; on = recorded) and `nrp_beats_base` on a smooth-ramp + edge synthetic image.
6. **If R15 base lands `9.0-9.3`, add R15-B:** stack the existing R14 RCCT (`model.rs::build_rcct_trees` is already implemented and gated) on the net's residual `epsilon = r0 - f` instead of on `r0`. Re-measure (`2026-08-20-r15b-stacked.csv`). The RCCT builder is revived by passing `epsilon` as its target instead of `r0` (its `rcct_properties` input is unchanged, so the tree models the smaller, smoother leftover error and finally pays back its byte cost). If base lands `> 9.3`, deepen to two hidden layers first (`NRP_H2` additive, same integer activation), selection on real bytes, before stacking.
7. Keep the never-expand net / per-image auto-selection ON as the regression guard. Judge candidates on **actual encoded bytes**, not training SSR. Report the real-Kodak number honestly at each stage.

---

## 8. Test matrix (for the Builder)

- `nrp_features_decode_available` - the `D=14` vector is a pure function of the causal decoded neighborhood (no future/uncoded sample read); `e0` from decoded `v` equals the encoder's `e0` (section 1).
- `nrp_zero_net_is_base` - an all-zero `NrpNet` yields `f = 0`, so `r = r0` and the stream equals the current codec (strict-superset contract, bit-exact).
- `nrp_warmstart_matches_linear` - warm-started net equals the MA least-squares fit on synthetic `(phi, r0)` data within ridge tolerance.
- `nrp_net_roundtrip_serialize` - `write_model`/`read_model` of an NRP-bearing `ModelConfig` round-trips to an equal net.
- `nrp_lockstep_bit_exact` - encode then decode the 24 Kodak images and synthetic ramp/edge/noise planes; assert byte-identical reconstruction AND that encoder/decoder compute the identical `f` per pixel (capture `f` both sides, `assert_eq!`).
- `nrp_beats_base` - on a smooth-ramp + edge image, R15 coded bpp `<=` base `WeightedTree` bpp (strict-superset contract).
- `nrp_no_kodak_regression` - 24-image Kodak mean `<= 9.5209` when R15 is off (guaranteed by superset) and a recorded measurement when on.
- `nrp_legacy_stream_decodable` - a stream encoded without R15 still decodes byte-identically (gated flag is backward compatible).
- Real-Kodak gate: PNG 13.05, WebP 9.61, AND JPEG XL 8.71 all beaten bit-exactly before any merge (owner override #2).

---

## 9. Why this is the genuine last predictor lever (and the halt trigger)

R14 consumed the right signal (`e0`) but in a piecewise-linear tree whose byte cost exceeded its gain. R15 keeps `e0` in a continuous, globally-shared MLP: one weight set covers the whole image, so it expresses the smooth curved residual manifold with `O(H*D)` bytes independent of how wiggly it is - the parameterization with the best chance of net-winning. It is a strict superset overlay reusing R14's entire `e0buf`/`rcct_properties` front-end and the never-expand net, so integration cost is low and regression is structurally impossible.

If R15 (the final "learned/neural" lever in the escape hatch) is measured net-negative on REAL Kodak, the predictor family is exhausted: ten axes, including the correct signal (`e0`) in both the tree and net parameterizations, have all failed to net-win. The honest close is then a Maintainer recommendation to recalibrate the 8.71 gate against a LOCO-I-class modular codec's realistic ceiling, or to commission a genuinely different codec family (VarDCT / transform-coding, or a much larger gradient-pooled MA tree in the entropy backend) - not another predictor tweak. The Researcher must not loop silently; escalating a definitive finding via the Maintainer is the correct end state (R15 research spec, section 5.3).

- the Architect
