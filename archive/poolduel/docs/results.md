# Poolduel results guide: how numbers are computed, compared, exported

Refs #302. This document is the normative reading guide for every number on
`/poolduel/` and every file under `poolduel/results/`. Until the CI sweeps
run, the results directories contain no medians and the report page stays
honestly pending: no zeros, no interpolation, no carried-forward numbers.

## 1. From raw repeats to medians

Each measured arm-run produces one raw record (see `docs/harness-contract.md`
for the JSON schema): `tps` parsed from pgbench's
`tps (without initial connection time)` line, latency average/stddev, plus
offline p50/p90/p99/p999 from per-transaction logs, failed/skipped counts,
and exit codes. Cells with more than 1% failed transactions are rejected;
prepared twins carrying SQLSTATE 26000 fail that arm cell while the
simple-protocol twin still compares.

`harness/report.py aggregate()` groups repeats by (cell_id, pooler) and
publishes median/min/max/CV with `n`. Mixed statuses inside a group collapse
to `timeout/inconclusive` (never a median over partial success); mixed
measurement context is flagged (`context_mixed: true`) rather than hidden.

## 2. Comparison logic (binding gate)

A headline delta requires BOTH non-overlapping min-max bands across repeats
AND same-direction agreement of tps (higher is better) and p99 (lower is
better), via `harness/stats.py compare_pair()`. Anything else is
`inconclusive` and the issue stays open on `Refs`, never `Closes`, for
negative or marginal results. Claims are comparative deltas inside the stated
CI hardware envelope only, never absolute capacity claims.

## 3. Best-vs-best plus iso-region slices

Settings do not map 1:1 across poolers, so each pooler's full documented
space is swept under equal cell budgets and compared two ways:

- **Best-vs-best per cell/workload**: the head arm is the highest tps median;
  every other arm carries its binding-gate verdict against the head, so a
  higher median with overlapping bands honestly reads `inconclusive`.
- **Iso-region slices**: groups on the shared axes (workload, clients,
  backends, duration, protocol, churn) where configs match exactly, for
  example M1-1 beside M2 session rows on the shared G-SEL100 geometry.

## 4. Surface flatness

Spread is (peak minus trough) over peak across each pooler's own measured
tps medians. At or below 15% the surface reads `flat` (fast everywhere);
above it reads `peaky` (fast at one magic setting); a single measured config
reads `single-point` (never a verdict on one cell). Peaks always ship with
their exact configs attached.

## 5. N/A and timeout semantics

- `N/A (unsupported)`: the pooler has no such mode (pgagroal/pgcat statement,
  pgpool-II transaction/statement, Odyssey session-prepared). Nulls, never
  zeros, never interpolated. Published in the same tables, never hidden.
- `timeout/inconclusive`: the run exceeded its per-cell cap (8 min standard,
  12 min flagship) or failed validation. Never extrapolated.

## 6. Artifact schemas

Per matrix (`results/m1/`, `results/m2/`):

- `raw/*.json`: per-repeat cell records (schema-validated, exact pooler
  config verbatim in `pooler_config`).
- `medians.json`: aggregated entries (`cell_id`, `pooler`, metric summaries
  with median/min/max/cv/n, plus measurement context). Same shape as the
  harness `write_medians` output plus context fields; the report page reads
  this live.
- `matrix.csv`: full matrix, every measured and N/A cell. Columns:
  `cell_id,pooler,workload,clients,pool_size,protocol,churn,duration_s,
  n,status,tps_median,tps_min,tps_max,tps_cv,p50_ms,p90_ms,p99_ms,p999_ms`.
  N/A metric fields are empty, never zero.
- `results/report.json`: machine-readable bundle (`best`, `pairwise`,
  `iso_regions`, `flatness`, versions) backing the report charts and tables.

Build them with one command after any sweep:

```sh
./poolduel/repro.sh --report
```

which runs `python3 -m poolduel.harness.report` over every committed
`results/m1*` / `results/m2*` directory. With no sweep data on disk the
builder fails loudly instead of inventing numbers.

- the Builder
