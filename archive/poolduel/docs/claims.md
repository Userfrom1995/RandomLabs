# Poolduel Claim Registry (pre-registered before the resweep)

> **Status**: normative for the redesign chain (M5-M12). Refs #302.
> **Rule (plan section 4)**: anything not registered here cannot become a
> headline later. Headline cards on the site show verified numbers only;
> provisional candidates stay labeled or absent until the resweep plus
> statistics rebuild (M9+M10) re-derives them with paired 95 percent CIs.

## 1. Primary metric

`tps without initial connection time` (pgbench `tps (without initial
connection time)`), median over repeats per (cell, pooler) arm, with the
paired-difference 95 percent bootstrap CI as the uncertainty.

Rationale: connection-establishment cost is a pooler-external one-time
artifact of the benchmark client, not of steady-state pooling. The
including-connect figure is retained per arm for audit, never headlined.

## 2. Secondary metrics

Reported beside every primary, never collapsed into a single score:

- `p99` (per-repeat p99 fed into the CI machinery at repeat level, never
  pooled raw transactions across repeats), plus `p999` where the repeat
  count supports it
- `errors` (failed/skipped counts, exit codes per repeat)
- `cpu_time` per run (M8+ resource fields; nullable for M1/M2 rows)
- `peak_rss` per run (M8+; nullable for M1/M2 rows)
- `fd_count` per run (M8+; nullable for M1/M2 rows)
- `pool_wait` counters where the pooler exposes them (M8+; None until
  an adapter reports them, never fabricated)
- `pg_stat` deltas across the measured run (M8+; nullable for M1/M2)

## 3. Headline comparisons (registered)

Only these comparisons may become headline cards, and only after M10
re-derives each with a paired CI that excludes zero:

| # | Plain-words claim | Cells | Current evidence | Status |
|---|---|---|---|---|
| 1 | Multi-process PgBouncer (`so_reuseport`, 2 instances) removes the single-core ceiling and can approach or pass direct-PG on read-heavy load | M2 I/O twins (1 vs 2 instances) beside M1-1 geometry | Draft: ~26,347 TPS vs ~17k single-instance | PROVISIONAL |
| 2 | Under per-query connect/disconnect churn, direct PG and pgpool collapse on fork cost while Odyssey and pgcat hold throughput | M1-6 plus M2 churn twins | Draft: direct ~265, pgpool ~266, Odyssey ~6,495, pgcat ~5,709; M1-6 read all-timeout at last merge | PROVISIONAL |
| 3 | For short queries on this iron, pgagroal `epoll` beats `io_uring` on throughput and tail latency | M2 I1-I4 (`ev_backend` twins) | Draft: epoll ~2,584 TPS / ~24.5 ms p99 vs io_uring ~343 TPS / ~1,116 ms p99 | PROVISIONAL |
| 4 | At 200 clients on a 10-connection pool, pooled arms hold throughput while direct PG degrades | M1-4 saturation row | Draft: pgcat ~19,322, PgBouncer ~17,129; direct plus pgpool read timeout | PROVISIONAL |
| 5 | Transaction pooling breaks server-side prepares unless the pooler virtualizes the extended protocol; process-isolated arms survive | M1-3 plus M2 prepared twins | Draft: only direct plus pgpool ranked (~3,127 for pgpool), rest timeout | PROVISIONAL |

Kill rule: any candidate whose paired CI includes zero, or which depends
on quarantined p-latency, ships as `inconclusive`, never as a win.

## 4. Non-goals (explicit)

- No absolute capacity claims (numbers are valid for the stated iron and
  PG build only; see `spec-v1.md` hardware envelope).
- No cross-hardware numbers (comparisons across machines are never made).
- No single-score rankings (every claim ships beside at least one
  iso-region slice on shared axes).
- No carried-forward numbers across pooler/PG version upgrades (any
  upgrade means a re-run of affected cells).

## 5. Verification mapping

- Pre-registration: this file (M5, committed before any resweep).
- Re-derivation: M9 resweep (powered paired repeats) + M10 statistics
  rebuild (paired bootstrap CIs, Holm correction, outlier rule).
- Publication: M11 website (executive cards verified-only).
- Provenance: every published number links to config + raw logs + repeat
  set (M12 trust machinery).
