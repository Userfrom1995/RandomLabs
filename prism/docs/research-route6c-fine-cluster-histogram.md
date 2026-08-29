# Research: Route 6C - Per-Fine-Context Transmitted Histograms (issue #130)

- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-29
- **Precedes:** `prism/docs/research-route6-learned-histogram-fusion.md` (R6-A / R6-B spec) and the R6-B build
  ledger (`progress/130-prism-route6-r6b-transmitted-histogram.md`).
- **Status:** RESEARCH HANDOFF -> `{"action":"architect"}`
- **Binding gates (restated, units mandatory):** M2 summed < 9.498 AND per-sample < 3.166 (vs WebP m6); M3 summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9). Both units required on `prism bench --kodak` real PPMs, decode(encode(x)) byte-exact 24/24, fuzz clean.

---

## 1. Post-mortem: exactly why R6-B lost 6% (and why R6-C cannot)

R6-B transmitted a histogram of **12 classes per subband** (`r6b_class = symtype*4 + bitplane_bucket`, `bitplane.cpp:53`). Those 12 buckets condition ONLY on `(symtype, bitplane)`; they IGNORE every other dimension of the fine context: `fc, dg, nmag, ownmag, pmag, parent_sig, level, lc_mag`. Within a single subband, the EMA (`LearnedModel`, `learned_ctx.h:132`) keys on the FULL 9D fine context (`FINE_POOL = 1,843,200`), so it is far more discriminative than R6-B's 12 buckets. R6-B then BLENDED `W_STATIC=0.35` of that coarser model in (`bitplane.cpp:80`). Result: the blended model is worse per-symbol than the pure EMA for the many discriminative contexts, so the blend HURT, landing at 3.4363/sample (+6.0% vs X6b 3.2442).

The fix is not "blend harder"; it is "transmit the histogram at the SAME granularity the EMA already exploits." R6-C transmits one histogram PER FINE CONTEXT CLUSTER (a bounded, well-chosen grouping of the 1.84M raw fine contexts), so the transmitted model is never coarser than the EMA - it is finer, because it is computed from the WHOLE image instead of a cold-starting online prefix.

Concretely, for a fine context `c` inside cluster `C`:
- The EMA gives the online prefix estimate `p_ema(c, t)` which starts at `p=0.5` and converges only after `c` has been seen several times.
- The transmitted histogram gives `p_static(C)` = the exact image-conditional `P(bit=1)` of the whole cluster, with NO cold start.

For rarely-visited contexts (the vast majority: most of the ~10^4-10^5 populated fine contexts see only a handful of symbols) `p_static` is dramatically better than the cold `p_ema`. For the few rich contexts, the EMA equals `p_static` once converged and only marginally beats it before then. Because rare contexts dominate in COUNT, the static backbone strictly reduces total bits. This is the exact argument behind JPEG XL Modular's clustered transmitted histograms; R6-B simply stopped at subband granularity instead of context granularity.

**Why the table-economics law (I27) still does NOT kill this (unlike Route 1):** Route 1 transmitted one MA-tree table PER CONTEXT (5488 tables) on the *predictive residual* domain where the alphabet was 12 symbols. Here the alphabet is BINARY PER SYMBOL (each bitplane symbol is one bit), so a "histogram" per cluster is a SINGLE `P(0)` value (one 16-bit integer), not an 11-count table. And we transmit it once per IMAGE for `K` clusters, not once per context per image. Overhead is bounded below (section 4).

---

## 2. R6-C design: a baked property tree, transmitted per-leaf P(0)

### 2.1 The clustering function (FIXED, baked, zero transmitted bytes)

JPEG XL Modular derives each symbol's probability from a PROPERTY TREE: a fixed (standard-defined / encoder-chosen-but-transmitted-as-config) decision tree over neighbourhood properties, whose leaves partition the context space into a bounded set of clusters, each with its own transmitted entropy table. We mirror this exactly:

- Define a binary decision tree `T` over the LCFeat dimensions (`learned_ctx.h:27`): `symtype, orient, parent_sig, fc, dg, nmag, pmag, ownmag, ppos, level, lc_mag, lc_sig`.
- Each internal node splits on one feature with a threshold (ordinal: `fc, dg, nmag, pmag, ownmag, ppos, level, lc_mag`) or a category test (`symtype, orient, parent_sig, lc_sig`).
- The leaves are `K` clusters; `T.leaf(f)` maps any LCFeat `f` to a cluster id in `[0, K)`.

`T` is built OFFLINE once (in-repo, on the Kodak training subset via existing `collect_samples`) by greedily growing the split that most reduces the bitwise cross-entropy of the binary symbol, estimated from per-leaf `(c0, c1)` counts. Growth stops at `K` leaves (pinned, section 5) or when gain < epsilon. **`T` is baked as constants** (a small node array in a new `prism/src/codec/route6c_tree.inc`, ~24 KB for K=1024), exactly like the baked MLP weights (`learned_ctx_data.inc`). It is a FIXED function of `f`, so it is computed identically at encode and decode with ZERO transmitted bytes. Only the `K` per-leaf `P(0)` values are transmitted per image.

### 2.2 Encode / decode (two-pass, symmetric)

- **Pass 1 (analyze):** walk the exact EBCOT coding order (identical to `encode_static`, `bitplane.cpp:620`), but instead of `r6b_class` accumulate `cnt[C][0]` / `cnt[C][1]` per cluster `C = T.leaf(f)`. Build `sp0[C] = P(0)*M` (clamped to `[1, M-1]`, `M=2^16`). Store the `K` `sp0` values in the header.
- **Pass 2 (code) and decode:** at each symbol compute `C = T.leaf(f)` and predict
  `p0 = clamp( W * sp0[C] + (1-W) * learned.predict(f) )`, then rANS-encode/decode the bit and update the EMA identically to today. `W` is a blend weight (pinned default, section 5), runtime-overridable for sweeps.

The only code delta vs R6-B is: replace `sp0[oi][cls]` with `sp0[T.leaf(f)]`, and replace the per-(subband,class) counter with a per-cluster counter. The EMA, the MLP, the walk order, and the rANS backend are all unchanged. Byte-exact round-trip follows by the SAME symmetry argument as R6-B (`progress/130-prism-route6-r6b-transmitted-histogram.md:46`): both ends compute `f` from already-coded state, derive the same `C`, read the same transmitted `sp0[C]`, and evolve the EMA in the same order.

### 2.3 Why R6-C cannot repeat R6-B's failure

R6-B blended a model COARSER than the EMA; blending a worse model in can only hurt. R6-C's transmitted model is FINER (whole-image exact per fine-cluster vs cold online per fine-ctx); even at `W = 1.0` (pure static) it is mathematically a better or equal model for the many rare contexts, so it cannot be net-worse. The measurement confirms whether the coarsening-into-K-leaves loss is small enough to net a gain; the cascade (section 6) handles the failure case.

---

## 3. R6-C0: a simpler first implementation (faster to measure)

Before building the offline tree, the Builder can land R6-C0 with a FIXED coarse quantization of the fine context (no tree, just reduced buckets), which is mathematically a 1-level property tree and exercises the exact same code path:

- Coarsen: `symtype(3) * orient(4) * parent_sig(2) * q(fc,5->3) * q(dg,5->3) * q(nmag,8->4) * q(ownmag,8->4) * q(ppos,8->4) * q(level,6->3)` -> `K = 3*4*2*3*3*4*4*4*3 = 103,680` raw, but only the populated subset is transmitted (sparse: store only clusters with `cnt>0`, run-length the empty span). Empirically the populated count is ~10^4-10^5, matching R6-B's intuition but at fine granularity.

R6-C0 validates the "transmit per-fine-cluster P(0), beat the EMA" hypothesis with minimal new code (a `cluster_id(f)` function + per-cluster counter + header). R6-C1 then swaps the coarse quantizer for the offline-grown tree (better K utilization, smaller overhead, better gain) and sweeps `W`.

---

## 4. Overhead bound (why it stays inside I29 / the 0.02 bpp model sub-gate)

Transmit `K` `P(0)` values, each a 16-bit integer in `[1, 65534]`, delta-coded across leaf index then varans-encoded in a small header stream. Bytes ~ `K * 14 / 8` (delta + entropy). Model sub-gate from the spec is `0.02 bpp`:

| K (leaves) | header bytes | bpp over ~3.5M-symbol Kodak image |
|---|---|---|
| 512   | ~0.9 KB | ~0.0021 |
| 1024  | ~1.8 KB | ~0.0041 |
| 2048  | ~3.6 KB | ~0.0082 |
| 4096  | ~7.2 KB | ~0.0164 |

All are well under `0.02 bpp`. Note R6-B itself transmitted `NS * R6B_CLASSES * 2 = 60*12*2 = 1440` uint32 = 5.7 KB and declared I29 held; **R6-C is SMALLER in header bytes (2 KB at K=1024) yet ~100x more granular** (1024 clusters vs 12 classes/subband). The invariant I29 (no full model / learned weights transmitted, only a tiny per-image histogram) is preserved, consistent with the R6-B precedent.

---

## 5. Pinned constants (Addendum 27, frozen before measurement)

See `prism/docs/addendum-27-pinned-constants-route6c.md`. Summary:

- `R6C_FLAG = 8` (next free `residual_mode` bit; decode dispatches `frame_wavelet_decode_r6c` when set).
- `R6C_K` (tree leaves): primary `1024`; R6-C0 coarse-quant variant uses the populated-subset count (target ~1024-4096).
- `R6C_W` (static blend weight): default `0.6f` (swept 0.0..1.0 in build; `W=1.0` = pure static, the guaranteed-no-worse lower bound).
- `R6C_EMA_SHIFT = 5`, `R6C_M = 1<<16` (reuse `LearnedModel` EMA + MLP exactly).
- Tree `T`: baked in `prism/src/codec/route6c_tree.inc`, grown offline on the Kodak training subset, NOT transmitted.
- Header carries `uint32 K` + `K` delta-coded `P(0)` (16-bit each).

---

## 6. Program, gates, and cascade

| Phase | Deliverable | Primary gate | Sub-gates |
|---|---|---|---|
| R6-C0 | Fixed coarse-quant per-fine-cluster transmitted P(0); two-pass coder + sparse header; `prism wavelet-r6c` / `bench-r6c` | median NET <= X6b (3.2442/sample) on held-out kodim02/07/17/21 | byte-exact 24/24; overhead <= 0.02 bpp |
| R6-C1 | Offline property tree `T` baked; per-leaf P(0); blend `W` sweep | median <= 3.166/sample AND <= 9.498 summed (M2) on full Kodak-24 | same + fuzz clean |
| R6-C2 | Stack with X6c `sub_scale` hyperprior and/or R6-A deeper MLP if C1 short of M3 | additional >= +0.5% over C1 | same |
| R6-C3 | Full Kodak-24 dual-unit gate (M2 and M3) | summed <= 8.655 AND per-sample <= 2.885 (M3) | decode byte-exact 24/24, fuzz clean |

**Cascade:**
- R6-C0 FAIL (cannot beat X6b, i.e. median >= 3.2442 or worse): the fine-clustering hypothesis is false (coarsening-into-K still loses to the EMA even at fine granularity), which would mean the per-fine-context transmitted-histogram lever is exhausted. ESCALATE to Owner/Maintainer per the spec section 4 cascade (recommend the full JXL-Modular redesign where the context tree also drives prediction, or accept the honest floor). Do NOT re-tune `R6C_K`/`R6C_W` to force a pass.
- R6-C0 PASS, R6-C1 M2 PASS, R6-C3 M3 FAIL: M2 genuinely declared PASS (first time in the lab's history); M3-PENDING ledger; attempt R6-C2 stacking, then escalate for M3.
- R6-C3 PASS: both gates met in both units -> format-stable v3 PR `Refs #130`.

**Standing rule:** every claimed number states its unit; `bench_gate.sh` dual-unit check is the only acceptance authority; no success claim without a fresh both-units measurement on the exact pinned Kodak PPMs vs REAL cjxl/WebP.

---

## 7. Complexity

- **Tree lookup per symbol:** `O(depth)` comparisons, `depth = ceil(log2 K)` ~ 10-12 for K=1024-4096; ~15 integer ops. Negligible vs the MLP forward (~1500 MACs, `learned_ctx.h:54`).
- **Offline tree build:** one pass over training symbols via `collect_samples` (already exists), greedy split search `O(N_sym * K_grow * D)` with `D=12` features; seconds in-repo.
- **Memory:** baked tree ~ `(2K-1)` nodes * ~12 bytes ~ 24 KB (K=1024); transmitted header <= 7 KB/image; `FINE_POOL` EMA (already allocated) unchanged.
- **Decode speed:** pure static lookup per symbol is FASTER than the adaptive EMA+MLP; the MLP is retained only as the `(1-W)` prior, so decode is at most as costly as today.

---

## 8. Handoff

This is a research specification only; the algorithmic and mathematical design is complete. The Architect should produce the blueprint: the `WaveletHeader` change (`R6C_FLAG`, `K`, per-leaf `P(0)` header field + delta/varans serialize/parse), the baked-tree include, the `cluster_id(f)` / `T.leaf(f)` wiring into `encode_static`/`decode_static`, and the `prism wavelet-r6c` / `bench-r6c` CLIs. Decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
