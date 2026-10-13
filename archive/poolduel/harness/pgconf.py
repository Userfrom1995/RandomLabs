"""M6 PG-config enforcement helpers (plan sections 7, 9.2, spec-v1.md s3).

The runner applies the claimed baseline; where it cannot (managed PG,
read-only CI images), the effective SHOW values become the published
claim and any requested-vs-effective divergence is a blocking defect
recorded on the raw row, never a footnote.

Stdlib only. Nothing here touches the network or the database; it only
builds SQL strings and compares dicts. The CI workflow (Lab scope)
executes ``APPLY_SQL`` before the dataset init; the harness records the
verdict per arm-run via ``runner.build_record``.
"""

ENFORCED_KEYS = ("shared_buffers", "max_connections",
                 "synchronous_commit", "fsync")

# Claimed baseline (mirrors runner.PG_CONFIG_BASELINE; the runner is the
# source of truth at runtime, this copy exists so docs/tests have one
# import without pulling subprocess code).
BASELINE = {
    "shared_buffers": "512MB",
    "max_connections": 300,
    "synchronous_commit": "on",
    "fsync": "on",
}


def apply_sql(baseline=None):
    """ALTER SYSTEM statements that enforce the claimed baseline.

    Returns a list of SQL strings in deterministic key order. The caller
    runs each, then ``SELECT pg_reload_conf()``, then re-snapshots SHOW.
    ``shared_buffers``/``max_connections`` need a restart to take effect;
    when a restart is impossible the verifier below reports the
    divergence instead of pretending enforcement worked.
    """
    base = dict(baseline or BASELINE)
    stmts = []
    for key in ENFORCED_KEYS:
        if key in base:
            stmts.append("ALTER SYSTEM SET %s = '%s';"
                         % (key, base[key]))
    stmts.append("SELECT pg_reload_conf();")
    return stmts


def normalize(value):
    """Compare SHOW output against baseline without unit trivia."""
    if value is None:
        return ""
    text = str(value).strip()
    # PostgreSQL SHOW returns e.g. '512MB', '300', 'on'. Baseline uses
    # the same spellings, so a lowered strip-compare suffices; numeric
    # strings compare exactly (no silent '512MB' == '524288kB' aliasing:
    # an alias spelling is reported as divergence for a human to judge).
    return text.lower()


def compare_baseline(pg_show, baseline=None):
    """Return the divergence list: ``['key: want X, effective Y', ...]``.

    Empty list means enforced. Keys absent from ``pg_show`` are skipped
    (snapshot unavailable), never treated as enforced.
    """
    base = dict(baseline or BASELINE)
    show = dict(pg_show or {})
    divergence = []
    for key in ENFORCED_KEYS:
        if key not in base:
            continue
        if key not in show or show[key] in (None, ""):
            continue
        if normalize(show[key]) != normalize(base[key]):
            divergence.append("key %s: want %r, effective %r"
                              % (key, base[key], show[key]))
    return divergence


def enforcement_verdict(pg_show, baseline=None):
    """Verdict dict recorded on every raw row.

    - ``enforced``: snapshot present and zero divergence.
    - ``disclosed``: snapshot present with divergence (blocking defect
      for the fairness re-check; the effective values are the claim).
    - ``unknown``: no snapshot (best-effort capture failed); never a
      pass, never a failure of the measured run itself.
    """
    show = dict(pg_show or {})
    present = [k for k in ENFORCED_KEYS if show.get(k) not in (None, "")]
    if not present:
        return {"status": "unknown", "divergence": []}
    divergence = compare_baseline(show, baseline)
    if divergence:
        return {"status": "disclosed", "divergence": divergence}
    return {"status": "enforced", "divergence": []}


def dataset_policy_sql():
    """Post-init dataset policy statements (methodology s3, spec-v1 s3).

    Per-chunk ``pgbench -i`` (workflow) then, before each measured run
    block, CHECKPOINT plus VACUUM ANALYZE so every arm in the chunk
    shares the same bloat baseline under interleaved round-robin order.
    """
    return ["CHECKPOINT;", "VACUUM (ANALYZE);"]


def bloat_accounting_sql():
    """Size-accounting query run per chunk for the bloat ledger."""
    return ("SELECT pg_size_pretty(pg_database_size(current_database())) "
            "AS db_size;")
