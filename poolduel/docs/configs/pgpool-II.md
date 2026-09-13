# pgpool-II baseline config (Researcher spec, Refs #302)

Reference (normative):
https://www.pgpool.net/docs/latest/en/html/runtime-config-connection-pooling.html,
https://www.pgpool.net/docs/latest/en/html/runtime-config-connection.html,
https://www.pgpool.net/docs/latest/en/html/runtime-config-load-balancing.html,
https://www.pgpool.net/docs/latest/en/html/restrictions.html,
https://www.pgpool.net/docs/latest/en/html/auth-pool-hba-conf.html,
https://www.pgpool.net/docs/latest/en/html/auth-methods.html

## M1/M2 baseline (session-class, the only pooling mode)

```ini
connection_cache = on
max_pool = 1
num_init_children = 100
reserved_connections = 0
listen_backlog_multiplier = 2
serialize_accept = off
child_life_time = 300
child_max_connections = 0
connection_life_time = 0
client_idle_limit = 0
reset_query_list = 'ABORT; DISCARD ALL'
load_balance_mode = off
```

Rationale cites: session-scoped caching model from the pooling page;
`num_init_children = 100` covers M1 client counts up to 100 without blocking
(scale to 200 for the 200-client row); `max_pool = 1` keeps the backend
ceiling (`children x max_pool`) inside PG `max_connections` with headroom;
`reset_query_list` default hygiene; load balancing off so the benchmark
measures pooling, not routing. For the 200-client row use
`num_init_children = 200, max_pool = 1`.

Backend-count label (binding, M4): every measured pgpool cell runs
`children x max_pool` dedicated backends (M1: 100x1 = 100 backends, M1-4:
200x1 = 200; M2-I15/I16: 200x1), i.e. 1:1 or more backends than the
cell's pool_size - pgpool does NOT multiplex frontends onto fewer
backends the way transaction poolers do. This is pgpool's documented
process-per-connection architecture, labeled here and on the pgpool
deep-dive page, never hidden and never counted as multiplexed pooling.

Auth (CI-only): frontend `pool_hba` stays disabled (the default), so the
benchmark client connects unchallenged; the backend SCRAM leg uses the
workdir `pool_passwd` file holding the plaintext `benchuser:benchpass`
entry (section 6.2.4.1: SCRAM backend auth requires a plaintext or AES
entry - md5 entries cannot be used). pgpool resolves `pool_passwd` in its
startup working directory, which the harness sets to the per-arm workdir.

## M9-E1 equalized control

`auth_mode=equalized` renders `enable_pool_hba = on` with a workdir
`pool_hba.conf` carrying `host all all 127.0.0.1/32 scram-sha-256`
(pgpool-II 4.7.2 docs chapter 6 Client Authentication, sections 6.1 +
6.2.4.2: pool_passwd plaintext entry plus a scram-sha-256 pool_hba
line). The backend leg is unchanged (pool_passwd SCRAM). CI startup
proves the lookup; rejection fails loudly at healthcheck.

- Dr. Mob, the Researcher
