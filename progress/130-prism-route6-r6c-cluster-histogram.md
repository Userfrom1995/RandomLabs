# Progress: Route 6C - Per-Fine-Context Cluster Transmitted Histogram (issue #130)

- **Branch:** `opencode/issue130-20260829164141`
- **PR:** #179 (`Refs #130`)
- **Blueprint:** `ideas/2026-08-29-prism-route6-learned-histogram-fusion.md` (Route 6 spec, PR #176)
- **Precedent:** R6B (PR #179 predecessor, 3.436 / 10.308 on real Kodak-24) and the
  Route 6 spec (R6-A deeper learned context + R6-B transmitted histogram) authored by
  the Architect. This build implements R6-C, the last unmeasured Route 6 lever: a
  transmitted static P(0) histogram keyed by a **per-fine-context CLUSTER** id derived
  from the learned MLP P(0), blended 0.75 / 0.25 with the online EMA. Implemented on the
  X6b base.
- **Status:** R6-C implemented and byte-exact round-tripping at all sizes (I29: zero
  full-model bytes transmitted, only the tiny cluster-hist header). Measured on real
  Kodak-24 (downscaled stand-in): **5.08 bpp/sample, 15.25 bpp/img**, round-trip OK.
  This is WORSE than the X6b baseline (3.244 / 9.733) and far from M2 (3.166 / 9.498)
  and M3 (2.885 / 8.655). The binding gates stay OPEN. `Refs #130`.

## Milestone Checklist

### C0: Scaffold + wiring
- [x] `StaticClusterHist` / `StaticClusterBitplaneResult` / `encode_static_cluster` /
      `decode_static_cluster` in `prism/include/prism/codec/bitplane.h` + `bitplane.cpp`
- [x] `R6C_FLAG = 8`; `WaveletHeader.r6c_kb` + `cluster_hist` (`vector<uint32_t>`);
      `frame_wavelet_encode_r6c` (sets `residual_mode = 1 | R6C_FLAG`); decode dispatch
      in `frame_wavelet_decode` (route5 / r6b / r6c / bitplane)
- [x] `prism wavelet-r6c <in> <out>` and `prism bench-r6c --kodak <dir>` CLI (main.cpp)

### C1: Cluster-keyed two-pass coder
- [x] Cluster id `symtype * kb + (lp * kb >> 16)`; `NB = 3*kb` clusters (kb=256 -> 768)
- [x] Pass 1: accumulate global per-cluster c0/c1 counts; Pass 2: re-walk (shared model
      across subbands), blend `W_STATIC * sp_cluster + (1-W_STATIC) * learned.predict(f)`
- [x] Decode mirrors exactly; round-trip byte-exact after the on-wire uint32 fix

### C2: Tests
- [x] `tests/unit/test_r6c.cpp` (FrameRoundtrip / FrameRoundtripVariants / SubbandRoundtrip);
      registered in `prism/CMakeLists.txt`
- [x] R6C.* and R6B.* suites pass (full-frame + subband)

## Bugs fixed during build
- **Container cluster-hist size:** encode wrote only ONE plane's worth of cluster-hist
  counts while decode read `nplanes * NB * 2`, shifting the rANS payload on multi-plane
  frames. Fixed encode `nexp` to `3*kb*2*nplanes`.
- **16-bit on-wire clamp of cluster counts:** counts were clamped to uint16 on the wire
  but the encoder built its static probabilities from the UNCLAMPED in-memory counts,
  desyncing the rANS stream whenever a single cluster exceeded 65535 symbols (large
  planes; planes 1/2 at >= 256x192). Switched the on-wire form to **uint32** so encode
  and decode use identical counts. Root cause of the size-dependent full-frame failure.
- **`LearnedModel::fine_ctx` OOB:** could return an index `>= FINE_POOL` (out-of-bounds
  EMA pool access) at the extreme feature combination `FEAT_LP_SIGN | FEAT_DG | FEAT_RC`
  (`RATE_FINE_BUCKETS + 4 = FINE_POOL + 5`). Reduced modulo `FINE_POOL`. Latent bug that
  affected every EMA-using coder.

## Benchmark result (real Kodak-24 stand-in, 192x128 downscaled; full 768x512 is ~19x
slower per image due to the per-bit MLP forward pass in `LearnedModel::predict`)

- `bench-r6c --kb 256`: mean **5.0847 bpp/sample**, **15.2541 bpp/img**, round-trip OK.
- X6b baseline: 3.2442 / 9.7326. R6B: 3.4363 / 10.3089. R6-A: 3.2459 / 9.7377.
- R6-C is WORSE than X6b, R6B, and R6-A. Conclusion below.

## Conclusion: Route 6 is exhausted as a gate lever
The baked MLP weights in `learned_ctx_data.inc` are still ZEROS (untrained), so
`learned_predict_p0` returns a constant 32768. The cluster id therefore collapses to only
3 effective contexts (`bucket(32768) = 128`), and the per-fine-context transmitted
histogram is no better than a global one plus overhead. A transmitted static histogram
cannot beat the 1.84M-context online EMA while the prior is uninformative. R6-A, R6-B,
and R6-C (three Route 6 variants) all fail to beat X6b.

The remaining path to M2/M3 is to **train the learned MLP prior** (Route 4 / X4,
`prism train-learned`) so the cluster id is informative and the blended prior actually
reduces entropy below the EMA. Without trained weights, no Route 6 / Route 4 variant can
beat the gate. R6-C is left as a correct, gated-off experimental codec pending MLP
training.

- the Builder
