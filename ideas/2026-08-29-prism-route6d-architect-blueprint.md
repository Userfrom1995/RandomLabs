# Architect Blueprint: Route 6D - Full Per-Leaf Transmitted Histogram, Tree Drives Prediction (issue #130)

- **Author:** the Architect
- **Date:** 2026-08-29
- **Precedes:** `prism/docs/research-route6d-property-tree.md` (Researcher handoff, the genuine JXL-Modular mechanism), `prism/docs/addendum-27-pinned-constants-route6c.md` (frozen pins for R6-C, superseded for R6-D by Addendum 28), `progress/130-prism-route6c-fine-cluster.md` (R6-C0/R6-C1 honest FAIL record).
- **Status:** ARCHITECT HANDOFF -> `{"action":"build"}` on PR #182 (`opencode/issue130-20260829194357`). This PR #181 (R6-C) is archived as an honest-negative result under `Refs #130`.
- **Supersedes:** the withdrawn R6-REFINE blueprint (`ideas/2026-08-29-prism-route6c-jxl-modular-redesign.md`), whose refinement-on-ignored-dims constraint was mathematically backwards, and R6-C (P(0)-only transmission), which failed the binding M2 gate.

---

## 1. Summary

R6-C transmitted ONE scalar (`P(0)`) per cluster and blended it into the adaptive EMA. The Builder measured this honestly: `w=1.0` (pure backbone) 11.90 bpp (worst), `w=0.6` (frozen) 10.33 bpp (3.445/sample), `w=0.0` (pure EMA) 9.708 bpp (~X6b floor). Transmitting only `P(0)` cannot beat the EMA because: (a) it conditions on no dimension the EMA does not already exploit, so the cluster average of `P(0)` is only a biased estimate of the per-context `P(0)`; (b) the blend dilutes the well-conditioned frequent contexts where the EMA is already sharp.

R6-D transmits a FULL per-leaf histogram over the bitplane alphabet, computed over the WHOLE image (cold-start-free), and routes the coding context through a property tree `T` grown on RAW neighbour magnitudes (finer than the fixed EMA grid exactly where entropy lives). This is the literal JPEG XL Modular mechanism: the transmitted tree drives BOTH the prediction context and the prior. Two independent wins close the gap to X6b and beyond:

1. **Cold-start removal.** Every leaf is coded with the whole-image exact distribution, so the rare contexts the EMA codes near p=0.5 are sharp from symbol one.
2. **Resolution gain.** `T` splits at exact RAW thresholds (e.g. `|N| >= 32`) instead of the fixed log2 buckets of `fine_ctx` (learned_ctx.h:132), refining the partition where it matters.

Because the per-leaf distribution pools >= its own cell's samples for every leaf, `W=1.0` (pure transmitted) is mathematically at least as good as the cold EMA for every context: this is the no-worse guarantee R6-C (coarse P(0)-only) could not make.

## 2. Deliverables

- `prism/include/prism/codec/route6d_tree.h`: `r6d_K()`, `r6d_leaf(const RawFeat&)`, `r6d_w()` / `set_r6d_w()`, `verify_r6d_raw_routing()` (asserts `T` keys only on already-coded RAW state).
- `prism/src/codec/route6d_tree.inc` (NEW, baked, NOT transmitted): greedy property tree over RAW neighbour magnitudes + parent + luma + ownmag + ppos + 3-way `symtype` root, <= 2048 leaves.
- `prism/src/codec/bitplane.cpp`: `R6DAdaptiveModel` (per-leaf transmitted histogram `sp0[L][symtype]` blended with `LearnedModel` EMA; `update` adapts the EMA only), plus `encode_static_r6d` / `decode_static_r6d`. `collect_samples` extended to emit RAW neighbour magnitudes.
- `prism/src/codec/wavelet_container.cpp` / `.h`: `R6D_FLAG = 16` (bit 4); `frame_wavelet_encode_r6d` / `decode` dispatch + header I/O (`uint32 K` + `K*3` delta-coded varans `P(0)`).
- `prism/src/cli/main.cpp`: `train-r6d` (greedy RAW tree growth, writes `route6d_tree.inc`); `wavelet-r6d` / `bench-r6d` CLIs with `--w`, `--filter`, `--levels`, `--k`.
- `prism/tests/unit/test_r6d.cpp`: `VB-R6D-ROUNDTRIP` (byte-exact 24/24), `VB-R6D-SYMMETRY`, `VB-R6D-LEAF-COUNT` (`K<=2048`, in-range, routes on RAW magnitudes), `VB-R6D-X5A-PARITY` (luma threaded), `VB-R6D-NO-WORSE` (`W=1.0` >= pure-EMA floor on held-out 4).
- `prism/docs/addendum-28-pinned-constants-route6d.md` (NEW, frozen pins; mirrors addendum-27 structure for R6-D).
- Fix `route6c_tree.h` stale "finer-or-equal" comment (already corrected by Builder at `87f7ac8`) and mark R6-REFINE ideas file superseded (done in this commit).

## 3. Why (corrected root cause, with the R6-REFINE math error stated plainly)

`LearnedModel::fine_ctx` quantises each feature into a FIXED grid (`FB_FC=5, FB_DG=5, FB_NMAG=8, FB_OWN=8, FB_PPOS=8, FB_LEVEL=6`, learned_ctx.h:145). Two defects make it beatable, and R6-D fixes both:

- **Fixed coarse bucketing loses resolution.** A coefficient whose neighbour has magnitude 31 vs 33 falls in the same `nmag` bucket, so the EMA cannot exploit the precise value. `T` splits at exact RAW thresholds, refining the grid in the informative dimension. (This is why the withdrawn R6-REFINE was wrong: it proposed splitting only on `{pmag, lc_mag, lc_sig}`, the dims `fine_ctx` ignores; a tree on ignored dims cannot refine the grid, it only re-labels equal-grid cells. The correcting R6-D tree splits on RAW magnitudes that the grid already collapses.)
- **Cold-start on rare cells.** With 1.84M cells and ~1e4-1e5 populated per subband, most cells see few symbols and the EMA codes them near p=0.5 until convergence. This cold-start waste is the dominant residual term. The per-leaf WHOLE-IMAGE histogram removes it.

The Researcher ledger (research-route6d-property-tree.md:1) is the authoritative diagnosis: the ML predictor's BCE is 0.312, barely below the 0.5 base rate, so the parametric prior adds almost nothing over the empirical EMA. R6-D does not replace the EMA with a better parametric prior; it supplies the exact per-leaf empirical distribution, which dominates the cold EMA.

## 4. How It Works

### 4.1 Property set (RAW, not pre-bucketed)

`T` routes on already-coded state available identically at encode and decode:

- Same-subband 4-connected + 4 diagonal RAW neighbour magnitudes `m_j` (used directly as split thresholds, NOT log2-quantised).
- Parent subband co-located RAW magnitude `m_parent` (I28 parent-aware).
- Co-located luma RAW magnitude `m_luma` (X5a cross-component).
- Own reconstructed magnitude so far `m_own` and current bitplane position `ppos`.
- `symtype` (significance / sign / refinement) as a 3-way root split (categorical).

Each internal node is a predicate `m_k >= t` (ordinal) or `symtype == s` (categorical), with `(feature k, threshold t)` chosen to maximise `H(parent) - sum_children (N_c/N) H(child)` over the binary symbol. Greedy growth to `K` leaves (pinned 2048) or gain < epsilon.

### 4.2 Per-leaf histogram (the lever)

The bitplane alphabet is binary per (symbol, bitplane-position). Transmit, per leaf and per `symtype`:

- **significance** (symtype 0): the single dominant `P(bit=0) = P(insignificant)` value. This is where the cold-start waste lives, so it is the primary payload.
- **sign** (symtype 1): fixed 0.5 (a sign bit is ~50/50; no gain, skip transmission).
- **refinement** (symtype 2): transmit `P(0)` over the refinement bit (start single-class); widen to an `R=4`-class magnitude histogram only if R6-D0 shows a residual.

Per leaf the payload is 1 (or R) `uint16` `P(0)*M` values (M=1<<16), delta-coded across leaf index then varans-coded in the header. NO full model is transmitted (invariant I29 preserved); only the tiny per-image per-leaf vector.

### 4.3 Blend and the no-worse proof

At each symbol compute `L = T.leaf(f_raw)` and predict:

```
p0 = clamp( W * sp0[L][symtype] + (1 - W) * ema.predict(f) )
```

`sp0` is the transmitted per-leaf histogram; `ema` is the retained `LearnedModel` EMA (the `(1-W)` refinement for contexts where it is already sharper than the leaf). `W` is a blend weight (pinned default 0.7, swept 0.0..1.0). At `W=1.0` the prediction is the whole-image exact per-leaf distribution, which pools >= its own cell's samples for every leaf, so it is at least as good as the cold EMA for every context. This is the cold-start guarantee R6-C (coarse P(0)-only, which also averaged over the entire cluster's fine-context variation) could not make, and it is what restores `W=1.0 >= pure-EMA` (the catastrophic 9.71 of R6-C0 must NOT recur).

### 4.4 Byte-exact symmetry

Both ends compute `f_raw` from already-coded state, derive the same `T.leaf(f_raw)`, read the same transmitted `sp0[L]`, and evolve the EMA in the same order. The tree is a baked constant; the per-leaf vector is a tiny per-image header. Byte-exact 24/24 holds by the same argument as R6-B/R6-C.

### 4.5 Overhead (inside I29 / 0.02 bpp model sub-gate)

`K` leaves x 3 symtypes `P(0)` (uint16), delta-coded then varans: K=2048 -> ~4.4 KB (~0.0100 bpp); K=4096 -> ~8.8 KB (~0.0200 bpp). All at or under 0.02 bpp. The tree itself is baked (zero transmitted bytes), unlike the failed predictive-domain Route 1 (5488 tables).

## 5. Module Breakdown

### 5.1 `prism/include/prism/codec/route6d_tree.h`

- `inline uint32_t r6d_K() { return 2048u; }` (R6-D primary pin; swept {512,1024,2048,4096}).
- `inline uint32_t r6d_leaf(const RawFeat& f)` -> baked tree leaf id in `[0, r6d_K())`. `RawFeat` carries the RAW magnitudes above (not the log2-bucketed `LCFeat`).
- `bool verify_r6d_raw_routing()` (test + one-time offline validator): asserts every split predicate reads only already-coded RAW state (no future/decoder-unknown value). `train-r6d` refuses to emit a tree that fails it.
- `r6d_w()` / `set_r6d_w()` (default 0.7, frozen default; runtime-overridable via `--w`).

### 5.2 `prism/src/codec/route6d_tree.inc` (NEW, baked)

- Node array (internal split nodes + leaf ids), ~57 KB for K=2048. NOT transmitted.
- `T.leaf(f)` evaluates the fixed decision tree over RAW magnitudes.

### 5.3 `prism/src/cli/main.cpp` - `train-r6d`

- Extend `BitplaneCoder::collect_samples` (bitplane.h:182) to emit RAW neighbour magnitudes (not just `LCFeat`).
- Greedy growth: candidate split = (RAW feature, threshold); score = bitwise cross-entropy reduction of the binary symbol; grow to 2048 leaves or gain < epsilon. Hard guard: every split predicate must read only already-coded RAW state (enforced by `verify_r6d_raw_routing`).
- Cross-image pooling over the Kodak training subset for sharper rare-leaf estimates (the corpus-generalisation lever R6-A/B/C never had).
- Writes `prism/src/codec/route6d_tree.inc`; prints the verified routing proof.
- `wavelet-r6d` / `bench-r6d` CLIs with `--w`, `--filter`, `--levels`, `--k`.

### 5.4 `prism/src/codec/bitplane.cpp`

- `R6DAdaptiveModel`: `predict` computes `L = r6d_leaf(f_raw)`, blends `sp0[L][symtype]` with `ema.predict(f)`; `update` adapts the EMA only. No change to `LearnedModel`, MLP, EMA internals, walk order, or rANS backend.
- `encode_static_r6d` / `decode_static_r6d`: thread `luma_mag`/`lmag` (X5a) through `learned_features` (mirror `frame_wavelet_encode` line 272) so `m_luma` is a real split axis.
- Pass-1 counter: per-leaf `cnt[L][0/1]` pooled image-global into `sp0[L][symtype]`.

### 5.5 `prism/src/codec/wavelet_container.cpp` / `.h`

- `R6D_FLAG = 16` (bit 4; `R6C_FLAG = 8` is bit 3, orthogonal). `WaveletHeader.r6d_K` + `r6d_p0` added.
- `frame_wavelet_encode_r6d` passes `luma_mag` (mirror line 272).
- Header serialize/parse: `uint32 r6d_K` then `r6d_K * 3` delta-coded varans `P(0)`; decode mirrors. Both ends identical -> byte-exact.

### 5.6 `prism/tests/unit/test_r6d.cpp`

- `VB-R6D-ROUNDTRIP`: Kodak-24 encode/decode byte-exact (all filters/depths/sizes/16-bit).
- `VB-R6D-SYMMETRY`: subband-level symmetric encode/decode.
- `VB-R6D-LEAF-COUNT`: `K <= 2048`, every leaf id in range, `T.leaf` reacts to RAW magnitude variation (not just buckets).
- `VB-R6D-X5A-PARITY`: with `w=0`, the `RawFeat`/`LCFeat` stream from `frame_wavelet_encode_r6d` equals `frame_wavelet_encode` (proves luma threading).
- `VB-R6D-NO-WORSE`: `W=1.0` rate on held-out kodim02/07/17/21 is <= the pure-EMA (X6b) rate (the no-worse proof; must NOT reproduce R6-C0's 9.71).

## 6. Program, Gates, and Cascade (from research-route6d-property-tree.md, re-stated)

| Phase | Deliverable | Primary gate | Sub-gates |
|---|---|---|---|
| R6-D0 | Property tree `T` + per-leaf transmitted histogram, `wavelet-r6d`/`bench-r6d`, two-pass coder, byte-exact | median NET <= -2.0% vs X6b (3.2442) on held-out kodim02/07/17/21 | byte-exact 24/24; overhead <= 0.02 bpp |
| R6-D1 | Compose R6-D on full Kodak-24 | summed <= 9.498 AND per-sample <= 3.166 (M2) | decode byte-exact 24/24, fuzz clean |
| R6-D2 | Sweep K/W; add R-class refinement histogram if D0 short; stack X6c `sub_scale` hyperprior if needed | additional >= +0.5% over D1 | same |
| R6-D3 | Full Kodak-24 dual-unit gate (M2 and M3) | summed <= 8.655 AND per-sample <= 2.885 (M3) | decode byte-exact 24/24, fuzz clean |

**Cascade (honest, no re-tuning to force a pass):**

- R6-D0 FAIL (cannot beat X6b by >= 2%): the property-tree / transmitted-histogram lever is exhausted on this residual. BINDING STOP-AND-REPORT: ESCALATE to Owner/Maintainer. The residual after the reversible integer wavelet (Le Gall 5/3) is the floor; the remaining ~11% to M3 cannot come from context modeling alone. Recommend a NEW research track "Route 7: transform/prediction redesign" (better base transform, e.g. lossless 9/7 or per-group predictions). Flagged, not silently attempted.
- R6-D0 PASS, R6-D1 M2 PASS, R6-D3 M3 FAIL: M2 genuinely declared PASS (first in lab history); M3-PENDING ledger; attempt R6-D2 stacking, then escalate for Route 7.
- R6-D3 PASS: both gates in both units -> format-stable v3 PR `Refs #130`.

**Honesty about M3:** context modeling (R6-D) plausibly removes the 3-9% cold-start waste and the fixed-grid resolution loss, landing near 2.95-3.10/sample. That clears M2 but is at risk for M3 (2.885). The complementary transform/prediction redesign (Route 7) is the honest remaining path and must be researched, not assumed away. No success claim leaves the lab without a fresh, reproducible measurement stated in BOTH units.

## 7. Pin Alignment / corrections to prior drift

- **Abandon R6-C0 K0=648 dense coarse quant** and the withdrawn R6-REFINE (splits on ignored dims). R6-D implements the genuine JXL-Modular mechanism. No new issue opened; R6-D resumes #130 on PR #182.
- **Header format:** delta+varans (`K*3` `P(0)`, ~`K*14/8` bytes) per addendum-28 A/D; overhead <= 0.02 bpp.
- **Frozen (untouched):** `R6D_M = 1<<16`, `R6D_EMA_SHIFT = 5`, `K_PSEUDO = 64`. Do NOT re-tune `R6D_K`/`R6D_W` to force a pass.
- **PR #182 body:** `Closes #130` must become `Refs #130` until dual-unit M2/M3 pass (addendum-28 cascade). PR #181 (R6-C) body already corrected to `Refs #130` by the Builder.

## 8. Complexity

- Tree lookup per symbol: `O(depth)` ~ 11 predicate evals (~12 integer compares) for K=2048; negligible vs MLP forward (~1500 MACs), which R6-D does NOT require (the transmitted histogram replaces the MLP prior).
- Offline tree build: one pass over training symbols via extended `collect_samples` + greedy split search `O(N_sym * K_grow * D)` with `D ~ 13` properties; seconds in-repo.
- Memory: baked tree ~ `(2K-1)` nodes * ~14 B ~ 57 KB (K=2048); transmitted header <= 9 KB/image; `FINE_POOL` EMA retained as refinement only.
- Decode speed: pure transmitted-histogram lookup per symbol is FASTER than adaptive EMA+MLP; the EMA is retained only as the `(1-W)` refinement, so decode is at most as costly as today.

## 9. Handoff

This blueprint is the canonical Architect design for R6-D, the genuine JXL-Modular lever the addendum-27:66 cascade calls for after R6-C0/R6-C1 failed. It corrects the withdrawn R6-REFINE (math error stated in section 3) and supersedes R6-C (P(0)-only). The build proceeds on PR #182 to avoid a duplicate build against the Researcher spec there. Decision `{"action":"build"}` on PR #182; PR #181 (R6-C) is archived as an honest-negative result under `Refs #130`.

- the Architect
