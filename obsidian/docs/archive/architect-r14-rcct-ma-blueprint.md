# Obsidian - Architect blueprint R14: residual-conditioned context tree (RCCT) with a multiplier-additive (MA) residual model (the JPEG XL 8.71 gate)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-20
- **Mode:** `/oc architect` on PR #93 (existing build). Companion to `docs/research-r14-context-tree-ma-residual-model.md` (Dr. Mob, 2026-08-20) and `docs/architect-r13-recursive-adaptive-predictor-and-lifting-blueprint.md` (both R13-A and R13-B now built and measured: R13-A regressed under auto-select and was muted; R13-B regressed +0.65/+1.06 bpp and was gated off). The eight exhausted axes are catalogued in that research spec, section 4.
- **Action:** `build` (the Builder implements R14 base on the untransformed stream, re-measures REAL Kodak, then adds R14-B on the R13-B lifting LL band only if base R14 lands ~8.8-9.0 bpp).

---

## 0. Executive summary

The `+0.8108` bpp gap to JPEG XL (8.71) at the codec's 9.5208 bpp is a **structural architectural ceiling of the single-pixel predict-and-code pipeline**, now confirmed by **eight** independent, real-measured Builder axes (R11-D, R11-A, 64-leaf x2, R12-A, R12-B, R13-A, R13-B, the CMARC backend). Every shipped/past predictor computes the pixel prediction `P` as a (per-context) function of **neighbor pixel values and their gradient/long-range extensions**, and/or refined the entropy *context*. **None ever consumed the reconstruction residuals of the causal neighbors as predictor features, and none adaptively partitioned the residual-error space with a decision tree.**

That omission is the whole game. This blueprint specifies **R14**, a genuinely new functional form: a **residual-conditioned context tree (RCCT)** whose leaves carry a **multiplier-additive (MA) linear model of the residual**. The base predictor `P0` (the codec's existing per-context pixel predictor, today GAP / R9-B `WeightedTree`) yields `r0 = v - P0`. R14 then fits a **decision tree** (FLIF MANIAC / JXL DECICTREE style) over decode-available *properties* that include the **base errors `e0` of the four causal neighbors** plus their gradients and the pixel gradients. Each leaf holds an MA model `r_pred = a + sum_k b_k * p_k`; the coder emits the **residual of the residual** `epsilon = r0 - r_pred`, whose entropy is far lower. This is exactly the mechanism behind JPEG XL's modular mode and FLIF, and it is the only lever in the eight-axis table never instantiated.

**Crucial architectural decision (how R14 differs from a predictor replacement):** R14 is a **residual-model overlay** on top of the existing per-context pixel predictor `P0`. It does NOT replace `P0` and does NOT touch the entropy backend. In the coding loop the single change is `r = (v - P0) - r_pred` instead of `r = v - P0`; the entropy backend codes `r` (now a much smaller symbol) completely unchanged. The decoder reconstructs `v = P0 + r_pred + r`. This keeps every one of the eight entropy backends (`carc_lz`, `carc_mix`, `cmarc_run`, `cmarc_cache`, plain `cmarc`, `gr_cm`, `gr_lz`, `gr_m2`, capped rANS) working bit-exactly with a one-line overlay, and makes R14 an orthogonal, stackable layer over the production codec (independent of R13/R12, which are gated off).

**Strict superset / never-regress proof:** with a depth-0 tree (single root leaf, `a=0`, all `b=0`) `r_pred = 0`, so `r = r0` and the stream is byte-identical to the current codec. Any non-trivial tree only lowers residual variance (that is what the greedy split maximizes), so the never-expand net plus per-plane model-byte accounting accept R14 only when it strictly lowers total bytes. No regression can ship.

**Target:** `< 8.71` bpp on REAL 24-image Kodak at effort 4 (the JPEG XL gate). Build order below.

---

## 1. The missing signal and why it is decode-available (grounded)

Let `v[i]` be coded in raster order. `P0(i)` is the codec's existing per-context pixel prediction (today `predict_clamped(p, nb, wv, wtree, range)` at `encoder.rs:1081`/`decoder.rs:260` etc.). The base residual `r0[i] = v[i] - P0(i)` is computed identically by encoder and decoder (both hold `v[i]` and the deterministic `P0(i)`). At pixel `i` the four causal neighbors `L=i-1, T=i-W, TL=i-W-1, TR=i-W+1` are already decoded, so their base residuals `e0[L]=v[L]-P0(n_L)`, etc., are **simultaneously available to both sides**. `e0` at a neighbor depends only on that neighbor's decoded value and its own fixed base predictor, never on the tree's own prediction - so there is **no circularity**: the tree reads only `e0`, never a neighbor's `r_pred`.

This is the decode-consistency lemma that makes R14 lockstep-exact with zero online state.

### 1.1 The `e0buf` shared buffer (the key integration structure)

Because `r0[i] = v[i] - P0(i)` is computed for every pixel in raster order before `r0` is coded, **both encoder and decoder can store `r0` in a per-plane `e0buf: Vec<i32>` of size `width*height`** as they scan. When pixel `i` is coded, `e0buf` already contains the base residuals of every causal neighbor (`e0buf[L]`, `e0buf[T]`, `e0buf[TL]`, `e0buf[TR]`; border pixels read `0`). Thus the K=10 properties are computed in O(1) from already-stored integers - no recomputation of neighbor predictions, no circularity. The decoder stores `e0buf[idx] = v[idx] - P0(idx)` right after reconstruction, so its `e0buf` is byte-identical to the encoder's. This buffer is `O(1)` beyond the existing plane buffers.

---

## 2. R14 data structures (`predict.rs`, new `rcct` section)

Mirror the existing `R13Leaf`/`solve_r13_least_squares` location and style (`predict.rs:543-735`).

```rust
// ===== R14: residual-conditioned context tree (RCCT) with MA leaf model =====

/// Number of causal properties feeding the R14 MA leaf model (see `rcct_properties`).
pub const RCCT_K: usize = 10;
/// Total MA coefficient dimension: `RCCT_K` property weights plus one bias term.
pub const RCCT_DIM: usize = RCCT_K + 1;
/// Max tree depth for the greedy split (compile-time tunable; research default 6).
pub const RCCT_MAX_DEPTH: usize = 6;
/// Minimum pixels in a leaf before splitting is forbidden (research default 256).
pub const RCCT_MIN_LEAF: usize = 256;
/// Number of threshold candidates (quantiles of the property over the node set).
pub const RCCT_THR_CANDIDATES: usize = 16;
/// Right-shift applied to the MA dot product so stored coefficients live near unity
/// scale (mirrors `R13_SHIFT`); the leaf stores `round((a + sum b_k p_k) >> RCCT_SHIFT)`.
pub const RCCT_SHIFT: u32 = 8;

/// The signaled per-leaf MA coefficient tuple for R14: `(b0..b9, a)` in the
/// `>> RCCT_SHIFT` scaled domain, stored as `i16` (like `R13Leaf`).
pub type RcctLeaf = [i16; RCCT_DIM];

/// An internal RCCT node: split on property `prop` (0..RCCT_K) at threshold `thr`;
/// route left when `prop <= thr`, right otherwise. `le`/`gt` are child references
/// (leaf index into `leaves` if `>= RCCT_NODE_BASE`, else node index). Flattened
/// pre-order, exactly like the existing per-plane tables.
pub struct RcctNode { pub prop: u8, pub thr: i32, pub le: u32, pub gt: u32 }

/// A complete per-plane RCCT. `nodes` is the (possibly empty) internal-node list;
/// `leaves` is the leaf list. A depth-0 tree has `nodes = []` and one leaf
/// `(all-zero)` => `r_pred = 0` => byte-identical to the current codec.
pub struct RcctTree { pub nodes: Vec<RcctNode>, pub leaves: Vec<RcctLeaf> }

/// Compute the R14 property vector for pixel `i` from its `Neighbors` and the four
/// decode-available base errors `e0 = [e0_L, e0_T, e0_TL, e0_TR]` (read from `e0buf`,
/// border = 0). All ten are pure functions of already-decoded samples, identical on
/// both sides. `g1,g2,g3` are the existing `context.rs` GAP gradients
/// (`g1 = L - T`, `g2 = T - TL`, `g3 = TL - TR`) reused so the pixel-edge signal
/// matches the existing gradient context.
pub fn rcct_properties(nb: &Neighbors, e0: &[i32; 4], g1: i32, g2: i32, g3: i32) -> [i32; RCCT_K] {
    [
        e0[0],                                    // p1  e0_L
        e0[1],                                    // p2  e0_T
        e0[2],                                    // p3  e0_TL
        e0[3],                                    // p4  e0_TR
        e0[0] - e0[2],                            // p5  e0_L - e0_TL  (diagonal residual grad)
        e0[1] - e0[3],                            // p6  e0_T - e0_TR  (vertical residual grad)
        e0[2] - e0[3],                            // p7  e0_TL - e0_TR (diagonal-2 residual grad)
        (e0[0] + e0[1]) >> 1,                     // p8  (e0_L + e0_T)/2 (mean residual)
        g1,                                       // p9  L - T          (pixel edge indicator)
        (g1 + g2 + g3) >> 1,                      // p10 GAP-style pixel gradient (g1..g3 blend)
    ]
}

/// R14 leaf prediction `r_pred = clamp(a + sum b_k p_k, rmin - rmax, rmax - rmin)`.
pub fn rcct_predict(tree: &RcctTree, props: &[i32; RCCT_K], range: PlaneRange) -> i32 {
    // traverse internal nodes (if any) to the leaf, then dot the leaf MA coeffs.
    let mut node = 0usize;
    let mut is_node = !tree.nodes.is_empty();
    loop {
        if is_node {
            let n = &tree.nodes[node];
            let go_left = props[n.prop as usize] <= n.thr;
            let next = if go_left { n.le } else { n.gt };
            // encode leaf vs node via a sentinel: leaves stored after nodes with a
            // high-bit tag (RCCT_NODE_BASE). See builder note in section 3.3.
            if next & RCCT_LEAF_TAG != 0 {
                let li = (next ^ RCCT_LEAF_TAG) as usize;
                return rcct_leaf_predict(&tree.leaves[li], props, range);
            } else { node = next as usize; /* is_node stays true */ }
        } else {
            return rcct_leaf_predict(&tree.leaves[node], props, range);
        }
    }
}
```

`rcct_leaf_predict` does the clamped dot product exactly like `predict_recursive` (`predict.rs:600`).

### 2.1 Generic MA least-squares solver (reuse the R13 solve machinery)

Generalize `solve_r13_least_squares` (`predict.rs:653`) into `solve_ma_least_squares<const D: usize>(S, b) -> Option<[i16; D]>` using the same ridge-Gauss-Jordan routine (the ridge scaled to the mean diagonal, exactly as at `predict.rs:666-670`, which fixed the R13-A explosion). Call it with `D = RCCT_DIM`. Returns `None` (ill-conditioned) => the builder falls back to a zero leaf for that node.

---

## 3. The RCCT builder (`model.rs`, analysis pass)

### 3.1 Where it fits in `analyze`

`analyze` (`model.rs:330`) already fits the per-context predictor map and the `WeightedTree` table (`weighted_wc_table`) and the per-plane `P0`. After those are fit, **when R14 is enabled** (effort >= `RCCT_EFFORT` AND the opt-in seam, OR forced via `OBSIDIAN_R14_FORCE`), for each plane compute `r0[i] = v[i] - P0(i)` over the whole plane (reuse the same `predict_clamped` call already used in the analysis cost loop), then call `build_rcct`.

`build_rcct(r0: &[i32], props_fn: impl Fn(usize)->[i32;RCCT_K], range) -> RcctTree`:
1. Root node covers all pixels.
2. At a node with pixel set `S`: for each `k in 0..RCCT_K` and each of `RCCT_THR_CANDIDATES` quantile thresholds `tau` of `prop_k` over `S`, partition `S` into `S_lo = {i : prop_k(i) <= tau}` / `S_hi`, fit an MA model in each child by `solve_ma_least_squares` over the accumulated `(K+1)x(K+1)` normal equations, and compute the total child sum-of-squared-residuals `SSR`. Choose the `(k, tau)` minimizing `SSR`.
3. If the best split reduces `SSR` vs a single leaf AND `depth < RCCT_MAX_DEPTH` AND `|S| >= 2*RCCT_MIN_LEAF`, recurse into the two children; else make a **leaf** (fit MA coeffs over `S`; if `solve` returns `None`, store the zero leaf).
4. Serialize the tree as a flat pre-order node list + leaf list (section 3.3).

Complexity matches the research spec (section 5): `O(N * K * |T| * MAX_DEPTH)` analysis ops per plane, dominated by the existing R9-B least-squares pass; the per-leaf MA fit is `O((K+1)^3)` Gauss-Jordan done `<= 2^MAX_DEPTH` times. Well within effort-4 budget.

### 3.2 Per-plane `ModelConfig` field and lookup

Add to `ModelConfig` (`model.rs` near `weighted_r13_table` at line 138):

```rust
/// R14: per-plane residual-conditioned context tree with MA leaf model. `Some`
/// only when R14 is selected for the plane (effort >= RCCT_EFFORT and the
/// never-expand net accepts it, or forced). `None` on the legacy/non-RCCT path
/// so every stream without R14 decodes byte-identically.
pub rcct: Option<Vec<Option<RcctTree>>>,
```

Mirror the existing `weighted_tree_for` / `r13_table_for` accessors with `rcct_for(band, parent_plane)` returning `Option<&RcctTree>` (band-aware like `weighted_tree_for_band`, `model.rs:217`, but R14 base is untransformed so the per-plane table suffices; keep the band fallback for R14-B).

### 3.3 Serialization (append LAST, legacy-safe)

In `write_model` (`model.rs:980+`), append AFTER the R13-B `transform_kind` byte (the current last field) the RCCT block, exactly mirroring `weighted_wc_table` (`model.rs:1005`):

```
[rcct_flag: u8]                       // 1 if any plane uses RCCT
  per plane:
    [plane_flag: u8]                   // 1 if this plane has a tree
      [n_leaves: u32 LE]
      [n_nodes: u32 LE]                // = n_leaves - 1 for a full binary tree
      for each node: [prop: u8][thr: i32 LE]
      for each leaf:  [RCCT_DIM x i16 LE]   // (b0..b9, a)
```

The decoder (`read_model`, `model.rs:1340+`) reads this trailing block and reconstructs child references by **pre-order enumeration**: nodes are emitted parent-first; for node `j` its two children are the next two emitted nodes (or, if a child is a leaf, a leaf index tagged with `RCCT_LEAF_TAG = 1<<31`). The builder records `le`/`gt` as either a node index or `leaf_index | RCCT_LEAF_TAG`. A legacy stream has no such block; `read_model` defaults `rcct = None` and the coding loop takes the base path. This is byte-identical to today's decode for every non-RCCT stream.

Model-byte budget: the tree is `O(2^MAX_DEPTH)` nodes + leaves. For `MAX_DEPTH=6, K=10`: `<= 128` leaves * `11*2 = 2.8 KiB` worst case, typically far less. Enforce the existing `MODEL_SIZE_FRACTION` guard (`encoder.rs:42, 2280, 2614`): if the RCCT block would push the model section past `MODEL_SIZE_FRACTION` of the total output, drop RCCT for that plane (fall back to base). The existing guard already protects R9-B/R13 tables, so reuse it verbatim around the RCCT candidate.

---

## 4. Coding-loop integration (`encoder.rs` / `decoder.rs`) - the one-line overlay

The coding loop has a uniform shape at every backend branch (e.g. `encoder.rs:1077-1093`, `1115-1121`, `1161-1214`, `1239-1244`; `decoder.rs:258-267`, `342-350`, `387-430`, `501-514`, `670-684`, `704-720`, `739-784`, `809-832`, `889-905`): `pred` (P0) is computed, then `let r = v - pred` (encoder) / `r` is read (decoder), then `r` is fed to the entropy backend and `v = pred + r` is reconstructed.

### 4.1 Encoder overlay

Introduce a per-plane `e0buf: Vec<i32>` (size `width*height`, init 0) threaded alongside `coding_planes[pi]`. At each pixel, **after** computing `pred` and `r0 = coding_planes[pi][idx] - pred`:

```rust
let r = if let Some(tree) = model.rcct_for(pi, parent[pi]) {
    // read decode-available neighbor base errors from e0buf (border = 0)
    let e0 = [
        if x > 0        { e0buf[idx - 1] }      else { 0 },
        if y > 0        { e0buf[idx - width] }  else { 0 },
        if x > 0 && y > 0 { e0buf[idx - width - 1] } else { 0 },
        if x + 1 < width && y > 0 { e0buf[idx - width + 1] } else { 0 },
    ];
    let g1 = nb.l - nb.t; let g2 = nb.t - nb.tl; let g3 = nb.tl - nb.tr;
    let props = rcct_properties(&nb, &e0, g1, g2, g3);
    let r_pred = rcct_predict(tree, &props, ranges[pi]);
    r0 - r_pred                                  // epsilon = residual of residual
} else {
    r0
};
// ... feed `r` to the entropy backend unchanged ...
e0buf[idx] = r0;   // store base residual for future neighbors (AFTER using neighbors)
```

The `e0buf[idx]` store happens after the neighbor reads, so neighbors always see their own already-stored `r0`. This is the only change to each backend branch; `r13_predict`/`r13_adapt` and every entropy call stay exactly as they are.

### 4.2 Decoder mirror (bit-exact by induction)

In each decoder branch, after reading `r` (the coded epsilon) and computing `pred` (P0) identically:

```rust
let v = if let Some(tree) = model.rcct_for(pi, parent[pi]) {
    let e0 = [ /* same 4 neighbor reads from the decoder's e0buf */ ];
    let g1 = nb.l - nb.t; let g2 = nb.t - nb.tl; let g3 = nb.tl - nb.tr;
    let props = rcct_properties(&nb, &e0, g1, g2, g3);
    let r_pred = rcct_predict(tree, &props, range);
    pred + r_pred + r
} else {
    pred + r
};
plane[idx] = v as i16;
e0buf[idx] = v - pred;   // = r0, identical to encoder's store
```

Because `v` is reconstructed identically (the encoder stored `v = pred + r_pred + r` with the same `pred`, `r_pred`, and `r`), the decoder's `e0buf[idx] = v - pred` equals the encoder's `r0`. Both sides traverse the identical signaled tree to the identical leaf with identical properties, so `r_pred` matches; reconstruction is exact.

### 4.3 Threading `e0buf` into `code_planes` / `decode_*` 

`e0buf` is allocated once per plane in `code_planes` (`encoder.rs:920`) and in the decoder entry, passed by `&mut` into the per-pixel loops. It is NOT signaled (pure function of the decoded stream + the signaled tree), so zero model bytes beyond the tree itself.

---

## 5. Selection / never-expand net

R14 is a per-plane candidate in the existing never-expand machinery. In `analyze`/`code_planes`, when R14 is enabled, build the tree and measure the plane's **total** bytes (residual stream + the RCCT block's serialized bytes, already counted in the model section). Keep R14 for the plane only when `total_rcct <= total_base`. Because depth-0 tree == base (identical residual AND zero model bytes), R14 can only win when strictly smaller; the `MODEL_SIZE_FRACTION` guard additionally drops it if model overhead is disproportionate. This is the same regression-proofing the existing net gives R9-B/R13. Per-image auto-selection is preserved; when R14 is OFF the codec is byte-identical to the current 9.5208 bpp.

The `R13_SELECT_MARGIN` / sum-of-zigzag proxy pitfall that muted R13-A (`model.rs:548-565`) does NOT apply to R14: R14 is selected on **actual coded bytes** (residual stream + model), not on a training-RSS proxy, because the tree is built once on the analysis pass and the candidate is the real emitted size. Make the RCCT candidate evaluation use the same real-byte comparison the existing net uses for transform/entropy candidates.

---

## 6. Opt-in seam and effort gating (mirror existing seams)

- `EncodeOpts { rcct: bool }` in `model.rs` (alongside `cmarc`, `capped`, `forced_predictor`), threaded into `analyze`.
- `OBSIDIAN_R14_FORCE` env (`"1"`) - mirror `OBSIDIAN_LIFT_FORCE` / `OBSIDIAN_M3_WP` (`decoder.rs:304`) - forces RCCT on every plane for measurement.
- CLI `--rcct` flag in `cli.rs` (mirror `--transform`/`--predictor` at `cli.rs:185-234`), setting `EncodeOpts::rcct`.
- Auto-enable in `analyze` when `effort >= RCCT_EFFORT` (recommend `6`) AND the never-expand net accepts it. Default OFF at effort <= 5 so production stays on the verified 9.5208 path until R14 is measured.

---

## 7. Build order (for the Builder)

1. **`predict.rs`:** RCCT types (`RCCT_K/MAX_DEPTH/MIN_LEAF/THR_CANDIDATES/SHIFT`, `RcctLeaf`, `RcctNode`, `RcctTree`), `rcct_properties`, `rcct_predict` + `rcct_leaf_predict`, `solve_ma_least_squares<const D>` (refactor of `solve_r13_least_squares`). Unit tests: `rcct_properties_decode_available` (pure function of decoded neighborhood, no future sample), `solve_ma_least_squares_roundtrip` (fit on synthetic data reproduces residuals), `rcct_depth0_is_base` (zero leaf => r_pred 0).
2. **`model.rs`:** `rcct` field + `rcct_for` accessor; `build_rcct` in `analyze`; serialize/deserialize block appended LAST; `MODEL_SIZE_FRACTION` guard; per-plane never-expand candidate eval on real bytes.
3. **`encoder.rs` + `decoder.rs`:** allocate/thread `e0buf`; apply the overlay in EVERY backend branch (carc_lz, carc_mix, cmarc_run, cmarc_cache/plain, gr_cm, gr_lz, gr_m2, capped) - decoder mirrors encoder exactly. Add tests `rcct_lockstep_bit_exact` (encode then decode 24 Kodak + synthetic; assert byte-identical reconstruction AND identical leaf ids captured both sides) and `rcct_legacy_stream_decodable` (a non-RCCT stream decodes byte-identically).
4. **CLI seam:** `--rcct` + `OBSIDIAN_R14_FORCE` + `EncodeOpts::rcct`.
5. **Measure REAL Kodak (effort 4):** `benchmarks/measure_kodak.sh --effort 4`; record `benchmarks/results/2026-08-20-r14-rcct-ma.csv`. **Target `< 8.71` (JPEG XL).** Also assert `rcct_no_kodak_regression` (off = 9.5209; on = recorded) and `rcct_beats_base` on a smooth-ramp + edge synthetic image.
6. **If base R14 lands ~8.8-9.0 bpp:** add **R14-B** - apply R14 on the LL band of the existing (gated-off) R13-B lifting transform (`transforms.rs` `TransformKind::Lift`), cheap fixed predictor on HF bands, re-measure (`2026-08-20-r14b-lifting-rcct.csv`). R14-B is additive and gated by the same never-expand net.

Keep the never-expand net / per-image auto-selection ON as the regression guard throughout. Report the real-Kodak number honestly at each stage; a partial win is a measured milestone, not a failure.

---

## 8. Test matrix

- `rcct_properties_decode_available` - properties are a pure function of the causal decoded neighborhood (no future/uncoded sample read); `e0` from decoded `v` equals the encoder's `e0` (section 1.1).
- `rcct_depth0_is_base` - a zero-leaf tree yields `r_pred = 0`, so `r = r0` and the stream equals the current codec.
- `rcct_solve_ma_least_squares` - on synthetic `(props, r0)` data the fit reproduces `r0` within the ridge tolerance; `None` on ill-conditioned input.
- `rcct_tree_roundtrip_serialize` - `write_model`/`read_model` of an RCCT-bearing `ModelConfig` round-trips to an equal tree.
- `rcct_lockstep_bit_exact` - encode then decode the 24 Kodak images and synthetic ramp/edge/noise planes; assert byte-identical reconstruction AND that encoder/decoder traverse the identical leaf for every pixel (capture leaf ids both sides, `assert_eq!`).
- `rcct_beats_base` - on a smooth-ramp + edge image, R14 coded bpp `<=` base `WeightedTree` bpp (strict-superset contract).
- `rcct_no_kodak_regression` - 24-image Kodak mean `<= 9.5208` when R14 is off (guaranteed by superset) and a recorded measurement when on.
- `rcct_legacy_stream_decodable` - a stream encoded without R14 still decodes byte-identically (gated flag is backward compatible).
- Real-Kodak gate: PNG 13.05, WebP 9.61, AND JPEG XL 8.71 all beaten bit-exactly before any merge (owner override #2).

---

## 9. Why this closes the gate where the eight axes did not

The eight exhausted axes predicted the pixel as a function of neighbor pixel values (and/or refined the entropy context). R14 predicts the **residual** as a function of neighbor **base errors** `e0` through an **adaptive decision tree** - a different functional form that non-linearly partitions the residual-error space. `e0[L]` is a far better predictor of `e[i]` than `L` is of `v[i]` (the research spec, section 1, proves this at an edge: `e[L]` jumps sign while `L` does not). This is precisely the JXL modular / FLIF MANIAC mechanism, and it is the sole un-tried lever. Because it is a strict superset overlay on the production predictor with a real-byte never-expand net, it cannot regress - it can only win or tie, and the target is `< 8.71`.

- the Architect
