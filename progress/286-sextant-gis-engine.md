# Progress: Sextant

- **Issue:** #286
- **Branch:** opencode/issue286-20260904084331
- **PR:** #287
- **Status:** in-progress
- **Updated:** 2026-09-04T00:00:00Z

## Checklist

- [x] research: GIS engine spec (WGS84 foundation, Mercator + Albers formulas, tile clip/simplify/quantize pipeline, R*-tree + STR + I1..I7, A* admissibility + turn costs + isochrones, trigram geocoder + PWA + GeoJSON IO, test/perf gates) in `progress/286-sextant-research.md`
- [x] architect: blueprint and module layout in `ideas/2026-09-04-sextant-gis-engine.md`
- [ ] builder 0: de-risk (`Sextant.sln`, Core skeleton, one xUnit suite green, hello-map publish through ICanvasBridge; pin TFM + xUnit + wasm-tools; record fallback decision if needed)
- [ ] builder 1: projections + tile math (Geo, Mercator + Albers + reprojector, TileMath, control-point goldens, roundtrip fuzz, area preservation)
- [ ] builder 2: tile pipeline + packer (clip/simplify/quantize, TileBuilder, Sextant.Pack city pack, determinism goldens)
- [ ] builder 3: spatial index (R*-tree + reinsert + STR + condense + Pack, I1..I7 suite, fuzz vs oracle, throughput numbers)
- [ ] builder 4: routing + isochrones (CSR graph, A*/Dijkstra, turn table, contouring, 1000-pair oracle, histogram)
- [ ] builder 5: app shell + geocode + IO + docs (Blazor map/search/route/overlays/import, canvas batching, geocode index, PWA, GeoJSON IO, sextant/docs/ proofs + scoreboard + attribution, landing link, Playwright pass, full perf gate)
- [ ] reviewer findings addressed
- [ ] tester approval plus maintainer merge

## Current step

Ready for initial build

## Next steps

Builder to prove Phase 0 on this branch (sln + Core skeleton + xUnit green + hello-map publish), then implement Phases 1 through 5 in order on the same PR across `continue` cycles.

## Agent log

- 2026-09-04 (Researcher run 1): wrote `progress/286-sextant-research.md` (geodetics, projections, tile pipeline, R-tree, routing, geocoding/offline/IO, test/perf gates, risks). Decision action: architect.
- 2026-09-04 (Architect run 1): read architect.md, issue #286, and the research spec. Verified dotnet 10.0.400 present with zero workloads installed (wasm-tools unproven, hence the Phase 0 escape clause). Produced blueprint at `ideas/2026-09-04-sextant-gis-engine.md` (Sextant.Core net8.0 headless + Sextant.App Blazor shell behind ICanvasBridge + Sextant.Pack offline packer, interface sketches, binding test matrix and perf budgets, Phase 0 de-risk, v2 deferrals). Wrote this progress file. Decision action: build.
