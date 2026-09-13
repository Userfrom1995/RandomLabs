# Poolduel test matrix (Researcher spec, Refs #302)

Normative cell list the Architect and Builder must implement. Every measured
pooler cell satisfies `clients >> pool_size`. Any cell with
`clients <= pool_size` is rejected as measuring nothing.

## 0. Fixed foundations (identical for every arm)

- PostgreSQL: pinned build, version recorded in `docs/versions.md`; config
  identical for all arms (`shared_buffers`, `max_connections >= 300`,
  `synchronous_commit = on`, `fsync = on` unless a labeled non-durable variant).
- Dataset: freshly re-initialized per run (`pgbench -i -s 10`), `CHECKPOINT`
  before each measured run, default vacuum behavior constant everywhere.
- pgbench threads: `-j` equals runner vCPU count (4 public, 2 private floor).
- Warmup: `-T 30` untimed warmup discarded, then measured run. Flagship cells
  use measured `-T 120`; standard cells measured `-T 60`.
- Repeats: 3 per cell (5 for flagship). Headline is the median; min-max band
  and CV published alongside.
- Order: round-robin interleaved across arms per repeat (A,B,C,A,B,C...),
  never blocked (AAxBBxCC). Same-runner discipline: every chunk carries its
  own direct-PG control arm.
- Logging per cell: `-P 10 -l --log-prefix=cell-<id>` (per-transaction
  rows; `--aggregate-interval` is never passed - its SUM lines poisoned
  pre-M4 percentiles); add `--sampling-rate=0.1` only if
  per-transaction logs threaten 200 MB.
- Metrics per cell: throughput (tps, `without initial connection time` line),
  latency avg/stddev plus offline p50/p90/p99/p999 from per-transaction logs,
  failed/skipped counts, exit code. Cells with `failed > 1%` are rejected.
- Unsupported cells: `N/A (unsupported)`, never zero, never interpolated.
- Timeout cells: `timeout/inconclusive`, never extrapolated.

## 1. Workloads (pgbench)

| Workload id | pgbench flags | Meaning |
|---|---|---|
| `tpcb-like` | `-b tpcb-like` (default 7-statement read-write) | Primary yardstick |
| `select-only` | `-S` | Pooling overhead floor, highest tps |
| `simple-update` | `-N` | Write pressure without branch-row hotspot |
| `prepared-*` | same as above plus `-M prepared` (twin of a `-M simple` cell) | Prepare-tracking path; SQLSTATE 26000 fails the arm cell, twin still compares |
| `churn-*` | same as above plus `-C` (twin of a non-`-C` cell) | Connect/auth storm per transaction |
| `capped` (nightly only) | `-R <rate>` fixed-offer with schedule-lag accounting | Latency under fixed offer, p99 focus |

Protocol rule: M1 uses `-M simple` except the one `-M prepared` twin pair.
Pipeline mode (`\startpipeline`) is forbidden unless all five poolers support
it (they do not). `-r` (per-command timing) is never mixed with non-`-r` runs.

## 2. M1 matrix: transaction pooling plus control (normative)

Fixed: scale `-s 10`, pool_size 10 unless noted, 3 repeats (5 flagship).

| # | Workload | clients `-c` | pool_size | ratio | `-M` | `-C` | Arms measured |
|---|---|---|---|---|---|---|---|
| M1-1 | select-only (flagship, `-T 120`, 5 reps) | 100 | 10 | 10x | simple | no | pgagroal/txn, PgBouncer/txn, Odyssey/txn, pgcat/txn, pgpool-II/session-class, direct |
| M1-2 | tpcb-like (flagship, `-T 120`, 5 reps) | 50 | 10 | 5x | simple | no | same six arms |
| M1-3 | tpcb-like prepared twin | 50 | 10 | 5x | prepared | no | same six arms; 26000 errors fail the arm cell |
| M1-4 | select-only saturation | 200 | 10 | 20x | simple | no | same six arms |
| M1-5 | simple-update | 100 | 20 | 5x | simple | no | same six arms |
| M1-6 | select-only churn twin | 100 | 10 | 10x | simple | yes (`-C`) | same six arms; always paired with M1-1 |
| M1-7 | tpcb-like heavy | 100 | 10 | 10x | simple | no | same six arms |

pgpool-II runs its single session-class config in every M1 row (it has no
transaction mode); that is the honest comparison, labeled as such.
Every row includes the direct-PG control. Minimum ratio is 5x; flagship rows
are 5x and 10x; saturation row is 20x.

## 3. M2 matrix: remaining modes, I/O variants, extra workloads (normative)

M2 reuses the M1 procedure code and per-cell budgets with new axes.
Shared axes for iso-region matching stay fixed: clients, backends
(pool_size), duration. Compare best-vs-best per workload plus iso-region
slices on those shared axes.

| # | Axis | Cells |
|---|---|---|
| M2-modes | Session arms | pgagroal `session` + `performance`, PgBouncer `session`, Odyssey `session`, pgcat `session`, pgpool-II session-class; workloads M1-1 and M1-2 only (bounded budget) |
| M2-stmt | Statement arms | PgBouncer `statement`, Odyssey `statement` (provisional, verify empirically); workloads M1-1 and M1-2 only; pgagroal/pgpool-II/pgcat record N/A |
| M2-io | I/O backends | pgagroal `ev_backend` in {`io_uring`, `epoll`}; PgBouncer instances {1, 2 with `so_reuseport`}; Odyssey `workers` in {1, 2, 4}; pgcat `worker_threads` in {1, 5}; workloads M1-1 and M1-2 only |
| M2-wl | Extra workloads | `simple-update` at M1-5 geometry for every M2 arm above; one `churn` twin (M1-6 geometry) for session arms; one `prepared` twin (M1-3 geometry) for arms that claim prepare support |

Out of scope for M2: pgcat sharding and read/write splitting, Odyssey
`shared_pool`, pgpool-II clustering modes beyond a single documented
`raw`/standalone choice. Any addition needs a Researcher addendum with
equivalent chances for all poolers.

## 4. Grid: numeric knob ranges (normative, see docs/grid.md)

The full per-pooler knob ranges and step lists live in `docs/grid.md`.
Iso-region rule: every pooler is swept over the shared axes
(clients in {50, 100, 200}, pool backends in {10, 20}, duration fixed per
workload class) so any best-vs-best claim can be accompanied by at least one
iso-region slice where clients, backends, and duration match exactly.
Per-pooler private knobs (timeouts, discard toggles, worker counts) are swept
within the bounded ranges in `docs/grid.md` under the same total cell budget
per pooler; the budget itself is published and equal.

## 5. Cell budget and chunking (normative)

- Same total measured-cell budget per pooler. M1: 7 workloads x 3-5 repeats
  as tabled. M2 additions are bounded by the M2 table (2 workloads per new arm).
- Wall clock per standard arm-cell is about 2.5 min (30 warmup + 60 measure
  plus setup); flagship about 3.5 min. A full M1 sweep is chunked into at
  least 4 job chunks (for example by workload pair), each chunk with its own
  direct control and interleaved repeats, each chunk under 60 min wall clock.
- Per-cell caps: standard 8 min, flagship 12 min, churn and prepared 8 min,
  nightly capped cell 12 min. Over-cap cells are `timeout/inconclusive`.
- Nightly-only: `capped` fixed-offer cell and one `-s 100` large-scale repeat
  of M1-2. Never part of the per-PR gate.

## 6. Artifacts per cell (normative)

Raw pgbench stdout plus header block (scale, clients, threads, duration,
query mode, seed), per-transaction logs or aggregate-interval logs,
computed medians JSON, and the exact pooler config verbatim. Raw JSON plus
medians are committed. No bare tps without its config block.

## 7. Pilot discrimination gate (normative)

Before the full M1 sweep, the harness runs a pilot of M1-1 and M1-2 only,
one repeat per arm, interleaved. If all arms tie within overlapping min-max
bands, the Researcher scales up (200 clients, then `-s 20`, then flagship
`-T 120`) until arms separate or documents why separation is impossible on
CI hardware. The full sweep does not start on an all-tie pilot without that
written justification. Claims are comparative deltas inside stated envelopes
only.

## 8. Anti-theater checklist (Reviewer enforced)

Home-team tuning (one pooler hand-tuned while others sit at defaults),
sabotage by omission (missing `max_prepared_statements`, wrong `workers`,
starved `num_init_children`), cherry-picked workloads (reporting only the
workload a favorite wins), hidden failures (dropped error counts, interpolated
N/A as zero), carried-forward numbers across version upgrades. Any violation
fails the PR. The Tester independently reproduces at least one sample cell.

- Dr. Mob, the Researcher
