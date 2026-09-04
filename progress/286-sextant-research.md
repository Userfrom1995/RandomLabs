# Sextant GIS Engine: Research Specification

Issue: #286. Track: C# / Blazor WASM, fully client-side, static hosting at `/sextant/`.
Author: Dr. Mob, the Researcher. Date: 2026-09-04.
Status: research complete, handoff to architect.

## 1. Problem decomposition

Sextant must implement, from scratch in C#, five subsystems with zero backend:

| # | Subsystem | Headless core? | UI surface |
|---|-----------|----------------|------------|
| S1 | Map projections (forward + inverse) | yes, pure math | projection switcher |
| S2 | Vector tile pipeline (tile math, clip, simplify, style, render) | yes, minus Canvas | pan/zoom/layer toggles |
| S3 | R-tree spatial index (window + nearest) | yes | inspectable overlay |
| S4 | Routing: A* + turn costs + isochrones | yes | route + frontier + isochrone overlays |
| S5 | Geocoding + offline packs + GeoJSON IO | yes, minus Cache API | search box, import/export, PWA |

Binding architectural decision (research recommendation): isolate a dependency-free
headless core `Sextant.Core` (netstandard2.0 or net8.0 class library, no JS, no Blazor,
no browser APIs, deterministic, seeded RNG only) from the `Sextant.App` Blazor shell
(rendering via Canvas2D JS interop, Geolocation, Cache Storage, file pickers).
Every acceptance gate that says "deterministic headless core" maps to `Sextant.Core`
covered by `dotnet test` (xUnit). The Tester can then run the full algorithmic suite
without a browser, and Playwright only gates pixels.

## 2. Geodetic foundation and constants

Use WGS84 throughout as the reference datum:

```
a  = 6378137.0            (semi-major axis, m)
f  = 1 / 298.257223563    (flattening)
b  = a * (1 - f)          (semi-minor axis)
e2 = 2f - f^2             (first eccentricity squared, ~0.00669438)
R  = 6378137.0            (spherical authalic radius used by Web Mercator)
```

Input coordinates are (lon, lat) in degrees, lon in [-180, 180], lat in [-90, 90].
All forward projections clamp latitude to their valid domain and return a
`ProjectionResult { X, Y (meters), Valid : bool }` rather than throwing, so the
tile pipeline can clip gracefully at domain edges. All inverse projections return
`(lon, lat)` in degrees with `Valid` flag.

Precision rule: all math in `double` (float only at the final Canvas vertex upload).
Roundtrip gate: forward(inverse(p)) within 1e-9 degrees for in-domain points.

## 3. S1: Projections

### 3.1 P1: Web Mercator (EPSG:3857, spherical form) - default basemap

This is the de facto web tile standard and the only projection in which the
slippy-map tile scheme is square and seamless. Use the spherical equations
(Snyder / EPSG guidance note 7-2), which is what OSM/Google/Bing use:

Forward (lonDeg, latDeg), first clamp lat to [-85.05112878, 85.05112878]:

```
lonRad = deg2rad(lonDeg)
latRad = deg2rad(latDeg)
x = R * lonRad
y = R * ln(tan(PI/4 + latRad/2))
```

Inverse:

```
lonDeg = deg2radInv(x / R)
latDeg = deg2radInv(2 * atan(exp(y / R)) - PI/2)
```

Properties to document in `sextant/docs/projections.md`: conformal (preserves local
angles, hence shapes look right when zoomed), NOT equal-area and NOT equidistant;
area inflation factor = 1/cos^2(lat) (k^2 where k = 1/cos(lat) is the point scale).
Greenland vs Africa distortion is the canonical demo: the sample map should include
a scale-bar + "true area" readout toggle that computes geodesic area (Karney/Chamberlain
spherical excess approximation is sufficient) so users see the distortion.

Slippy-map tile math (defines S2 addressing):

```
n = 2^z
xtile = floor((lonDeg + 180) / 360 * n)
ytile = floor((1 - ln(tan(latRad) + 1/cos(latRad)) / PI) / 2 * n)
lonWest  = xtile / n * 360 - 180
latNorth = rad2deg(atan(sinh(PI * (1 - 2 * ytile / n))))
```

z range: 0..19 UI (data bundled to z14, overzoom beyond, see S2).

### 3.2 P2: Albers Equal-Area Conic (spherical form, Snyder 14-18) - second projection

Satisfies the "at least one equal-area/conic" binding gate and gives the honest-areas
comparison view. Recommend the spherical Albers (not ellipsoidal) for v1: closed form,
invertible in a few lines, maximum error vs ellipsoidal under ~0.1 percent for a
country-scale demo, and exactly equal-area by construction on the sphere, which is
what the unit tests assert (area preservation, not millimeter geodetics).

Parameters (configurable, defaults = CONUS USGS triplet):

```
phi1 = 29.5 deg, phi2 = 45.5 deg (standard parallels)
phi0 = 23.0 deg (origin latitude), lambda0 = -96.0 deg (central meridian)
```

Forward (Snyder, spherical, R = 6378137):

```
n    = (sin(phi1) + sin(phi2)) / 2
C    = cos(phi1)^2 + 2*n*sin(phi1)
rho0 = sqrt(C - 2*n*sin(phi0)) / n
theta   = n * (lambda - lambda0)          (radians)
rho     = sqrt(C - 2*n*sin(phi)) / n
x = R * rho * sin(theta)
y = R * (rho0 - rho * cos(theta))
```

Inverse:

```
rho0 as above
rho   = sqrt(x^2 + (rho0 - y/R... careful: x,y already in meters, so X=x/R, Y=y/R)
        rho = sqrt(X^2 + (rho0 - Y)^2), with sign: if n < 0 negate
theta = atan2(X, rho0 - Y)
lambda = lambda0 + theta / n
phi    = asin((C - (rho*n)^2) / (2*n))     (guard argument to [-1,1])
```

Domain: valid for phi in [-89, 89] excluding the pole singularity handling
(rho -> 0 near pole when n small; guard division). Standard parallels must satisfy
phi1 != -phi2 (n != 0); validate at construction and throw `ArgumentException`
otherwise. Equal-area property test: project a set of reference polygons
(e.g. 1x1 degree cells at several latitudes), compute planar shoelace area,
assert ratio equals cos-weighted spherical area within 0.5 percent.

UI behavior: projection switch re-projects cached tile geometries on the fly
(Core provides pure `Reproject(Polygon, src, dst)`; App keeps WGS84 source of
truth and only caches projected vertices per projection id). P2 view does NOT use
slippy tiles (tiles are Mercator-addressed); instead it renders the same WGS84
feature set through the Albers forward map with graticule + distortion ellipses
(Tissot indicatrix at graticule intersections). This is honest cartography and
avoids re-tiling in a second projection.

### 3.3 Control points (binding verification set)

Ship `Sextant.Core.Tests/ProjectionControlPoints.cs` with:

Web Mercator (R=6378137, spherical):

| lon | lat | x (m) | y (m) |
|-----|-----|-------|-------|
| 0 | 0 | 0 | 0 |
| -73.9857 | 40.7484 (NYC) | -8236050.45 | 4975301.25 (tol 1.0 m) |
| 13.4050 | 52.5200 (Berlin) | 1492200.0 approx | 6894699.0 approx (tol 1.0 m) |
| 0 | 85.05112878 | 0 | 20037508.34 (tol 0.01 m) |
| 180 | 0 | 20037508.34 | 0 |

(Exact expected values to be frozen by computing with the implemented formula at
double precision and cross-checking against `pyproj`/PROJ `EPSG:3857` to tol 1e-3 m;
the NYC/Berlin rows above are approximate and the test must use the PROJ-verified
constants, not these approximations.)

Albers CONUS triplet: verify (a) origin maps to (0,0); (b) standard parallels have
zero scale error along parallel (point scale = 1 to 1e-12); (c) roundtrip 10k random
points max error < 1e-9 deg; (d) equal-area cell test per 3.2.

Reference oracle: PROJ (`cs2cs EPSG:4326 EPSG:3857`, Albers via
`+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +datum=WGS84`) run once
offline; checked-in CSV becomes the golden file. No network at test time.

## 4. S2: Vector tile pipeline (self-rendered, no API passthrough)

Binding: tiles must be computed and drawn by Sextant code, not proxied raster/PBF
from a vendor. Data source: OSM-derived sample extracts (city-scale, e.g. a ~10x10 km
downtown window plus a regional window) converted OFFLINE by maintainer tooling into
bundled static assets; the client only clips/styles/renders.

### 4.1 Recommended asset format (keeps "self-rendered" honest and cheap)

- Authoritative client asset: newline-delimited GeoJSON features (one file per layer:
  roads, buildings, water, landuse, POIs) in WGS84, pre-simplified at two tolerances
  (base + ultra), gzip/Brotli compressed by the Pages build.
- Runtime tile: computed in memory per (z,x,y) by `TileBuilder.BuildTile(z,x,y)`:
  select candidate features via R-tree window query on WGS84 bboxes, clip to tile
  bounds (Sutherland-Hodgman per polygon ring; Cohen-Sutherland/Liang-Barsky per
  polyline segment; point-in-tile test for points), simplify per zoom, quantize to
  4096 extent integers, emit `Tile { Layers: Layer { Name, Features: QGeom[] } }`.
- Do NOT implement full Mapbox Vector Tile protobuf encode/decode on the wire in v1
  (waste of budget, no interop need since producer and consumer are both Sextant).
  Keep an MVT-compatible extent/quantize convention so a future MVT decoder can slot
  in, and document the wire-equivalence in `tile-pipeline.md`.

### 4.2 Per-zoom simplification

Douglas-Peucker with per-zoom tolerance in tile-extent units, plus a radial-distance
pre-pass (the standard Mapbox `simplify-js` combination):

```
tol(z) = 4096 / 2^(zClipExtra) style constant; practical: base 1.2px at target zoom
z<=10: tol ~ 8 extent units; z 11..13: ~4; z>=14: ~1.5 (keep full detail)
```

Complexity O(n log n) average. Gate: simplified geometry Hausdorff deviation < 0.5 px
at its target zoom; vertex reduction ratio published on scoreboard.

### 4.3 Rendering (Blazor WASM + Canvas2D interop)

C# owns scene graph + style cascade; JS owns only `CanvasRenderingContext2D` draw
calls via a minimal `canvasInterop.js` (path batching: one `beginPath` per layer,
fill/stroke per feature batch, text via offscreen label atlas). Frame pipeline:

```
state(view center, zoom float, bearing 0 v1, projection id, layer vis, style)
 -> visible tile range (3x3 to 5x5 at fractional zoom, overzoom scale = 2^(zFloat-zInt))
 -> per tile: get-or-build Tile (LRU cache 64 tiles) -> project -> style match -> batch
 -> draw order: landuse fill, water fill, buildings fill, road casing, road fill, labels
 -> overlays: R-tree MBRs (debug), A* frontier (animated), isochrone fill, route line
```

Style: small JSON (MapLibre-subset: `fill-color`, `line-color`, `line-width` with
zoom stops, `text-field`, `minzoom/maxzoom`). C# matcher, no JS style logic.

Label placement v1: greedy collision grid (tile-local 256-cell bitmap, priority by
layer rank + name length), no curved labels; document as known limitation.

Frame budget: 16.6 ms at 60fps pan on desktop for <=9 tiles; WASM Canvas interop
batching is the risk (per-call marshaling cost), hence batch paths per layer and
avoid per-vertex interop (pass Float32Array buffers). Fallback: prerender static
layers to offscreen canvas, redraw only overlays during animation.

## 5. S3: R-tree spatial index

### 5.1 Choice: R*-tree with STR bulk load (state of the art for static + dynamic mix)

- Structure: height-balanced tree, node capacity M (default 32), minimum m = 40% of M
  (m=13 at M=32; classic Guttman m in [30%,50%]; R* paper uses m=40%).
- Split: R* topological split (minimize overlap, then area, then margin) for
  incremental inserts; quadratic Guttman split as documented fallback if R* split
  proves too slow in WASM (measure; keep both behind `ISplitStrategy`).
- Reinsertion (the R* signature): on overflow, remove p=30% farthest-from-centroid
  entries and reinsert at same level (one reinsert per level per insert to bound
  recursion). This is what gives R* its superior query times on real cartographic
  data (rectangles with high overlap: buildings, road segments).
- Bulk load: Sort-Tile-Recursive (STR) for the initial pack import (O(n log n),
  near-100% fill, minimal overlap). All bundled packs ship STR-packed; dynamic
  user-imported GeoJSON inserts incrementally on top.
- Underflow on delete: condense (Guttman delete with reinsertion of orphaned
  entries); document that Sextant v1 supports delete but does not merge-defragment,
  with a `Pack()` maintenance call that rebuilds via STR.

### 5.2 Invariants (must hold after every mutating op; each gets a unit test + fuzzer)

```
I1  MBR containment: every entry rect is contained in its parent MBR (exact double compare with +0ulp tolerance only).
I2  Fill: every non-root node holds in [m, M] entries; root holds in [2, M] unless tree has <2 entries total.
I3  Balance: all leaves at identical depth (assert via max/min leaf depth walk).
I4  No degenerate rects: min <= max on both axes; NaN/Infinity rejected at insert with ArgumentException.
I5  Area monotonicity: parent MBR area >= each child entry area.
I6  Search completeness: window query returns exactly the brute-force result set (oracle test on random data).
I7  Nearest correctness: k-NN returns the true k nearest by Euclidean distance in query CRS (brute-force oracle).
```

Distances are computed in the query CRS plane (Mercator meters at city scale is
fine; document that global nearest uses Haversine shortlist refine: coarse planar
filter then exact great-circle rerank of top 4k).

### 5.3 Algorithms and complexity

- Insert: choose-subtree minimizing overlap enlargement (R*) then area enlargement,
  O(log n) average, O(n) pathological. Split cost O(M^2) quadratic / O(M log M) R*.
- Window query: DFS with MBR intersection prune, O(log n + k) average where k =
  result size; worst O(n) (adversarial overlap) - the fuzzer measures, not hides.
- k-NN: best-first branch-and-bound (Hjaltason-Samet) with MinDist/MinMaxDist
  pruning via priority queue, O(k log n) average.
- STR bulk load: sort by x, slice into ceil(sqrt(n/M)) vertical strips, sort each by
  y, pack M per node, recurse; O(n log n).

Pseudocode (insert core, Guttman with R* hooks):

```
Insert(entry):
  leaf = ChooseSubtree(root, entry, level=leaf)
  leaf.entries.add(entry); AdjustMBRsUp(leaf)
  if leaf.count > M: SplitOrReinsert(leaf)   // R*: reinsert once per level else split
ChooseSubtree(node, entry, targetLevel):
  while node.level > targetLevel:
    if node is directory: pick child minimizing overlapEnlargement, tie-break areaEnlargement then area
    else: pick child minimizing areaEnlargement
    node = child
Split(node): R* topological split on best axis by margin-sum, then best cut by overlap then area
```

Throughput gates (published): bulk-load 100k segments < 2 s desktop WASM;
10k-feature window query p95 < 5 ms; 1-NN p95 < 1 ms (city pack, warm).

WASM note: single-threaded, no locks in v1; all structures non-concurrent with
`InvalidOperationException` on concurrent-modification detection (version stamp).
SIMD (Vector<T>) only as later optimization, never in v1 critical path.

## 6. S4: Routing (A* over bundled road graph + isochrones)

### 6.1 Graph model

Directed (or bidirectional-flagged) weighted graph from OSM sample:

```
Node { Id, Lon, Lat, X, Y (projected meters, Mercator local) }
Edge { From, To, LengthM (haversine of endpoints or polyline length), MaxKmh,
       OneWay bool, RoadClass, CostS = LengthM / (MaxKmh/3.6) + turnPenalty applied at expansion }
```

Bundled graph: one city network (target 5k-20k nodes, 10k-50k directed edges;
e.g. downtown Portland/Seattle-style grid + arterials). Preprocessed offline into a
compact static asset (`graph.bin`: node table Float64 x/y + adjacency CSR int32 +
edge weights Float32) plus `graph.geojson` for the debug overlay. CSR keeps WASM
memory flat and cache-friendly. Speeds by road class (residential 30, tertiary 40,
secondary 50, primary 60, trunk 80, motorway 100 km/h) documented and tunable in UI.

Weight semantics: primary cost = travel TIME seconds (admissible heuristic stays
clean); distance mode offered as toggle (cost = meters, heuristic = straight-line
meters).

### 6.2 A* with admissibility proof obligation

Heuristic (time mode): `h(v) = haversine(v, goal) / vmax` where vmax = maximum speed
over all edges (or the class max, e.g. 130 km/h). Since no edge can be traversed
faster than vmax, h never overestimates true remaining time: admissible. Since
haversine satisfies the triangle inequality and edge weights are >= straight-line
time at vmax, h is also consistent (monotone), so A* with a closed set never needs
reopening and returns optimal paths. Distance mode: `h(v) = haversine(v, goal)` in
meters, same argument. Both claims get proof sketches in `sextant/docs/routing.md`
plus the executable oracle below (proofs are checked by tests, not just prose).

Required oracle test: on 1000 random (origin, destination) pairs, `AStar(o,d) ==
Dijkstra(o,d)` cost within 1e-6 relative; any mismatch fails the build. Dijkstra is
the same code path with h=0, so this is a self-contained oracle.

Turn costs: expanded-state graph. State = (node, incomingEdge). Cost of transition
u -e1-> v -e2-> w includes `turnPenalty(angle(e1,e2), classChange)`: 0 s straight,
+4 s normal turn, +8 s left across traffic / U-turn, +2 s class downgrade. A* runs
on the expanded graph implicitly (neighbor expansion knows incoming edge); heuristic
still admissible (penalties only increase true cost). Keep penalty table tiny and
documented; UI toggle "penalize turns".

Bidirectional Dijkstra/A* as documented stretch option if single-direction A* misses
the perf gate on the 20k-node graph; v1 ships forward A* + Dijkstra oracle, code
structured so bidirectional is a drop-in (`IBidirectionalFrontier` seam).

Pseudocode:

```
AStar(origin, goal, h):
  gScore = map(default Inf); gScore[originState] = 0
  open = min-heap keyed f = g + h(node, goal)
  push originState; closed = set
  while open not empty:
    s = pop-min; if s.node == goal: return Reconstruct(s)
    if s in closed: continue; add s
    for t in Expand(s):   // outgoing edges + turn penalty from s.incoming
      ng = gScore[s] + cost(s,t)
      if ng < gScore.get(t, Inf): gScore[t]=ng; parent[t]=s; push(t, ng + h(t.node, goal))
  return NoPath
```

Complexity: O((V+E) log V) worst; near-goal-directed on road networks with good h.
Perf gate: median random route on bundled city graph < 50 ms WASM, p95 < 200 ms;
publish histogram on scoreboard.

Frontier animation: record closed-set insertion order (cap 20k points) and replay as
expanding dots overlay; deterministic given fixed (o, d) since heap tie-breaks by
node id (document: `PriorityQueue` comparator = (f, nodeId)).

### 6.3 Isochrones (reachability polygons)

Exact road-graph polygon extraction is ill-posed; recommended v1 method (standard
practice, e.g. Valhalla/Mapbox): time-limited Dijkstra from source (cutoff T minutes)
yields per-node arrival times; rasterize onto a local grid (cell 50-100 m over the
bounding box of reached nodes, value = min arrival of nearby reached edges via
segment rasterization), then extract the T-contour with marching squares, smooth
with one Chaikin pass, emit GeoJSON Polygon/MultiPolygon. Deterministic, testable
(oracle: contour contains exactly the nodes with arrival <= T up to one cell tolerance;
no unreachable far node inside without a reached path), exportable (binding gate).
Alternative documented: concave hull (alpha shape) over reached points; keep as
stretch if marching-squares contours look blobby on cul-de-sac networks.

## 7. S5: Geocoding, offline, import/export

- Geocoding index over bundled names (street names, POIs, suburbs): offline-built
  trigram inverted index (`tri -> sorted int[] featureIds`, CSR-serialized) + prefix
  trie for autocomplete (top-8, debounce 150 ms, diacritic-folded lowercase,
  `normalize: NFKD strip marks`). Ranking: `score = 2*exactPrefixBonus +
  trigramOverlap/len + classWeight(POI > street > suburb) + popWeight`. Gate:
  top-1 hit for 50 curated queries; index asset < 500 KB for city pack.
- Offline: PWA service worker caching app shell + packs (`CacheFirst` for immutable
  versioned assets, `StaleWhileRevalidate` for docs); "offline-ready" badge + bytes
  counter in UI. All fetches same-origin (binding: no tile CDN, no fonts CDN).
- GeoJSON import: drag-drop/FilePicker -> parse in C# (System.Text.Json, no JS dep)
  -> validate (right-hand rule normalize, antimeridian note) -> insert into live
  R-tree + render; error states for malformed JSON enumerated in spec appendix.
- Isochrone/route export: download GeoJSON via Blob interop; filename
  `sextant-route-<utc>.geojson`.

## 8. Headless test plan (binding gates for the Architect's test matrix)

```
Core.Tests/ProjectionTests.cs      roundtrip fuzz 10k pts; control-point goldens; Albers area preservation
Core.Tests/TileBuilderTests.cs     clip/simplify/quantize goldens; overzoom scale identity; determinism (same bytes twice)
Core.Tests/RTreeTests.cs           I1..I7 invariant suite; STR vs incremental equivalence; 1k-op fuzz vs brute force oracle
Core.Tests/RoutingTests.cs         A* == Dijkstra on 1000 pairs; turn-penalty admissibility (cost >= no-penalty cost);
                                   unreachable returns NoPath (not exception); heap tie-break determinism
Core.Tests/GeocodeTests.cs         50 curated queries top-k recall; fold/diacritics cases
Core.Tests/ImportExportTests.cs    GeoJSON roundtrip incl. polygon winding + isochrone export schema validation
```

Fuzz RNG: fixed seed (`Random(286)`), no wall-clock, no parallelism nondeterminism.

## 9. Performance scoreboard (schema the Builder must publish in sextant/docs/)

```
metric: time-to-first-tile (cold WASM load + first 3x3 paint)      budget: < 2.5 s broadband desktop, < 5 s Moto G
metric: R-tree 10k-feature window query p95                        budget: < 5 ms
metric: A* median route on city graph                              budget: < 50 ms (p95 < 200 ms)
metric: WASM bundle (Brotli) + first pack                          budget: < 3 MB + < 2 MB
metric: pan/zoom sustained fps                                     budget: >= 55 fps desktop, >= 30 fps 390px mobile
```

Method: Tester measures headless metrics with `dotnet test Benchmark*` (xUnit +
Stopwatch, 5 warmup + 50 samples) and UI metrics with Playwright traces; numbers
land in `sextant/docs/scoreboard.md` with machine + browser + commit hash.

## 10. Risks and explicit architect guidance

1. Blazor WASM Canvas interop marshaling is the top perf risk. Mitigation is
   structural: chunky typed-array batches per layer, offscreen static-layer cache,
   capped overlay point counts. Architect must put ALL JS behind `ICanvasBridge`
   so headless tests substitute a null recorder.
2. Do NOT attempt MVT protobuf, curved labels, rotation/bearing, or CH/contraction
   hierarchies in v1: each is a documented non-goal with a seam left open.
3. Bundle size: NativeAOT vs stock Blazor WASM decision belongs to Architect;
   research constraint is only "static files, Brotli, budgets above".
4. Data licensing: OSM sample extracts require ODbL attribution chip in UI
   (binding legal note) plus `sextant/docs/ATTRIBUTION.md`.
5. Second projection rendering (Albers) reuses WGS84 source of truth; never store
   dual-projected caches beyond one LRU generation (memory).

## 11. References (for Architect/Builder deep dives)

- Snyder, J.P. Map Projections: A Working Manual (USGS PP 1395): Mercator (p.38),
  Albers Equal-Area Conic (p.98). Forward/inverse equations above follow Snyder.
- Guttman, A. R-Trees: A Dynamic Index Structure for Spatial Searching (1984):
  choose-leaf/split/condense baseline.
- Beckmann et al. The R*-tree: An Efficient and Robust Access Method (1990):
  forced reinsert + overlap-minimal split adopted here.
- Leutenegger et al. STR: A Simple and Efficient Algorithm for R-Tree Packing (1997).
- Hjaltason + Samet. Distance Browsing in Spatial Databases (1999): best-first k-NN.
- Hart, Nilsson, Raphael. A Formal Basis for the Heuristic Determination of Minimum
  Cost Paths (1968): A* optimality under admissibility/consistency.
- Douglas + Peucker (1973) line simplification; marching squares (Lorensen/Cline
  lineage) for contouring; Chaikin (1974) corner cutting.
- OSM ODbL + slippy-map tile naming (OSM wiki) for tile addressing compatibility.

Handoff: architect owns module boundaries (`Sextant.Core` vs `Sextant.App`,
`ICanvasBridge`, asset pipeline, test matrix, perf budgets). Research questions for
routing/tile/index/projection math are closed by this spec; reopen via new issue if
Builder hits a contradiction with measured data.

 - Dr. Mob, the Researcher
