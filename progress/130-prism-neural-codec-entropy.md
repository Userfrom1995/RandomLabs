# Progress: Prism #130 - Neural Codec rANS Entropy Integration (issue #130)

- **Branch:** `opencode/issue130-neural-codec-entropy`
- **Status:** negative result
- **Date:** 2026-09-01 (Builder run, `/oc build this (auto-retry 3)` trigger)
- **Precedent:** X6b floor 3.2175/9.6525. JXL-modular real 3.291/9.872. Neural codec architecture built (PR #230), rANS encode/decode exists (neural_entropy.cpp).

## What was built

1. Added `NeuralStreamSizes` diagnostic struct and overload for `frame_neural_encode`.
2. Added per-stream diagnostic output to `prism enc --neural` CLI path (4 extra lines: latent dims, stream sizes, residual stats, payload bpp - unconditional; gate scripts parsing `enc` output tolerate these).
3. Created `bench_neural.sh` script for Kodak-24 measurement.

## What was measured (kodim01.ppm, 768x512 RGB)

- **Total output:** 13,826,650 bytes (93.77 bpp per-sample) - 11.7x expansion vs raw
- **Y_q stream:** 9,437,188 bytes (4,718,592 int8 symbols, 2.0 bytes/symbol) - rANS EXPANDING
- **Z_q stream:** 357,892 bytes (1,179,648 int8 symbols, 0.30 bytes/symbol) - good compression
- **Residual stream:** 4,031,502 bytes (1,179,648 int32 samples)
- **Residual stats:** MAD=39,332, max_abs=65,535 (on 0-65535 range)
- **Synthesis quality:** catastrophic - residual carries nearly all image information

## Root cause analysis

Two independent failures:

1. **Synthesis network produces garbage:** The residual MAD=39,332 on 16-bit images means the
   synthesis network g_s approximates each pixel within ~60% of the dynamic range. The
   residual is essentially the original image. The neural codec's112K lines of trained
   weights were optimized for rate-distortion on a different objective, not for lossless
   residual minimization.

2. **Gaussian rANS for Y_q expands data:** The Y_q rANS encoder outputs 2.0 bytes per
   symbol (16 bits), while raw int8 storage is 1 byte per symbol (8 bits). The Gaussian
   CDF table assigns low probability to common symbols (near 0) because the quantized
   sigma bins don't match the actual Y_q distribution. The model mismatch causes the
   entropy coder to use more bits than raw storage.

## Honest verdict

The neural codec architecture is **fundamentally not viable** for lossless compression at
competitive bitrates on this codebase. The synthesis network needs to be retrained with
a lossless objective (minimize entropy of the residual under the Gaussian model), which
is a major training effort outside the scope of this build.

## X6b floor context

The lab's honest best remains X6b = 3.2175 bpp per-sample / 9.6525 bpp summed:
- M2 gate (WebP m6): needs < 3.166 per-sample (1.6% gap)
- M3 gate (JXL -d0 -e9): needs < 2.885 per-sample (10.3% gap)

## Ideas coverage

This build extends the existing `ideas/2026-09-01-neural-codec-e1.md` and
`ideas/2026-09-01-neural-codec-e1-builder.md` on main. The PR-specific
entropy measurement ledger is documented in
`ideas/2026-09-01-neural-codec-entropy-ledger.md`.

## Refs #130

- the Builder
