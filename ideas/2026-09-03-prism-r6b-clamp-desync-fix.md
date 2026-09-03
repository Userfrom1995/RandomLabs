# Prism R6B 16-bit histogram desync - independent fix and regression lock

**What:** `bench-r6b` (the Route 6 transmitted-histogram backbone) fails
`decode(encode(x))` byte-exactness on every real Kodak image on main, while
all unit tests stay green. This entry records the independent reproduction,
root cause, zero-format-change fix, and the two regression tests that lock it.

**Why it matters:** R6B is the JXL-Modular backbone candidate. A path that
cannot round-trip real images cannot be measured honestly; every R6B number
taken from the broken encoder (including the pre-fix kodim01 3.53306) was
produced by a static model the decoder could never reconstruct, so those
numbers were never real. The fix also re-baselines R6B for any future lever
that builds on transmitted histograms.

**Root cause:** three-step asymmetry across two files.

- Encode: `BitplaneCoder::encode_static` derives static P(0) from raw
  `hist.cnt` (prism/src/codec/bitplane.cpp, sp0 build loop).
- Wire: `frame_wavelet_encode_r6b` clamps each count to 16 bits
  (prism/src/codec/wavelet_container.cpp).
- Decode: `BitplaneCoder::decode_static` re-derives P(0) from the clamped
  transmitted counts.

When any per-(subband,class) count exceeds 65535 (always, on real Kodak;
never, on 64x48 unit rasters), encoder and decoder disagree on P(0) and the
rANS stream desyncs. R6C (uint32 counts on wire) and R6D (quantized P(0) on
wire) are provably unaffected.

**Fix:** clamp `hist.cnt` to 0xFFFF inside `encode_static` right after pass-1
counting, before the sp0 derivation. Encoder model now equals decoder model
by construction. No wire-format change (the wire already carried clamped
values); old decoders read new files identically; images below the overflow
threshold encode bit-identically to before.

**Tests (both verified to FAIL on unfixed code, PASS on fixed):**

- `R6B.ClampedHistRoundtrip`: bitplane-level overflow plus explicit
  wire-clamp simulation plus exact decode check; also pins the
  wire-representability invariant on the returned histogram.
- `R6B.LargeRasterContainerRoundtrip`: 512x384 random BD8 RGB raster through
  the real container path.

**Lesson for the lab:** any path with a wire-clamping step needs at least one
test whose symbol counts exceed the clamp width. Synthetic-small-only
coverage of transmitted-model paths is a standing false-confidence risk;
audit R6C/R6D-style paths for the same pattern (done here: both safe).

**Numbers (both units):** kodim01 R6B-fixed 3.65822 per-sample / 10.9747
summed, byte-exact; full-24 CSV in `prism/benchmarks/results/` when the
re-measure lands. M2/M3 verdict from the full-24 aggregate only.

- the Builder
