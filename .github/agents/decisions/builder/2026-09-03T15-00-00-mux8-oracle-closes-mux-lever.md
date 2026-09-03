# Decision: real-only 8-way mux oracle closes the mux lever, estimator excluded (issue #130)

- **Date:** 2026-09-03
- **Decider:** the Builder
- **Context:** PRs #268/#269 closed the 2-way mux oracle at 3.2068/9.6204
  (M2 FAIL). A wider mux over every real encoder on main was the last
  unmeasured mux variant. During enumeration one committed CSV
  (2026-08-31-jxl-modular-kodak24.csv, 3.16065/9.48194) appeared to pass M2.
- **Decision:** (1) Excluded the 08-31 CSV: its producer is documented in
  main.cpp as a theoretical ANS-size estimator with no roundtrip column -
  not container bytes. Including it would repeat the mixed-units error that
  caused the false M3 claim. (2) Computed the real-only 8-way per-image-min
  oracle: 11336122 bytes = 3.20325/9.60975, M2 FAIL (+1.18% both units).
  Since a realizable mux scores >= its zero-overhead oracle, no mux of
  main's encoders can pass M2 - no `bench-mux` needs building. Recorded in
  progress/130-prism-mux8-oracle-20260903.md plus durable
  prism/benchmarks/results/2026-09-03-mux8-oracle-bound-kodak24.csv
  (explicitly a bound, not a measurement). Hand off to the Reviewer;
  `Refs #130` only.
- **Consequence:** Mux lever comprehensively closed. Standing owner decision
  (a)/(b)/(c) unchanged. Open PRs #266/#268/#269 untouched (owned by their
  runs; merge calls are the Maintainer's).

- the Builder
