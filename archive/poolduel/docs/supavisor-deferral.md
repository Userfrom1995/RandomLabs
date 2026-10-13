# Supavisor deferral (Researcher spec, Refs #302)

Status: ONBOARDING since M7 (was DEFERRED with reason through M6).
History retained below; the lift note at the end is normative.

## Factual basis (each point cites upstream docs)

1. No single binary; Elixir/OTP Mix release. Build and run need Mix or the OTP
   release image plus a Rust toolchain for the `pgparser` NIF
   (`rustler ~> 0.34`, `native/pgparser` wrapping `libpg_query`).
   See https://github.com/supabase/supavisor/blob/main/mix.exs
2. Mandatory second Postgres (metadata DB): `DATABASE_URL`, `DB_POOL_SIZE`,
   `supavisor` schema, `tenants` and `users` tables, migrations before the
   first proxied connection.
   See https://supabase.github.io/supavisor/configuration/env/,
   https://supabase.github.io/supavisor/development/installation/
3. Config via authenticated Management REST API, not a config file: every
   matrix cell needs `PUT /api/tenants/:id` with a JWT signed by
   `API_JWT_SECRET` (`SECRET_KEY_BASE` required in prod, `VAULT_ENC_KEY`
   exactly 32 bytes). Client usernames are rewritten `user.tenant`.
   See https://supabase.github.io/supavisor/development/setup/
4. Auth model assumes Supabase-style credential plumbing (`require_user`,
   per-user rows, or `is_manager` plus `auth_query` against `pg_authid`),
   which needs elevated DB privileges in a throwaway CI database.
   See https://supabase.github.io/supavisor/connecting/authentication/
5. Clustering assumptions leak into single-node runs (`libcluster`,
   `DNS_POLL`, `CLUSTER_NODES`, `RELEASE_COOKIE`, `NODE_IP`).
   See https://supabase.github.io/supavisor/faq/
6. Contrast: pgcat is `cargo build --release` plus one `pgcat.toml`, trivially
   scriptable in CI.
   See https://github.com/postgresml/pgcat/blob/main/CONFIG.md

## What deferral means

- M1 through M3 measure five poolers plus the direct control. No Supavisor
  numbers appear, and no placeholder zeros appear either.
- A future milestone provisions a Supavisor harness (metadata-DB fixture,
  tenant-provisioning script, OTP-release image pinned at v2.9.13, both
  `NAMED_PREPARED_STATEMENTS_ENABLED` settings) and then runs the same
  matrix procedure. Re-entry requires that harness plus a Researcher addendum.
- Supavisor modes for that future work: `transaction` (6543), `session`
  (5432), `native` (passthrough). See
  https://supabase.github.io/supavisor/configuration/pool_modes/

## Lift note (M7 onboarding, Builder)

The dedicated milestone has landed: the harness now exists
(`poolduel/harness/adapters/supavisor.py` under the identical adapter
contract, `poolduel/harness/supavisor.py` pin plus provisioning plus
M9 equal budget plus smoke gate, `poolduel/docs/configs/supavisor.md`
verbatim config with upstream citations). Supavisor is a first-class
sixth contender, not deferred.

What this changes and what it does not:

- M1/M2 numbers are untouched: no Supavisor rows exist there and none
  are backfilled or interpolated. Supavisor is measured in the M9
  resweep (7 M1 geometries + 52 M2 rows, statement twins N/A with
  reason), after the smoke gate passes.
- Matrix entry is gated, not automatic: `python3 -m
  poolduel.harness.cli --smoke-supavisor` (or `SUPAVISOR_SHA=<sha>`
  plus the rendered bundle) must report zero fail rows. If Supavisor
  cannot meet the adapter contract in CI, that is a published finding,
  never a silent exclusion.
- Auth choice resolved against point 4 above: `require_user` with
  per-user rows (no `is_manager` bypass, no `auth_query` against
  `pg_authid`), so no elevated DB privileges are needed. Posture is
  SCRAM on tenant users (`harness/auth.py`), symmetric with the
  PgBouncer/pgagroal/pgcat arms.

- the Builder (M7 onboarding)

- Dr. Mob, the Researcher
