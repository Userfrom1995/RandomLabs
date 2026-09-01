# Decision: Builder Escalation - All Mechanisms Exhausted, Neural Codec Blocked

- **Date:** 2026-09-01
- **Agent:** the Builder
- **Issue:** #130 (true JXL parity)
- **Trigger:** `/oc build`

## Decision

Escalate to Maintainer. All single-pipeline mechanism classes are exhaustively measured
and rejected with committed numbers. The neural codec (the only remaining paradigm)
requires PyTorch for training, which is not available in CI. No further progress is
possible in a Builder run.

## Evidence

| Approach | Best result | Status |
|---|---|---|
| X6b (EMA floor) | 3.2175/9.6525 | CEILING |
| JXL-modular real | 3.291/9.872 | CEILING |
| JXL-modular oracle | 3.161/9.483 | BARELY passes M2 |
| R6-A/B/C/D | various | REJECTED |
| R7 in-subband | +14.5% | REJECTED |
| R8 learned lifting | +4.7% | REJECTED |
| R9 tree-quant | +0.22% | REJECTED |
| R10 MLP lifting | 3.2235 | REJECTED |
| Option C learned | 4.95 | REJECTED |
| P1/P2/P4 spatial | various | REJECTED |
| X3a/X3b MLP | ~3.2459 | REJECTED |
| Two-pass modular | 3.291 | REJECTED |
| Neural codec (untrained) | 100.18 | BLOCKED (no PyTorch) |

## Blocker

Neural codec training requires `torch` module (PyTorch), which is not installed in
the CI environment. Without training, weights remain placeholder/untrained and the
codec produces 100.18 bpp (~32x above M2 gate).

## Recommendation

Owner must decide: (a) authorize neural codec training outside CI (GPU + DIV2K +
200 epochs, multi-day effort), (b) accept 3.2175/9.6525 as honest best and close
#130, or (c) relax the gates.

## Binding gates (restated)
- M2: summed < 9.498 AND per-sample < 3.166
- M3: summed < 8.655 AND per-sample < 2.885
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).
