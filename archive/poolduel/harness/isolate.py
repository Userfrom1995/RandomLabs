"""M6 isolation records (plan section 7, spec-v1.md s3).

Every raw row carries the iron it ran on so cross-hardware comparisons
can never be smuggled in. All collection is best-effort and never
raises: unavailable values become the string ``"unknown"``. Old rows
without this block stay schema-valid (nullable for M1/M2 rows).
"""

import os
import platform


def _read_first(path):
    try:
        with open(path) as f:
            for line in f:
                text = line.strip()
                if text:
                    return text
    except OSError:
        pass
    return ""


def _cpu_model():
    try:
        with open("/proc/cpuinfo") as f:
            for line in f:
                if line.startswith("model name"):
                    return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or platform.machine() or "unknown"


def _governor():
    text = _read_first(
        "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor")
    return text or "unknown"


def collect_isolation(threads=4, pinning="none"):
    """Return the isolation dict recorded on every raw row.

    Fields: cpu_model, kernel, nproc, governor, threads (harness
    ``--threads``), pgbench_j (fixed equal to threads: the loadgen
    thread count is pinned to the harness value, never to victim CPU
    count), pinning (CPU-pin discipline, ``none`` on shared CI iron),
    topology (arch + processor string).
    """
    try:
        nproc = os.cpu_count() or 0
    except Exception:
        nproc = 0
    return {
        "cpu_model": _cpu_model() or "unknown",
        "kernel": platform.release() or "unknown",
        "nproc": int(nproc) if nproc else 0,
        "governor": _governor(),
        "threads": int(threads),
        "pgbench_j": int(threads),
        "pinning": pinning or "none",
        "topology": "%s/%s" % (platform.machine() or "unknown",
                               platform.processor() or "unknown"),
    }
