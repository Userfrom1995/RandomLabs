"""M6 auth-posture labels + equalized-auth churn control (plan 9.1).

Current churn cells mix frontend postures: SCRAM (PgBouncer, pgagroal,
pgcat) against ``none`` (Odyssey frontend) and disabled HBA (pgpool-II).
Those recorded-asymmetric arms stay labeled and stay in the matrix; the
equalized-auth control defined here runs beside them (M9) so churn
deltas measure multiplexing, not auth cost.

This module is DATA + labels only. No procedure branches live here.
"""

# Frontend posture per arm as rendered by the adapters (methodology
# s7.3). The backend leg is always SCRAM (storage_user/storage_password,
# pool_passwd, or presented-password passthrough).
AUTH_POSTURE = {
    "direct": "scram (PG backend, no pooler frontend)",
    "pgbouncer": "scram-sha-256 via auth_file users.txt",
    "pgagroal": "scram-sha-256 via HBA + vault passthrough",
    "pgcat": "scram-sha-256 via admin/users file",
    "odyssey": "none (CI-only frontend; backend leg SCRAM)",
    "pgpool": "pool_hba disabled (default; backend SCRAM via pool_passwd)",
    # M7 onboarding: Supavisor tenant users over SCRAM with the
    # user.tenant rewrite (setup doc); symmetric with the SCRAM arms,
    # so the M9-E1 equalized control covers it without special-casing.
    "supavisor": "scram-sha-256 (tenant users, user.tenant rewrite)",
}

ASYMMETRIC_ARMS = ("odyssey", "pgpool")


def posture(pooler):
    """Frontend auth-posture label for a pooler arm."""
    return AUTH_POSTURE.get(pooler, "unknown")


def is_asymmetric(pooler):
    """True when the arm's churn cost includes an auth asymmetry."""
    return pooler in ASYMMETRIC_ARMS


# Equalized-auth churn control definition (runs in M9, defined in M6 so
# the claim registry and spec can cite it before the resweep).
EQUALIZED_CHURN_SPEC = {
    "control_id": "M9-E1",
    "geometry": "G-CHURN100",
    "rule": ("SCRAM on every frontend (Odyssey authentication set to "
             "scram-sha-256 with a users file; pgpool pool_hba enabled "
             "with scram entries), backend SCRAM unchanged, same "
             "clients/pool/duration/warmup/repeats as G-CHURN100."),
    "compares_against": ("M1-6 plus M2-W6..M2-W10 recorded-asymmetric "
                         "arms (kept, labeled, never replaced)."),
    "status": "defined in M6; measured in the M9 resweep",
}
