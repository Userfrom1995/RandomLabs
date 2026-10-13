"""M8 workload breadth (plan section 7, spec-v1.md s3).

New workload shapes beyond the three pgbench builtins, all as DATA plus
small helpers. No procedure branches live here; ``pgbench.py`` owns
flags, the runner owns script files and timeouts.

pgbench facts used (pgbench ``\\setrandom`` docs, stable across
PG 15/16/17/18):
- ``\\setrandom name min max MODE`` supports ``uniform``, ``gaussian``,
  ``exponential``, and ``zipfian`` distributions inside custom scripts.
- ``-R rate`` runs a fixed-offer schedule (transactions per second);
  ``-L limit`` drops transactions over the latency limit (counted as
  ``skipped``/over-limit, never hidden).
- ``-f file`` runs a custom script instead of a builtin; no ``-S``,
  ``-N``, or ``-b`` selector is passed alongside it.

Registry:
- ``zipf-select``: skewed read (zipfian account pick), pooling under
  hotspot contention instead of uniform spread.
- ``think-time``: select-only base throttled by ``-R``/``-L`` (client
  think time simulated as fixed offer, not as sleep inside the txn).
- ``multi-statement``: one transaction carrying several statements
  (BEGIN..END in-script), exercising parse/bind across pooler paths.
- ``jsonb-write``: UPDATE against a jsonb side table (DDL noted below;
  created once per dataset init, not per cell).
- ``copy-adjacent``: multi-row INSERT batch (COPY-adjacent write volume
  without requiring COPY protocol through poolers, which would rewrite
  protocol semantics rather than pooling behavior).
- ``fixed-offer`` is a modifier, not a workload: any base cell may carry
  ``offer_rate`` (``-R``) plus optional ``latency_limit`` (``-L``).

``pipeline`` mode (``\\startpipeline``) stays forbidden: it changes
extended-protocol semantics rather than pooling behavior, and fewer
than all contenders implement it. See ``PIPELINE_FORBIDDEN_REASON``.
"""

import math
import os

# Workloads served by pgbench builtins (flags owned by pgbench.py).
BUILTIN_WORKLOADS = ("tpcb-like", "select-only", "simple-update")

# Workloads served by a custom script written per run (no -S/-N/-b).
SCRIPT_WORKLOADS = ("zipf-select", "multi-statement", "jsonb-write",
                    "copy-adjacent")

# think-time is select-only (-S) plus the fixed-offer modifier.
MODIFIER_WORKLOADS = ("think-time",)

ALL_M8_WORKLOADS = (SCRIPT_WORKLOADS + MODIFIER_WORKLOADS
                    + ("fixed-offer",))

PIPELINE_FORBIDDEN_REASON = (
    "pipeline mode (\\startpipeline) is forbidden: it changes "
    "extended-protocol semantics rather than pooling behavior, and "
    "fewer than all contenders implement it, so a pipeline cell could "
    "never be best-mode-compared on shared load (spec-v1.md s2). "
    "Statement batching coverage comes from the multi-statement "
    "workload instead, which stays inside the standard protocol."
)

JSONB_DDL = (
    "CREATE TABLE IF NOT EXISTS poolduel_jsonb "
    "(id serial PRIMARY KEY, payload jsonb NOT NULL); "
    "INSERT INTO poolduel_jsonb (payload) "
    "SELECT '{}'::jsonb FROM generate_series(1, 10000) "
    "ON CONFLICT DO NOTHING;"
)

COPY_ADJACENT_DDL = (
    "CREATE TABLE IF NOT EXISTS poolduel_copy "
    "(id serial PRIMARY KEY, a int NOT NULL, b int NOT NULL, "
    "c text NOT NULL);"
)

ZIPF_SELECT_SCRIPT = """\
-- M8 zipf-select: skewed read over pgbench_accounts.
-- \\setrandom zipfian is a pgbench builtin distribution (PG docs).
\\setrandom aid 1 1000000 zipfian
SELECT abalance FROM pgbench_accounts WHERE aid = :aid;
"""

MULTI_STATEMENT_SCRIPT = """\
-- M8 multi-statement: one transaction, several statements.
BEGIN;
SELECT abalance FROM pgbench_accounts WHERE aid = 1;
UPDATE pgbench_accounts SET abalance = abalance WHERE aid = 1;
SELECT abalance FROM pgbench_branches WHERE bid = 1;
END;
"""

JSONB_WRITE_SCRIPT = """\
-- M8 jsonb-write: UPDATE against the poolduel_jsonb side table.
-- DDL (dataset init, once): %s
\\setrandom jid 1 10000 uniform
UPDATE poolduel_jsonb SET payload = jsonb_build_object('v', :jid)
WHERE id = :jid;
""" % JSONB_DDL

COPY_ADJACENT_SCRIPT = """\
-- M8 copy-adjacent: multi-row INSERT batch (no COPY protocol).
-- DDL (dataset init, once): %s
\\setrandom ca 1 1000000 uniform
INSERT INTO poolduel_copy (a, b, c) VALUES
  (:ca, :ca, 'row-one'), (:ca, :ca, 'row-two'),
  (:ca, :ca, 'row-three'), (:ca, :ca, 'row-four'),
  (:ca, :ca, 'row-five'), (:ca, :ca, 'row-six'),
  (:ca, :ca, 'row-seven'), (:ca, :ca, 'row-eight'),
  (:ca, :ca, 'row-nine'), (:ca, :ca, 'row-ten');
""" % COPY_ADJACENT_DDL

SCRIPTS = {
    "zipf-select": ZIPF_SELECT_SCRIPT,
    "multi-statement": MULTI_STATEMENT_SCRIPT,
    "jsonb-write": JSONB_WRITE_SCRIPT,
    "copy-adjacent": COPY_ADJACENT_SCRIPT,
}

# Side-table DDL per script workload (run once at dataset init).
SCRIPT_DDL = {
    "zipf-select": None,
    "multi-statement": None,
    "jsonb-write": JSONB_DDL,
    "copy-adjacent": COPY_ADJACENT_DDL,
}


def needs_script(workload):
    """True when the workload runs from a custom script file."""
    return workload in SCRIPT_WORKLOADS


def script_sql(workload):
    """Script text for a script workload (KeyError for builtins)."""
    if workload not in SCRIPTS:
        raise KeyError("workload %r has no custom script" % (workload,))
    return SCRIPTS[workload]


def script_ddl(workload):
    """Side-table DDL for a script workload, or None when unneeded."""
    if workload not in SCRIPT_WORKLOADS:
        raise KeyError("workload %r is not a script workload" % (workload,))
    return SCRIPT_DDL[workload]


def write_script(workdir, workload):
    """Write the custom script into workdir; return its absolute path."""
    path = os.path.join(os.path.abspath(workdir),
                        "workload-%s.sql" % workload)
    with open(path, "w") as f:
        f.write(script_sql(workload))
    return path


def fixed_offer_flags(cell):
    """Extra ``-R``/``-L`` flags from cell keys (empty when unset).

    ``offer_rate`` maps to ``-R`` (fixed-offer transactions per second);
    ``latency_limit`` maps to ``-L`` (seconds; over-limit transactions
    are counted as skipped, never hidden).
    """
    flags = []
    rate = cell.get("offer_rate")
    if rate is not None:
        try:
            rate_num = float(rate)
        except (TypeError, ValueError):
            raise ValueError("offer_rate must be positive, got %r" % (rate,))
        if not math.isfinite(rate_num) or rate_num <= 0:
            raise ValueError("offer_rate must be positive, got %r" % (rate,))
        flags.extend(["-R", str(int(rate_num))])
    limit = cell.get("latency_limit")
    if limit is not None:
        try:
            limit_num = float(limit)
        except (TypeError, ValueError):
            raise ValueError("latency_limit must be positive, got %r"
                             % (limit,))
        if not math.isfinite(limit_num) or limit_num <= 0:
            raise ValueError("latency_limit must be positive, got %r"
                             % (limit,))
        flags.extend(["-L", str(limit)])
    return flags
