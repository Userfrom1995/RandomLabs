# Poolduel methodology (Researcher spec, Refs #302)

## 1. Question and yardstick

Which PostgreSQL connection pooler delivers the best throughput and tail
latency under real frontend fan-in (`clients >> pool_size`)? The primary
yardstick is `pgbench` TPC-B-like read-write (the industry standard for
Postgres throughput), plus SELECT-only, reconnect-per-transaction churn, and
prepared-statement traffic. References: https://www.postgresql.org/docs/17/pgbench.html,
https://www.pgpool.net/docs/latest/en/html/runtime-config-connection-pooling.html (pooling context),
https://www.pgbouncer.org/features.html (mode semantics).

## 2. Why pgbench

pgbench ships with Postgres, speaks both simple and extended protocols,
supports built-in TPC-B-like, SELECT-only, and simple-update workloads,
scales with `-s`, and reports a parseable `tps = N (...)` line (the
parenthetical reads `(without initial connection time)` without `-C`
and `(including reconnection times)` with `-C`; the parser accepts
either and prefers the steady-state line) plus latency averages.
Percentiles come from offline analysis of per-transaction logs (`-l`
without `--aggregate-interval`, microsecond `time_us` column), because
pgbench has no native percentile output. `--aggregate-interval` is
deliberately NOT passed: with it the log files carry aggregate SUM
lines that poison percentile math (M4 finding 2026-09-13: every
pre-M4 p99 was an aggregate sum off by ~1e4x; `parse_txn_log` now
skips aggregate-shaped lines and the runner merges all per-worker
files). Steady-state trimming comes from the discarded 30s warmup run.
Flags used (`-b -c -C -j -l -M -P -T
--sampling-rate --log-prefix --random-seed`) are stable across PG 15/16/17/18.

## 3. Dataset and run shape

Scale `-s 10` (1M accounts, roughly 150-200 MB with indexes): satisfies the
pgbench rule that scale must meet or exceed the largest client count, fits in
CI RAM next to PG plus pooler plus pgbench, and keeps pooler overhead visible
instead of drowned in buffer-miss noise. Fresh `pgbench -i -s 10` per chunk
(one init per chunk, not per cell: per-cell re-init would blow the 60 min
chunk cap; fairness holds because every arm in the chunk shares the same
dataset in interleaved round-robin order with its own direct control),
`CHECKPOINT` plus `VACUUM (ANALYZE)` before each measured block
(`harness/pgconf.py:dataset_policy_sql`), bloat accounting per chunk
(`bloat_accounting_sql`: database size into the chunk log).
Warmup `-T 30` discarded, measured `-T 60` (flagship `-T 120`). Three repeats
per cell, five for flagship; median headline with min-max band and CV.
Threads `-j` equal vCPU count and fixed equal to harness `--threads`
(`isolation.pgbench_j` pinned, never derived from victim CPU count).
Per-cell caps: 8 min standard, 12 min flagship.
Scale 100 (`-s 100`, roughly 1.5 GB) enters as a first-class scale via
the M8-P pilot (two geometries plus a churn twin, same per-chunk
discipline); the full scale-100 matrix joins M9 only after the pilot
proves the iron holds it (`docs/calibration.md` section 2).
Isolation record per arm-run (`harness/isolate.py`): CPU model, kernel,
nproc, frequency governor, threads, pinning discipline, topology.

## 4. Metrics

Throughput: `tps (without initial connection time)`. Latency: pgbench average
and stddev plus offline p50/p90/p99/p999 from per-transaction logs (filter
`skipped`, `failed`, serialization and deadlock markers before quantile math).
Errors: `number of failed transactions`, over-limit counts under `-L`,
skipped counts under `-R`, and exit codes (0 ok, 1 setup failure, 2 mid-run
SQL errors). Any SQLSTATE 26000 (`prepared statement does not exist`) in a
prepared twin fails that arm cell. No hidden errors; every number ships with
its full pgbench header block and exact pooler config.
Resource mechanism (M8+ rows, nullable before): per-run CPU seconds,
peak RSS, FD count, pool wait/queue counters where exposed, and
`pg_stat_database` deltas across the measured run
(`harness/resources.py`, `docs/calibration.md` section 3).

## 5. Fairness discipline (structural)

One harness, identical adapter contract (same timeouts, warmup, JSON schema,
failure semantics). Same machine, same PG build and config, freshly
initialized dataset per run, same client load, interleaved round-robin order,
medians. Every non-default pooler setting cites that pooler's own tuning docs
(`docs/configs/<pooler>.md`) or fails review. Best-vs-best per workload plus
iso-region slices on shared axes (clients, backends, duration). Unsupported
cells are `N/A (unsupported)`, never zero. Peaks carry exact configs plus
surface-flatness analysis (fast everywhere versus fast at one magic setting).

## 6. Comparison logic (M10 rebuild; old gate retired)

Headlines come from paired 95 percent bootstrap CIs on paired
differences across repeats (`harness/statistics.py`), never from
min-max bands alone. Repeats: flagship n>=10, standard n>=7, at
least 3 seeds, paired seeds across arms (M9; M1/M2 ran n=3-5
unpaired and are labeled as such wherever shown). A headline needs
all three: the paired CI excludes zero, the Holm-adjusted p-value
is below 0.05 across the matrix family, and no quarantine label
applies. Verdicts report effect plus CI first, verdict second,
p-value last or omitted. `Inconclusive` means the CI includes zero,
the evidence is quarantined, too few repeats survived, a
trimmed-mean sensitivity check flipped the verdict, or repeat
statuses mixed - and the entry says which, with forensics retained.
Outliers are flagged by a stated Tukey-IQR rule, never silently
dropped. Per-repeat p99/p999 feed the CI machinery at repeat level,
never pooled raw transactions across repeats; quarantined
p-latency forces labeled tps-only verdicts. The pre-M10 gate
(non-overlapping min-max bands plus tps/p99 directional agreement)
is retired as a headline rule and stays in the codebase and report
bundles for backward comparison only. Claims are comparative
deltas inside stated hardware envelopes only, never absolute
capacity claims. Version upgrades invalidate carried-forward
numbers and trigger re-runs.

## 7. Threats to validity (mandatory in the report)

1. Co-location: PG, pooler, and pgbench share 2-4 vCPUs; pgbench itself can
   bottleneck (documented `-j` sensitivity). Results rank arms on this
   hardware only.
2. Prepared-mode incompatibility: transaction pooling breaks server-side
   prepares unless the pooler tracks them; errors are findings, not harness
   bugs; every prepared cell has a simple-protocol twin.
3. Auth and startup asymmetry (RECORDED, not held constant): `-C` cells
   measure connect plus auth. The frontend auth posture differs by pooler
   and is disclosed, never silently equalized: Odyssey
   `authentication "none"` (CI-only frontend; backend leg always SCRAM
   via storage_user/storage_password), pgpool-II `pool_hba` disabled
   (default; backend SCRAM via pool_passwd), PgBouncer/pgagroal/pgcat
   SCRAM against their user/vault files, Supavisor SCRAM on tenant users
   (`benchuser.bench` user.tenant rewrite; M7 onboarding, symmetric with
   the SCRAM arms, covered by the M9-E1 control without special-casing).
   Every raw row carries its
   `auth_posture` label (`harness/auth.py`). The equalized-auth control
   M9-E1 (SCRAM on every frontend, same G-CHURN100 geometry) runs
   beside these labeled asymmetric arms in the M9 resweep so churn
   deltas measure multiplexing, not auth cost. Reset queries
   (`DISCARD ALL`-style) are part of the fair cost of multiplexing,
   held constant and reported. Effective server settings per arm-run
   are captured in each record's `pg_show` block (`SHOW max_connections,
   shared_buffers, synchronous_commit, fsync, password_encryption`,
   best-effort, `{}` when unavailable) with the enforcement verdict in
   `pg_config_status` (`enforced` / `disclosed` with divergence list /
   `unknown`); requested-vs-effective divergence is a blocking defect.
4. Session-state leakage: custom scripts must stay transaction-scoped
   (`SET LOCAL`, `pg_advisory_xact_lock`); builtins already do.
5. Reset-query cost: `DISCARD ALL` style resets are part of the fair cost of
   multiplexing, held constant and reported.
6. Autovacuum and checkpoints: fixed `CHECKPOINT`, identical vacuum defaults,
   warmup trimming via the discarded 30s warmup run (per-transaction logs,
   never aggregate-interval sums).
7. Shared-runner noise: handled by interleaving and medians, never by static
   baselines or single runs.

## 8. Reproducibility by adversary

Disclosure must let any pooler's own maintainers reproduce a cell or file a
founded objection: exact versions and SHAs, verbatim configs, full pgbench
invocations with seeds, raw logs, median math, and a one-command local repro
(`poolduel/repro.sh` plus `poolduel/README.md`). The Tester independently
reproduces at least one sample cell.

- Dr. Mob, the Researcher
