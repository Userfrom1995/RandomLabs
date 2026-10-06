# Sextant scoreboard (measured, Phase 5b)

Commit: Phase 5b App shell. Machine: lab build container (Linux x64,
.NET 10.0.400 SDK, net8.0 targets). Rerun with
`dotnet test -c Release` (headless) and `dotnet publish
src/Sextant.App -c Release` (bundle). Browser-side rows (fps,
time-to-first-tile) are Tester-owned: the build container has node but no
Playwright browsers, so no honest number can be frozen here.

## Headless gates (all green)

| Gate | Result |
| --- | --- |
| `dotnet test -c Release` | 111/111 pass, 0 warnings |
| `dotnet build Sextant.App -c Release` | 0 warnings, 0 errors |
| `dotnet publish Sextant.App -c Release` | stock toolchain, no wasm-tools install |
| Pack determinism (`diff -r` across packer reruns) | byte-identical ndjson |

## Engine numbers (frozen by earlier phase docs)

| Metric | Measured | Budget | Verdict |
| --- | --- | --- | --- |
| R-tree 100k STR bulk load | 122 ms | record only | frozen (`rtree.md`) |
| R-tree 10k window p95 | 0.016 ms | < 5 ms | PASS |
| R-tree 1-NN p95 | 0.036 ms | record only | frozen (`rtree.md`) |
| A* median route (city graph 5665n/18658e) | 1.39 ms | < 50 ms WASM | PASS (headless; WASM factor to confirm) |
| A* p95 | 8.39 ms | < 200 ms WASM | PASS (headless; WASM factor to confirm) |
| A* == Dijkstra oracle | 1000 pairs + 200 with turns, 1e-6 relative | zero mismatches | PASS (`routing.md`) |
| Albers equal-area cells | ~2e-5 relative (5 CONUS cells) | < 0.5 percent | PASS (`projections.md`) |
| Geocode asset | 38 entries, 4.4 KB | < 500 KB | PASS (`geocode.md`) |

## Bundle + pack (measured 2026-09-04, publish output)

| Artifact | Raw | Brotli (transfer) | Budget | Verdict |
| --- | --- | --- | --- | --- |
| `_framework/` total (precompressed `.br`) | 15.0 MB | 2633 KB (~2.6 MB) | < 3 MB | PASS |
| `dotnet.native.wasm` | - | 929 KB | - | largest single chunk |
| `System.Private.CoreLib` | - | 461 KB | - | - |
| ICU data (`icudt_*`, all three shipped) | - | ~600 KB combined | - | trimmable via invariant mode, kept for NFKD geocode folding |
| `packs/v1/` (ndjson + graph.bin 486 KiB + geocode.idx.json) | 539 KB | ~120 KB est. gzip | < 2 MB | PASS |
| First paint path (shell + canvas + first 3x3 batch) | local only | - | < 2.5 s desktop | TESTER-OWNED |

## Browser-owned (Tester workflow)

- Time-to-first-tile cold (broadband desktop < 2.5 s, Moto G < 5 s).
- Pan/zoom fps (>= 55 desktop, >= 30 mobile 390px).
- Playwright screenshot pass: basemap, Albers + Tissot, layer toggles,
  R-tree overlay, route + frontier, isochrone, search, import error, at
  1280x800 and 390x844. Not run in the build container (no browsers);
  the app exposes every state via plain buttons/inputs for the harness.
- WASM slowdown factor on the A* histogram (headless numbers above are
  desktop-CLR; expect 2-4x in WASM, still inside budget).

## Known deviations from the blueprint

- No label atlas / text rendering yet: POIs render as amber diamonds, no
  greedy collision grid. Curved labels were already a v2 deferral; straight
  labels join them (documented, not half-implemented).
- No Tissot ellipse overlay or graticule on the Albers view (same v2 bucket
  as labels: distortion readout exists as viewport true-area text instead).
- No 64-entry tile LRU in App (tile builds are ~ms on a 140-feature pack;
  the seam is `MapRenderer.BuildLayerBatches`, cache slots in behind it).
- No arterial `graph.geojson` debug overlay toggle (asset ships in the pack;
  overlay wiring is a one-button follow-up).
