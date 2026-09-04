# Sextant: from-scratch GIS mapping engine (C# Blazor WASM)

Static-only GIS viewer at `/sextant/` (GitHub Pages, no backend, offline after
first load). Full blueprint: `ideas/2026-09-04-sextant-gis-engine.md`.
Research spec: `progress/286-sextant-research.md`.

## Layout

- `Sextant.sln` (solution, classic `sln` format)
- `global.json` (pins .NET 8 SDK feature band)
- `src/Sextant.Core/` - dependency-free headless core (net8.0, zero JS/Blazor):
  projections, tile math/clip/simplify/quantize, R-tree, routing, geocoding, GeoJSON
- `src/Sextant.App/` - Blazor WASM shell (net8.0): Canvas2D via `ICanvasBridge`,
  map/search/route/overlay/import UI, PWA shell
- `tools/Sextant.Pack/` - offline asset packer (net8.0 console)
- `tests/Sextant.Core.Tests/` - xUnit suite (Core only, `dotnet test` on Linux)
- `docs/` - `architecture.md`, per-subsystem notes, proofs, scoreboard, attribution
- `publish/` - local publish output (git-ignored, Phase 5 stages the Pages output)

## Build

```sh
dotnet test tests/Sextant.Core.Tests
dotnet publish src/Sextant.App -c Release
```

 SDK: .NET 8 LTS target (`net8.0` everywhere), buildable from the installed
 .NET 10 SDK. Stock (non-AOT) Blazor publish; `wasm-tools` not required for v1
 (see `docs/architecture.md` Phase 0 record).

## Status

Phase 2 complete: tile pipeline (`Geometry` clip/simplify/quantize +
`TileBuilder` deterministic emit + `Packs` manifest/reader +
`Reprojector.ReprojectTo`) + `Sextant.Pack` synthetic v1 city pack (140
features, byte-identical across runs) + `docs/tile-pipeline.md` + 42/42 xUnit
green (incl. pack-to-tile integration). Phases 3-5 build index/routing/app-shell
in dependency order.
