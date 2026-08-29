# Progress: Route 6B - Transmitted-Histogram Backbone (issue #130)

- **Branch:** `opencode/issue130-20260829143407`
- **Blueprint:** `ideas/2026-08-29-prism-route6-learned-histogram-fusion.md` (Route 6 spec, PR #176)
- **Precedent:** Route 4 (X6b, closed 3.2175 / 9.6525) and the Route 6 spec (R6-A
  deeper learned context + R6-B transmitted histogram) authored by the Architect.
  This build implements R6-B, the M3 lever: a two-pass coder that transmits a
  per-(subband, class) static P(0) histogram and blends it with the learned model
  (MLP + EMA) per symbol. Hephaestus directed `/oc research` (2026-08-29T14:09Z);
  implementation proceeds on the X6b base.
- **Status:** R6-B implemented and byte-exact round-tripping (I29: zero full-model
  bytes transmitted, only the tiny histogram header). Composition with R6-A and the
  dual-unit M2/M3 gate on real Kodak-24 is measured elsewhere (Kodak PPMs absent
  from this checkout). This is `Refs #130`; the binding gates stay OPEN.

## Milestone Checklist

### B0: Scaffold + wiring
- [x] `StaticHist` / `StaticBitplaneResult` / `encode_static` / `decode_static` in
      `prism/include/prism/codec/bitplane.h` + `bitplane.cpp`
- [x] `R6B_FLAG = 4`; `WaveletHeader.sub_hist` field; `frame_wavelet_encode_r6b`
      (sets `residual_mode = 1 | R6B_FLAG`); 3-way decode dispatch in
      `frame_wavelet_decode` (route5 / r6b / bitplane)
- [x] `prism wavelet-r6b <in> <out>` and `prism bench-r6b --kodak <dir>` CLI (main.cpp)

### B1: Two-pass coder
- [x] Pass 1: walk coefficients, accumulate per-(subband, class) counts, store bits
- [x] Pass 2: re-walk (deterministic, coding order, shared model across subbands),
      blend `W_STATIC * sp + (1-W_STATIC) * learned.predict(f)` and rANS-encode
- [x] Decode mirrors the re-walk exactly; round-trip byte-exact (gated by rANS
      LIFO-safety + fine_ctx determinism, like the adaptive path)

### B2: Tests
- [x] `tests/unit/test_r6b.cpp` (VB-R6B-ROUNDTRIP, VB-R6B-SYMMETRY): frame round-trip
      across filters/depths/sizes + direct subband round-trip; registered in
      `prism/CMakeLists.txt`
- [x] Full suite: 213/213 pass

## Implementation notes

- `W_STATIC` (blend weight of the transmitted histogram) is a `static constexpr
  float` in `StaticAdaptiveModel`, default `0.35f` (Route 6 hypothesis). It is the
  R6-B tuning knob: `W_STATIC = 0` degenerates to the pure adaptive learned coder;
  `W_STATIC = 1` is pure transmitted-histogram. The real M3 gain requires tuning on
  Kodak-24 together with the R6-A deeper MLP (15-input net, PR #176 R6-A lever).
- Symmetry bug fixed during build: the encode sign branch assigned the diagonal
  neighbour count to `f.dg` (the significance feature) instead of `fs.dg` (the sign
  feature), desyncing the decoder at the first sign symbol. Corrected; verified by
  the R6B.SubbandRoundtrip divergence dump (fine_ctx 617466 vs 623610 -> dg 0 vs 2).

## Benchmark result (synthetic 320x240, LeGall53 L5)

- `wavelet-r6b`: 5.46413 bpp, ROUNDTRIP=OK. Standalone R6-B (W_STATIC=0.35) is
  ~2.4% above the adaptive baseline on this single synthetic image; expected, since
  the transmitted histogram's value is cross-image generalization on real Kodak (the
  M3 lever), not single-image gain. NOT a gate measurement.

- Hephaestus, the Maintainer
