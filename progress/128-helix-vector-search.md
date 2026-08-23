# Progress — Helix

- **Issue:** #128
- **Branch:** opencode/issue128-20260823131639
- **Status:** complete (research phase; handed to Architect)
- **Updated:** 2026-08-23T13:30:00Z

## Checklist
- [x] 1. Research: HNSW construction + search-with-ef algorithmic spec
- [x] 2. Research: product quantization (PQ/OPQ) + ADC + distortion analysis
- [x] 3. Research: recall-vs-latency tradeoff + complexity bounds
- [x] 4. Research: REST API contract (index/delete/search/stats/projection)
- [x] 5. Research: 2D projection + dashboard neighbor-lighting semantics
- [x] 6. Research: determinism contract + benchmark definitions
- [ ] 7. Architect: module blueprint (core/hnsw/pq/index/api/ui)
- [ ] 8. Builder: implementation
- [ ] 9. Tester: benchmarks (recall@k, QPS, PQ distortion, determinism)
- [ ] 10. Reviewer: static review

## Current step
Research specification complete and committed. Handing off to the Architect with
action=architect (see `.agent/decision.json`).

## Next steps
- The Architect reads `docs/research/issue-128-helix-vector-search.md` and
  produces the Go module blueprint (packages core / hnsw / pq / index / api /
  ui), the public types from Section 9, the deterministic `build`/`search` API,
  and the dashboard plan from Section 7 and 14.

## Agent log
- 2026-08-23T13:30:00Z (Researcher, run 1): wrote the full algorithmic
  specification in `docs/research/issue-128-helix-vector-search.md`. Covers
  HNSW layer assignment (probabilistic skip-list), insertion with
  selectNeighborsHeuristic, best-first searchLayer with ef, PQ/OPQ training and
  ADC distance tables, PQ distortion bounds and the rerank mitigation, the
  recall-vs-latency knobs (efSearch, M, PqM, K), the REST contract, the 2D
  projection (random/PCA) and neighbor-lighting dashboard interaction, the
  determinism contract (seeded RNG, fixed insertion order, no map-order
  dependence), complexity tables, and five benchmark definitions. Handing off to
  the Architect.
