# Addendum 27 - Pinned Constants: Route 6C Per-Fine-Context Transmitted Histograms (issue #130)

All constants below are FROZEN before any measurement. The Builder is forbidden
to move a gate or re-tune a pinned number to force a pass; measurement reports
the honest number against these pins. R6-C supersedes the R6-B coarse 12-class
histogram (which lost 6% by collapsing the 1.84M fine contexts into 12
subband classes); it transmits one histogram PER FINE CONTEXT CLUSTER via a
fixed baked property tree, exactly as JPEG XL Modular does.

## A. Dispatch / wire

- `R6C_FLAG = 8` - next free `WaveletHeader.residual_mode` bit (bit 3). Decode
  dispatches `frame_wavelet_decode_r6c` when `residual_mode & R6C_FLAG` is set;
  else the R6-B / bitplane path. (R6-B occupies `R6B_FLAG = 4`, bit 2; they are
  orthogonal and must not collide.)
- Header carries `uint32 K` (leaf count) followed by `K` delta-coded `P(0)`
  values (16-bit each, in `[1, 65534]`), varans-encoded in a small sub-stream.

## B. Clustering function (FIXED, baked, zero transmitted bytes)

- `R6C_K` (tree leaves): primary `1024`. The property tree `T` is grown OFFLINE
  on the Kodak training subset via `collect_samples`, greedily splitting the
  LCFeat dimension that most reduces bitwise cross-entropy; it stops at `K`
  leaves or gain < epsilon. Baked into `prism/src/codec/route6c_tree.inc` as a
  static node array (NOT transmitted). `T.leaf(f)` maps any LCFeat to a cluster
  id in `[0, K)`.
- R6-C0 (first build, no tree): fixed coarse quantization of the fine context
  (symtype 3 * orient 4 * parent_sig 2 * fc 3 * dg 3 * nmag 4 * ownmag 4 *
  ppos 4 * level 3 = 103,680 raw cells); only populated clusters (cnt > 0) are
  transmitted, run-length encoded over the empty span. Target populated count
  1024-4096.
- Features used by the tree (all computable from already-coded state at BOTH
  encode and decode, symmetric): `symtype, orient, parent_sig, fc, dg, nmag,
  pmag, ownmag, ppos, level, lc_mag, lc_sig` (mirror `learned_ctx.h:27`).

## C. Model blend (per symbol)

- `p0 = clamp( R6C_W * sp0[C] + (1 - R6C_W) * learned.predict(f) )`, `C = T.leaf(f)`,
  `sp0[C] = P(0)*M` from the transmitted per-leaf histogram, `M = 2^16`.
- `R6C_W` (static blend weight): default `0.6f`. Swept `0.0..1.0` in the build;
  `W = 1.0` (pure static) is the guaranteed-no-worse lower bound (the
  transmitted whole-image exact histogram cannot be net-worse than the
  cold-starting EMA for the many rare contexts).
- EMA + MLP (`LearnedModel`, `learned_ctx.h:112`) reused EXACTLY: `R6C_EMA_SHIFT = 5`,
  `R6C_M = 1<<16`, `K_PSEUDO = 64` (frozen). No change to the adaptivity path.

## D. Overhead bound (invariant I29 preserved)

- Header bytes ~ `K * 14 / 8` (delta + varans). For K=1024 ~ 1.8 KB/image ~
  0.0041 bpp; K=4096 ~ 7.2 KB ~ 0.0164 bpp. Both under the `0.02 bpp` model
  sub-gate and under R6-B's own 5.7 KB header. No learned weights or large
  tables are transmitted; only the tiny per-image per-leaf P(0) vector.

## E. Binding gates (dual-unit, from issue #130)

- M2: per-sample < 3.166 bpp AND summed < 9.498 bpp/img (vs WebP lossless m6).
- M3: per-sample < 2.885 bpp AND summed < 8.655 bpp/img (vs real cjxl -d0 -e9).
- Corpus: REAL Kodak-24 (`prism/benchmarks/data/kodak.sha256`, present at
  `obsidian/benchmarks/data/kodak/`). `summed = 3 * per-sample` for this 3-channel
  corpus (see `bench_gate.sh`).
- Acceptance authority: `bench_gate.sh` dual-unit check; decode(encode(x))
  byte-exact 24/24; fuzz clean.

## F. Cascade pins

- R6-C0 FAIL (median >= 3.2442/sample, i.e. cannot beat X6b): fine-clustering
  hypothesis false -> ESCALATE to Owner/Maintainer (full JXL-Modular where the
  context tree also drives prediction, or accept honest floor). Do NOT re-tune
  `R6C_K` / `R6C_W` to force a pass.
- R6-C0 PASS + R6-C1 M2 PASS + R6-C3 M3 FAIL: M2 genuinely declared PASS;
  attempt R6-C2 stacking (X6c sub_scale / R6-A deeper MLP), then escalate for M3.
- R6-C3 PASS: both gates in both units -> format-stable v3 PR `Refs #130`.

- the Researcher
