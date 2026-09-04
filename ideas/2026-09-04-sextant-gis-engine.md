# Sextant: from-scratch GIS mapping engine in C# (architectural blueprint)

Date: 2026-09-04. Issue: #286. Research input: `progress/286-sextant-research.md` (binding: WGS84 constants, Web Mercator + spherical Albers CONUS triplet, tile clip/simplify/quantize pipeline, R*-tree with STR + reinsert + I1..I7 invariants, A* with time/distance modes + turn penalties + Dijkstra oracle + marching-squares isochrones, trigram geocoder + PWA + GeoJSON IO, section 8 test plan, section 9 scoreboard, section 10 risks). This blueprint resolves every handoff item in research section 11 into solution layout, interfaces, build order, and acceptance gates.

## Summary

Sextant is a static-only GIS viewer hosted at `/sextant/index.html` (GitHub Pages, no backend, offline after first load). A dependency-free headless core (`Sextant.Core`, net8.0 class library, zero JS, zero Blazor, zero browser APIs, deterministic, seeded RNG only) owns projections, tile math/clip/simplify/quantize, R-tree index, routing graph + A*/Dijkstra + isochrone contouring, geocoding index, and GeoJSON codecs. A thin Blazor WASM shell (`Sextant.App`, net8.0) owns Canvas2D rendering via a minimal JS bridge, pan/zoom/layer UI, search box, import/export, PWA shell, and debug overlays. An offline packer console tool (`Sextant.Pack`, net8.0) converts authoring data into versioned static assets under `sextant/src/Sextant.App/wwwroot/packs/`. One branch and one PR carry the whole technique across continuous `continue` cycles: Phase 0 de-risks the dotnet WASM toolchain, then Phases 1 through 5 build projections, tiles, index, routing, and app shell in dependency order.

## Deliverables (what the Builder ships on this milestone)

- `sextant/` static app: `Sextant.sln` plus `src/Sextant.Core/`, `src/Sextant.App/` (Blazor WASM, `wwwroot/index.html` entry, `canvasInterop.js`, `manifest.webmanifest`, `sw.js` service worker scoped to `/sextant/`), `tools/Sextant.Pack/` (offline asset packer), `tests/Sextant.Core.Tests/` (xUnit), `src/Sextant.App/wwwroot/packs/` (versioned city pack: ndjson layers, `graph.bin` + `graph.geojson`, geocode index), `docs/` (`architecture.md` pointer, `projections.md`, `tile-pipeline.md`, `rtree.md`, `routing.md` with admissibility proof sketches, `scoreboard.md` with measured numbers, `ATTRIBUTION.md` with ODbL chip text).
- `sextant/docs/` retained proofs: A* admissibility/consistency argument (time mode `h(v)=haversine/maxSpeed`, distance mode `h(v)=haversine`) plus the A*-equals-Dijkstra oracle description; R-tree I1..I7 invariant list; Albers equal-area cell test description. Proofs are checked by tests, not just prose.
- Headless determinism: `dotnet test` green on Linux with fixed `Random(286)`, no wall-clock reads in Core, heap tie-breaks by node id, float rendering pinned to one implementation.
- Sample city pack bundled covering roads, buildings, water, landuse, POIs plus a routable road graph (target 5k-20k nodes); synthetic/hand-authored geometry preferred for v1 so the repo stays license-light, with OSM-derived extracts allowed only with attribution chip + docs entry.
- Root `index.html` landing entry for Sextant (preview card linking to `/sextant/`), without removing the Random landing page or breaking `pages.yml` PR previews.
- Single PR across `continue` cycles; never split scaffolding and engine and UI into separate PRs.

## Why

Every map app hides the same four machines: the projection that flattens the earth, the tile pipeline that clips the world into squares, the spatial index that answers "what is here", and the shortest-path search that routes you home. Sextant opens all four: switch Mercator to Albers and watch Greenland stop lying, toggle the R-tree overlay and see bounding boxes prune a query, watch the A* frontier bloom and the isochrone contour settle. C# is a fresh factory language and Blazor WASM makes a genuinely impressive Pages-hostable demo, while the dependency-free Core stays headlessly testable with `dotnet test` on Linux. The top correctness risks are geodetic drift (wrong radius, unclamped latitude, dual-projected caches), index unsoundness (broken containment, unbalanced leaves, missed results), and inadmissible heuristics (overestimating h, turn penalties breaking optimality), so this blueprint pins exactly one correct behavior per case and binds it to an oracle test.

## How It Works

1. Entry: user opens `/sextant/index.html`. The shell loads the WASM bundle (or a documented fallback shell if Phase 0 forces it), fetches the versioned city pack (same-origin only, Cache-First), STR-packed R-tree rebuilds in memory, and the first 3x3 tile batch paints Haymarket-style downtown through Web Mercator.
2. Pan/zoom: view state (center lon/lat, fractional zoom, projection id, layer visibility, style) maps to a visible tile range (3x3 to 5x5, overzoom scale `2^(zFloat-zInt)`). Per tile: get-or-build from the 64-entry LRU (`TileBuilder.BuildTile(z,x,y)` over R-tree window query, Sutherland-Hodgman clip, per-zoom Douglas-Peucker + radial pre-pass, 4096-extent quantize), project, style-match in C#, batch to Canvas. Draw order: landuse, water, buildings, road casing, road fill, labels (greedy collision grid), then overlays.
3. Projection switch: App keeps WGS84 source of truth; Core `Reproject(geom, src, dst)` re-projects cached geometries on the fly with one LRU generation per projection id. Albers view renders the same feature set through the forward map with graticule + Tissot ellipses; tiles are Mercator-addressed only (no re-tiling in P2, per research 3.2).
4. Search: debounced (150 ms) prefix/trigram lookup over the bundled index (NFKD fold, top-8 autocomplete), ranking by prefix bonus + trigram overlap + class weight + population weight; selection zooms to the feature bbox.
5. Route: user picks origin/destination (click-click plus keyboard entry). Core A* over the CSR graph (time mode default, distance toggle, turn-penalty toggle) returns path + cost + closed-set frontier sample (cap 20k, deterministic order); App draws route line + animated frontier dots. Isochrone: time-limited Dijkstra from source, segment-rasterize to a 50-100 m grid, marching-squares contour, one Chaikin smooth pass, GeoJSON polygon overlay + export download.
6. Import/export/offline: drag-drop GeoJSON parses in C# (`System.Text.Json`, right-hand-rule normalize), validates, inserts into the live R-tree, and renders; route/isochrone downloads via Blob interop as `sextant-route-<utc>.geojson`. Service worker caches shell + packs; UI shows offline-ready badge + byte counter. All fetches same-origin (no tile CDN, no font CDN).

## Module Breakdown (domain decoupled from presentation)

Domain (`src/Sextant.Core/`, net8.0, zero JS/Blazor/browser imports, `dotnet test` on Linux):

- `Geo.cs`: `GeoPoint(lon,lat)`, WGS84 constants (`A=6378137.0`, `F=1/298.257223563`, `E2`, `R`), clamping helpers, `HaversineM(a,b)`, planar helpers, `SphericalAreaM2(ring)` (spherical-excess approximation for the distortion readout). All math in `double`.
- `Projections.cs`: `IProjection { Id, Name, Forward(lon,lat): ProjectionResult, Inverse(x,y): LonLatResult }`, `WebMercatorProjection` (spherical, lat clamp +-85.05112878), `AlbersProjection(phi1,phi2,phi0,lambda0)` (validates `n != 0`, throws `ArgumentException`; pole-guard, `[-1,1]` asin clamp), `Reprojector.Reproject(geom, src, dst)`. `ProjectionResult { X, Y, Valid }` never throws on out-of-domain points (returns `Valid=false`).
- `TileMath.cs`: slippy `LonLatToTile(lon,lat,z)`, `TileBounds(z,x,y)` (WGS84 + Mercator meters), overzoom scale helper, z range 0..19 (data bundled to z14, overzoom beyond).
- `Geometry.cs`: `QGeom` model (point/polyline/polygon-ring in WGS84 doubles), `Clipper` (Sutherland-Hodgman per ring, Cohen-Sutherland/Liang-Barsky per segment, point-in-tile), `Simplifier` (radial-distance pre-pass + Douglas-Peucker with per-zoom tolerance: z<=10 ~8 extents, 11..13 ~4, >=14 ~1.5), `Quantizer` (4096-extent ints, MVT-compatible convention, no protobuf wire in v1).
- `TileBuilder.cs`: `TileBuilder.BuildTile(z,x,y, layers, index, tol)` returning `Tile { Layers: [{ Name, Features: QGeom[] }] }`; deterministic byte-stable output (same input bytes twice); LRU cache lives in App, not Core.
- `RTree.cs`: R*-tree (`RTree<T>` with `M=32`, `m=13`, p=30% single-reinsert-per-level, `ISplitStrategy` seam with R* topological split default + Guttman quadratic fallback), `STR.BulkLoad(entries)` packer, `Insert/Delete` (Guttman condense + `Pack()` STR rebuild), `Window(rect)` DFS with MBR prune, `Nearest(point,k)` best-first Hjaltason-Samet over a min-heap, version-stamp concurrent-modification guard (`InvalidOperationException`), NaN/Infinity rejection (`ArgumentException`). Distances planar in query CRS; global-nearest shortlist-rerank with Haversine documented as the seam (city-scale planar is v1 truth).
- `Graph.cs`: `RoadGraph` CSR (`NodeTable` Float64 x/y Mercator-local + lon/lat, adjacency CSR int32, edge weights Float32, `MaxKmh` per edge, `OneWay`, `RoadClass`), speed table (residential 30 through motorway 100, tunable), `CostS = LengthM/(MaxKmh/3.6)` + turn table (straight 0 s, normal +4 s, left-across/U-turn +8 s, class downgrade +2 s). Expanded-state `(node, incomingEdge)` handled implicitly at expansion; `IBidirectionalFrontier` seam left open (v1 forward search only).
- `Routing.cs`: `AStar(origin, goal, mode, penalizeTurns)` + `Dijkstra` (same code path, h=0), min-heap keyed `(f, nodeId)` for determinism, `NoPath` result (never exception) on disconnect, closed-set insertion-order recorder (cap 20k) for the frontier animation.
- `Isochrone.cs`: time-limited Dijkstra, segment rasterizer onto caller-sized grid (cell 50-100 m), marching-squares contour extraction, one Chaikin pass, GeoJSON `Polygon/MultiPolygon` emit. Oracle contract: contour contains exactly arrival<=T nodes within one cell tolerance.
- `Geocode.cs`: trigram inverted index CSR + prefix trie, `NormalizeNfkd` fold, `Score = 2*prefixBonus + overlap/len + classWeight + popWeight`, top-8 query, <500 KB asset budget for city pack.
- `GeoJson.cs`: parse/emit with `System.Text.Json` (right-hand-rule normalize, antimeridian note, enumerated malformed-input errors), isochrone/route export schema.
- `Packs.cs`: asset schema (`pack.json` manifest with version + extents + budgets, ndjson layers base + ultra tolerances, `graph.bin` layout doc, geocode index layout doc); Core exposes readers, never fetch.

Bridge (`src/Sextant.App/`, only place JS interop appears):

- `Services/ICanvasBridge.cs`: `DrawBatches(LayerBatch[])`, `DrawOverlays(OverlayBatch)`, `Clear()`, `Resize(w,h,dpr)` with typed-array (`Float32Array`) batch transfer, one `beginPath` per layer, offscreen label atlas for text. All JS behind this interface so headless tests substitute a null recorder. Static-layer offscreen cache + overlay-only redraw during animation is the perf fallback path.
- `Services/MapState.cs`: view state (center, fractional zoom, projection id, layer visibility, style, selected route endpoints) as the single source of truth; projected-vertex cache keyed by (tile, projection id), one LRU generation.
- `Services/PackLoader.cs`: same-origin fetch of versioned pack assets, byte counter, offline-ready flag; never contacts a tile CDN.
- `wwwroot/js/canvasInterop.js`: the only JS file with draw calls; no style logic, no math, no state.
- `wwwroot/sw.js` + `manifest.webmanifest`: PWA shell (`CacheFirst` immutable versioned assets, `StaleWhileRevalidate` docs).

Presentation (`src/Sextant.App/Pages/` + `wwwroot/css/`, calls Bridge only):

- `Map.razor` (canvas + pan/zoom input, layer toggles, projection switcher, scale bar + true-area readout, attribution chip), `Search.razor` (debounced autocomplete), `RoutePanel.razor` (origin/destination pickers, mode + turn-penalty toggles, cost readout), `Overlays.razor` (R-tree MBR debug, A* frontier replay, isochrone fill), `ImportExport.razor` (drag-drop, error states, download buttons), `Onboarding.razor` (sample map tour, empty/loading/error states).
- `wwwroot/css/sextant.css` design tokens (`--sex-bg`, `--sex-surface`, `--sex-ink`, `--sex-accent`, `--sex-water`, `--sex-error`), desktop sidebar-plus-map layout, 390px mobile single-column with bottom sheet, keyboard paths for every action, accessible contrast, focus rings + live regions.

Packer (`tools/Sextant.Pack/`, net8.0 console, offline-only):

- `Pack.cs`: reads authoring GeoJSON + road network, emits ndjson layers (base + ultra), `graph.bin` (node Float64 + CSR int32 + weights Float32 layout pinned in `docs/architecture.md`), `graph.geojson` debug overlay, trigram/trie geocode asset, `pack.json` manifest. Deterministic output (fixed seed, sorted emit). PROJ cross-check helper documents how golden CSVs were frozen (run once offline, checked in, no network at test time).

Public interface sketch (binding shapes; Builder expands in C#):

```csharp
public readonly record struct GeoPoint(double Lon, double Lat);
public readonly record struct ProjectionResult(double X, double Y, bool Valid);
public interface IProjection { string Id { get; } string Name { get; }
  ProjectionResult Forward(double lonDeg, double latDeg);
  (double Lon, double Lat, bool Valid) Inverse(double x, double y); }
public sealed class TileId { public int Z, X, Y; }
public sealed class TileBuilder { public Tile BuildTile(int z, int x, int y); }
public sealed class RTree<T> { public void Insert(Rect r, T id); public void Delete(Rect r, T id);
  public List<T> Window(Rect q); public List<T> Nearest(double x, double y, int k); public void Pack(); }
public sealed class RoadGraph { public static RoadGraph Load(byte[] graphBin); }
public static class Router { public static RouteResult AStar(RoadGraph g, int o, int d, CostMode m, bool turns);
  public static RouteResult Dijkstra(RoadGraph g, int o, int d, CostMode m, bool turns); }
public interface ICanvasBridge { void DrawBatches(LayerBatch[] b); void DrawOverlays(OverlayBatch o); }
```

## dotnet WASM build (binding)

- SDK: .NET 8 LTS (buildable from the installed .NET 10 SDK; `global.json` pins the SDK feature band the Builder verifies on first run). Packages: `Sextant.Core` (no JS dependency), `Sextant.App` (Blazor WASM, references Core), `Sextant.Pack` (references Core for emit parity), `Sextant.Core.Tests` (xUnit, references Core only). Reverse dependency rule UI -> Core; Core never references App/Pack/UI; recalc-free hot path (tile build + route) stays in WASM linear memory.
- Artifact: `dotnet publish Sextant.App -c Release` emitted under `sextant/publish/` copied to `sextant/docs`-adjacent static output served at `/sextant/`; Pages serves statically; service worker caches shell plus bundle plus pack for offline reuse.
- Phase 0 gate (blocking): `dotnet test` green for at least projection round-trip + one R-tree invariant suite AND `dotnet publish` of a hello-map shell (canvas element painted one batch through `ICanvasBridge`) OR `wasm-tools` install proven working. If the WASM workload blocks after a timeboxed attempt (record hours in the progress file), the headless Core + Pack still land as the shippable artifact with a documented thin-bundle fallback, and the UI depth is rescoped rather than faking WASM. No silent fallback: the decision and evidence go in `sextant/docs/architecture.md`. (Rationale: this image ships .NET 10.0.400 with zero workloads installed, so `wasm-tools` availability is unproven until Phase 0 tries it.)

## Test Matrix (binding, mirrors research section 8)

- Projections: 10k-point seeded roundtrip fuzz (max error < 1e-9 deg in-domain); golden control points (`ProjectionControlPoints.cs`: origin identity, NYC/Berlin PROJ-verified to 1 m, `(0,85.05112878)` north edge to 0.01 m, `(180,0)` east edge); Albers origin-is-zero, on-parallel scale 1 to 1e-12, 10k roundtrip, equal-area cell test (shoelace vs cos-weighted sphere within 0.5 percent).
- Tile pipeline: clip goldens (ring/segment/point at tile edges), simplify goldens (Hausdorff < 0.5 px at target zoom + published reduction ratio), quantize goldens (4096 extent, overzoom scale identity), determinism (same bytes twice).
- R-tree: I1..I7 invariant suite after every mutating op; STR-vs-incremental equivalence; 1k-op seeded fuzz vs brute-force oracle for window + k-NN; fill/balance/degen/NaN guards; throughput published (100k bulk load, 10k window p95, 1-NN p95).
- Routing: A*-equals-Dijkstra on 1000 seeded pairs within 1e-6 relative (build fails on any mismatch); turn-penalty admissibility (`cost_with >= cost_without`); unreachable returns `NoPath`; heap tie-break determinism (fixed pair replays identical frontier); median/p95 histogram published.
- Geocode/import/export: 50 curated queries top-k recall incl. fold/diacritic cases; GeoJSON roundtrip incl. winding + antimeridian note; isochrone export schema validation; malformed-input error enumeration.
- Determinism: fixed `Random(286)`, no wall-clock, no parallel nondeterminism; same pack + query script yields byte-identical tiles/routes across runs.
- Visual (Playwright screenshots): serve `sextant/` output, capture basemap, Albers view with Tissot, layer toggles, R-tree overlay, route + frontier, isochrone, search, import error, at desktop (1280x800) and mobile (390x844); fail on overflow, overlap, or contrast regressions.

## Performance budgets (binding, research section 9)

- Time-to-first-tile (cold WASM + first 3x3 paint): < 2.5 s broadband desktop, < 5 s Moto G.
- R-tree 10k-feature window query p95: < 5 ms (city pack, warm; `dotnet test Benchmark*`, 5 warmup + 50 samples).
- A* median route on city graph: < 50 ms WASM (p95 < 200 ms); histogram in `scoreboard.md` with machine + browser + commit hash.
- WASM bundle (Brotli) + first pack: < 3 MB + < 2 MB.
- Pan/zoom sustained fps: >= 55 fps desktop, >= 30 fps 390px mobile (Playwright traces for UI, xUnit + Stopwatch for headless).
- This gate blocks merge; numbers land in `sextant/docs/scoreboard.md`.

## Milestones (Builder checklist seed, single PR, continuous continue cycles)

- [ ] 0. De-risk: `Sextant.sln` plus `Sextant.Core` skeleton plus one xUnit suite green plus hello-map `dotnet publish` through `ICanvasBridge`; pin TFM + xUnit + workload versions; record fallback decision if needed.
- [ ] 1. Projections + tile math: `Geo` + `Projections` (Mercator + Albers + reprojector) + `TileMath` + control-point goldens + roundtrip fuzz + area-preservation test green.
- [ ] 2. Tile pipeline + packer: `Geometry` (clip/simplify/quantize) + `TileBuilder` + `Sextant.Pack` emitting versioned city pack + determinism + deviation goldens green.
- [ ] 3. Spatial index: `RTree` (R* split + reinsert + STR + condense + Pack) + I1..I7 suite + fuzz-vs-oracle + throughput numbers recorded.
- [ ] 4. Routing + isochrones: `Graph` CSR + `Router` A*/Dijkstra + turn table + `Isochrone` contouring + 1000-pair oracle + histogram recorded.
- [ ] 5. App shell + geocode + IO + docs: Blazor map/search/route/overlay/import UI + Canvas bridge batching + geocode index + PWA offline + GeoJSON import/export + `sextant/docs/` (projections, tile-pipeline, rtree, routing proofs, scoreboard, attribution) + landing link + Playwright pass + full perf gate.
- Current step: Ready for initial build. Next steps: Builder proves Phase 0 on this branch, then implements Phases 1 through 5 in order, updating `progress/286-sextant-gis-engine.md` per phase; single PR across `continue` cycles.

## Explicit v2 deferrals (scope stays closed)

MVT protobuf wire encode/decode, curved labels, rotation/bearing, bidirectional A* (seam only), contraction hierarchies, SIMD `Vector<T>` fast paths, concave-hull isochrone alternative, global Haversine-nearest rerank beyond the documented seam. Each deferred item is documented in user docs as deferred, never half-implemented.

- the Architect
