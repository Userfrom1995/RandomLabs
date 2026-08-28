# Obsidian - Architect blueprint R10: JPEG XL-class Squeeze + chroma-from-luma (WebP/JPEG XL gates)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-19
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Companion docs:** `docs/architect-r9-spatial-lz-weighted-predictor.md` (active track before this), `docs/research-r9-webp-jxl-breakthrough.md` (diagnosis + stretch list), `docs/architect-r7-weighted-predictor-blueprint.md`, `docs/architect-r8-adaptive-weighted-predictor-blueprint.md`, `docs/architect-r4-binary-coder-blueprint.md`, `docs/architecture.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **Status incoming:** best config = **9.6678 bpp** real Kodak (effort 4, 24-image `data/kodak` committed) via R9-B context-tree weighted predictor (`WeightedTree`, id 18). PNG 13.05 MET; JPEG-LS 9.71 MET (9.7067); **WebP 9.61 = 9.6678 (+0.058 bpp, NOT MET)**; **JPEG XL 8.71 OPEN (+0.958 bpp, NOT MET)**. R9-A (2D spatial LZ) committed dormant (0/24 images selected by the net); R9-C (run mode) inert (forcing regresses to 9.7175). The per-pixel CMARC pipeline is already at `H(p)+epsilon` (R4 coder fixed) and the weighted-tree predictor is at the JPEG-LS floor; run/LZ/cache structural features cannot beat it on photographic Kodak because exact pixel repeats are rare and the per-pixel coder is already near-optimal.

**The remaining gap is NOT a coder or causal-predictor problem.** It is a *redundancy-class* problem: WebP and JPEG XL beat JPEG-LS on Kodak by exploiting **multi-resolution structure (Squeeze)** and **inter-channel correlation (chroma-from-luma)**, neither of which our per-pixel raster pipeline touches. Those two are exactly the mechanisms the earlier `maintainer` escalation was waiting for (the R9-C stretch list: "palette/squeeze transform, or a JPEG XL-class color/transform pipeline"). This blueprint delivers them as **R10-A (Squeeze)** and **R10-B (chroma-from-luma)**. Both reuse the entire existing CMARC + weighted-tree + R3-A + R2.1 machinery, so every prior gain compounds.

---

## 0. Reconciliation with prior work

1. **R10 does not touch the coder or the predictor.** CMARC (R4/R5), the weighted-tree predictor (R9-B), the residual DIFF context (R3-A), and the cross-channel transform (R2.1) are all kept. Squeeze and CFL are *pre-processing reorderings/decorrelations* applied to the plane samples before the existing per-plane coding loop runs. The coding loop, the `code_planes`/`decode_planes` contracts, and the never-expand safety net are unchanged in behavior - they just receive more (and smaller-magnitude) planes.
2. **Squeeze reuses `code_planes` verbatim.** Each recursion sub-band is emitted as an ordinary plane (its own width/height, its own samples) through the existing multi-plane coding path. No new entropy mode, no header flag, no predictor change. The weighted-tree predictor codes the smooth LL band near-optimally; the HF bands carry tiny residuals. This is the JPEG XL group-transform edge, expressed as "more planes."
3. **CFL is a full-res chroma pre-subtract.** It operates on the reconstructed full-resolution planes, independent of Squeeze ordering, so it composes with Squeeze transparently (CFL subtract on the chroma plane, then Squeeze; inverse Squeeze, then CFL add-back on decode).

Both stages are gated by the existing **never-expand safety net** (encoder codes the plane with and without the transform; keeps the smaller) and signaled as `squeeze_levels` / `cfl_scale` in `ModelConfig` (zero bytes when off; every legacy stream still decodes). The `data/kodak` corpus is durable, so each stage is re-measured on REAL Kodak before the next.

---

## 1. R10-A - JPEG XL-class Squeeze (recursive group transform), the WebP lever (target <= 9.61)

JPEG XL's Squeeze recursively downsamples even/odd rows and columns so that low-frequency structure is predicted from coarser levels and the residual at finer levels is far smaller in variance. Applied to our per-pixel pipeline, the LL (decimated) band is a smooth image the weighted-tree predictor handles extremely well, and the HL/LH/HH bands are small-magnitude residuals that CMARC codes cheaply. This is the single biggest JXL-specific lever and the honest path to clearing WebP 9.61.

### 1.1 Reversible integer split/predict (per plane)

For a plane `P` of size `W x H` (samples are `i16` in `[range.min, range.max]`), with `levels = L` (signaled per plane, `0` = off; cap `MAX_SQ_LEVELS = 4` or `log2(min(W,H)) - 1`, whichever is smaller; `MIN_SQ = 4` so a sub-band smaller than 4x4 stops recursing):

```
// Split into quadrants (integer, no interpolation yet):
LL(i,j) = P(2i,   2j)      // even row, even col
HL(i,j) = P(2i,   2j+1)    // even row, odd col
LH(i,j) = P(2i+1, 2j)      // odd row,  even col
HH(i,j) = P(2i+1, 2j+1)    // odd row,  odd col

// Predict each HF band from the LL band ONLY (LL is available first on decode
// because we emit LL's own bands in post-order; see 1.2). Integer interpolation,
// pure LL-based, fully reversible:
pred_HL(i,j) = (LL(i,j) + LL(i, j+1)) >> 1            // horizontal neighbor avg
pred_LH(i,j) = (LL(i,j) + LL(i+1, j)) >> 1            // vertical neighbor avg
pred_HH(i,j) = (LL(i,j)+LL(i+1,j)+LL(i,j+1)+LL(i+1,j+1)) >> 2  // 4-neighbor avg

// Store residuals (exact integers, reversible by addition):
HL_res = HL - pred_HL ;  LH_res = LH - pred_LH ;  HH_res = HH - pred_HH
```

Border rule: when an LL neighbor index is out of bounds, substitute the in-bounds one (e.g. `LL(i, j+1)` with `j+1 == w/2` -> use `LL(i,j)`); the same rule is applied identically by encoder and decoder, so lockstep holds. `>> 1` / `>> 2` are floor shifts on `i32`; residuals fit in `i16` because the HF values equal the original plane values (range-bounded) minus a nearby average, so `|residual| <= max(|range|)` and stays in `i16`.

### 1.2 Post-order flattening (the key to bit-exact decode)

We must emit LL's data BEFORE the HF residuals so the decoder has LL when it reconstructs HF. Recurse on LL first:

```
fn squeeze(plane, w, h, levels) -> Vec<SubBand> {   // SubBand = {data: Vec<i16>, w, h}
    if levels == 0 || w <= MIN_SQ || h <= MIN_SQ {
        return vec![ SubBand{ data: plane.to_vec(), w, h } ];   // leaf = whole plane
    }
    let (ll, hl, lh, hh) = split4(plane, w, h);
    let hl_res = hl - predict_from(&ll, 'H');
    let lh_res = lh - predict_from(&ll, 'V');
    let hh_res = hh - predict_from(&ll, 'D');
    let mut out = squeeze(&ll, w/2, h/2, levels-1);  // LL's bands FIRST (post-order)
    out.push(SubBand{ data: hl_res, w: w/2, h: h/2 });
    out.push(SubBand{ data: lh_res, w: w/2, h: h/2 });
    out.push(SubBand{ data: hh_res, w: w/2, h: h/2 });
    out
}
```

The decoder reads sub-bands in the same order, reconstructing with `unsqueeze` (mirror: read LL subtree first, then add predictions back to HL/LH/HH, then `combine4` into the full plane). Because the geometry (W, H, `levels`) is fully determined by the signaled `levels` and the header W/H, both sides assign decoded sub-bands to the correct slots with zero signaled sub-band metadata.

### 1.3 Integration with `code_planes` (no coder changes)

`encoder.rs::code_planes` currently takes a single global `width`/`height`. Change it to take **per-plane `dims: &[(usize, usize)]`** (one `(w,h)` per entry in `coding_planes`), and inside the per-plane loop use `dims[pi]` instead of the global `width`/`height` (the global was only used for `neighbors` and the `carc_lz` window; `carc_lz` is dormant and its window can use `dims[pi]` too). This is a small signature change; all callers (GR, CMARC, CMARC-LZ, capped) pass the per-plane dims.

The top-level `encode` builds `coding_planes` + `dims` from the original planes:
- If `squeeze_levels[pi] == 0`: push the plane as one entry `(W, H)` (unchanged behavior).
- Else: `let bands = squeeze(&plane, W, H, squeeze_levels[pi]);` push each band as its own entry with its own `(w, h)`.

`decode_planes` mirrors: it reads the same number of sub-band entries (the sub-band count is implied by `levels` + geometry; assert the count matches on decode) and reconstructs each original plane via `unsqueeze`. Luma (plane 0) is always decoded before chroma planes, which R10-B needs.

### 1.4 Never-expand net + signaling

- Encoder builds BOTH the squeezed candidate (per-plane `levels = L`) and the plain candidate (`levels = 0`), codes each, and keeps the smaller; signals `ModelConfig.squeeze_levels[pi] = L` if squeeze won, else `0`. This guarantees no regression (the property already proven for every prior stage).
- `ModelConfig` gains `pub squeeze_levels: Vec<u8>` (per plane, default `vec![0; planes]`). Serialized in `write_model`/`read_model` (sparse: only when any `L > 0`; zero bytes when all zero, so legacy streams decode identically). The `min(4)`/`MIN_SQ` bounds make the sub-band count modest (e.g. a 768x512 plane at 4 levels yields a few dozen small bands - the model/context cost is amortized over millions of pixels).

### 1.5 Build order + measure

1. `squeeze`/`unsqueeze` + `code_planes` per-plane dims + `squeeze_levels` field. Re-measure REAL Kodak (`run_kodak.sh --effort 4`); record `benchmarks/results/2026-08-19-r10a-squeeze.csv`. Assert the never-expand net keeps `levels=0` wherever squeeze loses (no regression). **Expected ~9.1-9.4 bpp, clearing WebP 9.61.**
2. Tune `levels` per plane (encoder searches 0..=max in `analyze`, keeps best); re-measure.

---

## 2. R10-B - chroma-from-luma (CFL), the JPEG XL lever (target <= 8.71)

After the color transform (YCoCg-R or subtract-green), the chroma planes still correlate with the luma plane at the same pixel. JPEG XL predicts chroma from luma (CFL). We add a per-chroma-plane scaled luma prediction, subtracted before coding and added back on decode. It is a strict superset (scale 0 = off), so it provably cannot regress.

### 2.1 Spec (full-res, independent of Squeeze)

`ModelConfig` gains `pub cfl_scale: Vec<Option<u8>>` (per plane; luma plane = `None`). The scale is a 3-bit fixed point `s in 0..=7` meaning multiplier `s/8` (so `s=0` = off, `s=7` = 7/8). Determined per plane in `analyze` by trying `s in 0..=7`, picking the one minimizing summed `|chroma - round(s*luma/8)|` (a few extra `analyze` passes over the already-transformed planes - O(N), no pixel coding).

- Encoder: after the color transform, for each chroma plane `c` with `cfl_scale[c] = Some(s)`: `plane[c][i] -= ((s as i32 * plane[0][i] as i32) >> 3)` (luma is plane 0; clamp into the plane range so residuals stay in `i16`). Then Squeeze + code.
- Decoder: decode (unsqueeze) plane 0 (luma) fully first, then decode (unsqueeze) chroma plane `c`, then `plane[c][i] += ((s * plane[0][i]) >> 3)`. Exact inverse of the encoder (integer round-trip is exact because we subtract then add the identical `round(s*luma/8)`).

Because CFL is applied in the original plane space before Squeeze, it composes with R10-A transparently and needs no sub-band correspondence logic. Signal `cfl_scale` in the model section (a couple of bits per chroma plane; zero when all `None`).

### 2.2 Build order + measure

1. `cfl_scale` field + full-res subtract/add + `analyze` search. Re-measure REAL Kodak; record `benchmarks/results/2026-08-19-r10b-cfl.csv`. Add tests `r10b_cfl_roundtrip_bit_exact` (synthetic RGB with strong chroma-luma correlation), `r10b_cfl_scale_zero_is_identity`. Assert <= 9.61 (WebP) trivially; **aim <= 8.71 (JPEG XL)**.
2. Combinatorial measure: R10-A + R10-B together on REAL Kodak; record `2026-08-19-r10ab-real-kodak.csv`.

---

## 3. R10-C (stretch, only if R10-A + R10-B still > 8.71)

- **Finer interpolation in Squeeze:** replace the simple neighbor averages with a context-weighted interpolation (e.g. gradient-adaptive: pick horizontal vs vertical avg by the local LL gradient) to shrink HF residuals further.
- **MA-tree / property-tree context model:** fold the weight-context `wc` (R9-B) and a per-band tag into the CMARC quotient context for the LL band, capturing more within-context variation.
- **Palette** (R9-C stretch): strong on repeated colors but expected inert on photographic Kodak - low priority.

Build only after R10-A + R10-B measured.

---

## 4. Gate map + honest risk

- **PNG 13.05:** MET (since 10.16).
- **JPEG-LS 9.71:** MET (since 9.7067).
- **WebP 9.61:** target of **R10-A** (Squeeze). High confidence: Squeeze is the documented JXL WebP-beating lever; our +0.058 gap is well inside the typical 0.3-0.6 bpp Squeeze gain on photographic Kodak.
- **JPEG XL 8.71:** target of **R10-A + R10-B** (Squeeze + CFL). Medium confidence: the two combined plausibly reach ~8.7-9.0; if short, R10-C interpolation/MA-tree is the fallback. The owner override forbids merge until PNG + WebP + JPEG XL are all beaten bit-exactly, so each stage re-measures on REAL, durably-committed `data/kodak`.

**Risk:** Squeeze recursion adds sub-bands with their own context tables; if a sub-band's residual is NOT smaller (e.g. on already-noisy content), the never-expand net selects `levels=0` for that plane, so no regression ships. CFL scale 0 is the identity. Both are safe by construction.

---

## 5. Test matrix (Builder)

- `r10a_squeeze_roundtrip_bit_exact` (synthetic gradient/gray/solid/noisy/1x1, efforts 0-7; assert decode == original after inverse color transform).
- `r10a_squeeze_inverse_reconstructs` (unit test of `unsqueeze` against a known small plane).
- `r10a_squeeze_never_expands_vs_plain` (every Kodak image: squeezed candidate never larger than plain; `levels` stays 0 where it loses).
- `r10a_code_planes_per_plane_dims` (assert `code_planes` accepts sub-bands of differing `(w,h)` and round-trips).
- `r10b_cfl_roundtrip_bit_exact` (synthetic RGB with strong chroma-luma correlation; assert bit-exact).
- `r10b_cfl_scale_zero_is_identity`.
- Real-Kodak gate asserts PNG + WebP + JPEG XL all beaten bit-exactly before any merge (owner override).

---

## 6. Frontend / specimen note

The existing web specimen page (`index.html` / `docs/architecture.md` web layer) should expose the Squeeze sub-band decomposition: a toggle that renders the LL band and the HL/LH/HH residual bands of a chosen plane, plus the CFL luma-predicted-vs-raw chroma residual, to visually demonstrate where the bits are saved. No new codec API is required; the specimen reads the already-serialized `squeeze_levels`/`cfl_scale` from the model section.

---

- the Architect
