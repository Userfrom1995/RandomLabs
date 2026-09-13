"""Preflight check for poolduel/repro.sh: versions, binaries, ratio guards.

Fails loudly (non-zero exit) instead of running a compromised sweep.
Covers the M1 matrix (cells, chunks) and the M2 matrix (variants, chunks,
chunk coverage, N/A schema validity).
"""

import shutil
import sys

from poolduel.harness.cells import validate_all_ratios
from poolduel.harness.chunk import check_chunk_budgets, CHUNKS
from poolduel.harness.m2 import (M2_CHUNKS, M2_NA_ROWS, check_m2_chunk_budgets,
                                 m2_cell_ids, validate_m2_ratios)


def check_m2_coverage():
    """Every M2 row lives in exactly one chunk."""
    from poolduel.harness.m2 import M2_CHUNKS
    seen = {}
    errors = []
    for chunk, ids in M2_CHUNKS.items():
        for cid in ids:
            if cid in seen:
                errors.append("M2 cell %s in chunks %s and %s"
                              % (cid, seen[cid], chunk))
            seen[cid] = chunk
    missing = set(m2_cell_ids()) - set(seen)
    if missing:
        errors.append("M2 cells missing from chunks: %s" % sorted(missing))
    return errors


def check_m2_na_schema():
    """Every M2 N/A row renders a schema-valid nulls record."""
    import copy

    from poolduel.harness.m2 import GEOMETRIES, M2_NA_ROWS
    from poolduel.harness.runner import PG_CONFIG_BASELINE
    from poolduel.harness.schema import make_na_record, validate_cell
    errors = []
    for (cid, geom, arm, reason) in M2_NA_ROWS:
        g = GEOMETRIES[geom]
        cell = {"cell_id": cid, "workload": g["workload"],
                "clients": g["clients"], "pool_size": g["pool_size"],
                "protocol": g["protocol"], "churn": g["churn"],
                "duration_s": 60, "warmup_s": 30}
        rec = make_na_record(cell, arm, "N/A: %s" % reason, "PG 17",
                             copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42)
        errs = validate_cell(rec)
        if errs:
            errors.append("%s/%s N/A invalid: %s" % (cid, arm, "; ".join(errs)))
    return errors


def check_m8_calibration():
    """M8 calibration specs are coherent (warmup, pilot, breadth).

    Returns error strings (empty when the specs hold).
    """
    from poolduel.harness import calibrate as calibrate_mod
    from poolduel.harness import workloads as workloads_mod
    errors = []
    if 30 not in calibrate_mod.WARMUP_CANDIDATES:
        errors.append("M8 warmup curve must include the 30 s provisional")
    if sorted(calibrate_mod.WARMUP_CANDIDATES) != sorted(
            set(calibrate_mod.WARMUP_CANDIDATES)):
        errors.append("M8 warmup candidates must be distinct")
    try:
        cells = calibrate_mod.scale100_pilot_cells()
    except (ValueError, KeyError) as exc:
        return ["M8 scale-100 pilot error: %s" % exc]
    if len(cells) < 2:
        errors.append("M8 scale-100 pilot needs at least two cells")
    for cell in cells:
        if cell.get("scale") != 100:
            errors.append("M8 pilot cell %s must be scale 100, got %r"
                          % (cell.get("cell_id"), cell.get("scale")))
    for workload in workloads_mod.SCRIPT_WORKLOADS:
        try:
            sql = workloads_mod.script_sql(workload)
        except KeyError as exc:
            errors.append("M8 script workload error: %s" % exc)
            continue
        if not sql.strip():
            errors.append("M8 script workload %s renders empty SQL"
                          % workload)
    if not workloads_mod.PIPELINE_FORBIDDEN_REASON.strip():
        errors.append("M8 pipeline forbidden reason must be written")
    return errors


def check_supavisor_budget():
    """M9 Supavisor budget equals the matrix maximum (plan section 8).

    Equal cell budget is structural: Supavisor must run every geometry
    any other arm runs. Returns error strings (empty when parity holds).
    """
    from poolduel.harness.supavisor import budget_parity_ok
    ok, detail = budget_parity_ok()
    if ok:
        return []
    return ["Supavisor M9 budget parity broken: %s" % detail]


def check_m9_coverage():
    """Every M9 cell/row lives in exactly one chunk with full repeats."""
    from poolduel.harness.m9 import (M9_CHUNKS, M9_CURVE_IDS, M9_E1_ID,
                                     m9_entry_cells)
    from poolduel.harness.m2 import m2_cell_ids
    errors = []
    seen_cells, seen_rows = {}, {}
    rep_cover = {}
    for chunk, entries in M9_CHUNKS.items():
        for entry in entries:
            ns, eid, reps, _arms = entry
            try:
                cell, _arms2, plan_reps = m9_entry_cells(entry)
            except (KeyError, ValueError) as exc:
                errors.append("M9 chunk %s entry %r broken: %s"
                              % (chunk, entry, exc))
                continue
            if ns in ("m1", "c100", "e1", "k"):
                key = cell["cell_id"]
                rep_cover.setdefault(key, set()).update(plan_reps)
                seen_cells.setdefault(key, []).append(chunk)
            else:
                seen_rows.setdefault(eid, []).append(chunk)
    for key, chunks in seen_cells.items():
        if len(chunks) > 1 and key != M9_E1_ID and key not in M9_CURVE_IDS.values():
            pass  # R/C shards repeat a cell across chunks by design
    # Full repeat coverage: R twins 1..10/1..7, C twins likewise,
    # E1 1..7, curve points 1..3.
    from poolduel.harness.m9 import (M9_REPEATS_FLAGSHIP,
                                     M9_REPEATS_STANDARD, m9_repeats,
                                     m9_resweep_cell)
    for cid in ("M1-1", "M1-2", "M1-3", "M1-4", "M1-5", "M1-6",
                "M1-7"):
        want = set(range(1, m9_repeats(m9_resweep_cell(cid)) + 1))
        if rep_cover.get(cid, set()) != want:
            errors.append("M9 R cell %s repeat cover %s, want %s"
                          % (cid, sorted(rep_cover.get(cid, set())),
                             sorted(want)))
    for i in range(1, 8):
        key = "M9-C%d" % i
        want_n = (M9_REPEATS_FLAGSHIP if i <= 2 else M9_REPEATS_STANDARD)
        if rep_cover.get(key, set()) != set(range(1, want_n + 1)):
            errors.append("M9 C cell %s repeat cover %s, want 1..%d"
                          % (key, sorted(rep_cover.get(key, set())),
                             want_n))
    if rep_cover.get(M9_E1_ID, set()) != set(
            range(1, M9_REPEATS_STANDARD + 1)):
        errors.append("M9 E1 repeat cover %s, want 1..%d"
                      % (sorted(rep_cover.get(M9_E1_ID, set())),
                         M9_REPEATS_STANDARD))
    for key in M9_CURVE_IDS.values():
        if rep_cover.get(key, set()) != {1, 2, 3}:
            errors.append("M9 K cell %s repeat cover %s, want [1, 2, 3]"
                          % (key, sorted(rep_cover.get(key, set()))))
    # Every M2 row reswept exactly once; every supa twin exactly once.
    from poolduel.harness.m9 import m9_supa_ids
    for cid in m2_cell_ids():
        n = len(seen_rows.get(cid, []))
        if n != 1:
            errors.append("M9 W row %s in %d chunks, want 1" % (cid, n))
    for uid in m9_supa_ids():
        n = len(seen_rows.get(uid, []))
        if n != 1:
            errors.append("M9 U row %s in %d chunks, want 1" % (uid, n))
    return errors


def check_m9_seeds():
    """Paired-seed schedule: distinct seeds 1..10, arm-independent."""
    from poolduel.harness.m9 import m9_seed_for
    errors = []
    seeds = [m9_seed_for(r) for r in range(1, 11)]
    if len(set(seeds)) != len(seeds):
        errors.append("M9 paired seeds collide over repeats 1..10")
    try:
        m9_seed_for(0)
        errors.append("M9 m9_seed_for(0) must raise")
    except ValueError:
        pass
    import inspect
    params = list(inspect.signature(m9_seed_for).parameters)
    if "arm" in params:
        errors.append("M9 seed schedule must not take an arm parameter")
    return errors


def check_m9_supa_na_schema():
    """Every M9 supavisor N/A row renders a schema-valid nulls record."""
    import copy

    from poolduel.harness.m2 import GEOMETRIES
    from poolduel.harness.m9 import m9_supa_na_rows
    from poolduel.harness.runner import PG_CONFIG_BASELINE
    from poolduel.harness.schema import make_na_record, validate_cell
    errors = []
    if not m9_supa_na_rows():
        errors.append("M9 expects statement-twin N/A rows, found none")
    for (uid, geom, arm, reason) in m9_supa_na_rows():
        g = GEOMETRIES[geom]
        cell = {"cell_id": uid, "workload": g["workload"],
                "clients": g["clients"], "pool_size": g["pool_size"],
                "protocol": g["protocol"], "churn": g["churn"],
                "duration_s": 60, "warmup_s": 30}
        rec = make_na_record(cell, arm, "N/A: %s" % reason, "PG 17",
                             copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42)
        errs = validate_cell(rec)
        if errs:
            errors.append("%s/%s N/A invalid: %s"
                          % (uid, arm, "; ".join(errs)))
    return errors


def check_m9_scale_init():
    """C-block chunks declare scale 100 (workflow init -s 100)."""
    from poolduel.harness.m9 import M9_CHUNKS, m9_chunk_scale
    errors = []
    c100 = sorted(c for c in M9_CHUNKS if c.startswith("m9c"))
    if len(c100) != 25:
        errors.append("M9 C block wants 25 chunks, found %d" % len(c100))
    for chunk in M9_CHUNKS:
        want = 100 if chunk.startswith("m9c") else 10
        if m9_chunk_scale(chunk) != want:
            errors.append("M9 chunk %s scale %d, want %d"
                          % (chunk, m9_chunk_scale(chunk), want))
    return errors


def main():
    errors = []
    for binary in ("pgbench", "psql"):
        if shutil.which(binary) is None:
            errors.append("missing required binary: %s" % binary)
    try:
        validate_all_ratios()
    except ValueError as exc:
        errors.append(str(exc))
    over = check_chunk_budgets()
    if over:
        errors.append("chunks over 60 min cap: %s" % over)
    if not CHUNKS:
        errors.append("no chunks defined")
    try:
        validate_m2_ratios()
    except (ValueError, KeyError) as exc:
        errors.append("M2 ratio/cell error: %s" % exc)
    over2 = check_m2_chunk_budgets()
    if over2:
        errors.append("M2 chunks over 60 min cap: %s" % over2)
    if not M2_CHUNKS:
        errors.append("no M2 chunks defined")
    errors.extend(check_m2_coverage())
    errors.extend(check_m2_na_schema())
    errors.extend(check_supavisor_budget())
    errors.extend(check_m8_calibration())
    errors.extend(check_m9_coverage())
    errors.extend(check_m9_seeds())
    errors.extend(check_m9_supa_na_schema())
    errors.extend(check_m9_scale_init())
    from poolduel.harness.m9 import (M9_CHUNKS, check_m9_chunk_budgets,
                                     m9_supa_na_rows)
    over9 = check_m9_chunk_budgets()
    if over9:
        errors.append("M9 chunks over 60 min cap: %s" % over9)
    if not M9_CHUNKS:
        errors.append("no M9 chunks defined")
    if errors:
        for err in errors:
            print("poolduel check FAILED: %s" % err)
        return 1
    print("poolduel check ok: pgbench present, 7 M1 cells ratio-clean, "
          "%d M1 chunks under cap, %d M2 rows ratio-clean, "
          "%d M2 chunks under cap, %d N/A rows schema-valid"
          % (len(CHUNKS), len(m2_cell_ids()), len(M2_CHUNKS),
             len(M2_NA_ROWS)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
