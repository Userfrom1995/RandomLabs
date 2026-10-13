# Poolduel Calibration (M8)

> **Status**: normative for the redesign chain (M5-M12). Refs #302.
> **Rule**: calibration proves scale and warmup before the M9 matrix
> burns its budget. Nothing here is measured yet; every spec below is
> defined in M8 and runs in the M9 resweep.

## 1. Warmup sensitivity curve (M8-C1)

The 30 s provisional warmup used by every M1/M2 cell is proven, not
asserted. One geometry (M1-1 shape: select-only, 100 clients, pool 10,
direct arm) runs at each candidate warmup in
`harness/calibrate.py:WARMUP_CANDIDATES` (0, 10, 30, 60 s) with fixed
60 s measure and 3 paired repeats per point (12 runs, direct arm).

Decision rule (`evaluate_warmup_curve`, tolerance 5 percent): the
smallest warmup whose median tps sits within 5 percent of the best
observed median wins. If no candidate reaches tolerance, warmup rises
above the largest tested value and the curve re-runs; the 30 s
provisional is replaced, never kept on faith.

## 2. Scale-100 pilot (M8-P)

Scale 100 becomes first-class, not nightly-only. Three pilot cells at
`-s 100` (10M accounts, roughly 1.5 GB with indexes) twin two M1
geometries plus a churn twin with M2 standard timing (30 s warmup
provisional pending the curve, 60 s measure, 3 repeats):

| Cell | Workload | clients | pool | ratio |
|---|---|---|---|---|
| M8-P1 | select-only | 100 | 10 | 10x |
| M8-P2 | tpcb-like | 50 | 10 | 5x |
| M8-P3 | select-only churn | 100 | 10 | 10x |

Dataset discipline matches scale 10: one `pgbench -i -s 100` per
chunk, `CHECKPOINT` plus `VACUUM (ANALYZE)` before each measured
block, bloat accounting per chunk. The full scale-100 matrix joins M9
only after the pilot proves the iron holds it (init time fits the
chunk cap, no OOM, medians separate).

## 3. Resource fields (per raw row, all nullable)

Throughput without mechanism is marketing. Every M9 raw row carries
`resources` (`harness/resources.py`): harness-side CPU seconds and
peak RSS (`getrusage`), open FD count (`/proc/self/fd`), pool
wait/queue counters where the pooler exposes them (PgBouncer
`SHOW POOLS` waiting, Odyssey statistics, pgcat admin pools; None
until an adapter reports them, never fabricated), and `pg_stat_database`
deltas (commits, rollbacks, block hits/reads, tuples, conflicts,
deadlocks, temp bytes) across the measured run. M1/M2 rows predate
this block and stay valid without it.

## 4. Workload breadth (M9 matrix additions)

| Workload | Shape | pgbench mechanism |
|---|---|---|
| `zipf-select` | skewed read over `pgbench_accounts` | custom script, `\setrandom ... zipfian` |
| `think-time` | select-only under client think time | `-S` plus `-R`/`-L` fixed offer |
| `multi-statement` | one txn, several statements | custom `BEGIN..END` script |
| `jsonb-write` | UPDATE on a jsonb side table | custom script, DDL at dataset init |
| `copy-adjacent` | multi-row INSERT batch | custom script, no COPY protocol |
| fixed-offer modifier | any base under a capped offer rate | `-R rate` plus optional `-L limit` |

Side-table DDL (`poolduel_jsonb`, `poolduel_copy`) runs once at
dataset init, never per cell. Over-limit transactions under `-L`
count as skipped, never hidden.

## 5. Pipeline mode stays forbidden

Pipeline mode (`\startpipeline`) is forbidden with written reason
(`harness/workloads.py:PIPELINE_FORBIDDEN_REASON`, spec-v1.md s2):
it changes extended-protocol semantics rather than pooling behavior,
and fewer than all contenders implement it, so a pipeline cell could
never be best-mode-compared on shared load. Statement batching
coverage comes from the `multi-statement` workload instead, which
stays inside the standard protocol.
