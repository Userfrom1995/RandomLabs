"""Preflight check for poolduel/repro.sh: versions, binaries, ratio guards.

Fails loudly (non-zero exit) instead of running a compromised sweep.
Covers the M1 matrix (cells, chunks) and the M2 matrix (variants, chunks,
chunk coverage, N/A schema validity).
"""

import json
import os
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
    # R/C shards repeat a cell across chunks by design, and E1/curve
    # cells likewise span their shard chunks, so multi-chunk sightings
    # here are expected (repeat completeness is pinned below).
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


def check_soak_coverage():
    """Every soak (cell, duration) owns all 6 arms incl. direct.

    One chunk per (cell, arm, duration): 36 chunks named m10s01..m10s36,
    each with full repeats 1..3 of its arm. Supavisor must be absent
    (deferred with reason, never silently dropped).
    """
    from poolduel.harness.soak import (SOAK_ARMS, SOAK_CHUNKS,
                                       SOAK_DURATIONS, SOAK_REPEATS,
                                       soak_cell_ids, soak_entry_cells,
                                       validate_soak_ratios)
    errors = []
    try:
        validate_soak_ratios()
    except (KeyError, ValueError) as exc:
        errors.append("soak ratio/cell error: %s" % exc)
        return errors
    if len(SOAK_CHUNKS) != 36:
        errors.append("soak wants 36 chunks, found %d" % len(SOAK_CHUNKS))
    if sorted(SOAK_CHUNKS) != ["m10s%02d" % n for n in range(1, 37)]:
        errors.append("soak chunks must be exactly m10s01..m10s36")
    cover, rep_cover = {}, {}
    for chunk, entries in SOAK_CHUNKS.items():
        if len(entries) != 1:
            errors.append("soak chunk %s must hold one entry, found %d"
                          % (chunk, len(entries)))
            continue
        try:
            cell, arms, reps = soak_entry_cells(entries[0])
        except (KeyError, ValueError) as exc:
            errors.append("soak chunk %s entry %r broken: %s"
                          % (chunk, entries[0], exc))
            continue
        key = (cell["cell_id"], cell["duration_s"])
        for arm in arms:
            cover.setdefault(key, set()).add(arm)
            rep_cover.setdefault((key, arm), set()).update(reps)
    for cid in soak_cell_ids():
        for duration in SOAK_DURATIONS:
            key = (cid, duration)
            if cover.get(key, set()) != set(SOAK_ARMS):
                errors.append("soak %s/%ds arms %s, want %s"
                              % (cid, duration,
                                 sorted(cover.get(key, set())),
                                 sorted(SOAK_ARMS)))
            if "direct" not in cover.get(key, set()):
                errors.append("soak %s/%ds missing direct control chunk"
                              % (cid, duration))
            for arm in SOAK_ARMS:
                want = set(range(1, SOAK_REPEATS + 1))
                if rep_cover.get((key, arm), set()) != want:
                    errors.append("soak %s/%ds/%s repeats %s, want %s"
                                  % (cid, duration, arm,
                                     sorted(rep_cover.get((key, arm),
                                                          set())),
                                     sorted(want)))
    for chunk, entries in SOAK_CHUNKS.items():
        for entry in entries:
            if entry[3] == "supavisor":
                errors.append("soak chunk %s carries deferred supavisor"
                              % chunk)
    return errors


def check_soak_budgets():
    """Every soak chunk sits under the soak budget cap (200 min)."""
    from poolduel.harness.soak import (SOAK_CHUNK_BUDGET_CAP_MINUTES,
                                       check_soak_chunk_budgets)
    over = check_soak_chunk_budgets()
    if over:
        return ["soak chunks over %.0f min cap: %s"
                % (SOAK_CHUNK_BUDGET_CAP_MINUTES, over)]
    return []


def check_soak_scale_init():
    """Every soak chunk declares scale 10 (workflow init -s 10)."""
    from poolduel.harness.soak import SOAK_CHUNKS, soak_chunk_scale
    errors = []
    for chunk in SOAK_CHUNKS:
        try:
            scale = soak_chunk_scale(chunk)
        except KeyError as exc:
            errors.append("soak scale error: %s" % exc)
            continue
        if scale != 10:
            errors.append("soak chunk %s scale %d, want 10"
                          % (chunk, scale))
    return errors


def check_soak_seeds():
    """Soak repeats reuse the paired M9 seed schedule (arm-independent)."""
    from poolduel.harness.soak import soak_seed_for
    errors = []
    seeds = [soak_seed_for(r) for r in range(1, 4)]
    if len(set(seeds)) != len(seeds):
        errors.append("soak paired seeds collide over repeats 1..3")
    try:
        soak_seed_for(0)
        errors.append("soak soak_seed_for(0) must raise")
    except ValueError:
        pass
    import inspect
    params = list(inspect.signature(soak_seed_for).parameters)
    if "arm" in params:
        errors.append("soak seed schedule must not take an arm parameter")
    return errors


def check_site_coherence():
    """sitemeta.json recomputes from the committed bundles (no hand values)."""
    from poolduel.harness import site as sitemod
    errors = []
    root = os.path.join(os.path.dirname(__file__), "..")
    paths = {
        "m1": os.path.join(root, "results", "m1", "medians.json"),
        "m2": os.path.join(root, "results", "m2", "medians.json"),
        "m9": os.path.join(root, "results", "m9", "medians.json"),
        "report": os.path.join(root, "results", "report.json"),
        "sitemeta": os.path.join(root, "results", "sitemeta.json"),
    }
    try:
        with open(paths["sitemeta"]) as handle:
            committed = json.load(handle)
    except (OSError, ValueError) as exc:
        return ["sitemeta.json unreadable: %s" % exc]
    try:
        loaded = {}
        for key in ("m1", "m2", "m9", "report"):
            with open(paths[key]) as handle:
                loaded[key] = json.load(handle)
    except (OSError, ValueError) as exc:
        return ["site input bundle unreadable: %s" % exc]
    fresh = sitemod.build_sitemeta(loaded["m1"], loaded["m2"],
                                   loaded["m9"], loaded["report"])
    for key in ("executive_cards", "flagship", "m2_blocks", "m9_leg",
                "iso_regions", "flatness", "counts"):
        if committed.get(key) != fresh.get(key):
            errors.append("sitemeta.json[%s] drifted from bundles; "
                          "re-run repro.sh --site" % key)
    for key in ("m1/medians.json", "m2/medians.json", "m9/medians.json",
                "report.json"):
        want = sitemod._sha256_file(os.path.join(root, "results", key))
        if committed.get("sources", {}).get(key) != want:
            errors.append("sitemeta sources[%s] SHA mismatch; "
                          "re-run repro.sh --site" % key)
    index = os.path.join(root, "index.html")
    try:
        with open(index) as handle:
            text = handle.read()
    except OSError as exc:
        return errors + ["index.html unreadable: %s" % exc]
    for name in sitemod.SECTIONS:
        if "<!-- SITE:%s:begin -->" % name not in text:
            errors.append("index.html lacks SITE marker %s" % name)
    return errors


def check_dossier_coherence():
    """dossiermeta.json recomputes from the committed bundles (no hand values).

    Also verifies every dossier page carries all DOSSIER markers, the
    same 7-section template as its siblings, and zero ``loading``
    cells as content.
    """
    import re
    from poolduel.harness import dossiers as dossmod
    errors = []
    root = os.path.join(os.path.dirname(__file__), "..")
    paths = {
        "m1": os.path.join(root, "results", "m1", "medians.json"),
        "m2": os.path.join(root, "results", "m2", "medians.json"),
        "m9": os.path.join(root, "results", "m9", "medians.json"),
        "report": os.path.join(root, "results", "report.json"),
        "dossiermeta": os.path.join(root, "results", "dossiermeta.json"),
    }
    try:
        with open(paths["dossiermeta"]) as handle:
            committed = json.load(handle)
    except (OSError, ValueError) as exc:
        return ["dossiermeta.json unreadable: %s" % exc]
    try:
        loaded = {}
        for key in ("m1", "m2", "m9", "report"):
            with open(paths[key]) as handle:
                loaded[key] = json.load(handle)
    except (OSError, ValueError) as exc:
        return ["dossier input bundle unreadable: %s" % exc]
    fresh = None
    try:
        settings = {}
        for pooler in dossmod.DOSSIERS:
            page = os.path.join(root, pooler, "index.html")
            with open(page) as handle:
                settings[pooler] = dossmod.parse_settings(handle.read())
        fresh = dossmod.build_all(loaded["m1"], loaded["m2"], loaded["m9"],
                                  loaded["report"], {}, settings)
    except (OSError, ValueError) as exc:
        return ["dossier rebuild failed: %s" % exc]
    committed_dossiers = committed.get("dossiers", {})
    for pooler in dossmod.DOSSIERS:
        want = fresh.get(pooler)
        got = committed_dossiers.get(pooler)
        if got is None:
            errors.append("dossiermeta lacks dossier %s" % pooler)
            continue
        for key in ("rows", "counts", "legs", "flatness", "verdicts"):
            if got.get(key) != (want or {}).get(key):
                errors.append("dossiermeta[%s/%s] drifted from bundles; "
                              "re-run repro.sh --dossiers" % (pooler, key))
    sections = None
    for pooler in dossmod.DOSSIERS:
        page = os.path.join(root, pooler, "index.html")
        try:
            with open(page) as handle:
                text = handle.read()
        except OSError as exc:
            errors.append("%s/index.html unreadable: %s" % (pooler, exc))
            continue
        for name in dossmod.MARKERS:
            if "<!-- DOSSIER:%s:begin -->" % name not in text:
                errors.append("%s lacks DOSSIER marker %s" % (pooler,
                                                              name))
        if "loading" in text:
            errors.append("%s still ships loading cells; "
                          "re-run repro.sh --dossiers" % pooler)
        found = re.findall(r'<div class="section" id="([^"]+)">', text)
        if sections is None:
            sections = found
        elif found != sections:
            errors.append("%s breaks the 7-section template contract"
                          % pooler)
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
    errors.extend(check_soak_coverage())
    errors.extend(check_soak_budgets())
    errors.extend(check_soak_scale_init())
    errors.extend(check_soak_seeds())
    errors.extend(check_site_coherence())
    errors.extend(check_dossier_coherence())
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
