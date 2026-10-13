"""M10 paired statistics rebuild (plan section 5; Refs #302).

Replaces the old headline rule (``stats.compare_pair`` non-overlapping
min-max bands plus tps/p99 directional agreement) with paired-difference
95 percent bootstrap CIs, Holm multiplicity correction, a stated Tukey
outlier rule with trimmed sensitivity, and a claim registry with a kill
rule. The old gate stays in ``stats.py`` untouched for backward
comparison during transition.

All functions are deterministic given their seed, stdlib only, and take
no interactive input. Randomness flows exclusively through
``random.Random(seed)`` so results are byte-identical across runs and
machines for a fixed seed.

Raw rows consumed here are the M9 per-repeat record dicts (see
``poolduel/results/m9/raw/M1-1-direct-r1.json``): each carries
``cell_id``, ``pooler``, ``repeat``, ``seed``, ``status`` plus metric
keys (``tps``, ``p99_ms``, ``p999_ms``, ...). Median entries from
``report.aggregate`` contribute only the ``p_quarantined`` flag.
"""

import math
import random

# Bootstrap configuration (plan section 5: paired 95 percent CIs).
BOOTSTRAP_B = 5000
BOOTSTRAP_SEED = 20260914

# Family-wise error rate for Holm step-down.
ALPHA = 0.05

# Outlier rule constants (Tukey IQR fences on the paired differences).
IQR_K = 1.5
EXTREME_K = 3.0
OUTLIER_RULE = (
    "Tukey IQR fences on the paired differences: a value outside "
    "[Q1 - 1.5*IQR, Q3 + 1.5*IQR] is flagged; a value outside "
    "[Q1 - 3.0*IQR, Q3 + 3.0*IQR] is extreme. Quartiles use linear "
    "interpolation (type-7) on the sorted differences. Flags never "
    "drop points from the headline estimate; they feed "
    "trimmed_sensitivity() only. Raw evidence is always retained."
)

# Metrics where lower is better and quarantine can apply.
P_LATENCY_METRICS = ("latency_avg_ms", "p50_ms", "p90_ms", "p99_ms",
                     "p999_ms")

MEASURED = "measured"

# Minimum paired repeats for a decisive verdict (below this the
# bootstrap location is reported but the verdict stays inconclusive).
MIN_N = 3


def _median(vals):
    s = sorted(vals)
    n = len(s)
    if n == 0:
        raise ValueError("median of empty sequence")
    mid = n // 2
    if n % 2 == 1:
        return float(s[mid])
    return (s[mid - 1] + s[mid]) / 2.0


def _mean(vals):
    if not vals:
        raise ValueError("mean of empty sequence")
    return sum(vals) / len(vals)


def _quantile(sorted_vals, q):
    """Linear-interpolation (type-7) quantile of pre-sorted values."""
    n = len(sorted_vals)
    if n == 0:
        raise ValueError("quantile of empty sequence")
    if n == 1:
        return float(sorted_vals[0])
    pos = q * (n - 1)
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return float(sorted_vals[lo])
    frac = pos - lo
    return sorted_vals[lo] + frac * (sorted_vals[hi] - sorted_vals[lo])


def _sign(x):
    if x is None:
        return 0
    if x > 0:
        return 1
    if x < 0:
        return -1
    return 0


def paired_differences(a_rows, b_rows, metric="tps"):
    """Pair raw repeat rows on ``(cell_id, repeat, seed)``.

    Returns ``(pairs, forensics)`` where ``pairs`` is a list of
    ``(key, a_val, b_val, diff)`` with ``diff = b_val - a_val``
    (positive favors arm B) for the chosen ``metric`` key, and
    ``forensics`` reports every unmatched repeat and every
    exclusion so nothing is ever silently dropped.

    Rows whose ``status`` is not ``"measured"`` or whose metric is
    None/non-numeric are excluded with forensic counts. When the two
    arms use disjoint cell-id sets (M2 variant twins such as
    ``M2-I1`` vs ``M2-I3`` live in different cells), pairing falls
    back to ``(repeat, seed)`` and records
    ``forensics["cross_cell_pairing"] = True`` with the B cell per
    key in ``forensics["b_cells"]``.
    """
    forensics = {
        "metric": metric,
        "n_a": len(a_rows),
        "n_b": len(b_rows),
        "n_paired": 0,
        "unmatched_a": [],
        "unmatched_b": [],
        "excluded_a_status": 0,
        "excluded_b_status": 0,
        "excluded_a_null": 0,
        "excluded_b_null": 0,
        "malformed_a": 0,
        "malformed_b": 0,
        "cross_cell_pairing": False,
        "collisions": 0,
        "b_cells": {},
    }

    def index(rows, side):
        by_key, cells = {}, set()
        for r in rows:
            if (not isinstance(r, dict) or "repeat" not in r
                    or "seed" not in r):
                forensics["malformed_%s" % side] += 1
                continue
            cell = r.get("cell_id")
            try:
                key = (cell, int(r["repeat"]), int(r["seed"]))
            except (TypeError, ValueError):
                forensics["malformed_%s" % side] += 1
                continue
            if r.get("status") != MEASURED:
                forensics["excluded_%s_status" % side] += 1
                continue
            val = r.get(metric)
            if val is None or isinstance(val, bool):
                forensics["excluded_%s_null" % side] += 1
                continue
            try:
                fval = float(val)
            except (TypeError, ValueError):
                forensics["excluded_%s_null" % side] += 1
                continue
            if not math.isfinite(fval):
                forensics["excluded_%s_null" % side] += 1
                continue
            if key not in by_key:
                by_key[key] = (r, fval)
            else:
                forensics["collisions"] += 1
            cells.add(cell)
        return by_key, cells

    a_by, cells_a = index(a_rows, "a")
    b_by, cells_b = index(b_rows, "b")

    cross = bool(cells_a) and bool(cells_b) and not (cells_a & cells_b)
    forensics["cross_cell_pairing"] = bool(cross)
    if cross:
        short_b = {}
        for (cell, rep, seed), (row, val) in sorted(
                b_by.items(), key=lambda kv: (str(kv[0][0]), kv[0][1],
                                              kv[0][2])):
            sk = (rep, seed)
            if sk not in short_b:
                short_b[sk] = ((cell, rep, seed), row, val)
            else:
                forensics["collisions"] += 1
    else:
        short_b = None

    pairs = []
    for key in sorted(a_by, key=lambda k: (str(k[0]), k[1], k[2])):
        (arow, aval) = a_by[key]
        hit = None
        if key in b_by:
            (brow, bval) = b_by.pop(key)
            hit = (key, bval, brow.get("cell_id"))
        elif short_b is not None:
            sk = (key[1], key[2])
            if sk in short_b:
                bkey, brow, bval = short_b.pop(sk)
                b_by.pop(bkey, None)
                hit = (key, bval, bkey[0])
        if hit is None:
            forensics["unmatched_a"].append([key[0], key[1], key[2]])
            continue
        key, bval, bcell = hit
        forensics["b_cells"][repr([key[0], key[1], key[2]])] = bcell
        pairs.append((key, aval, bval, bval - aval))

    for key in sorted(b_by, key=lambda k: (str(k[0]), k[1], k[2])):
        forensics["unmatched_b"].append([key[0], key[1], key[2]])
    forensics["n_paired"] = len(pairs)
    return pairs, forensics


def bootstrap_ci(diffs, b=BOOTSTRAP_B, seed=BOOTSTRAP_SEED):
    """Percentile 95 percent CI over paired differences.

    Resamples ``diffs`` with replacement ``b`` times via
    ``random.Random(seed)`` (deterministic across runs/machines),
    takes the mean of each resample, and reports the 2.5th and
    97.5th percentiles (nearest-rank on the sorted resample means:
    rank ``ceil(0.025*b)`` and ``ceil(0.975*b)``, 1-indexed) as
    ``lo``/``hi``. Returns ``{lo, hi, median_diff, mean_diff, n, b,
    seed}``. Empty ``diffs`` (or ``b < 1``) raises ValueError.
    """
    vals = [float(d) for d in diffs]
    if not vals:
        raise ValueError("bootstrap_ci needs at least one difference")
    if not all(math.isfinite(v) for v in vals):
        raise ValueError("bootstrap_ci needs finite differences")
    b = int(b)
    if b < 1:
        raise ValueError("bootstrap_ci needs b >= 1, got %r" % (b,))
    n = len(vals)
    rng = random.Random(seed)
    means = []
    for _ in range(b):
        total = 0.0
        for _ in range(n):
            total += vals[rng.randrange(n)]
        means.append(total / n)
    means.sort()
    lo_rank = int(math.ceil(0.025 * b)) - 1
    hi_rank = int(math.ceil(0.975 * b)) - 1
    lo_rank = max(0, min(b - 1, lo_rank))
    hi_rank = max(0, min(b - 1, hi_rank))
    return {
        "lo": means[lo_rank],
        "hi": means[hi_rank],
        "median_diff": _median(vals),
        "mean_diff": _mean(vals),
        "n": n,
        "b": b,
        "seed": seed,
    }


def bootstrap_p(diffs, b=BOOTSTRAP_B, seed=BOOTSTRAP_SEED):
    """Two-sided bootstrap p-value for H0: mean difference = 0.

    Exact definition: resample ``diffs`` with replacement ``b``
    times via ``random.Random(seed)`` and take each resample mean;
    let ``f_ge`` be the fraction of resample means >= 0 and ``f_le``
    the fraction <= 0. Then ``p = min(1.0, 2 * min(f_ge, f_le))``.
    A strong positive shift pushes almost every resample mean above
    zero (``f_le`` near 0, ``p`` near 0); a zero-centered
    distribution gives ``f_ge`` and ``f_le`` near 0.5 (``p`` near
    1). Deterministic given ``seed``. Empty ``diffs`` raises
    ValueError.
    """
    vals = [float(d) for d in diffs]
    if not vals:
        raise ValueError("bootstrap_p needs at least one difference")
    if not all(math.isfinite(v) for v in vals):
        raise ValueError("bootstrap_p needs finite differences")
    b = int(b)
    if b < 1:
        raise ValueError("bootstrap_p needs b >= 1, got %r" % (b,))
    n = len(vals)
    rng = random.Random(seed)
    n_ge = 0
    n_le = 0
    for _ in range(b):
        total = 0.0
        for _ in range(n):
            total += vals[rng.randrange(n)]
        m = total / n
        if m >= 0:
            n_ge += 1
        if m <= 0:
            n_le += 1
    return min(1.0, 2.0 * min(n_ge / b, n_le / b))


def holm_adjust(pvals, alpha=ALPHA):
    """Holm step-down adjustment at level ``alpha`` (default ALPHA).

    Input is a list of floats (None allowed); output is a same-order
    list of ``{p, adj_p, reject}``. Adjusted p-values are
    ``min(1, (m - rank + 1) * p)`` with cumulative-max monotonicity
    over the ascending sort (``m`` = count of non-None p-values);
    rejection walks the sorted p-values and stops at the first
    ``p > alpha / (m - rank + 1)``. None p-values stay None and
    never reject. NaN, infinite, or out-of-range p-values are treated
    as None (invalid input never rejects, never headlines).
    """
    clean = []
    for p in pvals:
        try:
            if p is None or isinstance(p, bool):
                clean.append(None)
            elif not math.isfinite(float(p)) or not 0.0 <= float(p) <= 1.0:
                clean.append(None)
            else:
                clean.append(float(p))
        except (TypeError, ValueError):
            clean.append(None)
    out = [{"p": p, "adj_p": None, "reject": False} for p in clean]
    ranked = sorted(((p, i) for i, p in enumerate(clean)
                     if p is not None))
    m = len(ranked)
    if m == 0:
        return out
    rejected = set()
    for rank, (p, i) in enumerate(ranked, start=1):
        if p <= alpha / (m - rank + 1):
            rejected.add(i)
        else:
            break
    adj = [min(1.0, (m - rank + 1) * p)
           for rank, (p, _i) in enumerate(ranked, start=1)]
    for k in range(1, len(adj)):
        if adj[k] < adj[k - 1]:
            adj[k] = adj[k - 1]
    for (p, i), a in zip(ranked, adj):
        out[i] = {"p": p, "adj_p": a, "reject": i in rejected}
    return out


def flag_outliers(values):
    """Tukey IQR fences on the paired differences.

    Returns ``{flags, rule, n_flagged, n_extreme, q1, q3, iqr, lo,
    hi, lo_extreme, hi_extreme}`` where ``flags`` is a per-value
    label list (``"ok"`` | ``"flag"`` | ``"extreme"``), ``rule`` is
    OUTLIER_RULE verbatim, ``n_flagged`` counts flag-or-worse and
    ``n_extreme`` counts extreme. Fences need at least 4 points and
    nonzero IQR; otherwise every point reads ``"ok"``.
    """
    vals = [float(v) for v in values]
    n = len(vals)
    if n >= 4:
        s = sorted(vals)
        q1 = _quantile(s, 0.25)
        q3 = _quantile(s, 0.75)
        iqr = q3 - q1
    else:
        q1 = q3 = None
        iqr = 0.0
    if n < 4 or iqr <= 0:
        return {
            "flags": ["ok"] * n,
            "rule": OUTLIER_RULE,
            "n_flagged": 0,
            "n_extreme": 0,
            "q1": q1,
            "q3": q3,
            "iqr": iqr if n >= 4 else None,
            "lo": None,
            "hi": None,
            "lo_extreme": None,
            "hi_extreme": None,
        }
    lo = q1 - IQR_K * iqr
    hi = q3 + IQR_K * iqr
    lo_e = q1 - EXTREME_K * iqr
    hi_e = q3 + EXTREME_K * iqr
    flags = []
    for v in vals:
        if v < lo_e or v > hi_e:
            flags.append("extreme")
        elif v < lo or v > hi:
            flags.append("flag")
        else:
            flags.append("ok")
    return {
        "flags": flags,
        "rule": OUTLIER_RULE,
        "n_flagged": sum(1 for f in flags if f != "ok"),
        "n_extreme": sum(1 for f in flags if f == "extreme"),
        "q1": q1,
        "q3": q3,
        "iqr": iqr,
        "lo": lo,
        "hi": hi,
        "lo_extreme": lo_e,
        "hi_extreme": hi_e,
    }


def _is_flagged(flag):
    if flag is True:
        return True
    if isinstance(flag, str):
        return flag in ("flag", "extreme", "outlier", "drop",
                        "flagged")
    return False


def trimmed_sensitivity(values, flags, b=BOOTSTRAP_B, seed=BOOTSTRAP_SEED,
                        orig_median=None, orig_excludes_zero=None):
    """Recompute CI-location with flagged points dropped.

    Returns ``{verdict_flips, too_few, n_kept, n_dropped,
    orig_median, orig_excludes_zero, trimmed_median, trimmed_mean,
    trimmed_lo, trimmed_hi, trimmed_excludes_zero}`` where
    ``verdict_flips`` is True on a sign change of the median or a
    change of CI-excludes-zero versus the full set. Small-n guard:
    when fewer than 3 points remain, ``too_few`` is True and no
    verdict is given (``verdict_flips`` is None, trimmed location
    fields are None). ``flags`` accepts a ``flag_outliers()`` dict
    or a plain per-value label list.
    """
    vals = [float(v) for v in values]
    if isinstance(flags, dict):
        flag_list = list(flags.get("flags", []))
    else:
        flag_list = list(flags)
    if len(flag_list) != len(vals):
        raise ValueError("trimmed_sensitivity: %d flags for %d values"
                         % (len(flag_list), len(vals)))
    if orig_median is None and vals:
        orig_median = _median(vals)
    if orig_excludes_zero is None and vals:
        ci0 = bootstrap_ci(vals, b=b, seed=seed)
        orig_excludes_zero = bool(ci0["lo"] > 0 or ci0["hi"] < 0)
    kept = [v for v, f in zip(vals, flag_list) if not _is_flagged(f)]
    dropped = len(vals) - len(kept)
    base = {
        "too_few": False,
        "n_kept": len(kept),
        "n_dropped": dropped,
        "orig_median": orig_median,
        "orig_excludes_zero": orig_excludes_zero,
    }
    if len(kept) < 3:
        base.update({
            "verdict_flips": None,
            "trimmed_median": None,
            "trimmed_mean": None,
            "trimmed_lo": None,
            "trimmed_hi": None,
            "trimmed_excludes_zero": None,
            "too_few": True,
        })
        return base
    tci = bootstrap_ci(kept, b=b, seed=seed)
    texcl = bool(tci["lo"] > 0 or tci["hi"] < 0)
    flip = bool(_sign(tci["median_diff"]) != _sign(orig_median)
                or texcl != bool(orig_excludes_zero))
    base.update({
        "verdict_flips": flip,
        "trimmed_median": tci["median_diff"],
        "trimmed_mean": tci["mean_diff"],
        "trimmed_lo": tci["lo"],
        "trimmed_hi": tci["hi"],
        "trimmed_excludes_zero": texcl,
    })
    return base


def compare_ci(a_rows, b_rows, metric="tps", higher_is_better=True,
               b=BOOTSTRAP_B, seed=BOOTSTRAP_SEED,
               a_quarantined=False, b_quarantined=False):
    """Full paired comparison of arm A vs arm B (diffs = B - A).

    Reporting order in the returned dict is effect, CI, verdict, p
    (p last per plan): ``{effect_abs, effect_rel, ci_lo, ci_hi,
    verdict, reason, outlier, sensitivity, forensics,
    quarantine_label, metric, higher_is_better, n, p}``.

    ``effect_abs`` is the observed median paired difference;
    ``effect_rel`` divides it by the arm-A median (None when the
    baseline is zero/empty). ``verdict`` is ``"A faster"`` |
    ``"B faster"`` | ``"inconclusive"``; ``reason`` is None for a
    decisive verdict and one of ``ci_includes_zero`` |
    ``quarantined`` | ``too_few`` | ``sensitivity_flip`` |
    ``mixed_status`` otherwise. ``higher_is_better`` picks which CI
    side favors which arm (tps True; pass False, or None to infer
    from p-latency metric names, for p99-style metrics).

    Quarantine: when ``metric`` is a p-latency metric and either
    arm's median entry carries ``p_quarantined`` (pass via
    ``a_quarantined``/``b_quarantined``), the verdict is forced to
    ``inconclusive``/``quarantined`` with
    ``quarantine_label="tps-only"`` and can never head-line on p99.
    """
    if higher_is_better is None:
        higher_is_better = metric not in P_LATENCY_METRICS
    pairs, forensics = paired_differences(a_rows, b_rows,
                                          metric=metric)
    diffs = [d for (_k, _a, _b, d) in pairs]
    a_vals = [a for (_k, a, _b, _d) in pairs]
    n = len(diffs)
    quarantined_dep = bool(metric in P_LATENCY_METRICS
                           and (a_quarantined or b_quarantined))
    quarantine_label = "tps-only" if quarantined_dep else None
    outlier = flag_outliers(diffs)

    if n == 0:
        status_excl = (forensics["excluded_a_status"]
                       + forensics["excluded_b_status"])
        reason = "mixed_status" if status_excl > 0 else "too_few"
        return {
            "effect_abs": None,
            "effect_rel": None,
            "ci_lo": None,
            "ci_hi": None,
            "verdict": "inconclusive",
            "reason": reason,
            "outlier": outlier,
            "sensitivity": trimmed_sensitivity(
                [], [], b=b, seed=seed, orig_median=None,
                orig_excludes_zero=False),
            "forensics": forensics,
            "quarantine_label": quarantine_label,
            "metric": metric,
            "higher_is_better": higher_is_better,
            "n": 0,
            "p": None,
        }

    ci = bootstrap_ci(diffs, b=b, seed=seed)
    p = bootstrap_p(diffs, b=b, seed=seed)
    try:
        med_a = _median(a_vals)
    except ValueError:
        med_a = None
    effect_abs = ci["median_diff"]
    effect_rel = (effect_abs / med_a if med_a else None)
    excludes_zero = bool(ci["lo"] > 0 or ci["hi"] < 0)
    positive = ci["lo"] > 0

    if n < MIN_N:
        verdict, reason = "inconclusive", "too_few"
    elif not excludes_zero:
        verdict, reason = "inconclusive", "ci_includes_zero"
    elif positive:
        verdict = "B faster" if higher_is_better else "A faster"
        reason = None
    else:
        verdict = "A faster" if higher_is_better else "B faster"
        reason = None

    sensitivity = trimmed_sensitivity(
        diffs, outlier, b=b, seed=seed,
        orig_median=ci["median_diff"],
        orig_excludes_zero=excludes_zero)
    if (verdict in ("A faster", "B faster")
            and not sensitivity["too_few"]
            and sensitivity["verdict_flips"]):
        verdict, reason = "inconclusive", "sensitivity_flip"
    if quarantined_dep:
        verdict, reason = "inconclusive", "quarantined"

    return {
        "effect_abs": effect_abs,
        "effect_rel": effect_rel,
        "ci_lo": ci["lo"],
        "ci_hi": ci["hi"],
        "verdict": verdict,
        "reason": reason,
        "outlier": outlier,
        "sensitivity": sensitivity,
        "forensics": forensics,
        "quarantine_label": quarantine_label,
        "metric": metric,
        "higher_is_better": higher_is_better,
        "n": n,
        "p": p,
    }


def family_verdicts(comparisons, alpha=ALPHA):
    """Holm-gated headlines across a family of ``compare_ci`` outputs.

    Applies ``holm_adjust`` to the family p-values. A row headlines
    only when BOTH the unadjusted CI excludes zero (decisive
    verdict) AND the Holm-adjusted p < ``alpha``; quarantined rows
    never headline. Returns copies annotated with ``adj_p`` and
    ``headline`` (bool).
    """
    adj = holm_adjust([c.get("p") for c in comparisons],
                      alpha=alpha)
    out = []
    for comp, a in zip(comparisons, adj):
        row = dict(comp)
        row["adj_p"] = a["adj_p"]
        ci_excl = (comp.get("ci_lo") is not None
                   and comp.get("ci_hi") is not None
                   and (comp["ci_lo"] > 0 or comp["ci_hi"] < 0))
        decisive = comp.get("verdict") in ("A faster", "B faster")
        row["headline"] = bool(decisive and ci_excl and a["reject"]
                               and not comp.get("quarantine_label"))
        out.append(row)
    return out


# Claim registry DATA: claims.md provisional candidates 1-5 mapped to
# concrete M9-matrix cells and arms. Anything not registered here can
# never become a headline (claims.md section 3 / plan section 4).
CLAIM_CELLS = [
    {
        "claim": 1,
        "title": "Multi-process PgBouncer (so_reuseport, 2 instances) "
                 "removes the single-core ceiling on read-heavy load",
        "cell_a": "M1-1",
        "arm_a": "pgbouncer",
        "cell_b": "M2-I5",
        "arm_b": "pgbouncer",
        "metric": "tps",
        "higher_is_better": True,
        "cells": ["M1-1", "M2-I5", "M2-I6", "M9-C1"],
        "source": "claims.md Table row 1 (line 41); m9.py R block "
                  "m9_resweep_cell('M1-1') + W block M2_ROWS M2-I5 "
                  "(pgbouncer transaction instances 2, G-SEL100)",
    },
    {
        "claim": 2,
        "title": "Under per-query connect/disconnect churn, direct PG "
                 "collapses on fork cost while Odyssey holds throughput",
        "cell_a": "M9-E1",
        "arm_a": "direct",
        "cell_b": "M9-E1",
        "arm_b": "odyssey",
        "metric": "tps",
        "higher_is_better": True,
        "cells": ["M1-6", "M9-E1", "M2-W6", "M2-W7", "M2-W8",
                  "M2-W9", "M2-W10"],
        "source": "claims.md Table row 2 (line 42); m9.py M9_E1_ID / "
                  "m9_e1_cell() (G-CHURN100 equalized-auth control)",
    },
    {
        "claim": 3,
        "title": "For short queries on this iron, pgagroal epoll beats "
                 "io_uring on throughput and tail latency",
        "cell_a": "M2-I1",
        "arm_a": "pgagroal",
        "cell_b": "M2-I3",
        "arm_b": "pgagroal",
        "metric": "tps",
        "higher_is_better": True,
        "cells": ["M2-I1", "M2-I2", "M2-I3", "M2-I4"],
        "source": "claims.md Table row 3 (line 43); m9.py W block "
                  "M2_ROWS M2-I1..M2-I4 (ev_backend io_uring/epoll "
                  "twins, G-SEL100/G-TPCB50)",
    },
    {
        "claim": 4,
        "title": "At 200 clients on a 10-connection pool, pooled arms "
                 "hold throughput while direct PG degrades",
        "cell_a": "M1-4",
        "arm_a": "direct",
        "cell_b": "M1-4",
        "arm_b": "pgcat",
        "metric": "tps",
        "higher_is_better": True,
        "cells": ["M1-4", "M9-C4"],
        "source": "claims.md Table row 4 (line 44); m9.py R block "
                  "m9_resweep_cell('M1-4') (saturation row)",
    },
    {
        "claim": 5,
        "title": "Transaction pooling breaks server-side prepares; "
                 "process-isolated arms survive",
        "cell_a": "M1-3",
        "arm_a": "direct",
        "cell_b": "M1-3",
        "arm_b": "pgpool",
        "metric": "tps",
        "higher_is_better": True,
        "cells": ["M1-3", "M2-P1", "M2-P2", "M2-P3", "M2-P4",
                  "M2-P5", "M2-P6"],
        "source": "claims.md Table row 5 (line 45); m9.py R block "
                  "m9_resweep_cell('M1-3') + W block M2_ROWS "
                  "M2-P1..M2-P6 (prepared twins)",
    },
]


def rederive_claims(medians, raw_by_key, b=BOOTSTRAP_B,
                    seed=BOOTSTRAP_SEED):
    """Re-derive every registered claim through the M10 machinery.

    ``medians`` is the ``report.aggregate`` list (only the
    ``p_quarantined`` flags are read); ``raw_by_key`` maps
    ``(cell_id, pooler)`` to raw per-repeat row lists. Applies the
    kill rule (claims.md line 47-48): any candidate whose paired CI
    includes zero, or which depends on quarantined p-latency, ships
    as ``inconclusive``, never as a win. Returns one dict per
    candidate: ``{claim, effect, ci, verdict, killed_by}`` where
    ``killed_by`` is None for a surviving win and the reason code
    (or ``"missing_data"``) otherwise.
    """
    qmap = {}
    for e in (medians or []):
        if isinstance(e, dict):
            qmap[(e.get("cell_id"), e.get("pooler"))] = bool(
                e.get("p_quarantined"))
    out = []
    for spec in CLAIM_CELLS:
        a_rows = raw_by_key.get((spec["cell_a"], spec["arm_a"]), [])
        b_rows = raw_by_key.get((spec["cell_b"], spec["arm_b"]), [])
        if not a_rows or not b_rows:
            out.append({
                "claim": spec["claim"],
                "effect": None,
                "ci": None,
                "verdict": "inconclusive",
                "killed_by": "missing_data",
            })
            continue
        comp = compare_ci(
            a_rows, b_rows, metric=spec["metric"],
            higher_is_better=spec.get("higher_is_better", True),
            b=b, seed=seed,
            a_quarantined=qmap.get((spec["cell_a"],
                                    spec["arm_a"]), False),
            b_quarantined=qmap.get((spec["cell_b"],
                                    spec["arm_b"]), False))
        decisive = comp["verdict"] in ("A faster", "B faster")
        out.append({
            "claim": spec["claim"],
            "effect": comp["effect_abs"],
            "ci": [comp["ci_lo"], comp["ci_hi"]],
            "verdict": comp["verdict"] if decisive else "inconclusive",
            "killed_by": None if decisive else comp["reason"],
        })
    return out
