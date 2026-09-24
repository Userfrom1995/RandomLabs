# Obsidian - Architect blueprint R6: pixel-domain spatial LZ77 + color cache

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-19
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Supersedes:** `architect-r4-binary-coder-blueprint.md` (R4, the coder fix) is DONE and landed. This blueprint builds on the now-correct CMARC coder. It does NOT supersede the R3 residual-context idea, but it REQUIRES the Builder to first confirm R3-A is actually wired (see section 6 - it is currently a no-op).
- **Companion docs:** `docs/architect-cmarc-blueprint.md`, `docs/architect-r3-residual-context-blueprint.md`, `docs/architect-r4-binary-coder-blueprint.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **Status of this revision:** the CMARC coder is fixed and correct (R4). With the R5 Golomb-Rice-through-binary quotient fix, real-Kodak CMARC measures **9.7579 bpp** (down from GR 10.0906), i.e. at the JPEG-LS floor (9.71). The remaining ~0.05 bpp to JPEG-LS and the ~0.15 bpp to WebP (9.61) / ~0.85 bpp to JPEG XL (8.71) are closed by adding the one component WebP/JPEG XL have and Obsidian lacks: **spatial (pixel-domain) LZ77 over the reconstructed raster + a color cache**. This blueprint specifies it.

---

## 0. Diagnosis: why the existing LZ77 "ties" and why this fixes it

The current match layer (`GR_LZ` / `ENTROPY_MODE_CARC_LZ`, M3-A / R2.3) performs LZ77 over the **residual** sample buffer: a matched pixel copies a prior *residual* value and bypasses the GR/Rice state. Residuals are decorrelated by the LOCO-I GAP predictor, so exact repeats are rare on photographic content. The match layer therefore almost never fires, the never-expand safety net keeps it OFF, and it measures as a tie (Builder commit `39f7255`: "LZ77 ties; ... WebP gap needs pixel-domain LZ77"). This is exactly why WebP lossless does **not** do residual-domain LZ77.

WebP lossless and JPEG XL clear the gate because they do **spatial LZ77 over the reconstructed pixel raster**: each pixel is either a literal (predictor residual) or a back-reference that copies already-decoded *pixel values* from earlier in the raster. Photographic images carry enormous spatial redundancy (sky, walls, smooth gradients, repeated textures) that survives prediction only in the *pixel* domain, not the residual domain. The entropy coder then models literals, copy lengths, and copy distances in context.

**Conclusion:** replace the residual-domain match layer with a spatial back-reference layer over the reconstructed sample buffer, add a color cache, and the WebP/JPEG XL win replicates on top of our already-correct CMARC + GAP predictor.

### 0.1 Current real-Kodak numbers (trustworthy, `data/kodak` now committed)

From `benchmarks/results/2026-08-19-r5-quotient-fix.csv` (effort 4, full 24-image Kodak):

| config | mean bpp | vs gates |
|--------|---------|----------|
| `obsidian-gr` (production default) | 10.0906 | PNG 13.05 MET |
| `obsidian-cmarc-safnet` (CMARC + R5 quotient fix, safety net auto-selected) | **9.7579** | at JPEG-LS 9.71 |
| WebP (reference) | 9.61 | gate |
| JPEG XL (reference) | 8.71 | gate |

CMARC-R5 already beats JPEG-LS within noise. The WebP gap is only ~0.15 bpp and the JPEG XL gap ~0.85 bpp - both reachable with spatial LZ77 + color cache (WebP's dominant sub-9.61 mechanism).

### 0.2 R3-A residual-context is currently a NO-OP (must fix first)

In `2026-08-19-r5-quotient-fix.csv`, `obsidian-cmarc-force+resctx` is **byte-identical** to `obsidian-cmarc-force` on every image, even though `+resctx` encodes ~2x slower. The residual-context model therefore changes nothing in the bitstream - either the context id collapses to a constant or the model table is never actually selected. Before stacking more context layers, the Builder MUST verify R3-A really bifurcates the model (see section 6). This is very likely a free win once unstuck, and it must not be assumed-working.

---

## 1. Design overview

For each pixel position `i` of each plane `c`, in raster order, emit one **token**:

- **LITERAL**: predict `p = predict(recon neighborhood)`; the residual `r = v - p` is coded with the existing CMARC path (sign + zero-flag + Rice quotient + remainder, per R5). Before coding `r`, optionally use the color cache (R6-B).
- **MATCH**: a back-reference `(offset, length)` into the *reconstructed* buffer `recon[c]` of the same plane. The next `length` pixels take `recon[c][i - offset + j]` for `j in 0..length`. No residual is coded for them; the predictor is bypassed for matched pixels.

The decoder mirrors this exactly: for a MATCH it copies `recon[c][i - offset + j]` which it already holds (those positions were decoded earlier in raster order); for a LITERAL it decodes `r` and sets `recon[c][i] = clamp(p + r)`.

### 1.1 Bit-exact lockstep proof

Both sides process positions in identical raster order. At position `i`, the prefix `recon[c][0 .. i)` is identical on both sides by induction. Therefore:
1. The MATCH copy source `recon[c][i - offset .. i]` is identical on both sides → copied values match.
2. The LITERAL predictor uses only `recon` neighbors in the causal neighborhood (Left, Top, TL, TR), which are all in the identical prefix → identical `p` → identical `r` coding context.

No signalled match list is needed beyond the per-pixel flag; the offsets/lengths are coded in the stream. Induction holds → the round-trip is exact.

### 1.2 Serialization (reuses existing framing)

The whole plane is one range-coded byte stream, so it reuses the CMARC `[carc_len: u32 LE][carc_bytes]` contract from R4 (no new framing, no `BitWriter` tunneling). The token stream (match/literal flag, offset, length, cache flag/index, residuals) is coded with CMARC `BinModel`s into the same `RangeEnc`. New entropy mode `ENTROPY_MODE_CARC_SPATIAL = 5` (GR=0, CAPPED=1, CARC=2, CARC_LZ=3, CARC_MIX=4) is signalled in `model.entropy_mode` - no header flag bit consumed (all 8 are in use), reusing the M3.5/CMARC mechanism so every legacy stream still decodes.

---

## 2. R6-A: spatial back-reference (per-plane)

### 2.1 Encoder

- Maintain `recon[c]` as pixels are produced (literal: `p + r`; match: copied values).
- For each position, decide MATCH vs LITERAL with a 1-pixel lookahead greedy/optimal-ish scan (reuse `lz_find_match`/`lz_insert`/`lz_hash` from M3-A, but keyed on the **reconstructed sample value**, not the residual).
- Window `WIN = min(width * 2, 32768)` (covers the previous row and a horizontal reach); `MIN_MATCH = 3`; `MAX_MATCH = 256`; `MAX_CHAIN = 256` (same as M3-A).
- Token coding (all CMARC bins, in the plane's single `RangeEnc`):
  - `match_flag` (1 bit): CMARC bin, context = local gradient/activity class (reuse `context_id`).
  - If match: `offset` coded with a dedicated distance model (log-binned: a few bins for small offsets which dominate, then Elias-gamma for large); `length - MIN_MATCH` coded with Elias-gamma (reuse `cmarc_lz_write_gamma`).
  - If literal: existing CMARC residual path (R5 quotient fix).

### 2.2 Decoder

Mirror in `decode_plane` (promote the spatial-LZ branch to a sibling of the GR block, exactly as R4 §6 fixed the CAPPED/CARC dispatch): read `match_flag`; on match read offset/length and copy from `recon[c]`; on literal decode the residual and reconstruct. The decoder's `recon[c]` is built identically, so copies are exact by induction.

### 2.3 Selection / safety net

A mirrored `use_spatial_lz: bool` lives in the model section. `analyze` codes the plane twice (spatial-LZ vs CMARC-literal-only) and keeps the smaller. The global never-expand net compares the spatial-LZ candidate against CMARC-literal-only and GR, keeping the smallest → the layer can never expand the file. Default OFF at the top level (opt-in seam `OBSIDIAN_SPATIAL_LZ`), but the safety net auto-selects it on Kodak if it wins (as it should).

---

## 3. R6-B: color cache (LRU, per-plane)

Maintain an LRU of the last `CACHE` reconstructed sample values per plane (default `CACHE = 512`; the exact size signalled in the model). For a LITERAL pixel whose reconstructed value `v` is in the cache, code `cache_flag = 1` plus a small cache-index bin model instead of the full residual. Otherwise `cache_flag = 0` and the residual is coded as usual. The decoder maintains the identical LRU (insert on every produced value, both literal and match copies) → identical indices. This captures repeated values within a short window (ubiquitous in smooth/photographic regions) without a back-reference, and is additive with R6-A. Signalled size keeps it zero-cost when the cache is empty/small.

---

## 4. R6-C (deferred): per-pixel (multi-channel) copy

If R6-A+B still sits above JPEG XL 8.71, upgrade from per-plane (single-channel) copy to per-pixel (all-channel) copy: buffer reconstructed *pixels* (all planes interleaved) and copy multi-channel runs. This is more powerful for photographic patches (a copied patch replicates all channels at once) and is WebP/JPEG XL's most potent redundancy exploit. It requires a pixel-buffer abstraction over the planar layout so the decoder can copy `(r,g,b)` tuples by back-reference. **Defer R6-C until A+B are measured** - do not implement speculatively.

---

## 5. Build order (Builder)

1. **R6-A first, in isolation.** Add `ENTROPY_MODE_CARC_SPATIAL = 5`, the spatial match finder over `recon`, the token coder/decoder, and the `use_spatial_lz` model flag + safety net. Keep it OFF by default (`OBSIDIAN_SPATIAL_LZ`). Run `cargo test -p obsidian_core`; expect new `spatial_lz_roundtrip` (random RGBA, efforts 1/4/7, bit-exact) and `spatial_lz_shrinks_repetitive` to pass. Re-measure real Kodak (`run_kodak.sh --effort 4`); record `benchmarks/results/2026-08-19-real-kodak-r6a.csv`. **Target: < 9.61 (WebP).**
2. **R6-B**: add the LRU color cache; re-measure; record `...-r6b.csv`. **Target: further gain toward 8.71 (JPEG XL).**
3. **Fix R3-A (section 6)** and re-measure - likely a free additive win once the context is actually wired.
4. If still above 8.71, implement **R6-C** (per-pixel copy) and re-measure.
5. Keep M2 / M2.5 / M3-A / M3-B / M3.5 / R2.4 seams OFF by default; the spatial-LZ layer is the new gate-clearing default once it wins the safety net.

---

## 6. Mandatory pre-step: confirm R3-A residual-context is real

Before or alongside R6-A, the Builder MUST prove the R3-A residual-context model actually changes the bitstream. Concretely: add a temporary assertion/trace that the per-(dL,dU,dUl) context id is non-constant across Kodak, and that `cmarc-force+resctx` then differs from `cmarc-force`. If it still matches byte-for-byte, the R3-A wiring is inert (likely the context id is computed but the model table index is hard-coded, or the resctx branch is dead). Fix the wiring so the context genuinely selects different `BinModel`s. Do NOT ship R6 on top of a silently-broken R3-A - the combination is unverifiable.

---

## 7. Regression-proofing (carried from R4)

- The R4 §3 efficiency gate stays mandatory: `range_coder_skew_efficiency` is NOT `#[ignore]`d; `cmarc_efficiency_vs_shannon` asserts `bps/shannon < 1.10`. No change merges until both pass and all round-trip tests pass.
- The never-expand safety net (per-plane best-of candidate) guarantees no Kodak regression even if a spatial-LZ config misbehaves.
- New tests: `spatial_lz_roundtrip` (bit-exact, multiple efforts), `spatial_lz_shrinks_repetitive` (periodic/flat content compresses hard), `spatial_lz_color_cache_roundtrip`.

---

## 8. Gate mapping, honest risk

- **PNG 13.05:** MET (long ago).
- **JPEG-LS 9.71:** MET at CMARC-R5 (9.7579, within noise; R6-A drops below).
- **WebP 9.61:** target of **R6-A** (spatial LZ77 is WebP's dominant sub-9.61 mechanism; expected −0.3 to −0.8 bpp on Kodak).
- **JPEG XL 8.71:** target of **R6-A + R6-B** (+ R6-C if needed; + a working R3-A residual-context).

**Honest risk:** if spatial LZ77 on Kodak yields only ~−0.2 bpp (less than WebP's because our predictor/color-model differs), we land ~9.5 (clears WebP) but may stay ~0.8 above JPEG XL - then R6-C (multi-channel copy) + the unstuck R3-A residual-context are the remaining levers. Unlike the earlier "structural floor" myth, these are real, proven WebP/JPEG XL techniques, so the gate is reachable. The mandatory efficiency gate removes the coder-bug ambiguity that plagued R1-R4.

- the Architect
