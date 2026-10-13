# Poolduel pooling modes survey (Researcher spec, Refs #302)

Survey date: 2026-09-11. Every claim cites the pooler's own docs or source.
Rule: any benchmark config that uses a non-default setting must cite the
doc link listed here (or in `configs/<pooler>.md`). Uncited tuning FAILS review.

## 1. pgagroal (repo: https://github.com/pgagroal/pgagroal)

Vocabulary: pgagroal calls these **pipelines**, not pool modes.
Doc: https://pgagroal.github.io/doc/PIPELINES.html

| Pipeline (`pipeline = ...`) | Semantics | Benchmark role |
|---|---|---|
| `performance` | Fastest, minimal checks; watches client Terminate and server FATAL only; `DISCARD ALL` after each client session | M2 session-class arm |
| `session` | performance plus TLS, failover, `disconnect_client`; full features; `DISCARD ALL` after each session | M2 session-class arm |
| `transaction` | Backend released after each transaction (ReadyForQuery tracked); many more clients than backends; no `DISCARD ALL` on return | M1 primary arm |
| `auto` (default) | Selects `performance` unless `tls = on`, `failover = on`, or `disconnect_client > 0`, then `session` | Harness must NEVER benchmark `auto` as a mode; resolve to the effective pipeline and record it |

No `statement` mode exists. No PG message-pipelining mode exists (name collision only).
Prepared statements in transaction pipeline: `PREPARE`/`EXECUTE` usable only
within the same transaction; `SET`, `LISTEN`/`NOTIFY`, `WITH HOLD CURSOR`,
`PREPARE`/`DEALLOCATE` listed unsupported. `track_prepared_statements = on`
issues `DEALLOCATE ALL` before returning a connection, `off` issues nothing,
`DISCARD ALL` is never issued in transaction mode. Same doc URL above.

I/O backends (`ev_backend`, doc: https://pgagroal.github.io/doc/ARCHITECTURE.html):
`auto` (default: tries `io_uring`, then `epoll`, then `kqueue`), `io_uring`
(Linux only, fastest, not supported with TLS), `epoll`, `kqueue`.
Process model: `fork()` per backend connection, per-process event loop
(`src/libpgagroal/ev.c`, headers `src/include/ev.h`), shared state via `mmap`.
Requires restart: `ev_backend`, `pipeline`, `max_connections`, `hugepage`, TLS rules.

## 2. PgBouncer (repo: https://github.com/pgbouncer/pgbouncer)

Modes via `pool_mode` (global, per-database, per-user).
Docs: https://www.pgbouncer.org/usage.html, https://www.pgbouncer.org/features.html,
https://www.pgbouncer.org/config.html#pool_mode

| Mode | Release rule | Benchmark role |
|---|---|---|
| `session` (default) | Backend held for whole client session | M2 session arm |
| `transaction` | Backend released at transaction end | M1 primary arm |
| `statement` | Backend released after each query; multi-statement transactions disallowed (autocommit enforced) | M2 statement arm |

Prepared statements: session mode supports everything with
`server_reset_query = DISCARD ALL` hygiene
(see https://www.pgbouncer.org/faq.html). Transaction and statement modes
support protocol-level (Parse/Bind/Execute) prepares ONLY when
`max_prepared_statements > 0` and version >= 1.21.0 (rewrite to internal
`PGBOUNCER_<id>` names, per-server LRU). SQL-level `PREPARE`/`EXECUTE` is
Never supported in transaction mode. `SET`, `LISTEN`, `WITH HOLD` cursors
likewise Never. Full map: https://www.pgbouncer.org/features.html

I/O backend: single-threaded, single-process event loop on libevent 2.x
(`epoll` on Linux via libevent, selectable with `EVENT_NOEPOLL` etc.;
see `https://manpages.debian.org/testing/pgbouncer/pgbouncer.1.en.html`).
Scale-out via multiple instances with `so_reuseport` plus `[peers]` cancel
forwarding (see https://www.pgbouncer.org/config.html#so_reuseport).
No `io_uring` option. No thread-count knob; harness scales instances instead.

## 3. pgpool-II (repo: https://github.com/pgpool/pgpool2)

pgpool-II has NO transaction, statement, or pipeline pooling mode. Pooling is
session-scoped connection caching: each preforked child holds one client at a
time and caches backend connections for later clients with identical
(user, database, protocol) properties.
Docs: https://www.pgpool.net/docs/latest/en/html/runtime-config-connection-pooling.html

Key knobs: `connection_cache = on` (default on), `max_pool = 4` (per child),
`num_init_children = 32` (concurrent client cap; excess clients block unless
`reserved_connections > 0`).
Total backend ceiling is `num_init_children * max_pool`.
What pgpool-II calls "modes" (`backend_clustering_mode`: `streaming_replication`,
`replication`, `logical_replication`, `snapshot_isolation`, `raw`) are clustering
modes orthogonal to pooling; every one of them still pools the same way.
See https://www.pgpool.net/docs/latest/en/html/runtime-config-running-mode.html
`statement_level_load_balance` is load-balance granularity per read query, NOT
connection pooling. See https://www.pgpool.net/docs/latest/en/html/runtime-config-load-balancing.html

Benchmark mapping: pgpool-II contributes ONE session-class arm in M1 and M2.
Transaction, statement, and pipeline cells record `N/A (unsupported)` for pgpool-II.
Prepared statements work via session affinity; extended-protocol limits are
documented in https://www.pgpool.net/docs/latest/en/html/restrictions.html
(SQL type commands unavailable in extended mode; temporal rewriting skips
extended protocols and PREPARE; `pg_terminate_backend` limits).

I/O backend: multi-process prefork (`num_init_children` processes, blocking
`accept`, `serialize_accept` thundering-herd knob). No epoll, io_uring, or
thread-pool option. This is a fixed runtime: benchmark it as one point.

## 4. Odyssey (repo: https://github.com/yandex/odyssey)

Modes via per-route `pool` key.
Docs: https://pg-odyssey.tech/features/pooling.html,
https://pg-odyssey.tech/configuration/rules.html

| Mode | Status | Benchmark role |
|---|---|---|
| `session` | First class, documented | M2 session arm |
| `transaction` | First class, documented | M1 primary arm |
| `statement` | Accepted by config type string (`session/transaction/statement`); upstream prose documents only session and transaction; managed Yandex Cloud exposes equivalent "Query mode" (one query per backend checkout, multi-query transactions prohibited) | M2 experimental arm; harness must verify behavior empirically and label results provisional |

No pipeline mode. Related knob `shared_pool` (1.5.x) caps connections jointly
across routes; out of scope for M1, candidate for M2 grid extension.
Transaction-mode prepared statements require opt-in
`pool_reserve_prepared_statement = yes` plus `server_pstmt_cache_size`
(SIEVE eviction); incompatible with session pooling and with custom
`pool_discard_query` containing `DEALLOCATE ALL`. 1.5.x fixed many
extended-protocol violations (see https://www.postgresql.org/about/news/odyssey-151-released-3348).
Reset path: `pool_discard` / `pool_smart_discard` / `pool_discard_query`
plus `pool_cancel` and `pool_rollback`.

I/O backend: multi-threaded async runtime on the bespoke Machinarium coroutine
engine (epoll-based Linux event loop, cooperative context switching).
Thread count via global `workers` (default 1, tuned upward for TLS-heavy load).
See https://yandex.github.io/odyssey and
https://pg-odyssey.tech/configuration/global.html
No io_uring or epoll selector knob; this is a fixed runtime with a `workers`
sweep axis.

## 5. pgcat (repo: https://github.com/postgresml/pgcat)

Modes via `pools.<pool>.pool_mode`.
Docs: https://github.com/postgresml/pgcat/blob/main/CONFIG.md,
https://github.com/postgresml/pgcat/blob/main/README.md

| Mode | Status | Benchmark role |
|---|---|---|
| `transaction` (default) | Stable | M1 primary arm |
| `session` | Stable | M2 session arm |
| `statement` | Declared in code (`PoolMode::Statement`) but documented UNSUPPORTED ("breaks a lot of Postgres features"); see https://docs.rs/pgcat_config/latest/pgcat_config/enum.PoolMode.html | Record `N/A (unsupported)`, never benchmark |

Transaction mode does NOT support prepared statements, `SET`, or advisory locks
(README: use `SET LOCAL`, `pg_advisory_xact_lock`). `prepared_statements_cache_size`
(default 0, disabled) exists but does not change the official unsupported status.
Sharding and read/write splitting (`load_balancing_mode`, `query_parser_*`,
`default_role`) are out of scope for M1; M2 may add a documented
read/write-split variant only if every other pooler gets an equivalent
read-only routing chance (none do natively, so default is to leave it off).

I/O backend: Rust Tokio multi-threaded async runtime; thread count via
`general.worker_threads` (default 5). Fixed runtime with a worker-thread
sweep axis. No io_uring or epoll selector.

## 6. Supavisor (onboarding since M7, see docs/supavisor-deferral.md lift note)

Modes via per-user `mode_type`: `transaction` (port 6543), `session`
(port 5432), `native` (direct passthrough for migrations, no multiplexing).
Docs: https://supabase.github.io/supavisor/configuration/pool_modes/
No `statement` mode. Harness landed in M7 (adapter under the identical
contract, `harness/supavisor.py` pin plus provisioning plus smoke gate,
`docs/configs/supavisor.md` verbatim config); measured in the M9 resweep
(7 M1 geometries + 52 M2 rows, statement twins N/A with reason), after
the smoke gate passes. History in `docs/supavisor-deferral.md`.

## 7. Mode coverage matrix (normative for the harness)

| Pooler | transaction | session | statement | pipeline/msg | M1 arms | M2 arms | M9 arms |
|---|---|---|---|---|---|---|---|
| pgagroal | yes (`transaction`) | yes (`session`, plus `performance` variant) | N/A (unsupported) | N/A | transaction | transaction + session + performance | resweep |
| PgBouncer | yes | yes | yes | N/A | transaction | transaction + session + statement | resweep |
| pgpool-II | N/A | yes (only mode) | N/A | N/A | session-class | session-class (sweep `max_pool`, `num_init_children`) | resweep |
| Odyssey | yes | yes | provisional (verify) | N/A | transaction | transaction + session + statement(provisional) | resweep |
| pgcat | yes | yes | N/A (unsupported) | N/A | transaction | transaction + session | resweep |
| Supavisor | yes (`transaction`) | yes (`session`) | N/A (unsupported) | N/A (`native` passthrough arm) | not run (M9 entry) | not run (M9 entry) | transaction + session + native |
| direct PG | N/A (control) | N/A (control) | N/A (control) | N/A | control in every chunk | control in every chunk | control in every chunk |

`N/A (unsupported)` cells are published as N/A, never zero, never interpolated.

## 8. I/O backend matrix (normative)

| Pooler | Backends to sweep | Fixed runtime notes |
|---|---|---|
| pgagroal | `io_uring`, `epoll` (plus `auto` resolved and recorded) | `kqueue` is BSD-only: N/A on Linux CI |
| PgBouncer | libevent default; N-instances with `so_reuseport` (1 vs 2 instances) | Single-threaded by design |
| pgpool-II | fixed prefork | Sweep `num_init_children`, not I/O |
| Odyssey | fixed Machinarium | Sweep `workers` (1, 2, 4) |
| pgcat | fixed Tokio | Sweep `worker_threads` (1, 5) |

- Dr. Mob, the Researcher
