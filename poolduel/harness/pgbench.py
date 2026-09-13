"""pgbench argv builder, stdout parser, and txn-log percentile math.

Identical flags per cell; only host/port differ per arm. No per-pooler
branches. Flag set follows methodology.md section 2.

Log-format notes (proven against pgbench 16.15/17.11 locally, 2026-09-13):
- Without ``-C`` pgbench prints ``tps = N (without initial connection
  time)``; with ``-C`` (reconnect per transaction) it prints ``tps = N
  (including reconnection times)`` instead. The parser accepts either
  parenthetical and prefers the excluding line when both are present.
- Per-transaction logs (``-l`` WITHOUT ``--aggregate-interval``) have
  lines ``client_id transaction_no time_us file_no time_epoch time_us``
  where field 2 is the latency in microseconds (PG docs, per-transaction
  logging). With ``--aggregate-interval`` the same files instead carry
  aggregate lines ``interval_start num_tx latency_sum ...`` whose field 2
  is a SUM, not a latency. The harness never passes
  ``--aggregate-interval`` (percentiles need per-transaction rows); the
  parser additionally skips aggregate-shaped lines (epoch-like first
  field) so a stray aggregate file can never poison percentiles again.
"""

import math
import os
import re

TPS_RE = re.compile(
    r"tps\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*\(([^)]*)\)")
LAT_AVG_RE = re.compile(r"latency average\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*ms")
LAT_STD_RE = re.compile(r"latency stddev\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*ms")
PROCESSED_RE = re.compile(
    r"number of transactions actually processed:\s*([0-9]+)")
FAILED_RE = re.compile(r"number of failed transactions:\s*([0-9]+)")
SKIPPED_RE = re.compile(r"number of transactions skipped:\s*([0-9]+)")

# pgbench exit codes: 0 ok, 1 setup failure, 2 mid-run SQL errors.
EXIT_MEANING = {0: "ok", 1: "setup failure", 2: "mid-run SQL errors"}

TXN_LOG_SIZE_GUARD_BYTES = 200 * 1024 * 1024


def workload_flags(cell):
    """pgbench workload flags for a cell (workload + protocol + churn)."""
    flags = []
    workload = cell["workload"]
    if workload == "select-only":
        flags.append("-S")
    elif workload == "simple-update":
        flags.append("-N")
    elif workload == "tpcb-like":
        flags.extend(["-b", "tpcb-like"])
    else:
        raise ValueError("unknown workload %r" % (workload,))
    if cell.get("protocol") == "prepared":
        flags.extend(["-M", "prepared"])
    else:
        flags.extend(["-M", "simple"])
    if cell.get("churn"):
        flags.append("-C")
    return flags


def build_argv(cell, host, port, dbname, user, threads, duration_s=None,
               log_prefix="cell", seed=42, agg_interval_s=None,
               progress_s=10, sampling_rate=None):
    """Build an identical-flags pgbench invocation for one measured run.

    Per-transaction logs (``-l``) are always written; ``--aggregate-interval``
    stays off (None) so the log keeps per-transaction rows for p50/p99/p999
    math. Pass an explicit ``agg_interval_s`` only for aggregate-shape
    experiments (the txn-log parser skips aggregate lines either way).
    """
    duration = duration_s if duration_s is not None else cell["duration_s"]
    argv = ["pgbench", "-h", host, "-p", str(port), "-U", user]
    argv.extend(workload_flags(cell))
    argv.extend(["-c", str(cell["clients"]), "-j", str(threads),
                 "-T", str(duration)])
    argv.extend(["-P", str(progress_s), "-l",
                 "--log-prefix=%s" % log_prefix,
                 "--random-seed=%d" % int(seed)])
    if agg_interval_s is not None:
        argv.append("--aggregate-interval=%d" % int(agg_interval_s))
    if sampling_rate is not None:
        argv.append("--sampling-rate=%s" % sampling_rate)
    argv.append(dbname)
    return argv


def build_init_argv(pgbench_bin, host, port, dbname, user, scale):
    return [pgbench_bin or "pgbench", "-h", host, "-p", str(port),
            "-U", user, "-i", "-s", str(scale), dbname]


def parse_stdout(text):
    """Parse pgbench stdout into metrics. Raises ValueError if tps missing.

    Accepts every pgbench tps parenthetical. Prefers the steady-state
    (``without ...`` / ``excluding ...``) line; falls back to the
    ``including ...`` line that ``-C`` (churn) runs print.
    """
    found = TPS_RE.findall(text or "")
    if not found:
        raise ValueError("pgbench stdout has no tps line")
    pick = None
    for value, paren in found:
        low = paren.lower()
        if "without" in low or "excluding" in low:
            pick = value
            break
    if pick is None:
        pick = found[0][0]
    out = {"tps": float(pick)}
    m = LAT_AVG_RE.search(text)
    out["latency_avg_ms"] = float(m.group(1)) if m else None
    m = LAT_STD_RE.search(text)
    out["latency_stddev_ms"] = float(m.group(1)) if m else None
    m = PROCESSED_RE.search(text)
    out["processed"] = int(m.group(1)) if m else None
    m = FAILED_RE.search(text)
    out["failed"] = int(m.group(1)) if m else 0
    m = SKIPPED_RE.search(text)
    out["skipped"] = int(m.group(1)) if m else 0
    return out


def _quantile(sorted_vals, q):
    if not sorted_vals:
        return None
    if len(sorted_vals) == 1:
        return float(sorted_vals[0])
    pos = q * (len(sorted_vals) - 1)
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return float(sorted_vals[lo])
    frac = pos - lo
    return sorted_vals[lo] * (1.0 - frac) + sorted_vals[hi] * frac


def percentiles_from_values(values_ms):
    vals = sorted(values_ms)
    return {
        "p50_ms": _quantile(vals, 0.50),
        "p90_ms": _quantile(vals, 0.90),
        "p99_ms": _quantile(vals, 0.99),
        "p999_ms": _quantile(vals, 0.999),
    }


# Aggregate-log lines start with an interval-start epoch (~1.7e9); real
# per-transaction lines start with a small client id. Anything at or above
# this threshold in field 0 is an aggregate/foreign line, never a latency.
EPOCH_LIKE_THRESHOLD = 1000000000


def _txn_latency_ms(parts):
    """Latency ms from split per-transaction fields, or None to skip."""
    if len(parts) < 6:
        return None
    try:
        first = int(parts[0])
    except ValueError:
        return None
    if first >= EPOCH_LIKE_THRESHOLD:
        return None  # aggregate-log line (interval_start ...), not a txn
    try:
        us = int(parts[2])
    except ValueError:
        return None  # e.g. literal "skipped" under --rate/--latency-limit
    if us < 0:
        return None
    return us / 1000.0


def parse_txn_log(path):
    """Offline p50/p90/p99/p999 from a pgbench -l per-transaction log.

    Uses the microsecond time_us column (field index 2) of per-transaction
    lines (``client_id transaction_no time_us file_no time_epoch time_us``).
    Aggregate-shaped lines (``interval_start num_tx latency_sum ...``) and
    unparseable rows are skipped, never parsed as latencies: field 2 of an
    aggregate line is a SUM and poisoned every committed p99 before M4
    (aggregate-interval has since been removed from build_argv).
    Raises if the file threatens the 200 MB guard so callers add
    --sampling-rate instead of OOMing the runner.
    """
    size = os.path.getsize(path)
    if size > TXN_LOG_SIZE_GUARD_BYTES:
        raise ValueError(
            "txn log %s is %d bytes over the 200 MB guard; rerun with "
            "--sampling-rate=0.1" % (path, size))
    values_ms = []
    with open(path, "r", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            latency = _txn_latency_ms(line.split())
            if latency is not None:
                values_ms.append(latency)
    if not values_ms:
        return {"p50_ms": None, "p90_ms": None,
                "p99_ms": None, "p999_ms": None, "samples": 0}
    pct = percentiles_from_values(values_ms)
    pct["samples"] = len(values_ms)
    return pct


def parse_txn_logs(paths):
    """Merge percentiles across per-worker pgbench log files.

    pgbench with -j N writes N log files (prefix.PID, prefix.PID.1, ...);
    parsing only the first one samples 1/N of the transactions. Returns
    the same shape as parse_txn_log with the merged sample count.
    """
    values_ms = []
    for path in paths or []:
        size = os.path.getsize(path)
        if size > TXN_LOG_SIZE_GUARD_BYTES:
            raise ValueError(
                "txn log %s is %d bytes over the 200 MB guard; rerun with "
                "--sampling-rate=0.1" % (path, size))
        with open(path, "r", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                latency = _txn_latency_ms(line.split())
                if latency is not None:
                    values_ms.append(latency)
    if not values_ms:
        return {"p50_ms": None, "p90_ms": None,
                "p99_ms": None, "p999_ms": None, "samples": 0}
    pct = percentiles_from_values(values_ms)
    pct["samples"] = len(values_ms)
    return pct


def failed_ratio_exceeds(parsed, processed=None):
    """True when failed transactions exceed 1% of processed (reject rule)."""
    failed = parsed.get("failed", 0) or 0
    total = parsed.get("processed") or processed
    if not total:
        return failed > 0
    return (failed / total) > 0.01


def has_prepared_statement_error(stderr_text, stdout_text=""):
    """Detect SQLSTATE 26000 (prepared statement does not exist)."""
    blob = (stderr_text or "") + "\n" + (stdout_text or "")
    return "26000" in blob or "prepared statement" in blob.lower()
