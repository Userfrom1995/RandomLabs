# Progress: Prism #130 - R6B 16-bit histogram desync fix (issue #130)

- **Branch:** `opencode/issue130-r6b-clamp-desync-fix`
- **Status:** in-progress (fix + regression tests green; full-24 honest re-measure running)
- **Date:** 2026-09-03 (Builder run, resume mode from main at 9bd6d10)
- **Precedent:** Subband-oracle program complete on main (full-24 {P0,P2} oracle
  3.20664/9.61993, mux CLOSED at every granularity). Open PR #275 reports the
  same R6B decode failure with its own fix; this run independently reproduces,
  fixes, and regression-tests it on a fresh branch from current main.

## Binding gates (both units)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `Refs #130` only, never `Closes #130` while gates fail.

## The bug (reproduced on unmodified main)

`prism bench-r6b --kodak <kodim01>` on main at 9bd6d10:

```text
kodim01.ppm net=520971 per_sample=3.53306 summed=10.5992 FAIL
bench-r6b: roundtrip FAIL on kodim01.ppm (exit 1)
```

**Root cause (encoder/decoder asymmetry):**

- `BitplaneCoder::encode_static` (prism/src/codec/bitplane.cpp) builds the
  static backbone `sp0` from raw unclamped per-(subband,class) counts.
- `frame_wavelet_encode_r6b` (prism/src/codec/wavelet_container.cpp:668-672)
  clamps those counts to 16-bit for the wire (`if (cnt > 0xFFFF) cnt = 0xFFFF`).
- `BitplaneCoder::decode_static` rebuilds `sp0` from the transmitted
  (clamped) counts.
- On real Kodak images the dominant significance class accumulates far more
  than 65535 symbols, so encoder P(0) != decoder P(0) -> rANS desync ->
  `decode(encode(x))` FAIL.
- All pre-existing R6B unit tests use tiny rasters (64x48) whose class counts
  never overflow 65535, which is why the desync stayed green. Synthetic-only
  coverage of a wire-clamped path is exactly the false-confidence pattern.

**Scope proof:** R6C transmits full uint32 cluster counts (no clamp, safe);
R6D transmits already-quantized uint16 P(0) values directly (encoder and
decoder use identical values, safe). Only R6B has the count-clamp desync.

## The fix (zero wire-format change)

In `encode_static`, clamp `hist.cnt` to 0xFFFF immediately after the pass-1
counting loop, before deriving `sp0` (and before returning `hist` in the
result). The encoder now derives its static model from exactly the counts
the decoder will see; the container-side clamp becomes a no-op. The wire
already carried clamped values, so old decoders read new files identically.

Post-fix on kodim01: `net=539426 per_sample=3.65822 summed=10.9747 OK`
(exit 0, roundtrip=1). Net rises +3.5% vs the pre-fix number because the old
number was produced by an encoder model the decoder could never reconstruct;
the old number was not a real measurement. This independently reproduces the
3.658 figure reported on the parallel branch.

## Regression tests (both FAIL pre-fix, PASS post-fix)

- `R6B.ClampedHistRoundtrip`: 512x512 synthetic detail subband forces class
  overflow; asserts every returned hist count is wire-representable
  (<= 0xFFFF); decodes from an explicitly wire-clamped copy; expects exact
  coefficient equality. Verified FAIL on unfixed code.
- `R6B.LargeRasterContainerRoundtrip`: 512x384 random BD8 RGB raster through
  the full `frame_wavelet_encode_r6b` / `frame_wavelet_decode` container path.
  Verified FAIL on unfixed code.
- Pre-existing R6B tests (tiny rasters) pass unchanged pre- and post-fix,
  proving the fix is a no-op below the overflow threshold.

## Checklist

- [x] Reproduce bench-r6b roundtrip FAIL on unmodified main (kodim01)
- [x] Scope proof (R6C uint32 safe, R6D quantized-P0 safe, only R6B affected)
- [x] Fix in encode_static (additive clamp, no format change)
- [x] Two regression tests, verified FAIL pre-fix / PASS post-fix
- [x] R6B suite 5/5 PASS post-fix
- [x] kodim01 post-fix round-trip OK (3.65822/10.9747)
- [ ] Full-24 bench-r6b honest re-measure (running, ~13 min) + durable CSV
- [ ] Broader unit suite green
- [ ] ideas/ entry, commit + push, PR with Refs #130

## Next steps (for continue runs)

1. Collect full-24 CSV from /tmp/r6b-full24-fixed.csv, copy to
   `prism/benchmarks/results/2026-09-03-r6b-fixed-full24.csv`, dual-unit gate
   eval vs M2/M3 (expected FAIL, honest number).
2. Run broader suite (`prism_tests` minus known-red R7 guard) + `bench_gate.sh
   --self-check`.
3. Commit (modular: fix+tests, then CSV), push, open PR `Refs #130`.

- the Builder
