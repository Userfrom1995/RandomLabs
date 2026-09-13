"""Shared measurement procedure. Pooler-blind; adapters never own timeouts.

Per-cell caps (test-matrix.md section 5): standard 8 min, flagship 12 min.
Over-cap cells are timeout/inconclusive. The runner owns init, checkpoint,
warmup, measure, log collection, and JSON emission.
"""

import glob
import json
import os
import shutil
import subprocess
import time

from . import pgbench as pgbench_mod
from .cells import check_ratio
from .chunk import mark_completed
from .schema import POOLER_VERSIONS, validate_cell

STANDARD_CAP_S = 8 * 60
FLAGSHIP_CAP_S = 12 * 60

PG_CONFIG_BASELINE = {
    "shared_buffers": "512MB",
    "max_connections": 300,
    "synchronous_commit": "on",
    "fsync": "on",
}

SAMPLING_RATE_FALLBACK = "0.1"

# Effective server settings recorded per arm-run (fairness audit: the
# values PostgreSQL actually runs with, not just the requested config).
PG_SHOW_KEYS = ("server_version", "max_connections", "shared_buffers",
                "synchronous_commit", "fsync", "password_encryption")


def cell_cap_s(cell):
    return FLAGSHIP_CAP_S if cell.get("flagship") else STANDARD_CAP_S


def run_subprocess(argv, timeout_s, cwd=None, env=None):
    """Run argv with a hard cap. Returns dict(rc, stdout, stderr, timed_out)."""
    try:
        proc = subprocess.run(
            argv, cwd=cwd, env=env, timeout=timeout_s,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True)
        return {"rc": proc.returncode, "stdout": proc.stdout,
                "stderr": proc.stderr, "timed_out": False}
    except subprocess.TimeoutExpired as exc:
        out = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (
            exc.stdout or "")
        err = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (
            exc.stderr or "")
        return {"rc": None, "stdout": out, "stderr": err, "timed_out": True}
    except FileNotFoundError as exc:
        return {"rc": None, "stdout": "",
                "stderr": "missing binary: %s" % exc, "timed_out": False}


def pg_version_string(pg_version_cmd="SELECT version()"):
    return pg_version_cmd


def capture_pg_show(host, port, dbname, user, env=None, timeout_s=30):
    """Best-effort SHOW snapshot of effective PG settings (never raises).

    Returns a dict (possibly empty) for the record's ``pg_show`` field.
    An empty dict means the snapshot was unavailable, never a failure of
    the measured run itself.
    """
    show = {}
    for key in PG_SHOW_KEYS:
        res = run_subprocess(
            ["psql", "-h", host, "-p", str(port), "-U", user, "-d", dbname,
             "-tAc", "SHOW %s" % key],
            timeout_s=timeout_s, env=env)
        if res["rc"] == 0 and (res["stdout"] or "").strip():
            show[key] = res["stdout"].strip().splitlines()[0].strip()
    return show


def find_log(log_dir, prefix):
    cands = sorted(glob.glob(os.path.join(log_dir, prefix + "*")))
    return cands[0] if cands else None


def find_logs(log_dir, prefix):
    """All pgbench log files for one run (one per worker with -j N).

    Returns the sorted list (possibly empty). Warmup files carry a
    ``warm-`` prefix so they never match a measured prefix.
    """
    return sorted(glob.glob(os.path.join(log_dir, prefix + "*")))


def pick_txn_path(log_dir, prefix):
    """Provenance pointer to a per-worker txn log (never the aggregate).

    ``-`` (0x2D) sorts before ``.`` (0x2E), so an aggregate sibling of a
    worker file would otherwise win an unfiltered glob. Returns None
    when no per-worker file exists.
    """
    cands = [p for p in find_logs(log_dir, prefix)
             if "aggregate" not in os.path.basename(p)]
    return cands[0] if cands else None


def measure_once(cell, host, port, dbname, user, threads, seed, repeat,
                 workdir, pg_config=None, env=None):
    """Run warmup (discarded) then one measured pgbench run for a cell.

    Returns a result record skeleton with parsed metrics (no pooler fields).
    """
    check_ratio(cell)
    os.makedirs(workdir, exist_ok=True)
    log_dir = os.path.join(workdir, "logs")
    os.makedirs(log_dir, exist_ok=True)
    prefix = "cell-%s-r%d-%d" % (cell["cell_id"], repeat, int(time.time()) % 100000)
    cap = cell_cap_s(cell)

    warmup_argv = pgbench_mod.build_argv(
        cell, host, port, dbname, user, threads,
        duration_s=cell["warmup_s"], log_prefix="warm-" + prefix, seed=seed)
    warmup_res = run_subprocess(warmup_argv, timeout_s=cell["warmup_s"] + 120,
                                cwd=log_dir, env=env)

    argv = pgbench_mod.build_argv(
        cell, host, port, dbname, user, threads,
        duration_s=cell["duration_s"], log_prefix=prefix, seed=seed)
    start = time.time()
    res = run_subprocess(argv, timeout_s=cap, cwd=log_dir, env=env)
    elapsed = time.time() - start

    stdout_path = os.path.join(log_dir, prefix + ".stdout.txt")
    with open(stdout_path, "w") as f:
        f.write("CMD: %s\n" % " ".join(argv))
        f.write("WARMUP_RC: %s\n" % warmup_res["rc"])
        f.write("RC: %s\nTIMED_OUT: %s\nELAPSED_S: %.1f\n" % (
            res["rc"], res["timed_out"], elapsed))
        f.write("--- stdout ---\n%s\n" % res["stdout"])
        f.write("--- stderr ---\n%s\n" % res["stderr"])

    txn_path = pick_txn_path(log_dir, prefix)
    txn_paths = [p for p in find_logs(log_dir, prefix)
                 if "aggregate" not in os.path.basename(p)]
    agg_path = None
    for cand in sorted(glob.glob(os.path.join(log_dir, prefix + "*"))):
        if "aggregate" in os.path.basename(cand):
            agg_path = cand

    if res["timed_out"]:
        return {
            "status": "timeout/inconclusive",
            "tps": None, "latency_avg_ms": None,
            "latency_stddev_ms": None, "p50_ms": None, "p90_ms": None,
            "p99_ms": None, "p999_ms": None,
            "failed": 0, "skipped": 0, "exit_code": None,
            "stdout_path": stdout_path, "txn_path": txn_path,
            "agg_path": agg_path, "stderr": res["stderr"],
            "stdout": res["stdout"],
        }
    try:
        parsed = pgbench_mod.parse_stdout(res["stdout"])
    except ValueError:
        return {
            "status": "timeout/inconclusive",
            "tps": None, "latency_avg_ms": None,
            "latency_stddev_ms": None, "p50_ms": None, "p90_ms": None,
            "p99_ms": None, "p999_ms": None,
            "failed": 0, "skipped": 0,
            "exit_code": res["rc"],
            "stdout_path": stdout_path, "txn_path": txn_path,
            "agg_path": agg_path, "stderr": res["stderr"],
            "stdout": res["stdout"],
        }
    if pgbench_mod.failed_ratio_exceeds(parsed):
        parsed["_rejected"] = True
    pct = {"p50_ms": None, "p90_ms": None, "p99_ms": None, "p999_ms": None}
    if txn_paths:
        try:
            pct = pgbench_mod.parse_txn_logs(txn_paths)
        except ValueError:
            pct = {"p50_ms": None, "p90_ms": None, "p99_ms": None,
                   "p999_ms": None}
    prepared_fail = (
        cell.get("protocol") == "prepared"
        and pgbench_mod.has_prepared_statement_error(res["stderr"],
                                                    res["stdout"]))
    status = "measured"
    if parsed.get("_rejected") or prepared_fail or res["rc"] not in (0,):
        if cell.get("protocol") == "prepared" and prepared_fail:
            status = "timeout/inconclusive"
        elif res["rc"] not in (0,):
            status = "timeout/inconclusive"
        else:
            status = "timeout/inconclusive"
        if parsed.get("_rejected"):
            status = "timeout/inconclusive"
    return {
        "status": status,
        "tps": parsed["tps"] if status == "measured" else None,
        "latency_avg_ms": (parsed["latency_avg_ms"]
                           if status == "measured" else None),
        "latency_stddev_ms": (parsed["latency_stddev_ms"]
                              if status == "measured" else None),
        "p50_ms": pct.get("p50_ms") if status == "measured" else None,
        "p90_ms": pct.get("p90_ms") if status == "measured" else None,
        "p99_ms": pct.get("p99_ms") if status == "measured" else None,
        "p999_ms": pct.get("p999_ms") if status == "measured" else None,
        "failed": parsed.get("failed", 0),
        "skipped": parsed.get("skipped", 0),
        "exit_code": res["rc"],
        "stdout_path": stdout_path, "txn_path": txn_path,
        "agg_path": agg_path, "stderr": res["stderr"],
        "stdout": res["stdout"],
    }


def build_record(cell, pooler, pooler_config, measurement, pg_version,
                 pg_config, threads, repeat, seed, pg_show=None):
    return {
        "cell_id": cell["cell_id"],
        "workload": cell["workload"],
        "pooler": pooler,
        "pooler_version": POOLER_VERSIONS.get(pooler),
        "pooler_config": pooler_config,
        "pg_version": pg_version,
        "pg_config": dict(pg_config or PG_CONFIG_BASELINE),
        "pg_show": dict(pg_show or {}),
        "scale": cell.get("scale", 10),
        "clients": cell["clients"],
        "pool_size": cell["pool_size"],
        "threads": threads,
        "protocol": cell["protocol"],
        "churn": bool(cell["churn"]),
        "duration_s": cell["duration_s"],
        "warmup_s": cell["warmup_s"],
        "repeat": repeat,
        "seed": seed,
        "tps": measurement["tps"],
        "latency_avg_ms": measurement["latency_avg_ms"],
        "latency_stddev_ms": measurement["latency_stddev_ms"],
        "p50_ms": measurement["p50_ms"],
        "p90_ms": measurement["p90_ms"],
        "p99_ms": measurement["p99_ms"],
        "p999_ms": measurement["p999_ms"],
        "failed": measurement["failed"],
        "skipped": measurement["skipped"],
        "exit_code": measurement["exit_code"],
        "status": measurement["status"],
        "artifacts": {
            "stdout": measurement.get("stdout_path"),
            "txnlog": measurement.get("txn_path"),
            "agglog": measurement.get("agg_path"),
        },
    }


def run_plan(plan, adapters, out_dir, dbname="benchdb", user="benchuser",
             host="127.0.0.1", threads=4, seed=42, pg_version="PG 17",
             pg_config=None, env=None):
    """Execute a round-robin plan. Returns (records, errors).

    adapters maps arm name to an adapter instance exposing start(),
    healthcheck(timeout_s), stop(), config_text(cell), port. The runner
    starts the adapter before each arm run and stops it right after, so
    no pooler state leaks across arms.
    """
    pg_config = dict(pg_config or PG_CONFIG_BASELINE)
    os.makedirs(out_dir, exist_ok=True)
    raw_dir = os.path.join(out_dir, "raw")
    os.makedirs(raw_dir, exist_ok=True)
    records, errors = [], []
    for (cell, arm, repeat) in plan:
        adapter = adapters[arm]
        workdir = os.path.join(out_dir, "work-%s-%s-r%d"
                               % (cell["cell_id"], arm, repeat))
        try:
            adapter.setup(workdir, cell)
            adapter.start()
            adapter.healthcheck(timeout_s=30)
            port = adapter.port
            config_text = adapter.config_text(cell)
            measurement = measure_once(
                cell, host, port, dbname, user, threads,
                seed + repeat, repeat, workdir, pg_config, env)
            record = build_record(cell, arm, config_text, measurement,
                                  pg_version, pg_config, threads,
                                  repeat, seed + repeat,
                                  pg_show=capture_pg_show(
                                      host, port, dbname, user, env))
            errs = validate_cell(record)
            if errs:
                errors.append("%s/%s/r%d schema: %s"
                              % (cell["cell_id"], arm, repeat,
                                 "; ".join(errs)))
                continue
            fname = os.path.join(
                raw_dir, "%s-%s-r%d.json"
                % (cell["cell_id"], arm, repeat))
            with open(fname, "w") as f:
                json.dump(record, f, indent=2, sort_keys=True)
            records.append(record)
            mark_completed(out_dir, cell["cell_id"], arm, repeat)
        except Exception as exc:
            errors.append("%s/%s/r%d error: %s"
                          % (cell["cell_id"], arm, repeat, exc))
        finally:
            try:
                adapter.stop()
            except Exception:
                pass
    return records, errors


def write_medians(records, out_path):
    """Aggregate raw repeat records into medians JSON with bands and CV."""
    from .stats import summarize
    grouped = {}
    for rec in records:
        key = (rec["cell_id"], rec["pooler"])
        grouped.setdefault(key, []).append(rec)
    medians = []
    for (cell_id, pooler), rows in sorted(grouped.items()):
        rows = sorted(rows, key=lambda r: r["repeat"])
        entry = {"cell_id": cell_id, "pooler": pooler,
                 "n": len(rows),
                 "status": rows[0]["status"] if rows else None}
        for metric in ("tps", "latency_avg_ms", "p50_ms", "p90_ms",
                       "p99_ms", "p999_ms"):
            entry[metric] = summarize(
                [r[metric] for r in rows if r[metric] is not None])
        medians.append(entry)
    with open(out_path, "w") as f:
        json.dump(medians, f, indent=2, sort_keys=True)
    return medians
