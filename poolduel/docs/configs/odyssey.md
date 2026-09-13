# Odyssey baseline config (Researcher spec, Refs #302)

Reference (normative): https://pg-odyssey.tech/configuration/rules.html,
https://pg-odyssey.tech/configuration/global.html,
https://pg-odyssey.tech/configuration/storage.html,
https://pg-odyssey.tech/features/pooling.html

## M1 baseline (transaction pool, single worker)

Global: `workers = 1`, `resolvers = 1`,
`backend_connect_timeout_ms = 30000`,
`log_format = "%p %t %l [%i %s] (%c) %m\n"` (MANDATORY - odyssey 1.5.1
`sources/config.c` `od_config_validate` FATALs `log_format is not
defined` otherwise; value verbatim from upstream `odyssey.conf`),
`log_to_stdout = yes` (keeps logs in the runner capture).

Backend endpoint (storage reference):

```ini
storage "benchdb_store" {
  type "remote"
  host "127.0.0.1"
  port 5432
}
```

Routing rule (database/user blocks referencing the storage):

```ini
database "benchdb" {
  user "benchuser" {
    authentication "none"
    storage "benchdb_store"
    storage_user "benchuser"
    storage_password "benchpass"
    pool = transaction
    pool_size = 10
    pool_discard = yes
    pool_smart_discard = no
    pool_cancel = yes
    pool_rollback = yes
    pool_timeout = 0
    pool_ttl = 0
    server_lifetime = 3600
    pool_reserve_prepared_statement = no
  }
}
```

Auth note (CI-only): frontend `authentication "none"` trusts the benchmark
client; the backend leg always carries `storage_user`/`storage_password`
against PostgreSQL SCRAM. The legacy `route { service ... backend_host ..
}` syntax is rejected by Odyssey 1.5.1 (`unknown parameter`) and is not
used; `server_pstmt_cache_size` is not an Odyssey parameter and is not set.

Rationale cites: mode semantics from the pooling feature page; every
`pool_*` default from the rules reference; `workers` from the global
reference.

## M2 variants

- Session arm: `pool = session`.
- Statement arm (provisional): `pool = statement`, behavior verified
  empirically and labeled provisional.
- Prepared twin: `pool_reserve_prepared_statement = yes`.
- Worker axis: `workers` in {1, 2, 4}.

## M9-E1 equalized control

`auth_mode=equalized` renders `authentication "scram-sha-256"` with
`password "benchpass"` instead of CI-only `none` (rules reference:
authentication admits none/block/clear_text/md5/scram-sha-256/cert;
password accepts plain text, MD5 hash, or SCRAM secret). The backend
leg is unchanged (storage_user/storage_password SCRAM). CI startup
proves the password form; rejection fails loudly at healthcheck.

- Dr. Mob, the Researcher
