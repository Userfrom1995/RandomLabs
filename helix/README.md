# Helix - Vector Search Engine

A from-scratch approximate nearest-neighbor (ANN) engine in **Go**: HNSW graph (probabilistic skip-list layers, best-first `searchLayer` with `ef`, diversity neighbor heuristic, lazy delete) plus **Product Quantization / OPQ** with asymmetric distance computation (ADC) and exact-rerank. Deterministic, headless-testable, with a small REST API and a static dashboard where nearest neighbors light up on a 2D projection.

> **OPQ note:** the `opq` rotation is a single seeded random orthogonal matrix, not the alternating iterative OPQ optimization from the spec. It is deterministic and functional, but it does not guarantee lower quantization distortion than plain PQ. The index falls back to exact rerank when `mode=exact`, so search correctness is unaffected.

## Quick start

```bash
# build the binary
go build -o helix ./cmd/helix

# build an index from items.json (array of {id, vector, meta})
./helix build --dim 16 --in items.json --out index.json --pq --pqm 4 --seed 42

# search
./helix search --index index.json --vector "[0.1,0.2,...]" --k 5 --ef 40 --mode pq

# serve REST API + dashboard
./helix serve --index index.json --port 8080
# open http://localhost:8080  (when serving from helix/ dir, UI at helix/ui/index.html)
# static dashboard also works offline via helix/ui/data/demo.json
```

Items file example (`items.json`):
```json
[{"id":1,"vector":[0.1,0.2,0.3,0.4],"meta":{"label":"a"}}, {"id":2,"vector":[0.5,0.6,0.7,0.8]}]
```

## REST API

| Method | Path | Body | Result |
|--------|------|------|--------|
| POST | /api/index | `{id, vector, meta?}` | `{ok, id}` |
| POST | /api/index/batch | `{items:[{id,vector,meta?}]}` | `{ok, count}` |
| DELETE | /api/index/:id | - | `{ok, deleted}` |
| POST | /api/search | `{vector, k, ef?, mode?("exact"|"pq"), metric?}` | `{results:[{id,distance,meta}], visited, mode}` |
| GET | /api/stats | - | `{count, dim, layers, memoryBytes, pq:{enabled,M,K}}` |
| GET | /api/projection | - | `{points:[{id,x,y,meta}]}` |

All vectors are validated for dimension and finiteness; errors return `4xx {error}`.

## Dashboard

`helix/ui/index.html` - Canvas projection, upload CSV/JSON, paste vectors, click a point to query, drag the `ef` recall slider to see neighbors light up live. Works with a live server (`/api/*`) or offline via `data/demo.json`.

## Determinism

Seeded `core.RNG` (xorshift64*) drives layer assignment, k-means++ init, and the random Gaussian projection. Build sorts items by `id`. `Search` is pure over `(seed, items, q, k, ef, mode)`.

## Benchmarks

```bash
go test ./...           # recall, determinism, PQ, delete tests
./helix bench            # recall@10 vs ef, latency/QPS, distortion
./helix bench --index index.json
```

## Layout

```
helix/
  go.mod
  cmd/helix/        CLI (build/search/serve/bench)
  internal/core/    vector math, metrics, RNG, heaps
  internal/hnsw/    HNSW graph
  internal/pq/      PQ/OPQ, k-means, ADC
  internal/index/   Build/Search coupling, projection, serialization
  api/              REST handlers
  ui/               static dashboard
```

## License

MIT
