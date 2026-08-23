# Progress — Helix

- **Issue:** #128
- **Branch:** opencode/issue128-20260823131639
- **Status:** in-progress
- **Updated:** 2026-08-23T13:40:00Z

## Checklist
- [x] 1. Research: HNSW construction + search-with-ef algorithmic spec
- [x] 2. Research: product quantization (PQ/OPQ) + ADC + distortion analysis
- [x] 3. Research: recall-vs-latency tradeoff + complexity bounds
- [x] 4. Research: REST API contract (index/delete/search/stats/projection)
- [x] 5. Research: 2D projection + dashboard neighbor-lighting semantics
- [x] 6. Research: determinism contract + benchmark definitions
- [x] 7. Architect: module blueprint (core/hnsw/pq/index/api/ui)
- [ ] 8. Builder: scaffold helix/ Go module + core (vector, rng, heap)
- [ ] 9. Builder: hnsw graph (insert, searchLayer, heuristic, lazy delete)
- [ ] 10. Builder: pq/opq training, encode, ADC distance table
- [ ] 11. Builder: index coupling (Build/Search, projection, serialize)
- [ ] 12. Builder: api REST handlers + cli (build/search/serve/bench)
- [ ] 13. Builder: ui dashboard (projection, upload, neighbor glow, ef slider)
- [ ] 14. Tester: benchmarks (recall@k, QPS, PQ distortion, memory, determinism)
- [ ] 15. Reviewer: static review

## Current step
Architectural blueprint complete and committed at
`ideas/2026-08-23-helix-vector-search.md`. Module tree (core / hnsw / pq / index
/ api + cmd/helix + ui), public Go types, the deterministic `Build`/`Search` seam,
REST contract, dashboard plan, and the five-benchmark test matrix are defined.
Ready for initial build.

## Next steps
- The Builder scaffolds `helix/` and implements `core` (vector math, seeded
  PCG64 RNG, min/max heaps), then `hnsw`, `pq`, `index`, `api`, `cmd/helix`, and
  the `ui` dashboard, following the milestone checklist in the blueprint.

## Agent log
- 2026-08-23T13:30:00Z (Researcher, run 1): wrote the full algorithmic
  specification in `docs/research/issue-128-helix-vector-search.md`.
- 2026-08-23T13:40:00Z (Architect, run 1): read `docs/research/issue-128-helix-vector-search.md`
  and `AGENTS.md`/`architect.md` conventions; produced the Go module blueprint at
  `ideas/2026-08-23-helix-vector-search.md` (module tree, public Go types,
  Build/Search API seam, HNSW/PQ/index details, REST contract, CLI, dashboard
  plan, determinism contract, test matrix, acceptance criteria). Updated this
  progress file to in-progress with the Builder milestone checklist. Decision
  action: build.

- the Architect
