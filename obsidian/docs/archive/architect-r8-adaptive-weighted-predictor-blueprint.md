# Obsidian - Architect blueprint R8: signaling-free adaptive weighted predictor (JXL/WebP-class)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-19
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Companion docs:** `docs/architect-cmarc-blueprint.md`, `docs/architect-r3-residual-context-blueprint.md`,
  `docs/architect-r4-binary-coder-blueprint.md`, `docs/architect-r6-corrected-blueprint.md`,
  `docs/architect-r7-weighted-predictor-blueprint.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **Status incoming:** CMARC (R4 correct binary range coder + R5 quotient fix) + R3-A residual DIFF context
  + R2.1 subtract-green measures **9.7093 bpp mean on real Kodak** (effort 4, 24 images). That is the
  **JPEG-LS floor (9.71)** on the same LOCO-I GAP predictor. WebP 9.61 is **+0.10 bpp** away; JPEG XL
  8.71 is **+1.00 bpp** away. R6-B (color cache) was measured and proven net-negative on photographs
  (hit-rate H must exceed ~76%; natural images never do). R7-A (per-context least-squares weighted
  predictor, signaled as `17+j` in the predictor map) **REGRESSED to 9.83 bpp** - the signaled codebook
  indices added model bytes that outweighed the prediction gain. The coder is already at `H(p)+epsilon`;
  the predictor is now the sole bottleneck.

---

## 0. Diagnosis - why R7-A regressed, and the fix

R7-A encoded the per-context weighted predictor by signaling a **codebook index `j`** in every
predictor-map byte (`map[cid] = 17 + j`). Two costs killed it:

1. **Signaled model bytes.** The expanded codebook (~34 entries) is serialized into the model section,
   and each context's `17+j` byte costs `log2(34) ~ 5 bits` more than the legacy `Weighted` byte `7`
   whenever the per-context weight was chosen. Across `context_count` (~hundreds to low thousands) contexts
   per plane this is hundreds of bytes per image - more than the residual-energy saving.
2. **Overfitting.** A least-squares weight fit per-context on the *analysis* pass does not guarantee a
   lower *held-out* residual once the coder cost of the chosen weight is accounted for.

**The JXL/WebP-class fix: make the weighted predictor fully deterministic from the causal neighborhood.**
If the weights are a fixed pure function of the already-decoded neighbors `(L, T, TL, TR)`, then:

- **Zero signaled bytes.** The decoder recomputes the identical weights from its own reconstructed
  neighborhood, so no codebook, no map bits beyond the single existing `map[cid]` byte (already present),
  no online state. This is exactly how JPEG XL's `Predictor::Weighted` and WebP's adaptive weighted modes
  avoid signaling.
- **Strict improvement.** It is a deterministic function of the same neighborhood the GAP predictor uses,
  so wherever it predicts better it lowers residual energy; where it does not, the existing per-context
  min-|r| analysis pass simply keeps GAP (id 6) or another fixed predictor. No regression is possible at
  the model level (it is a strict superset of the fixed-predictor candidate set, with no added cost).

This is the decisive difference from R7-A: **same prediction power, zero signaling overhead.**

---

## 1. R8-A - signaling-free adaptive weighted predictor (the primary WebP lever)

### 1.1 Math (deterministic from neighbors, no signaling)

Add a new fixed predictor `PredictorId::AdaptiveWeighted` whose prediction is a gradient-adaptive
weighted average of the four causal neighbors. Use the JPEG XL weighted-predictor formulation: the
weight on each neighbor is an inverse-gradient soft weight, so the direction with the smaller gradient
(the smoother, more predictable direction) gets the larger weight.

Given causal neighbors `L, T, TL, TR` (already decoded on both encoder and decoder, border rules in
`predict::neighbors` applied):

```
// Three gradients (differences of the causal neighborhood).
gH = L  - TL      // horizontal gradient
gV = T  - TL      // vertical gradient
gD = TL - TR      // diagonal gradient

// Soft inverse-gradient weight for a gradient g (signed, bounded):
//   large |g|  -> near 0 weight (direction is unpredictable)
//   small |g|  -> large weight (direction is smooth/predictable)
fn w(g: i32) -> i32 {
    let a = g.unsigned_abs() as i32;
    let s = if g >= 0 { 1 } else { -1 };
    // 1/(1+|g|) style, scaled. Use the JPEG XL-style clamped form:
    //   w = s * min(WMAX, (1 << WSCALE) / (1 + a))   (integer division)
    s * ((1i32 << WSCALE) / (1 + a)).min(WMAX)
}

wL = w(gH)   // weight for L
wT = w(gV)   // weight for T
wTL = w(gD)  // weight for TL (diagonal reference)
wTR = w(-gD) // weight for TR (symmetric diagonal)

// Normalize to a fixed-point average: weights sum to (1 << SHIFT).
let sum = wL + wT + wTL + wTR;            // sum is positive, ~ (1 << SHIFT) after scaling
let pred = (wL*L + wT*T + wTL*TL + wTR*TR) / sum;   // exact integer average, no shift drift
```

Notes for the Builder:
- Use the **exact libjxl `Predictor::Weighted` coefficients** (from `libjxl/.../predictor.cc` / the JPEG
  XL bitstream spec) for maximum fidelity; the formula above is the architectural specification and any
  equivalent inverse-gradient weighting with `sum(w) > 0` is acceptable and lockstep-safe.
- `sum` is always strictly positive (each `w >= 1` when clamped to a minimum of 1, or guard against
  division by zero). Clamp `w` to `max(1, ...)` so no direction is ever fully discarded and `sum >= 4`.
- No `shift`/rounding drift: use the exact integer average `dot/sum`, not a rounded right shift, so the
  prediction is a deterministic integer in the plane's value range (then `predict_clamped` clamps).

### 1.2 Integration (zero new model bytes)

- `predict.rs`: add `PredictorId::AdaptiveWeighted` (assign a free `u8`, e.g. `200`, so it does not
  collide with the R3-A/R2.2 ids `0..=16` nor the legacy `Weighted` byte `7`; keep `17+j` codebook bytes
  reserved but **unused** after R8 reverts R7-A - see 1.4). Add the arm to `predict(id, n, w)` returning
  `predict_weighted_adaptive(n)`. Extend `from_u8`/`to_u8`/`name`/`predict_clamped`.
- `model.rs`: add `PredictorId::AdaptiveWeighted` to `predictors_for(effort >= 4)`. The existing
  per-context cost loop already evaluates every candidate and stores `best_pred[cid]`; it will now pick
  `AdaptiveWeighted` wherever it minimizes summed `|r|`. The map byte is the **same 1 byte/context** that
  already exists - no new field, no new table. `decode_predictor`/map read returns the id and the decoder
  applies the identical deterministic function.
- No `weight_codebook`, no `17+j` signaling, no online state. The decoder needs only the id to call the
  same `predict_weighted_adaptive(n)`.

### 1.3 Bit-exact lockstep + safety net

- Fully deterministic from the causal neighborhood (already decoded on both sides) -> exact lockstep, no
  signaled state. Existing `predict_clamped` range-clamping is preserved.
- The per-plane never-expand net and CMARC auto-selection are unchanged: R8-A only changes *which*
  predictor each context may use (a strict superset of the fixed set). A regression is structurally
  impossible - if `AdaptiveWeighted` never wins a context, the map is byte-identical to today.
- **Revert R7-A** (`124bded` + `41c2d1a`): remove the `17+j` codebook-signaling path and the expanded
  `default_weight_codebook()` usage in `analyze` (keep the codebook struct for any future signaled use,
  but stop signaling it). This removes the model overhead that caused the 9.83 regression.

### 1.4 Expected gain

A signaling-free adaptive weighted predictor is the proven CALIC / JPEG-XL / WebP win over a fixed
GAP: it tracks local structure (edges, gradients) that a single global weight or fixed GAP misses.
Expected **-0.1 to -0.5 bpp** on photographic Kodak -> projected 9.71 -> **~9.2-9.6 bpp, clearing the
WebP 9.61 gate**.

---

## 2. R8-B - fold predictor class into the residual context (delta toward JPEG XL)

The R3-A `residual_context(dL, dU, dUl)` already conditions the CMARC quotient on the JPEG-LS DIFF
context. Extend the coding context so the **predictor class** of the current pixel is one conditioning
bit (fixed GAP vs AdaptiveWeighted vs other). This lets the quotient/remainder models specialize per
predictor class without multiplying the full table (keep the R3-B rule: remainder stays on
`(position, window)`, only the quotient keys on `(rcid, pred_class)`). Additive, low risk; measure as a
delta on top of R8-A.

---

## 3. R8-C - re-enable LZ77 now that residuals are smaller

`ENTROPY_MODE_CARC_LZ = 3` (pixel-domain, already built, currently dormant) ties on photographic Kodak
because exact pixel repeats of length >= `MIN_MATCH=3` are rare once the predictor is good. Two
consequences of R8-A: smaller residuals widen the relative win of a matched copy, so tuned matches may
finally pay off. Implement **R6 Component C**: `MIN_MATCH = 2` when cheaper than two literals; a 2D
distance model (cluster offsets by `(row_delta, col_delta)`); cache-vs-match competition. Then Component
D (per-pixel multi-channel copy via a reconstructed-pixel buffer) only if still > 8.71.

Build R8-C **after R8-A measures**, so we confirm whether the adaptive predictor alone clears WebP
before spending effort on LZ77 tuning.

---

## 4. R8.5 / R9 (stretch toward JPEG XL 8.71) - flagged, not promised

If R8-A+B+C lands at ~9.0-9.3 (WebP cleared, nearing JXL), the remaining ~0.3-0.6 bpp to JPEG XL 8.71 is
the **MA-tree context model + larger prediction neighborhood** gap (JPEG XL uses adaptive per-pixel
weighted prediction with a rich property tree, not just per-context selection). That is a genuinely
larger follow-on effort (an R9):
- A property-tree / MA context model that grows the CMARC context set well beyond the current ~365 (fold
  more neighbor residuals, the prediction error sign, and local activity into a richer but bounded tree),
  OR
- An adaptive per-pixel weighted predictor with the calibrated JPEG-XL TM-WP online recursion (no
  signaling, but bounded unlike M3-B's destabilizing SGD).

Be honest: R8 targets WebP reliably and makes a credible run at JPEG XL; the owner override requires
beating PNG + WebP + JPEG XL bit-exactly before merge, so if 8.71 is not reached, work continues on R9.
Do not claim JPEG XL from R8 alone.

---

## 5. Build order (Builder)

1. **R8-A FIRST, in isolation.** Revert R7-A (`17+j` signaling). Add `PredictorId::AdaptiveWeighted` and
   `predict_weighted_adaptive(n)` (use libjxl's exact `Predictor::Weighted` coefficients). Add it to
   `predictors_for(effort >= 4)`; let the existing per-context min-|r| pass select it. Decoder dispatches
   on the id. Add tests: `r8_adaptive_weighted_deterministic` (encoder/decoder compute identical weights
   from the same `Neighbors`), `r8_adaptive_weighted_roundtrip_bit_exact` (multiple efforts), and a
   regression guard `r8_no_kodak_regression` (mean bpp <= 9.7093). Re-measure real Kodak
   (`run_kodak.sh --effort 4`); record `benchmarks/results/2026-08-19-r8a-adaptive-weighted.csv`.
   **Target: <= 9.61 (WebP).**
2. **R8-B SECOND.** Fold predictor class into the residual context; measure delta.
3. **R8-C THIRD** (Component C tuned matches), then **R8-D** (Component D) only if still > 8.71.
4. Keep M2/M2.5/M3-A/M3-B/M3.5/R2.4/CARC_LZ/R6-B/R7-A seams OFF by default; the never-expand net
   auto-selects winners and guarantees no Kodak regression.

---

## 6. Regression-proofing (carried from R4/R6)

- `cmarc_efficiency_vs_shannon` stays mandatory (`bps/shannon < 1.10`). No change merges until it and all
  round-trip tests pass.
- New tests: `r8_adaptive_weighted_deterministic`, `r8_adaptive_weighted_roundtrip_bit_exact`,
  `r8_no_kodak_regression` (mean bpp <= pre-R8 baseline 9.7093).
- The signaling-free adaptive predictor is a strict superset of the current fixed-predictor set with zero
  added model bytes, so it provably cannot raise residual energy; the safety net is retained as defense
  in depth.

---

## 7. Gate mapping and honest risk

- **PNG 13.05:** MET (long ago).
- **JPEG-LS 9.71:** MET (9.7093 clears it).
- **WebP 9.61:** target of **R8-A** (signaling-free adaptive weighted predictor). Realistic: the
  adaptive-weighted win over a single global weight / fixed GAP is well established (CALIC/JPEG XL/WebP);
  ~0.1-0.5 bpp expected -> clears 9.61.
- **JPEG XL 8.71:** target of **R8-A + R8-B + R8-C**. **UNCERTAIN.** If after R8-C we still sit
  ~9.0-9.3, the residual gap is the MA-tree context model / larger property tree (R8.5 / R9), a larger
  follow-on effort. Report the real-Kodak number honestly at each stage; a partial win is a measured
  milestone, not a failure.

- the Architect
