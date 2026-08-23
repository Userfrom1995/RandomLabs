# Prism

A lossless image codec written from scratch in C++17, targeting JPEG XL on the Kodak dataset.

Prism is the successor to Obsidian (issue #68) which plateaued at 9.5208 bpp. The gap to JPEG XL (8.71 harness / ~2.9 per sample) is a redundancy-class gap requiring coupling multi-resolution Squeeze (JPEG XL CDC) with a meta-adaptive MA-tree context model. Prism implements that coupling, with a correct entropy backend and a hard bit-exact round-trip invariant from M0.

## Format

- **Input:** PNG/JPEG/BMP/TGA/HDR via stb_image, PPM (P5/P6/PPM16), raw (with --w/--h/--bd/--ch), WebP/TIFF behind CMake options.
- **Container `PRSM`:** 4-byte magic, LE header, bit-packed model blob with `crc32_model`, post-order payload per band, `crc32_all` footer. Corruption is hard-rejected.
- **Stages:** reversible color decorrelation (YCoCg-R etc.), optional Squeeze, MED/GAP predictor bank, MA-tree context (single-leaf at M0, capped depth/leaf count), context-modeled entropy (binary adaptation with Rice quotient/remainder), container.
- **Effort 0..7:** encoder-side search only; bitstream version is 1 for all efforts.

## Building

```bash
cmake -S prism -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/prism enc in.png out.prism --effort 4
./build/prism dec out.prism out.ppm
./build/prism fuzz --iters 1000
ctest --test-dir build --output-on-failure
```

Options: `-DPRISM_WITH_WEBP=ON -DPRISM_WITH_TIFF=ON`.

## CLI

```
prism enc <in> <out.prism> [--effort N] [--w W --h H --bd B --ch C]
prism dec <in.prism> <out.ppm>
prism fuzz [--iters N]
prism info <file.prism>
prism probe-backend <image.ppm> [--variants v0,v1,v1shared,v2,v2shared]
```

`probe-backend` is the entropy-backend A-B rail for issue #130: it measures
the shipped coder (v0), the zero-flag-first rebinarization (v1), and backend
v2 (dual-rate hierarchical models) on pipeline-exact residual streams,
payload-only. Feed it through `benchmarks/probe_backend.sh`, which verifies
SHA256 pins first, writes a durable CSV, and enforces the A1/A2 acceptance
gates with a self-check.

Since C2 the MA-tree is always-on at effort >= 3: `analyze()` builds it on
spatial residual features with raised caps (depth 10, up to 256 leaves,
min-samples 512, quantile split candidates) and accepts it ONLY if trial
encodes - payloads plus serialized model bytes - beat flat v2 coding
(container flags bit4 marks tree-coded level-0 planes; decode mirrors with
uniform leaf-prior init). On photo corpora the trial currently rejects and
streams stay flat: measured honestly, never assumed.

## Stages and milestones

- **M0 (blocker):** bit-exact round-trip at efforts 0/4/7, corruption rejection (current).
- **M1:** beat PNG (13.05) + WebP (9.61)
- **M2:** beat JPEG-LS (9.71)
- **M3 (owner goal):** beat JPEG XL (8.71 harness / 2.9 per sample) - requires Squeeze + MA-tree
- **M4 (stretch):** CM mode + LZP toward < 8.0

See `prism/docs/research.md`, `prism/docs/algorithmic-spec.md`, `prism/docs/architecture.md`, `prism/docs/benchmark-methodology.md`. Issue #130 (true JXL parity) adds `research-gap-analysis.md` (where the ~21 percent gap lives, findings F1-F4) and `architecture-jxl-parity.md` (the C-series build plan).

## Module layout

```
prism/include/prism/*.h
prism/src/common  (crc32, bitstream)
prism/src/codec   (color, predict, rans, matree, squeeze, container, analyze)
prism/src/frontend (ppm, stb_image, frontend)
prism/src/cli
prism/tests/unit
prism/benchmarks
```

Prism is a CLI tool: there is no web entrypoint; project documentation lives in
`prism/docs/`.

## Benchmarks

```
prism/benchmarks/run_kodak.sh --effort 4 --kodak data/kodak
prism/benchmarks/fuzz_gate.sh
prism/benchmarks/probe_backend.sh --build-dir <dir> --image <kodim01.ppm> --image <kodim13.ppm>
python3 prism/benchmarks/aggregate.py
```

Results are committed under `prism/benchmarks/results/`.

- the Builder
