# Architectural Blueprint: Route 6D - True JXL-Modular Property Tree with Transmitted Per-Leaf Histograms

- **Issue:** #130 (Owner directive: "do not stop until M2 and M3 pass")
- **Research spec:** `prism/docs/research-route6d-property-tree.md` (Dr. Mob, the Researcher)
- **Precedes:** `prism/docs/research-route6-learned-histogram-fusion.md` (R6-A/B),
  `prism/docs/research-route6c-fine-cluster-histogram.md` (R6-C), and the R6-C build ledger
  (`progress/130-prism-route6-r6c-cluster-histogram.md`).
- **Base pipeline:** the X6b wavelet floor (Le Gall 5/3 -> learned-coefficient residual `r = c - c_hat`
  -> bitplane rANS) behind `WAVELET_FLAG` (0x80); no new container magic.
- **Role:** the Architect
- **Date:** 2026-08-29
- **Scope:** the genuine JXL-Modular mechanism the owner directive of 2026-08-29T14:09Z calls for
  (**adaptive context clustering + transmitted trees**), implementing research R6-D after R6-A
  (3.2459), R6-B (3.4363), and R6-C (5.08 with untrained weights) exhausted the MLP-keyed /
  subband-class / fine-cluster axes. Target: beat the X6b floor of **3.2442 / 9.7326** and reach
  M2 (<= 3.166 / 9.498) at minimum, M3 (<= 2.885 / 8.655) if the residual allows.

---

## 1. Summary

The single-pass adaptive EMA (`LearnedModel`, `learned_ctx.h:132`, `FINE_POOL = 1,843,200`) is at
its structural ceiling. The dominant residual is **cold-start waste** on the ~10^4-10^5 fine
contexts that each see only a handful of symbols per image: the EMA codes them near `p=0.5` until
they converge. R6-A/B/C tried to fix this by blending a *coarser* or *MLP-keyed* transmitted model
in; all failed because (a) the MLP feature space is information-saturated with respect to the EMA
(BCE 0.312), and (b) subband-class / MLP-bucket partitions are *coarser* than the EMA grid where
it matters.

R6-D is the actual JPEG XL Modular mechanism: a **fixed property tree `T` over RAW already-coded
neighbour magnitudes** that partitions the feature space into `K` leaves *finer than the fixed EMA
grid exactly where it reduces entropy*, plus a **per-leaf transmitted histogram** `sp0[L][symtype]`
computed over the WHOLE image (cold-start-free). `T` is a baked constant (zero transmitted bytes);
only the `K*3` `P(0)` values are transmitted per image (~0.0025-0.02 bpp). At `W=1.0` (pure
transmitted) the model is *mathematically at least as good as the EMA for every leaf* (each leaf
pools >= its own cell's samples), so R6-D **cannot be net-worse by the cold-start argument** - the
guarantee R6-B (coarse) and R6-C (MLP-keyed) lacked.

**Binding gates (units mandatory):** M2 summed < 9.498 AND per-sample < 3.166 (vs WebP m6 3.166);
M3 summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885). Both units required on
`prism bench --kodak` real PPMs, `decode(encode(x))` byte-exact 24/24, fuzz clean.

**Standing rule:** every claimed number states its unit; `bench_gate.sh` dual-unit check is the only
acceptance authority; no success claim without a fresh both-units measurement on the exact pinned
Kodak PPMs vs REAL cjxl/WebP.

---

## 2. Why: honest root-cause ledger (from the research spec)

1. The MLP IS trained (`learned_ctx_data.inc`, `train BCE=0.312058`). A parametric estimator over
   the **same** LCFeat space the EMA already exploits cannot beat the per-context empirical
   distribution. R6-A (3.2459) == X6b within noise.
2. R6-C's 5.08 was measured on **ZERO** weights (build ran before `train-learned` baked weights);
   even re-measured it inherits the MLP ceiling - clustering by the MLP's own (weak) P0 adds no
   conditioning dimension beyond the EMA.
3. R6-B (3.4363, +6%) blended a *coarser* (12-class/subband) model into the fine EMA, which can
   only hurt.
4. **Net:** the learned-prior / MLP-cluster axis is exhausted. The only lever that structurally
   beats the 1.84M-context EMA is a model that (a) conditions on a *finer or different* partition
   than the fixed grid AND (b) is sharp for rare contexts. That is exactly a property tree over
   RAW neighbour values with transmitted per-leaf histograms - R6-D.

---

## 3. How It Works

### 3.1 Property tree `T` over RAW neighbour values (baked, not transmitted)

`T` is a binary decision tree grown offline (section 5.7) on RAW already-coded magnitudes (not
log2-quantised). Each internal node is either:
- an **ordinal split** `raw_feat(k) >= thr` over one of the raw-magnitude features, or
- a **categorical root split** `symtype == s` (3-way: significance / sign / refinement).

Greedy growth maximises `H(parent) - sum_children (N_c/N) H(child)` on the binary bit entropy.
`T` routes on state available *identically* at encode and decode, so both compute `L = T.leaf(f_raw)`
from the same already-coded coefficients. `T` is baked into `route6d_tree.inc` (zero transmitted
bytes). Invariant **I29 holds**.

### 3.2 Per-leaf transmitted histogram (the JXL "transmitted tree" payload)

Per leaf `L` and per `symtype`, transmit a single `P(0)` value `sp0[L][symtype]` (uint16 `*M`,
`M=1<<16`), delta-coded across leaf index then varans-coded in the header. Sign (`symtype==1`) is
forced to neutral `M/2` (a sign bit is ~50/50; no gain, skip). Overhead: K=2048 -> ~12 KB raw,
delta+varans ~ 0.01-0.017 bpp (well under the 0.02 bpp model sub-gate).

### 3.3 Blend + cold-start removal

At each symbol: `L = T.leaf(f_raw)`; `p0 = clamp( W * sp0[L][symtype] + (1-W) * ema.predict(f) )`,
where `f` is the existing `LCFeat` (used ONLY to drive the retained EMA refinement) and `ema` is the
existing `LearnedModel`. At `W=1.0` pure-transmitted is the guaranteed-no-worse lower bound. At the
pinned `W=0.7` the transmitted backbone removes cold-start while the EMA still corrects rich leaves.

### 3.4 Two-pass coder (mirrors `encode_static` / `encode_static_cluster`)

- **Pass 1 (analyze):** walk the EBCOT coding order, compute `L` from RAW features, accumulate
  `cnt[L][symtype][bit]`.
- **Pass 2 (code) + decode:** re-walk (fresh state), compute `L`, blend `sp0[L][symtype]` with EMA,
  rANS-encode/decode. Byte-exact by the SAME symmetry argument as R6-B/R6-C: both ends compute `L`
  from already-coded state, read the same transmitted `sp0`, and evolve the EMA in the same order.

---

## 4. Module Breakdown (concrete file / struct / function specs for the Builder)

### 4.1 Baked tree include: `prism/src/codec/route6d_tree.inc`

```cpp
// Baked by `prism train-r6d-tree` (section 5.7). NOT transmitted (I29).
struct R6DNode {
    uint8_t  split;   // 0 = leaf; 1 = ordinal (raw magnitude >= thr); 2 = categorical (symtype == thr)
    uint8_t  feat;    // feature id for ordinal split (see R6D_FEAT_*)
    uint16_t thr;     // magnitude threshold (raw) for ordinal; symtype value for categorical
    int32_t  lhs, rhs; // child node indices into R6D_TREE (leaf nodes have split==0)
};
constexpr int R6D_K = 2048;                 // primary leaves (addendum 28)
constexpr int R6D_NODES = 2 * R6D_K - 1;
extern const R6DNode R6D_TREE[R6D_NODES];   // root at index 0

struct R6DRaw {
    uint8_t symtype;       // 0 sig, 1 sign, 2 refine
    uint8_t orient, level;
    uint8_t parent_sig;
    int     mW, mN, mE, mS;     // 4-connected raw neighbour magnitudes
    int     mNW, mNE, mSW, mSE; // 4 diagonal raw neighbour magnitudes
    int     mParent;            // parent co-located raw magnitude
    int     mLuma;              // co-located luma raw magnitude (X5a)
    int     mOwn;               // own reconstructed magnitude so far
    int     ppos;               // bitplane index
};

inline int r6d_leaf(const R6DRaw& r) {            // walk baked tree to a leaf in [0,K)
    int node = 0;
    while (R6D_TREE[node].split != 0) {
        const R6DNode& nd = R6D_TREE[node];
        bool go_rhs = (nd.split == 1) ? (r6d_raw_feat(r, nd.feat) >= (int)nd.thr)
                                      : ((int)r.symtype == (int)nd.thr);
        node = go_rhs ? nd.rhs : nd.lhs;
    }
    return node;
}
```
The feature ids `R6D_FEAT_W..R6D_FEAT_LUMA, R6D_FEAT_OWN, R6D_FEAT_PPOS` are enumerated constants
shared by the offline trainer and the runtime include (so the baked array and the runtime walk can
never desync).

### 4.2 Raw feature extraction: mirror `learned_features` (`bitplane.cpp:199`)

Add `r6d_raw_features(sig, curmag, parent_cur, pw, ph, lmag, w, h, x, y, p, symtype, orient, level,
parent_sig, fc, dg, R6DRaw& r)`. It reads the **raw** neighbour/own/parent/luma magnitudes
(available from already-coded `sig`/`curmag`/`parent_cur`/`lmag`, exactly as `learned_features`)
and fills `R6DRaw`. No log2 quantisation. This is the single source of truth so encode/decode/train
agree.

### 4.3 `BitplaneCoder` static-tree coder (`bitplane.h` / `bitplane.cpp`)

Add to `bitplane.h`:
```cpp
struct StaticTreeHist {
    int k = 0;                                  // leaves
    std::vector<std::vector<std::vector<uint32_t>>> cnt; // [K][3][2] c0/c1 raw counts
};
struct StaticTreeBitplaneResult {
    std::vector<std::vector<uint8_t>> streams;
    std::vector<uint8_t> sub_maxbits;
    uint32_t total_symbols = 0;
    StaticTreeHist hist;
};

StaticTreeBitplaneResult encode_static_tree(
    const std::vector<Subband>& subbands, int k, float W = 0.7f,
    int maxbits_override = 0,
    const std::vector<std::vector<int32_t>>* luma_mag = nullptr) const;

std::vector<Subband> decode_static_tree(
    const std::vector<std::vector<uint8_t>>& streams,
    const std::vector<Subband>& layout,
    const std::vector<uint8_t>& sub_maxbits,
    uint32_t total_symbols,
    const StaticTreeHist& hist,
    const std::vector<std::vector<int32_t>>* luma_mag = nullptr) const;
```

`encode_static_tree` mirrors `encode_static_cluster` (`bitplane.cpp:913`) but replaces
`r6c_cluster(f, mlp0, kb)` with `r6d_leaf(r6d_raw_features(...))`. The blend model:
```cpp
struct StaticTreeModel {
    static constexpr uint32_t M = 1u << 16;
    float W_STATIC = 0.7f;
    int K = 0;
    std::vector<uint16_t> sp0;   // [K*3], sign entries forced to M/2
    LearnedModel learned;
    void init(int k, const StaticTreeHist& h);
    uint16_t predict(const R6DRaw& r, const LCFeat& f) const {
        uint16_t sp = sp0[r6d_leaf(r) * 3 + r.symtype];
        if (W_STATIC >= 1.0f) return sp;
        uint16_t lp = learned.predict(f);          // EMA refinement, keyed on LCFeat
        int b = (int)(W_STATIC * (float)sp + (1.0f - W_STATIC) * (float)lp);
        return (uint16_t)std::clamp(b, 1, (int)M - 1);
    }
    void update(const LCFeat& f, uint8_t bit) { learned.update(f, bit); }
};
```
Pass 1 accumulates `cnt[leaf][symtype][bit]`; pass 2 derives `sp0[leaf*3+symtype]` from counts
(clamped to `[1, M-1]`, sign forced to `M/2`), then blends with the EMA and rANS-encodes. Decode
mirrors identically. This is a **drop-in replacement** for `encode_static` / `decode_static`; all
other code (walk order, rANS backend, residual path) is unchanged.

### 4.4 `WaveletHeader` + `R6D_FLAG` (`wavelet_container.h`)

```cpp
constexpr uint8_t R6D_FLAG = 16; // next free residual_mode bit (R6C_FLAG == 8)
```
Add to `WaveletHeader`:
```cpp
// R6-D (Route 6 lever D): true JXL-Modular property tree. r6d_k leaves; r6d_p0
// holds K*3 transmitted P(0)*M values (sign entries neutral), delta+varans coded
// in the header stream. The tree itself is baked (route6d_tree.inc), zero bytes.
uint16_t r6d_k = 0;
std::vector<uint16_t> r6d_p0; // [K*3], present iff residual_mode & R6D_FLAG
```

### 4.5 Serialization (`wavelet_container.cpp`)

In `write_header`/`read_header`, when `residual_mode & R6D_FLAG`:
- write `r6d_k` (uint16);
- delta-code `r6d_p0` across leaf index (loop `L*3 + symtype`), then varans-encode the delta stream
  into the header byte vector (reuse existing `write_u16_le_vec` + a varans helper already used for
  `sub_hist`/`cluster_hist`).
- on read, reverse to repopulate `r6d_p0`.

Reconstruct `StaticTreeHist` from `r6d_p0` + `r6d_k` for `decode_static_tree` (sign entries are
neutral so they need no count; for symtype 0/2 derive `cnt[leaf][symtype][bit]` as the implied
pseudo-count or simply pass `sp0` directly via a lightweight `StaticTreeHist` carrying the P0s).

### 4.6 `frame_wavelet_encode_r6d` (`wavelet_container.cpp`, mirror `frame_wavelet_encode_r6c`)

```cpp
std::vector<uint8_t> frame_wavelet_encode_r6d(const Raster& raster, WaveletFilter filter,
                                              int levels, int k, float W, size_t& net_out);
```
Pipeline identical to `frame_wavelet_encode_r6c` (`wavelet_container.cpp:604`) but calls
`coder.encode_static_tree(R, k, W, /*maxbits*/0, &luma_mag)` and sets
`hdr.residual_mode = (uint8_t)(1u | R6D_FLAG)`, `hdr.r6d_k = (uint16_t)k`, `hdr.r6d_p0 = ...`.
In `frame_wavelet_decode`: if `residual_mode & R6D_FLAG`, parse `r6d_k`/`r6d_p0`, build
`StaticTreeHist`, dispatch to `decode_static_tree`.

### 4.7 CLIs (`prism/cli/main.cpp`)

- `prism wavelet-r6d <in.ppm> <out.prism> [--k 2048] [--w 0.7]` -> calls `frame_wavelet_encode_r6d`.
- `prism bench-r6d --kodak <dir> [--k 2048] [--w 0.7]` -> encodes every PPM, decodes, checks
  byte-exact, emits `prism/benchmarks/results/<date>-r6d-kodak24.csv` with columns
  `image,bytes,bpp` (per-sample bpp), AND prints BOTH units via `bench_gate.sh` semantics
  (mean_per_sample and mean_summed = 3 * mean_per_sample). Reuse the `bench-r6c`/`bench-r6b`
  harness scaffolding (round-trip + fuzz check).

### 4.8 Offline tree trainer: `prism train-r6d-tree` (`prism/cli/main.cpp` + new
`prism/src/codec/r6d_tree_builder.cpp`)

1. For each training PPM: YCoCg-R -> `WaveletLift::forward` -> `CoefficientPredictor` residual
   `r = c - c_hat` -> walk the EXACT EBCOT order used by `encode_static_tree`, emitting per symbol
   `(R6DRaw, true bit)` via an extension of `BitplaneCoder::collect_samples` (add raw-magnitude
   emission).
2. Greedy growth: root = all samples; for each leaf try every candidate split (each ordinal feature
   x a threshold set = distinct observed raw magnitudes in that feature, capped/sampled if huge;
   plus the categorical symtype root). Pick the split maximising the weighted binary-bit entropy
   reduction. Recurse to `K` leaves or gain < epsilon.
3. Bake `R6D_TREE`, `R6D_K`, `R6D_FEAT_*` into `prism/src/codec/route6d_tree.inc`.

**Leakage rule (critical, honest):** the tree partition (`T`) is baked ONCE and is a *function of
code structure only* - it never sees the test image's symbol stream. The per-image `sp0` histograms
transmitted in each header are computed by encode pass 1 **from the image being coded**. Training
the partition on a 20-image Kodak subset is standard offline model selection (like the MLP weights);
it does NOT transmit anything and does NOT touch the per-image entropy stream. The held-out 4-image
R6-D0 gate (section 6) is the real leakage check.

### 4.9 Pinned constants (Addendum 28, frozen before measurement)

- `R6D_FLAG = 16`; `R6C_FLAG = 8` unchanged.
- `R6D_K`: primary `2048`; swept `{512, 1024, 2048, 4096}` (bake a separate tree array per swept K,
  selectable via `--k`; default 2048).
- `R6D_W`: default `0.7f`; swept `0.0..1.0` (`W=1.0` = pure transmitted, the no-worse bound).
- `R6D_M = 1<<16`; `LearnedModel` EMA retained as the `(1-W)` refinement.
- Tree `T` baked in `route6d_tree.inc`; header carries `uint16 K` + `K*3` delta/varans `P(0)`.

---

## 5. Test Matrix

| Test | Fixture | Assert |
|---|---|---|
| `R6D.RoundtripFull` | synthetic + real Kodak-24 PPMs | `decode(encode(x))` byte-exact on all 24 (I29: zero full-model bytes) |
| `R6D.RoundtripVariants` | all `--k` in {512,1024,2048,4096}, `--w` in {0.3,0.7,1.0} | byte-exact, no crash |
| `R6D.SubbandRoundtrip` | single subband forward/back | coeffs identical |
| `R6D.NoWorseBound` | any image, `--w 1.0` | rate <= equivalent pure-EMA path within tolerance (sanity that blend is monotone) |
| `R6D.TreeDeterminism` | same input, two runs | identical `r6d_p0` header bytes (reproducible) |
| `R6D.Fuzz` | random bitflip in payload | decode throws (CRC) or reconstructs; never silent corruption |
| `R6D.GateDualUnit` | `prism bench-r6d --kodak` | CSV + `bench_gate.sh` both units printed; PASS when summed < 9.498 AND per-sample < 3.166 |

Register `tests/unit/test_r6d.cpp` in `prism/CMakeLists.txt`. Mirror `tests/unit/test_r6c.cpp`
(`R6C.*` / `R6B.*` suites) for structure.

---

## 6. Build Milestones (progress checklist)

### D0: Scaffold + baked tree
- [ ] `route6d_tree.inc` with `R6D_TREE`, `R6D_K`, `R6D_FEAT_*` (generated by trainer, primary K=2048)
- [ ] `r6d_raw_features` + `r6d_leaf` (+ `r6d_raw_feat`) in `bitplane.cpp`; `R6DRaw`/`R6DNode` in `bitplane.h`
- [ ] `R6D_FLAG = 16`, `WaveletHeader::r6d_k` / `r6d_p0`; serialize/parse in `wavelet_container.cpp`

### D1: Two-pass static-tree coder
- [ ] `encode_static_tree` / `decode_static_tree` + `StaticTreeModel` / `StaticTreeHist` / `StaticTreeBitplaneResult`
- [ ] `frame_wavelet_encode_r6d` + decode dispatch (`R6D_FLAG`)

### D2: CLIs + offline trainer
- [ ] `prism wavelet-r6d`, `prism bench-r6d` (dual-unit CSV + byte-exact + fuzz)
- [ ] `prism train-r6d-tree` (extends `collect_samples` for raw magnitudes; greedy growth; bakes .inc)

### D3: Tests
- [ ] `tests/unit/test_r6d.cpp` (full-frame, subband, variants, no-worse, determinism, fuzz) registered

### D4: Measurement + gates
- [ ] **R6-D0** held-out 4-image (kodim02/07/17/21) median NET <= -2.0% vs X6b (3.2442) BEFORE full run
- [ ] **R6-D1** full Kodak-24: summed <= 9.498 AND per-sample <= 3.166 (M2) byte-exact, fuzz clean
- [ ] **R6-D2** sweep K/W; add R-class refinement histogram (research 2.2) / stack X6c `sub_scale` if short
- [ ] **R6-D3** full Kodak-24 dual-unit: summed <= 8.655 AND per-sample <= 2.885 (M3)

---

## 7. Honest cascade (no re-tuning to force a pass)

- **R6-D0 FAIL** (cannot beat X6b by >= 2% on held-out): the property-tree / transmitted-histogram
  lever is exhausted on this residual. This is the binding STOP-AND-REPORT outcome. ESCALATE to
  Owner/Maintainer: the residual after integer Le Gall 5/3 is the floor; the ~11% to M3 cannot come
  from context modeling alone - it requires a BETTER BASE TRANSFORM (lossless 9/7 vs JXL's
  per-group transforms, or a prediction+transform hybrid). Recommend a NEW research track "Route 7:
  transform/prediction redesign" authorized by the owner. Do NOT re-tune `R6D_K`/`R6D_W` to force a
  pass.
- **R6-D0 PASS, R6-D1 M2 PASS, R6-D3 M3 FAIL:** M2 genuinely declared PASS (first time in the lab's
  history); M3-PENDING ledger; attempt R6-D2 stacking, then escalate for Route 7.
- **R6-D3 PASS:** both gates met in both units -> format-stable v3 PR `Refs #130`.

**Honesty about M3:** context modeling (R6-D) plausibly removes the 3-9% cold-start waste + fixed-grid
resolution loss, landing near 2.95-3.10/sample. That clears M2 but is at risk for M3 (2.885). The
11% total gap to M3 is larger than any single context-modeling lever can deliver on this residual;
the complementary transform/prediction redesign (Route 7) is the honest remaining path and must be
researched, not assumed away. No success claim leaves the lab without a fresh, reproducible
measurement stated in BOTH units.

- the Architect
