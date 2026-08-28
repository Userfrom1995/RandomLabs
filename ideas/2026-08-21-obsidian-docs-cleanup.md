# Obsidian documentation cleanup (2026-08-21)

- **Issue:** #68
- **Branch:** opencode/issue68-20260821202612
- **Author:** the Builder
- **Status:** complete

## What was built

A full documentation cleanup for the Obsidian lossless codec (issue #68), as requested by the Maintainer (2026-08-21). The codec implementation itself (9.5209 bpp, 148 tests) is unchanged; only documentation and benchmark presentation are brought up to date.

## Changes

- **obsidian/README.md** - complete rewrite: current headline (9.5209 vs JXL 8.71/WebP 9.61), honest gate table, historical 27.82 note, complete design summary (20 predictors, 95 contexts, CMARC RangeEnc, Squeeze/CFL/Lift, RCCT/NRP gated), full CLI reference (encode/decode/roundtrip/selftest/check/bench, --effort/--json/--predictor/--transform/--nrp), effort pipeline table, env seams, benchmark instructions, layout and document index, trend history. No outdated benchmark featured as current.
- **obsidian/benchmarks/README.md** - rebuilt headline to current (9.5209), per-image table for 2026-08-20 (24 rows + means), geomean ratios (0.99x WebP, 1.095x JXL, 0.73x PNG), verification, fidelity gate (148 tests), running instructions, and honest trend (27.82 -> 10.09 -> 9.70 -> 9.66 -> 9.52).
- **obsidian/docs/** - restructured from 28-file sprawl:
  - Archived 23 per-iteration blueprints/research notes to `docs/archive/` (architect R3..R15, entropy, M2/M3, research breakthroughs).
  - Added `docs/README.md` (entry point, where to read what, archive guide).
  - Added `docs/current-architecture.md` (code-accurate supplement: crate layout, 20 predictors, 95 contexts, entropy modes, model section, never-expand net).
  - Added banner to `docs/architecture.md` (v1 historical, points to supplement) and `docs/algorithmic-spec.md` (entropy errata, points to supplement).
  - Appended current-status addendum to `docs/research.md` (2026-08-20 measured 9.5209, gated levers, structural ceiling).
  - Left `docs/benchmark-methodology.md` and `docs/decisions/` untouched (still accurate).
- **Verification:** `cargo test --manifest-path obsidian/Cargo.toml` 148 pass, `obsidian_cli roundtrip --effort 4 --json` on kodim01 matches the CSV (10.1167 bpp, bit-exact), benchmark CSV mean recomputed as 9.5209, CLI help matches the docs.

## Key files

- `obsidian/README.md:1` - the accurate README
- `obsidian/benchmarks/README.md:1` - the benchmark summary
- `obsidian/docs/README.md:1` - docs map
- `obsidian/docs/current-architecture.md:1` - code-accurate architecture
- `obsidian/docs/archive/` - historical blueprints

## Notes

The codec's next lever is outside the single-pixel pipeline (VarDCT/transform coding) per the R15 halt trigger; the docs now state that honestly and mark RCCT/NRP as gated research features.

- the Builder
