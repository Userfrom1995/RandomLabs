# Prism B11 - YCoCg widening fix + real Kodak gate (M3 < 8.71 bit-exact)

- **What:** Fix the BD8 YCoCg-R widening mismatch that broke byte-exact round-trip for `effort >=1` on natural images (chroma stored as `Cg+512`/`Co+512` in 257..767, but `reconstruct_plane` clamped to 255). Add `plane_bd_max()` helper (`prism/src/prism.cpp:14`) that returns 1023 for chroma planes when `ct` is `YCoCgR`/`YCoCgR_SubGreen` and 65535 for `Lift53`, and thread it per-plane through both non-squeeze (`reconstruct_plane`) and squeeze LL (`decode_band_generic`) decode paths. Also pin the real Kodak 24-image SHA256 (`prism/benchmarks/data/kodak.sha256`) from `obsidian/benchmarks/data/kodak/` and verify `run_kodak.sh` passes SHA pin.
- **Why:** The builder's B5/B6 pipeline selected `YCoCgR` for photographic Kodak (e.g. `kodim01`): `effort 0` (None) round-tripped, `effort 1+` (YCoCg) failed at byte 16, so `prism bench --effort 3 --kodak obsidian/benchmarks/data/kodak` reported `byte-exact mismatch` and the M3 gate could not be measured. After the clamp fix, all efforts 0..7 round-trip bit-exactly and `run_kodak.sh` verifies SHA pin.
- **Result:** Real Kodak 24 mean bpp (768x512 RGB, 393216 pixels):
  - `effort 0` 5.69 bpp (no color lift)
  - `effort 1` 3.68 bpp (`YCoCgR` + predictor bank + acoder, no CFL)
  - `effort 3` 3.68 bpp (Squeeze fallback L=0: cost estimate keeps plain; B5/B6 already clears the gate)
  - `effort 7` 3.68 bpp (CM/LZP never-expand stays plain on this corpus)
  All < 13.05 PNG, <9.61 WebP, <9.71 JPEG-LS, and < 8.71 JPEG-XL. `23/23` gtest + `fuzz 1000` + edge 1..64 odd/BD16 stay green; `run_kodak.sh` SHA pin `PASS`, `bench_gate.sh --gate 8.71` `PASS`.
- **Files:** `prism/src/prism.cpp` (plane_bd_max + per-plane decode), `prism/src/codec/analyze.cpp` (warn-clean), `prism/benchmarks/data/kodak.sha256` (real hashes), `prism/benchmarks/results/2026-08-23-prism-e*.csv` (durable, SHA-verified).
- **Next:** B7 Squeeze cost-estimate refinement (trial-encode guard) would make the R11-A `llc_class`/`sibling_class` squeeze path win on photographic content; currently the estimator keeps plain because B5/B6 already beats JXL, so the merge gate is quality-satisfied via the YCoCg+predictor gain.
