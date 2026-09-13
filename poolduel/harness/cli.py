"""Poolduel M1+M2 command line. No interactive prompts; all via flags."""

import argparse
import json
import os
import sys

from .cells import ARMS, M1_CELLS, get_cell
from .chunk import (CHUNKS, chunk_cells, filter_completed, load_manifest,
                    round_robin_schedule, save_manifest)
from .m2 import (M2_CHUNKS, M2_NA_ROWS, m2_cell, m2_cell_ids, m2_chunk_arms,
                 m2_chunk_cells)
from .runner import run_plan, write_medians


def build_parser():
    p = argparse.ArgumentParser(
        description="Poolduel harness: shared pgbench procedure, "
                    "pooler-blind arms. M1 transaction sweep plus "
                    "M2 modes/I-O/workload twins.")
    p.add_argument("--matrix", default="m1", choices=("m1", "m2", "m9"),
                   help="which matrix to run (default: m1)")
    p.add_argument("--cells", default="",
                   help="comma-separated cell ids (default: all in matrix)")
    p.add_argument("--arms", default=",".join(ARMS),
                   help="comma-separated arms, M1 only "
                        "(default: all six; M2 rows carry their own arm)")
    p.add_argument("--repeats", type=int, default=0,
                   help="override repeats per cell (0 = per-cell default)")
    p.add_argument("--chunk", default="",
                   help="run one chunk instead of --cells "
                        "(M1: a1,a2,b1,b2,c,d,e,f,g; "
                        "M2: m2a1..m2i2)")
    p.add_argument("--pilot", action="store_true",
                   help="pilot only: M1-1 + M1-2, one repeat per arm; "
                        "with --matrix m2: m2a1 rows, one repeat")
    p.add_argument("--list-m2", action="store_true",
                   help="print the M2 variant table plus N/A rows and exit")
    p.add_argument("--list-m9", action="store_true",
                   help="print the M9 resweep matrix (blocks, chunks, "
                        "budgets, N/A rows) and exit")
    p.add_argument("--list-budget", action="store_true",
                   help="print per-contender cell budgets (M1+M2) and exit")
    p.add_argument("--list-calibration", action="store_true",
                   help="print the M8 calibration specs (warmup curve, "
                        "scale-100 pilot, workload breadth) and exit")
    p.add_argument("--smoke-supavisor", action="store_true",
                   help="render the Supavisor provisioning bundle into "
                        "--out and evaluate the M7 smoke gate (exit 0 "
                        "only with zero fail rows)")
    p.add_argument("--write-na", action="store_true",
                   help="with --matrix m2: emit N/A JSON records for "
                        "unsupported rows into --out/raw and exit")
    p.add_argument("--threads", type=int, default=4)
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--dbname", default="benchdb")
    p.add_argument("--user", default="benchuser")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out", default="poolduel/results/m1",
                   help="output directory for raw JSON + medians")
    p.add_argument("--dry-run", action="store_true",
                   help="print the plan without executing anything")
    p.add_argument("--pg-version", default="PG 17")
    return p


def resolve_cells(args):
    if args.matrix == "m9":
        from .m9 import m9_chunk_plan, m9_full_plan
        if args.chunk:
            return [cell for (cell, _arm, _rep)
                    in m9_chunk_plan(args.chunk)]
        if args.pilot:
            return [cell for (cell, _arm, _rep)
                    in m9_chunk_plan("m9k01")]
        seen, cells = set(), []
        for (cell, _arm, _rep) in m9_full_plan():
            if cell["cell_id"] not in seen:
                seen.add(cell["cell_id"])
                cells.append(cell)
        return cells
    if args.matrix == "m2":
        if args.chunk:
            return m2_chunk_cells(args.chunk)
        if args.cells.strip():
            ids = [c.strip() for c in args.cells.split(",") if c.strip()]
            return [m2_cell(cid) for cid in ids]
        if args.pilot:
            return m2_chunk_cells("m2a1")
        return [m2_cell(cid) for cid in m2_cell_ids()]
    if args.pilot:
        return [get_cell("M1-1"), get_cell("M1-2")]
    if args.chunk:
        return chunk_cells(args.chunk)
    if args.cells.strip():
        ids = [c.strip() for c in args.cells.split(",") if c.strip()]
        return [get_cell(cid) for cid in ids]
    return [dict(c) for c in M1_CELLS]


def resolve_arms(args):
    arms = [a.strip() for a in args.arms.split(",") if a.strip()]
    unknown = [a for a in arms if a not in ARMS]
    if unknown:
        raise SystemExit("unknown arms: %s (want %s)" % (unknown, ARMS))
    if "direct" not in arms:
        arms = ["direct"] + arms
    return arms


def m2_direct_cell(row_cell):
    """Control twin of an M2 row: same geometry, direct arm, no variant."""
    cell = dict(row_cell)
    cell["arm"] = "direct"
    cell["variant"] = {}
    return cell


def m2_plan(cells, repeats_per_cell=None):
    """Build a round-robin plan from M2 rows.

    Each row runs its own arm plus the direct control on the same geometry
    (same-runner discipline). Order interleaves per repeat index so no arm
    blocks a whole repeat.
    """
    plan = []
    reps_of = {}
    for cell in cells:
        reps = (repeats_per_cell if repeats_per_cell is not None
                else cell.get("repeats", 3))
        reps_of[cell["cell_id"]] = list(range(1, reps + 1))
    max_rep = max((len(v) for v in reps_of.values()), default=0)
    for rep in range(1, max_rep + 1):
        for cell in cells:
            if rep not in reps_of[cell["cell_id"]]:
                continue
            plan.append((cell, cell["arm"], rep))
            plan.append((m2_direct_cell(cell), "direct", rep))
    return plan


def print_budget():
    """Per-contender budgets across M1+M2 (M6 budget-parity surfacing).

    M1: every arm measures all 7 cells (6 arms x 7 = 42 medians).
    M2: realized measured rows per pooler from the variant table plus
    the per-chunk direct controls; structural imbalance (session-only
    modes, unsupported statement paths) stays visible as N/A with
    reason. Prints JSON plus a human line per arm; exit 0.
    """
    from .m2 import M2_ROWS, m2_budget_table
    m2 = m2_budget_table()
    combined = {}
    for arm in ARMS:
        m1_cells = len(M1_CELLS)
        # Direct rides every M2 row as the same-geometry control twin
        # (m2_plan pairs each row with a direct run); other arms run
        # only their own variant rows.
        m2_rows = len(M2_ROWS) if arm == "direct" else int(m2.get(arm, 0))
        combined[arm] = {"m1_cells": m1_cells, "m2_rows": m2_rows,
                         "total": m1_cells + m2_rows}
    print(json.dumps(combined, sort_keys=True))
    for arm in ARMS:
        row = combined[arm]
        print("%s: M1 %d cells + M2 %d rows = %d"
              % (arm, row["m1_cells"], row["m2_rows"], row["total"]))
    print("M2 structural N/A rows carry nulls with reason "
          "(see --list-m2); best-vs-best always ships beside iso slices.")
    # M7 onboarding: Supavisor M9 equal budget (defined in
    # harness/supavisor.py, measured in M9 after the smoke gate).
    # Additive line; the JSON above stays the M1+M2 universe so
    # committed medians keep validating byte-identically.
    from . import supavisor as supavisor_mod
    budget = supavisor_mod.M9_SUPAVISOR_BUDGET
    print("supavisor (M9 entry, smoke-gated): M1 %d cells + M2 %d rows "
          "= %d"
          % (budget["m1_cells"], budget["m2_rows"], budget["total"]))


def print_calibration():
    """M8 calibration specs (warmup curve, scale-100 pilot, breadth).

    Prints JSON plus human lines; exit 0. Definitions live in
    harness/calibrate.py and harness/workloads.py (no hand values).
    """
    from . import calibrate as calibrate_mod
    from . import workloads as workloads_mod
    budget = calibrate_mod.calibration_budget_table()
    print(json.dumps({
        "warmup_candidates_s": list(calibrate_mod.WARMUP_CANDIDATES),
        "warmup_tolerance": calibrate_mod.WARMUP_TOLERANCE,
        "warmup_curve": calibrate_mod.WARMUP_CURVE_SPEC,
        "scale100_pilot": [c["cell_id"] for c in
                           calibrate_mod.scale100_pilot_cells()],
        "scale100_pilot_budget_min":
            calibrate_mod.scale100_pilot_budget_minutes(),
        "script_workloads": list(workloads_mod.SCRIPT_WORKLOADS),
        "calibration_budget": budget,
    }, sort_keys=True))
    print("warmup candidates (s): %s (tolerance %.1f%%)"
          % (list(calibrate_mod.WARMUP_CANDIDATES),
             calibrate_mod.WARMUP_TOLERANCE * 100.0))
    for cell in calibrate_mod.scale100_pilot_cells():
        print("%s %s c=%d pool=%d scale=%d%s" % (
            cell["cell_id"], cell["workload"], cell["clients"],
            cell["pool_size"], cell["scale"],
            " churn" if cell["churn"] else ""))
    print("script workloads: %s; pipeline forbidden (see workloads.py)"
          % ", ".join(workloads_mod.SCRIPT_WORKLOADS))


def print_m9_table():
    from .m9 import (M9_CHUNKS, M9_CHUNK_DESCRIPTIONS, m9_budget_table,
                     m9_chunk_budget_minutes, m9_supa_na_rows,
                     m9_total_budget)
    total = m9_total_budget()
    print("M9 resweep blocks (powered repeats, paired seeds):")
    for block, agg in sorted(total["blocks"].items()):
        print("  %s: %d chunks, %d arm-runs, %.1f measured min"
              % (block, agg["chunks"], agg["runs"], agg["minutes"]))
    print("--- chunks (%d, cap 60 min each) ---" % len(M9_CHUNKS))
    for name in sorted(M9_CHUNKS):
        print("%s: %s [%.1f min]"
              % (name, M9_CHUNK_DESCRIPTIONS[name],
                 m9_chunk_budget_minutes(name)))
    print("--- N/A (unsupported, nulls, zero time) ---")
    for (uid, geom, arm, reason) in m9_supa_na_rows():
        print("%s %s %s N/A: %s" % (uid, arm, geom, reason))
    print("--- measured arm-runs per arm (matrix level) ---")
    print(json.dumps(m9_budget_table(), sort_keys=True))
    print("total: %d arm-runs, %.1f measured hours across %d chunks "
          "(+ per-chunk init/build wall clock, priced in docs/m9-matrix.md)"
          % (total["arm_runs"], total["measured_hours"],
             total["chunks"]))


def print_m2_table():
    from .m2 import (GEOMETRIES, M2_CHUNK_DESCRIPTIONS, M2_ROWS,
                     m2_budget_table)
    for (cid, geom, arm, variant) in M2_ROWS:
        g = GEOMETRIES[geom]
        print("%s %s %s c=%d pool=%d %s%s variant=%s" % (
            cid, arm, geom, g["clients"], g["pool_size"], g["workload"],
            " prepared" if g["protocol"] == "prepared" else "",
            variant or "{}"))
    print("--- N/A (unsupported, nulls, zero time) ---")
    for (cid, geom, arm, reason) in M2_NA_ROWS:
        print("%s %s %s N/A: %s" % (cid, arm, geom, reason))
    print("--- chunks ---")
    for name in sorted(M2_CHUNKS):
        print("%s: %s" % (name, M2_CHUNK_DESCRIPTIONS[name]))
    print("--- realized measured rows per pooler ---")
    print(json.dumps(m2_budget_table(), sort_keys=True))


def write_na_records(out_dir, threads=4, seed=42, pg_version="PG 17"):
    """Emit schema-valid N/A JSON records for unsupported M2 rows."""
    import copy

    from .m2 import GEOMETRIES
    from .runner import PG_CONFIG_BASELINE
    from .schema import make_na_record, validate_cell
    raw_dir = os.path.join(out_dir, "raw")
    os.makedirs(raw_dir, exist_ok=True)
    written = []
    for (cid, geom, arm, reason) in M2_NA_ROWS:
        g = GEOMETRIES[geom]
        cell = {"cell_id": cid, "workload": g["workload"],
                "clients": g["clients"], "pool_size": g["pool_size"],
                "protocol": g["protocol"], "churn": g["churn"],
                "duration_s": 60, "warmup_s": 30}
        config = ("# N/A (unsupported): %s has no %s arm here (%s); "
                  "see poolduel/docs/modes.md" % (arm, cid, reason))
        rec = make_na_record(cell, arm, config, pg_version,
                             copy.deepcopy(PG_CONFIG_BASELINE),
                             threads, 1, seed)
        errs = validate_cell(rec)
        if errs:
            raise SystemExit("N/A record invalid: %s" % "; ".join(errs))
        fname = os.path.join(raw_dir, "%s-%s-na.json" % (cid, arm))
        with open(fname, "w") as f:
            json.dump(rec, f, indent=2, sort_keys=True)
        written.append(fname)
    return written


def write_m9_na_records(out_dir, threads=4, seed=42, pg_version="PG 17"):
    """Emit schema-valid N/A JSON records for M9 supavisor statement twins."""
    import copy

    from .m9 import m9_supa_na_rows
    from .runner import PG_CONFIG_BASELINE
    from .schema import make_na_record, validate_cell
    raw_dir = os.path.join(out_dir, "raw")
    os.makedirs(raw_dir, exist_ok=True)
    written = []
    for (uid, geom, arm, reason) in m9_supa_na_rows():
        from .m2 import GEOMETRIES
        g = GEOMETRIES[geom]
        cell = {"cell_id": uid, "workload": g["workload"],
                "clients": g["clients"], "pool_size": g["pool_size"],
                "protocol": g["protocol"], "churn": g["churn"],
                "duration_s": 60, "warmup_s": 30}
        rec = make_na_record(cell, arm, "N/A: %s" % reason, pg_version,
                             copy.deepcopy(PG_CONFIG_BASELINE),
                             threads, 1, seed)
        errs = validate_cell(rec)
        if errs:
            raise SystemExit("N/A record invalid: %s" % "; ".join(errs))
        fname = os.path.join(raw_dir, "%s-%s-na.json" % (uid, arm))
        with open(fname, "w") as f:
            json.dump(rec, f, indent=2, sort_keys=True)
        written.append(fname)
    return written


def smoke_supavisor(args):
    """Render the Supavisor bundle and evaluate the M7 smoke gate.

    Writes supavisor.env + tenant.json + metadata.sql + SUPAVISOR_RUN.sh
    into --out via the real adapter setup(), then runs
    harness/supavisor.py:smoke_gate() over the written files with the
    env the adapter rendered. Prints one line per gate row; exit 0
    only with zero fail rows (matrix entry stays blocked otherwise).
    The release SHA comes from --pg-version only as a carrier is wrong;
    pass it via SUPAVISOR_SHA env (empty means unrecorded, a fail row).
    """
    import os

    from . import supavisor as supavisor_mod
    from .cells import get_cell
    cell = get_cell("M1-1")
    adapter = load_adapters(["supavisor"])["supavisor"]
    bundle_dir = os.path.join(args.out, "supavisor-smoke")
    adapter.setup(bundle_dir, cell)
    bundle = {}
    for name in ("supavisor.env", "tenant.json", "metadata.sql",
                 "SUPAVISOR_RUN.sh"):
        path = os.path.join(bundle_dir, name)
        try:
            with open(path) as f:
                bundle[name] = f.read()
        except OSError:
            bundle[name] = ""
    env = {}
    for line in bundle.get("supavisor.env", "").splitlines():
        if "=" in line and not line.startswith("#"):
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    rows = supavisor_mod.smoke_gate(
        bundle, recorded_sha=os.environ.get("SUPAVISOR_SHA", ""),
        env=env)
    for (name, status, detail) in rows:
        print("[%s] %s: %s" % (status.upper(), name, detail))
    ok = supavisor_mod.gate_passes(rows)
    print("supavisor smoke gate: %s (%d rows, bundle at %s)"
          % ("PASS" if ok else "BLOCKED", len(rows), bundle_dir))
    return 0 if ok else 1


def load_adapters(arms):
    from .adapters import direct as direct_mod
    from .adapters import odyssey as odyssey_mod
    from .adapters import pgagroal as pgagroal_mod
    from .adapters import pgbouncer as pgbouncer_mod
    from .adapters import pgcat as pgcat_mod
    from .adapters import pgpool as pgpool_mod
    from .adapters import supavisor as supavisor_adapter_mod
    makers = {
        "direct": direct_mod.DirectAdapter,
        "pgagroal": pgagroal_mod.PgAgroalAdapter,
        "pgbouncer": pgbouncer_mod.PgBouncerAdapter,
        "pgpool": pgpool_mod.PgPoolAdapter,
        "odyssey": odyssey_mod.OdysseyAdapter,
        "pgcat": pgcat_mod.PgCatAdapter,
        "supavisor": supavisor_adapter_mod.SupavisorAdapter,
    }
    return {arm: makers[arm]() for arm in arms}


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.threads <= 0:
        parser.error("--threads must be positive")
    if args.list_m2:
        print_m2_table()
        return 0
    if args.list_m9:
        print_m9_table()
        return 0
    if args.list_budget:
        print_budget()
        return 0
    if args.list_calibration:
        print_calibration()
        return 0
    if args.smoke_supavisor:
        return smoke_supavisor(args)
    if args.write_na:
        if args.matrix == "m9":
            written = write_m9_na_records(
                args.out, threads=args.threads, seed=args.seed,
                pg_version=args.pg_version)
            print("wrote %d N/A records -> %s/raw" % (len(written),
                                                      args.out))
            return 0
        if args.matrix != "m2":
            parser.error("--write-na needs --matrix m2 or --matrix m9")
        written = write_na_records(
            args.out, threads=args.threads, seed=args.seed,
            pg_version=args.pg_version)
        print("wrote %d N/A records -> %s/raw" % (len(written), args.out))
        return 0
    if args.matrix in ("m2", "m9") and args.arms != ",".join(ARMS):
        parser.error("--arms is M1-only; M2/M9 rows carry their own arm")
    cells = resolve_cells(args)
    repeats = args.repeats if args.repeats > 0 else None
    if args.pilot:
        repeats = 1
    seed_fn = None
    if args.matrix == "m9":
        from .m9 import m9_chunk_plan, m9_full_plan, m9_seed_for

        def seed_fn(base_seed, repeat):
            return m9_seed_for(repeat, base_seed=base_seed)
        if args.chunk:
            plan = m9_chunk_plan(args.chunk)
            if repeats is not None:
                plan = [(c, a, r) for (c, a, r) in plan
                        if r <= repeats]
        elif args.pilot:
            # M9 pilot is the warmup-curve chunk (calibration first):
            # one repeat per (cell, arm) of m9k01.
            seen, plan = set(), []
            for (c, a, _r) in m9_chunk_plan("m9k01"):
                if (c["cell_id"], a) not in seen:
                    seen.add((c["cell_id"], a))
                    plan.append((c, a, 1))
        else:
            plan = m9_full_plan()
            if repeats is not None:
                plan = [(c, a, r) for (c, a, r) in plan
                        if r <= repeats]
        arms = sorted({arm for (_, arm, _) in plan})
    elif args.matrix == "m2":
        plan = m2_plan(cells, repeats_per_cell=repeats)
        arms = sorted({arm for (_, arm, _) in plan})
    else:
        arms = resolve_arms(args)
        plan = round_robin_schedule(cells, arms, repeats_per_cell=repeats)
    manifest = load_manifest(args.out)
    plan = filter_completed(plan, manifest)
    if args.dry_run:
        for (cell, arm, rep) in plan:
            variant = cell.get("variant") or {}
            seed = (seed_fn(args.seed, rep) if seed_fn is not None
                    else args.seed + rep)
            suffix = " seed=%d scale=%d" % (seed, cell.get("scale", 10)) \
                if args.matrix == "m9" else ""
            print("%s %s r%d T=%d c=%d pool=%d %s%s%s%s" % (
                cell["cell_id"], arm, rep, cell["duration_s"],
                cell["clients"], cell["pool_size"], cell["workload"],
                " prepared" if cell["protocol"] == "prepared" else "",
                " %s" % (variant,) if variant else "",
                suffix))
        print("plan=%d out=%s" % (len(plan), args.out))
        return 0
    if not plan:
        print("nothing to do: manifest already complete at %s" % args.out)
        return 0
    os.makedirs(args.out, exist_ok=True)
    save_manifest(args.out, manifest)
    adapters = load_adapters(arms)
    records, errors = run_plan(
        plan, adapters, args.out, dbname=args.dbname, user=args.user,
        host=args.host, threads=args.threads, seed=args.seed,
        pg_version=args.pg_version, seed_fn=seed_fn)
    medians = write_medians(
        records, os.path.join(args.out, "medians.json"))
    summary = {"records": len(records), "errors": errors,
               "medians": len(medians), "out": args.out}
    with open(os.path.join(args.out, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2, sort_keys=True)
    for err in errors:
        print("ERROR: %s" % err, file=sys.stderr)
    print("wrote %d records, %d errors -> %s" % (
        len(records), len(errors), args.out))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
