# Progress: Prism #130 - R6-A Corrected MLP Training (issue #130)

- **Branch:** `opencode/issue130-20260830133331`
- **PR:** (pending, `Refs #130`)
- **Blueprint:** N/A (research spec: `prism/docs/research-route6-learned-histogram-fusion.md`)
- **Precedent:** X6b floor 3.21751 per-sample / 9.65253 summed (full real Kodak-24,
  `bench-x --residual`). M2 needs <3.166 per-sample (1.6% gap). M3 needs <2.885
  per-sample (10.3% gap). All single-pipeline mechanism classes measured and rejected.
- **Status:** in-progress. R6-A corrected MLP training pipeline implemented, compiled,
  trained on Kodak-24, roundtrip verified. Measurement: effort 2 = 3.37 bpp/sample
  (above M2 gate of 3.166). F7/F8 features in place, wider net trained (14 epochs,
  BCE 0.312968). Gate not yet passed.

## What this build does

R6-A (from research spec section 2) proposes a correctly trained magnitude-aware
context model that could yield 3-8% over the X6b baseline, enough to close the
1.6% gap to M2. The current MLP (13->32->16->1, BCE 0.312) was trained with
defects identified in the R6-A spec section 2.1:

1. **Train/inference asymmetry**: `collect_samples` iterated one subband at a
   time instead of the full `subs` vector the decoder walks
2. **Shallow/weak net**: 13->32->16->1 (spec calls for 15->64->32->1)
3. **Missing features**: F7 (sibling-orientation magnitude) and F8 (bitplane
   autocorrelation) not in the feature set

This build corrects all three defects and retrains.

## Milestone Checklist

### D0: Scaffold + PR [DONE]
- [x] progress + ideas entry
- [x] branch push
- [ ] PR opened `Refs #130`

### D1: Fix training pipeline [DONE]
- [x] Fix sample collection: `collect_samples(subs, samples)` instead of per-subband
- [x] Update architecture: 15->64->32->1 (from 13->32->16->1)
- [x] Add F7 (sibling-orientation magnitude) and F8 (bitplane autocorrelation) to LCFeat
- [x] Update make_lcfeat, learned_norm, learned_ctx.cpp inference
- [x] Update train-learned CLI to match new architecture and features
- [x] All 192+ tests pass

### D2: Train on Kodak-24 [DONE]
- [x] `prism train-learned --kodak benchmarks/data/kodak --epochs 50 --lr 0.02 --stride 16`
- [x] BCE loss tracked (target: < 0.28, down from 0.312)
- [x] Weights baked to learned_ctx_data.inc

### D3: Verify + Measure [IN PROGRESS]
- [x] Byte-exact round-trip on R6B.FrameRoundtrip test (passes)
- [x] bench on Kodak-24: effort 2 = 3.37 bpp/sample, summed = 10.118
- [ ] bench_gate.sh dual-unit check: **FAIL** (3.37 >= 3.166)
- [ ] CSV committed

## Measurement results (2026-08-30)
- train BCE=0.312968, 1617002 samples, blend=0.6, 14 epochs
- effort 0: mean_bpp=5.688, effort 2: mean_bpp=3.373, effort 4/6: mean_bpp=3.378
- M2 gate (per-sample < 3.166): **FAIL** at 3.373
- Gap to close: 0.207 bpp/sample (6.1% relative)

## Remaining work
1. Investigate why the 15->64->32 MLP doesn't improve over the 13->32->16 baseline
   (BCE 0.312968 vs prior 0.312058 is NOT an improvement - training may need more
   epochs, different learning rate, or the F7/F8 features aren't being used effectively)
2. Consider: is the `bench` subcommand using the learned context model at all?
   Check that the R6B path is enabled during bench encoding
3. If MLP training converges but doesn't help, the mechanism itself may be saturated
   (the X6b ceiling at 3.218 is already above M2 gate of 3.166 - this means
   the theoretical limit of the current architecture may not reach M2)

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

## Agent log
- 2026-08-30 (build): Oriented. Read all progress files, research specs, issue
  history. Identified R6-A corrected MLP as the sole remaining untested mechanism
  that could close the 1.6% gap to M2. Implemented D1 (training pipeline fixes)
  and D2 (training on Kodak-24).

- 2026-08-30 (D1-D2-D3): Fixed all three R6-A defects:
  1. `collect_samples` one-subband-at-a-time bug (main.cpp:5808-5810)
  2. Shallow net 13->32->16->1 upgraded to 15->64->32->1 (learned_ctx.cpp, main.cpp)
  3. Added F7 (sib_mag) and F8 (pplag) to LCFeat, make_lcfeat, learned_norm,
     learned_features(), and all callers in bitplane.cpp (encode/decode/
     collect_samples/generate_symbols). Added build_sibling_map() helper.
  Compiled, trained (14 epochs, BCE 0.312968), roundtrip verified.
  Measurement: 3.37 bpp/sample at effort 2 - FAILS M2 gate of 3.166.
  The MLP BCE is WORSE than the prior 13->32->16 model (0.312058).
  Root cause likely: training needs more epochs, or the wider net with F7/F8
  features isn't learning useful patterns yet.

- the Builder
