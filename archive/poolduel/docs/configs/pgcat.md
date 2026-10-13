# pgcat baseline config (Researcher spec, Refs #302)

Reference (normative): https://github.com/postgresml/pgcat/blob/main/CONFIG.md,
https://github.com/postgresml/pgcat/blob/main/pgcat.toml,
https://github.com/postgresml/pgcat/blob/main/README.md

## M1 baseline (transaction mode, file: pgcat.toml)

```toml
[general]
host = "0.0.0.0"
port = 6432
connect_timeout = 1000
idle_timeout = 30000
server_lifetime = 86400000
worker_threads = 5
admin_username = "pgcat_admin"
admin_password = "pgcat_admin_pass"

[pools.benchdb]
pool_mode = "transaction"
load_balancing_mode = "random"
default_role = "any"
query_parser_enabled = true
primary_reads_enabled = true
prepared_statements_cache_size = 0

[pools.benchdb.users.0]
username = "benchuser"
password = "benchpass"
pool_size = 10

[pools.benchdb.shards.0]
servers = [ ["127.0.0.1", 5432, "primary"] ]
database = "benchdb"
```

Auth notes (CI-only values): `general.admin_username`/`admin_password`
are required fields (CONFIG.md; pgcat 1.2.0 refuses to start without
them). Pool users carry `benchuser`/`benchpass` for the PostgreSQL SCRAM
leg. The single-shard layout follows the `pgcat.toml` example
(`pools.<pool>.shards.<idx>` with `[host, port, role]` triples).

Rationale cites: mode defaults from CONFIG.md; transaction mode documented as
not supporting prepared statements, `SET`, or advisory locks (README), so the
prepared twin is N/A for pgcat and `prepared_statements_cache_size` stays 0;
sharding and read/write splitting stay at defaults (off).

## M2 variants

- Session arm: `pool_mode = "session"` plus per-user
  `connect_timeout = 120000` (session admission parity, M4 owner review
  2026-09-13: matches PgBouncer `query_wait_timeout = 120s` and pgagroal
  `blocking_timeout = 120s` so queued session clients wait for a server
  connection instead of aborting after the 1000ms default; pgcat
  CONFIG.md calls `connect_timeout` "similar to PgBouncer's
  `query_wait_timeout`" and the per-user key inherits the global when
  unset. Proven need: M2-S9 failed in 1.0s with `FATAL: could not get
  connection from the pool - AllServersDown` on the 1000ms default).
  The backend pool stays pool_size (10/20 per cell).
- Worker axis: `worker_threads` in {1, 5}.

M1 transaction rendering is byte-identical (no per-user key).

- Dr. Mob, the Researcher
