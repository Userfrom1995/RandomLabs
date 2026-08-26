# Prism V4: Transform-Domain Decorrelation

## What was built

V4-0 (U0): Transform harness extension for the Prism sandbox instrument.
Adds a reversible integer 8x8 block DCT applied to the source BEFORE
predictive coding, enabling measurement of transform-domain prediction
vs spatial-domain prediction under the existing entropy backend.

## Why

The V+S+T programs operated entirely in the spatial prediction residual
domain. Every conditioning refinement measured under payable side info
lost to its own table bytes. The T4 composition projects at 9.5671 summed
/ 3.1890 per-sample, short of both M2 (< 9.498 / < 3.166) and M3
(< 8.655 / < 2.885) gates.

The source representation itself was never transformed. A block frequency
transform decorrelates spatial redundancy, reducing residual entropy
by 15-25% per the transform coding literature. The transform has zero
transmitted side-info (fixed block size and basis), so the table-economics
law does not apply.

## How it works

1. **BlockDCT module** (`prism/src/codec/transform.{h,cpp}`):
   - 8x8 forward DCT (AAN factorization, integer-exact)
   - 8x8 inverse DCT (mirror-exact reconstruction)
   - Non-overlapping 8x8 blocks with replicate border padding
   - Q=0 (lossless; rounding error is the only distortion)

2. **TransformDomainMED module**:
   - For each 8x8 block: forward DCT on source block
   - MED prediction on each frequency coefficient from spatial neighbors
     in the coefficient plane (same MED logic, different domain)
   - Residual = coefficient - prediction
   - Residual coded by existing entropy backend (v2 binarization)

3. **FRAME-F mode** in bench-sandbox (`--u0`):
   - FRAME-T: spatial MED on original source (existing production path)
   - FRAME-F: frequency-domain MED on DCT coefficients
   - Both scored on same backend; NET = payload + tables + maps + trees

4. **VB rails**: transform-roundtrip, transform-fidelity, net-audit-u

## Key files

- `prism/src/codec/transform.h` - BlockDCT interface
- `prism/src/codec/transform.cpp` - BlockDCT implementation
- `prism/src/cli/main.cpp` - --u0 mode wiring
- `prism/docs/algorithmic-spec.md` - Section 21 (addendum 21)
- `benchmarks/probe_sandbox.sh` - VB rails for U0
