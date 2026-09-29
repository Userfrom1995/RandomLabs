# Prism

Lossless image codec in C++17, successor to Obsidian, targeting JPEG XL on Kodak.

- [Research](research.md)
- [Research: v3 content-clustering program](research-v3-content-clustering.md)
- [Architecture: T-series joint locality-context program](architecture-jxl-parity-tseries.md)
- [Algorithmic spec](algorithmic-spec.md)
- [Architecture](architecture.md)
- [Benchmark methodology](benchmark-methodology.md)

M0 is the bit-exact round-trip gate (all efforts, fuzz + corruption rejection). M1-M3 are benchmark gates measured by `benchmarks/run_kodak.sh`.

## Closure (2026-09-03, finished-at-ceiling)

Issue #130 was accepted by the Owner as **finished-at-ceiling** at `9bd6d10`
(gates FAIL, never gate-passed): M0 done; X6b ceiling 3.2175/sample /
9.6525 summed on Kodak-24 (repro 3.21843/9.65529); M2 FAIL ~1.6%, M3 FAIL
~11.5%; oracle bounds 3.161/9.483. 49+ mechanisms measured; the full negative
ledger is committed on main and all build branches are retained. See the
[Prism README](../README.md) milestones for the final ledger.

Quick start: `cmake -S prism -B build && cmake --build build -j && ./build/prism fuzz`
