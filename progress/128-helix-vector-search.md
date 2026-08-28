# Progress — Helix

- **Issue:** #128
- **Branch:** opencode/issue128-20260823131639
- **Status:** complete
- **Updated:** 2026-08-23T15:00:00Z

## Checklist
- [x] 1. Research: HNSW construction + search-with-ef algorithmic spec
- [x] 2. Research: product quantization (PQ/OPQ) + ADC + distortion analysis
- [x] 3. Research: recall-vs-latency tradeoff + complexity bounds
- [x] 4. Research: REST API contract (index/delete/search/stats/projection)
- [x] 5. Research: 2D projection + dashboard neighbor-lighting semantics
- [x] 6. Research: determinism contract + benchmark definitions
- [x] 7. Architect: module blueprint (core/hnsw/pq/index/api/ui)
- [x] 8. Builder: scaffold helix/ Go module + core (vector, rng, heap)
- [x] 9. Builder: hnsw graph (insert, searchLayer, heuristic, lazy delete)
- [x] 10. Builder: pq/opq training, encode, ADC distance table
- [x] 11. Builder: index coupling (Build/Search, projection, serialize)
- [x] 12. Builder: api REST handlers + cli (build/search/serve/bench)
- [x] 13. Builder: ui dashboard (projection, upload, neighbor glow, ef slider)
- [x] 14. Tester: benchmarks (recall@k, QPS, PQ distortion, memory, determinism)
- [x] 15. Builder: docs, landing page, and polish

## Current step
Build complete. Go module `helix/` implemented (core/hnsw/pq/index/api + cmd/helix + ui), deterministic Build/Search, PQ/OPQ with ADC+rerank, REST API (6 endpoints), dashboard with projection and neighbor glow, `helix bench` and Go tests (recall >=0.95, determinism, PQ, delete). Landing page and README updated; ready for review.

## Next steps
- Reviewer: static review (`/oc review`)
- Tester: E2E verification (`/oc test`)

## Agent log
- 2026-08-23T13:30:00Z (Researcher, run 1): wrote the full algorithmic specification in `docs/research/issue-128-helix-vector-search.md`.
- 2026-08-23T13:40:00Z (Architect, run 1): read `docs/research/issue-128-helix-vector-search.md` and `AGENTS.md`/`architect.md` conventions; produced the Go module blueprint at `ideas/2026-08-23-helix-vector-search.md` (module tree, public Go types, Build/Search API seam, HNSW/PQ/index details, REST contract, CLI, dashboard plan, determinism contract, test matrix, acceptance criteria). Updated this progress file to in-progress with the Builder milestone checklist. Decision action: build.
- 2026-08-23T15:00:00Z (Builder, run 1): scaffolded `helix/` Go module (core vector/rng/heap/matrix, hnsw graph with layer assignment + searchLayer + heuristic + lazy delete, pq k-means + OPQ rotation + ADC, index Build/Search + projection + serialize, api handlers, cmd/helix build/search/serve/bench, ui dashboard with canvas + ef slider + click-to-query + upload/paste, demo data). Tests pass (determinism, recall >=0.95 monotonic, PQ, delete). Bench shows recall@10 0.95 at ef 10 reaching 1.0 at ef 80, ~0.28ms/q. Updated landing page and README to Helix. Status complete.
- 2026-08-23T15:50:00Z (Fixer, run 1): applied reviewer findings on PR #129. gofmt-cleaned the module (cmd/helix/main.go, internal/index/serialize.go, internal/pq/pq.go). Added `sync.RWMutex` to `api.Server` guarding write handlers (index/batch/delete) with Lock and read handlers (search/stats/projection) with RLock, fixing the concurrent-mutation data race. Wired new top HNSW layers to the prior entry point in `Insert` so top-down descent is not wasted. Removed dead code: `searchLayerWithDistWithVisited`, `sortedContains`, `BoundedMaxHeap`/`HeapPush*Min`/`HeapPop*Min`/`HeapPush*Max`/`HeapPop*Max`, `MatMul`, and the unused `visitedCount` local. Documented the `opq` random-rotation simplification honestly in `helix/README.md`. `go vet` and `go test ./...` pass.

- the Builder
