# Progress: Prism #130 - Train-learned CLI fix + measurement (issue #130)

- **Branch:** `opencode/issue130-20260830063555`
- **Status:** in-progress
- **Date:** 2026-08-30 (Builder run)
- **Precedent:** v1 container (prism bench --effort 9) at 3.3783/10.135. All mechanism
  classes measured and rejected per negative ledger v2. M2 needs <3.166/<9.498.
  M3 needs <2.885/<8.655. Owner directive: "do not stop until M2 and M3 pass."

## This run

1. **Bug fix: train-learned CLI mismatch** - The `train-learned` CLI trained a
   10->16->1 MLP (FF=10, HF=16 single layer) but the runtime `LearnedModel`
   (learned_ctx.cpp) uses 13->32->16->1 (LF=13, LH1=32, LH2=16, two hidden layers).
   The shipped `learned_ctx_data.inc` has correct 13->32->16->1 weights (produced
   by an older training process), but the CLI cannot reproduce them. Fix: updated
   CLI to match runtime architecture exactly (13 input features including lc_mag,
   lc_sig, level; two hidden layers 32->16 with ReLU; proper 2-layer backprop).
   Also improved He initialization and weight writing to produce correct format
   (LW1[32][13], LW2[16][32], LW3[16] + biases).

2. **Context model retrain attempt** - Retrained with fixed CLI for 30 epochs.
   Achieved BCE=0.3169 (best at epoch 13). Restored original shipped weights
   because: (a) v1 container path (prism bench --effort 9) does not use the
   learned context MLP; the MLP is only used by the wavelet bitplane coder
   path, (b) retrained BCE is slightly worse than the original process.

3. **Key finding: v1 container is the gate path** - `prism bench --effort 9` calls
   `encode()` which uses the v1 container (ACoderV2 + squeeze + CM/LZP + MA-tree).
   The learned context MLP is only used by the `wavelet`/`wavelet-ng` encode path
   which is a separate codec format. The X6b floor (3.2175) was measured on the
   wavelet-residual path, not the v1 container path. The v1 container gives
   3.3783/10.135 - a 6.7% gap to M2 (much larger than the 1.6% from X6b floor).

## Milestone Checklist

- [x] Orient + read all progress / CSVs / negative ledger
- [x] Verify baseline on full Kodak-24 (3.3783 per-sample, 10.135 summed)
- [x] Fix train-learned CLI to match runtime architecture (13->32->16->1)
- [x] Retrain context model with fixed CLI (BCE=0.3169)
- [x] Restore original weights (retrained BCE slightly worse, v1 path unaffected)
- [x] Verify production bench unchanged (3.3783 = identical)
- [ ] Wider coefficient predictor (PRED_NH=64) - not yet attempted
- [ ] Commit + push CLI fix; update progress file
- [ ] Gates M2/M3 met (TARGET - not yet achieved)

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

## Agent log
- 2026-08-30 (Builder run): Oriented. Built prism from origin/main (dcb1006).
  Verified baseline 3.3783/10.135 on full Kodak-24 via prism bench --effort 9.
  LBlend sweep on kodim01 shows negligible improvement. Found train-learned CLI
  mismatch bug (FF=10/HF=16 single-layer vs runtime LF=13/LH1=32/LH2=16
  two-layer). Fixed CLI to match runtime. Retrained context model with fixed
  CLI (BCE=0.3169). Restored original weights. Key finding: v1 container path
  (the gate path) does not use the learned context MLP at all - it uses ACoderV2
  backend. The MLP is only used by the separate wavelet encode path.

- the Builder
