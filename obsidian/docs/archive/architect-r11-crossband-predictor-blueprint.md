# Obsidian - Architect blueprint R11: cross-band in-loop predictor for Squeeze HF sub-bands (JPEG XL gate)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-19
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Companion docs:** `docs/architect-r10-squeeze-cfl-blueprint.md` (active track; R10-A Squeeze + R10-B CFL), `docs/architect-r9-spatial-lz-weighted-predictor.md`, `docs/architect-r7-weighted-predictor-blueprint.md`, `docs/architect-r4-binary-coder-blueprint.md`, `progress/68-obsidian-lossless-image-codec.md`, and the Builder escalation `decisions/builder/2026-08-19-squeeze-inert-needs-crossband-predictor.md`.
- **Status incoming:** best config = **9.5208 bpp** real Kodak (effort 4, 24-image `data/kodak` committed) via R9-B (`WeightedTree`, id 18) + R10-A Squeeze + R10-B CFL. PNG 13.05 MET; WebP 9.61 MET (cleared by R10-A); **JPEG XL 8.71 = 9.5208 (+0.81 bpp, NOT MET)**. R10-A Squeeze is currently **inert** (the never-expand safety net discards it because it expands the file on every Kodak image: forcing Squeeze level 1 on kodim01 adds ~91 KB). CFL (R10-B) is the only R10 component that helps (~0.5 bpp); Squeeze, run mode, LZ77, color cache, context mixing are all inert/regressive on photographic Kodak and correctly dormant behind the never-expand net.

---

## 0. Root cause (why Squeeze is inert) - confirmed against the code

`transforms.rs::squeeze` computes each HF band as a residual against the **average of two co-located LL samples**:

```
pred_hl = (LL[i,j] + LL[i,j+1]) >> 1 ;  HL_res = HL - pred_hl
pred_lh = (LL[i,j] + LL[i+1,j]) >> 1 ;  LH_res = LH - pred_lh
pred_hh = (LL[i,j]+LL[i+1,j]+LL[i,j+1]+LL[i+1,j+1]) >> 2 ;  HH_res = HH - pred_hh
```

Then `code_planes`/`decode_planes` code each sub-band as an **independent plane**: `neighbors(&coding_planes[pi], x, y, width, height)` reads only the band's own (decimated) in-band causal neighbors `L, T, TL, TR` (the Builder escalation: "that predictor only sees in-band neighbours (again 2-away)").

So the in-loop predictor for `HL_res` sees `HL_res[i-1,j]`, `HL_res[i,j-1]`, `HL_res[i-1,j-1]` - which are **themselves first-difference residuals at half resolution**, not the actual signal. It cannot model `HL_res = actual_odd_pixel - avg(even_neighbors)`, because it never observes `LL[i,j]` / `LL[i,j+1]` - the two values that bracket the HF sample.

Concretely: for a smooth signal `HL = a*i + b`, `LL[i,j] = 2a*i + b`, `LL[i,j+1] = 2a*(i+1) + b`, so `avg = 2a*i + a + b = HL[i,j]` --> `HL_res = 0` (linear signal). For a **curved** signal, `HL_res` equals the *second difference* (curvature) of the original, which is small. But the in-loop predictor, denied the LL samples, can only see the first-difference residuals and re-predicts them at the 2-away grid - so it pays roughly the *first-difference* entropy. That is exactly the ~85 KB/band the Builder measured (`decisions/builder/2026-08-19-squeeze-inert-needs-crossband-predictor.md`).

The Builder's attempted fix ("blend the LL band with the HF band's own reconstructed causal neighbours") failed because it referenced **in-band HF neighbors**, not the **co-located LL sample at the same (i,j)**. The co-located LL samples are the JPEG XL lever: giving the in-loop predictor `LL[i,j]` and `LL[i,j+1]` lets it reconstruct the linear interpolation and collapse `HL_res` to its curvature - a second-difference, dramatically smaller entropy. This blueprint delivers that reference.

---

## 1. The fix: co-located LL as an in-loop predictor input

Add the co-located LL sample(s) to the causal neighborhood used by the in-loop predictor, but **only for HF sub-bands** (plain planes and LL bands have no cross-band reference, so they behave exactly as today, guaranteeing zero regression).

### 1.1 `Neighbors` gains an `ll` field

`predict.rs`:
```rust
pub struct Neighbors {
    pub l: i32,
    pub t: i32,
    pub tl: i32,
    pub tr: i32,
    pub ll: i32,   // co-located LL sample(s); 0 when this band has no cross-band ref
}
```
- Border/legacy rule: `ll = 0` for plain bands, LL bands, and out-of-bounds co-located LL indices (mirrors the existing `T = TL = TR = 0` fallback, so encoder/decoder lockstep is exact).
- `neighbors(plane, x, y, w, h, ll_sample: i32)` takes the co-located LL sample as an explicit parameter (default `0`). Every existing caller passes `0` (no behavior change for non-HF bands).

### 1.2 New predictor `PredictorId::CrossBand = 19`

A strict superset of the bank:
```rust
CrossBand = 19,   // predict the co-located LL sample (identity on `n.ll`)
```
```rust
PredictorId::CrossBand => n.ll,
```
For a plain band `ll = 0`, so `CrossBand` predicts `0` - identical to the old behavior of not having an extra degree of freedom. Hence adding it can only **lower** residual energy per context (strict superset) and never regress.

### 1.3 `WeightedTree` (R9-B) gains `ll` as a 5th spatial weight

This is the decisive integration. Extend `WLeaf` from `(wL, wT, wTL, wTR, bias, shift)` to `(wL, wT, wTL, wTR, wLL, bias, shift)` and the least-squares solve from 5x5 to **6x6** (basis `(L, T, TL, TR, ll, 1)`). Now `predict_weighted_tree` is:

```rust
let acc = w0*L + w1*T + w2*TL + w3*TR + w4*ll + bias;
round(acc >> shift)
```

- For **plain / LL bands** the analysis pass sees `ll = 0` at every pixel, so the solver learns `w4 = 0`. The learned weights are bit-identical to today's (the `ll` column of the normal equations is all zeros) -> **zero regression on existing streams**.
- For **HF bands** the solver now has the co-located LL as a regression input and will learn the weights that model `HL_res ≈ f(ll_left, ll_right, in_band_history)`. Because the co-located LL samples bracket the HF pixel, the learned prediction captures the local slope and collapses `HL_res` to its curvature.

`PREDICTOR_COUNT` becomes `20`. All prior ids preserved; id `19` only appears when `analyze` (effort >= 4) selects `CrossBand` or a `WeightedTree` leaf exploits `ll`. Legacy streams (which never signal HF bands) decode exactly as before.

### 1.4 Decoder/encoder lockstep

The co-located LL sample is **fully determined by already-decoded data** (the LL subtree precedes its HF bands in post-order), so the decoder reconstructs it identically to the encoder with zero signaled bytes. This preserves the bit-exact induction invariant used by every other stage.

---

## 2. Threading the co-located LL into the band loop

The current `build_banded` (encoder.rs:1558) produces `banded: Vec<Vec<i16>>`, `dims: Vec<(usize,usize)>`, `parent: Vec<usize>` in post-order. We add a parallel `band_ll: Vec<Option<(usize ll_idx, usize ll_w)>>` describing, for each HF band, where to read its co-located LL plane from.

### 2.1 Encode side (knows everything up front)

During `build_banded`, for each squeezed original plane, after `squeeze` returns the post-order bands, we precompute for every HF band its **reconstructed co-located LL plane buffer** `Vec<i16>` (dims = the HF band's own `w x h`) and stash it in `band_ll_data[pi] = Some(ll_plane)`. The co-located LL plane for an HF band at recursion depth `d` (top split = depth 0) is the LL sub-band one level coarser, reconstructed from the original plane by `d+1` decimations; equivalently it is `unsqueeze` of the LL subtree that precedes this HF band. Both are computable from the source plane without any decoded data, so encode precomputes it once.

### 2.2 Decode side (streaming, reconstructs as it goes)

Bands arrive in post-order, so when the decoder reaches an HF band its co-located LL subtree has **already been decoded and reconstructed**. The decoder maintains a per-original-plane cache `recon_ll: Vec<Option<Vec<i16>>>` that is filled as each LL subtree completes. When an HF band at depth `d` is decoded, `band_ll[pi]` points at the cached reconstructed LL plane (the same buffer encode precomputed), which has the HF band's own `w x h`. The decoder reads `ll_sample = ll_plane[j*ll_w + i]` (bordered via the existing `ll_at` clamp) and passes it to `neighbors`.

### 2.3 Integration with `code_planes`

`code_planes` already takes `dims` and `parent`. Add one parameter:

```rust
fn code_planes(
    coding_planes: &[Vec<i16>],
    ranges, sizes, dims,
    parent: &[usize],
    band_ll: &[Option<(usize /*ll_idx*/, usize /*ll_w*/)>],   // NEW
    band_ll_data: &[Option<Vec<i16>>],                        // NEW (encoder precomputed; decoder cache)
    model, ...) -> Result<CodedPlanes, _>
```

In the per-pixel loop, replace `let nb = neighbors(&coding_planes[pi], x, y, width, height);` with:

```rust
let ll_sample = match band_ll[pi] {
    Some((ll_idx, ll_w)) => {
        let lp = &band_ll_data[ll_idx];
        let (cx, cy) = (x.min(ll_w.saturating_sub(1)), y.min(lp.len()/ll_w - 1));
        lp[cy * ll_w + cx] as i32
    }
    None => 0,
};
let nb = neighbors(&coding_planes[pi], x, y, width, height, ll_sample);
```

`analyze` (`model.rs`) builds its per-context predictor map and the `WeightedTree` tables by calling the **same** `neighbors(..., ll_sample)` on the source plane, so the learned weights and selected predictors are consistent with the coding loop (the existing lockstep contract). Plain/LL bands pass `ll_sample = 0`, so `analyze` output is unchanged for them.

### 2.4 Signaling: zero extra bytes when Squeeze is off

`ModelConfig` gains `pub hf_band: Vec<bool>` (one entry per coding band, only the `true` entries are HF bands that consult `band_ll`). Serialized in `write_model`/`read_model` **sparse**: omitted entirely when all `false` (i.e. when no plane uses Squeeze), so every legacy stream decodes identically. The decoder uses `hf_band[pi]` + the cached `recon_ll` to locate the co-located LL - no sub-band coordinates are signaled (geometry is implied by `levels` + header W/H, exactly as R10-A).

---

## 3. Never-expand net (regression-proof by construction)

The existing safety net in `code_banded` already codes each Squeeze candidate and keeps the smaller of {plain, squeezed}. R11 adds the cross-band predictor purely as an extra predictor degree of freedom inside the per-band coding loop, so:
1. For plain/LL bands `ll = 0` and the learned weights set `w4 = 0` -> identical cost to today.
2. For HF bands the cross-band `CrossBand` id and the `wLL` weight can only **reduce** residual energy (strict superset of the prior predictor set).
Therefore the never-expand net + the existing per-image auto-selection of `squeeze_levels` continue to guarantee no regression ships. Add a new safety-net probe `code_banded` variant that forces `hf_band = false` (cross-band off) and keeps whichever (squeezed-with-crossband vs squeezed-without vs plain) is smallest, mirroring the R3-A/R3-C auto-selection pattern, so a cross-band regression can never ship.

---

## 4. Build order (incremental, measured on REAL Kodak each step)

1. **R11-A (levels = 1 only):** implement `Neighbors.ll`, `CrossBand` id 19, `WLeaf` 7-tuple + 6x6 `solve_weighted_tree` + `predict_weighted_tree` extension, `band_ll`/`hf_band` threading for the single-level Squeeze case (one LL reference per HF band). Measure real Kodak effort 4; expect the previously-inert Squeeze level 1 to now **win** on most images (curvature residuals collapse). Record `benchmarks/results/2026-08-19-r11a-crossband-l1.csv`. Assert no regression (never-expand net).
2. **R11-B (general recursion):** extend `band_ll`/`recon_ll` to deeper levels (cache the reconstructed LL plane per recursion depth). Re-measure; expect the deeper Squeeze levels to compound the gain. Record `benchmarks/results/2026-08-19-r11b-crossband-deep.csv`.
3. **R11-C (analysis pass):** let `analyze` (effort >= 4) select `CrossBand` per context and let `WeightedTree` exploit `wLL`; verify the learned `w4` is non-zero only on HF bands. Re-measure. **Target <= 8.71 (JPEG XL).**
4. **R11-D (MA-tree stretch, only if still > 8.71):** fold the co-located LL sample and the weight-context `wc` (R9-B) into the CMARC quotient context for HF bands so the entropy coder itself specializes per (context, ll-quantized-class). The cross-band reference already supplies the per-band decorrelation; R11-D tightens the coder on top of it.

---

## 5. Gate map + honest risk

- **PNG 13.05:** MET (since 10.16).
- **WebP 9.61:** MET (9.5208, R10-A).
- **JPEG XL 8.71:** target of **R11-A/B/C** (cross-band in-loop predictor). High confidence: this is precisely the mechanism the Builder's escalation named as "the only path I can see to < 8.71 bpp", and it is the documented JPEG XL Squeeze edge - the HF entropy becomes a second difference (curvature) instead of a first difference. Expected ~8.6-8.9 bpp.
- **Risk (honest):** if the photographic HF residuals are dominated by genuine high-frequency detail that is NOT predictable from the local LL slope (e.g. near-random texture), the curvature residual stays large and R11 alone falls short; R11-D (MA-tree context) is the fallback. The never-expand net + per-image level selection mean the worst case is "Squeeze stays inert and the shipped number is unchanged at 9.5208" - no regression ships. The owner override forbids merge until PNG + WebP + JPEG XL are all beaten bit-exactly on REAL, durably-committed `data/kodak`.

---

## 6. Test matrix (Builder)

- `r11_neighbors_ll_default_zero` (plain band passes `ll = 0`, neighborhood identical to today).
- `r11_crossband_roundtrip_bit_exact` (synthetic gradient + edge + noise plane, efforts 0-7, Squeeze level 1-3; assert decode == original after inverse color transform + unsqueeze).
- `r11_weighted_tree_uses_ll` (solve on data `v = HL_res` where `HL_res` depends on `ll`; assert learned `w4 != 0` and the leaf reproduces `v` on training data).
- `r11_crossband_never_expands_vs_plain` (every Kodak image: the cross-band Squeeze candidate never larger than plain; `levels` stays 0 where it loses).
- `r11_wleaf_backward_compat` (a `WLeaf` with `w4 = 0` predicts identically to the old 6-tuple, so streams without cross-band decode unchanged).
- Real-Kodak gate asserts PNG + WebP + JPEG XL all beaten bit-exactly before any merge (owner override).

---

- the Architect
