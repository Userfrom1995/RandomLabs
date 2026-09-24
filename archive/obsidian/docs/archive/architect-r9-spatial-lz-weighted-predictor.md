# Obsidian - Architect blueprint R9: spatial LZ77 + context-tree weighted predictor (WebP/JPEG XL gates)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-19
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Companion docs:** `docs/research-r9-webp-jxl-breakthrough.md` (diagnosis + math), `docs/architect-r8-adaptive-weighted-predictor-blueprint.md`, `docs/architect-r6-corrected-blueprint.md`, `docs/architect-r4-binary-coder-blueprint.md`, `docs/architect-r3-residual-context-blueprint.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **Status incoming:** codec plateaued at **9.7094 bpp** on REAL Kodak (effort 4, 24 images, `data/kodak` committed). That is the JPEG-LS floor (9.71) and clears PNG 13.05. WebP 9.61 is **+0.098 bpp** away; JPEG XL 8.71 is **+0.998 bpp** away. The entropy backend (CMARC, R4 correct carryless range coder) is verified at `H(p)+epsilon`; the predictor is the proven bottleneck. R7-A (per-context LS weighted, signaled as `17+j`) **regressed** (model-byte signaling outweighed the gain). R8-A (signaling-free inverse-gradient `AdaptiveWeighted`, `PredictorId::AdaptiveWeighted = 17`) is **inert** (9.7094 -> 9.7080). The Researcher's R9 diagnosis (delivered, run `32141756980` lineage): the remaining gap is **long-range + context-tree redundancy**, not causal-predictor tuning. This blueprint translates that diagnosis into a buildable design.

---

## 0. Reconciliation with prior work (so the Builder does not re-litigate)

1. **R9-A reuses `ENTROPY_MODE_CARC_LZ = 3`, it does NOT add a mode.** The Builder proved (commit `7170586`, recorded in the corrected R6 blueprint) that `ENTROPY_MODE_CARC_LZ = 3` already performs **pixel-domain** LZ77 over the reconstructed sample buffer (decoder copies `plane[i+l] = plane[i-off+l]`). The earlier `ENTROPY_MODE_CARC_SPATIAL = 5` proposal was correctly withdrawn. So R9-A = *enhance the existing mode-3 match layer*: `MIN_MATCH` 3 -> 2, replace the 1D gamma `(offset, length)` distance with a **2D distance model**, and add color-cache competition. No new `entropy_mode` constant, no header flag.
2. **R9-B is the R7-A idea at the correct granularity.** R7-A signaled a codebook index per *coarse* LOCO-I `cid` (thousands of entries -> hundreds of model bytes/image). JPEG XL signals weights per *fine weight-context* (8-15 leaves, O(1) per plane, amortized over millions of pixels). R9-B keeps R7-A's science (per-context least-squares weights) but at the fine granularity. The `WeightVec`/`predict(Weighted, n, w)` machinery already exists; R9-B adds a per-leaf table and a new predictor id.

Both stages are gated by the existing **never-expand safety net** (encoder compares the candidate against CMARC-only and GR; keeps the smallest) so a regression can never ship. The `data/kodak` corpus is durable, so every stage is re-measured on REAL Kodak before the next stage.

---

## 1. R9-A - spatial LZ77 back-references with 2D distance + cache competition (the WebP lever, target <= 9.61)

WebP's single largest win over JPEG-LS on Kodak is its **pixel-buffer LZ77 (2D back-references + color cache)**, not its predictor. Our +0.098 bpp gap to WebP sits well inside WebP's published ~0.2-0.5 bpp LZ77 contribution. The existing mode-3 layer failed to amortize only because `MIN_MATCH=3` + a 1D gamma `offset` over-penalize the short, 2D-local repeats that dominate photographic Kodak.

### 1.1 Match finder (unchanged except `MIN_MATCH`)

`rans.rs`:
- Lower `MIN_MATCH` from `3` to `2` (`pub const MIN_MATCH: usize = 2;`). Keep `MAX_MATCH = 256`. The hash-chain finder (`lz_find_match`/`lz_insert`/`lz_hash`) already guards `i + MIN_MATCH <= area`, so it now seeds matches of length 2. The encoder keeps a 1-pixel lookahead so a length-2 match is only taken when `match_cost(2D) < 2 * literal_cost`.
- Window `W = min(width*2, 32768)`, `MAX_CHAIN` bound 64-256 (existing). Candate `p` matches if `plane[p..p+len] == plane[i..i+len]` over the already-decoded region (strictly above row, or same row left of `i`).

### 1.2 2D distance model (replaces 1D `write_match`/`read_match`)

The 1D `offset = i - match_pos` collapses the 2D locality that makes photographic repeats cheap. Replace `write_match`/`read_match` (gamma `(offset, length)`) with a **2D-coded** match descriptor:

```
// In the CMARC buffer (mode 3 already wraps matches in CMARC bins via
// cmarc_lz_write_literal / CMARC_LZ_FLAG), add:
fn cmarc_lz_write_match(rc, rcid, drow: u32, dcol: u32, length: u32) {
    // length already >= MIN_MATCH (=2). Code length-2 as a dedicated short bin
    // (no gamma symbol), length>=3 via the existing gamma/quotient helper.
    write_gamma_or_short(rc, length - MIN_MATCH as u32);   // existing gamma helper
    // 2D distance: code drow then dcol, each via a small adaptive CMARC bin
    // model keyed by a length class (so short matches get tight distance stats).
    let lc = length_class(length);                          // e.g. 0:len2, 1:3-4, 2:5-8, 3:9+
    bin_model_put(rc, BIN_DROW_BASE + lc, drow);            // 2D row delta (>=0)
    bin_model_put(rc, BIN_DCOL_BASE + lc, dcol);            // 2D col delta (>=0, < width)
}
```

- `drow = match_y - y`, `dcol = match_x - x` (both non-negative; match is in the decoded causal region). The decoder mirrors and reconstructs `match_pos = (y - drow) * width + (x - dcol)`, then copies `plane[i+l] = plane[match_pos+l]` for `l in 0..length` (bit-exact by induction; no match finder on decode).
- Bin models: add `BIN_DROW_BASE`, `BIN_DCOL_BASE` constants to the `CMARC_BIN_*` space, one adaptive `BinModel` per length class (4 classes -> 8 new bins/context, tiny). These are per-plane CMARC bins already seeded from `cmarc_priors` (the existing static-prior path), so they specialize immediately.
- The literal path (`cmarc_lz_write_literal`) and the `CMARC_LZ_FLAG` match/literal flag are unchanged. Only the *match payload* changes from 1D gamma to 2D bins.

### 1.3 Color-cache competition (reuse `ColorCache`, R6-B)

When the model flag `cmarc_use_color_cache` is set, a literal candidate competes with two match kinds. Add a 2-bin `match_kind` (spatial vs cache), then:
- spatial -> `cmarc_lz_write_match(rc, drow, dcol, length)` (section 1.2).
- cache -> `cache_flag` bin + Elias-gamma `cache_index` (rank), decoder copies `plane[i] = cache[rank]`. Reuses the existing `ColorCache` (`color.rs`), maintained identically on encoder/decoder over reconstructed samples.

This is exactly the R6-B color cache, but wired into the **match layer** (mode 3) instead of only the residual layer (mode 2), so a repeated value can be reached either by spatial copy or by cache rank - the choice the net picks is whichever is smaller. The `ColorCache` struct and its LRU semantics are unchanged; only the *reference site* expands.

### 1.4 Wiring + safety net

- `encoder.rs::code_planes` (mode-3 branch, `carc_lz == true`): build `lz_find_match` over the reconstructed buffer, choose per pixel among {literal, spatial-match, cache-match} by local cost; emit `CMARC_LZ_FLAG` + payload. The whole match layer still serializes as `[carc_len: u32 LE][carc_bytes]` (existing framing, unchanged).
- The never-expand net (existing): the `ENTROPY_MODE_CARC_LZ` candidate is compared byte-for-byte vs the `ENTROPY_MODE_CARC` (mode 2) and v1 GR candidates; the smallest is signaled in `entropy_mode`. R9-A changes only which distances the mode-3 candidate can encode, so the net still guarantees no regression.
- `decoder.rs`: the mode-3 branch already reads `entropy_mode == ENTROPY_MODE_CARC_LZ` and walks `CMARC_LZ_FLAG`; extend it to read the 2D distance + (optional) cache rank. Because decoder recomputes `match_pos` from `drow,dcol`, lockstep is exact with zero signaled match state.

### 1.5 Build order + measure

1. `MIN_MATCH = 2` + 2D distance model (no cache yet). Re-measure REAL Kodak (`run_kodak.sh --effort 4`); record `benchmarks/results/2026-08-19-r9a-2d-distance.csv`. Assert the never-expand net keeps mode 3 off unless it beats CMARC (i.e. no regression). Expected ~9.4-9.6 bpp, clearing WebP 9.61.
2. Add cache competition (`cmarc_use_color_cache` wired into mode 3). Re-measure; record `2026-08-19-r9a-cache.csv`.

---

## 2. R9-B - context-tree weighted predictor (the JPEG XL lever, target <= 8.71)

This is the genuine JPEG XL differentiator and what R7-A/R8-A were groping toward, done at the **correct granularity**. It is a strict superset of the current predictor set with **O(1) signaled model bytes** (eliminating the R7-A blowup).

### 2.1 Weight context `wc` (fine, reversible, deterministic)

`predict.rs`: define the weight context from the causal gradients, mirroring JPEG XL's `Predictor::Weighted` property bins:

```
fn weight_context(n: &Neighbors) -> usize {
    let gH = n.l  - n.tl;   // horizontal gradient
    let gV = n.t  - n.tl;   // vertical gradient
    let gD = n.tl - n.tr;   // diagonal gradient
    // Sign + 2 magnitude tiers per gradient -> 3^3 = 27 raw cells, collapsed by
    // a fixed symmetry LUT to K = 8..15 leaves (small, bounded). Keep K <= 15.
    quant3(gH) * 9 + quant3(gV) * 3 + quant3(gD)   // then LUT -> leaf in [0, K)
}
fn quant3(g: i32) -> usize { match g.unsigned_abs() { 0 => 0, a if a <= 8 => 1, _ => 2 } }
```

`weight_context` is a pure function of the already-decoded neighborhood, so it needs **no signaled bytes** and is identical on both sides. `K` is a compile-time constant (`WC_LEAVES = 15`); the table size per plane is `K` small tuples.

### 2.2 Per-leaf least-squares solve in `analyze` (O(N), closed form)

In `model.rs::analyze`, for each plane add one pass that accumulates, per `wc` leaf, the 4x4 normal-equation sums and RHS over the analysis residuals:

```
// For each pixel: n = neighbors; v = plane[idx]; pred = predict(current_best, n);
// r = v - pred is NOT used - we solve the weighted predictor directly from v and n:
//   S_wc += [[L*L, L*T, L*TL, L*TR], ...] (4x4, symmetric)
//   b_wc += [L*v, T*v, TL*v, TR*v]
// Accumulate in i64; solve w*_wc = S_wc^{-1} b_wc in fixed point.
```

Solve per leaf (4x4 inverse, or the symmetric 4x4 closed form) and quantize to `(wL, wT, wTL, wTR, shift)` with `wL+wT+wTL+wTR = 2^shift` (so `pred = (wL*L + wT*T + wTL*TL + wTR*TR + half) >> shift` is an exact bounded integer, no drift). Guard: leaves with sample count `< WC_MIN_SAMPLES` (e.g. 64) fall back to GAP weights (`wl=wt=8, wtl=wtr=0, shift=4`) so no leaf diverges.

### 2.3 Signaling (O(1) model bytes, no R7-A blowup)

`model.rs::ModelConfig`: add a new field

```
pub weighted_wc_table: Option<Vec<Vec<(i16, i16, i16, i16, u8)>>>, // [plane][K] = (wL,wT,wTL,wTR,shift)
```

Serialized in `write_model`/`read_model` (sparse: only when the `WeightedTree` predictor is selected anywhere in the plane). Size per plane = `K * 5` bytes (~75 bytes) - tiny, amortized over millions of pixels. This is the decisive difference from R7-A (which added ~hundreds of bytes/image).

### 2.4 Predictor arm (`predict.rs`)

- Bump `PREDICTOR_COUNT` 18 -> 19. Add `PredictedId::WeightedTree = 18` (free `u8`, no collision with `0..=17`).
- `predict(WeightedTree, n, w)`: `w` is `None` for the legacy `Weighted`; for `WeightedTree` ignore `w` and instead read the per-plane table passed via a new param. To keep the signature stable, add `predict_weighted_tree(id, n, table: &[(i16,i16,i16,i16,u8)])` and call it from `predict()` with the plane's table (the encoder/decoder thread the table from `ModelConfig`).
- Extend `from_u8`/`to_u8`/`name`/`predict_clamped`. `ModelConfig::predictor(plane, cid)` already returns the id; add a `predictor_tree_weights(plane) -> Option<&[...]>` accessor used by the coding loop.
- The per-context min-|r| analysis pass (`predictors_for(effort >= 4)`) adds `WeightedTree`; wherever it lowers summed `|r|` it is selected (strict superset of `AdaptiveWeighted` and the fixed bank + the per-plane `Weighted`). The decoder applies the identical deterministic function + table, so lockstep is exact (zero online state, no per-pixel signaling).

### 2.5 Residual-context fold (delta toward JPEG XL)

After R9-B measures, fold `wc` into the CMARC **quotient** context (the R3-A rule: only the quotient keys on `(rcid, wc)`, remainder stays on `(position, window)`). This lets the quotient model specialize per weight-leaf without multiplying the full table.

### 2.6 Build order + measure

1. `WeightedTree` + `analyze` solve + `weighted_wc_table` field. Re-measure REAL Kodak; record `benchmarks/results/2026-08-19-r9b-weighted.csv`. Assert <= 9.61 (WebP). Add tests `r9b_weighted_tree_beats_r8` (gradient+edge image: per-leaf LS weight beats the fixed R8-A inverse-gradient formula in L1 and in coded bpp), `r9b_weighted_tree_roundtrip_bit_exact`, `r9b_no_kodak_regression` (mean <= 9.7094).
2. Residual-context fold (`wc` into quotient). Re-measure; assert <= 8.71 (JPEG XL) if reached.

---

## 3. R9-C (stretch, only if R9-A + R9-B still > 8.71)

- **Palette:** `ModelConfig` already has a `palette: Option<Palette>` field (R4). Signal a per-plane palette; map runs of exact palette colors to indices coded by CMARC. Strong on repeated colors.
- **Squeeze transform (JXL-style):** interleaved downsampling of even/odd rows/cols to expose more spatial redundancy to LZ77 + the weighted predictor. The largest remaining JXL-specific lever.
- Build only after R9-A + R9-B measured.

---

## 4. Gate map + honest risk

- **PNG 13.05:** MET (since 10.16).
- **JPEG-LS 9.71:** MET (since 9.7067).
- **WebP 9.61:** target of **R9-A** (2D distance + MIN_MATCH=2 + cache). High confidence: WebP's published Kodak LZ77 margin (~0.2-0.5 bpp) comfortably covers our +0.098 gap.
- **JPEG XL 8.71:** target of **R9-A + R9-B** (R9-C if still short). R9-B is the real JXL differentiator; the per-fine-leaf weights capture within-coarse-context variation R8-A's single fixed formula cannot.

**Risk:**
- R9-A (low): if MIN_MATCH=2 + 2D distance still does not amortize, the never-expand net keeps mode 3 inert (no regression); R9-B is then the fallback. WebP's margin makes this unlikely.
- R9-B (medium): under-sampled leaves guarded by the GAP prior, so no leaf diverges; signaling is O(1), so no R7-A-style blowup.
- Total: clearing WebP is high-confidence via R9-A; clearing JPEG XL needs R9-B and possibly R9-C. The owner override forbids merge until PNG + WebP + JPEG XL are all beaten bit-exactly, so each stage re-measures on REAL, durably-committed `data/kodak`.

---

## 5. Test matrix (Builder)

- `r9a_spatial_lz_roundtrip_bit_exact` (synthetic gradient/gray/solid/noisy/1x1, efforts 0-7).
- `r9a_spatial_lz_2d_distance_roundtrip` (assert decoder reconstructs `drow,dcol` exactly).
- `r9a_spatial_lz_shrinks_repetitive` (screenshot/icon content; assert LZ wins vs CMARC).
- `r9a_never_expands_vs_cmarc` (every Kodak image: spatial-LZ candidate never larger than CMARC-only).
- `r9b_weighted_tree_beats_r8` (gradient+edge image: per-leaf LS weight beats fixed R8-A formula in L1 and coded bpp).
- `r9b_weighted_tree_roundtrip_bit_exact`.
- `r9b_no_kodak_regression` (mean <= 9.7094).
- Real-Kodak gate asserts PNG + WebP + JPEG XL all beaten bit-exactly before any merge (owner override).

- the Architect
