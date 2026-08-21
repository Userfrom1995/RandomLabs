# Obsidian - Research R9: clearing WebP (9.61) and JPEG XL (8.71)

- **Issue:** #68
- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-19
- **Mode:** Mode 2 research on PR #83 (branch `opencode/issue68-20260818070512`)
- **Companion docs:** `architect-r7-weighted-predictor-blueprint.md`, `architect-r8-adaptive-weighted-predictor-blueprint.md`, `architect-r6-corrected-blueprint.md`, `architect-r4-binary-coder-blueprint.md`, `progress/68-obsidian-lossless-image-codec.md`

## 0. Status incoming (measured, real Kodak, effort 4)

| Config | mean bpp | gate |
|---|---|---|
| v1 GR (production) | 10.0906 | PNG 13.05 MET |
| CMARC + R3-A + R2.1 (JPEG-LS floor) | 9.7094 | JPEG-LS 9.71 MET |
| R8-A (signaling-free adaptive weighted) | **9.7080** | still +0.098 above WebP 9.61; +0.798 above JPEG XL 8.71 |
| R7-A (per-context LS weighted, signaled) | 9.8323 (REGRESSED) | - |

The entropy backend (CMARC, R4 correct carryless range coder) is verified at `H(p)+epsilon`. The predictor is now the sole bottleneck. R7-A and R8-A attack that bottleneck but fail to clear the gates. This document diagnoses why and prescribes the next breakthrough.

## 1. Diagnosis - why predictor refinement plateaus

### 1.1 The causal residual is entropy-saturated (the core finding)

After GAP + CMARC, rate `R ≈ H(Residual | context)`. For a discrete-Laplacian residual `Lap(0,b)`, `H ≈ 1 + log2(2b)` bits/symbol. GAP already yields the JPEG-LS floor (9.71). A *better causal linear predictor* `P'` changes the residual to `R' = X - P'(N)`. The achievable entropy drop is bounded by the change in the residual's **shape** (not just its L1/L2 norm). Empirically GAP's residual is already near-iid-Laplacian with low variance, so:

- a 1-2% L1 residual-energy reduction (typical for a marginally better causal predictor) yields a **sub-0.01 to ~0.1 bpp** entropy reduction, far less than the ~1 bpp needed for JPEG XL.
- To gain ~1 bpp you must change the **redundancy class**: introduce *non-causal* (back-reference) and *finer-context* prediction. This is exactly what WebP (LZ77 + color cache) and JPEG XL (MA-tree context model + auto-weighted predictor + palette + Squeeze) do. Their edge over JPEG-LS is NOT a better causal predictor; it is long-range and context-tree redundancy removal.

**Consequence for the build:** stop tuning the causal predictor. The R7-A/R8-A line is near its ceiling at 9.7080. The remaining gates require (A) spatial LZ77 and (B) a context-tree weighted predictor.

### 1.2 Why R7-A regressed: signaling granularity, not predictor quality

R7-A signaled a codebook index `j` per **coarse LOCO-I gradient context `cid`** (hundreds-to-thousands of contexts per plane). Each selected context's map byte changed from `7` (Weighted) to `17+j`, adding `~log2(codebook) ≈ 5 bits` of **model-section** data per selected context. The model section is counted in bpp. Across all planes this is hundreds of bytes per image, which **exceeded** the residual-energy saving. The least-squares weight itself was correct (L2-optimal, strict superset of fixed predictors, cannot raise residual energy); the *signaling cost* killed it.

The fix is borrowed from JPEG XL: signal weights per **fine weight-context** (≈8-15 leaves per channel, each 4 small weights), **once per plane**, table size `O(1)` amortized over millions of pixels. R7-A used the wrong granularity (per coarse cid = thousands of entries); that is the whole regression.

### 1.3 Why R8-A is marginal: fixed heuristic + rare selection

R8-A (`weighted_adaptive` in `predict.rs:325`) uses `w(g) = SCALE/(1+|g|)`, a single fixed inverse-gradient function of the three causal gradients. It is signaling-free and safe (strict superset of fixed predictors), but:

- it is **one fixed function**, so it can only beat GAP where this specific heuristic happens to win. The per-context min-|r| analysis pass therefore selects it on a small, smooth subset.
- net L1 gain ≈ 0.1%, entropy gain sub-0.01 bpp (measured: 9.7094 -> 9.7080, i.e. 0.0014 bpp).

R8-A is a correct *proof of concept* that signaling-free is safe; it is not the JPEG XL weighted predictor. JPEG XL's weights are **learned per fine context and vary continuously**, which captures within-coarse-context variation R8-A cannot.

## 2. R9-A - Spatial LZ77 back-references (the WebP lever, target <= 9.61)

WebP's single largest win over JPEG-LS on Kodak is its **pixel-buffer LZ77** (2D back-references + color cache), not its predictor. Our existing LZ77 (M3-A / `ENTROPY_MODE_CARC_LZ=3`) is **residual-domain** and dormant (residual matches are rare). R6-A (pixel-domain LZ77) was dropped prematurely on a *forced, mis-tuned* measurement (MIN_MATCH=3, no color cache, naive 1D gamma distance) that gave 13.62 bpp on kodim01. That measurement does not represent a properly tuned WebP-style matcher.

### 2.1 Design

Operate over the **decoded sample buffer** `plane[]` (reconstructed, after inverse color transform), exactly as WebP:

- **Match finder:** hash-chain over window `W = min(width*2, 32768)`, `MAX_CHAIN` bound (e.g. 64-256). Candidate `p` matches if `plane[p..p+len] == plane[i..i+len]`.
- **MIN_MATCH = 2** (not 3). On photographic Kodak, length-2 matches along edges/texture and repeated near-values are common; MIN_MATCH=3 was the dominant reason R6-A failed to amortize.
- **2D distance model:** code the match as `(row_delta, col_delta)` (or a combined offset with a 2D distribution), each via a small adaptive CMARC bin model. This is WebP's key win over a 1D gamma distance. The current `write_match`/`read_match` gamma `(offset,length)` is replaced by a 2D-modeled pair.
- **Color cache (reuse R6-B `ColorCache`):** a per-plane LRU of reconstructed sample values. A reference may be a cache slot (flag + gamma rank) instead of a spatial offset. Over *spatial pixels* the cache engages on repeated colors/palette-like runs far more than it did over residuals, and combined with LZ it can exceed the ~76% hit-rate threshold needed to win.
- **Decoder:** copies `plane[i+l] = plane[i-off+l]` (or `plane[i] = cache[rank]`), bit-exact by induction. No match finder on decode.
- **Never-expand safety net:** compare the spatial-LZ candidate byte-for-byte against CMARC-only; keep the smaller. This makes the feature **provably non-regressive** and lets it engage only where it wins.

### 2.2 Why this clears WebP

WebP's LZ77 alone typically contributes ~0.2-0.5 bpp on Kodak versus a pure predictor+entropy codec. Our +0.098 bpp gap to WebP 9.61 is well inside that range. With MIN_MATCH=2 + 2D distance + color cache, R9-A should land at or below 9.61.

### 2.3 Complexity

Match finder `O(N)` with hash-chain + `MAX_CHAIN` bound; 2D distance model is a per-match `O(1)` bin coding; decoder `O(N)` copy. All bit-exact. Entropy backend unchanged (CMARC).

## 3. R9-B - Context-tree weighted prediction (the JPEG XL lever, target <= 8.71)

This is the genuine JPEG XL differentiator and what R7-A/R8-A were groping toward, done at the **correct granularity**.

### 3.1 Math (learned per fine weight-context, compact signaling)

Define a **weight context** `wc` from the causal neighborhood, mirroring JPEG XL:

```
gH = L - TL ; gV = T - TL ; gD = TL - TR      // signed gradients
wc = QUANT(gH, gV, gD)                          // ~8-15 leaves via gradient magnitude + sign bins
```

In `analyze`, for each leaf `wc` accumulate the 4x4 normal-equation sums `S_wc = sum n n^T` and `b_wc = sum n * x` over the analysis residuals (closed form, `O(N)`). Solve `w*_wc = S_wc^{-1} b_wc`, quantize to small integers `(wL,wT,wTL,wTR)` summing to `2^shift` (so `pred = (wL*L + wT*T + wTL*TL + wTR*TR + half) >> shift`). Store `W[wc]` once per plane in the model section.

Decoder recomputes `wc` from its neighborhood and looks up `W[wc]` (same signaled table) -> exact lockstep, **no online state, no per-pixel signaling**.

### 3.2 Why this works where R7-A/R8-A did not

- **Granularity:** `K ≈ 8-15` leaves signaled once per plane (table size `O(1)`), not thousands of per-`cid` indices. Signaling is amortized over millions of pixels -> no model-byte blowup (the R7-A failure mode is eliminated).
- **Specialization:** weights are learned per fine context, capturing within-coarse-context variation that the single fixed R8-A function cannot.
- **Strict superset:** `W[wc]` can equal GAP (or med) for the appropriate leaf, so it never raises residual energy at the model level.
- Expected gain over R8-A: the remaining ~0.3-0.6 bpp toward JPEG XL 8.71.

### 3.3 Integration note

The residual-context coder (R3-A) conditions on neighbor residuals of the *same* predictor. Because the decoder applies `map[cid]` (which now includes the per-context weighted predictor) before computing the residual context, lockstep is preserved with no change to the coder.

## 4. R9-C (stretch, if R9-A+B still > 8.71)

- **Palette:** signal a per-plane color palette; map runs of exact palette colors to indices coded by CMARC. Strong on repeated colors.
- **Squeeze transform (JXL-style):** interleaved downsampling of even/odd rows/cols to expose more spatial redundancy to LZ77 + the weighted predictor. The largest remaining JXL-specific lever.

## 5. Build order, gate map, test matrix

**Build order:** R9-A (spatial LZ77 + 2D distance + color cache, measure -> assert <= 9.61 WebP) -> R9-B (context-tree weighted, measure -> assert <= 8.71 JPEG XL) -> R9-C only if needed.

**Gate map:**
- PNG 13.05: MET (since 10.16).
- JPEG-LS 9.71: MET (since 9.7094).
- WebP 9.61: target of R9-A.
- JPEG XL 8.71: target of R9-A + R9-B (R9-C if still short).

**Test matrix (Builder):**
- `r9_spatial_lz_roundtrip_bit_exact` (synthetic gradient/gray/solid/noisy/1x1, efforts 0-7).
- `r9_spatial_lz_shrinks_repetitive` (screenshot/icon content; assert LZ wins).
- `r9_never_expands_vs_cmarc` (every Kodak image: spatial-LZ candidate never larger than CMARC-only).
- `r9_weighted_per_context_beats_r8` (gradient+edge image: LS-per-leaf weight beats fixed R8-A formula in L1 and in coded bpp).
- `r9_weighted_roundtrip_bit_exact`.
- Real-Kodak gate asserts PNG + WebP + JPEG XL all beaten bit-exactly before any merge (owner override).

## 6. Risk analysis

- **R9-A risk (low):** if MIN_MATCH=2 + 2D distance still does not amortize on Kodak, the never-expand net keeps it inert (no regression); then R9-B's weighted predictor is the fallback. WebP's published Kodak margin makes this unlikely.
- **R9-B risk (medium):** normal-equation leaves can be under-sampled; guard with a prior (fall back to GAP weights for low-count leaves) so no leaf diverges. Signaling is tiny and constant, so no R7-A-style blowup.
- **Honest total risk:** clearing WebP (9.61) is high-confidence via R9-A. Clearing JPEG XL (8.71) needs R9-B and possibly R9-C; the owner override forbids merge until all three gates are beaten bit-exactly, so the build must re-measure on real, durably-committed `data/kodak` after each stage.

- Dr. Mob, the Researcher
