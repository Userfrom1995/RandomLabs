# Supavisor baseline config (M7 onboarding, Refs #302)

Reference (normative): https://supabase.github.io/supavisor/configuration/env/,
https://supabase.github.io/supavisor/configuration/pool_modes/,
https://supabase.github.io/supavisor/development/installation/,
https://supabase.github.io/supavisor/development/setup/,
https://supabase.github.io/supavisor/connecting/authentication/

Pinned release: v2.9.13 (https://github.com/supabase/supavisor/releases/tag/v2.9.13),
exact commit SHA recorded at build time and baked into artifacts
(`harness/supavisor.py:pin_sha`, same procedure as the pgagroal tip pin).
Any upgrade means a re-run, never carried-forward numbers.

## Provisioned node env (file: supavisor.env, CI-only secret values)

```sh
SECRET_KEY_BASE=CI_ONLY_SECRET_KEY_BASE
VAULT_ENC_KEY=00000000000000000000000000000000
DATABASE_URL=ecto://localhost/meta
API_JWT_SECRET=CI_ONLY_API_JWT_SECRET
DB_POOL_SIZE=5
POOL_SIZE=10
```

Cites: every key is a required setting in `configuration/env/`;
`VAULT_ENC_KEY` must be exactly 32 bytes (smoke-gated);
`DATABASE_URL` points at the metadata Postgres (`development/installation/`);
`POOL_SIZE` is the benchmark pool size for the cell (10/20 per geometry).

## Metadata-DB fixture (file: metadata.sql)

```sql
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_external_id TEXT NOT NULL REFERENCES tenants(external_id),
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  pool_size INT NOT NULL,
  mode_type TEXT NOT NULL,
  is_manager BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (tenant_external_id, username)
);
```

Cites: `development/installation/` (metadata DB, `tenants` and `users`
tables, migrations before the first proxied connection). Migrations run
first; this fixture is the minimum shape the tenant payload assumes.

## Tenant provisioning (PUT /api/tenants/bench, file: tenant.json)

```json
{
  "external_id": "bench",
  "users": [
    {
      "database": "benchdb",
      "is_manager": false,
      "mode_type": "transaction",
      "password": "benchpass",
      "pool_size": 10,
      "require_user": true,
      "upstream_host": "127.0.0.1",
      "upstream_port": 5432,
      "username": "benchuser"
    }
  ]
}
```

Cites: `development/setup/` (REST provisioning with a JWT signed by
`API_JWT_SECRET`, client login rewritten `benchuser.bench`);
`connecting/authentication/` (`require_user` with per-user rows, no
`is_manager` bypass and no `auth_query` against `pg_authid`, so the
harness needs no elevated DB privileges). The JWT itself is minted at
provision time in CI and never committed.

## Modes and listeners

| `mode_type` | Upstream listener | Harness listener | Benchmark role |
|---|---|---|---|
| `transaction` | 6543 | harness port (default 6437) | M9 primary arm (M1-equivalent) |
| `session` | 5432 | harness port (default 6437) | M9 session arm |
| `native` | passthrough (migrations) | harness port (default 6437) | M9 passthrough arm (no multiplexing claim) |

No `statement` mode exists upstream; statement twins record
`N/A (unsupported)` with reason, as for pgagroal/pgcat. The harness
remaps the session listener because upstream 5432 is PostgreSQL itself
in CI; the remap is a documented harness requirement and carries no
performance claim. Auth posture is SCRAM on tenant users
(`harness/auth.py`), symmetric with the PgBouncer/pgagroal/pgcat arms.

Rationale cites: mode and port defaults from
`configuration/pool_modes/`; clustering stays at defaults (single node,
`development/installation/`); prepared-statement handling follows the
per-mode upstream behavior and is measured empirically in M9, never
assumed.

- the Builder (M7 onboarding)
