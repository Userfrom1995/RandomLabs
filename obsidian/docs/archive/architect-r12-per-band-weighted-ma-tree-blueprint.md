# Obsidian - Architect blueprint R12: adaptive per-band weighted predictor + MA-tree entropy context (JPEG XL gate)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-20
- **Mode:** Mode 2 iterative enhancement on PR #93 (branch `opencode/issue68-20260818070512`).
- **Companion docs:** `docs/architect-r9-spatial-lz-weighted-predictor.md` (R9-B WeightedTree), `docs/architect-r10-squeeze-cfl-blueprint.md` (R10-A Squeeze), `docs/architect-r11-crossband-predictor-blueprint.md` (R11-D MA-tree-lite), `progress/68-obsidian-lossless-image-codec.md`, and the Builder escalation `decisions/builder/2026-08-20-predictor-context-ceiling-escalate-r12.md`.
- **Status incoming:** best config = **9.5208 bpp** real Kodak (effort 4, 24-image `data/kodak`). PNG 13.05 MET; WebP 9.61 MET; **JPEG XL 8.71 NOT MET (+0.8108 bpp)**. R11-D (`combined_ma_context(rc, gb) = (rc + gb*41) % 365`, gated behind `OBSIDIAN_CARC_MA_CTX`) is implemented, mirrored bit-exactly, and passes the 138-test suite - but the per-image never-expand net disabled it on EVERY Kodak image, so mean is unchanged at 9.5208. The Builder's own 2026-08-20 escalation (`predictor-context-ceiling-escalate-r12.md`) names the two still-absent, Architect-only levers: **(a) a weighted predictor fit PER SQUEEZE BAND in the subsampled LL domain (Obsidian fits one full-res table reused for every band), and (b) a true MA-tree entropy context whose semantics (not just width) change per band.** This blueprint delivers both.

---

## 0. Root cause (confirmed against the code)

The entropy backend is at `H(p)+epsilon` (verified by `cmarc_efficiency_vs_shannon`) and the context model is as fine as it gets (R3-A residual-DIFF + R11-D MA fold). Three independent Builder axes all failed to move the needle (R11-D MA fold wash; R11-A cross-band `wLL` wash + 45x slowdown; finer 64-leaf weight-context partition regression). The residual is now structurally set by the **predictor's functional form**, exactly as the R7-R11 blueprints predicted would be the final wall.

Two concrete structural misses, both visible in the current source:

1. **One weighted table per ORIGINAL plane, reused for every band.**
   `model.rs::analyze` (lines 287-399) iterates the *full-res* `planes` and builds, per original plane `pi`, exactly one `WLeaf[WC_LEAVES]` table (the R9-B least-squares fit). That table is then applied to every Squeeze sub-band of that plane through `model.weighted_tree_for(parent[pi])` in `encoder.rs::code_planes` (line 906) and its `decoder.rs` mirror. So the LL band (smooth, near-DC), the HL/LH bands (first-difference residuals), and the HH band (second-difference residuals) ALL share ONE full-res table that was fit on full-res pixel statistics - a single least-squares optimum averaged over regimes with completely different local structure. This is precisely the JPEG XL edge Obsidian is missing: JPEG XL fits its weighted predictor **per band / per property subtree**.

2. **One uniform MA context fold for all bands.**
   `context.rs::combined_ma_context(rc, gb) = (rc + gb*41) % 365` applies the SAME gradient bucket `gb` to every band. An LL band's residual (near-Gaussian, tiny variance) and an HH band's residual (heavy-tailed, edge-dominated) are forced into the same 365 contexts, so the per-(cid,bin) CMARC models can only specialize shallowly. The Builder's escalation is explicit: *"a true MA-tree entropy context whose semantics (not just width) change per band. The R11-D 'wider combined context' only widened, not re-semanticized, the context."*

R12 fixes BOTH. Lever A (per-band weighted predictor) is the primary, decisive one; Lever B (per-band MA-tree) is additive on the coder side.

---

## 1. R12-A - adaptive per-band weighted predictor (the PRIMARY JPEG XL lever)

### 1.1 Goal
Fit a SEPARATE R9-B WeightedTree table AND a separate per-context predictor map for each coding band, instead of one shared full-res table/map per original plane. Each band then gets the least-squares optimum for ITS OWN statistics (LL-band smoothness vs HF-band curvature).

### 1.2 Analysis refactor (one-time pass, NOT in the hot net loop)
The existing `analyze` (model.rs:247) already contains the exact machinery we need: per-leaf 5x5 normal-equation accumulation (`s_leaf`/`b_leaf`), `solve_weighted_tree`, and per-context predictor selection by summed `|r|`. The only change is the **unit of analysis**.

- Add `analyze_bands(banded_planes, banded_dims, banded_parent, ranges, context, weight_codebook, effort)` called ONCE after `build_banded` produces `banded_coding_planes` (and before the safety-net candidate loops in `code_banded`). For each band `pi` in `0..banded_planes.len()`:
  - accumulate the WeightedTree normal equations over the BAND's own `(L,T,TL,TR,1)` samples (identical to model.rs:317-348 but keyed by `pi`),
  - select the per-context predictor map from the BAND's own residuals via `neighbors(&banded_planes[pi], x, y, w, h)` + `predict_clamped` (identical to model.rs:350-391 but keyed by `pi`).
- This is O(total pixels) overall (bands partition the full image), so it does NOT reproduce R11-A's 45x slowdown. **Critical:** `analyze_bands` runs ONCE and its result is passed into every `code_planes` candidate call in the never-expand net. R11-A's slowdown came from re-running the per-band analysis *inside* each net candidate (`code_banded` -> `code_planes` x N). R12-A avoids that by computing the band model a single time up front.

### 1.3 Model storage (per-band, sparse, zero legacy impact)
- Change the meaning of `ModelConfig.weighted_wc_table` from "per original plane" to "**per band**": `Option<Vec<Option<Vec<WLeaf>>>>` indexed by band index `pi`.
- Add `ModelConfig.band_maps: Option<Vec<Vec<u8>>>` - one `context_count`-byte predictor map per band (mirrors `planes[i].map` but per band).
- For the **non-squeezed** path there is exactly one band per original plane (`pi == parent[pi]`, `squeeze_levels` all 0), so `band_maps` is `None` and `weighted_wc_table[pi]` falls back to the existing per-plane table - **byte-identical to today**, every legacy stream decodes unchanged.
- Keep `model.planes[i].map`/`weighted_wc_table[i]` as-is for the non-band path; the banded coder reads `band_maps[pi]` / `weighted_wc_table[pi]` when `band_maps` is `Some`.

### 1.4 Coding lookup change (encoder.rs + decoder.rs mirror)
In `code_planes` (encoder.rs:875) and the `decoder.rs` equivalent:
- Replace `model.predictor(parent[pi], cid)` -> `model.predictor_for_band(pi, cid)` which returns `band_maps.as_ref().map(|b| &b[pi]).unwrap_or(&model.planes[parent[pi]].map)[cid]`.
- Replace `model.weighted_tree_for(parent[pi])` -> `model.weighted_tree_for_band(pi)` returning the per-band table (or the per-plane fallback when `band_maps` is `None`).
- The spatial context `cid = cm.context_id(&nb, x, y)` is already computed per-band from the band's own neighbors, so it is already band-adaptive; only the MAP/TABLE selection becomes per-band.

### 1.5 Signaling (sparse, O(1) per band)
- In `write_model`/`read_model`: serialize `band_maps` and the per-band `weighted_wc_table` ONLY when `squeeze_levels` has any non-zero entry. For the common non-squeezed stream the fields are `None` and nothing is written - legacy decode unchanged.
- Size per band = `context_count` (map) + `WC_LEAVES * 6` (table, ~90 bytes). This is the SAME cost model as today's per-plane table, just distributed per band; far below the R7-A per-context codebook blowup (hundreds of contexts x 5 bits). The existing `MODEL_SIZE_FRACTION` guard still applies. The never-expand net keeps Squeeze (and thus R12-A) OFF unless it wins overall, so a regression can never ship.

### 1.6 Bit-exact lockstep
All per-band maps/tables are fully signaled (no online state); `neighbors`/`predict`/`predict_weighted_tree` are deterministic. The decoder reads `band_maps[pi]`/`weighted_wc_table[pi]` from the model and applies them identically. Exact mirror, same induction invariant every other stage uses.

### 1.7 Why this closes the gap
The LL sub-band is smooth: its optimal weighted predictor concentrates on `L+T` averaging with a small positive bias. The HF sub-bands are curvature/second-difference residuals: their optimal weights shift toward `TL/TR` and need a different (often near-zero or negative) bias on edges. A single full-res table blended these regimes; per-band fitting lets each get its own least-squares optimum, lowering residual energy per band. This is exactly the JPEG XL per-band decorrelation edge the Builder diagnosed as missing. **Expected: 9.5208 -> ~8.9-9.2 bpp**, the decisive step toward the 8.71 JPEG XL gate.

---

## 2. R12-B - true MA-tree entropy context with per-band semantics (SECONDARY, additive)

### 2.1 Goal
Replace the single uniform `combined_ma_context(rc, gb) = (rc + gb*41) % 365` fold with an MA-tree whose node FEATURES and QUANTIZATION differ per BAND KIND (LL / HL / LH / HH). The tree index becomes a function of a property vector whose semantics are re-semanticized per band - not merely widened.

### 2.2 Per-band property set
Define `band_ma_properties(kind, nb, d_l, d_u, d_ul, ll_slope) -> [usize; F]` where `kind ∈ {LL, HL, LH, HH}` is known at decode time from the Squeeze geometry (`squeeze_band_layout` + `banded_parent`). Feature emphasis per band kind:
- **LL** (smooth): standard gradient triple `(g1,g2,g3)` (context.rs:174-177) + activity class + the band's own `weight_context` `wc` (local orientation, predict.rs:326).
- **HL** (horizontal HF): emphasize the VERTICAL gradient `gV = T - TL` and the co-located LL vertical slope `ll_slope_v`. The HF residual here is driven by vertical structure.
- **LH** (vertical HF): emphasize the HORIZONTAL gradient `gH = L - TL` and co-located LL horizontal slope.
- **HH** (diagonal HF): emphasize the DIAGONAL gradient `gD = TL - TR` and co-located LL diagonal slope.

The co-located LL slope is the R11 cross-band reference, **repurposed here as an entropy property** (where R11-A tried it as a PREDICTOR and it washed - using it as a context feature is a different, additive, zero-speed-cost lever that re-semanticizes the MA tree per band).

### 2.3 MA-tree topology (fixed, zero signaled bytes)
A depth-3 decision tree over the per-band feature vector, producing `NTREE` leaves (e.g. 365 or 729, bounded to share the existing CMARC model without overflow). The per-band-kind feature ORDERING + quantization is a COMPILE-TIME table `MA_TREE_FEATURES[band_kind]` - no tree structure is signaled. The decoder, knowing which band it decodes, applies the same per-kind feature order, so lockstep is exact with zero model bytes. This is the "semantics change per band" the Builder demanded: the SAME 365-context budget is partitioned differently for LL vs HH because the feature priorities differ.

The tree index `ma_tree_context(properties, kind) -> usize in 0..NTREE` replaces `combined_ma_context`. It remains bounded (<= 365 or 729), so it reuses the existing CMARC model arrays.

### 2.4 Wiring + safety net
- `model.cmarc_ma_context: bool` (existing flag) stays the global opt-in. When set, `code_planes` computes the CMARC coding context for each band via `ma_tree_context(band_kind, ...)` instead of the uniform `combined_ma_context`.
- The existing R11-D per-image never-expand/auto-selection block (`code_banded`, lines 1908-1939) is reused: it codes the image twice (MA on/off) and keeps whichever is smaller per image, so R12-B can never expand the file versus the CMARC candidate it replaces.
- Keep `combined_ma_context` as the fallback uniform path (it is what the existing flag currently does); R12-B supersedes it by switching the computation to `ma_tree_context` when a `OBSIDIAN_CARC_MA_TREE` seam (default OFF, matching `carc_run`/`carc_cache`/`carc_ma_ctx` opt-in seams) is enabled.

### 2.5 Bit-exact + regression-proof
Pure function of decoded neighbors + signaled `cmarc_ma_context` flag; zero online state; decoder mirrors exactly. Strictly additive to R12-A (different layer: R12-A is the predictor, R12-B is the coder conditioning). The never-expand net guarantees no regression ships.

---

## 3. Build order (Builder)

1. **R12-A FIRST, in isolation.** Refactor analysis to fit per-band WeightedTree tables + per-band predictor maps (`analyze_bands`, one-time pass before the net); change coding lookup to `predictor_for_band`/`weighted_tree_for_band` with per-plane fallback; signal per-band tables/maps only when Squeeze present; mirror in `decoder.rs`. **Speed guard:** `analyze_bands` runs ONCE up front, not inside the `code_banded` candidate loop (this is what avoided R11-A's 45x blowup). Add tests: `r12_per_band_table_distinct_from_plane` (a synthetic plane split into Squeeze bands; assert the LL-band table != the full-res table and that per-band fit lowers summed `|r|` vs the shared table on a gradient+edge image), `r12_per_band_roundtrip_bit_exact` (efforts 0-7, Squeeze levels 1-3), `r12_no_kodak_regression` (mean <= 9.5208). Re-measure REAL Kodak (`run_kodak.sh --effort 4`); record `benchmarks/results/2026-08-20-r12a-per-band-weighted.csv`. **Target: progress toward <= 8.71; expect ~8.9-9.2 bpp.**
2. **R12-B SECOND (additive).** Implement `ma_tree_context` with per-band-kind feature tables (`MA_TREE_FEATURES`); wire into CMARC when the `OBSIDIAN_CARC_MA_TREE` seam is on; reuse the existing per-image MA auto-selection. Re-measure; record `benchmarks/results/2026-08-20-r12b-ma-tree.csv`.
3. Keep R11-D `combined_ma_context` as the uniform fallback behind the same `cmarc_ma_context` flag path, superseded by R12-B when the tree seam is enabled.
4. Keep R1-R11 seams OFF by default; the never-expand net + per-image auto-selection guarantee no Kodak regression.

---

## 4. Regression-proofing (carried from R4/R6/R9/R11)

- `cmarc_efficiency_vs_shannon` stays mandatory (`bps/shannon < 1.10`). No change merges until it and all round-trip tests pass.
- New tests: `r12_per_band_table_distinct_from_plane`, `r12_per_band_roundtrip_bit_exact`, `r12_no_kodak_regression` (mean <= 9.5208).
- Both levers are strict supersets with fully-signaled (non-online) state and per-plane/band fallback, so legacy (non-squeezed) streams decode byte-identically. The never-expand net + per-image MA auto-selection ensure no regression ships.

---

## 5. Gate mapping and honest risk

- **PNG 13.05:** MET (long ago).
- **WebP 9.61:** MET (9.5208).
- **JPEG XL 8.71:** target of **R12-A + R12-B**. R12-A (per-band weighted predictor) is the primary, most-likely-decisive lever - it removes the structural "one table for all bands" miss that the Builder's escalation named as the JPEG XL gap. R12-B (per-band MA-tree) is additive on the coder. **Confidence: high that R12-A moves the number materially (projected ~8.9-9.2); clearing 8.71 outright needs both and is the honest target.**
- **Risk (honest):** if after R12-A + R12-B we still sit ~8.9-9.0, the residual gap is even deeper (e.g. JPEG XL's full adaptive TM-WP per-pixel recursion + larger property tree), which would need a follow-on R13. Report the real-Kodak number honestly at each stage; a partial win is a measured milestone, not a failure. The owner override forbids merge until PNG + WebP + JPEG XL are all beaten bit-exactly on REAL, durably-committed `data/kodak`.

---

## 6. Test matrix (Builder)

- `r12_per_band_table_distinct_from_plane` (synthetic gradient+edge plane split into Squeeze bands; assert LL-band table != full-res table and per-band |r| <= shared-table |r|).
- `r12_per_band_roundtrip_bit_exact` (synthetic gradient/gray/solid/noisy/1x1, efforts 0-7, Squeeze levels 1-3).
- `r12_ma_tree_resemanticized_per_band` (assert `ma_tree_context` produces different context partitions for LL vs HH on identical feature inputs).
- `r12_no_kodak_regression` (24-image Kodak mean <= 9.5208).
- Real-Kodak gate asserts PNG + WebP + JPEG XL all beaten bit-exactly before any merge (owner override).

- the Architect
