# Helix - From-Scratch Vector Search Engine: Algorithmic & Mathematical Specification

- **Issue:** #128 (Helix - from-scratch vector search engine, Go)
- **Author role:** Researcher (Dr. Mob)
- **Target language:** Go (statically compiled binary + static Pages dashboard)
- **Hosting:** static GitHub Pages at `/helix/index.html`
- **Handoff target:** Architect (blueprint) then Builder (implementation)

This document is the scientific blueprint. It defines the data structures,
algorithms (HNSW graph construction and search-with-ef, product quantization
compression), complexity bounds, the recall-versus-latency tradeoff, the PQ
distortion analysis, the REST API contract, and the 2D-projection dashboard
semantics. It does NOT contain production code; the Architect turns this into a
module layout and the Builder implements it.

---

## 1. Scope and design goals

Helix is an approximate nearest-neighbor (ANN) search engine over a fixed or
incrementally-built set of high-dimensional vectors (embeddings). It must
satisfy the four hard requirements from the mandate:

1. **HNSW ANN search.** Hierarchical Navigable Small World graphs for fast
   sub-linear approximate nearest-neighbor lookup with tunable recall.
2. **Compressed storage via Product Quantization.** Vectors are compressed with
   PQ so an index of millions of vectors fits in RAM; search uses asymmetric
   distance computation (ADC) against the codes.
3. **REST index + query API.** A small, deterministic HTTP API to add vectors,
   delete vectors, and query nearest neighbors, plus bulk upload of embeddings
   (file or paste).
4. **Web dashboard with 2D projection.** Upload or paste vectors; watch nearest
   neighbors light up on a 2D projection of the embedding space.

Design priorities, in order: *search correctness/recall fidelity first*, then
determinism (so headless tests are reproducible), then memory footprint (PQ),
then latency. A search engine that silently returns garbage is useless no
matter how fast.

---

## 2. Problem model and primitives

### 2.1 Vectors and distance

A vector `x` is a point in `R^D`. Supported distances:

- **L2 (Euclidean squared):** `d(x, y) = sum_i (x_i - y_i)^2`. Use squared
  distance in the hot path to avoid the `sqrt`; take the root only for the
  final reported distances.
- **Inner product (IP):** `d(x, y) = -<x, y>` (negated so "nearest" = largest
  dot product). Requires normalized vectors for cosine similarity
  (`cos(x, y) = <x, y> / (|x| |y|)`); the index can normalize on ingest when in
  cosine mode.
- **L1 (Manhattan):** `d(x, y) = sum_i |x_i - y_i|` (optional, cheap).

The distance function `dist(x, y)` is the single primitive the graph and the
quantizer both consume. All math below assumes L2 unless stated; IP mode is the
same algorithm with the signed metric.

### 2.2 Index entry

```
Entry {
    id     uint64        // stable external id
    vec    []float32     // full-precision vector (kept if not purely PQ)
    code   []uint8       // PQ code (M subspaces), if PQ enabled
    meta   map[string]any // optional label/text for the dashboard
}
```

The graph stores node-level adjacency; the payload store maps `id -> Entry`.

---

## 3. HNSW: the navigable small-world graph

HNSW (Malkov & Yashunin, 2018) is a layered graph where the top layers are
sparse long-range highways and the bottom layer is a dense local graph. Search
greedily descends layer by layer, then refines in the base layer. Expected
search complexity is `O(log N)` with memory `O(M * N)`.

### 3.1 Layer assignment (probabilistic skip-list)

Each inserted node `q` is assigned a top layer `l(q)` drawn so that layer-0
contains all nodes and higher layers thin out exponentially:

```
m_L   = 1 / ln(M)                 // layer decay constant, M = max neighbors
l(q)  = floor( -ln( uniform(0,1) ) * m_L )
```

`uniform(0,1)` is drawn from the deterministic RNG (Section 10). With this
assignment, the expected number of nodes at layer `l` is `N * (1/M)^l`, giving
the multi-layer highway structure that yields logarithmic scaling.

### 3.2 Graph node and neighbor lists

```
Node {
    id       uint64
    neighbors [][ ]uint64   // neighbors[l] = ids of neighbors at layer l (0..l(q))
}
```

- `M`         : number of established connections per node (base layer).
- `Mmax`      : cap on connections at layers `l >= 1` (often = `M`).
- `Mmax0`     : cap on connections at layer 0 (often `2 * M`), since the base
                layer carries the full search load.
- `efConstruction` : dynamic candidate list size during insertion.
- `efSearch`  : dynamic candidate list size during query (tunable recall knob).

### 3.3 Insertion algorithm

```
insert(q):
    ep = [entryPoint]                      // current top-layer node
    L  = topLayer                          // highest existing layer
    lq = l(q)                              // q's assigned layer
    // 1. greedy descent from top layer down to lq+1
    for lc in L-1 downto lq:
        ep = searchLayer(q, ep, ef=1, lc)  // greedy, keep only nearest
    // 2. from layer lq down to 0, do best-first search then connect
    for lc in min(lq, L)-1 downto 0:
        W = searchLayer(q, ep, ef=efConstruction, lc)   // candidate set
        neighbors = selectNeighborsHeuristic(W, M, lc)  // prune
        for n in neighbors:
            addBidirectedEdge(q, n, lc)
            if degree(n, lc) > Mmax(lc):
                shrunk = selectNeighborsHeuristic(neighborsOf(n,lc), Mmax(lc), lc)
                setNeighbors(n, shrunk, lc)
        ep = W
    // 3. if lq > L, q becomes the new entry point at layers L..lq
    if lq > L: entryPoint = q; topLayer = lq
```

`searchLayer` (best-first, see 3.4) returns the `ef` closest candidates found
from the entry points. `selectNeighborsHeuristic` (3.5) prevents local clusters
from over-connecting and preserves graph navigability.

### 3.4 searchLayer (best-first beam search with ef)

This is the heart of HNSW. It maintains a visited set, a dynamic candidate
priority queue (max-heap by distance to `q`), and a result set `W` (min-heap,
size `ef`). At each step it pops the closest unvisited candidate, expands its
neighbors, and keeps the `ef` nearest. The `ef` parameter controls how many
near-misses are retained; larger `ef` = higher recall, more work.

```
searchLayer(q, entryPoints, ef, lc):
    visited = set(entryPoints)
    candidates = maxHeap(entryPoints by dist to q)   // closer = higher priority
    W = minHeap(entryPoints by dist to q, capacity ef)
    while candidates not empty:
        c = candidates.popMax()                       // closest candidate
        f = W.peekMax()                               // farthest in result set
        if dist(q, c) > dist(q, f): break             // no closer node possible
        for n in neighbors(c, lc):
            if n not in visited:
                visited.add(n)
                f = W.peekMax()
                if dist(q, n) < dist(q, f) or |W| < ef:
                    candidates.push(n)
                    W.push(n)
                    if |W| > ef: W.popMax()
    return W
```

Complexity per layer: each node is visited at most once; with bounded degree
`M`, the priority-queue operations and edge expansions are `O(ef * M * log N)`
per layer in the worst case, and the layer count is `O(log N)` in expectation,
so a full query is `O(log N + ef * M * log N)` ~ `O(ef * M * log N)` expected.

### 3.5 selectNeighborsHeuristic (diversity / pruning)

Naively taking the `M` nearest neighbors creates hubs and redundant short
edges that hurt navigation. The heuristic keeps the closest neighbor, then greedily
adds the next candidate that is sufficiently far (in graph distance) from all
already-selected neighbors, up to `M`. This spreads connectivity and preserves
small-world properties.

```
selectNeighborsHeuristic(candidates, M, lc, extendCandidates=true, keepPruned=false):
    if extendCandidates:
        // for each candidate, also consider its neighbors (richer pool)
        extended = candidates
        for c in candidates:
            for n in neighbors(c, lc):
                if n not in extended: extended.add(n)
    result = []
    candidates = sort(extended by dist to q)   // closest first
    while candidates not empty and |result| < M:
        c = candidates.popClosest()
        if for all r in result: dist(c, r) < dist(c, q): continue  // too close to a selected neighbor, skip
        result.add(c)
    if keepPruned:
        // optionally also return the pruned ones (used for Mmax shrinkage)
        ...
    return result
```

The diversity test `dist(c, r) < dist(c, q)` means "c is closer to an already
chosen neighbor r than to q", so c is geometrically redundant and is dropped.
This is the single most important knob for recall-vs-latency after `ef`.

### 3.6 Deletion

Lazy deletion: mark `id` as deleted, exclude it from `searchLayer` and from
results. Periodically (or when deleted fraction exceeds a threshold, e.g.
`> 0.2`) rebuild the affected layers or the whole graph. Hard deletion with
edge repair is more complex and optional for v1; lazy delete keeps the contract
simple and deterministic.

---

## 4. Product Quantization (compressed storage)

PQ (Jegou et al., 2011) splits each `D`-dim vector into `M` contiguous
subvectors of dimension `Ds = D / M` (require `D` divisible by `M`), and
quantizes each subspace independently with a small codebook of `K = 256`
centroids (`uint8` codes). This compresses `D * 4` bytes (float32) down to `M`
bytes.

### 4.1 Training the codebooks

For each subspace `m in 0..M-1`, run `K`-means (`K = 256`) on the `Ds`-dim
subvectors of the training set (all inserted vectors, or a sample). Use a
deterministic Lloyd algorithm with a seeded initialization (k-means++ with the
seeded RNG, or a fixed random subset). Store `codebook[m][k] in R^Ds`.

```
code[m][k] = centroid k of subspace m
```

Training cost: `O(M * T * K * Iters * Ds)` for `T` training vectors; done once
per index build (or incrementally retrained on demand). The codebooks are the
only learned state; they must be stored in the index for ADC and for the
dashboard's reconstruction.

### 4.2 Encoding a vector

```
encode(x):
    for m in 0..M-1:
        sub = x[m*Ds : (m+1)*Ds]
        code[m] = argmin_k || sub - codebook[m][k] ||^2
    return code   // M bytes
```

### 4.3 Asymmetric Distance Computation (ADC)

At query time we keep the full-precision query `q` but compare against the
compressed database vectors via their codes. Precompute a **distance table**
`T[m][k] = dist(q[m], codebook[m][k])` (cost `M * K * Ds` per query). Then the
approximate distance to a coded vector `c` is:

```
adc(q, c) = sum_{m=0}^{M-1} T[m][ c[m] ]
```

This is `O(M)` per database node instead of `O(D)`, trading exactness for a
`D/M`-fold reduction in distance cost (e.g. `D=128, M=8` -> 16x cheaper). The
graph search (Section 3.4) calls `adc` instead of the full `dist`.

### 4.4 PQ distortion analysis

Let `x` be a vector, `x_hat = reconstruct(encode(x))` its PQ reconstruction
(`x_hat[m] = codebook[m][code[m]]`). The quantization error per subspace is:

```
e_m = || x[m] - codebook[m][ code[m] ] ||^2
```

Total squared error `E = sum_m e_m`. Two useful bounds:

1. **Per-subspace optimum bound.** For subspace `m`, the best `K`-means
   partition achieves within-1-cluster variance `sigma_m^2 <= (K/(K-1)) * sigma_m,total^2`
   only in expectation; empirically `e_m` is dominated by the local variance of
   subvector `m`. Subspaces with high variance (e.g. the first PCA directions
   if the data is not pre-rotated) contribute most of the error.

2. **Rotational preprocessing (OPQ).** Applying an orthogonal transform `R`
   (`D x D`) before splitting equalizes subspace variances and decorrelates
   them, so each of the `M` subspaces carries comparable energy. Optimized PQ
   (OPQ) rotates so that

   ```
   minimize_R  E[ || x - reconstruct_R(encode(R x)) ||^2 ]
   ```

   Empirically OPQ cuts distortion by 20-40% at the same `M, K`. The mandate
   asks for PQ; recommend OPQ as the default with a plain-PQ fallback.

3. **Recall impact.** PQ error does not change graph topology (the graph is
   built on full vectors or on the same codes consistently), but ADC distances
   are approximate, so the *final* top-k ranking is slightly perturbed relative
   to exact L2 over full vectors. Mitigation: run graph search with `efSearch`
   slightly larger than `k`, collect `efSearch` candidates, then **rerank the
   top `k` using exact full-precision distances** (Helix keeps the full vector
   optionally, or recomputes from `x_hat` only when full vectors are dropped).
   This "coarse PQ graph + exact rerank" pattern recovers most of the recall
   lost to quantization at negligible extra cost (only `k` exact distances).

### 4.5 Scalar Quantization alternative (optional)

For float16 or int8 scalar quantization (`x_q = round(x * scale)`), distance is
computed exactly up to rounding; far cheaper to implement and zero training,
but gives only 2x (f16) or ~4x (int8) compression versus PQ's `D/M` (e.g. 16x
for D=128, M=8). Recommend PQ/OPQ as primary; expose int8 SQ as a
memory-vs-accuracy toggle.

---

## 5. HNSW + PQ coupling and the recall-vs-latency tradeoff

### 5.1 Two operating modes

- **Mode A (exact graph):** graph built and searched on full float32 vectors.
  Maximum recall, larger memory. Use when RAM allows.
- **Mode B (PQ/OPQ graph):** store only PQ codes in nodes; `adc` in
  `searchLayer`; optional exact rerank of top-k. Smaller memory, lower per-hop
  cost, tiny recall loss. This is the headline "compressed storage" feature.

Both share the same HNSW machinery; only the `dist` callback and the node
payload differ. The dashboard and API are identical across modes.

### 5.2 Recall vs latency knobs

Recall@k is governed mainly by:

1. `efSearch` (the dominant knob): larger `efSearch` retains more candidates
   per layer, monotonically increasing recall and latency. Typical sweet spot:
   `efSearch in [k*4, k*64]`.
2. `M` (connections): larger `M` improves recall and robustness but increases
   memory (`O(M*N)`) and construction time. Typical `M in [16, 64]`.
3. `Mmax0` (base-layer cap): usually `2*M`.
4. PQ/OPQ subspace count `M` (rename to `PqM` to avoid clash) and `K`: more
   subspaces / larger `K` reduce distortion (higher effective recall after
   rerank) at higher memory.

**Theoretical guidance.** Under the small-world model, HNSW search visits
`O(log N)` nodes when `ef` is tuned above a threshold; below it recall drops
sharply (phase transition). The recommendation is to expose `efSearch` as the
live tuning parameter in the dashboard ("recall slider") and fix `M`, `Mmax0`
at build time. Report, for the benchmark suite, the recall@10 curve as a
function of `efSearch` at fixed `M` so the Architect/Builer can pick defaults.

### 5.3 Complexity summary (combined engine)

| Stage | Time | Space |
|-------|------|-------|
| PQ/OPQ train (once) | O(M * T * K * Iters * Ds) | O(M * K * Ds) codebooks |
| Encode one vector | O(M * K * Ds) | - |
| HNSW insert | O(efC * M * log N) expected | O(M * N) edges |
| HNSW query (full) | O(efS * M * log N) expected | O(efS) working set |
| HNSW query (PQ/ADC) | O(efS * M * log N) + O(efS * M) ADC | O(M) codes per node |
| Exact rerank top-k | O(k * D) | - |
| **Total query (Mode B)** | **O(efS * M * log N + k * D)** | **O(M*N) edges + M*N codes** |

Memory for Mode B: `M` bytes/vector for codes plus `M_max * 8` bytes/vector for
edge ids (uint64). For `N=1e6, M=8, Mmax0=32`: ~8 MB codes + ~256 MB edges,
versus ~512 MB for full float32 (`D=128`). A ~2x win from edges + a 16x win
from vectors.

---

## 6. REST API contract

Deterministic, JSON, no hidden state per request beyond the index. All vectors
are arrays of `float32` (JSON numbers). The server is single-binary; the
dashboard is a static page that talks to these endpoints.

### 6.1 Endpoints

```
POST /api/index
    body: { "id": uint64, "vector": [f,f,...], "meta": {...} }
    -> { "ok": true, "id": uint64 }

POST /api/index/batch
    body: { "items": [ {"id":..,"vector":..,"meta":..}, ... ] }
    -> { "ok": true, "count": N }

DELETE /api/index/:id
    -> { "ok": true, "deleted": bool }

POST /api/search
    body: { "vector": [f,f,...],
            "k": int,
            "ef": int | null,        // overrides efSearch
            "mode": "exact"|"pq",    // distance mode
            "metric": "l2"|"ip"|"cosine" }
    -> { "results": [ {"id":..,"distance":f,"meta":..}, ... up to k ],
         "visited": int,             // nodes traversed (diagnostic)
         "mode": "exact"|"pq" }

GET /api/stats
    -> { "count": int, "dim": int, "layers": int, "memoryBytes": int,
         "pq": {"enabled":bool,"M":int,"K":int} }

GET /api/projection
    -> { "points": [ {"id":..,"x":f,"y":f,"meta":..}, ... ] }   // 2D coords (Section 7)
```

All endpoints return `4xx` with `{ "error": "..." }` on malformed input
(wrong dimension, unknown id, non-finite values). The API must reject vectors
whose length != `dim` and any non-finite component.

### 6.2 Determinism of the API

Given the same insertion order and same `ef`, `/api/search` returns the same
ordered result set. Insertion order is part of the index seed; the dashboard's
upload flow must insert in a deterministic order (sorted by id, or by upload
order recorded explicitly) so headless tests reproduce. The RNG used for layer
assignment and k-means init is seeded from a fixed constant (or an
index-creation seed stored in the index file).

---

## 7. Web dashboard: 2D projection and neighbor lighting

### 7.1 2D projection

High-dimensional embeddings are projected to 2D for visualization. Options, in
increasing cost/quality:

1. **Random Gaussian projection (default, fast, deterministic):** multiply each
   `D`-vector by a fixed `D x 2` matrix whose entries are drawn once from
   `N(0, 1/D)` with the seeded RNG. Johnson-Lindenstrauss preserves approximate
   distances in 2D well enough to see clusters.
2. **PCA (2 components):** compute the top-2 principal axes of the indexed
   vectors (eigendecomposition of the covariance matrix, power iteration or
   exact for small N). Better cluster separation; deterministic.
3. **(Optional) UMAP/t-SNE:** higher quality but non-deterministic and heavy;
   expose behind a flag only if needed. Not required for v1.

The projection is computed server-side (or in a tiny WASM/JS mirror) and served
via `GET /api/projection`. Because it is seed/algorithm fixed, it is stable
across reloads.

### 7.2 "Neighbors light up" interaction

When the user selects a query point (click a projected point, upload a vector,
or paste one), the dashboard:

1. Calls `POST /api/search` with that vector and a chosen `k` and `ef`.
2. Receives the top-k ids and their distances.
3. Highlights those `k` points on the 2D canvas (e.g. glow/color by rank or by
   distance), draws faint edges from the query point to each neighbor, and lists
   them in a side panel with distances and `meta`.

This makes the ANN behavior tangible: as the user drags the `ef` (recall)
slider, more or different neighbors "light up", visualizing the recall-vs-latency
tradeoff live. The slider maps directly to `efSearch` in the API.

### 7.3 Upload / paste flows

- **Upload embeddings:** a CSV/JSON file where each row is `id, vector comma
  list` (or JSON array of items). Server parses, validates dimension, inserts
  in deterministic order, retrains PQ on the full set, then recomputes the
  projection.
- **Paste vectors:** a textarea accepting the same JSON; same path.

After ingest, the dashboard re-renders the projection and enables querying.

---

## 8. Determinism contract

1. **Seeded RNG** (e.g. a Go port of PCG64 or xorshift128+ with a fixed seed)
   drives: layer assignment in HNSW, k-means++ init for PQ, and the random
   projection matrix. No `math/rand` global, no time-of-day.
2. **Stable insertion order:** index insert order is explicit; the uploader
   sorts by id before insertion so two builds of the same data are identical.
3. **Deterministic k-means:** fixed init seed + fixed iteration count (or a
   convergence epsilon with a fixed max-iter cap). Ties in `argmin` broken by
   lowest centroid index.
4. **IEEE-754 determinism:** `float32` arithmetic is deterministic in Go given
   identical inputs and operation order; avoid `math.Sqrt` only where exact
   equality matters (prefer squared distances internally; root only at output).
5. **No map-iteration-order dependence:** neighbor lists are slices kept sorted
   by id; candidate selection iterates slices, never `map` order.
6. Provide a headless `search(index, q, k, ef, mode) -> []result` and
   `build(seed, items) -> index` callable from Go tests and from a CLI, so the
   Tester can assert byte-identical result sets for the same inputs.

---

## 9. Data structures (suggested, for the Architect)

```
type Vector []float32

type Node struct {
    id        uint64
    vec       Vector        // full vector (Mode A) or nil (Mode B pure)
    code      []byte        // PQ code, len = PqM (Mode B)
    layer     int           // top layer l(q)
    neighbors [][]uint64    // neighbors[l] sorted by id
    deleted   bool
}

type Graph struct {
    nodes       map[uint64]*Node
    entryPoint  uint64
    topLayer    int
    M, Mmax, Mmax0 int
    efConstruction int
    metric      Metric
    rng         *RNG
}

type PQ struct {
    M, K, Ds    int
    rotate      [][]float32  // OPQ rotation D x D (identity if plain PQ)
    codebooks   [][]Vector   // [M][K] centroids of dim Ds
}

type Index struct {
    dim     int
    graph   *Graph
    pq      *PQ            // nil if disabled
    proj    [2]Vector      // 2D projection basis (or random matrix)
}
```

The Architect maps these to Go packages: `core` (vector math, distance, RNG),
`hnsw` (graph build/search), `pq` (training/encode/ADC), `index` (coupling,
projection, persistence), `api` (HTTP handlers), `ui` (static `helix/index.html`
+ JS that calls the API). Provide a CLI (`helix build`, `helix search`,
`helix serve`) that reuses the same deterministic core for headless tests.

---

## 10. Complexity summary

| Stage | Time | Space |
|-------|------|-------|
| PQ/OPQ train | O(PqM * T * K * Iters * Ds) | O(PqM * K * Ds) |
| Encode vector | O(PqM * K * Ds) | - |
| HNSW insert | O(efC * M * log N) expected | O(M * N) |
| HNSW query (exact) | O(efS * M * log N) expected | O(efS) |
| HNSW query (PQ/ADC) | O(efS * M * log N + efS * PqM) | O(PqM) / node |
| Exact rerank top-k | O(k * D) | - |

With `M ~ 32`, `efS ~ 64`, `N ~ 1e6`, a query visits on the order of
`64 * 32 * log2(1e6) ~ 40k` edge traversals, each an `O(D)` (exact) or `O(PqM)`
(PQ) distance, well within single-millisecond budgets on one core.

---

## 11. Benchmark definitions (required by the mandate)

The Builder/Tester must implement these and report numbers.

### 11.1 Recall@k vs efSearch

- Dataset: a fixed synthetic set (e.g. `N = 10000`, `D = 128`, Gaussian
  clusters, seed-fixed) plus, if available, a real embedding sample.
- Ground truth: exact brute-force top-k (full L2) per query.
- For `efSearch in {k, 2k, 4k, 8k, 16k, 32k, 64k}` (capped at a sane max) and
  `k = 10`, report `recall@10 = |returned ∩ truth| / k` averaged over 200
  queries.
- **Acceptance:** recall@10 reaches `>= 0.95` at some `efSearch <= 64k` for the
  synthetic set; the curve is monotonically non-decreasing in `efSearch`.

### 11.2 Latency / QPS

- Measure p50 and p99 query latency and queries-per-second for `k=10` at the
  `efSearch` that achieved `>= 0.95` recall, single core, `N=10000` and
  `N=100000`. Report nodes-visited (`visited` field) alongside.

### 11.3 PQ distortion

- For the same dataset, train OPQ with `PqM in {4, 8, 16}`, `K=256`.
- Report mean squared reconstruction error `E[||x - x_hat||^2]` and the relative
  error `E / E[||x||^2]` (the normalized distortion). Also report
  recall@10 of Mode B (PQ graph + exact rerank) vs Mode A at matched `efSearch`.
- **Acceptance:** OPQ distortion `<` plain PQ distortion at equal `PqM`; Mode B
  recall@10 within `0.02` of Mode A after exact rerank for `PqM >= 8`.

### 11.4 Memory

- Report bytes/vector and total RSS for `N=100000` in Mode A and Mode B.

### 11.5 Determinism

- Build the index twice from the same seed + same upload order; assert the
  `search` result sets (ids + distances, to 1e-5) are byte-identical, and the
  `/api/projection` coordinates are identical.

---

## 12. Pseudo-code: end-to-end query (Mode B)

```
query(q, k, ef, mode):
    if mode == pq and index.pq != nil:
        qCodeTable = buildTable(index.pq, q)   // T[m][k] = dist(q[m], cb[m][k])
        dist = (a, node) => sum_m T[m][ node.code[m] ]     // ADC
    else:
        dist = (a, node) => l2(q, node.vec)
    W = searchLayer(q, [entryPoint], ef, topLayer)   // descend + refine (3.4)
    candidates = W sorted by dist asc
    if mode == pq and rerank:
        // recompute exact distance for the ef candidates using full vectors
        for c in candidates: c.exact = l2(q, fullVec(c))   // or skip if pure PQ
        candidates = sort by c.exact
    return candidates[0:k]
```

```
build(seed, items):
    rng = newRNG(seed)
    index = newIndex(dim, M, Mmax, Mmax0, efC, metric, rng)
    if pqEnabled: index.pq = trainPQ(items, PqM, K, rng)   // OPQ rotation + codebooks
    sorted = items sorted by id
    for it in sorted:
        node = makeNode(it.id, it.vec, encodePQ(it.vec, index.pq))
        hnswInsert(index.graph, node)
    index.proj = computeProjection(index, rng)   // random or PCA 2D
    return index
```

---

## 13. Risks and recommendations

- **HNSW is the gold reference; do not invent a new graph.** Follow Malkov &
  Yashunin's insertion/search exactly, including the `extendCandidates` and
  `keepPrunedConnections` flags in the heuristic (both on by default).
- **`efSearch` is the recall dial.** Expose it live in the dashboard; fix `M`
  at build time. The recall-vs-latency curve (11.1) is the single most
  important acceptance artifact.
- **PQ distortion is real; always rerank.** Pure ADC top-k loses recall to
  quantization. The "PQ graph + exact rerank of top-k" pattern recovers almost
  all of it for `PqM >= 8`. Ship rerank on by default.
- **OPQ beats plain PQ** for the same bytes; make OPQ the default rotation
  (identity if disabled). The training cost is one-time.
- **Determinism is a feature, not an afterthought.** Seed the RNG, fix insertion
  order, avoid map iteration in the hot path. Retrofitting is painful.
- **Deletion is lazy first.** Hard-delete with edge repair is a v2 nicety; lazy
  mark-and-rebuild keeps the contract clean and reproducible.
- **Dimension must be divisible by `PqM`.** Validate at index creation; pick
  `PqM` that divides `D` (e.g. `D=128, PqM in {4,8,16,32}`).
- **Numerical safety.** Reject non-finite vector components at ingest; guard
  zero-norm in cosine mode (treat as error or zero-distance consistently).

---

## 14. Handoff to the Architect

The Architect should produce a module blueprint that:

1. Separates `core` (vector math, distances, seeded RNG) from `hnsw` (graph
   build/search, neighbors heuristic, lazy delete) from `pq` (OPQ training,
   encode, ADC distance table) from `index` (coupling, 2D projection,
   persistence/serialization) from `api` (the REST handlers of Section 6) from
   `ui` (the static `helix/index.html` + JS dashboard of Section 7).
2. Exposes a deterministic `build(seed, items)` and `search(index, q, k, ef,
   mode)` API usable by both the server and headless Go tests.
3. Defines the public Go types matching Section 9.
4. Plans the dashboard at `/helix/index.html` with the 2D projection canvas,
   the query/click interaction that lights up neighbors, the `ef` (recall)
   slider, and upload/paste ingestion.
5. Schedules the benchmarks of Section 11 as automated Go tests and a
   `helix bench` CLI command.
6. Chooses a serialization format for the index (JSON for portability in v1,
   with a note that a binary format is a later optimization) so the dashboard
   can preload a demo index.

- Dr. Mob, the Researcher
