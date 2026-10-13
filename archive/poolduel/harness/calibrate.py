"""M8 calibration (plan section 7, spec-v1.md s3/s6).

Three calibration instruments, all as DATA plus pure analysis:

1. Warmup sensitivity curve: the 30 s provisional warmup is proven, not
   asserted. The curve runs one geometry (M1-1 select-only, direct arm)
   at each candidate warmup with fixed 60 s measure and 3 paired
   repeats, then ``evaluate_warmup_curve`` picks the smallest warmup
   whose median tps sits within tolerance of the best observed median.
   If no candidate reaches tolerance, warmup rises (the decision rule
   returns sufficient=False with the required next candidate).
2. Scale-100 pilot: scale 100 becomes first-class, not nightly-only.
   Pilot cells twin two M1 geometries at ``-s 100`` (10M accounts,
   roughly 1.5 GB) with standard timing; the full scale-100 matrix
   joins the M9 resweep only after the pilot proves the iron holds it.
3. Workload breadth + fixed-offer registry readout for the M9 matrix
   (definitions live in ``workloads.py``; this module publishes the
   calibration budget that covers them).

This module never runs pgbench itself; the M9 sweep executes the
specs it publishes. No procedure branches live here.
"""

from .cells import check_ratio

import math

# Warmup candidates in seconds. 30 s is the provisional value used by
# every M1/M2 cell; the curve must prove it or raise it.
WARMUP_CANDIDATES = (0, 10, 30, 60)

# Curve geometry: M1-1 shape (select-only, 100 clients, pool 10) on the
# direct arm, fixed 60 s measure, 3 paired repeats per warmup point.
WARMUP_CURVE_SPEC = {
    "control_id": "M8-C1",
    "geometry": "select-only, clients=100, pool_size=10, "
                "protocol=simple, churn=False",
    "measure_s": 60,
    "repeats": 3,
    "arm": "direct",
    "rule": ("one M8-C1 run per warmup candidate with paired seeds "
             "across candidates; medians compared by "
             "evaluate_warmup_curve."),
    "status": "defined in M8; measured in the M9 resweep",
}

# Acceptance tolerance: a warmup is sufficient when its median tps is
# within this fraction of the best observed median (steady state pays
# no more than 5 percent for a shorter warmup).
WARMUP_TOLERANCE = 0.05


def evaluate_warmup_curve(points, tolerance=WARMUP_TOLERANCE):
    """Pick the smallest sufficient warmup from curve observations.

    ``points`` is a list of ``(warmup_s, median_tps)`` with positive
    tps medians. Returns a dict with ``recommended_warmup_s``,
    ``sufficient`` (False means warmup must rise above the largest
    tested candidate), ``best_tps``, and ``rationale``. Pure function;
    raises ValueError on empty points or non-positive medians.
    """
    if not points:
        raise ValueError("warmup curve needs at least one point")
    for warmup_s, tps in points:
        if (tps is None or not isinstance(tps, (int, float))
                or not math.isfinite(tps) or tps <= 0):
            raise ValueError(
                "warmup curve point (warmup_s=%r) needs a finite "
                "positive median tps, got %r" % (warmup_s, tps))
    best = max(tps for (_, tps) in points)
    floor = best * (1.0 - tolerance)
    passing = sorted(w for (w, tps) in points if tps >= floor)
    if not passing:  # defensive: best always passes, kept for safety
        pick = max(w for (w, _) in points)
        return {
            "recommended_warmup_s": None,
            "sufficient": False,
            "best_tps": best,
            "tolerance": tolerance,
            "rationale": ("no tested warmup reaches %.1f%% of best "
                          "(%.1f tps); warmup must rise and the curve "
                          "re-runs" % ((1.0 - tolerance) * 100.0, best)),
        }
    w_max = max(w for (w, _) in points)
    winners = [w for (w, tps) in points if tps == best]
    # Plateau check: when the best sits uniquely on the largest tested
    # warmup while every shorter warmup falls outside tolerance, the
    # curve is still rising into the boundary, so a longer warmup must
    # be tested before any value is declared sufficient.
    if winners == [w_max] and len(points) > 1 and len(passing) == 1:
        return {
            "recommended_warmup_s": None,
            "sufficient": False,
            "best_tps": best,
            "tolerance": tolerance,
            "rationale": ("best tps (%.1f) sits uniquely on the largest "
                          "tested warmup (%ss) with no shorter warmup "
                          "within %.1f%%; warmup must rise above %ss "
                          "and the curve re-runs"
                          % (best, w_max, tolerance * 100.0, w_max)),
        }
    pick = min(passing)
    return {
        "recommended_warmup_s": pick,
        "sufficient": True,
        "best_tps": best,
        "tolerance": tolerance,
        "rationale": ("warmup %ss median within %.1f%% of best "
                      "(%.1f tps); smallest such warmup wins"
                      % (pick, tolerance * 100.0, best)),
    }


# Scale-100 pilot: twins of two M1 geometries at scale 100 with M2
# standard timing (30 s warmup provisional pending the curve, 60 s
# measure, 3 repeats). clients>>pool holds (10x and 5x). Dataset cost:
# scale 100 is ~10M accounts (~1.5 GB with indexes); init is one
# pgbench -i -s 100 per chunk, same per-chunk discipline as scale 10.
SCALE100_PILOT_CELLS = [
    {
        "cell_id": "M8-P1",
        "workload": "select-only",
        "clients": 100,
        "pool_size": 10,
        "protocol": "simple",
        "churn": False,
        "duration_s": 60,
        "warmup_s": 30,
        "repeats": 3,
        "flagship": False,
        "scale": 100,
    },
    {
        "cell_id": "M8-P2",
        "workload": "tpcb-like",
        "clients": 50,
        "pool_size": 10,
        "protocol": "simple",
        "churn": False,
        "duration_s": 60,
        "warmup_s": 30,
        "repeats": 3,
        "flagship": False,
        "scale": 100,
    },
    {
        "cell_id": "M8-P3",
        "workload": "select-only",
        "clients": 100,
        "pool_size": 10,
        "protocol": "simple",
        "churn": True,
        "duration_s": 60,
        "warmup_s": 30,
        "repeats": 3,
        "flagship": False,
        "scale": 100,
    },
]

SCALE100_PILOT_SPEC = {
    "control_id": "M8-P",
    "rule": ("one init (pgbench -i -s 100) per chunk, CHECKPOINT + "
             "VACUUM (ANALYZE) before each measured block, same "
             "per-chunk discipline as scale 10; full scale-100 matrix "
             "joins M9 only after the pilot proves the iron holds it."),
    "status": "defined in M8; measured in the M9 resweep",
}


def scale100_pilot_cells():
    """Pilot cell dicts (ratio-checked; raises on violation)."""
    cells = [dict(c) for c in SCALE100_PILOT_CELLS]
    for cell in cells:
        check_ratio(cell)
    return cells


def scale100_pilot_budget_minutes(setup_min=0.5):
    """Wall-clock estimate for the scale-100 pilot per arm.

    Each pilot cell runs warmup + measure + setup per repeat; the
    estimate covers one arm (the M9 sweep prices every arm the same
    way, same procedure code, same caps).
    """
    total = 0.0
    for cell in SCALE100_PILOT_CELLS:
        per_repeat = ((cell["warmup_s"] + cell["duration_s"]) / 60.0
                      + setup_min)
        total += per_repeat * cell["repeats"]
    return total


# M8 calibration budget: warmup curve (4 candidates x 3 repeats on one
# geometry) plus scale-100 pilot (3 cells x 3 repeats), direct arm.
# Published so M9 can price the calibration block beside the matrix.
def calibration_budget_table():
    curve_runs = len(WARMUP_CANDIDATES) * WARMUP_CURVE_SPEC["repeats"]
    pilot_runs = sum(c["repeats"] for c in SCALE100_PILOT_CELLS)
    return {
        "warmup_curve_points": len(WARMUP_CANDIDATES),
        "warmup_curve_runs": curve_runs,
        "scale100_pilot_cells": len(SCALE100_PILOT_CELLS),
        "scale100_pilot_runs": pilot_runs,
    }
