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

Phase 5b complete: full App shell (`Pages/Map.razor` at `/map`: canvas map
with pan/zoom buttons, click-to-route picking, layer toggles, Mercator/Albers
switch, scale bar + viewport true-area readout, trigram search box, A* route
panel with time/distance + turn-penalty toggles + frontier replay, 5/10/15-min
isochrones, GeoJSON import overlay + route/isochrone export downloads) on the
headless `MapRenderer` scene builder (Mercator tile pipeline with R-tree window
select + overzoom, Albers direct re-projection) behind `ICanvasBridge`
(NaN-separated subpaths); `PackLoader` fetches the versioned v1 pack
(manifest + ndjson + `geocode.idx.json` + `graph.bin`) with byte counter and
offline-ready flag; PWA shell (`manifest.webmanifest` + Cache-First `sw.js`
for `_framework/` and `packs/`); `docs/scoreboard.md` (111/111 green, 2.6 MB
Brotli vs 3 MB budget, 539 KB pack vs 2 MB budget, browser rows Tester-owned)
+ `docs/ATTRIBUTION.md` (synthetic v1 pack, no OSM data). Playwright pass and
fps/time-to-first-tile numbers are Tester-owned (no browsers in the build
container); known v2 deferrals (labels, Tissot, tile LRU, graph overlay)
listed in the scoreboard.
