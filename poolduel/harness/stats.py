"""Median/band math and the binding comparison gate.

Headline deltas require non-overlapping min-max bands AND same-direction
agreement of tps and p99; otherwise the comparison is inconclusive
(methodology.md section 6).
"""

import math


def median(values):
    vals = sorted(values)
    n = len(vals)
    if n == 0:
        raise ValueError("median of empty sequence")
    mid = n // 2
    if n % 2 == 1:
        return float(vals[mid])
    return (vals[mid - 1] + vals[mid]) / 2.0


def mean(values):
    if not values:
        raise ValueError("mean of empty sequence")
    return sum(values) / len(values)


def stdev(values):
    if len(values) < 2:
        return 0.0
    m = mean(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / (len(values) - 1))


def cv(values):
    m = mean(values)
    if m == 0:
        return 0.0
    return stdev(values) / abs(m)


def median_group_key(rec):
    """Grouping key for raw repeat records into median entries.

    Duration is structural: a 30-min tier and a 60-min tier of the
    same (cell, pooler) must never pool into one median (proven
    2026-09-15 on the M10 soak: the aggregate grouped by
    (cell, pooler) and the flat-dir merge silently kept one tier per
    arm). Records without a duration (legacy/hand-built) group under
    None and stay mutually comparable only with each other.
    """
    return (rec.get("cell_id"), rec.get("duration_s"),
            rec.get("pooler"))


def summarize(values):
    vals = [float(v) for v in values if v is not None]
    if not vals:
        return {"median": None, "min": None, "max": None, "cv": None,
                "n": 0}
    return {"median": median(vals), "min": min(vals), "max": max(vals),
            "cv": cv(vals), "n": len(vals)}


def bands_overlap(a, b):
    """True when min-max bands [min,max] of two summaries overlap."""
    if a["min"] is None or b["min"] is None:
        return True
    return not (a["max"] < b["min"] or b["max"] < a["min"])


def compare_pair(tps_a, tps_b, p99_a, p99_b):
    """Compare arm A vs arm B.

    tps_* and p99_* are summarize() dicts over repeats. Returns one of:
    "A faster" | "B faster" | "inconclusive".
    tps is higher-is-better; p99 is lower-is-better; both must agree
    with non-overlapping bands.
    """
    if tps_a["median"] is None or tps_b["median"] is None:
        return "inconclusive"
    if bands_overlap(tps_a, tps_b):
        return "inconclusive"
    tps_says_a = tps_a["median"] > tps_b["median"]
    if p99_a["median"] is None or p99_b["median"] is None:
        return "A faster" if tps_says_a else "B faster"
    if bands_overlap(p99_a, p99_b):
        return "inconclusive"
    p99_says_a = p99_a["median"] < p99_b["median"]
    if tps_says_a != p99_says_a:
        return "inconclusive"
    return "A faster" if tps_says_a else "B faster"


def pilot_separates(per_arm):
    """Pilot discrimination gate: True when at least two arms separate.

    per_arm maps arm name to {"tps": [...repeats...], "p99": [...repeats...]}.
    Separation means a non-overlapping band on tps or p99 between any pair.
    """
    arms = list(per_arm.keys())
    for i in range(len(arms)):
        for j in range(i + 1, len(arms)):
            a, b = per_arm[arms[i]], per_arm[arms[j]]
            tps_a, tps_b = summarize(a["tps"]), summarize(b["tps"])
            if (tps_a["median"] is not None and tps_b["median"] is not None
                    and not bands_overlap(tps_a, tps_b)):
                return True
            p99_a, p99_b = summarize(a["p99"]), summarize(b["p99"])
            if (p99_a["median"] is not None and p99_b["median"] is not None
                    and not bands_overlap(p99_a, p99_b)):
                return True
    return False
