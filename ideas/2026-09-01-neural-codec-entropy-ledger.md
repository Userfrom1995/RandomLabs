# Neural Codec rANS Entropy Measurement Ledger (E1 negative result)

**Issue:** #130
**Date:** 2026-09-01
**Author:** The Builder
**Status:** Negative result (honest ledger)

---

## Summary

Diagnostic measurement of the neural codec entropy coding path built in the E1 architecture (issue #226). The rANS entropy coding for Y_q, Z_q, and residual streams was implemented and measured on a 14-image Kodak subset. The result is decisively negative: the total output is 93.77 bpp (11.7x expansion vs raw), confirming the neural codec architecture is fundamentally not viable for lossless compression without retraining the synthesis network with a lossless objective.

---

## What Was Built

1. `NeuralStreamSizes` diagnostic struct and overload for `frame_neural_encode` (per-stream byte counts, dimensions, residual stats).
2. Per-stream diagnostic output on `prism enc --neural` CLI path (4 extra lines: latent dims, stream sizes, residual stats, payload bpp).
3. `bench_neural.sh` script for Kodak-24 measurement with CSV output.
4. `prism/benchmarks/results/2026-09-01-neural-e1.csv` partial ledger (14/24 images).

---

## Key Measurements (kodim01.ppm, 768x512 RGB)

| Stream | Size (bytes) | Rate | Verdict |
|--------|-------------|------|---------|
| Y_q rANS | 9,437,188 | 2.0 bytes/symbol | EXPANDING (Gaussian CDF mismatch) |
| Z_q rANS | 357,892 | 0.30 bytes/symbol | Good compression |
| Residual rANS | 4,031,502 | -- | Residual carries most image info |
| **Total** | **13,826,650** | **93.77 bpp** | **11.7x expansion** |

- Residual MAD=39,332 on 16-bit range (synthesis network is garbage).
- Gaussian rANS assigns low probability to common Y_q symbols (model mismatch).

---

## Root Cause

1. **Synthesis network g_s approximates each pixel within ~60% of dynamic range.** The residual is essentially the original image.
2. **Gaussian CDF table sigma bins don't match actual Y_q distribution.** The rANS encoder uses more bits than raw storage.

---

## Verdict

The neural codec architecture is **not viable for lossless compression** on this codebase without retraining g_s with a lossless objective (minimize entropy of residual under Gaussian model). That is a major training effort outside the scope of this build.

The lab's honest best remains **X6b = 3.2175 bpp per-sample / 9.6525 bpp summed**.

---

## Related Ideas

- `ideas/2026-09-01-neural-codec-e1.md` - full E1 architecture blueprint
- `ideas/2026-09-01-neural-codec-e1-builder.md` - builder implementation notes

---

*Refs #130. Negative-result ledger - do not close the binding M2/M3 gate.*

- the Builder
