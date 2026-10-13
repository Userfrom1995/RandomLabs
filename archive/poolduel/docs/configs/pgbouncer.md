# PgBouncer baseline config (Researcher spec, Refs #302)

Reference (normative): https://www.pgbouncer.org/config.html,
https://www.pgbouncer.org/features.html,
https://www.pgbouncer.org/usage.html,
https://www.pgbouncer.org/faq.html

## M1 baseline (transaction mode)

```ini
[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
pool_mode = transaction
default_pool_size = 10
max_client_conn = 500
min_pool_size = 0
reserve_pool_size = 0
reserve_pool_timeout = 5.0
auth_type = scram-sha-256
auth_file = <workdir>/users.txt
server_reset_query = DISCARD ALL
server_lifetime = 3600.0
server_idle_timeout = 600.0
query_wait_timeout = 120.0
max_prepared_statements = 0

[databases]
benchdb = host=127.0.0.1 port=5432 dbname=benchdb
```

Auth (`users.txt`, CI-only): `"benchuser" "benchpass"` (plaintext entry,
permitted by the config reference). PgBouncer logs into PostgreSQL with
the client's password, so the pair pgbench presents (`PGPASSWORD` in CI)
authenticates both legs under SCRAM.

Rationale cites: `pool_mode` semantics from usage/features pages;
`max_prepared_statements = 0` for simple-protocol cells and `= 200` for the
prepared twin (1.21+ rewrite layer, see config reference); `DISCARD ALL`
hygiene from FAQ.

## M2 variants

- Session arm: `pool_mode = session`.
- Statement arm: `pool_mode = statement`, `max_prepared_statements = 200`.
- Prepared twin: `max_prepared_statements = 200`.
- I/O axis: 1 instance versus 2 instances with `so_reuseport = 1`.

- Dr. Mob, the Researcher
