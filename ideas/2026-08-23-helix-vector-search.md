# Helix: a from-scratch vector search engine in Go

- **Date:** 2026-08-23
- **Issue:** #128
- **Branch:** opencode/issue128-20260823131639
- **Language:** Go (single statically compiled binary) + static Pages dashboard
- **Category:** Approximate nearest-neighbor (ANN) search engine / information retrieval
- **Researcher spec:** `docs/research/issue-128-helix-vector-search.md`

## What it is

Helix is an ANN search engine built from scratch in Go. It combines two textbook
primitives: a Hierarchical Navigable Small World (HNSW) graph for sub-linear
nearest-neighbor lookup, and Product Quantization (PQ / OPQ) for compressed
storage with asymmetric distance computation. It exposes a small deterministic
REST API to insert, delete, and query vectors, plus a static web dashboard where
uploaded/pasted embeddings are projected to 2D and nearest neighbors "light up"
as the user drags a recall (`efSearch`) slider.

This blueprint takes the Researcher's algorithmic specification and turns it into
a concrete Go module layout, public types, and a deterministic headless API the
Builder implements and the Tester exercises.

## Why it fits

Vector search is the substrate under modern retrieval, RAG, and recommendation.
Helix makes every layer of it tangible and teachable: probabilistic skip-list
layer assignment, best-first beam search with `ef`, the diversity neighbor
heuristic, deterministic k-means codebooks, OPQ rotation, ADC distance tables,
and the recall-vs-latency tradeoff surfaced live. It is a fresh category (ANN
engine) and a fresh language (Go) for the factory, with zero required third-party
dependencies so it compiles cleanly and tests fast.

## Design priorities (from the mandate)

1. Search correctness / recall fidelity first.
2. Determinism (reproducible headless tests).
3. Memory footprint (PQ/OPQ compression).
4. Latency (last; never at the expense of correctness).

## Tech stack & libraries

- **Language:** Go 1.22+, standard library only for the core engine (`math`,
  `sort`, `encoding/json`, `net/http`, `flag`/`os`). No third-party modules
  required for v1. This keeps the build reproducible and the determinism contract
  airtight (no hidden map iteration or nondeterministic scheduler in the hot
  path).
- **Optional test/CLI niceties:** `go test` native benchmarks; no external test
  framework. A tiny hand-rolled min/max heap (no `container/heap` dependence in
  the hot loop is fine, but `container/heap` is allowed).
- **Frontend:** dependency-free ES module JavaScript + Canvas 2D. No bundler, no
  framework. Talks to the REST API over `fetch`.
- **Hosting:** static GitHub Pages at `/helix/index.html` (the UI), plus a single
  `helix serve` binary the user runs locally to back it with the API. A prebuilt
  demo index JSON is committed so the page also shows something with no server.

## Module hierarchy

All engine code lives under one Go module rooted at `helix/` so the static site
path `/helix/` maps cleanly to both the UI and the source tree. The module path
is `github.com/Userfrom1995/RandomLabs/helix`.

```
helix/
  go.mod
  cmd/helix/main.go            # CLI: build / search / serve / bench
  internal/
    core/
      vector.go                # Vector type, L2 / IP / cosine, normalize, finite check
      rng.go                   # seeded PCG64 RNG (no math/rand global, no time)
      heap.go                  # min/max float heaps for searchLayer + result set
      matrix.go                # tiny DxD ops for OPQ rotation + PCA
    hnsw/
      node.go                  # Node, neighbor slices (sorted by id)
      graph.go                 # Graph, layer assignment, insert, searchLayer,
                               #   selectNeighborsHeuristic, lazy delete, shrink
    pq/
      pq.go                    # PQ/OPQ struct, encode, buildDistanceTable (ADC)
      kmeans.go                # deterministic Lloyd + k-means++ seeded init
      opq.go                   # rotation training (minimize reconstruction error)
    index/
      index.go                 # Index coupling; Build(seed, items), Search(...)
      projection.go            # 2D random-Gaussian + PCA projection
      serialize.go             # JSON index load/save (v1 format)
  api/
    server.go                  # http.Server wiring, routes
    handlers.go                # the 6 REST handlers (Section 6)
  ui/
    index.html                 # dashboard: canvas + controls + side panel
    helix.js                   # API client + projection render + interaction
    helix.css                  # dark theme, glow styling for lit neighbors
    data/demo.json             # prebuilt demo index (points + projection)
  README.md                    # usage, build, API reference
```

Decoupling rules (hard):
- `core` depends on nothing inside the module. It is pure math + RNG + heaps.
- `hnsw` depends only on `core`. It never imports `pq` or `index`.
- `pq` depends only on `core`.
- `index` depends on `core`, `hnsw`, `pq`. It owns the `dist` callback closure
  (exact vs ADC) and the projection. This is the only place the two algorithms
  couple, exactly as the Researcher's Mode A / Mode B switch requires.
- `api` depends on `index` (and `core`). It never reaches into `hnsw`/`pq`
  directly.
- `cmd/helix` wires `index` + `api` for the CLI.

## Public types (Go)

These are the contract the Builder implements; they mirror the Researcher's
Section 9 plus the headless API from Section 8/14.

```go
// core
type Vector []float32
type Metric int
const (
    MetricL2 Metric = iota
    MetricIP
    MetricCosine
)

// index
type Item struct {            // input record
    ID   uint64
    Vec  []float32
    Meta map[string]any
}
type Entry struct {           // stored record
    ID   uint64
    Vec  []float32           // nil in pure-PQ mode
    Code []byte              // len == PqM in PQ mode, else nil
    Meta map[string]any
}
type SearchResult struct {
    ID       uint64
    Distance float32
    Meta     map[string]any
}
type SearchResponse struct {
    Results  []SearchResult
    Visited  int      // nodes traversed (diagnostic, the "visited" field)
    Mode     string   // "exact" | "pq"
}

type Options struct {
    Dim            int
    M              int   // base-layer connections
    Mmax           int   // cap for layers >= 1 (usually == M)
    Mmax0          int   // cap for layer 0 (usually == 2*M)
    EfConstruction int
    Metric         Metric
    Seed           uint64

    PqEnabled bool
    PqM       int    // subspaces; MUST divide Dim (e.g. D=128 -> 4/8/16/32)
    PqK       int    // codebook size, 256
    Opq       bool   // rotate before split (default true when PqEnabled)
    PqRerank  bool   // exact rerank of top-k (default true)
}

type Index struct {
    Dim     int
    Graph   *hnsw.Graph
    PQ      *pq.PQ        // nil if PqEnabled == false
    Proj    [2]core.Vector // 2D projection basis (random or PCA)
    Opts    Options
    Count   int
    // internal: payload store id -> Entry
}

// headless, deterministic API (used by server AND by Go tests)
func Build(opts Options, items []Item) (*Index, error)
func Search(idx *Index, q []float32, k, ef int, mode string) (*SearchResponse, error)

// projection payload for the dashboard
func (idx *Index) Projection() []ProjectedPoint
type ProjectedPoint struct {
    ID  uint64
    X, Y float32
    Meta map[string]any
}
```

`mode` is `"exact"` (Mode A: full float32) or `"pq"` (Mode B: ADC against codes,
with optional exact rerank of the top-k). `ef` of 0 means "use the index default"
(any build-time `efSearch` default, e.g. `max(efConstruction, k*16)`); a non-zero
`ef` overrides it (this is the live recall dial).

## HNSW module details (`internal/hnsw`)

- `Node`: `id uint64`, `vec` (kept by `index` payload, not duplicated in graph),
  `layer int` (top layer `l(q)`), `neighbors [][]uint64` with `neighbors[l]`
  sorted ascending by id (no map iteration in the hot path), `deleted bool`.
- Layer assignment: `mL = 1/ln(M)`; `l(q) = floor(-ln(uniform(0,1)) * mL)` using
  the seeded `core.RNG`. Exact Researcher Section 3.1.
- `Insert(node)`: greedy descent from `topLayer` to `l(q)+1` with `ef=1`; then
  best-first `searchLayer` with `ef=efConstruction` per layer; `selectNeighborsHeuristic`
  with `extendCandidates=true`, `keepPrunedConnections=true`; bidirected edge
  addition; `Mmax`/`Mmax0` shrinkage via a second `selectNeighborsHeuristic` on
  the over-degree node; promote `entryPoint`/`topLayer` when `l(q) > topLayer`.
- `searchLayer(q, entryPoints, ef, lc, dist)`: max-heap candidates, min-heap
  result `W` of capacity `ef`, visited set, early termination when the closest
  candidate is farther than `W`'s farthest. `dist` is a `func(Vector, *Node) float32`
  closure supplied by `index` (exact L2/IP, or ADC). This is the single seam that
  makes Mode A and Mode B share one graph.
- `SelectNeighborsHeuristic`: sort candidates by distance to `q`; keep closest;
  greedily add the next candidate that is not "too close" to an already-selected
  neighbor (`dist(c,r) < dist(c,q)` -> drop). Return up to `M` (or `Mmax`).
- Lazy deletion: `Delete(id)` sets `deleted=true`; `searchLayer` and result
  assembly skip deleted nodes; no edge repair in v1. A periodic full rebuild is
  triggered when the deleted fraction exceeds 0.2 (Builder may defer to a later
  round; lazy mark alone satisfies the contract).

## PQ module details (`internal/pq`)

- `PQ`: `M int` (subspaces, `PqM`), `K int` (256), `Ds = Dim/M`, `rotate [][]float32`
  (`Dim x Dim`, identity when OPQ disabled), `codebooks [][]core.Vector` (`[M][K]`,
  each `Ds`-dim).
- `Train(data [][]float32, rng *core.RNG) (*PQ, error)`: if `Opq`, jointly train
  rotation + codebooks by alternating (a) rotate data, (b) run k-means per
  subspace, (c) update rotation to minimize reconstruction error (a few
  alternations, fixed count for determinism). Otherwise identity rotation.
- `kmeans`: deterministic Lloyd with k-means++ init seeded by `rng`; ties in
  `argmin` broken by lowest centroid index; fixed max-iteration cap + convergence
  epsilon. One codebook per subspace, `K` centroids.
- `Encode(x, pq) []byte`: rotate `x`, split into `M` subvectors, `argmin_k
  ||sub - codebook[m][k]||^2` per subspace.
- `BuildDistanceTable(q, pq) [][]float32`: `T[m][k] = dist(q_rot[m], codebook[m][k])`,
  cost `M*K*Ds` per query.
- `ADC(T, code) float32 = sum_m T[m][code[m]]`.
- Reconstruction helper `Reconstruct(code) Vector` for distortion reporting and
  the dashboard.

## Index module details (`internal/index`)

- `Build(opts, items)`:
  1. Validate `Dim` divides `PqM`; reject non-finite components; reject length !=
     `Dim`.
  2. `rng = core.NewRNG(opts.Seed)`.
  3. If `PqEnabled`: `pq = pq.Train(rotatedItems, rng)` then encode every item.
  4. `sorted = items` sorted by `ID` ascending (deterministic insertion order).
  5. For each item: build a `hnsw.Node`, `hnsw.Insert(node)`; store payload in
     `id -> Entry`.
  6. `idx.Proj = computeProjection(idx, rng)` (random-Gaussian default; PCA when
     available / requested).
  7. Return `*Index`.
- `Search(idx, q, k, ef, mode)`:
  1. Validate `q` length/dimension/finite.
  2. Choose `dist` closure: exact (`core.Distance(q, node.Vec, metric)`) or ADC
     (`BuildDistanceTable` once, then `ADC(T, node.Code)`).
  3. `W = hnsw.searchLayer(q, [entryPoint], ef, topLayer, dist)`.
  4. Sort `W` ascending by distance.
  5. If `mode == "pq" && PqRerank && full vectors kept`: recompute exact distance
     for the `ef` candidates and re-sort (recovers quantization recall loss).
  6. Return top `k` (skipping deleted) with `Visited` node count and `Mode`.
- `Projection()`: returns 2D coords per live entry. Random-Gaussian: fixed
  `Dim x 2` matrix from `N(0, 1/Dim)` drawn by the seeded `rng` (computed once at
  build, stored in `Proj`). PCA: top-2 eigenvectors of the covariance matrix via
  power iteration (deterministic). Both stable across reloads.
- `serialize.go`: `Save(path)` / `Load(path)` JSON (index `v1`): dim, options
  (incl. seed), codebooks, rotation, nodes (id, layer, neighbors, code, meta),
  projection basis, deleted flags. JSON v1 keeps the dashboard portable and
  lets a demo index be committed. A binary format is a noted later optimization.

## REST API (`api`, Section 6 contract)

Six endpoints, JSON only, all returning `{ "error": "..." }` with `4xx` on
malformed input (wrong dimension, unknown id, non-finite component).

```
POST /api/index            {id, vector, meta?}                 -> {ok, id}
POST /api/index/batch      {items:[{id,vector,meta?}]}         -> {ok, count}
DELETE /api/index/:id      -                                   -> {ok, deleted}
POST /api/search           {vector, k, ef?, mode?, metric?}    -> {results:[{id,distance,meta}], visited, mode}
GET  /api/stats           -                                   -> {count, dim, layers, memoryBytes, pq:{enabled,M,K}}
GET  /api/projection      -                                   -> {points:[{id,x,y,meta}]}
```

`metric` overrides the index metric per query (l2/ip/cosine). `ef` overrides
`efSearch`. The API is deterministic: same insertion order + same `ef` + same
`mode` => identical ordered result set. `GET /api/projection` returns the stored
2D coords so the dashboard is reload-stable.

## CLI (`cmd/helix/main.go`)

- `helix build --seed N --dim D --pq --pqm M --opq --in items.json --out index.json`
  reads a JSON array of items, builds the index, saves it.
- `helix search --index index.json --vector "[...]" --k 10 --ef 64 --mode pq`
  prints the top-k JSON.
- `helix serve --index index.json --port 8080` runs the REST server backing the
  dashboard.
- `helix bench --index index.json [--queries Q.json] [--out report.json]` runs the
  five benchmark definitions (Section 11) and prints/JSON-dumps the report. The
  Tester consumes this and the Go tests.

## Dashboard (`ui`, Section 7)

- `index.html`: a dark-themed single page with a `<canvas>` for the 2D projection,
  a left control rail (upload CSV/JSON, paste textarea, `k` input, `ef` recall
  slider, `mode` exact/pq toggle, metric select, "load demo" button), and a right
  side panel listing the lit neighbors with distance + meta.
- `helix.js`:
  - On load: `GET /api/projection` (or load `data/demo.json` when no server) and
    render all points as small dots colored by id-hash.
  - Upload/paste: parse `id,vector` (CSV) or JSON items, `POST /api/index/batch`
    in id-sorted order, then re-`GET /api/projection` and re-render.
  - Query interaction: click a projected point (uses its vector as `q`), or paste
    a vector, or upload a query; call `POST /api/search`; highlight the returned
    `k` ids (glow/scale by rank or distance), draw faint edges from the query
    point to each neighbor, and list them in the side panel.
  - The `ef` slider maps directly to `efSearch` so dragging it visibly adds or
    swaps lit neighbors (live recall-vs-latency). `mode` toggle switches exact vs
    PQ; the side panel shows `visited` node count for the latency story.
- `helix.css`: glowing neighbor style, canvas crisp-render, responsive rail.

## Determinism contract (binding)

1. Seeded `core.RNG` (PCG64 port, fixed seed or `opts.Seed`) drives layer
   assignment, k-means++ init, and the random projection matrix. No `math/rand`
   global, no wall-clock.
2. Insertion order is explicit: `Build` sorts items by `ID` before insertion.
3. k-means is deterministic: fixed init seed + fixed iteration cap; `argmin` ties
   broken by lowest centroid index.
4. `float32` arithmetic is deterministic in Go given identical input + operation
   order; squared distances internally, `sqrt` only at output.
5. No map-iteration in the hot path: neighbor slices are sorted by id; candidate
   selection iterates slices.
6. `Build` + `Search` are pure functions of (seed, items, query, k, ef, mode);
   the Tester asserts byte-identical result sets and projection coords across two
   builds.

## Complexity targets (Builder must hit these)

| Stage | Time | Space |
|-------|------|-------|
| PQ/OPQ train (once) | O(PqM * T * K * Iters * Ds) | O(PqM * K * Ds) |
| HNSW insert | O(efC * M * log N) expected | O(M * N) edges |
| HNSW query (exact) | O(efS * M * log N) expected | O(efS) |
| HNSW query (PQ/ADC) | O(efS * M * log N + k*D) | O(PqM) / node |
| Exact rerank top-k | O(k * D) | - |

## Milestones (Builder checklist)

- [ ] 1. Scaffold `helix/` Go module (`go.mod`, `cmd/helix`), `core` package:
  `Vector`, `Metric`, `Distance` (L2/IP/cosine), finite check, normalize.
- [ ] 2. `core/rng.go` PCG64 seeded RNG; `core/heap.go` min/max float heaps.
- [ ] 3. `hnsw` package: `Node`, `Graph`, layer assignment, `Insert`,
  `searchLayer`, `SelectNeighborsHeuristic`, `Mmax`/`Mmax0` shrink, lazy delete.
- [ ] 4. `pq` package: `Train` (k-means++ + Lloyd), `Encode`,
  `BuildDistanceTable`/`ADC`, `Reconstruct`; `opq.go` rotation training.
- [ ] 5. `index` package: `Build`, `Search` (exact + ADC + rerank), `dist`
  closure seam, `Projection` (random + PCA), `serialize.go` JSON v1.
- [ ] 6. `api` package: `server.go` + `handlers.go` for the 6 endpoints,
  validation, determinism.
- [ ] 7. `cmd/helix`: `build` / `search` / `serve` / `bench` CLI wired to `index`.
- [ ] 8. `ui`: `index.html` + `helix.js` + `helix.css` dashboard with projection
  render, upload/paste, click-to-query, neighbor glow, `ef` slider, mode toggle;
  commit `data/demo.json`.
- [ ] 9. Benchmarks: Go tests + `helix bench` for the five definitions
  (recall@k vs ef, latency/QPS, PQ distortion, memory, determinism).
- [ ] 10. README + this blueprint's milestone status updated; push; open/build PR.

## Test matrix

| Area | Go test | CLI / bench | UI |
| --- | --- | --- | --- |
| core | distance vectors (L2/IP/cosine), finite rejection, normalize, RNG reproducibility | - | - |
| hnsw | insert/search recall on synthetic set, layer assignment distribution, `selectNeighborsHeuristic` diversity, lazy-delete exclusion, `Mmax` cap | `helix bench` recall@10 vs ef curve monotonic, reaches >=0.95 | - |
| pq | k-means converges, `Encode`/`ADC` correctness vs brute force, OPQ distortion < plain PQ at equal PqM, rerank recovers recall within 0.02 | `helix bench` distortion + Mode B vs A recall | - |
| index | `Build`+`Search` determinism (two builds byte-identical ids+distances to 1e-5, projection identical), JSON save/load round trip, dimension/PqM divisibility, non-finite rejection | `helix build`/`search` smoke, `helix serve` ping | demo index loads |
| api | each handler validates bad input (4xx + `{error}`), deterministic `/api/search`, `/api/stats` shape, `/api/projection` stability | `curl` smoke of all 6 endpoints | fetch + render |
| ui | - | - | projection renders, click lights up k neighbors, `ef` slider changes lit set, upload re-renders, demo loads with no server |
| perf | - | p50/p99 latency + QPS at >=0.95 recall, nodes-visited; memory bytes/vector Mode A vs B | - |
| e2e | `go test ./...` + `go vet` clean | full bench report green | dashboard flows green |

## Acceptance (from the mandate)

- recall@10 reaches `>= 0.95` at some `efSearch <= 64k` on the synthetic set;
  curve is monotonically non-decreasing in `efSearch`.
- OPQ distortion `<` plain PQ at equal `PqM`; Mode B recall@10 within `0.02` of
  Mode A after exact rerank for `PqM >= 8`.
- Two builds from same seed + same upload order produce byte-identical search
  result sets (ids + distances to 1e-5) and identical `/api/projection`.

## Deliverables

- New Go module `helix/` (packages `core`, `hnsw`, `pq`, `index`, `api`, CLI).
- Static dashboard `helix/ui/` + committed demo index.
- `helix bench` CLI and Go benchmark tests covering the five definitions.
- README + this blueprint's milestone status; PR closes #128.

- the Architect
