# Obsidian documentation

Current, accurate entry point for the Obsidian codec (issue #68). All numbers and interfaces below reflect the code on `main` as of 2026-08-20 (effort 4 mean 9.5209 bpp on Kodak, 148 lib tests).

## Start here

- [`../README.md`](../README.md) - **the accurate, current README**: what the codec does, how well it compresses (headline table), design summary, CLI usage, effort pipeline, env seams, project layout. Read this first.
- [`benchmark-methodology.md`](benchmark-methodology.md) - reproducible Kodak protocol (dataset, pinned commands, fidelity gate, metrics, milestones).
- [`../benchmarks/README.md`](../benchmarks/README.md) - current headline, per-image rows, ratios, trend history, and how to run the harness.
- [`../benchmarks/toolchain.md`](../benchmarks/toolchain.md) - pinned tool versions and lossless commands.
- [`research.md`](research.md) - literature review plus current-status addendum (2026-08-20). Historical M0/M1 diagnosis is retained with an errata flag.
- [`algorithmic-spec.md`](algorithmic-spec.md) - v1 algorithmic spec (prediction, context, rANS). Entropy section is superseded by the current code; see the errata banner inside.
- [`architecture.md`](architecture.md) - v1 software blueprint (workspace, modules, container). See `current-architecture.md` for the delta to the shipped code.
- [`current-architecture.md`](current-architecture.md) - **concise, code-accurate architecture supplement** (crate layout, module responsibilities, predictor list, context counts, entropy modes, model section, never-expand net). Addendum to the v1 blueprint, not a replacement.

## Archive (historical, not current spec)

Per-iteration blueprints and research notes that drove R3..R15. They are preserved for provenance but are **not the current codec**; many describe features that were measured net-negative and gated OFF. Do not treat them as the spec.

- `archive/architect-*.md` - Architect blueprints (R3 residual context, R4 binary coder, R6 color cache, R7/R8 weighted, R9 LZ/weighted-tree, R10 Squeeze/CFL, R11 cross-band, R12 per-band MA, R13 recursive, R14 RCCT, R15 NRP, CMARC).
- `archive/entropy-analysis.md`, `archive/entropy-architecture.md`, `archive/m2-*.md`, `archive/m3-*.md`
- `archive/research-*.md` (R9 breakthrough, R13/R14/R15 specs)

Historical results CSVs remain in `../benchmarks/results/` (e.g. `2026-08-17-v1.csv` with the 27.82 bpp first row). The current row is `2026-08-20-r15-baseline.csv`.

## Decisions

- `decisions/` - per-milestone Builder/Architect decisions and escalation logs (e.g. `decisions/builder/2026-08-19-squeeze-inert-needs-crossband-predictor.md`). These are the honest measurement notes behind the gated features.

## Where to look in code

- Core codec: `crates/obsidian-core/src/` - `encoder.rs` (never-expand net, Squeeze/CFL/RCCT/NRP nets), `decoder.rs` (mirrored), `predict.rs` (20 predictors + WeightedTree + AdaptiveRecursive + RCCT/NRP overlays), `context.rs` (gradient + residual contexts), `rans.rs` (GR, Capped rANS, CMARC RangeEnc/Dec), `model.rs` (`ModelConfig`, `analyze`, `analyze_bands`), `header.rs` (flags), `transforms.rs` (Squeeze/Lift/CFL), `color.rs` (YCoCg-R, subtract-green, palette).
- CLI: `crates/obsidian-cli/src/cli.rs` (subcommands, `--effort`, `--json`, `--predictor`, `--transform`, `--nrp`) and `image_io.rs` (format-agnostic I/O).
- Benchmarks: `benchmarks/run_kodak.sh`, `benchmarks/fuzz_gate.sh`, `benchmarks/aggregate.py`.

- the Builder
