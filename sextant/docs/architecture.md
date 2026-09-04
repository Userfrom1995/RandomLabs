# Sextant architecture (living record)

Blueprint: `ideas/2026-09-04-sextant-gis-engine.md` (binding).
Research: `progress/286-sextant-research.md` (binding formulas and gates).

## Dependency rule

UI -> Core. Core never references App/Pack/UI. All JS lives behind
`ICanvasBridge` (`src/Sextant.App/Services/`); the only JS file with draw
calls is `wwwroot/js/canvasInterop.js`. Headless tests use `NullCanvasBridge`.

## Phase 0 de-risk record (2026-09-04, Builder run 1)

- Environment: .NET 10.0.400 SDK (plus 8.0.424 installed), zero workloads
  installed; all projects target `net8.0`; `global.json` pins SDK `8.0.424`
  (`rollForward: latestPatch`).
- `dotnet test`: 14/14 green (Mercator goldens + 10k seeded roundtrips for
  Mercator and Albers + TileMath smoke). One finding: `tan(PI/4)` is one ulp
  off 1.0 in doubles, so the origin-Y assertion uses precision 6, not 9.
- `dotnet publish src/Sextant.App -c Release`: SUCCEEDED with stock toolchain,
  no `wasm-tools` install. Output notes AOT optimization unavailable
  ("Publishing without optimizations ... we strongly recommend using
  `wasm-tools`"), which is accepted for v1: no silent fallback needed, the
  WASM bundle path is proven, and AOT stays an optional later optimization
  against the < 3 MB Brotli budget (measured in Phase 5).
- Decision: NO fallback shell; Blazor WASM is the Phase 5 UI path.
- `dotnet new sln` on SDK 10 defaults to `.slnx`; the repo uses classic `.sln`
  (`dotnet new sln -f sln`) for max tool compatibility.
- Open subpath question for Phase 5: `wwwroot/index.html` keeps `<base
  href="/">` for now; serving at `/sextant/` (and PR previews) needs a base
  strategy plus the PWA scope decision; do not fake it in Phase 0.

## graph.bin layout (pinned in Phase 4)

Reserved. Node Float64 x/y + adjacency CSR int32 + edge weights Float32;
exact offsets documented here when the packer lands.
