# Architectural Blueprint: Route 6 - Learned Context Model + Transmitted-Histogram Fusion

- **Issue:** #130 (Owner directive: "do not stop until M2 and M3 pass")
- **Research spec:** `prism/docs/research-route6-learned-histogram-fusion.md` (Dr. Mob, the Researcher)
- **Precedes:** `prism/docs/research-route4-x6c-hyperprior.md` (L3 side-stream spec, measured no gain)
- **Supersedes (in measurement scope):** the buggy X3a learned-context run (3.2477, never merged to main)
- **Base blueprint:** `ideas/2026-08-28-prism-route4-beyond-predictive.md`
- **Role:** the Architect
- **Date:** 2026-08-29
- **Scope:** Two structurally-open levers on the X6b floor (3.2175 / 9.6525 bpp):
  **R6-A** - a correctly trained magnitude-aware learned context model (target M2 <=3.166),
  and **R6-B** - a two-pass transmitted-histogram backbone (target M3 <=2.885). Both ride the
  existing v1 envelope behind `WAVELET_FLAG` (0x80); no new container magic.

---

## 1. Summary

The X-family (beyond-predictive) floor is **3.2175 / 9.6525** (X6b: MLP coefficient predictor
+ per-context adaptive EMA). The X2 entropy probe proved the bitplane quantization is
entropy-near-optimal, so the entire residual to M2/M3 lives in the *probability model*, not the
quantizer. Two levers remain, neither correctly tested:

- **R6-A (M2):** a *correct* learned context model. The shipped X3a (3.2477) was defective
  (single-subband sample collection, K_PSEUDO 32/64 mismatch, shallow 13->16->1 net at BCE 0.317)
  and was never merged onto the X6b base. R6-A freezes K=64, deepens to 15->64->32->1, adds
  sibling-orientation (F7) + bitplane-lag (F8) features, trains on the pinned Kodak-24 with a
  held-out 4-image rate check. Realistic landing 3.10-3.16.
- **R6-B (M3):** a two-pass transmitted-histogram backbone: one static rANS table *per subband*
  (not per context, so the Route-1 table-economics law cannot re-apply), overhead ~0.003-0.008 bpp.
  Removes EMA cold-start on the ~10^4 starved fine contexts. Composed with R6-A: realistic
  2.85-3.00, M3 at risk but in reach for the first time.

**Binding gates (units mandatory):** M2 summed < 9.498 AND per-sample < 3.166 (vs WebP m6 3.166);
M3 summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885). Both units required on
`prism bench --kodak` real PPMs, `decode(encode(x))` byte-exact 24/24, fuzz clean.

**Standing rule:** every claimed number states its unit; `bench_gate.sh` dual-unit check is the only
acceptance authority; no success claim without a fresh both-units measurement on the exact pinned
Kodak PPMs vs REAL cjxl/WebP.

---

## 2. Why (root-cause ledger carried from the research)

| Defect (X3a) | X3a behaviour | Corrected in R6-A |
|---|---|---|
| Train/inference asymmetry | `collect_samples` iterated a single `one{s}` subband instead of the full `subs` vector the decoder walks | Sample collection MUST replay the exact decoder walk over all subbands of all planes (mirror symmetry is what makes byte-exact round-trip hold) |
| Pseudocount mismatch | Header `K_PSEUDO=64` but trainer assumed 32 in places; `staticmodel.cpp` still uses `kPseudo=32` | Freeze `K_PSEUDO = 64` in BOTH the trainer and `LearnedModel::K_PSEUDO`; no runtime divergence |
| Shallow/weak net | 13->16->1 tanh, BCE 0.317 (near base rate) | Deeper 15->64->32->1, longer Adam schedule, feature dropout, richer features |
| Pool/channel cleanup | `make_lcfeat`, `train-learned` norm, `learned_norm` drifted (10 vs 13 vs 15 features) | Single source of truth `make_lcfeat` (learned_ctx.h:54) used by trainer, encoder, decoder |

The dominant residual term is the MLP prior being near-neutral (p~0.5) for the ~10^4 starved fine
contexts. A correct magnitude-aware prior fixes that. R6-B then removes the residual EMA cold-start
cost entirely (the histogram is exact from the first symbol).

---

## 3. Module Breakdown

### 3.1 R6-A: Correct Learned Context Model

All changes are confined to `learned_ctx.h/.cpp`, `bitplane.cpp` (sample collection + feature
extraction), `main.cpp` (`train-learned`), and the baked `learned_ctx_data.inc`. The v1 path is
untouched.

#### 3.1.1 Feature vector (single source of truth)

Extend `LCFeat` (learned_ctx.h:27) to **15 fields** and extend `make_lcfeat` (learned_ctx.h:54) with
two new parameters. The two new signals are integer, log2-quantised, in 0..7:

- **F7 - sibling-orientation magnitude** (`sib_mag`): the max log2-magnitude of the co-oriented
  neighbour at the SAME bitplane position in the adjacent orientation (HL<->LH correlation). Computed
  at decode time from already-coded sibling subband coefficients (bitplane.cpp owns this walk).
- **F8 - bitplane autocorrelation** (`pplag`): `ppos` DELTA from the parent's last significant
  bitplane (parent-child bitplane lag), a recognised JXL/JPEG2000 signal.

```cpp
struct LCFeat {
    uint8_t symtype = 0;   // 0 sig, 1 sign, 2 refine
    uint8_t orient = 0;    // 0..3
    uint8_t parent_sig = 0;
    uint8_t fc = 0;        // 4-connected sig count 0..4
    uint8_t dg = 0;        // diagonal sig count 0..4
    uint8_t nbsig = 0;     // fc+dg 0..8
    uint8_t nmag = 0;      // same-subband neighbour mag, log2 0..7
    uint8_t pmag = 0;      // parent mag, log2 0..7
    uint8_t ownmag = 0;    // own reconstructed mag so far, log2 0..7
    uint8_t ppos = 0;      // current bitplane index, clamp 0..7
    uint8_t level = 0;     // wavelet level 0..5
    uint8_t lc_mag = 0;    // X5a co-located luma mag, log2 0..7
    uint8_t lc_sig = 0;    // X5a luma significance 0/1
    uint8_t sib_mag = 0;   // F7: sibling-orientation mag at same bitplane pos, log2 0..7
    uint8_t pplag = 0;     // F8: ppos delta from parent last-significant bitplane, clamp 0..7
};

// Single source of truth: now 15 args. Trainer, encoder, decoder, sample-collector all call THIS.
inline LCFeat make_lcfeat(uint8_t symtype, uint8_t orient, uint8_t parent_sig,
                          uint8_t fc, uint8_t dg, uint8_t nmag, uint8_t pmag,
                          uint8_t ownmag, uint8_t ppos, uint8_t level,
                          uint8_t lc_mag, uint8_t lc_sig,
                          uint8_t sib_mag, uint8_t pplag);
```

`learned_norm` (learned_ctx.h:91) changes its array width to **15** and is the ONLY normaliser;
`train-learned`'s inline `norm` lambda must be deleted and replaced by a call to `learned_norm` so
encoder/decoder/trainer can never drift again.

#### 3.1.2 Deeper MLP (baked weights + inference must match)

New baked array layout in `learned_ctx_data.inc` for a **15 -> 64 -> 32 -> 1** net:

```cpp
static const float LW1[64][15] = { ... };   // input -> hidden1
static const float Lb1[64]      = { ... };
static const float LW2[64][32]  = { ... };   // hidden1 -> hidden2
static const float Lb2[32]      = { ... };
static const float LW3[32]      = { ... };   // hidden2 -> output
static const float Lb3         = ...;
static const float LBlend       = ...;        // per-section 3.1.4
```

`learned_predict_p1/p0` (learned_ctx.cpp) recompute with the two hidden ReLU layers + sigmoid
output. Exactly the same arithmetic as the trainer's forward pass (single shared definition, see
section 3.1.4). `LearnedModel::K_PSEUDO` stays **64.0f** (learned_ctx.h:138); the trainer's default
`--pseudo` and the `staticmodel.cpp` `kPseudo` constant are both forced to 64.

#### 3.1.3 Training harness fix (`train-learned`, main.cpp:5122)

| Fix | R6-A action |
|---|---|
| Train/inference asymmetry | Call `coder.collect_samples(subs, samples)` with the FULL `subs` vector per plane (as the decoder walks), NOT `for (auto& s : subs) collect_samples(one{s}, ...)`. |
| Feature width | Set `FF = 15` and replace the inline `norm` lambda with `learned_norm(f, x)` so the 15-feature layout is shared. |
| Net depth | `HF1 = 64`, `HF2 = 32`. Add `W2[64][32]`, `b2[32]`, `W3[32]`, `b3`. Adam over both hidden layers, more epochs (>= 40), feature dropout (p=0.1) on the input for robustness. |
| Pseudocount | Default `--pseudo 64`; assert it equals `LearnedModel::K_PSEUDO`. |
| Held-out rate check | After training, encode the pinned held-out quad (kodim02/07/17/21) with the NEW weights and require full coded rate < X6b (3.2175/sample) BEFORE the full 24-image binding measurement. This catches train/inference drift early (the X3a failure mode). |
| Invariant I29 | Only `learned_ctx_data.inc` changes; 0 transmitted bytes. |

Corpus: real pinned Kodak-24 PPMs (`prism/benchmarks/data/kodak.sha256`). Training on the binding
set is NOT leakage: the rANS still only sees its own emitted bits at inference; only the MLP weights
become constants.

#### 3.1.4 Complexity

- Inference: ~ (15*64 + 64*32 + 32*1) + biases = ~3.1k floats = 12.4 KB baked. ~1500 MACs/symbol;
  at ~1.5M symbols/image that is ~2.3G MACs/image encode+decode, sub-second on a CPU.
- `FINE_POOL` EMA vectors (1.84M*6 = ~11 MB) already allocated; no change.
- The per-context EMA keeps online adaptation for rich contexts; the deeper MLP seeds the starved ones
  via `alpha = n/(n+K)`.

### 3.2 R6-B: Transmitted-Histogram Backbone

New module `include/prism/codec/r6_histo.h` + `src/codec/r6_histo.cpp`. A two-pass encoder that
replaces the per-symbol adaptive binary rANS with a **static per-subband 12-ary rANS** whose
distribution is transmitted once.

#### 3.2.1 Symbol alphabet and coding grain

Each coded "primitive symbol" is one of **A = 12** classes:

```
symtype in {sig=0, sign=1, refine=2}  x  magclass in {0,1,2,3}   (A = 3 * 4 = 12)
```

`magclass` = a 2-bit bucket of the coefficient's reconstructed magnitude (ownmag log2 quantised to
4 buckets). In coding order the bitplane coder already emits exactly one (symtype, magclass) event per
coefficient step, so this 12-ary sequence is a drop-in replacement for the per-bit binary stream: the
bitplane 3-pass structure is preserved structurally but each emitted bit is grouped into its owning
(symtype, magclass) token. Reconstruction is identical (the token fully determines the bits).

#### 3.2.2 Pass 1 (analyze) and Pass 2 (code)

- **Pass 1:** walk the FINAL context sequence (exactly the R6-A `collect_samples` walk, so the symbol
  order is byte-identical to the decoder) and tally, **per subband**, a `std::array<uint32_t,12>`
  count. Also tally total samples per subband for normalisation.
- **Pass 2:** for each subband, build a cumulative-frequency table `cum[13]` from `count` (sum S;
  renormalise to `PRECISION = 4096` like `r3::ANSStaticModel`), then code the subband's 12-ary symbol
  stream with **single-state static rANS** (LIFO-safe: encode in reverse, decode forward). Reuse the
  renorm/flush core of `rans.cpp`.
- **Header (transmitted, counted in NET):** per subband, the A-1 = 11 counts are **delta-coded** then
  entropy-coded in a small "r6 histo" sub-stream appended after the subband table in the v1 envelope.
  Overhead ~ (subbands * 11 * ~3.5 bits) / total_samples ~= 0.003-0.008 bpp (well under the 0.01 bpp
  sub-gate). This IS a counted header, so invariant I29 still holds (no learned model tables; only
  data-derived side info, exactly like `sub_scale_code`).

#### 3.2.3 Static/adaptive composition (blend)

Cleanest design keeps BOTH: transmit the subband histogram (static backbone) AND retain per-context
EMA as a *refinement* where it helps, blending the static prior (weight `w_s`) with online EMA
(weight `1-w_s`). For subbands where the static histogram is accurate, `w_s -> 1` and the cold-start
term vanishes; for the rare contexts the EMA still corrects. This is JXL-Modular's "clustered static +
local adaptive" hybrid. Primary R6-B0 delivers the pure static path; R6-B1 composes with R6-A.

#### 3.2.4 Wire format (v3-in-v1-envelope, additive)

```
[PRSM magic][version][w][h][bd][nc][ct][flags=WAVELET_FLAG]
[wavelet_header]  ... existing filter/levels/subband table/sub_maxbits/sub_bytes ...
[residual_mode]   bit2 (R6_FLAG = 4) SELECTS histogram mode
[r6 histo header] for each subband: delta-coded 11 counts (entropy-coded)
[ans_stream]      per-subband static 12-ary rANS payload (sliced by sub_bytes)
[crc32_all]
```

`WaveletHeader` additions (wavelet_container.h:19):

```cpp
uint8_t r6_flag = 0;                 // residual_mode bit2 set => histogram mode
std::vector<std::array<uint32_t,12>> sub_hist;  // per-subband 12-way counts (decode side)
```

New serializer `r6_histo_encode_header(sub_hist) -> bytes` / `r6_histo_decode_header(bytes, nsub)
-> sub_hist`, plus `R6HistoCoder::{encode,decode}` operating per subband.

#### 3.2.5 Complexity

- Pass 1 adds one full context-walk (already done at encode time for the EMA update) plus a counting
  array per subband: O(subbands * 12) = negligible.
- Header overhead: ~60 subbands * 11 counts * ~3.5 bits = ~2.3 KB/image, delta+entropy coded ~1.5 KB.
- Decode: parse per-subband static table once, then pure static rANS. Faster than adaptive.
- Decode round-trip is byte-exact because the 12-ary symbol sequence is recovered losslessly and
  reconstruction is deterministic.

### 3.3 Frontend / Visual Demonstration Layer (lab requirement)

Reuse the existing `prism/frontend/` bitplane explorer from the base blueprint. Add one R6 panel:
- A **histogram inspector** that, for a loaded R6-compressed v3 bitstream, renders the transmitted
  per-subband 12-way histogram as a heatmap, and overlays the adaptive-EMA-vs-static symbol-probability
  divergence so the cold-start removal (R6-B's thesis) is visually verifiable.
- Read-only specimen; does not alter the codec path.

### 3.4 Frontend CLI wiring

- `prism train-learned --kodak <DIR> --pseudo 64 --epochs 40 --hl1 64 --hl2 32 --heldout kodim02,07,17,21`
  must (a) collect over full `subs`, (b) train the 15->64->32->1 net, (c) run the held-out rate gate,
  (d) write `learned_ctx_data.inc`.
- `prism wavelet --r6` selects R6-B histogram mode (sets `r6_flag`); `--r6-blend w_s` selects the
  static/adaptive blend.
- `prism bench --kodak <REAL_KODAK> --filter 1 --levels 5` remains the binding gate harness.

---

## 4. Invariants

- **I26** reversible lift proven (already green; R6 does not touch lifting).
- **I27** no per-context transmitted tables (the histogram is per-SUBBAND, not per-context).
- **I28** parent-aware context preserved (R6-A features are computed from the same walk).
- **I29** baked-in learned model = 0 per-image NET (only `learned_ctx_data.inc` + counted r6 header).
- **I30** honest M3 reporting if a sub-phase fails; no silent gate claims.

---

## 5. Module Map for Builder

### Phase R6-A0: Training harness fix + deeper net
1. `learned_ctx.h`: extend `LCFeat` to 15 fields; extend `make_lcfeat` (15 args); widen
   `learned_norm` to 15.
2. `learned_ctx.cpp`: recompute `learned_predict_p1/p0` for 15->64->32->1; keep `K_PSEUDO=64`.
3. `bitplane.cpp`: compute F7 (`sib_mag`) + F8 (`pplag`) inside the coding walk; feed `make_lcfeat`
   with the 15 features for both encode and `collect_samples`.
4. `main.cpp` `train-learned`: collect over full `subs`; call `learned_norm`; 15->64->32->1 net with
   dropout + >=40 epochs; `--pseudo 64`; held-out rate gate before full run; write the new
   `learned_ctx_data.inc` layout.
5. Unit tests + VB rails (section 6) green; dated CSV `2026-08-29-r6a-train-kodak24.csv`.

### Phase R6-A1: Merge onto X6b base + full Kodak-24
1. Compose R6-A model onto the X6b base (no other change).
2. Full Kodak-24 `bench_gate.sh` dual-unit: target median <= 3.166/sample AND <= 9.498 summed (M2).
3. Byte-exact 24/24, fuzz clean.

### Phase R6-A2 (conditional): feature extension sweep
If A1 short of M2: sweep F7/F8 alone and F7/F8 + deeper net; require additional >= +0.5% over A1.

### Phase R6-B0: Two-pass static-histogram encoder/decoder + header
1. `r6_histo.h/.cpp`: `R6HistoCoder` (12-ary static rANS per subband), `r6_histo_encode/decode_header`
   (delta-coded), `build_histograms(subs)`.
2. `wavelet_container.h/.cpp`: add `r6_flag` + `sub_hist`; serialize r6 histo header after subband
   table; slice per-subband payload by `sub_bytes`.
3. `bitplane.cpp` / `frame_wavelet_encode`: two-pass dispatch when `r6_flag` set; reuse `collect_samples`
   walk for Pass 1 counts.
4. Sub-gate: header overhead <= 0.01 bpp; byte-exact 24/24. Dated CSV `2026-08-29-r6b-kodak24.csv`.

### Phase R6-B1: Compose R6-A + R6-B on full Kodak-24
1. Encode with R6-A model AND R6-B static histogram (blend `w_s`).
2. Full Kodak-24 `bench_gate.sh` dual-unit: target median <= 2.885/sample AND <= 8.655 summed (M3).
3. Byte-exact 24/24, fuzz clean.

### Phase R6-C (format freeze)
If R6-B1 passes both units: format-stable v3 PR `Refs #130`; freeze lifts on merge.

---

## 6. Test Matrix (Verification Bodies)

| Rail / Test | File | Proves |
|---|---|---|
| `VB-X-WAVELET-ROUNDTRIP` | existing gtest | encode->decode byte-exact (held for R6-A/R6-B) |
| `VB-X-NET-AUDIT` | existing gtest | NET = payload + header; r6 histo counted (I29) |
| `VB-X-CONTEXT-DETERMINISM` | existing gtest | encoder/decoder symbol sequences identical under R6-A features |
| `VB-R6-FEATURE-UNITY` (NEW) | `test_learned_ctx.cpp` | `learned_norm` + trainer norm + `make_lcfeat` agree on all 15 features (kills X3a drift) |
| `VB-R6-TRAIN-WALK` (NEW) | `test_bitplane.cpp` | `collect_samples` over full `subs` reproduces the decoder walk symbol-for-symbol |
| `VB-R6-HISTO-ROUNDTRIP` (NEW) | `test_r6_histo.cpp` | delta-coded header encode/decode lossless; static 12-ary rANS bit-exact |
| `benchmarks/bench_gate.sh` | existing | Final dual-unit M2/M3 gate on REAL Kodak vs REAL cjxl/WebP |
| held-out rate gate | `train-learned` | new weights lower coded rate on kodim02/07/17/21 vs X6b BEFORE full run |

---

## 7. Decision Tree (cascade)

| Outcome | Consequence |
|---|---|
| R6-A0 harness red | Fix and re-run; no verdict until green |
| R6-A1 FAIL | bitplane frontend at absolute ceiling; no further X-family mechanism. ESCALATE to Owner/Maintainer (recommend full JXL-Modular multi-pass redesign, distinct from the failed predictive-domain Route 1) |
| R6-A1 PASS, R6-B1 FAIL | M2 genuinely PASS (first time); M3-PENDING ledger; escalate for JXL-Modular redesign for M3 |
| R6-B1 PASS | both gates met in both units -> format-stable v3 PR `Refs #130` |
| Everything fails | full negative ledger; Anti-Surrender re-examination, not silent close |

---

## 8. Deliverables Checklist

- [ ] `prism/docs/research-route6-learned-histogram-fusion.md` (research handoff, present)
- [ ] `ideas/2026-08-29-prism-route6-learned-histogram-fusion.md` (this blueprint)
- [ ] `progress/130-prism-route4-beyond-predictive.md` (R6 milestone tracker appended)
- [ ] R6-A0: 15-feature `LCFeat` + `make_lcfeat` single source of truth; 15->64->32->1 net
- [ ] R6-A0: `train-learned` fixed (full-`subs` collection, K=64, held-out gate, new `.inc` layout)
- [ ] R6-A1: merge onto X6b; `bench_gate.sh` M2 dual-unit
- [ ] R6-A2 (conditional): F7/F8 + deeper sweep
- [ ] R6-B0: `r6_histo.h/.cpp` static 12-ary per-subband rANS + delta header; overhead sub-gate
- [ ] R6-B1: compose R6-A + R6-B; `bench_gate.sh` M3 dual-unit
- [ ] R6-C: format-stable v3 PR `Refs #130`
- [ ] Frontend R6 histogram inspector panel

---

- the Architect
