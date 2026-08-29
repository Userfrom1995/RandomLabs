# Architect Blueprint: Route 6C v2 - Refinement-Constrained Baked Tree (issue #130)

- **Author:** the Architect
- **Date:** 2026-08-29
- **Precedes:** `prism/docs/research-route6c-fine-cluster-histogram.md` (R6-C research), `prism/docs/addendum-27-pinned-constants-route6c.md` (frozen pins), `progress/130-prism-route6c-fine-cluster.md` (R6-C0 build + C5 FAIL record).
- **Status:** ARCHITECT HANDOFF -> `{"action":"build"}` (resume on existing PR #181 / branch `opencode/issue130-20260829181522`).
- **Supersedes:** the failed R6-C0 coarse quantization (`r6c_cluster_id`, `route6c_tree.h:36-45`). That first cut violated the very premise it claimed (route6c_tree.h:12-17) and is abandoned. This blueprint implements what R6-C1 should have been, plus the predictor lever (R6-C2) for M3.

---

## 1. Summary

R6-C0 implemented the R6-C lever but **structurally invalidated it**: its cluster function was a COARSENING of the adaptive model's context key, so blending could only hurt (exactly R6-B's failure class). This blueprint corrects the lever by imposing a hard refinement constraint so the transmitted backbone is **finer-or-equal to the EMA everywhere**, and restores the X5a cross-component plumbing the R6-C0 path dropped (which had corrupted the measurement). It also adds the JXL-Modular "tree drives prediction" lever as a later phase (R6-C2) to target M3.

## 2. Deliverables

- `prism/include/prism/codec/route6c_tree.h`: `r6c_leaf(f)` (replaces `r6c_cluster_id`) + `r6c_K()` = 1024 (R6-C1 pin) + `verify_r6c_refinement()`. Correct the false "finer-or-equal" comment to state R6-REFINE explicitly.
- `prism/src/codec/route6c_tree.inc` (NEW, baked, NOT transmitted): offline-grown decision tree `T`, splits ONLY on `{pmag, lc_mag, lc_sig}`, <= 1024 leaves.
- `prism/src/cli/main.cpp`: `train-r6c` subcommand (greedy tree growth restricted to refining dims, writes `route6c_tree.inc`); keep `wavelet-r6c` / `bench-r6c` (with `--w`).
- `prism/src/codec/bitplane.cpp`: `R6CAdaptiveModel::predict` uses `r6c_leaf(f)`; `encode_static_r6c`/`decode_static_r6c` thread `luma_mag`/`lmag`/`lc_mag`/`lc_sig` (stop passing `nullptr`) so X5a is active and the `lc_mag`/`lc_sig` refinement axes are real.
- `prism/src/codec/wavelet_container.cpp/h`: `R6C_FLAG = 8` stays; `frame_wavelet_encode_r6c` passes `luma_mag` (mirror `frame_wavelet_encode` line 272); header serialization ALIGNED to frozen pin (addendum-27 A/D): `uint32 K` + `K` delta-coded varans `P(0)`.
- `prism/tests/unit/test_r6c.cpp`: add `VB-R6C-REFINE` (R6-REFINE holds) + `VB-R6C-X5A-PARITY` (R6-C w=0 feature plumbing equals X6b) to existing ROUNDTRIP/SYMMETRY/CLUSTER rails.

## 3. Why (root cause of R6-C0 FAIL, precise)

Two independent defects, both confirmed in `progress/130-prism-route6c-fine-cluster.md`:

1. **Structural (the lever was invalid).** `LearnedModel::fine_ctx` (`learned_ctx.h:145-162`) keys on `{symtype, orient, parent_sig, fc, dg, nmag, ownmag, ppos, level}` (FINE_POOL = 1,843,200). `r6c_cluster_id` (`route6c_tree.h:36-45`) used only `{symtype, orient, parent_sig, fc, dg, level}` and DROPPED `nmag`, `ownmag`, `ppos`. The transmitted per-cluster `P(0)` is therefore COARSER than the EMA's own context key. Blending a coarser static model into a finer adaptive EMA can only bias the many well-conditioned frequent contexts; the empty-cluster `M/2` fallback does NOT save it because the loss lives in POPULATED clusters whose cluster-average `P(0)` diverges from the true per-fine_ctx `P(0)`. This is exactly R6-B's +6% failure class. The claim in `route6c_tree.h:12-17` ("structurally incapable of repeating R6-B's loss") was FALSE for R6-C0.
2. **Measurement contaminant.** `frame_wavelet_encode_r6c` (`wavelet_container.cpp:667`) and `encode_static_r6c` passed `nullptr` for `luma_mag`/`lmag`, dropping the X5a cross-component conditioning that the X6b baseline keeps. The `w=0` floor of 3.443 was a CORRUPTED pure-learned floor, not the true 3.2175. Restoring it is a plumbing bug-fix, NOT a `K`/`W` retune, so it does NOT violate the addendum-27 freeze.

## 4. How It Works (the correction: R6-REFINE)

> **R6-REFINE (binding architectural constraint):** For all `LCFeat f1, f2`:
> `fine_ctx(f1) == fine_ctx(f2)  =>  r6c_leaf(f1) == r6c_leaf(f2)`.

`fine_ctx` already uses every dimension except `{pmag, lc_mag, lc_sig}` (the latter two exist in `LCFeat` but are ignored by `fine_ctx`). Therefore a tree whose splits are RESTRICTED to `{pmag, lc_mag, lc_sig}` automatically satisfies R6-REFINE and yields a strictly finer-or-equal partition. Each `fine_ctx` class can be sub-split up to `8(pmag) * 8(lc_mag) * 2(lc_sig) = 128` ways. Greedy offline growth over real Kodak training symbols picks the most entropic `fine_ctx` classes to refine, stopping at `K1 = 1024` leaves (pinned).

**Consequence (the lever becomes valid):** `W = 1.0` (pure transmitted) is now the guaranteed-no-worse bound, because for RARE refined contexts the whole-image exact `P(0)` strictly beats the cold-starting EMA, and for RICH contexts `static ≈ EMA` once the EMA converges. Blending `W*sp0[C] + (1-W)*learned.predict(f)` now interpolates between two models where static >= EMA for the contexts that dominate in count. This finally realizes the premise R6-C0 failed to realize.

**X5a restoration unlocks the only valid refinement axes.** Because `lc_mag`/`lc_sig` only become nonzero once `luma_mag` is threaded through `learned_features`, restoring X5a (defect 2 fix) is what makes the `lc_mag`/`lc_sig` split axes real. The two fixes are coupled: the contamination fix is also the lever enabler.

**Byte-exact symmetry is preserved** by the same argument as R6-B/R6-C0: both ends compute `f` from already-coded state, derive the same `r6c_leaf(f)`, read the same transmitted `sp0[C]`, and evolve the EMA in the same order. R6-REFINE only makes `r6c_leaf` a finer function; it changes no causality.

**Header overhead (aligned to frozen pin, addendum-27 A/D):** `uint32 K` + `K` delta-coded varans `P(0)` (16-bit, `[1,65534]`) ~ `K*14/8` bytes = ~1.8 KB for K=1024 (~0.0041 bpp) < 0.02 bpp model sub-gate. Supersedes the R6-C0 raw `4+2*K` serialization (which also drifted from the pin).

## 5. Module Breakdown

### 5.1 `prism/include/prism/codec/route6c_tree.h`
- `inline uint32_t r6c_K() { return 1024u; }` (R6-C1 pinned; R6-C0's 648 is abandoned).
- `inline uint32_t r6c_leaf(const LCFeat& f)` -> baked tree leaf id in `[0, r6c_K())`. Implementation calls the baked `T.leaf(f)` from `route6c_tree.inc`.
- `bool verify_r6c_refinement()` (used by test + one-time offline validator): enumerates a sampled/reduced feature lattice and asserts R6-REFINE. A `static_assert`/`verify` in `train-r6c` refuses to emit a tree that violates it.
- Rewrite the file header comment: state R6-REFINE; remove the disproven "structurally incapable of repeating R6-B" claim; document that the partition REFINES `fine_ctx` by splitting only on `{pmag, lc_mag, lc_sig}`.
- Keep `r6c_w()`/`set_r6c_w()` (default 0.6, frozen).

### 5.2 `prism/src/codec/route6c_tree.inc` (NEW, baked)
- Node array (internal split nodes + leaf ids), ~24 KB for K=1024. NOT transmitted (invariant I29 preserved: only the per-image `sp0` vector is sent).
- `T.leaf(f)` evaluates the fixed decision tree using only `{pmag, lc_mag, lc_sig}` of `f`.

### 5.3 `prism/src/cli/main.cpp` - `train-r6c`
- Runs existing `collect_samples` over the Kodak training subset.
- Greedy growth: candidate split = (feature in `{pmag, lc_mag, lc_sig}`, threshold); score = bitwise cross-entropy reduction of the binary symbol; grow until 1024 leaves or gain < epsilon.
- **Hard guard:** reject any candidate split that would separate two samples with equal `fine_ctx(f)`; if no refining split remains with positive gain, stop. This mechanically enforces R6-REFINE.
- Writes `prism/src/codec/route6c_tree.inc` and prints the verified R6-REFINE proof.
- `wavelet-r6c` / `bench-r6c` retained with `--w`, `--filter`, `--levels`, `--k`.

### 5.4 `prism/src/codec/bitplane.cpp`
- `R6CAdaptiveModel::predict`: `uint32_t C = r6c_leaf(f);` (replace `r6c_cluster_id`).
- `encode_static_r6c` / `decode_static_r6c`: pass the `luma_mag`/`lmag`/`lc_mag`/`lc_sig` through `learned_features` (remove the `nullptr` arguments at the R6-C call sites, mirroring `frame_wavelet_encode`). No change to `LearnedModel`, MLP, EMA, walk order, or rANS backend.
- Pass-1 counter unchanged in structure (per-leaf `cnt[C][0/1]` pooled image-global into `sp0[C]`); only `C` source changes from `r6c_cluster_id` to `r6c_leaf`.

### 5.5 `prism/src/codec/wavelet_container.cpp` / `.h`
- `R6C_FLAG = 8` unchanged; `WaveletHeader.r6c_K` + `r6c_p0` retained.
- `frame_wavelet_encode_r6c` passes `luma_mag` (line ~667) exactly as `frame_wavelet_encode` does (line 272).
- Header serialize/parse: write `uint32 r6c_K` then `r6c_K` delta-coded varans `P(0)` (replacing raw `4+2*K`); decode mirrors. Both ends identical -> byte-exact.

### 5.6 `prism/tests/unit/test_r6c.cpp`
- `VB-R6C-REFINE`: assert `fine_ctx(f1)==fine_ctx(f2) => r6c_leaf(f1)==r6c_leaf(f2)` over a sampled lattice of `LCFeat` (include `pmag`/`lc_mag`/`lc_sig` variations).
- `VB-R6C-X5A-PARITY`: with `w=0`, assert the `LCFeat` stream produced by `frame_wavelet_encode_r6c` equals the one `frame_wavelet_encode` produces (proves the contamination fix).
- Keep `VB-R6C-ROUNDTRIP`, `VB-R6C-SYMMETRY`, `VB-R6C-CLUSTER` (K==1024, determinism).

## 6. R6-C2: tree drives PREDICTION (the JXL-Modular M3 lever)

The "finer-or-equal P(0) backbone" (R6-C1) should clear M2 (beat X6b 3.2442, target 3.166). To clear M3 (2.885) the tree must also drive VALUE prediction, not just probability, which is the literal "context tree also drives prediction" insight from JPEG XL Modular.

- In the X6a residual pre-pass, replace/augment the generic X6a predictor with a per-leaf linear predictor: each baked leaf `C` carries a small coefficient vector `R6CPredictor[C]` over `(parent reconstructed mag, same-subband neighbour mags, luma co-located value)`. Applied to produce the predicted coefficient; the bitplane coder then codes the (smaller) residual.
- Header carries per-leaf coefficients (delta+varans, bounded within 0.02 bpp).
- Because the predictor is selected per refinement-fine_ctx cluster, rarely-visited contexts get a data-driven predictor (the EMA's single global predictor underfits them) -> the structural win that can reach M3.
- Interface: `int32_t r6c_predict_value(const LCFeat& f, const Neighborhood& n)` returning the leaf-selected prediction; wired into the X6a pre-pass for `residual_mode & R6C_FLAG`.

This phase is gated behind a passing R6-C1 M2; do NOT attempt it until C1 measurement is green.

## 7. Test Matrix

- **Unit (must be 24/24 byte-exact + all rails green):**
  - `VB-R6C-ROUNDTRIP` (Kodak-24, encode/decode byte-exact), `VB-R6C-SYMMETRY`, `VB-R6C-CLUSTER` (K==1024, deterministic), `VB-R6C-REFINE` (R6-REFINE holds), `VB-R6C-X5A-PARITY` (w=0 plumbing == X6b).
- **Bench (binding, dual-unit):** `prism bench-r6c --kodak` + `bench_gate.sh`:
  - R6-C1 gate: median <= 3.166/sample AND <= 9.498 summed (M2) on Kodak-24 (beat X6b 3.2442).
  - R6-C2 gate (after C1 green): summed <= 8.655 AND per-sample <= 2.885 (M3).
- **W-sweep:** expect `W=1.0 >= pure-EMA floor` (no-worse bound restored) and monotone improvement over `w=0` at the optimal `W`. The catastrophic `w=1.0` 9.71 of R6-C0 must NOT recur (proof the coarsening is gone).
- **Fuzz:** clean.

## 8. Pin Alignment / corrections to prior drift

- **Abandon R6-C0 K0=648 dense coarse quant.** It violated R6-REFINE and the frozen addendum-27 R6-C0 sparse pin (103,680 raw cells). The redesign implements R6-C1 directly (K1=1024, refinement-constrained). No new issue is opened; this resumes #130 on the same branch.
- **Header format corrected** to delta+varans (addendum-27 A/D); the R6-C0 raw `4+2*K` is superseded. Overhead ~1.8 KB < 0.02 bpp, still smaller than R6-B's 5.7 KB.
- **Frozen (untouched):** `R6C_W = 0.6`, `R6C_M = 1<<16`, `R6C_EMA_SHIFT = 5`, `K_PSEUDO = 64`. Do NOT re-tune `R6C_K`/`R6C_W` to force a pass (addendum-27:66).
- **PR body:** `Closes #130` must become `Refs #130` (gates not yet met) - Maintainer edit per AGENTS.md.

## 9. Complexity

- Tree lookup per symbol: `O(depth)` ~ 10-12 comparisons (~15 ops), negligible vs MLP forward (~1500 MACs).
- Offline tree build: `O(N_sym * K_grow * D)` with `D=3` refining dims (vs 12 in the naive tree) - seconds in-repo.
- Memory: baked tree ~ `(2K-1)` nodes * ~12 B ~ 24 KB (K=1024); transmitted header <= ~2 KB/image; `FINE_POOL` EMA unchanged.
- Decode speed: static lookup per symbol is FASTER than adaptive EMA+MLP; the MLP is retained only as the `(1-W)` prior, so decode is at most as costly as today.

## 10. Handoff

This blueprint fixes the structural defect that made R6-C0 fail and restores measurement integrity, so the original R6-C hypothesis (transmit a finer-or-equal per-cluster P(0) to beat the cold EMA on rare contexts) can finally be tested honestly. R6-C1 targets M2; R6-C2 (predictor lever) targets M3. Decision `{"action":"build"}`.

- the Architect
