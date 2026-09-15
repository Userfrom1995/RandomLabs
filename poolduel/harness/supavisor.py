"""M7 Supavisor onboarding helpers (plan section 8, spec-v1.md s6).

Supavisor joins under the same adapter contract as every other arm:
pinned version plus SHA, verbatim config with upstream citations,
identical timeouts/warmup/schema/failure semantics, equal cell budget,
smoke gate before matrix entry.

Known harness cost (deferral doc, retained as history): Elixir/OTP Mix
release plus a Rust `pgparser` NIF, a mandatory metadata Postgres
(`tenants`/`users` tables, migrations first), and REST-provisioned
tenants (JWT-signed `PUT /api/tenants/:id`). This module turns that
cost into committed procedure: pinned version, env/secret rules,
metadata DDL, tenant-payload builder, M9 equal-budget definition, and
the smoke gate the matrix entry waits on.

Stdlib only. Nothing here touches the network or a database; it only
builds strings and checks dicts. The CI workflow (Lab scope) executes
the build/provision steps; the adapter renders the bundle; the smoke
gate verifies it. Cells are measured in M9, never here: this module
emits zero numbers.

Upstream refs (all cited beside each use):
- pool modes: https://supabase.github.io/supavisor/configuration/pool_modes/
- env config: https://supabase.github.io/supavisor/configuration/env/
- installation: https://supabase.github.io/supavisor/development/installation/
- setup (REST provisioning): https://supabase.github.io/supavisor/development/setup/
- authentication: https://supabase.github.io/supavisor/connecting/authentication/
- releases: https://github.com/supabase/supavisor/releases
- repo: https://github.com/supabase/supavisor/blob/main/mix.exs
"""

import json

# Pinned release (deferral doc; versions.md owns the human-readable pin).
# The exact commit SHA is recorded at build time via pin_sha() and baked
# into artifacts, mirroring the pgagroal tip-pin procedure: any upgrade
# means a re-run, never carried-forward numbers.
PINNED_VERSION = "v2.9.13"

# Pool modes via per-user mode_type (pool_modes doc). No statement mode
# exists; native is a direct passthrough (for migrations), no
# multiplexing, still measured as a mode arm in M9.
POOL_MODES = ("transaction", "session", "native")

# Upstream default listeners (pool_modes doc): transaction 6543, session
# 5432. The harness remaps the session listener to its assigned port in
# CI because 5432 is PostgreSQL itself there; the remap is documented in
# docs/configs/supavisor.md and carries no performance claim.
UPSTREAM_PORTS = {"transaction": 6543, "session": 5432, "native": 6543}

# Required environment for a provisioned node (env doc + setup doc).
# VAULT_ENC_KEY must be exactly 32 bytes; SECRET_KEY_BASE is required
# in prod; DATABASE_URL points at the metadata Postgres; API_JWT_SECRET
# signs the tenant-provisioning JWT.
REQUIRED_ENV = ("SECRET_KEY_BASE", "VAULT_ENC_KEY", "DATABASE_URL",
                "API_JWT_SECRET")
OPTIONAL_ENV = ("DB_POOL_SIZE", "POOL_SIZE", "NODE_IP", "RELEASE_COOKIE")

BENCH_TENANT = "bench"
BENCH_USER = "benchuser"
BENCH_PASSWORD = "benchpass"
BENCH_DATABASE = "benchdb"

# Client usernames are rewritten user.tenant (setup doc); the benchmark
# role therefore presents benchuser.bench.
TENANT_USER = "%s.%s" % (BENCH_USER, BENCH_TENANT)


def pin_sha(recorded_sha):
    """Validate a recorded Supavisor SHA for artifact manifests.

    The build checks out the pinned tag, records ``git rev-parse HEAD``,
    and bakes it into every artifact manifest. Returns the stripped SHA,
    or raises ValueError when empty, truncated, or carrying a
    ``BLOCKED:`` toolchain-flake marker (a matrix entry without a
    recorded SHA is a blocking defect, never a silent moving tip, and
    a blocked toolchain must never masquerade as a recorded SHA).
    """
    import re
    sha = (recorded_sha or "").strip()
    if not sha:
        raise ValueError("supavisor: no recorded SHA (check out %s and "
                         "record `git rev-parse HEAD`)" % PINNED_VERSION)
    if not re.fullmatch(r"[0-9a-fA-F]{40}", sha):
        raise ValueError("supavisor: recorded SHA must be a full 40-hex "
                         "commit SHA, got %r" % sha)
    return sha


def env_text(pool_size, secret_key_base="CI_ONLY_SECRET_KEY_BASE",
             vault_enc_key="0" * 32, database_url="ecto://localhost/meta",
             api_jwt_secret="CI_ONLY_API_JWT_SECRET", db_pool_size=5):
    """Render the provisioned-node env file (CI-only secret values).

    Every key cites the env doc; VAULT_ENC_KEY is exactly 32 bytes by
    construction here and re-checked by the smoke gate.
    """
    if len(vault_enc_key) != 32:
        raise ValueError("supavisor: VAULT_ENC_KEY must be exactly 32 bytes")
    return (
        "# Supavisor provisioned-node env (M9 matrix entry)\n"
        "# refs: configuration/env/, development/installation/\n"
        "SECRET_KEY_BASE=%s\n" % secret_key_base +
        "VAULT_ENC_KEY=%s\n" % vault_enc_key +
        "DATABASE_URL=%s\n" % database_url +
        "API_JWT_SECRET=%s\n" % api_jwt_secret +
        "DB_POOL_SIZE=%d\n" % int(db_pool_size) +
        "POOL_SIZE=%d\n" % int(pool_size) +
        "# pinned release: %s (SHA recorded in artifact manifest)\n"
        % PINNED_VERSION
    )


def check_env(env):
    """Return error strings for a provisioned-node env mapping."""
    errors = []
    for key in REQUIRED_ENV:
        if not (env.get(key) or "").strip():
            errors.append("supavisor env: missing required %s" % key)
    vault = env.get("VAULT_ENC_KEY", "")
    if vault and len(vault) != 32:
        errors.append("supavisor env: VAULT_ENC_KEY must be exactly "
                      "32 bytes, got %d" % len(vault))
    return errors


def metadata_sql():
    """Metadata-DB fixture: tenants/users tables (installation doc).

    Migrations run before the first proxied connection; this fixture is
    the minimum shape the tenant payload below assumes. Column types
    follow the upstream schema names (external_id, mode_type); the full
    migration history lives in the pinned release.
    """
    return (
        "-- Supavisor metadata-DB fixture (M9 matrix entry)\n"
        "-- refs: development/installation/, configuration/env/\n"
        "CREATE TABLE IF NOT EXISTS tenants (\n"
        "  id SERIAL PRIMARY KEY,\n"
        "  external_id TEXT UNIQUE NOT NULL,\n"
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n"
        ");\n"
        "CREATE TABLE IF NOT EXISTS users (\n"
        "  id SERIAL PRIMARY KEY,\n"
        "  tenant_external_id TEXT NOT NULL REFERENCES tenants(external_id),\n"
        "  username TEXT NOT NULL,\n"
        "  password TEXT NOT NULL,\n"
        "  pool_size INT NOT NULL,\n"
        "  mode_type TEXT NOT NULL,\n"
        "  is_manager BOOLEAN NOT NULL DEFAULT false,\n"
        "  UNIQUE (tenant_external_id, username)\n"
        ");\n"
    )


def tenant_payload(pool_size, pool_mode="transaction", tenant=BENCH_TENANT,
                   user=BENCH_USER, password=BENCH_PASSWORD,
                   database=BENCH_DATABASE, pg_host="127.0.0.1",
                   pg_port=5432, require_user=True):
    """Build the tenant-provisioning payload for PUT /api/tenants/:id.

    Shape follows the setup doc (tenant with users rows, per-user
    mode_type). Auth follows the authentication doc: require_user with
    per-user rows (no elevated auth_query against pg_authid, no manager
    bypass), so the harness needs no superuser on the throwaway CI
    database beyond owning the metadata fixture.
    """
    if pool_mode not in POOL_MODES:
        raise ValueError("supavisor: unknown pool_mode %r (want %s)"
                         % (pool_mode, list(POOL_MODES)))
    return {
        "external_id": tenant,
        "users": [{
            "username": user,
            "password": password,
            "pool_size": int(pool_size),
            "mode_type": pool_mode,
            "database": database,
            "upstream_host": pg_host,
            "upstream_port": int(pg_port),
            "require_user": bool(require_user),
            "is_manager": False,
        }],
    }


def tenant_payload_json(*args, **kwargs):
    """Deterministic JSON rendering of tenant_payload (for artifacts)."""
    return json.dumps(tenant_payload(*args, **kwargs), indent=2,
                      sort_keys=True)


# M9 equal-budget definition: Supavisor measures the same geometries as
# every other contender (7 M1 cells + 52 M2 rows), mapped onto its own
# modes (transaction where the matrix says transaction, session where
# it says session, native only where the matrix probes passthrough).
# Structural N/A (statement twins) stays visible as N/A with reason,
# exactly like pgagroal/pgcat. Defined in M7 so the claim registry and
# spec can cite it before the resweep; measured in M9.
M9_SUPAVISOR_BUDGET = {"m1_cells": 7, "m2_rows": 52, "total": 59}


def budget_parity_ok(m2_budget_table=None):
    """True when the M9 Supavisor budget covers the whole matrix.

    Equal budget means Supavisor runs every geometry in the matrix: 7
    M1 cells plus all 52 M2 rows (mapped onto its own transaction /
    session / native modes; statement twins stay N/A with reason, as
    for pgagroal/pgcat). Per-arm M2 counts differ structurally (the
    widest arm runs 12 rows), so parity is measured against the matrix
    totals, never against another arm's slice. Returns (ok, detail).
    """
    from .cells import M1_CELLS
    from .m2 import M2_ROWS
    ok = (M9_SUPAVISOR_BUDGET["m1_cells"] == len(M1_CELLS)
          and M9_SUPAVISOR_BUDGET["m2_rows"] == len(M2_ROWS)
          and M9_SUPAVISOR_BUDGET["total"] == len(M1_CELLS) + len(M2_ROWS))
    detail = ("supavisor M9 budget 7+52=59 vs matrix %d+%d=%d"
              % (len(M1_CELLS), len(M2_ROWS),
                 len(M1_CELLS) + len(M2_ROWS)))
    return ok, detail


def smoke_gate(bundle, recorded_sha="", env=None):
    """Evaluate the matrix-entry smoke gate on a provisioning bundle.

    ``bundle`` maps artifact names to text (as the adapter's setup()
    writes: supavisor.env, tenant.json, metadata.sql, SUPAVISOR_RUN.sh).
    Static checks run anywhere; live checks (release binary, metadata
    DB, REST, listener) are reported as pending when the prober cannot
    reach them, never as passes. Returns a list of (name, status,
    detail) with status in {pass, fail, pending}. Gate entry needs zero
    fail rows.
    """
    rows = []

    def row(name, status, detail):
        rows.append((name, status, detail))

    for artifact in ("supavisor.env", "tenant.json", "metadata.sql",
                     "SUPAVISOR_RUN.sh"):
        if bundle.get(artifact):
            row("artifact %s present" % artifact, "pass",
                "%d bytes" % len(bundle[artifact]))
        else:
            row("artifact %s present" % artifact, "fail", "missing")

    try:
        payload = json.loads(bundle.get("tenant.json", ""))
        users = payload.get("users", [])
        if (payload.get("external_id") == BENCH_TENANT and len(users) == 1
                and users[0].get("mode_type") in POOL_MODES
                and users[0].get("username") == BENCH_USER):
            row("tenant payload shape", "pass",
                "tenant %s, user %s, mode %s"
                % (BENCH_TENANT, BENCH_USER,
                   users[0].get("mode_type")))
        else:
            row("tenant payload shape", "fail", "unexpected shape")
    except (ValueError, AttributeError) as exc:
        row("tenant payload shape", "fail", "invalid JSON: %s" % exc)

    meta = bundle.get("metadata.sql", "")
    if "CREATE TABLE IF NOT EXISTS tenants" in meta and \
            "CREATE TABLE IF NOT EXISTS users" in meta:
        row("metadata fixture shape", "pass", "tenants + users tables")
    else:
        row("metadata fixture shape", "fail", "fixture tables missing")

    env = dict(env or {})
    env_errors = check_env(env)
    if env_errors:
        row("provisioned env complete", "fail", "; ".join(env_errors))
    else:
        row("provisioned env complete", "pass",
            "required keys present, VAULT_ENC_KEY 32 bytes")

    try:
        sha = pin_sha(recorded_sha)
        row("release SHA recorded", "pass", "%s at %s" % (PINNED_VERSION,
                                                          sha[:12]))
    except ValueError as exc:
        row("release SHA recorded", "fail", str(exc))

    # Live probes: pending until CI executes them (Lab scope). They must
    # never read as passes from static bundle inspection.
    row("release binary resolves", "pending",
        "CI proves `command -v supavisor` post-build")
    row("metadata DB migrated", "pending",
        "CI proves fixture + migrations before first connection")
    row("tenant REST provisioned", "pending",
        "CI proves PUT /api/tenants/:id 2xx with provisioning JWT")
    row("listener accepts TCP", "pending",
        "shared runner healthcheck owns the timeout, as for every arm")
    return rows


def gate_passes(rows):
    """True when the smoke gate has zero fail rows."""
    return all(status != "fail" for (_, status, _) in rows)
