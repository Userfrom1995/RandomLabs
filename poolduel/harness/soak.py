"""M10 soak matrix (plan section 7, spec-v1.md s3/s6, issue #302).

Long-horizon stability arms beside the M9 powered resweep: 30-min and
60-min measured runs that surface what short cells cannot - harness-side
cost drift (RSS/FD growth across the run as a run-validity signal, sampled
on the harness process via collect_self_resources; per-pooler-process leak
sampling is future work, not claimed here), tail-latency drift, and
stability (timeouts/errors late in the window). All as DATA plus pure
functions; no procedure branches live here:

- 3 cells reusing proven M1 shapes (no new workload inventions):
  M10-S1 standard (M1-1 shape: select-only, 100 clients / 10 pool),
  M10-S2 saturation (M1-4 shape: 200 clients / 10 pool),
  M10-S3 churn (M1-6 shape: connect-per-transaction churn).
- 2 duration tiers ``SOAK_DURATIONS = (1800, 3600)`` (30-min + 60-min),
  60 s warmup (longer runs need settled state before the measured
  window; 60 s is the top candidate of the M8 warmup curve in
  harness/calibrate.py ``WARMUP_CURVE_SPEC``, conservative until the
  M9 K-block verdict proves a shorter value), 3 repeats per
  (cell, arm, duration) with paired seeds reusing the ``m9_seed_for``
  bases (identical seed per repeat across arms, so pairing cancels
  exogenous noise exactly as in M9).
- 6 arms: the M1 incumbents (direct + pgagroal/pgbouncer/pgpool/
  odyssey/pgcat). Supavisor is excluded, with the reason recorded in
  ``SUPAVISOR_SOAK_DEFERRAL`` (soak needs a stable baseline first;
  Supavisor joins soak after its M9 smoke gate passes).

Chunking: one chunk per (cell, arm, duration) -> 3*6*2 = 36 chunks
named ``m10s01..m10s36``. Each chunk runs 3 arm-runs (repeats 1..3 of
its single arm at its duration + warmup). Direct is an arm like the
rest: every (cell, duration) pair has its own direct chunk, matched
by chunk naming (each (cell, duration) spans exactly the 6 consecutive
chunks of ``SOAK_ARMS`` order) plus the per-(cell, duration) arm
cover pinned in ``check_soak_coverage``.

Budget cap assumption: soak chunks are long-running by design and are
sized by the CI timeout, not by the 60-min M1/M2/M9 measured cap. The
per-run price is ``(warmup + duration) / 60 + 2 min`` overhead, so a
30-min chunk costs ~99 min and a 60-min chunk ~189 min (a 120-min cap
is infeasible: three 61-min measured runs alone floor at 183 min
before any overhead). ``SOAK_CHUNK_BUDGET_CAP_MINUTES = 200`` covers
the worst chunk with margin; every chunk must sit under it.
"""

from .cells import check_ratio, get_cell
from .m9 import M9_SEEDS, M9_SEED_STRIDE, m9_seed_for

# Soak arms: the 6 proven M1 incumbents. Supavisor is absent by design
# (see SUPAVISOR_SOAK_DEFERRAL); native is absent, not N/A, as in M9.
SOAK_ARMS = ["direct", "pgagroal", "pgbouncer", "pgpool", "odyssey",
             "pgcat"]

# Why Supavisor waits: soak figures (leak drift, tail drift) are only
# meaningful against a stable baseline, and Supavisor has not passed
# its M9 smoke gate yet. It joins the soak after M9 entry.
SUPAVISOR_SOAK_DEFERRAL = (
    "Supavisor is excluded from the M10 soak: soak needs a stable "
    "baseline first (30-60 min leak/tail figures on the 6 proven "
    "incumbents); Supavisor joins soak after its M9 smoke gate passes."
)

# Duration tiers in seconds: 30-min + 60-min measured windows.
SOAK_DURATIONS = (1800, 3600)

# Settling warmup before each measured window (see module docstring).
SOAK_WARMUP_S = 60

# Repeats per (cell, arm, duration), paired across arms.
SOAK_REPEATS = 3

# Dataset scale for every soak chunk (scale-10 init discipline).
SOAK_SCALE = 10

# Per-run overhead minutes beside warmup + measure (adapter restart,
# log collection, JSON emission).
SOAK_RUN_OVERHEAD_MIN = 2.0

# Chunk budget cap (see module docstring for why 200, not 60/120).
SOAK_CHUNK_BUDGET_CAP_MINUTES = 200.0

# Soak geometries: (soak id, M1 shape source, rationale). Shapes are
# copied field-for-field from the M1 twin; only identity, timing, and
# scale/warmup/repeats are soak-owned. No new workload inventions.
SOAK_GEOMETRIES = (
    ("M10-S1", "M1-1",
     "standard select-only 100c/10p (M1-1 shape): baseline leak/tail "
     "figure every pooler must hold flat"),
    ("M10-S2", "M1-4",
     "saturation 200c/10p (M1-4 shape): pool-exhaustion pressure over "
     "30-60 min, where queue/RSS drift shows first"),
    ("M10-S3", "M1-6",
     "connect-per-transaction churn (M1-6 shape): fork/auth cost "
     "compounds over long windows; FD leak shows first"),
)

SOAK_CELL_IDS = tuple(cid for (cid, _, _) in SOAK_GEOMETRIES)


def soak_cell(cell_id, duration_s):
    """Runner-ready soak cell: proven M1 shape at one duration tier.

    Raises KeyError on unknown soak ids, ValueError on durations
    outside ``SOAK_DURATIONS`` (a soak run at an unregistered length
    is not comparable to the published tiers).
    """
    shape = None
    for (cid, m1_id, _rationale) in SOAK_GEOMETRIES:
        if cid == cell_id:
            shape = m1_id
            break
    if shape is None:
        raise KeyError("unknown soak cell %r (want one of %s)"
                       % (cell_id, list(SOAK_CELL_IDS)))
    if duration_s not in SOAK_DURATIONS:
        raise ValueError("soak duration %r not a tier (want one of %s)"
                         % (duration_s, list(SOAK_DURATIONS)))
    src = get_cell(shape)
    cell = {
        "cell_id": cell_id,
        "workload": src["workload"],
        "clients": src["clients"],
        "pool_size": src["pool_size"],
        "protocol": src["protocol"],
        "churn": src["churn"],
        "duration_s": int(duration_s),
        "warmup_s": SOAK_WARMUP_S,
        "repeats": SOAK_REPEATS,
        "flagship": False,
        "scale": SOAK_SCALE,
    }
    check_ratio(cell)
    return cell


def soak_cell_ids():
    return list(SOAK_CELL_IDS)


def is_soak_cell(cell_id):
    """True when a cell id belongs to the soak matrix."""
    return cell_id in SOAK_CELL_IDS


def soak_seed_for(repeat, base_seed=42):
    """Paired seed for soak repeat r (1-indexed): reuse of m9_seed_for.

    Identical across arms by construction (no arm parameter exists),
    so every arm runs repeat r on the identical seed. Raises
    ValueError on repeat < 1 (inherited from m9_seed_for).
    """
    return m9_seed_for(repeat, base_seed=base_seed)


# Chunk table: chunk -> single ("soak", cell_id, duration_s, arm)
# entry. One chunk per (cell, arm, duration); each chunk runs the 3
# repeats of its arm. Direct is an arm like the rest: every
# (cell, duration) owns its direct chunk.
def _build_chunks():
    chunks = {}
    n = 1
    for cid in SOAK_CELL_IDS:
        for duration in SOAK_DURATIONS:
            for arm in SOAK_ARMS:
                chunks["m10s%02d" % n] = [("soak", cid, duration, arm)]
                n += 1
    return chunks


SOAK_CHUNKS = _build_chunks()

SOAK_CHUNK_DESCRIPTIONS = {}
for _name, _entries in SOAK_CHUNKS.items():
    _ns, _cid, _dur, _arm = _entries[0]
    _nick = {"M10-S1": "standard", "M10-S2": "saturation",
             "M10-S3": "churn"}[_cid]
    SOAK_CHUNK_DESCRIPTIONS[_name] = (
        "M10 soak %s %d-min tier, %s arm" % (_nick, _dur // 60, _arm))
del _name, _entries, _ns, _cid, _dur, _arm, _nick


def soak_chunk_scale(chunk):
    """Dataset scale for a soak chunk (always 10; scale-aware init)."""
    if chunk not in SOAK_CHUNKS:
        raise KeyError("unknown soak chunk %r" % (chunk,))
    return SOAK_SCALE


def soak_entry_cells(entry):
    """Expand one soak chunk entry into (cell, arms, reps)."""
    ns, cid, duration, arm = entry
    if ns != "soak":
        raise KeyError("unknown soak namespace %r" % (ns,))
    if arm not in SOAK_ARMS:
        raise KeyError("unknown soak arm %r (want one of %s)"
                       % (arm, list(SOAK_ARMS)))
    cell = soak_cell(cid, duration)
    return cell, [arm], list(range(1, cell["repeats"] + 1))


def soak_chunk_plan(chunk):
    """Repeat-major (cell, arm, repeat) plan for one soak chunk.

    Single arm per chunk, so the plan is repeats 1..3 of that arm;
    the per-(cell, duration) direct control is the sibling direct
    chunk, matched by chunk naming (see module docstring).
    """
    if chunk not in SOAK_CHUNKS:
        raise KeyError("unknown soak chunk %r (want one of %s)"
                       % (chunk, sorted(SOAK_CHUNKS)))
    plan = []
    for entry in SOAK_CHUNKS[chunk]:
        cell, arms, reps = soak_entry_cells(entry)
        for rep in reps:
            for arm in arms:
                plan.append((cell, arm, rep))
    return plan


def soak_full_plan():
    """Every soak chunk plan concatenated (for dry-run pricing)."""
    plan = []
    for chunk in sorted(SOAK_CHUNKS):
        plan.extend(soak_chunk_plan(chunk))
    return plan


def soak_chunk_arms(chunk):
    """Distinct arms in a chunk (for adapter loading)."""
    arms = []
    for (cell, arm, _rep) in soak_chunk_plan(chunk):
        if arm not in arms:
            arms.append(arm)
    return arms


def _per_run_minutes(cell):
    return ((cell["warmup_s"] + cell["duration_s"]) / 60.0
            + SOAK_RUN_OVERHEAD_MIN)


def soak_chunk_budget_minutes(chunk):
    """Estimated wall clock for a soak chunk (warmup + measure + run
    overhead per arm-run; per-chunk init/build wall clock is workflow
    time outside this budget, priced beside the matrix as in M9)."""
    if chunk not in SOAK_CHUNKS:
        raise KeyError("unknown soak chunk %r" % (chunk,))
    total = 0.0
    for entry in SOAK_CHUNKS[chunk]:
        cell, arms, reps = soak_entry_cells(entry)
        total += _per_run_minutes(cell) * len(reps) * len(arms)
    return total


def check_soak_chunk_budgets(
        cap_minutes=SOAK_CHUNK_BUDGET_CAP_MINUTES):
    over = {}
    for name in SOAK_CHUNKS:
        mins = soak_chunk_budget_minutes(name)
        if mins >= cap_minutes:
            over[name] = mins
    return over


def soak_total_budget():
    """Priced schedule: total arm-runs and wall hours per soak cell."""
    blocks = {}
    total_runs, total_min = 0, 0.0
    for chunk in sorted(SOAK_CHUNKS):
        cid = SOAK_CHUNKS[chunk][0][1]
        runs = len(soak_chunk_plan(chunk))
        mins = soak_chunk_budget_minutes(chunk)
        agg = blocks.setdefault(cid, {"chunks": 0, "runs": 0,
                                      "minutes": 0.0})
        agg["chunks"] += 1
        agg["runs"] += runs
        agg["minutes"] += mins
        total_runs += runs
        total_min += mins
    return {"blocks": blocks, "chunks": len(SOAK_CHUNKS),
            "arm_runs": total_runs, "measured_hours": total_min / 60.0}


def soak_budget_table():
    """Published per-arm measured run counts (budget parity surfacing).

    Every arm runs every (cell, duration) x 3 repeats: 3 cells x 2
    tiers x 3 repeats = 18 arm-runs per arm at matrix level.
    """
    counts = {arm: 0 for arm in SOAK_ARMS}
    for chunk in SOAK_CHUNKS:
        for (cell, arm, _rep) in soak_chunk_plan(chunk):
            counts[arm] = counts.get(arm, 0) + 1
    return counts


def soak_drift(pre_resources, post_resources):
    """Leak/stability drift between pre/post resource samples.

    Pure function over two ``resources`` dicts (as sampled by
    ``collect_self_resources`` immediately before/after the measured
    run): RSS delta in KB, FD-count delta, CPU-seconds consumed across
    the window, and wall duration from the ``wall_s`` monotonic
    stamps. Never raises, never fabricates: any missing, non-numeric,
    or non-finite input degrades that field to None. Reasons:

    - field None on either side -> delta None (no guess from one
      sample);
    - non-numeric / NaN / inf values -> None (garbage in, null out);
    - negative wall duration (clock oddity) -> duration None.
    """
    import math

    def _num(value):
        try:
            if isinstance(value, bool):
                return None
            if not isinstance(value, (int, float)):
                return None
            if not math.isfinite(float(value)):
                return None
            return float(value)
        except Exception:
            return None

    try:
        pre = dict(pre_resources or {})
    except (TypeError, ValueError, AttributeError):
        pre = {}
    try:
        post = dict(post_resources or {})
    except (TypeError, ValueError, AttributeError):
        post = {}
    try:
        pre_rss, post_rss = _num(pre.get("peak_rss_kb")), _num(
            post.get("peak_rss_kb"))
        rss_delta = (post_rss - pre_rss if pre_rss is not None
                     and post_rss is not None else None)
        pre_fd, post_fd = _num(pre.get("fd_count")), _num(
            post.get("fd_count"))
        fd_delta = (post_fd - pre_fd if pre_fd is not None
                    and post_fd is not None else None)
        pre_cpu, post_cpu = _num(pre.get("cpu_time_s")), _num(
            post.get("cpu_time_s"))
        cpu_time = (post_cpu - pre_cpu if pre_cpu is not None
                    and post_cpu is not None else None)
        pre_wall, post_wall = _num(pre.get("wall_s")), _num(
            post.get("wall_s"))
        if pre_wall is None or post_wall is None:
            duration = None
        else:
            duration = post_wall - pre_wall
            if duration < 0:
                duration = None
        return {"rss_delta_kb": rss_delta, "fd_delta": fd_delta,
                "cpu_time_s": cpu_time, "duration_s": duration}
    except Exception:
        return {"rss_delta_kb": None, "fd_delta": None,
                "cpu_time_s": None, "duration_s": None}


def validate_soak_ratios():
    for cid in SOAK_CELL_IDS:
        for duration in SOAK_DURATIONS:
            soak_cell(cid, duration)
