# Poolduel fairness audit (M3 pre-sweep pass, Refs #302)

Method: every non-default pooler setting below was re-checked against that
pooler's own tuning docs on 2026-09-11. A setting without a doc citation
FAILS review. This audit re-runs after the sweeps before any gate passes.

## 1. Per-pooler non-default checklist

### pgagroal ([config](configs/pgagroal.md))

- `pipeline = transaction` (M1): the transaction pipeline releases backends
  at ReadyForQuery; cited: https://pgagroal.github.io/doc/PIPELINES.html
- M2 `session` / `performance` pipelines: same page; `auto` is never
  benchmarked directly (resolved and recorded instead).
- `ev_backend` io_uring vs epoll: https://pgagroal.github.io/doc/ARCHITECTURE.html
- `max_connections` 10/20 (iso backends), per-db `MAX_SIZE` matched:
  https://pgagroal.github.io/doc/CONFIGURATION.html
- `blocking_timeout` 0 in transaction mode, 30 s in session modes;
  `idle_timeout` / `max_connection_age` 0; `validation` off; `nodelay` /
  `keep_alive` on: same configuration reference.
- Verdict: no home-team tuning; defaults kept everywhere the docs do not
  direct otherwise.

### PgBouncer ([config](configs/pgbouncer.md))

- `pool_mode` transaction (M1) / session / statement (M2):
  https://www.pgbouncer.org/usage.html, https://www.pgbouncer.org/features.html
- `default_pool_size` 10/20 (iso backends); `max_client_conn` 500 (ceiling
  above the 200-client row): https://www.pgbouncer.org/config.html
- `max_prepared_statements` 0 in simple cells, 200 in prepared twins (1.21+
  rewrite layer): same config reference plus features page.
- `server_reset_query = DISCARD ALL`: https://www.pgbouncer.org/faq.html
- Timeouts disabled (0) as shipped; 1 vs 2 instances via `so_reuseport`
  (single-threaded by design): config reference `so_reuseport` section.
- Verdict: prepared support is opt-in per upstream (not sabotage by omission);
  the simple twin always compares beside the prepared twin.

### pgpool-II ([config](configs/pgpool-II.md))

- Session-class only is the honest mapping: pgpool-II has no transaction,
  statement, or pipeline pooling mode, only session-scoped connection caching
  (`connection_cache = on`):
  https://www.pgpool.net/docs/latest/en/html/runtime-config-connection-pooling.html
- `num_init_children` 100 (M1 rows up to 100 clients), 200 for the 200-client
  row, M2 sweep 100x1/200x1: children cap concurrent clients, excess blocks.
- `max_pool` 1 keeps `children x max_pool` inside PG `max_connections`; the
  forbidden 200x4 corner is substituted with 200x1 (documented in grid.md).
- `reset_query_list = 'ABORT; DISCARD ALL'`, load balancing off, clustering
  fixed to one documented standalone choice.
- Verdict: labeled session-class everywhere, never compared as transaction
  pooling; N/A recorded (not zero) where modes do not exist.

### Odyssey ([config](configs/odyssey.md))

- `pool` transaction (M1) / session (M2):
  https://pg-odyssey.tech/features/pooling.html,
  https://pg-odyssey.tech/configuration/rules.html
- `pool = statement` is accepted by the config type string but documented
  only as session/transaction upstream: benchmarked as a labeled provisional
  arm, verified empirically, never presented as first-class.
- `pool_size` 10/20 (iso backends); `workers` 1 (M1) swept 1/2/4 (M2 I/O
  axis); `pool_discard = yes`, `pool_cancel` / `pool_rollback = yes`:
  https://pg-odyssey.tech/configuration/global.html
- `pool_reserve_prepared_statement` yes plus `server_pstmt_cache_size` only
  in the statement prepared twin (incompatible with session pooling, hence
  the session prepared N/A): same rules reference.
- Verdict: provisional labeling is the anti-sabotage control; session
  prepared is N/A with a written reason, not a hidden failure.

### pgcat ([config](configs/pgcat.md))

- `pool_mode` transaction (M1) / session (M2); statement declared in code but
  documented UNSUPPORTED: recorded N/A, never benchmarked:
  https://github.com/postgresml/pgcat/blob/main/CONFIG.md
- per-user `pool_size` 10/20 (iso backends); `general.worker_threads` 5 (M1),
  swept 1 vs 5 (M2): same config reference.
- `prepared_statements_cache_size` 0 (transaction plus prepared is N/A per
  upstream README); splitting/sharding off at defaults.
- Verdict: no statement-mode ambush; read/write splitting excluded for all
  poolers equally (none do it natively).

## 2. Budget parity (published, reviewer-verifiable via `cli --list-m2`)

M1: 7 workloads per pooler, identical procedure code and caps. M2 realized
measured rows: pgagroal 11, PgBouncer 12, Odyssey 11, pgcat 9, pgpool-II 9,
plus the direct control in every chunk. Each new M2 arm rides at most 2
workloads (test-matrix cap). The residual spread is structural (one pgpool-II
mode, no pgcat statement mode) and published in the report; it favors no arm
because every measured AND every N/A row is committed.

## 3. Anti-theater checklist (pre-sweep)

- [x] No home-team tuning: every non-default cites upstream docs (section 1).
- [x] No sabotage by omission: `max_prepared_statements`, `workers`,
  `num_init_children`, and reset queries set per docs, not starved.
- [x] No cherry-picked workloads: primary TPC-B-like plus SELECT-only,
  churn, and prepared twins always paired; wins and losses published alike.
- [x] No hidden failures: errors/timeouts counted per cell, never dropped.
- [x] No interpolated N/A: nulls in JSON, empty fields in CSV, labeled cells
  on the page.
- [x] No carried-forward numbers: versions pinned (`docs/versions.md`);
  any upgrade triggers a re-run.
- [ ] Tester independent reproduction of at least one sample cell (runs at
  test phase, after sweep data exists).
- [ ] Post-sweep re-check of committed configs against this audit (runs at
  review phase, before any gate passes).

## 4. Post-sweep gate (blocking)

Before any `Closes`, the Reviewer re-verifies: committed `pooler_config`
blocks byte-match (modulo ports/paths) the baselines in `docs/configs/`;
the CSV contains every measured cell plus all 7 N/A rows; medians show
non-overlapping bands with tps/p99 agreement for every claimed delta;
`report.json` flatness and iso slices render on the page. Any violation
fails the PR and the issue stays open on `Refs`.

## 5. Post-sweep re-check (Builder M4 run, 2026-09-12, Refs #302)

Verified mechanically against the committed sweep on this branch:

- Raw records: 469 JSON files under `poolduel/results/m*/raw/`; every
  record carries a non-empty `pooler_config` block plus `pooler_version`.
- Doc-cited keys present in the committed configs: PgBouncer
  `pool_mode`, pgagroal `pipeline`, Odyssey `pool`, pgcat `pool_mode`,
  pgpool-II `num_init_children`. (Full byte-match modulo ports/paths
  remains the Reviewer's blocking check in section 4.)
- Medians: 42 M1 + 111 M2 entries; all 7 M2 N/A rows carry nulls (never
  zeros); `m2/matrix.csv` holds all 111 rows.
- `report.json` flatness (6 poolers) and iso slices render on the page:
  the M4 comparison page hosts 8 ECharts figures and the Tier-0 probe
  screenshot shows live medians (M1-1 direct 25405.035073 visible).
- Timeout cells (pgcat M2 7, pgagroal M2 7) are surfaced as marked
  findings on every chart, never gap-filled, never re-measured.

Tester sample-cell reproduction still runs at test phase (section 3 box
unchecked until then). No `Closes` is claimed: the binding close rule
needs explicit @Userfrom1995 approval.

- the Builder

## 6. Owner-review re-check (Builder, 2026-09-13, Refs #302)

Owner review of 2026-09-13T07:13:22Z (5 blocking groups) re-verified
against the committed sweep plus the harness fixes on this branch:

- p99 parser (binding): pre-M4 percentiles were aggregate SUM lines read
  as latencies (proven on local pgbench 16.15/17.11: `--aggregate-interval`
  switches the log to `interval_start num_tx latency_sum ...`). All 107
  measured medians carry the documented `p_quarantined: true` flag with
  nulled p-summaries; raw records untouched. Binding gates re-evaluated
  on the same data: 49 tps-decided `A faster` + 5 `inconclusive` (was
  46/54 inconclusive on poisoned p99s). Fresh sweeps write per-transaction
  logs (no aggregate flag, all worker files merged) and refill real
  percentiles; until then no p99-backed headline stands.
- Churn block: M1-6 all arms (incl. direct) plus M2-W6..W10 showed exit 0
  with null tps because the parser only accepted `(without initial
  connection time)` while `-C` runs print `(including reconnection
  times)` (proven locally). Fixed and covered; churn cells re-run
  selected-only after merge.
- Session cells: M2-S1..S4 (pgagroal, `FATAL: connection pool is full`
  in 30.1s) and M2-S9/S10/S13/S14 (pgcat, `AllServersDown` in 1.0s)
  were admission-timeout config items, proven from the m2a1/m2a2 chunk
  workdirs - not pooler rankings. Fixes (session variants only, M1
  byte-identical): pgagroal `blocking_timeout` 30s to 120s, pgcat
  per-user `connect_timeout` 1000ms to 120000ms, both at admission
  parity with PgBouncer `query_wait_timeout = 120s` (pgcat CONFIG.md
  blesses the comparison). Backend pools unchanged (pool_size per
  cell). Re-run selected session cells only after merge.
- Churn auth posture (recorded, not equalized): Odyssey frontend
  `authentication "none"` (CI-only; backend SCRAM via storage
  credentials) and pgpool-II frontend `pool_hba` disabled (default;
  backend SCRAM via pool_passwd) versus SCRAM client auth on
  PgBouncer/pgagroal/pgcat. Threats section 3 and methodology record
  the asymmetry; `pg_show` blocks (SHOW max_connections,
  shared_buffers, synchronous_commit, fsync, password_encryption,
  best-effort) now ride every new raw record (schema-optional, old
  records stay valid).
- Dataset init (doc-vs-code resolved): the runner never re-inited per
  cell - init runs once per chunk plus `CHECKPOINT` before each
  measured run (workflow-verified). Methodology section 3 now says
  per chunk; fairness holds via interleaved round-robin plus
  per-chunk direct control.
- pgpool backend-count label kept: every pgpool cell runs
  `children x max_pool` dedicated backends (100-200, 1:1 or more),
  labeled in `docs/configs/pgpool-II.md` and on the pgpool deep-dive
  page - process-per-connection architecture, never counted as
  multiplexed pooling.
- Charts/pages: natural x-sort, log twins, off-baseline markers with
  labels, dropped-empty series named in subtitles, cross-matrix
  iso-overlay preferred (simple-update M1-5 + M2-W1..W5 and prepared
  M1-3 + M2-P1..P6 both live), flatness trough workloads named,
  per-chart peak/n/warmup/hardware subtitles, rich loader tooltips
  (n, CV, p99, verdict, config path), per-pooler full config+results
  tables over HTTP with honest fetch-failure notes.

Still pending after this branch (Maintainer-owned): selected-cell
sweeps (churn block + pgagroal/pgcat session cells) with the fixed
harness, Tester sample-cell repro, Pages deploy showing numbers.
`Refs #302` throughout; no `Closes` without explicit @Userfrom1995
approval.

- the Builder
