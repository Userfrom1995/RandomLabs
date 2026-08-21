# Obsidian - Architect blueprint R7: per-context least-squares weighted predictor (and LZ77 re-enable)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-19
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Companion docs:** `docs/architect-cmarc-blueprint.md`, `docs/architect-r3-residual-context-blueprint.md`,
  `docs/architect-r4-binary-coder-blueprint.md`, `docs/architect-r6-corrected-blueprint.md`,
  `progress/68-obsidian-lossless-image-codec.md`.
- **Status incoming:** CMARC (R4 correct coder + R5 quotient fix) + R3-A residual DIFF context on the
  quotient + R2.1 subtract-green measures **9.7093 bpp mean on real Kodak** (effort 4, 24 images). That is
  exactly the **JPEG-LS floor (9.71)** on the same LOCO-I GAP predictor. WebP 9.61 is +0.10 bpp away;
  JPEG XL 8.71 is +1.00 bpp away. Every incremental CMARC/context extension (R1-R5, R2.1-R2.4, M2/M2.5/
  M3-A/M3-B/M3.5, R6-B) has been built and measured; the Builder's empirical ceiling analysis
  (`docs/decisions/builder/2026-08-19-r6b-colorcache-empirical-ceiling.md`) shows the residual stays at
  the JPEG-LS floor because the **predictor** (not the coder) is now the bottleneck. WebP and JPEG XL win
  primarily via a **better (adaptive weighted) predictor** plus a richer context model and LZ77.

---

## 0. Diagnosis - why we are stuck at the JPEG-LS floor

The entropy backend (CMARC, R4 coder) is now at `H(p)+epsilon` (verified by `cmarc_efficiency_vs_shannon`).
R3-A conditions the Rice quotient on the JPEG-LS DIFF residual context, which is the correct residual
context. The remaining structure in the residual is therefore **prediction error**, and we cannot code it
away - we must **predict it better**.

`predict.rs` already has the machinery:
- `WeightVec { wl, wt, wtl, wtr, shift }` and `predict(Weighted, n, w) = round((wl*L + wt*T + wtl*TL + wtr*TR) >> shift)`.
- `default_weight_codebook()` = 16 candidate weight vectors (sums ~16, `shift = 4`).
- `analyze` (`model.rs`) picks, per **plane**, the single codebook weight `w` that minimizes summed residual
  magnitude, and the per-context `map[cid]` stores a fixed `PredictorId` (0..16). When `map[cid] == Weighted`
  the coder uses the plane's one shared `w`.

So today every `Weighted` context in a plane shares ONE globally-best linear predictor. Natural images are
not globally linear: edges, textures, and smooth regions need different weights. A single per-plane weight
leaves large residual energy on the table. This is precisely why JPEG-LS (GAP, fixed) and our codec sit at
the same 9.71, while WebP (4-mode + adaptive weighted) and JPEG XL (MA-tree + adaptive weighted) drop to
9.61 and 8.71.

**M3-B tried to close this with online SGD weight refinement and regressed** because (a) stochastic online
updates on a non-stationary per-context residual destabilize the CMARC distribution, and (b) the update was
not the calibrated JPEG-XL TM-WP recursion. The fix is the proven CALIC/JPEG-XL route: **offline
least-squares weights computed in `analyze` and signaled in the model section**, with zero online state, so
encoder/decoder lockstep is exact and the coder is never destabilized.

---

## 1. R7-A - per-context least-squares weighted predictor (the primary WebP lever)

### 1.1 Math
For each spatial context `cid`, collect the causal neighborhood samples over the plane:
`X = [[L, T, TL, TR]_i]`, target `y_i = value_i`. Solve the 4x4 normal equations
`A = X^T X` (symmetric: `S_ll, S_lt, S_ltl, S_ltr, S_tt, S_ttl, S_ttr, S_tltl, S_tltr, S_trtr`) and
`b = X^T y` (`S_ly, S_ty, S_tly, S_try`). The optimal linear predictor is
`w* = A^{-1} b`, i.e. `round((w*_l*L + w*_t*T + w*_tl*TL + w*_tr*TR) >> shift)`.
These are 10 accumulators per context - cheap to gather in the existing `analyze` cost loop.

### 1.2 Quantization / signaling (reuse existing machinery, zero new header bits)
Do **not** signal arbitrary floats. Quantize `w*` to the **nearest entry of an expanded weight codebook**
and store the index in the per-context map:
- Expand `default_weight_codebook()` from 16 to a richer set (e.g. 32-64 vectors) that samples the
  `(wl, wt)` diagonal plus off-diagonal `(wtl, wtr)` terms with several `shift` values (3,4,5). The Builder
  can generate the expanded codebook deterministically (the existing `v(wl,wt,wtl,wtr)` helper).
- Extend the per-context map encoding used by `model.rs`: a context is either a base predictor
  (`PredictorId` 0..16) or `Weighted` with codebook index `j`. Encode as: values `0..=16` = fixed
  predictor ids; values `17 + j` (j < codebook size) = `Weighted` with `codebook[j]`. This keeps the map a
  flat `u8` per context and needs no new header flag (all 8 GR bits are in use, but the model section is
  unbounded).
- The decoder reads `map[cid]`; for a `Weighted` entry it looks up `codebook[j]` and applies
  `predict(Weighted, n, &codebook[j])`. Both sides use identical signaled weights -> exact lockstep.

### 1.3 Per-context selection during analyze
In the existing per-context cost loop, the candidate set `predictors_for(effort)` already includes
`Weighted`. Extend the inner cost evaluation: for the `Weighted` candidate, instead of the single per-plane
codebook weight, evaluate **every** codebook weight `j` and keep the one with minimum summed `|r|` for that
context. (This is O(contexts x codebook size) extra `predict()` calls in `analyze` only - no runtime cost.)
Store `17 + best_j` in `map[cid]`.

### 1.4 Bit-exact lockstep + safety net
- Predictor weights are fully signaled; no online adaptation -> no lockstep hazard (the exact failure mode of
  M3-B). Existing `predict`/`predict_clamped` already support `Weighted` + any `WeightVec`.
- The per-plane never-expand net and the CMARC auto-selection are unchanged: R7-A only changes *which*
  predictor each context uses. A regression is impossible at the model level (it is a strict superset of the
  current per-plane single weight: per-context best-of-codebook dominates a single shared weight).
- Model-size guard (already in `model.rs`): the map is `context_count <= 4096` u8s; an expanded 64-entry
  codebook adds at most 6 bits/context = ~3 KB/plane, negligible vs Kodak image sizes. Keep the existing
  `MODEL_SIZE_FRACTION` drop.

### 1.5 Expected gain
Per-context optimal linear prediction typically removes **0.2-0.5 bpp** on photographic Kodak versus a single
global weight (this is the CALIC/JPEG-XL weighted-predictor win). Projected: 9.71 -> **~9.2-9.5 bpp**, which
**clears the WebP 9.61 gate**.

---

## 2. R7-B - fold the weighted-predictor class into the residual context

The R3-A `residual_context(dL,dU,dUl)` already conditions the CMARC quotient. Extend it (or add a parallel
tag) so the chosen predictor **class** (fixed vs weighted-codebook-index) is one of the conditioning bits.
This lets the coder specialize its quotient model per predictor class without multiplying the full context
table (keep the R3-B rule: remainder stays on `(position, window)`, only the quotient keys on
`(rcid, pred_class)`). Additive, low risk; measure as a delta on top of R7-A.

---

## 3. R7-C / R7-D - re-enable LZ77 now that residuals are smaller (Components C and D of R6)

The earlier `CARC_LZ` (pixel-domain, `ENTROPY_MODE_CARC_LZ = 3`) **ties** on photographic Kodak because
exact pixel repeats of length >= `MIN_MATCH=3` are rare once the predictor is good. Two consequences of R7-A:
- Smaller residuals widen the relative win of a matched copy, so tuned matches may finally pay off.
- Implement **R6 Component C**: `MIN_MATCH = 2` when cheaper than two literals; 2D distance model (cluster
  offsets by `(row_delta, col_delta)`); cache-vs-match competition. Then **Component D** (per-pixel
  multi-channel copy via a reconstructed-pixel buffer) only if A+B+C still above 8.71.

Build R7-C/D **after R7-A measures**, so we confirm whether the weighted predictor alone clears WebP before
spending effort on LZ77 tuning.

---

## 4. R7-E (stretch toward JPEG XL 8.71) - flagged, not promised

If R7-A+B+C lands at ~9.0-9.3 (WebP cleared, nearing JXL), the remaining ~0.3-0.6 bpp to JPEG XL 8.71 is the
**MA-tree context model + larger prediction neighborhood** gap (JPEG XL uses adaptive per-pixel weighted
prediction with a rich property tree, not just per-context LS). That is a genuinely larger effort (an R8):
- Adaptive per-pixel weighted prediction with the calibrated JPEG-XL TM-WP online recursion (no signaling,
  but bounded unlike M3-B's SGD), OR
- A property-tree / MA context model that grows the CMARC context set well beyond the current ~365.
Be honest: R7 targets WebP reliably and makes a credible run at JPEG XL; the owner override requires beating
PNG + WebP + JPEG XL bit-exactly before merge, so if 8.71 is not reached, work continues on R8. Do not
claim JPEG XL from R7 alone.

---

## 5. Build order (Builder)

1. **R7-A FIRST, in isolation.** Expand `default_weight_codebook()` (deterministic helper), extend the
   `analyze` per-context cost loop to pick the best codebook weight per context, encode `17+j` in `map[cid]`,
   and have the decoder apply `codebook[j]` for `Weighted` entries. Add tests: `r7_weighted_per_context_beats_plane` (asserts
   per-context LS strictly lowers summed `|r|` vs the single per-plane weight on a synthetic gradient+edge
   image), `r7_weighted_roundtrip_bit_exact` (multiple efforts), and a regression guard that the Kodak mean
   cannot exceed the pre-R7 9.7093. Re-measure real Kodak (`run_kodak.sh --effort 4`); record
   `benchmarks/results/2026-08-19-r7a-weighted.csv`. **Target: <= 9.61 (WebP).**
2. **R7-B SECOND.** Fold predictor class into the residual context; measure delta.
3. **R7-C THIRD** (Component C tuned matches), then **R7-D** (Component D) only if still > 8.71.
4. Keep M2/M2.5/M3-A/M3-B/M3.5/R2.4/CARC_LZ/R6-B seams OFF by default; the never-expand net auto-selects
   winners and guarantees no Kodak regression.

---

## 6. Regression-proofing (carried from R4/R6)

- `cmarc_efficiency_vs_shannon` stays mandatory (`bps/shannon < 1.10`). No change merges until it and all
  round-trip tests pass.
- New tests: `r7_weighted_per_context_beats_plane`, `r7_weighted_roundtrip_bit_exact`,
  `r7_no_kodak_regression` (mean bpp <= pre-R7 baseline).
- The per-context weighted predictor is a strict superset of the current per-plane weight, so it provably
  cannot raise residual energy; the safety net is retained as defense in depth.

---

## 7. Gate mapping and honest risk

- **PNG 13.05:** MET (long ago).
- **JPEG-LS 9.71:** MET (9.7093 clears it).
- **WebP 9.61:** target of **R7-A** (per-context LS weighted predictor). Realistic: the weighted-predictor
  win over a single global weight is well established (CALIC/JPEG XL); ~0.2-0.5 bpp expected -> clears 9.61.
- **JPEG XL 8.71:** target of **R7-A + R7-B + R7-C/D**. **UNCERTAIN.** If after R7-C/D we still sit
  ~9.0-9.3, the residual gap is the MA-tree context model / adaptive per-pixel weighted prediction (R7-E /
  R8), a larger follow-on effort. Report the real-Kodak number honestly at each stage; a partial win is a
  measured milestone, not a failure.

- the Architect
