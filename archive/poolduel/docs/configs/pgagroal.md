# pgagroal baseline config (Researcher spec, Refs #302)

Reference (normative for every non-default value):
https://pgagroal.github.io/doc/CONFIGURATION.html,
https://pgagroal.github.io/doc/PIPELINES.html,
https://pgagroal.github.io/doc/ARCHITECTURE.html,
https://pgagroal.github.io/doc/manual/en/15-performance.html

## M1 baseline (transaction pipeline)

```ini
[pgagroal]
host = 127.0.0.1
port = 6432
unix_socket_dir = /tmp
max_connections = 10
pipeline = transaction
ev_backend = auto
blocking_timeout = 0
idle_timeout = 0
max_connection_age = 0
validation = off
track_prepared_statements = off
nodelay = on
keep_alive = on
allow_unknown_users = false
log_type = console
log_level = info
```

Per-database pool (`pgagroal_databases.conf`): full triple
`benchdb benchuser 10 10 10` (DATABASE USER MAX_SIZE INITIAL_SIZE
MIN_SIZE, all > 0 - mandatory for the transaction pipeline per the
validator in `src/libpgagroal/configuration.c`; prefilled to max per
the PIPELINES prefill recommendation). User vault
(`pgagroal_users.conf` via `-u`, provisioned in adapter setup with
`pgagroal-admin master-key` + `user add` for benchuser, CI-only bench
credential): mandatory for the transaction pipeline ("Users must be
defined for the transaction pipeline"); `allow_unknown_users` must be
`false` for the same pipeline (both FATALs proven in
`src/libpgagroal/configuration.c`; `test/conf/01-02` pin
`allow_unknown_users = false`).
Backend server section (mandatory per CONFIGURATION.html - sections other
than `[pgagroal]` each configure one PostgreSQL backend):

```ini
[primary]
host = 127.0.0.1
port = 5432
primary = on
```

HBA (`pgagroal_hba.conf`): `host benchdb benchuser 127.0.0.1/32 scram-sha-256`
(CI-only; production would use per-user vault entries). The scram method
makes the pooler collect the client password (CI `PGPASSWORD=benchpass`,
vault entry created with the same credential) so the vault-known
`benchuser` authenticates against PostgreSQL itself
(CONFIGURATION.html); `trust` cannot be
used because the pooler would then hold no password for the SCRAM backend.
Startup: `pgagroal -c pgagroal.conf -a pgagroal_hba.conf -l
pgagroal_databases.conf -u pgagroal_users.conf` in the foreground (`-d`
is a daemon flag taking no argument).
Rationale cites: transaction-mode advice (`blocking_timeout = 0`,
`idle_timeout = 0`, `max_connection_age = 0`) from PIPELINES; `ev_backend`
choices from ARCHITECTURE.

## M2 variants

- Session arm: `pipeline = session`, `blocking_timeout = 120s`.
- Performance arm: `pipeline = performance`, `blocking_timeout = 120s`.
- I/O axis: `ev_backend = io_uring` versus `epoll` (record resolved `auto`).
- Prepared twin: `track_prepared_statements = on` (transaction only).

Session admission parity (M4 owner review, 2026-09-13): the 120s
`blocking_timeout` on session/performance pipelines matches PgBouncer
`query_wait_timeout = 120s` and pgcat per-user `connect_timeout = 120s`,
so queued session clients wait for a backend instead of failing at
connect time, while the backend pool stays at the cell's pool_size for
every arm (CONFIGURATION.html: `blocking_timeout` is the time the
process blocks for a connection; `max_connections` caps connections to
PostgreSQL, i.e. backends). Proven need: M2-S1..S4 failed in 30.1s with
`FATAL: connection pool is full` on the old 30s blocking. M1
transaction rendering is byte-identical (`blocking_timeout = 0`).

- Dr. Mob, the Researcher
