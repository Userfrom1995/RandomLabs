"""Cell JSON schema validation (harness-contract.md section 3, normative).

Exact fields; extra per-pooler fields are forbidden. N/A rows carry null
metrics, never zeros.
"""

ALLOWED_STATUSES = ("measured", "N/A (unsupported)", "timeout/inconclusive")

POOLER_VERSIONS = {
    "direct": None,
    "pgagroal": "2.1.0+tip",
    "pgbouncer": "1.25.2",
    "pgpool": "4.7.2",
    "odyssey": "1.5.1",
    "pgcat": "v1.2.0",
}

REQUIRED_FIELDS = (
    "cell_id", "workload", "pooler", "pooler_version", "pooler_config",
    "pg_version", "pg_config", "scale", "clients", "pool_size", "threads",
    "protocol", "churn", "duration_s", "warmup_s", "repeat", "seed",
    "tps", "latency_avg_ms", "latency_stddev_ms",
    "p50_ms", "p90_ms", "p99_ms", "p999_ms",
    "failed", "skipped", "exit_code", "status", "artifacts",
)

NULLABLE_METRICS = ("tps", "latency_avg_ms", "latency_stddev_ms",
                     "p50_ms", "p90_ms", "p99_ms", "p999_ms")

# Additive provenance fields: allowed when present, never required, so
# older committed raw records (written before the field existed) stay valid.
OPTIONAL_FIELDS = ("pg_show",)


def validate_cell(record):
    """Return a list of error strings; empty means valid."""
    errors = []
    for field in REQUIRED_FIELDS:
        if field not in record:
            errors.append("missing field %r" % field)
    for key in record:
        if key not in REQUIRED_FIELDS and key not in OPTIONAL_FIELDS:
            errors.append("forbidden extra field %r" % key)
    if errors:
        return errors
    status = record.get("status")
    if status not in ALLOWED_STATUSES:
        errors.append("bad status %r" % (status,))
    if status in ("N/A (unsupported)", "timeout/inconclusive"):
        for metric in NULLABLE_METRICS:
            if record.get(metric) is not None:
                errors.append(
                    "status %r requires null %r, got %r"
                    % (status, metric, record.get(metric)))
        if record.get("tps") == 0:
            errors.append("N/A/timeout rows must be null, never zero")
    else:
        if record.get("tps") is None:
            errors.append("measured rows require numeric tps")
        elif not isinstance(record.get("tps"), (int, float)):
            errors.append("tps must be numeric")
        elif record.get("tps") <= 0:
            errors.append("measured tps must be positive")
    artifacts = record.get("artifacts")
    if not isinstance(artifacts, dict):
        errors.append("artifacts must be an object")
    else:
        for key in ("stdout", "txnlog", "agglog"):
            if key not in artifacts:
                errors.append("artifacts missing %r" % key)
    pooler = record.get("pooler")
    if pooler not in POOLER_VERSIONS:
        errors.append("unknown pooler %r" % (pooler,))
    return errors


def make_na_record(cell, pooler, pooler_config, pg_version, pg_config,
                   threads, repeat, seed, reason="N/A (unsupported)"):
    if reason not in ALLOWED_STATUSES or reason == "measured":
        raise ValueError("N/A factory needs a non-measured status")
    return {
        "cell_id": cell["cell_id"],
        "workload": cell["workload"],
        "pooler": pooler,
        "pooler_version": POOLER_VERSIONS.get(pooler),
        "pooler_config": pooler_config,
        "pg_version": pg_version,
        "pg_config": dict(pg_config),
        "pg_show": {},
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
        "tps": None,
        "latency_avg_ms": None,
        "latency_stddev_ms": None,
        "p50_ms": None,
        "p90_ms": None,
        "p99_ms": None,
        "p999_ms": None,
        "failed": 0,
        "skipped": 0,
        "exit_code": None,
        "status": reason,
        "artifacts": {"stdout": None, "txnlog": None, "agglog": None},
    }
