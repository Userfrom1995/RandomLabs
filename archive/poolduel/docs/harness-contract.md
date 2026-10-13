# Poolduel harness contract (Researcher spec, Refs #302)

Normative adapter contract. The Architect turns this into code; the Reviewer
code-inspects it for identical treatment of every arm.

## 1. Adapter interface (one adapter per pooler plus direct)

Each adapter implements: `setup(config)`, `start()`, `healthcheck()`,
`stop()`, `config_text()` (verbatim config for artifacts). No adapter may add
per-pooler warmup, retries, or timeouts. All procedure code (pgbench build,
init, warmup, measure, log collect, median math) is shared and pooler-blind;
only `config_text()` and the connection string differ per arm.

## 2. Identical treatment (hard constraints)

- Same timeouts: per-cell caps from `test-matrix.md` enforced by the shared
  runner, never inside adapters.
- Same warmup: `-T 30` discarded for every arm including direct.
- Same invocation: identical pgbench flags per cell; only the port (pooler
  versus direct) changes.
- Same failure semantics: exit codes gated identically; `failed > 1%`
  rejects; 26000 in a prepared twin fails that arm cell; timeouts recorded
  as `timeout/inconclusive`.
- Same JSON schema for every cell result (section 3). Missing fields fail
  validation; extra per-pooler fields are forbidden.

## 3. Cell result JSON schema (normative)

```json
{
  "cell_id": "M1-2",
  "workload": "tpcb-like",
  "pooler": "pgbouncer",
  "pooler_version": "1.25.2",
  "pooler_config": "<verbatim config text>",
  "pg_version": "<SELECT version()>",
  "pg_config": {"shared_buffers": "512MB", "max_connections": 300},
  "scale": 10,
  "clients": 50,
  "pool_size": 10,
  "threads": 4,
  "protocol": "simple",
  "churn": false,
  "duration_s": 60,
  "warmup_s": 30,
  "repeat": 1,
  "seed": 42,
  "tps": 12345.6,
  "latency_avg_ms": 4.05,
  "latency_stddev_ms": 1.2,
  "p50_ms": 3.8,
  "p90_ms": 6.1,
  "p99_ms": 9.4,
  "p999_ms": 15.2,
  "failed": 0,
  "skipped": 0,
  "exit_code": 0,
  "status": "measured | N/A (unsupported) | timeout/inconclusive",
  " Artifacts": {"stdout": "<path>", "txnlog": "<path>", "agglog": "<path>"}
}
```

Field `status` uses exactly those three strings. `N/A (unsupported)` rows
carry null metrics, never zeros. Medians files aggregate repeats with median,
min, max, and CV per metric.

## 4. Calibration and pilot (Researcher-owned)

Sized to CI hardware (2-vCPU floor, 4-vCPU public): `-s 10`, `-j` equals vCPU,
warmup 30 plus measure 60 (flagship 120). Pilot runs M1-1 and M1-2, one repeat
per arm, interleaved. Separation rule: non-overlapping min-max bands on tps
or p99 between at least two pooler arms. If all arms tie, scale clients to 200,
then scale to `-s 20`, then extend to flagship duration, stopping at the first
separating step. If nothing separates, the Researcher documents the
no-separation finding and the Architect sizes M1 at the largest tested
envelope. No full sweep starts on an unjustified all-tie pilot.

## 5. Execution discipline

Same-runner round-robin chunking (follow the `postformer-cpu-train.yml`
chunked pattern): chunked jobs inside caps, resume and parallel discipline,
each chunk with its own direct control, artifacts committed as raw JSON plus
medians. One-command local repro (`poolduel/repro.sh` plus
`poolduel/README.md`) replays the matrix with identical procedure code.

## 6. Complexity notes for the Architect

Per-cell orchestration is O(cells x arms x repeats) process spawns with
O(1) extra state per cell; median math is a linear-time selection or sort of
at most 5 values per metric; per-transaction percentile math is a file-size
proportional sort (bounded by sampling rate). No algorithmic novelty is
claimed; rigor sits in fairness discipline, identical treatment, and
adversary-grade disclosure.

- Dr. Mob, the Researcher
