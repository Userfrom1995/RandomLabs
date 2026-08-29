# Progress: Route 6 Continuation - Trained MLP Keystone (R6-A0) + JXL-Modular Transmitted Tree (R6-D) (issue #130)

- **Branch:** `opencode/issue130-<ts>` (from `origin/main` e79ad12)
- **Blueprint:** `ideas/2026-08-29-prism-route6-training-and-transmitted-tree.md`
- **Precedent:** R6-A/B/C built on main (`e79ad12`); all three measured FAIL on real Kodak-24 because `learned_ctx_data.inc` holds ZEROS (MLP never trained). This build is the continuation the Architect blueprinted after the R6-C measured-fail.
- **Status:** in-progress. The decisive unmeasured step is **R6-A0: train the MLP** (every prior Route 6 variant ran with a constant prior). Then **R6-D**: a true JXL-Modular transmitted property tree keyed by real per-image counts (not the collapsed MLP cluster), answering the owner's explicit "adaptive context clustering and transmitted trees".

## Measured launchpad (real Kodak-24, both units)

- X6b EMA floor: **3.2442 / 9.7326** (bpp/sample / summed) - honest baseline to beat.
- R6-A (deeper MLP, untrained): 3.2459 / 9.7377 (net neutral).
- R6-B (per-subband hist): 3.4363 / 10.3089 (+6% worse).
- R6-C (MLP-cluster hist): 5.0847 / 15.2541 (+57% worse; cluster id collapsed to 3 contexts).
- Gates: M2 < 3.166 / < 9.498; M3 < 2.885 / < 8.655. Both units required.

## Milestone Checklist

### A0: Train the MLP keystone
- [ ] `train-learned` collects over full `subs` using `make_lcfeat` (13 args) + `learned_norm(f,out[13])` (delete inline norm lambda)
- [ ] Net forward pass identical to `learned_predict_p1/p0`; `--pseudo 64`; >= 40 epochs
- [ ] Held-out rate gate (kodim02/07/17/21) requires < 3.2442/sample BEFORE full run
- [ ] Write real `learned_ctx_data.inc`; `VB-R6-FEATURE-UNITY` + `VB-R6-TRAIN-WALK` green
- [ ] Re-measure R6-A on real Kodak-24 dual-unit; CSV `2026-08-29-r6a-trained-kodak24.csv`
- [ ] Target: median <= 3.166/sample (M2)

### D0: Transmitted property tree (two-pass, counts-based)
- [ ] `r6_tree.h/.cpp`: greedy tree over 13-feature subset; `r6_tree_encode/decode_header`; static per-leaf rANS
- [ ] `wavelet_container.h/.cpp`: `r6d_flag` + `tree_bits` + `leaf_counts`; serialize after subband table; slice per-leaf payload
- [ ] `bitplane.cpp`/`frame_wavelet_encode`: two-pass dispatch on `r6d_flag`; Pass 1 reuses `collect_samples` walk
- [ ] Sub-gate: header overhead <= 0.01 bpp; byte-exact 24/24; CSV `2026-08-29-r6d-kodak24.csv`

### D1: Compose trained MLP (A0) + tree (D0) + optional EMA refinement
- [ ] Blend `w_e` for starved leaves
- [ ] Full Kodak-24 `bench_gate.sh` dual-unit: target M3 <= 2.885/sample AND <= 8.655 summed
- [ ] Byte-exact 24/24, fuzz clean

### E: Format freeze
- [ ] If D1 passes both units: format-stable v3 PR `Refs #130`; freeze lifts on merge

## Notes
- R6-D partitions by REAL per-image counts, so it is informative even before MLP training (unlike R6-C's MLP-keyed cluster, which collapsed under ZERO weights).
- I29 holds: only `learned_ctx_data.inc` + counted r6 header change; 0 transmitted model bytes.

- the Architect
