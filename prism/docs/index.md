# Prism

Lossless image codec in C++17, successor to Obsidian, targeting JPEG XL on Kodak.

- [Research](research.md)
- [Research: v3 content-clustering program](research-v3-content-clustering.md)
- [Architecture: T-series joint locality-context program](architecture-jxl-parity-tseries.md)
- [Algorithmic spec](algorithmic-spec.md)
- [Architecture](architecture.md)
- [Benchmark methodology](benchmark-methodology.md)

M0 is the bit-exact round-trip gate (all efforts, fuzz + corruption rejection). M1-M3 are benchmark gates measured by `benchmarks/run_kodak.sh`.

Quick start: `cmake -S prism -B build && cmake --build build -j && ./build/prism fuzz`
