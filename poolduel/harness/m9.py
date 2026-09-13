"""M9 main matrix resweep (plan sections 5/7/8/9, spec-v1.md s6).

The powered resweep that replaces M1/M2 n=3-5 min-max headlines with
paired-repeat evidence for the M10 statistics rebuild (paired 95 percent
bootstrap CIs, Holm correction). Six blocks, all as DATA plus pure
functions; no procedure branches live here:

- R block: scale-10 resweep of the 7 M1 geometries (flagship n=10,
  standard n=7) on all 8 arms (direct + 5 incumbents + Supavisor).
  Same cell IDs as M1 (M1-1..M1-7); raw lands in poolduel/results/m9/
  so nothing mixes with the M1/M2 medians, and every record carries
  its seed + repeat for provenance.
- W block: scale-10 resweep of all 52 M2 rows (n=7, row arm + direct
  control, same-runner discipline).
- U block: Supavisor twins of every M2 geometry (equal budget 7+52
  per harness/supavisor.py M9_SUPAVISOR_BUDGET), mapped onto
  transaction/session; statement twins stay N/A with reason
  (no statement mode upstream). Native is absent, not N/A:
  no matrix row probes passthrough, so there is nothing to twin.
- C block: scale-100 twins of the 7 M1 geometries (M9-C1..C7, n=10
  flagship / n=7 standard). M8-P1..P3 are subsumed by M9-C1..C3
  (same geometries, powered repeats): the pilot evidence and the
  scale-100 matrix are one block, not two runs of the same cells.
- K block: M8-C1 warmup curve (candidates 0/10/30/60 s, 60 s fixed
  measure, 3 paired repeats, direct arm) on M1-1 geometry.
- E block: M9-E1 equalized-auth churn control (G-CHURN100 geometry,
  SCRAM on every frontend via the ``auth_mode=equalized`` variant,
  all 8 arms, n=7) beside the labeled asymmetric arms.

Paired seeds: the seed schedule is a pure function of the repeat
index only, never of the arm, so every arm runs repeat r on the
identical seed (pairing cancels exogenous noise in M10). Three base
seeds cycle with a stride coprime to their spread, giving distinct
seeds for every repeat (proven in tests, not asserted).

Chunking: every chunk fits under the 60 min cap (budget estimator
below); per-chunk direct control holds everywhere a comparison is
drawn. Scale-100 init cost (pgbench -i -s 100, ~1.5 GB) is per-chunk
workflow time, priced beside the matrix in m9_total_budget().
"""

from .cells import ARMS, M1_CELLS, check_ratio, get_cell
from .m2 import GEOMETRIES, M2_ROWS, M2_WARMUP_S, M2_DURATION_S

# Powered repeats (plan section 5): flagship n>=10, standard n>=7.
M9_REPEATS_FLAGSHIP = 10
M9_REPEATS_STANDARD = 7

# Paired-seed schedule: 3 base seeds (>=3 seeds per plan section 5),
# stride chosen so base_a - base_b is never a multiple of the stride
# (|diffs| are 1295/7664/8959; stride 7919; none equals +-7919).
M9_SEEDS = (42, 1337, 9001)
M9_SEED_STRIDE = 7919

# All 8 M9 arms: the 6 M1 incumbents plus Supavisor (M7 onboarded,
# smoke-gated before matrix entry).
M9_ARMS = ["direct", "pgagroal", "pgbouncer", "pgpool", "odyssey",
           "pgcat", "supavisor"]

# Scale-100 twin IDs (C block) in M1 order M1-1..M1-7.
M9_C100_IDS = ["M9-C%d" % i for i in range(1, 8)]

# Warmup-curve IDs (K block) per candidate second.
M9_CURVE_IDS = {"0": "M9-K0", "10": "M9-K10", "30": "M9-K30",
                "60": "M9-K60"}

# Equalized-auth churn control ID (matches EQUALIZED_CHURN_SPEC).
M9_E1_ID = "M9-E1"


def m9_repeats(cell):
    """Powered repeats for a cell dict (flagship 10, standard 7)."""
    return (M9_REPEATS_FLAGSHIP if cell.get("flagship")
            else M9_REPEATS_STANDARD)


def m9_seed_for(repeat, base_seed=42):
    """Paired seed for repeat r (1-indexed): function of r only.

    Identical across arms by construction (no arm parameter exists).
    Three base seeds cycle with a stride coprime to their spread, so
    seeds stay distinct for every repeat at any base: base offsets
    are 0/1295/8959 (|diffs| 1295/7664/8959, none a multiple of the
    7919 stride), hence base_a - base_b = m*stride has no solution
    for distinct bases. Raises ValueError on repeat < 1.
    """
    r = int(repeat)
    if r < 1:
        raise ValueError("m9_seed_for needs repeat >= 1, got %r"
                         % (repeat,))
    base = int(base_seed)
    seeds = (base, base + 1295, base + 8959)
    return seeds[(r - 1) % len(seeds)] + ((r - 1) // len(seeds)) * 7919


def m9_resweep_cell(cell_id):
    """Scale-10 M1 twin with powered repeats (same ID, M9 out dir)."""
    cell = get_cell(cell_id)
    cell["repeats"] = m9_repeats(cell)
    cell["scale"] = 10
    check_ratio(cell)
    return cell


def m9_c100_cell(index):
    """Scale-100 twin of M1-<index> (1-based): new ID, powered reps."""
    src = get_cell("M1-%d" % index)
    cell = dict(src)
    cell["cell_id"] = "M9-C%d" % index
    cell["scale"] = 100
    cell["repeats"] = m9_repeats(src)
    check_ratio(cell)
    return cell


def m9_c100_cells():
    return [m9_c100_cell(i) for i in range(1, 8)]


def m9_curve_cell(warmup_s):
    """One warmup-curve point: M1-1 geometry, fixed 60 s measure."""
    key = str(int(warmup_s))
    if key not in M9_CURVE_IDS:
        raise KeyError("unknown curve warmup %r (want one of %s)"
                       % (warmup_s, sorted(M9_CURVE_IDS)))
    return {
        "cell_id": M9_CURVE_IDS[key],
        "workload": "select-only",
        "clients": 100,
        "pool_size": 10,
        "protocol": "simple",
        "churn": False,
        "duration_s": 60,
        "warmup_s": int(warmup_s),
        "repeats": 3,
        "flagship": False,
        "scale": 10,
    }


def m9_e1_cell():
    """M9-E1 equalized-auth churn control (G-CHURN100 geometry)."""
    g = GEOMETRIES["G-CHURN100"]
    return {
        "cell_id": M9_E1_ID,
        "workload": g["workload"],
        "clients": g["clients"],
        "pool_size": g["pool_size"],
        "protocol": g["protocol"],
        "churn": g["churn"],
        "duration_s": 60,
        "warmup_s": 30,
        "repeats": M9_REPEATS_STANDARD,
        "flagship": False,
        "scale": 10,
        "geometry": "G-CHURN100",
        "variant": {"auth_mode": "equalized"},
    }


def supavisor_mode_for(arm, variant):
    """Map an M2 row onto a Supavisor pool_mode, or None for N/A.

    Statement twins have no Supavisor analogue (no statement mode
    upstream); session-class rows (session pool, session pipeline,
    pgpool-II's single session-class mode, pgagroal performance as
    dedicated-backend class) map to session; everything else runs
    transaction. Pure function; raises nothing on unknown shapes
    (unknown falls back to transaction, the M1-equivalent arm).
    """
    variant = dict(variant or {})
    pool = variant.get("pool", variant.get("pool_mode"))
    if pool == "statement":
        return None
    if pool == "session":
        return "session"
    pipeline = variant.get("pipeline")
    if pipeline == "statement":
        return None
    if pipeline in ("session", "performance"):
        return "session"
    if arm == "pgpool":
        return "session"
    return "transaction"


def m9_supa_rows():
    """Supavisor twins of every M2 row: (m9_id, m2_id, mode)."""
    rows = []
    for (cid, geom, arm, variant) in M2_ROWS:
        mode = supavisor_mode_for(arm, variant)
        if mode is None:
            continue
        rows.append(("M9-U-" + cid[3:], cid, geom, mode))
    return rows


def m9_supa_na_rows():
    """Statement twins with no Supavisor analogue (nulls, never zeros)."""
    na = []
    for (cid, geom, arm, variant) in M2_ROWS:
        if supavisor_mode_for(arm, variant) is None:
            na.append(("M9-U-" + cid[3:], geom, "supavisor",
                       "no statement pool_mode upstream "
                       "(pool_modes doc); twin of %s/%s" % (cid, arm)))
    return na


def m9_supa_cell(m9_id):
    """Expand a Supavisor-twin ID into a runner-ready cell dict."""
    for (uid, cid, geom, mode) in m9_supa_rows():
        if uid == m9_id:
            g = GEOMETRIES[geom]
            cell = {
                "cell_id": uid,
                "workload": g["workload"],
                "clients": g["clients"],
                "pool_size": g["pool_size"],
                "protocol": g["protocol"],
                "churn": g["churn"],
                "duration_s": M2_DURATION_S,
                "warmup_s": M2_WARMUP_S,
                "repeats": M9_REPEATS_STANDARD,
                "flagship": False,
                "scale": 10,
                "geometry": geom,
                "arm": "supavisor",
                "variant": {"pool_mode": mode},
                "twins": cid,
            }
            check_ratio(cell)
            return cell
    raise KeyError("unknown M9 supavisor row %r" % (m9_id,))


def m9_supa_ids():
    return [uid for (uid, _, _, _) in m9_supa_rows()]


# Chunk table: chunk -> list of (namespace, id, reps-or-None, arms).
# Namespaces: m1 (M1 twin, all 8 arms), c100 (scale-100 twin, all 8),
# e1 (equalized churn, all 8), k (curve point, direct only),
# m2 (M2 row: row arm + direct), supa (supavisor twin: supa + direct).
# reps None means the registry default for that entry.
def _rep_range(n):
    return list(range(1, n + 1))


def _split_reps(n, parts):
    """Split repeats 1..n into `parts` contiguous shards."""
    out, start = [], 1
    for i in range(parts):
        size = n // parts + (1 if i < n % parts else 0)
        out.append(list(range(start, start + size)))
        start += size
    return out


def _build_chunks():
    chunks = {}

    def add(name, entries):
        chunks[name] = entries

    # R block: M1-1/M1-2 flagship (8 arms x 10 reps x 3 min = 240 min
    # each) in 5 shards of 2 reps (48 min); M1-3..M1-7 standard
    # (8 x 7 x 2 = 112 min) in shards [1-3],[4,5],[6,7] (48/32/32).
    n = 1
    for cid in ("M1-1", "M1-2"):
        for shard in _split_reps(M9_REPEATS_FLAGSHIP, 5):
            add("m9r%02d" % n, [("m1", cid, shard, None)])
            n += 1
    for cid in ("M1-3", "M1-4", "M1-5", "M1-6", "M1-7"):
        for shard in ([1, 2, 3], [4, 5], [6, 7]):
            add("m9r%02d" % n, [("m1", cid, shard, None)])
            n += 1

    # W block: 52 M2 rows, 2 rows per chunk (2 arms x 7 reps x 2 min
    # per row = 28 min; 56 min per chunk).
    m2ids = [cid for (cid, _, _, _) in M2_ROWS]
    n = 1
    for i in range(0, len(m2ids), 2):
        add("m9w%02d" % n,
            [("m2", cid, None, None) for cid in m2ids[i:i + 2]])
        n += 1

    # U block: Supavisor M2 twins, same 2-per-chunk discipline.
    supaids = m9_supa_ids()
    n = 1
    for i in range(0, len(supaids), 2):
        add("m9u%02d" % n,
            [("supa", uid, None, None) for uid in supaids[i:i + 2]])
        n += 1

    # C block: scale-100 twins. C1/C2 flagship (8 x 10 x 3 = 240 min)
    # in 5 shards of 2 reps; C3..C7 standard (8 x 7 x 2 = 112 min)
    # in shards [1-3],[4,5],[6,7].
    n = 1
    for uid in ("M9-C1", "M9-C2"):
        for shard in _split_reps(M9_REPEATS_FLAGSHIP, 5):
            add("m9c%02d" % n, [("c100", uid, shard, None)])
            n += 1
    for uid in ("M9-C3", "M9-C4", "M9-C5", "M9-C6", "M9-C7"):
        for shard in ([1, 2, 3], [4, 5], [6, 7]):
            add("m9c%02d" % n, [("c100", uid, shard, None)])
            n += 1

    # K block: warmup curve, 4 candidates x 3 reps direct (24 min).
    add("m9k01", [("k", M9_CURVE_IDS[w], None, ["direct"])
                  for w in ("0", "10", "30", "60")])

    # E block: M9-E1 (8 arms x 7 reps x 2 = 112 min) in 3 shards.
    n = 1
    for shard in ([1, 2, 3], [4, 5], [6, 7]):
        add("m9e%02d" % n, [("e1", M9_E1_ID, shard, None)])
        n += 1
    return chunks


M9_CHUNKS = _build_chunks()

M9_CHUNK_DESCRIPTIONS = {}
for _name in M9_CHUNKS:
    if _name.startswith("m9r"):
        M9_CHUNK_DESCRIPTIONS[_name] = "R block: scale-10 M1 resweep shard"
    elif _name.startswith("m9w"):
        M9_CHUNK_DESCRIPTIONS[_name] = "W block: scale-10 M2 resweep rows"
    elif _name.startswith("m9u"):
        M9_CHUNK_DESCRIPTIONS[_name] = "U block: Supavisor M2 twins"
    elif _name.startswith("m9c"):
        M9_CHUNK_DESCRIPTIONS[_name] = "C block: scale-100 M1 twin shard"
    elif _name.startswith("m9k"):
        M9_CHUNK_DESCRIPTIONS[_name] = "K block: M8-C1 warmup curve"
    elif _name.startswith("m9e"):
        M9_CHUNK_DESCRIPTIONS[_name] = "E block: M9-E1 equalized churn"
del _name


def m9_chunk_scale(chunk):
    """Dataset scale for a chunk (C block runs -s 100, rest -s 10)."""
    if chunk not in M9_CHUNKS:
        raise KeyError("unknown M9 chunk %r" % (chunk,))
    return 100 if chunk.startswith("m9c") else 10


def m9_entry_cells(entry):
    """Expand one chunk entry into (cell, arms, reps) for planning."""
    ns, eid, reps, arms = entry
    if ns == "m1":
        cell = m9_resweep_cell(eid)
        return cell, (list(arms) if arms else list(M9_ARMS)), (
            list(reps) if reps else _rep_range(cell["repeats"]))
    if ns == "c100":
        cell = m9_c100_cell(int(eid.rsplit("-C", 1)[1]))
        return cell, (list(arms) if arms else list(M9_ARMS)), (
            list(reps) if reps else _rep_range(cell["repeats"]))
    if ns == "e1":
        cell = m9_e1_cell()
        return cell, (list(arms) if arms else list(M9_ARMS)), (
            list(reps) if reps else _rep_range(cell["repeats"]))
    if ns == "k":
        for key, uid in M9_CURVE_IDS.items():
            if uid == eid:
                cell = m9_curve_cell(key)
                return cell, list(arms or ["direct"]), (
                    list(reps) if reps else _rep_range(cell["repeats"]))
        raise KeyError("unknown M9 curve entry %r" % (eid,))
    if ns == "supa":
        cell = m9_supa_cell(eid)
        return cell, ["supavisor", "direct"], _rep_range(cell["repeats"])
    if ns == "m2":
        from .m2 import m2_cell as _m2cell
        src = _m2cell(eid)
        src["repeats"] = M9_REPEATS_STANDARD
        return src, [src["arm"], "direct"], _rep_range(src["repeats"])
    raise KeyError("unknown M9 namespace %r" % (ns,))


def m9_chunk_plan(chunk):
    """Round-robin (cell, arm, repeat) plan for one M9 chunk.

    Cells cycle outer, arms inner per repeat: no arm blocks a whole
    repeat, and the per-chunk direct control interleaves throughout.
    """
    if chunk not in M9_CHUNKS:
        raise KeyError("unknown M9 chunk %r (want one of %s)"
                       % (chunk, sorted(M9_CHUNKS)))
    plan = []
    for entry in M9_CHUNKS[chunk]:
        cell, arms, reps = m9_entry_cells(entry)
        for rep in reps:
            for arm in arms:
                plan.append((cell, arm, rep))
    return plan


def m9_full_plan():
    """Every M9 chunk plan concatenated (for dry-run pricing)."""
    plan = []
    for chunk in sorted(M9_CHUNKS):
        plan.extend(m9_chunk_plan(chunk))
    return plan


def m9_chunk_arms(chunk):
    """Distinct arms in a chunk (for adapter loading)."""
    arms = []
    for (cell, arm, _rep) in m9_chunk_plan(chunk):
        if arm not in arms:
            arms.append(arm)
    return arms


def _per_run_minutes(cell):
    per_repeat = (cell["warmup_s"] + cell["duration_s"] + 30) / 60.0
    return per_repeat


def m9_chunk_budget_minutes(chunk):
    """Estimated measured wall clock for an M9 chunk (all its arms)."""
    total = 0.0
    for entry in M9_CHUNKS[chunk]:
        cell, arms, reps = m9_entry_cells(entry)
        total += _per_run_minutes(cell) * len(reps) * len(arms)
    return total


def check_m9_chunk_budgets(cap_minutes=60.0):
    over = {}
    for name in M9_CHUNKS:
        mins = m9_chunk_budget_minutes(name)
        if mins >= cap_minutes:
            over[name] = mins
    return over


def m9_total_budget():
    """Priced schedule: total arm-runs and measured hours per block."""
    blocks = {}
    total_runs, total_min = 0, 0.0
    for chunk in sorted(M9_CHUNKS):
        block = {"m9r": "R scale-10 M1", "m9w": "W scale-10 M2",
                 "m9u": "U supavisor twins", "m9c": "C scale-100",
                 "m9k": "K warmup curve",
                 "m9e": "E equalized churn"}[chunk[:3]]
        runs = len(m9_chunk_plan(chunk))
        mins = m9_chunk_budget_minutes(chunk)
        agg = blocks.setdefault(block, {"chunks": 0, "runs": 0,
                                        "minutes": 0.0})
        agg["chunks"] += 1
        agg["runs"] += runs
        agg["minutes"] += mins
        total_runs += runs
        total_min += mins
    return {"blocks": blocks, "chunks": len(M9_CHUNKS),
            "arm_runs": total_runs, "measured_hours": total_min / 60.0}


def m9_budget_table():
    """Published per-arm measured row counts (budget parity surfacing).

    R/C/E/K cells run all 8 arms; W rows run their own arm + direct;
    U rows run supavisor + direct. Counts are arm-runs at matrix level
    (repeats folded in m9_total_budget, not here).
    """
    counts = {arm: 0 for arm in M9_ARMS}
    for chunk in M9_CHUNKS:
        for (cell, arm, _rep) in m9_chunk_plan(chunk):
            counts[arm] = counts.get(arm, 0) + 1
    return counts


def validate_m9_ratios():
    for cid in ("M1-1", "M1-2", "M1-3", "M1-4", "M1-5", "M1-6",
                "M1-7"):
        m9_resweep_cell(cid)
    for cell in m9_c100_cells():
        check_ratio(cell)
    check_ratio(m9_e1_cell())
    for key in M9_CURVE_IDS:
        check_ratio(m9_curve_cell(key))
    for uid in m9_supa_ids():
        m9_supa_cell(uid)
    from .m2 import validate_m2_ratios
    validate_m2_ratios()
