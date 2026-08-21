# Obsidian - Architect blueprint R6 (CORRECTED): color cache + quotient-context + tuned matches

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-19
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Supersedes:** `architect-r6-spatial-lz77-blueprint.md` (R6). The Builder's empirical
  finding (commit `7170586`, `decisions/builder/2026-08-19-r6a-carc-lz-already-pixel-domain.md`)
  disproved R6-A's central premise. This blueprint corrects it.
- **Companion docs:** `docs/architect-cmarc-blueprint.md`, `docs/architect-r3-residual-context-blueprint.md`,
  `docs/architect-r4-binary-coder-blueprint.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **Status:** CMARC-R5 (R4 coder fix + R5 quotient fix) measures **9.7579 bpp** mean on real Kodak
  (effort 4, 24 images), at the JPEG-LS floor (9.71). The remaining gaps: WebP 9.61 (~0.15 bpp) and
  JPEG XL 8.71 (~0.85 bpp).

---

## 0. Why the first R6 blueprint is wrong (Builder-proven)

R6-A prescribed a new `ENTROPY_MODE_CARC_SPATIAL = 5` "pixel-domain spatial LZ77". The Builder
verified this is a **functional duplicate** of the existing `ENTROPY_MODE_CARC_LZ = 3`:

- Encoder (`encoder.rs:1088-1147`): the match finder runs on `buf = &coding_planes[pi]`, the
  pixel-value coding plane; a match emits a flag + Elias-gamma `(offset, length)` and the decoder
  copies reconstructed samples.
- Decoder (`decoder.rs:517-571`): on a match it does `plane[i + l] = plane[i - off + l]`, copying
  **reconstructed pixel values** from its own already-built prefix. That is textbook pixel-domain
  spatial LZ77 (bit-exact by induction).

The earlier "ties/loses" outcome was NOT because the layer was residual-domain. It is because
**exact pixel repeats of length >= `MIN_MATCH = 3` are rare on photographic Kodak**, so the per-pixel
match-flag bin + Elias-gamma `(offset, length)` overhead cannot amortize against the already-cheap
CMARC literal. The safety net correctly refuses to ship it (forced `CARC_LZ` = 13.62 bpp on
kodim01 vs 10.42 bpp for the CMARC default).

**Conclusion:** do NOT add a second pixel-LZ mode. Keep `CARC_LZ` as the single match layer and
instead attack the components WebP/JPEG XL actually use that Obsidian lacks: a **color cache** and a
**properly-conditioned residual context**, plus a few targeted match-cost reductions.

### 0.1 R3-A is also currently inert (root-caused)

`obsidian-cmarc-force+resctx` is byte-identical to `obsidian-cmarc-force` on every Kodak image. The
cause is now clear from reading `encoder.rs`:

- The first `code_planes` call (line 515) runs with `model.cmarc_residual_ctx = false` (line 487:
  `opts.cmarc_residual_ctx.unwrap_or(false)` is `None` unless explicitly forced), so `coded` is
  **gradient-context** CMARC.
- The auto-selection block (line 601) then codes the residual-context version and keeps it ONLY if
  `res_total < gradient_total`. Because the extra 365-way context starves the per-`(cid,bin)` binary
  models (the magnitude decomposition already conditions each remainder bit on `(position, window)`,
  so multiplying the table by 365 buys little while costing adaptation), `resctx` measures LARGER and
  is **dropped**. The shipped stream is therefore always gradient-context CMARC. The "2x slower"
  observation is just the discarded resctx `code_planes` running and being thrown away.

So R3-A is not a free win; it currently regresses and is hidden by the never-expand net. The fix is
to condition the RIGHT bins on the residual context (section 2), not to blindly multiply context ids.

---

## 1. Component A - R6-B color cache (NEW, the primary sub-9.61 lever)

WebP/JPEG XL exploit repeated reconstructed values via an LRU **color cache**; Obsidian has none.
This is independent of the match machinery and is the most likely single R6 win.

### 1.1 Design

Maintain, per coding plane, an LRU of the last `C` reconstructed sample values (`C` signaled in the
model section, default `512`; `C = 0` disables the cache at zero cost). For each LITERAL pixel:

1. Compute the reconstructed value `v = clamp(pred + r, range.min, range.max)` (the encoder knows
   `r`; the decoder reconstructs it identically).
2. If `v` is in the cache, emit `cache_flag = 1` plus a small **cache-index** code (CMARC binary,
   log-binned by recency rank: a few bins for the most-recent entries, then a short gamma). Otherwise
   emit `cache_flag = 0` and code the residual with the existing CMARC path (R5 quotient fix).
3. Insert `v` into the LRU (evicting the oldest) on EVERY produced value (literals and match copies),
   so the encoder and decoder maintain identical cache state and identical indices by induction.

### 1.2 Bit-exact lockstep

Both sides produce `v` in identical raster order. At position `i`, the prefix `recon[0..i)` is
identical (induction), so the LRU contents are identical, so a `cache_flag = 1` emits the same index
and the decoder recovers the same `v`. No cache contents are signaled.

### 1.3 Serialization

Reuse the CMARC `[carc_len: u32 LE][carc_bytes]` contract. New entropy mode
`ENTROPY_MODE_CARC_CACHE = 6` (reusing the `model.entropy_mode` seam; all 8 GR header bits are
exhausted, so no new header flag) selects the path that includes the cache. The CMARC bin layout
per context gains two slots: `CMARC_CACHE_FLAG` (1 = cache hit) and the cache-index model region.

### 1.4 Selection / safety net

A mirrored `use_color_cache: bool` lives in the model section. `analyze` codes the plane both ways
(with and without the cache) and keeps the smaller; the global never-expand net compares the
cache candidate against CMARC-literal-only and GR, keeping the smallest. Default OFF at the top level
(`OBSIDIAN_COLOR_CACHE`), auto-selected by the net when it wins.

---

## 2. Component B - R3-A residual context, fixed (condition the QUOTIENT, not the remainder)

The residual-context idea (condition CMARC on quantized neighboring *residuals*, JPEG-LS DIFF
context) is correct in principle but currently starves the models. Fix the bin allocation:

- Keep the **remainder** bits conditioned on `(position, trailing-window)` exactly as R2 does (that
  already specializes well and must not regress).
- Condition the **quotient** (the leading-zero run of the Rice decomposition, the big-ticket bits) on
  the residual context `residual_context(d_l, d_u, d_ul)`. Use ONE geometric quotient model per
  residual-context id (the run is already a single adaptive bin per run position via `CMARC_QCAP`);
  the context selects which per-context quotient model is active. This is the faithful JPEG-LS
  mechanism: the neighbor-residual context picks the Rice `k` / error model.
- Keep `CarcCtx` (per-context EMA `k`) but let the residual context ALSO bias the active quotient
  model, so flat neighborhoods (context 0) and edge neighborhoods (other contexts) get different
  geometric shapes instead of one averaged shape.

This concentrates the 365 extra states where they pay off (the run-length distribution the context
predicts) and avoids the per-remainder starvation that made the naive version regress.

### 2.1 Verification gate (mandatory)

Add a test asserting that, with the residual context forced on, `cmarc-force+resctx` is NOW
**different** (smaller or larger, but not byte-identical) from `cmarc-force`, and that the auto
safety net MAY keep it on at least one Kodak image. If it is still byte-identical, the residual
context is still not wired (check that `model.cmarc_residual_ctx` is true during the resctx
`code_planes` call and that `cmarc_residual_context_of` is the active `rcid`). Do NOT ship R6 on top
of a silently-broken R3-A.

---

## 3. Component C - tuned match representation (the real R6-A, not a rename)

Keep `CARC_LZ`; make matches cheaper and more frequent so they can win on photos:

- **`MIN_MATCH = 2`** when a 2-pixel match costs less than two literals (flag + 2 short gamma bins <
  2 CMARC residuals); keep `MIN_MATCH = 3` otherwise. This captures the short repeats photos do have
  (e.g. constant-gradient runs of length 2).
- **2D distance model:** cluster offsets by `(row_delta, col_delta)` (vertical/horizontal repeats
  dominate in photographic gradients) and code distance via a context-modeled 2D bucket instead of the
  1D Elias-gamma, so common small offsets cost fewer bits.
- **Cache competition:** a match competes with a color-cache reference; the net keeps whichever is
  smaller per position group.
- **Honest expectation:** marginal (~0.05-0.1 bpp) on photographic Kodak because exact repeats are
  still scarce; near-constant/repetitive content gains more. This component is additive insurance, not
  the primary WebP lever.

---

## 4. Component D - R6-C multi-channel copy (JPEG XL stretch, DEFERRED)

If A + B + C still sit above 8.71, upgrade from per-plane (single-channel) copy to per-pixel
(all-channel) copy: buffer reconstructed *pixels* (all planes interleaved) and copy multi-channel runs
by a single back-reference. This replicates `(r,g,b)` in one op, WebP/JXL's strongest photographic
redundancy exploit, and requires only a pixel-buffer abstraction over the planar layout so the decoder
copies tuples. **Defer until A+B+C are measured** - do not implement speculatively.

---

## 5. Build order (Builder)

1. **Component B (R3-A fix) FIRST, in isolation.** Condition the quotient bins on the residual context,
   keep remainder on `(position, window)`. Add the verification test from section 2.1. Re-measure real
   Kodak R3-A only. **Target: <= 9.71 (JPEG-LS), ideally < 9.61 (WebP).**
2. **Component A (R6-B color cache) SECOND.** Implement the per-plane LRU + CMARC cache_flag/index +
   decoder mirror + `use_color_cache` seam + safety net. New tests: `color_cache_roundtrip`,
   `color_cache_shrinks_repetitive`. Re-measure real Kodak (`run_kodak.sh --effort 4`);
   record `benchmarks/results/2026-08-19-real-kodak-r6-colorcache.csv`. **Target: further gain toward
   8.71.**
3. **Component C (tuned matches) THIRD.** `MIN_MATCH = 2` + 2D distance model + cache competition.
   Re-measure; expect marginal on photos.
4. If still > 8.71, implement **Component D (R6-C)** and re-measure.
5. Keep M2 / M2.5 / M3-A / M3-B / M3.5 / R2.4 / CARC_LZ seams OFF by default; the never-expand net
   auto-selects winners. The net guarantees no Kodak regression even if a layer misbehaves.

---

## 6. Regression-proofing (carried from R4)

- `cmarc_efficiency_vs_shannon` stays mandatory and asserts `bps / shannon < 1.10`. No change merges
  until it passes and all round-trip tests pass.
- The never-expand safety net (per-plane best-of candidate) guarantees no Kodak regression.
- New tests: `color_cache_roundtrip` (bit-exact, multiple efforts), `color_cache_shrinks_repetitive`
  (periodic/flat content compresses hard), `r3a_residual_context_changes_stream`.

---

## 7. Gate mapping and HONEST risk

- **PNG 13.05:** MET (long ago).
- **JPEG-LS 9.71:** at CMARC-R5 (9.7579). Component B should reach or under it.
- **WebP 9.61:** target of **Component B + Component A**. Realistic: color cache is WebP's dominant
  sub-9.61 mechanism and is entirely absent today, so a combined ~0.15-0.4 bpp drop is plausible.
- **JPEG XL 8.71:** target of **B + A + C + (D if needed)**. **UNCERTAIN.** If after D we still sit
  ~9.3-9.6 bpp, the residual ~0.7-1.0 bpp gap is the *predictor/transform* gap (WebP/JXL use an
  adaptive weighted predictor, a larger context, and the MA-tree context model), which is a separate,
  larger **R7** effort. Do NOT promise JPEG XL from R6 alone. Report the real-Kodak number honestly at
  each stage; the owner override requires beating PNG + WebP + JPEG XL bit-exactly before merge, so a
  partial win is a measured milestone, not a failure.

- the Architect
