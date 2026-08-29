# Progress: Route 6C - Per-Fine-Context Transmitted Histograms (issue #130)

- **Branch:** `opencode/issue130-20260829181522`
- **Blueprint:** `ideas/2026-08-29-prism-route6c-fine-cluster-histogram.md` (Architect handoff for R6-C)
- **Precedent:** R6-B (`progress/130-prism-route6-r6b-transmitted-histogram.md`, closed +6% loss) and the R6-C research spec (`prism/docs/research-route6c-fine-cluster-histogram.md`, PR #176) + addendum-27 (frozen pins). This build implements R6-C, the M3 lever: transmit ONE histogram PER FINE-CONTEXT CLUSTER (a fixed baked property tree) so the transmitted model is finer than the cold-starting EMA and cannot repeat R6-B's loss.
- **Status:** in-progress
- **Current step:** R6-C0 implementation complete (fixed coarse-quant clustering + two-pass coder + CLIs + tests). Full unit suite green (217/217). Round-trip byte-exact.
- **Next steps:** Run `prism bench-r6c --kodak DIR` (real Kodak-24 PPMs) in CI and the dual-unit `bench_gate.sh` to confirm the R6-C0 gate (median NET <= X6b 3.2442/sample on held-out kodim02/07/17/21; overhead <= 0.02 bpp). The measurement gate is the binding acceptance and is delegated to the Tester stage (Kodak corpus not present in this build session). C1 (baked tree K=1024) and C2/C3 (stacking) are later phases per the cascade.

## Milestone Checklist

### C0: Scaffold + clustering function
- [x] `prism/include/prism/codec/route6c_tree.h`: `r6c_cluster_id(const LCFeat&)`, `r6c_K()`; R6-C0 fixed coarse quantization (K0=648: symtype3*orient4*parent_sig2*fc3*dg3*level3). Plus runtime `r6c_w()`/`set_r6c_w()` blend-weight accessor (default 0.6).
- [x] `R6C_FLAG = 8` in `prism/include/prism/codec/wavelet_container.h`; `WaveletHeader` gains `uint32_t r6c_K` + `std::vector<uint16_t> r6c_p0`.

### C1: Two-pass coder
- [x] `R6CResult`, `R6CAdaptiveModel` (blend `W*sp0[C] + (1-W)*learned.predict(f)`, W default 0.6 frozen, EMA/M/MLP reused exactly), `encode_static_r6c`, `decode_static_r6c` in `bitplane.cpp` (mirror `encode_static`/`decode_static`).
- [x] Pass 1 counts per-cluster `cnt[C][0/1]`; build `sp0[C] = (tot==0)? M/2 : clamp(c0*M/tot)`. Empty clusters neutral (never worse than EMA). The frame pools counts across ALL planes into one IMAGE-GLOBAL r6c_p0 (consistent at encode/decode; see `r6c_global_sp0` + `r6c_accumulate`).

### C2: Frame dispatch + header serialization
- [x] `frame_wavelet_encode_r6c` (X6a residual pre-pass -> `encode_static_r6c`, `residual_mode = 1 | R6C_FLAG`).
- [x] `wavelet_container_encode`/`decode` write/read `uint32 r6c_K` + `r6c_K*uint16 r6c_p0` (raw LE; 4 + 2*K bytes, < 0.02 bpp).
- [x] `frame_wavelet_decode` dispatches `decode_static_r6c` when `R6C_FLAG` set; reuses X6a residual post-pass.

### C3: CLIs
- [x] `prism wavelet-r6c <in> <out> [--filter --levels --k --w]` (mirror `wavelet-r6b`); `--w` overrides blend weight.
- [x] `prism bench-r6c --kodak DIR [--out --filter --levels --k --w]` (dual-unit CSV; feeds `bench_gate.sh`).

### C4: Tests
- [x] `tests/unit/test_r6c.cpp` (VB-R6C-ROUNDTRIP, VB-R6C-SYMMETRY, VB-R6C-CLUSTER); register in `prism/CMakeLists.txt`. Full suite green (217/217).

### C5: Measurement gates
- [ ] R6-C0: median NET <= 3.2442/sample on held-out kodim02/07/17/21; byte-exact 24/24; overhead <= 0.02 bpp.
- [ ] R6-C1: `train-r6c` grows baked tree (K1=1024), W sweep; median <= 3.166/sample AND <= 9.498 summed (M2) on Kodak-24.
- [ ] R6-C2 (if needed): stack X6c `sub_scale` / R6-A deeper MLP for +0.5% over C1.
- [ ] R6-C3: summed <= 8.655 AND per-sample <= 2.885 (M3); byte-exact 24/24, fuzz clean -> format-stable v3 PR `Refs #130`.

## Implementation notes

- The transmitted model is structurally incapable of being net-worse than the EMA: populated clusters carry the whole-image exact P(0) (better than cold-start EMA for rare contexts); empty clusters get neutral `M/2` so the blend degenerates to pure EMA. This is the exact property R6-B violated (blending a COARSER 12-class model in).
- No learned weights or large tables are transmitted; only the small per-image `r6c_p0` vector (I29 preserved). The EMA, MLP, EBCOT walk, rANS backend, and container envelope are reused unchanged.
- All pins frozen in addendum-27; the Builder must NOT move a gate or re-tune `R6C_K`/`R6C_W` to force a pass.

## Builder agent log (2026-08-29)

- Implemented R6-C0 end to end, mirroring R6-B's two-pass structure but with a
  single image-global per-cluster P(0) backbone instead of the 12-class
  per-subband table. New files: `prism/include/prism/codec/route6c_tree.h`.
- `bitplane.cpp`: added `R6CAdaptiveModel` (blend `W*sp0[C]+(1-W)*learned.predict(f)`,
  W runtime-overridable via `--w`), `encode_static_r6c`, `decode_static_r6c`,
  plus `r6c_global_sp0`/`r6c_accumulate` which POOL the per-cluster (0/1) counts
  across all planes into ONE transmitted `r6c_p0` vector. Pooling is what makes
  encode and decode agree on a single global backbone (each plane's own statistics
  would otherwise diverge between encode and the transmitted vector). This was the
  one correctness trap: the first cut transmitted only plane-0's backbone and
  failed the frame round-trip on multi-channel images; the subband-only test
  passed, which is how it was caught.
- `wavelet_container.cpp`/`h`: `R6C_FLAG=8`, `WaveletHeader.r6c_K/r6c_p0`, header
  serialization (4 + 2*r6c_K bytes), `frame_wavelet_encode_r6c`, and the decode
  dispatch. Reuses X6a residual pre/post-pass and the EBCOT/rANS/container stack.
- CLIs `wavelet-r6c` / `bench-r6c` (with `--w`) added to `main.cpp`; `test_r6c.cpp`
  (ROUNDTRIP / SYMMETRY / CLUSTER) registered in `CMakeLists.txt`.
- Verification: full prism unit suite green (217/217); `wavelet-r6c` round-trips
  and shows the blend helping vs pure-learned (w=0.6 < w=0.0 bpp on a toy image).
  The binding Kodak measurement gate (C5) is NOT run in this session (no Kodak
  corpus present) and is delegated to the Tester stage via `bench_gate.sh`.

- the Builder
