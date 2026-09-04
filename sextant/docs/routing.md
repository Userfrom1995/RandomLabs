// S4 routing + isochrones: graph layout, cost semantics, admissibility proofs,
// oracle contracts, contouring method, and frozen measurements.

# Sextant routing and isochrones

Core files: `src/Sextant.Core/Graph.cs` (`RoadGraph`, `TurnTable`,
`RoadGraphBuilder`), `src/Sextant.Core/Routing.cs` (`Router`, `RouteResult`),
`src/Sextant.Core/Isochrone.cs` (`ArrivalGrid`, contour, Chaikin, GeoJSON).
Tests: `tests/Sextant.Core.Tests/RoutingTests.cs`,
`tests/Sextant.Core.Tests/IsochroneTests.cs`,
`tests/Sextant.Core.Tests/RoutingBenchmarks.cs`.

## Graph model

Directed weighted graph in CSR layout. Nodes carry WGS84 lon/lat plus Web
Mercator meters (X east, Y north). Edges are directed with haversine length
(`float32` meters), per-edge max speed (`float32` km/h), and road class.
`RoadGraph.Froms` parallels `Heads` so every edge maps both ways; row offsets
give O(degree) expansion. Single-threaded, immutable after build (same v1
rule as the R-tree).

`graph.bin` (little-endian, version 1): `magic[4]='SXGR'`, `int32 version=1`,
`int32 nodeCount`, `int32 edgeCount`, then per node `float64 lon, lat, x, y`,
then per edge `int32 from, int32 to, float32 lengthM, float32 maxKmh, byte
class`, edges sorted by `(from, to)` for deterministic bytes. The loader
rejects bad magic, unknown versions, implausible counts, dangling node refs,
unknown classes, and trailing bytes, and cross-checks stored planar
coordinates against the Core projection to 1 mm.

## Cost semantics

Primary cost is travel TIME in seconds: `cost(e) = lengthM / (maxKmh / 3.6)`.
Distance mode (`cost = lengthM` meters) is a toggle sharing the code path.
Speed table (research 6.1, tunable in the Phase 5 UI): residential 30,
tertiary 40, secondary 50, primary 60, trunk 80, motorway 100 km/h.

Turn costs run on the implicit expanded state `(node, incomingEdge)`: state 0
is the start (no penalty on the first edge), otherwise state `e+1` arrives via
edge `e`. The penalty (right-hand traffic) is straight (< 20 deg) 0 s, normal
right turn +4 s, left-across-traffic or U-turn (>= 150 deg) +8 s, plus +2 s
when dropping to a lower road class. Headings come from planar Mercator
meters; the sign convention (positive = clockwise = right) is pinned by the
`TurnTable` unit test.

## A* admissibility and consistency (proof sketches, checked by tests)

Time mode: `h(v) = haversine(v, goal) / vmax` with `vmax` the true maximum
edge speed of the graph. No edge is traversable faster than `vmax`, and no
road path is shorter than the great-circle arc, so `h` never overestimates
the remaining time: admissible. Distance mode: `h(v) = haversine(v, goal)`
meters, same argument. Turn penalties only increase true cost, so they
preserve admissibility.

Consistency: edge costs satisfy `cost(u,v) >= |h(u) - h(v)|` by the triangle
inequality on haversine (scaled by `1/vmax` in time mode), and turn penalties
are non-negative, so the expanded-state heuristic `h(node(s))` is monotone:
the first pop of any goal state is optimal and no reopening is needed. The
heap orders `(f, nodeId, stateId)`, so ties replay deterministically.

Dijkstra is the same code path with `h = 0`, which makes the oracle below
self-contained (one implementation, two heuristics).

## Oracle contracts (all binding, all green)

- `Oracle_AStar_Equals_Dijkstra_*`: 1000 seeded pairs each in time and
  distance mode (plus 200 pairs with turn penalties) agree on reachability,
  and costs agree within 1e-6 relative. Any mismatch fails the build.
  A second clause asserts A* expands no more states than Dijkstra.
- `TurnPenalties_Never_Reduce_Optimal_Cost`: `min_P cost_with(P) >=
  min_P cost_without(P)` on 200 pairs, since penalties are non-negative.
- `Unreachable_Returns_NoPath`: disconnected components return
  `Found=false`, empty path, `+Inf` cost, never an exception (all modes,
  with and without turns).
- `FixedPair_Replays_Identical_Path_And_Frontier`: heap tie-breaks are
  deterministic across runs.
- `GraphBin_Roundtrip_Preserves_Routes`: save/load is byte-identical and 50
  seeded routes agree; bad magic, trailing bytes, and truncation are
  rejected.

## City graph (synthetic, license-light)

`RoadGraph.BuildCityGrid(nx=75, ny=75, seed=286)`: 4-connected grid over the
v1 downtown window, every 5th row/column plus a seeded 15 percent promotion
of local streets to tertiary arterials, alternating one-way local streets
(even rows eastbound-only, odd columns northbound-only; cross streets
two-way, so the directed graph is strongly connected: the benchmark routes
200/200 pairs), one diagonal primary avenue stitched into its nearest grid
intersections, and a 40-node diagonal chain that is part of the same
component. Pack asset: 5665 nodes, 18658 directed edges, `graph.bin` 486 KiB,
`graph.geojson` arterials-only overlay 6 KiB. The manifest records
`GraphNodes`/`GraphEdges` (older manifests without them still parse).

## Isochrones

`ComputeArrivals` runs exact time-limited Dijkstra from the source.
`Rasterize` walks every reached edge at half-cell steps with linearly
interpolated arrival; past an unreached head the far value is `tail + one
full edge cost`, which exceeds T by Dijkstra optimality (every path through
that edge costs at least that much), so the contour always cuts the segment
before the unreached node. Cells keep the minimum splat; the bbox is padded
with unreached cells so contours never touch the border and every chain
closes into a ring.

`ContourSegments` is marching squares (inside = value <= T, saddles split by
the center average). Unreached `+Inf` cells substitute `T + 1e6` at contour
time: interpolating against infinity would yield NaN (`-Inf/-Inf` on
straddling edges), and the sentinel lands the crossing within ~1e-6 of a
cell of the reached corner, hugging reached cells tightly. Shared grid-edge
crossings agree to 1 ulp by construction and `BuildRings` hashes endpoints
at millimeter resolution, so adjacent cells always stitch; rings sort by
descending area for deterministic emit.

One Chaikin pass smooths each ring (a 100 m square loses exactly 12.5
percent: 10000 -> 8750, pinned by test), `NestRings` nests them single-level
by containment, and `ToGeoJson` emits WGS84 `Polygon`/`MultiPolygon` with
right-hand-rule winding (outer CCW, holes CW), F7 rounding.

Oracle (`IsochroneTests.Oracle_Contour_Matches_Arrivals_Within_One_Cell`,
30x30 grid, T=30 s, 75 m cells): every node with arrival <= T/2 is inside
the contour, every node with arrival > T lying beyond two cells of any
reached node is outside. Measured: 13 inside-checks + 828 outside-checks,
zero failures. The export test validates the full schema (types, closed
rings, finiteness, winding in lon/lat).

## Measured performance (frozen)

Machine: Linux 6.17 Azure (4 vCPU runner), `dotnet test -c Release`,
net8.0, commit `e6e6702c` (+ Phase 4 work, PR #287).

- City graph: 5665 nodes, 18658 directed edges, build 19 ms, `graph.bin`
  486 KiB.
- A* (time + turn penalties, 200 seeded pairs): reachable 200/200, median
  1.39 ms, p95 8.39 ms (budget: median < 50 ms, p95 < 200 ms).
- Expanded states: median 2513, p95 10094.
- Dijkstra reference (50 pairs): median 1.29 ms, p95 4.26 ms.
- Isochrone oracle (30x30, T=30 s): 48 reached / 892 unreached, 1 ring, 61 ms
  wall including arrival field + raster + contour + oracle checks.

WASMbrowser numbers (time-to-first-tile, fps) belong to the Phase 5
scoreboard; the headless gate above passes with two orders of magnitude of
headroom.

## v2 seams (open, not implemented)

`IBidirectionalFrontier` for bidirectional A* (forward search only in v1),
concave-hull isochrone alternative, global Haversine-nearest rerank beyond
the documented seam. None are half-implemented.
