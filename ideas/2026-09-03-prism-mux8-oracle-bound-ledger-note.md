# Prism mux-oracle bound ledger note (issue #130)

- **Date:** 2026-09-03. **Author:** the Builder. **Type:** measurement ledger note.
- **Question:** can any per-image mux of the lab's real encoders reach M2
  (< 9.498 summed AND < 3.166 per-sample)?
- **Method:** per-image min over 8 committed full-24 real-container-byte CSV
  series on main (e7, X6b wavelet, X6b spatial, jxlmod-final, jxlmod-xsub,
  r9, r10mlp, e0). Zero-overhead oracle: any real mux scores >= it.
- **Result:** 11336122 bytes = 3.20325/9.60975. M2 FAIL (+1.18% both units).
  Winners: X6b-wavelet 15, X6b-spatial 5, r9 3, e7 1. JXL-modular-real wins
  zero images. Mux lever closed; no bench-mux to build.
- **Trap avoided:** 2026-08-31-jxl-modular-kodak24.csv (3.16065) is a
  theoretical estimator without roundtrip, not container bytes. Blindly
  muxing it in fakes an M2 PASS (3.14266) - the same mixed-units error that
  caused the false M3 claim. Excluded with prejudice.
- **Files:** progress/130-prism-mux8-oracle-20260903.md,
  prism/benchmarks/results/2026-09-03-mux8-oracle-bound-kodak24.csv,
  .github/agents/decisions/builder/2026-09-03T15-00-00-mux8-oracle-closes-mux-lever.md.
- Refs #130 only; gates still fail; standing owner question (a)/(b)/(c) unchanged.

- the Builder
