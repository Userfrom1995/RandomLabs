# Architectural Blueprint: Route 6 Continuation - Trained MLP Keystone + JXL-Modular Transmitted Property Tree

- **Issue:** #130 (Owner directive: "do not stop until M2 and M3 pass"; explicit ask: "true JXL-Modular multi-pass architecture (adaptive context clustering and transmitted trees)")
- **Precedes:** `ideas/2026-08-29-prism-route6-learned-histogram-fusion.md` (Route 6 spec, PR #176)
- **Measured state (real Kodak-24, both units, `bench_gate.sh`):**
  - X6b EMA floor: **3.2442 / 9.7326** (bpp/sample / summed) - the honest baseline to beat.
  - R6-A (deeper MLP, untrained weights): 3.2459 / 9.7377 (net neutral; MLP returns constant 32768).
  - R6-B (per-subband transmitted histogram): 3.4363 / 10.3089 (+6% worse; coarse 192 contexts cannot beat 1.84M fine EMA).
  - R6-C (per-fine-cluster transmitted histogram): 5.0847 / 15.2541 (+57% worse; `learned_ctx_data.inc` is ZEROS so `learned_predict_p0` collapses the cluster id to 3 contexts).
- **Root cause (single, decisive):** the learned MLP was **never trained**. `prism train-learned` exists but its output was never written into `learned_ctx_data.inc`, so every Route 6 variant that depends on the learned prior (R6-A, R6-B blend, R6-C cluster key) is exercised with a constant prior and cannot beat the EMA. The entire "learned context model" thesis is therefore **unmeasured**, not disproven.
- **Role:** the Architect
- **Date:** 2026-08-29
- **Scope:** two structurally-open levers, neither correctly tested:
  - **R6-A0** - actually train the MLP (the missing keystone), then re-measure R6-A honestly.
  - **R6-D** - a true JXL-Modular **transmitted property tree** (adaptive context clustering over features + transmitted per-leaf histograms), the owner's explicit "transmitted trees" that R6-B/R6-C only approximated with coarse/fixed partitions.

---

## 1. Summary

The EMA with 1.84M fine contexts (`LearnedModel::FINE_POOL = 1843200`) is a very strong online model: it is the reason every *untrained* Route 6 variant lands at or above 3.24. The EMA's only structural weakness is **cold-start on starved fine contexts** and **per-image non-adaptation** (its statistics are local, not global). Two distinct mechanisms attack exactly that:

1. **A trained MLP prior** seeds each fine context via the pseudocount blend (`alpha = n/(n+K)` in `LearnedModel::predict`), so starved contexts lean on a data-driven prior instead of a flat EMA. This is R6-A0.
2. **A transmitted property tree** partitions the feature space into leaves from *real per-image counts* (Pass 1) and transmits an exact per-leaf histogram (Pass 2). Unlike R6-B (fixed per-subband) and R6-C (MLP-keyed cluster, which collapsed because the MLP was untrained), the tree partition is built from genuine statistics, so it is informative even before MLP training. This is R6-D, the literal JXL-Modular mechanism.

Both ride the existing `WAVELET_FLAG` (0x80) envelope; no new container magic. The 13-feature `LCFeat`/`learned_norm` (single source of truth, `learned_ctx.h:54`/`learned_ctx.h:91`) is the feature basis for both.

**Binding gates (units mandatory):** M2 summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166); M3 summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885). Both units required on `prism bench --kodak` over the exact pinned Kodak PPMs (`prism/benchmarks/data/kodak.sha256`), `decode(encode(x))` byte-exact 24/24, fuzz clean.

**Standing rule:** every claimed number states its unit; `bench_gate.sh` dual-unit check is the only acceptance authority; no success claim without a fresh both-units measurement.

---

## 2. Why (root-cause ledger, carried from the measured R6-A/B/C builds)

| Symptom | Measured cause | Corrected by |
|---|---|---|
| R6-A neutral (3.2459) | `learned_ctx_data.inc` weights = ZEROS; `learned_predict_p0` returns constant 32768 | R6-A0: run `train-learned` to write real weights |
| R6-B worse (+6%) | per-subband 192-context histogram too coarse to beat 1.84M fine EMA; adds header overhead | R6-D: data-driven fine partition from real counts |
| R6-C much worse (+57%) | cluster id = `symtype*kb + (lp*kb>>16)` degenerates to 3 contexts because `lp = learned_predict_p0 = 32768` | R6-A0 (informative prior) AND R6-D (counts-based partition, not MLP-keyed) |

The decisive gap between Prism and JPEG XL lives in **context granularity + transmitted exact statistics**, exactly what a trained prior + transmitted tree deliver. This is the same architectural class JXL Modular uses to beat adaptive models; Prism's single-pass EMA simply cannot transmit exact per-context histograms without a second pass.

---

## 3. Module Breakdown

### 3.1 R6-A0: Train the learned MLP (the keystone, never executed)

All changes confined to `prism/src/cli/main.cpp` (`train-learned`, ~line 5352) and `prism/src/codec/learned_ctx_data.inc`. The v1 / X6b path is untouched.

#### 3.1.1 Fix the trainer (mirror-symmetric sample collection)

The current `train-learned` must collect samples by replaying the **exact decoder walk** over all subbands of all planes. The R6-C build already fixed `LearnedModel::fine_ctx` OOB (`return id % FINE_POOL`) so the encoder/decoder agree; the trainer must use the same `make_lcfeat` (13 args) and `learned_norm(f, out[13])` so the trained net sees the identical features the decoder computes at inference. Delete any inline `norm` lambda in `train-learned` (X3a drift bug).

#### 3.1.2 Net + bake

Keep the current 13-feature layout (do NOT introduce the blueprint's optional F7/F8 15-feature extension yet - it is unmeasured and risks re-drift). Train a net whose forward pass is **identical** to `learned_predict_p1/p0` in `learned_ctx.cpp`. Write the resulting `LW1/Lb1/.../LBlend` into `learned_ctx_data.inc` with the existing layout (verify `LBlend` and `K_PSEUDO = 64.0f` match `LearnedModel::K_PSEUDO`).

#### 3.1.3 Held-out rate gate (catches train/inference drift early)

After training, encode the pinned held-out quad (kodim02/07/17/21) with the NEW weights and require full coded rate < X6b (3.2442/sample) BEFORE the full 24-image binding measurement. This is the exact X3a failure guard.

#### 3.1.4 Invariant I29

Only `learned_ctx_data.inc` changes; 0 transmitted bytes. Weights are baked constants.

#### 3.1.5 Complexity

~12 KB baked weights; ~1500 MACs/symbol; sub-second CPU. No EMA pool change.

### 3.2 R6-D: Transmitted Property Tree (true JXL-Modular "adaptive context clustering and transmitted trees")

New module `include/prism/codec/r6_tree.h` + `src/codec/r6_tree.cpp`. A two-pass coder that transmits a small decision tree over `LCFeat` fields and a static per-leaf P(0) histogram.

#### 3.2.1 Features and splits

- Feature set = the 13 `LCFeat` fields, but the tree only admits **low-cardinality integer** features for cheap splits: `symtype(3)`, `orient(4)`, `parent_sig(2)`, `fc(5)`, `dg(5)`, `nbsig(9)`, `nmag(8)`, `pmag(8)`, `ownmag(8)`, `ppos(8)`, `level(6)`, `lc_sig(2)`, `lc_mag(8)`.
- A split node = `(feature_id, threshold)`; left child = feature <= threshold, right = feature > threshold. Greedy top-down construction (JXL-style gain) on Pass-1 counts: choose the split maximising the reduction in sum of per-child entropy costs, capped at `MAX_DEPTH=6` and `MAX_LEAVES=256`.

#### 3.2.2 Pass 1 (analyze) and Pass 2 (code)

- **Pass 1:** walk the FINAL symbol sequence (identical to the decoder walk and to R6-B's `collect_samples`) and, for each symbol, evaluate features, route to the current leaf set, and tally per-leaf `(c0, c1)`. This is the global per-image histogram - no EMA cold-start.
- **Pass 2:** for each leaf, build a cumulative-frequency table from `(c0, c1)` (renormalised to `PRECISION = 4096`), then code the leaf's symbol stream with **single-state static rANS** (LIFO-safe: encode reverse, decode forward), reusing `rans.cpp`. Leaves are coded in a fixed order so decode is deterministic.
- The transmitted tree + per-leaf counts replace the per-symbol adaptive EMA as the primary model. Optionally retain EMA as a *refinement* where a leaf is starved (`n < N_REFINE`), blending `w_e * EMA + (1-w_e) * leaf_hist` - this keeps online correction for rare leaves and combines R6-D with the R6-A0 MLP seed.

#### 3.2.3 Wire format (v3-in-v1-envelope, additive)

```
[PRSM magic][version][w][h][bd][nc][ct][flags=WAVELET_FLAG]
[wavelet_header]                       ... existing
[residual_mode]  bit3 (R6D_FLAG = 8)  SELECTS tree mode
[r6 tree header]  tree topology (node feature_id + threshold) + delta-coded per-leaf counts
[ans_stream]      per-leaf static rANS payload (sliced by leaf)
[crc32_all]
```

`WaveletHeader` additions (`wavelet_container.h`): `uint8_t r6d_flag = 0;`, `std::vector<uint8_t> tree_bits;`, `std::vector<uint32_t> leaf_counts;`. New serializers `r6_tree_encode_header(tree, leaf_counts) -> bytes` / `r6_tree_decode_header(bytes, nleaves)`.

#### 3.2.4 Overhead (sub-gate)

Tree: <= 2*MAX_LEAVES-1 nodes * ~2 bytes = ~1 KB. Per-leaf counts: `MAX_LEAVES * ~3.5 bits` delta-coded ~= 0.0008 bpp. Total << 0.01 bpp (I27: no per-fine-context transmitted tables; the tree is coarse and per-image).

#### 3.2.5 Round-trip

Byte-exact because (a) the leaf symbol stream is recovered losslessly and (b) the tree + counts are transmitted exactly. Reconstruction unchanged.

### 3.3 Frontend / Visual Demonstration Layer (lab requirement)

Reuse `prism/frontend/` bitplane explorer. Add one R6-D panel:
- Render the transmitted property tree as a collapsible node graph; for each leaf, show its histogram and the EMA-vs-leaf probability divergence. Visually proves the adaptive clustering and transmitted-statistics thesis.
- Read-only specimen; does not alter the codec path.

### 3.4 CLI wiring

- `prism train-learned --kodak <DIR> --pseudo 64 --epochs 40 --heldout kodim02,07,17,21` (R6-A0): collect over full `subs`, train, run held-out gate, write `learned_ctx_data.inc`.
- `prism wavelet --r6d` selects R6-D tree mode (sets `r6d_flag`); `--r6d-refine w_e` blends EMA for starved leaves.
- `prism bench --kodak <REAL_KODAK> --filter 1 --levels 5` remains the binding gate harness.

---

## 4. Invariants

- **I26** reversible lift proven (R6 does not touch lifting).
- **I27** no per-fine-context transmitted tables (tree is coarse, per-image, <= 256 leaves).
- **I28** parent-aware context preserved (tree features are computed from the same walk).
- **I29** baked learned model = 0 per-image NET; only `learned_ctx_data.inc` + counted r6 header.
- **I30** honest reporting if a sub-phase fails; no silent gate claims.

---

## 5. Module Map for Builder

### Phase R6-A0: Train the MLP keystone
1. `main.cpp` `train-learned`: collect over full `subs` using `make_lcfeat` (13 args) + `learned_norm(f, out[13])`; delete inline `norm`.
2. Train 13->64->32->1 net; forward pass identical to `learned_predict_p1/p0`; `--pseudo 64`; >= 40 epochs; held-out rate gate < 3.2442/sample.
3. Write `learned_ctx_data.inc`; run `VB-R6-FEATURE-UNITY` + `VB-R6-TRAIN-WALK` (from the Route 6 spec Test Matrix).
4. Re-measure R6-A on real Kodak-24 dual-unit; target median <= 3.166/sample (M2). Dated CSV `2026-08-29-r6a-trained-kodak24.csv`.

### Phase R6-D0: Transmitted property tree (two-pass, counts-based)
1. `r6_tree.h/.cpp`: `R6TreeCoder::{encode,decode}`; greedy tree build over the 13-feature subset; `r6_tree_encode/decode_header`.
2. `wavelet_container.h/.cpp`: add `r6d_flag` + `tree_bits` + `leaf_counts`; serialize after subband table; slice per-leaf payload.
3. `bitplane.cpp` / `frame_wavelet_encode`: two-pass dispatch when `r6d_flag` set; reuse `collect_samples` walk for Pass 1 counts.
4. Sub-gate: header overhead <= 0.01 bpp; byte-exact 24/24. Dated CSV `2026-08-29-r6d-kodak24.csv`.

### Phase R6-D1: Compose R6-A0 (trained MLP) + R6-D (tree) + optional EMA refinement
1. Encode with trained MLP seed + transmitted tree (blend `w_e` for starved leaves).
2. Full Kodak-24 `bench_gate.sh` dual-unit: target M3 median <= 2.885/sample AND <= 8.655 summed.
3. Byte-exact 24/24, fuzz clean.

### Phase R6-E (format freeze)
If R6-D1 passes both units: format-stable v3 PR `Refs #130`; freeze lifts on merge.

---

## 6. Test Matrix (Verification Bodies)

| Rail / Test | File | Proves |
|---|---|---|
| `VB-X-WAVELET-ROUNDTRIP` | existing gtest | encode->decode byte-exact (held for R6-A0/R6-D) |
| `VB-X-NET-AUDIT` | existing gtest | NET = payload + header; r6 tree header counted (I29) |
| `VB-R6-FEATURE-UNITY` (NEW) | `test_learned_ctx.cpp` | `learned_norm` + trainer norm + `make_lcfeat` agree on all 13 features |
| `VB-R6-TRAIN-WALK` (NEW) | `test_bitplane.cpp` | `train-learned` full-`subs` collection reproduces the decoder walk symbol-for-symbol |
| `VB-R6-TREE-ROUNDTRIP` (NEW) | `test_r6_tree.cpp` | tree header encode/decode lossless; static per-leaf rANS bit-exact |
| `benchmarks/bench_gate.sh` | existing | Final dual-unit M2/M3 gate on REAL Kodak vs REAL cjxl/WebP |
| held-out rate gate | `train-learned` | new weights lower coded rate on kodim02/07/17/21 vs X6b BEFORE full run |

---

## 7. Decision Tree (cascade)

| Outcome | Consequence |
|---|---|
| R6-A0 harness red | Fix and re-run; no verdict until green |
| R6-A0 PASS, R6-D0 FAIL | M2 genuinely plausible for the first time; M3-PENDING; escalate for deeper tree / MA-tree variant |
| R6-A0 + R6-D1 PASS | both gates met in both units -> format-stable v3 PR `Refs #130` |
| Everything fails | full negative ledger (R6-A0 trained + R6-D measured); Anti-Surrender re-examination, not silent close |

---

## 8. Deliverables Checklist

- [ ] `ideas/2026-08-29-prism-route6-training-and-transmitted-tree.md` (this blueprint)
- [ ] R6-A0: `train-learned` fixed (full-`subs` collection, `learned_norm` single source, held-out gate, real `learned_ctx_data.inc`)
- [ ] R6-A0: re-measure R6-A on real Kodak-24; dated CSV
- [ ] R6-D0: `r6_tree.h/.cpp` greedy tree + static per-leaf rANS + delta header; overhead sub-gate
- [ ] R6-D1: compose trained MLP + tree + EMA refinement; `bench_gate.sh` M3 dual-unit
- [ ] R6-E: format-stable v3 PR `Refs #130`
- [ ] Frontend R6-D tree inspector panel

---

- the Architect
