# Poolduel parameter grid (Researcher spec, Refs #302)

Every range below comes from the pooler's own tuning docs (links in
`docs/modes.md` and `docs/configs/<pooler>.md`). The grid is published before
any sweep. Equal total measured-cell budget per pooler; best-vs-best compared
per workload plus iso-region slices on shared axes (clients, backends, duration).

## 0. Shared axes (identical for every pooler, iso-region basis)

| Axis | Values | Notes |
|---|---|---|
| `clients` (`-c`) | {50, 100, 200} | Always `>> pool_size`; min ratio 5x |
| `backends` (pool size) | {10, 20} | Canonical pooler knob mapped per pooler below |
| `duration` | standard measured `-T 60`, flagship `-T 120` | Plus discarded `-T 30` warmup everywhere |
| `threads` (`-j`) | vCPU count (4 public, 2 private) | Fixed, never a sweep axis |
| `scale` (`-s`) | 10 (M1/M2); 100 nightly-only | Fixed per run class |
| `repeats` | 3 (5 flagship) | Median headline |

Backend knob mapping: pgagroal `max_connections` + per-db `MAX_SIZE`;
PgBouncer `default_pool_size` (or per-db `pool_size`); pgpool-II
`max_pool * num_init_children` ceiling with `max_pool` swept;
Odyssey per-route `pool_size`; pgcat per-user `pool_size`.

## 1. pgagroal grid

Ref: https://pgagroal.github.io/doc/CONFIGURATION.html,
https://pgagroal.github.io/doc/PIPELINES.html

| Knob | Grid values | Default |
|---|---|---|
| `pipeline` | {`transaction` (M1), `session`, `performance` (M2)} | `auto` (never benchmarked directly) |
| `ev_backend` | {`io_uring`, `epoll`} | `auto` |
| `max_connections` | {10, 20} (iso backends) | 100 |
| per-db `MAX_SIZE` | matches `max_connections` | unset |
| per-db `INITIAL_SIZE`, `MIN_SIZE` | prefilled to `MAX_SIZE` (all > 0, mandatory for transaction) | 0 |
| user vault (`-u`) | benchuser defined (mandatory for transaction) | unset |
| `blocking_timeout` | {0 (transaction mode per docs), 120s (session modes, admission parity with PgBouncer 120s)} | 30s |
| `idle_timeout`, `max_connection_age` | {0} (disabled per transaction-mode advice) | 0 |
| `validation` | {off} (M1/M2 baseline) | off |
| `track_prepared_statements` | {off, on} (transaction prepared twin only) | off |
| `nodelay`, `keep_alive` | {on} fixed | on |

`allow_unknown_users = false` (mandatory for the transaction pipeline per
the upstream validator; upstream `test/conf/01-02` pin the same),
`disconnect_client`, TLS, failover stay at defaults (0 / off) unless a
documented M2 variant says otherwise.

## 2. PgBouncer grid

Ref: https://www.pgbouncer.org/config.html

| Knob | Grid values | Default |
|---|---|---|
| `pool_mode` | {`transaction` (M1), `session`, `statement` (M2)} | `session` |
| `default_pool_size` | {10, 20} (iso backends) | 20 |
| `max_client_conn` | {500} fixed (ceiling above 200 clients) | 100 |
| `max_prepared_statements` | {0 (simple cells), 200 (prepared twin)} | 200 |
| `server_reset_query` | {`DISCARD ALL`} fixed | `DISCARD ALL` |
| `reserve_pool_size` / `reserve_pool_timeout` | {0 / 5.0} fixed at defaults | 0 / 5.0 |
| `min_pool_size` | {0} fixed | 0 |
| `server_lifetime` / `server_idle_timeout` | {3600.0 / 600.0} fixed at defaults | same |
| `query_wait_timeout` | {120.0} fixed | 120.0 |
| instances with `so_reuseport` | {1, 2} (M2 I/O axis) | 1 |

Timeouts (`query_timeout`, `client_idle_timeout`, `idle_transaction_timeout`,
`transaction_timeout`) stay disabled (0) as shipped.

## 3. pgpool-II grid

Ref: https://www.pgpool.net/docs/latest/en/html/runtime-config-connection-pooling.html,
https://www.pgpool.net/docs/latest/en/html/runtime-config-connection.html

| Knob | Grid values | Default |
|---|---|---|
| pooling | session-class only (fixed) | `connection_cache = on` |
| `num_init_children` | {100, 200} (must cover max clients 200; excess blocks) | 32 |
| `max_pool` | {1, 4} (per-child cache; backends = children x max_pool capped by PG `max_connections`) | 4 |
| `connection_cache` | {on} fixed | on |
| `reset_query_list` | {`ABORT; DISCARD ALL`} fixed | same |
| `serialize_accept` | {off} fixed baseline | off |
| `child_life_time` / `child_max_connections` | {300 / 0} fixed at defaults | same |
| `connection_life_time` / `client_idle_limit` | {0 / 0} fixed at defaults | same |
| clustering | single documented standalone choice fixed for all cells | n/a |

Constraint enforced by harness: `max_pool * num_init_children`
must fit PG `max_connections` with headroom; the (200 children x 4 pool)
corner is forbidden and replaced by (200 x 1). The effective backend count
is recorded per cell for iso-region labeling.

## 4. Odyssey grid

Ref: https://pg-odyssey.tech/configuration/rules.html,
https://pg-odyssey.tech/configuration/global.html

| Knob | Grid values | Default |
|---|---|---|
| `pool` | {`transaction` (M1), `session`, `statement` provisional (M2)} | required (no default) |
| `pool_size` | {10, 20} (iso backends) | 0 (unlimited; never used) |
| `workers` | {1, 2, 4} (M2 I/O axis; M1 uses 1) | 1 |
| `pool_discard` | {yes} fixed | yes |
| `pool_smart_discard` | {no} fixed | no |
| `pool_cancel` / `pool_rollback` | {yes / yes} fixed | yes |
| `pool_timeout` | {0} fixed (wait forever; harness timeout caps instead) | 0 |
| `pool_ttl` / `server_lifetime` | {0 / 3600} fixed at defaults | same |
| `pool_reserve_prepared_statement` | {no (simple cells), yes (prepared twin)} | no |
| `server_pstmt_cache_size` | {0} fixed unless reservation is on | 0 |

`catchup_timeout`, `pool_client_idle_timeout`,
`pool_idle_in_transaction_timeout` stay 0 unless a documented variant.

## 5. pgcat grid

Ref: https://github.com/postgresml/pgcat/blob/main/CONFIG.md

| Knob | Grid values | Default |
|---|---|---|
| `pool_mode` | {`transaction` (M1), `session` (M2)} | `transaction` |
| per-user `pool_size` | {10, 20} (iso backends) | 9 |
| `general.worker_threads` | {5 (M1), 1 vs 5 (M2 I/O axis)} | 5 |
| `load_balancing_mode` | {`random`} fixed | `random` |
| `default_role`, `primary_reads_enabled`, `query_parser_*` | defaults fixed (splitting off) | `any` / true |
| `prepared_statements_cache_size` | {0} fixed (transaction+prepared is N/A) | 0 |
| `general.connect_timeout` / `idle_timeout` / `server_lifetime` | defaults fixed | 1000ms / 30000ms / 24h |
| per-user `connect_timeout` | {unset (transaction), 120000ms (session, admission parity with PgBouncer 120s)} | unset (= global) |

Sharding keys, regexes, `db_activity_based_routing` are out of scope.

## 6. Budget parity rule

Each pooler gets the same count of measured arm-cells: M1 has 7 workloads,
M2 adds at most 2 workloads per new arm (see `test-matrix.md` section 3).
Private-knob crosses (for example pgagroal `track_prepared_statements`
on/off) are allowed only inside the prepared-twin row, never as extra hidden
cells. The harness publishes the realized cell counts per pooler in every
report; imbalance fails review.

- Dr. Mob, the Researcher
