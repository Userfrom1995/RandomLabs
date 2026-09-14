"""M8 per-run resource fields (plan section 7, spec-v1.md s3).

Throughput without mechanism is marketing: every raw row carries the
resource cost of the run it measured. All collection is best-effort and
never raises; unavailable values are None (nullable for M1/M2 rows,
which predate this module and stay schema-valid).

Fields recorded on ``resources`` (all nullable):
- ``cpu_time_s``: user + system CPU seconds of the harness process
  (``resource.getrusage`` self; documents loadgen-side cost only, never
  pooler-side CPU, which needs per-process sampling in M9 soak arms).
- ``peak_rss_kb``: peak resident set of the harness process
  (``ru_maxrss``; Linux reports kilobytes).
- ``fd_count``: open file descriptors of the harness process
  (``/proc/self/fd`` count; ``None`` off-Linux).
- ``pool_wait``: pool wait/queue counters where the pooler exposes them
  (PgBouncer ``SHOW POOLS`` ``cl_waiting``, Odyssey statistics, pgcat
  admin ``SHOW POOLS``); ``None`` until an adapter reports them, never
  fabricated. Keyed dict or None.
- ``pg_stat``: delta of ``pg_stat_database`` counters (``xact_commit``,
  ``xact_rollback``, ``blks_read``, ``blks_hit``, ``tup_returned``,
  ``tup_fetched``, ``conflicts``, ``deadlocks``, ``temp_bytes``)
  between snapshots taken before and after the measured run; None when
  the snapshot queries are unavailable.
- ``wall_s``: monotonic clock stamp (``time.monotonic``) of this
  sample; the M10 soak pairs pre/post samples and diffs the stamps
  into the run wall duration (``soak_drift``). None when the clock is
  unavailable, never fabricated.

Stdlib only. Nothing here touches the network; the SQL strings are
executed by the workflow/runner (Lab scope), deltas computed here.
"""

import os
import time

# Counters read from pg_stat_database for one snapshot row of the
# benchmark database. All are monotonically non-decreasing bigint
# counters, so after-minus-before is the per-run mechanism evidence.
PG_STAT_KEYS = ("xact_commit", "xact_rollback", "blks_read", "blks_hit",
                "tup_returned", "tup_fetched", "tup_inserted",
                "tup_updated", "tup_deleted", "conflicts", "deadlocks",
                "temp_bytes")

RESOURCE_KEYS = ("cpu_time_s", "peak_rss_kb", "fd_count",
                 "pool_wait", "pg_stat", "wall_s")

# Soak drift fields (poolduel/harness/soak.py soak_drift output): leak
# deltas plus the wall window they were measured across. RSS/FD deltas
# may be negative (shrinkage is evidence, not an error), so no sign
# constraint applies; every field is nullable (missing -> None).
DRIFT_KEYS = ("rss_delta_kb", "fd_delta", "cpu_time_s", "duration_s")


def pg_stat_snapshot_sql(dbname="benchdb"):
    """SELECT returning one row of pg_stat_database counters."""
    cols = ", ".join(PG_STAT_KEYS)
    return ("SELECT %s FROM pg_stat_database "
            "WHERE datname = '%s';" % (cols, dbname))


def delta_snapshots(before, after):
    """Per-run pg_stat deltas from two snapshot dicts.

    Returns a dict of after-minus-before per key, or None for keys
    missing on either side (never raises, never guesses).
    """
    try:
        before = dict(before or {})
    except (TypeError, ValueError, AttributeError):
        before = {}
    try:
        after = dict(after or {})
    except (TypeError, ValueError, AttributeError):
        after = {}
    delta = {}
    for key in PG_STAT_KEYS:
        try:
            if key in before and key in after:
                delta[key] = after[key] - before[key]
            else:
                delta[key] = None
        except Exception:
            delta[key] = None
    return delta


def _self_rusage():
    try:
        import resource
        usage = resource.getrusage(resource.RUSAGE_SELF)
        cpu = float(usage.ru_utime) + float(usage.ru_stime)
        rss = int(usage.ru_maxrss)
        return cpu, rss
    except Exception:
        return None, None


def _self_fd_count():
    try:
        return len(os.listdir("/proc/self/fd"))
    except OSError:
        return None


def _wall_now():
    try:
        return float(time.monotonic())
    except Exception:
        return None


def collect_self_resources(pool_wait=None, pg_stat=None):
    """Best-effort harness-side resource record (never raises).

    ``pool_wait``/``pg_stat`` are caller-supplied (adapter counters,
    pg_stat deltas) or None; this function never fabricates them.
    ``wall_s`` stamps the sample on the monotonic clock for soak
    pre/post pairing (None only when the clock itself fails).
    """
    try:
        cpu, rss = _self_rusage()
        return {
            "cpu_time_s": cpu,
            "peak_rss_kb": rss,
            "fd_count": _self_fd_count(),
            "pool_wait": dict(pool_wait) if pool_wait is not None else None,
            "pg_stat": dict(pg_stat) if pg_stat is not None else None,
            "wall_s": _wall_now(),
        }
    except Exception:
        return {"cpu_time_s": None, "peak_rss_kb": None,
                "fd_count": None, "pool_wait": None, "pg_stat": None,
                "wall_s": None}


def validate_resources(value):
    """Error strings for a ``resources`` block (empty when valid).

    None (missing block, pre-M8 rows) is valid. Present blocks must be
    dicts with exactly the known keys; numerics must be non-negative
    when present.
    """
    if value is None:
        return []
    if not isinstance(value, dict):
        return ["resources must be an object or null"]
    errors = []
    for key in value:
        if key not in RESOURCE_KEYS:
            errors.append("resources forbids extra field %r" % key)
    for key in ("cpu_time_s", "peak_rss_kb", "fd_count", "wall_s"):
        if key in value and value[key] is not None:
            if isinstance(value[key], bool) or not isinstance(
                    value[key], (int, float)):
                errors.append("resources.%s must be numeric or null" % key)
            elif value[key] < 0:
                errors.append("resources.%s must be non-negative" % key)
    for key in ("pool_wait", "pg_stat"):
        if key in value and value[key] is not None:
            if not isinstance(value[key], dict):
                errors.append("resources.%s must be an object or null" % key)
    return errors


def validate_drift(value):
    """Error strings for a ``resources_drift`` block (empty when valid).

    None (missing block: non-soak rows, or pre-M10 rows) is valid.
    Present blocks must be dicts with exactly the known keys; every
    field is numeric-or-null with no sign constraint (RSS/FD deltas
    may legitimately go negative).
    """
    if value is None:
        return []
    if not isinstance(value, dict):
        return ["resources_drift must be an object or null"]
    errors = []
    for key in value:
        if key not in DRIFT_KEYS:
            errors.append("resources_drift forbids extra field %r" % key)
    for key in DRIFT_KEYS:
        if key in value and value[key] is not None:
            if isinstance(value[key], bool) or not isinstance(
                    value[key], (int, float)):
                errors.append(
                    "resources_drift.%s must be numeric or null" % key)
    return errors
