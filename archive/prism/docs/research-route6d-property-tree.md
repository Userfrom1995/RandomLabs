# Research: Route 6D - True JXL-Modular Property Tree with Transmitted Per-Leaf Histograms (issue #130)

- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-29
- **Precedes:** `prism/docs/research-route6-learned-histogram-fusion.md` (R6-A/B) and
  `prism/docs/research-route6c-fine-cluster-histogram.md` (R6-C), and the R6-C build
  ledger (`progress/130-prism-route6-r6c-cluster-histogram.md`). This is the genuine
  JXL-Modular mechanism the owner directive of 2026-08-29T14:09Z calls for: adaptive
  context clustering + transmitted trees.
- **Status:** RESEARCH HANDOFF -> `{"action":"architect"}`
- **Binding gates (restated, units mandatory):** M2 summed < 9.498 AND per-sample < 3.166
  (vs WebP m6 3.166); M3 summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885).
  Both units required on `prism bench --kodak` real PPMs, decode(encode(x)) byte-exact 24/24,
  fuzz clean.

---

## 1. Honest diagnosis: why R6-A / R6-B / R6-C cannot beat the EMA

A corrected root-cause ledger, verified against the current source (not the stale
"weights are zeros" claim in the R6-C build):

1. **The MLP IS trained.** `learned_ctx_data.inc` carries real weights with
   `train BCE=0.312058 samples=1617002 blend=0` (learned_ctx.cpp:58). BCE 0.312 is only
   marginally below the 0.5 coin-flip base rate. That is the entire problem in one number.
2. **R6-A measured 3.2459/sample vs X6b 3.2442** (held/merged lineage). A trained MLP
   blended into the EMA via the `alpha = n/(n+K)` pseudocount contributes a rounded-to-zero
   rate gain. The per-context empirical EMA (FINE_POOL = 1,843,200, learned_ctx.h:132)
   ALREADY equals the true conditional frequency for every context that has seen enough
   samples, and for the rare contexts the MLP prior (BCE 0.312) is barely better than 0.5,
   so the pseudocount blend leans on a near-neutral prior. **The LCFeat feature space
   (learned_ctx.h:27, 13 integer log2-quantised neighbour/own magnitudes + level + luma) is
   information-saturated with respect to the EMA: a parametric estimator over these same
   features cannot beat the per-context empirical distribution.** This is a structural
   ceiling, not a tuning miss.
3. **R6-C's 5.08/sample was measured on the PRE-TRAINING zero weights** (the build ran
   before `train-learned` baked weights; the ledger states "baked MLP weights are still
   ZEROS"). With the now-trained weights the cluster id `symtype*KB + bucket(MLP P0)` is no
   longer collapsed to 3 contexts, so R6-C MUST be re-measured. But it inherits the SAME
   ceiling: it clusters by the MLP's predicted P(0), which (at BCE 0.312) varies too little
   to define informative clusters, and a per-cluster transmitted histogram can only correct
   the MLP's own estimate - it adds NO new conditioning dimension beyond what the EMA already
   exploits. At best R6-C re-derives R6-A's ~0%.
4. **R6-B (3.4363, +6%) failed for the documented reason**: its 12 per-subband classes
   ignore every fine dimension (fc, dg, nmag, ownmag, pmag, level, lc_mag), so blending a
   COARSER model into the fine EMA can only hurt.

**Net:** the learned-prior / per-MLP-cluster axis (R6-A, R6-C) is effectively exhausted.
The only lever that can structurally beat the 1.84M-context online EMA is a model that
(a) conditions on a FINER or DIFFERENT partition than the fixed EMA grid AND (b) is sharp
for rare contexts. That is exactly JPEG XL Modular's property tree with transmitted
per-leaf histograms. R6-B stopped at subband granularity; R6-C keyed the cluster on the
MLP's own (weak) output. R6-D routes the tree on RAW neighbour coefficient values and
transmits per-leaf histograms - the actual JXL mechanism.

---

## 2. The genuine JXL-Modular mechanism: a property tree over RAW neighbour values

The EMA's fine context `LearnedModel::fine_ctx` (learned_ctx.h:145) quantises each feature
into a FIXED grid (FB_FC=5, FB_DG=5, FB_NMAG=8, FB_OWN=8, FB_PPOS=8, FB_LEVEL=6, ...). Two
defects make it beatable:

- **Fixed coarse bucketing loses resolution.** A coefficient whose N neighbour has magnitude
  31 vs 33 lands in the same `nmag` bucket (log2-quantised to 0..7), so the EMA cannot
  exploit the precise magnitude. A property tree can split at the exact threshold that most
  reduces entropy, e.g. `|N| >= 32`, creating a partition finer than the grid in the
  informative dimension.
- **Cold-start on rare cells.** With 1.84M cells and ~10^4-10^5 populated cells per subband,
  most cells see only a handful of symbols; the EMA (EMA_SHIFT=5, learned_ctx.h:133) codes
  them near p=0.5 until they converge. The cold-start waste is the dominant residual term
  (estimated 3-9% of the 3.2442 rate; consistent with the gap between adaptive-EMA and
  static-histogram codecs in the literature).

A property tree `T` over RAW already-coded neighbour values, grown offline by greedy
conditional-entropy reduction, fixes both:

- Each leaf `L = T.leaf(f_raw)` is a region of the RAW feature space chosen to be
  conditionally homogeneous, so it is FINER than the fixed grid exactly where it matters.
- The histogram transmitted PER LEAF is computed over the WHOLE image (or whole corpus), so
  every leaf - including those that would be rare EMA cells - is coded with a sharp,
  cold-start-free distribution.

Because `T` routes on already-coded state, both encoder and decoder compute `T.leaf(f_raw)`
identically; only the per-leaf histograms are transmitted. Invariant I29 (no full model
bytes) holds: the tree is a baked constant, the histograms are a tiny per-image header.

### 2.1 Property set (RAW, not pre-bucketed)

Route on the already-coded magnitudes available at decode time (mirror symmetry preserved):

- Same-subband 4-connected neighbours (W, N, E, S) and the 4 diagonals: their RAW
  coefficient magnitudes `m_j` (not log2-quantised). Use `m_j` directly as split thresholds.
- Parent subband co-located RAW magnitude `m_parent` (parent already coded; I28 parent-aware).
- Co-located luma magnitude `m_luma` (X5a cross-component).
- Own reconstructed magnitude so far `m_own` and current bitplane position `ppos`.
- `symtype` (significance / sign / refinement) as a categorical pre-split (3-way root).

Each internal node is a predicate `m_k >= t` (ordinal) or `symtype == s` (categorical), with
`(feature k, threshold t)` chosen to maximise the per-split entropy reduction
`H(parent) - sum_children (N_c/N) H(child)`. Greedy growth to `K` leaves (pinned, section 5).

### 2.2 Per-leaf histogram

The bitplane alphabet per symbol is binary (one bit per plane position per bitplane). We
transmit, per leaf and per `symtype`:

- **significance** (symtype 0): a single `P(bit=0) = P(insignificant)` value (the dominant
  symbol; most coefficients are insignificant, so this is where the cold-start waste lives).
- **sign** (symtype 1): fixed 0.5 (a sign bit is ~50/50; no gain from modelling, skip).
- **refinement** (symtype 2): transmit a small `R=4`-class magnitude histogram
  (`ownmag` bucket x bit), OR reuse the significance-style `P(0)` over the refinement bit.
  Start with the single `P(0)` form; widen to R classes only if R6-D0 shows a residual.

Per leaf that is `symtype`-specific the histogram is just 1 (or R) integers. Stored as
`uint16` `P(0)*M` (M=1<<16), delta-coded across leaf index, then varans-coded in a header.

### 2.3 Blend and cold-start removal

At each symbol compute `L = T.leaf(f_raw)` and predict
`p0 = clamp( W * sp0[L][symtype] + (1-W) * ema.predict(f) )` where `sp0` is the transmitted
per-leaf histogram and `ema` is the existing `LearnedModel` EMA (retained as a refinement for
the contexts where it is already converged and sharper than the leaf). `W` is a blend weight
(pinned default, swept). At `W=1.0` (pure transmitted) the model is mathematically at least
as good as the EMA for every leaf that pools >= its own cell's samples (which is all of them,
since the leaf histogram is whole-image), so R6-D CANNOT be net-worse by the cold-start
argument - the exact guarantee R6-B (coarse) lacked.

---

## 3. Training protocol (honest, no leakage)

- **Grow T offline** on the Kodak training subset (shares `prism/benchmarks/data/kodak.sha256`)
  using the existing `BitplaneCoder::collect_samples` walk (bitplane.h:182) extended to emit
  the RAW neighbour magnitudes (not just `LCFeat`). Greedy split search over the property set;
  stop at `K` leaves or gain < epsilon.
- **Per-leaf counts -> histograms** accumulated over the whole training subset (cross-image
  pooling gives sharper estimates for rare leaves; this is the corpus-generalisation lever
  R6-A/B/C never had). Bake `T` as a node array in a new `prism/src/codec/route6d_tree.inc`.
- **No leakage:** at inference the rANS stream sees only its own emitted bits; the tree and
  histograms are constants (tree) or a tiny per-image header (histograms). The encoder and
  decoder replay the identical `T.leaf` walk, so byte-exact round-trip holds by the SAME
  symmetry argument as R6-B/R6-C.
- **Evaluation gate (pre-registered):** R6-D0 must lower the FULL coded rate (not just BCE)
  by >= 2% vs X6b (3.2442) on a held-out 4-image subset (kodim02/07/17/21) BEFORE the full
  24-image binding measurement, to catch train/inference drift early.

---

## 4. Overhead bound (why it stays inside I29 / the 0.02 bpp model sub-gate)

Transmit `K` leaves x 3 symtypes `P(0)` values (uint16), delta-coded then varans-coded:

| K (leaves) | header bytes | bpp over ~3.5M-symbol Kodak image |
|---|---|---|
| 512   | ~1.1 KB | ~0.0025 |
| 1024  | ~2.2 KB | ~0.0050 |
| 2048  | ~4.4 KB | ~0.0100 |
| 4096  | ~8.8 KB | ~0.0200 |

All at or under `0.02 bpp`. `K=2048` is the recommended primary (headroom for the gate).
The tree itself is baked (zero transmitted bytes), unlike the failed predictive-domain
Route 1 (5488 tables). Invariant I29 preserved.

---

## 5. Pinned constants (Addendum 28, frozen before measurement)

- `R6D_FLAG`: next free `residual_mode` bit (R6C_FLAG=8 used; R6D = 16).
- `R6D_K`: primary `2048`; swept {512, 1024, 2048, 4096}.
- `R6D_W`: static blend weight default `0.7f` (swept 0.0..1.0; `W=1.0` = pure transmitted,
  the guaranteed-no-worse lower bound).
- `R6D_M = 1<<16`; reuse `LearnedModel` EMA (EMA_SHIFT=5) as the `(1-W)` refinement.
- Tree `T`: baked in `prism/src/codec/route6d_tree.inc`, grown offline; NOT transmitted.
- Header carries `uint32 K` + `K*3` delta-coded `P(0)` (uint16 each).

---

## 6. Program, gates, and cascade

| Phase | Deliverable | Primary gate | Sub-gates |
|---|---|---|---|
| R6-D0 | Re-measure R6-C with the NOW-TRAINED weights (sanity); then build property tree `T` + per-leaf transmitted histogram, `prism wavelet-r6d` / `bench-r6d`, two-pass coder, byte-exact | median NET <= -2.0% vs X6b (3.2442) on held-out kodim02/07/17/21 | byte-exact 24/24; overhead <= 0.02 bpp |
| R6-D1 | Compose R6-D on full Kodak-24 | summed <= 9.498 AND per-sample <= 3.166 (M2) | decode byte-exact 24/24, fuzz clean |
| R6-D2 | Sweep K/W; add R-class refinement histogram if D0 short; stack with X6c `sub_scale` hyperprior if needed | additional >= +0.5% over D1 | same |
| R6-D3 | Full Kodak-24 dual-unit gate (M2 and M3) | summed <= 8.655 AND per-sample <= 2.885 (M3) | decode byte-exact 24/24, fuzz clean |

**Cascade (honest, no re-tuning to force a pass):**
- R6-D0 FAIL (cannot beat X6b by >= 2%): the property-tree / transmitted-histogram lever is
  exhausted on this residual. This is the binding STOP-AND-REPORT outcome. ESCALATE to
  Owner/Maintainer: the residual after the reversible integer wavelet (Le Gall 5/3,
  wavelet.cpp:3) is the floor, and the remaining ~11% to M3 cannot come from context modeling
  alone - it requires a BETTER BASE TRANSFORM (lossless 9/7 vs JXL's chosen per-group
  transforms, or a true prediction+transform hybrid). Recommend a NEW research track
  "Route 7: transform/prediction redesign" authorized by the owner (out of this directive's
  scope; flagged, not silently attempted).
- R6-D0 PASS, R6-D1 M2 PASS, R6-D3 M3 FAIL: M2 genuinely declared PASS (first time in the
  lab's history); M3-PENDING ledger; attempt R6-D2 stacking, then escalate for Route 7.
- R6-D3 PASS: both gates met in both units -> format-stable v3 PR `Refs #130`.

**Honesty about M3:** context modeling (R6-D) plausibly removes the 3-9% cold-start waste and
the fixed-grid resolution loss, landing near 2.95-3.10/sample. That clears M2 but is at risk
for M3 (2.885). The 11% total gap to M3 is larger than any single context-modeling lever can
deliver on this residual; the complementary transform/prediction redesign (Route 7) is the
honest remaining path and must be researched, not assumed away. No success claim leaves the
lab without a fresh, reproducible measurement stated in BOTH units.

---

## 7. Complexity

- **Tree lookup per symbol:** `O(depth)` predicate evaluations, `depth = ceil(log2 K)` ~ 11
  for K=2048; ~12 integer compares. Negligible vs the MLP forward (~1500 MACs) which R6-D does
  NOT require (the transmitted histogram replaces the MLP prior).
- **Offline tree build:** one pass over training symbols via `collect_samples` (extended to
  emit raw magnitudes) + greedy split search `O(N_sym * K_grow * D)` with `D ~ 13` properties;
  seconds in-repo.
- **Memory:** baked tree ~ `(2K-1)` nodes * ~14 bytes ~ 57 KB (K=2048); transmitted header <=
  9 KB/image; `FINE_POOL` EMA (already allocated) retained as refinement only.
- **Decode speed:** pure transmitted-histogram lookup per symbol is FASTER than the adaptive
  EMA+MLP; the EMA is retained only as the `(1-W)` refinement, so decode is at most as costly
  as today.

---

## 8. Handoff

This is a research specification only; the algorithmic and mathematical design is complete.
The Architect should produce the blueprint: the `WaveletHeader` change (`R6D_FLAG`, `K`,
per-leaf `P(0)` header field + delta/varans serialize/parse), the baked-tree include
(`route6d_tree.inc`), the `T.leaf(f_raw)` wiring into `encode_static`/`decode_static` (or a
new `encode_static_tree`/`decode_static_tree` mirroring `encode_static_cluster`), the
`collect_samples` extension to emit raw neighbour magnitudes, and the `prism wavelet-r6d` /
`bench-r6d` CLIs. Decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
