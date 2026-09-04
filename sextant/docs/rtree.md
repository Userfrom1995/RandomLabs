# Sextant R*-tree spatial index (Phase 3 record)

Implementation: `sextant/src/Sextant.Core/RTree.cs`.
Tests: `sextant/tests/Sextant.Core.Tests/RTreeTests.cs` plus
`RTreeBenchmarks.cs`. Research binding: spec section 5; blueprint `RTree`
row (M=32, m=13, p=30% reinsert, `ISplitStrategy` seam, STR bulk load,
Guttman condense + `Pack()`, Hjaltason-Samet best-first k-NN,
version-stamp guard, NaN rejection).

## Parameters

- Node capacity M = 32, minimum fill m = 13 (Guttman 40% band).
- Reinsertion: on overflow, the p = 30% farthest-from-centroid entries
  (9 at M=32) are removed and reinserted at the same level; at most one
  reinsert per level per top-level insert, else split. Keeps at least m
  entries in the node by construction.
- Split seam `ISplitStrategy.Split(rects) -> (group1, group2)` over index
  arrays, deterministic for the same input order. Default `RStarSplit`
  (axis by margin-sum, cut by overlap then area-sum, fill-honoring
  distributions m..M-m+1); fallback `QuadraticSplit` (Guttman dead-space
  seeds, enlargement assignment, tail fill rule). Both honor m: split
  requires n >= 2m (ctor enforces 2m <= M+1, overflow always presents
  exactly M+1 rects).
- Bulk load: Sort-Tile-Recursive. Sort by center-X into
  ceil(sqrt(ceil(n/M))) vertical slices, sort each slice by center-Y,
  even-split into groups of at most M (even split keeps every group
  within one of the mean, and the mean never drops below m given
  2m <= M+1). Recurse on node MBRs for upper levels.
- Delete: exact (rect, value) match, Guttman condense (underfilled nodes
  dissolved, orphans reinserted at their own level), single-child root
  collapse. `Pack()` rebuilds the whole tree via STR (maintenance after
  heavy deletes; query results identical before/after, proven by test).

## Invariants (each checked by `CheckInvariants()` after every mutating op)

- I1 MBR containment: node MBR equals the exact union of its entries;
  every directory slot rect equals its child MBR exactly (min/max of the
  same doubles, so exact compare is sound).
- I2 Fill: non-root nodes hold [m, M]; directory roots hold [2, M];
  a lone leaf root holds [0, M].
- I3 Balance: all leaves at depth == root level.
- I4 No degenerate rects: min <= max on both axes; NaN/Infinity rejected
  in the `Rect` ctor and at every query entry point (`ArgumentException`).
- I5 Area monotonicity: parent MBR area >= each child entry area
  (exact: union spans dominate per axis, multiplication is monotone).
- I6 Search completeness: window query returns exactly the brute-force
  set (100-query oracle gate on 2000 entries; 200-query STR-vs-incremental
  gate on 5000; 20-query checks every 100 ops of the 1k-op fuzz).
- I7 Nearest correctness: k-NN returns k distinct ids whose distances
  match the true top-k distances exactly, nearest-first. Compared by
  distance multiset, not id order: exact ties (e.g. a query point inside
  several overlapping rects, MinDist 0 to each) admit multiple valid
  answers, and the oracle accepts any of them.

Distances are planar in the query CRS (`Rect.MinDist`, shared by tree and
oracle; the search proof is about traversal, not the metric). Global
Haversine shortlist-rerank stays a documented seam (v1 truth is city-scale
planar, per blueprint).

## Fuzz method

`Fuzz_MixedOpsMatchOracleAndHoldInvariants`: seeded `Random(286)`,
1000 mixed insert (60%) / delete ops against a `Dictionary<int, Rect>`
oracle; every 100 ops asserts `CheckInvariants() == null`, count parity,
20 window queries and 5 k-NN queries vs the oracle. Deterministic:
same seed replays the same op stream and the same tree.

## Measured throughput (2026-09-04, linux x86_64, .NET 10.0.400 SDK running net8.0, commit e8ed2dfc base)

| Metric | Measured | Budget |
|---|---|---|
| Bulk-load 100k segments (STR) | 122 ms | < 2000 ms |
| 10k-feature window query p95 (5 warmup + 50 samples) | 0.016 ms | < 5 ms |
| 10k-feature 1-NN query p95 (5 warmup + 50 samples) | 0.036 ms | < 1 ms |
| Tree shape @100k | depth 3, 3241 nodes | - |
| Tree shape @10k | depth 2 | - |

Headless server numbers; WASM-browser numbers land in
`sextant/docs/scoreboard.md` in Phase 5 (Tester measures). The xUnit
benchmark asserts loose CI-safe ceilings (60 s / 100 ms / 50 ms) so the
gate never flakes; the table above is the frozen record.

## Concurrency and determinism notes

- Single-threaded, no locks. Mutating inside a visitor query throws
  `InvalidOperationException` (version stamp checked per node and per
  emission); proven by test for both `Window` and `Nearest`.
- Deterministic given the same op order: overlap/area tie-breaks prefer
  the lowest slot index, sorts carry index tie-breaks, heap priorities
  carry a sequence number. STR-vs-incremental query equivalence is gated
  (same result sets for 200 windows + 50 k-NN on 5000 entries), though
  internal structure may differ.

## Deferred (v2, per blueprint)

MVT protobuf wire, `Vector<T>` fast paths, bidirectional search seam
(unrelated to this index), global Haversine rerank beyond the seam.
