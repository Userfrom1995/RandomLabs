# Progress: Prism #130 - JXL-Modular Real Encoder (issue #130)

- **Branch:** `opencode/issue130-jxl-modular-real-encoder`
- **Status:** in-progress
- **Date:** 2026-09-01 (Builder run, `/oc continue` trigger)
- **Precedent:** JXL-modular theoretical estimator: 3.16064/9.48193 (M2 PASS, M3 FAIL by 8.72%).
  The estimator computes ANS entropy but does NOT produce a real byte stream (decode is a stub).

## This run (Builder, 2026-09-01)

1. Oriented to issue #130 (220+ comments), read ALL 32+ progress files, all research specs,
   all architecture docs, all open PRs.
2. Confirmed `origin/main` at `32a8c11` ("builder: exhaustive ceiling confirmed, escalate
   to Maintainer for Owner decision"). Branch at same commit, clean tree.
3. Identified the key gap: the JXL-modular estimator achieves 3.16064/9.48193 (M2 PASS)
   but the decode is a stub. Building the REAL encoder is the most impactful next step.
4. Identified the chicken-and-egg problem: the 8-feature MA-tree uses `res_diff` (absolute
   residual) which is not available at decode time. The real encoder must use a 7-feature
   tree (excluding `res_diff`).

## What was built

1. **2048-symbol rANS static coder** (512 was too small for YCoCgR residuals)
2. **Container format** (header + per-plane sections: MA-tree + histograms + ANS payload)
3. **Real encoder** (`jxl_modular_encode_real()`) with progressive recon fill
4. **Real decoder** (`jxl_modular_decode_real()`) with byte-exact round-trip verification
5. **CLI commands** (`encode-jxl-modular`, `decode-jxl-modular`, `bench-jxl-modular-real`)
6. **Kodak-24 measurement** - PASS=24 FAIL=0 round-trip

## Key fix: kAnsAlphabet was 512, bumped to 2048

The root cause of the initial round-trip failure was that YCoCgR color-transformed
Co/Cg channels produce wavelet residuals exceeding ±255, which maps to symbols >511
via `res_to_sym()`. With `kAnsAlphabet=512`, these were silently clamped to 511,
and `sym_to_res(511) = 256` ≠ the original residual. Bumping to 2048 fixed it.

## Current metrics

- **Mean per-sample bpp:** 5.84 (target M2: 3.166, target M3: 2.885)
- **Mean summed bpp:** 17.53 (target M2: 9.498, target M3: 8.655)
- The real encoder is ~1.8x worse than M2 gate. Next step: improve compression.

## Binding gates (units mandatory)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`

## Next steps

- [x] Implement 2048-symbol rANS coder
- [x] Implement container format serialization/deserialization
- [x] Implement real encoder with 7-feature MA-tree
- [x] Implement real decoder with byte-exact round-trip
- [x] Add CLI commands
- [x] Build and run all tests
- [x] Measure on Kodak-24
- [ ] Run bench_gate.sh (currently FAIL at 5.84 bpp vs 3.166 target)
- [ ] Improve compression to pass M2 and M3 gates
- [ ] Push and open PR

- the Builder
