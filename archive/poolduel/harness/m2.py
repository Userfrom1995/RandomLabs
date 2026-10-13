"""M2 variant table as DATA (test-matrix.md section 3, grid.md, modes.md).

M2 reuses the M1 procedure code and per-cell budgets with new axes:
session arms, statement arms (PgBouncer + provisional Odyssey, rest N/A),
I/O backends, and extra workload twins. Every entry is DATA; no per-pooler
branches live in procedure code. Adapters render the ``variant`` dict.

Budget notes (published, reviewer-verifiable via m2_budget_table()):
- Every M2 row uses standard timing (measured 60 s, 3 repeats) even on
  M1-1/M1-2 geometries, so each of the 16 M2 chunks stays under 60 min.
- Each new arm is measured on at most 2 workloads (test-matrix cap).
- N/A rows (unsupported) cost zero time and carry nulls, never zeros.
"""

from .cells import ARMS, check_ratio

# Standard M2 timing: 30 s discarded warmup, 60 s measured, 3 repeats.
M2_WARMUP_S = 30
M2_DURATION_S = 60
M2_REPEATS = 3
M2_SCALE = 10

# Geometries reuse M1 shapes (clients/pool_size/workload/protocol/churn)
# with M2 standard timing. Keys mirror the M1 cell they twin.
GEOMETRIES = {
    "G-SEL100": {"workload": "select-only", "clients": 100, "pool_size": 10,
                 "protocol": "simple", "churn": False},
    "G-TPCB50": {"workload": "tpcb-like", "clients": 50, "pool_size": 10,
                 "protocol": "simple", "churn": False},
    "G-UPD100": {"workload": "simple-update", "clients": 100, "pool_size": 20,
                 "protocol": "simple", "churn": False},
    "G-CHURN100": {"workload": "select-only", "clients": 100, "pool_size": 10,
                   "protocol": "simple", "churn": True},
    "G-PREP50": {"workload": "tpcb-like", "clients": 50, "pool_size": 10,
                 "protocol": "prepared", "churn": False},
}

# Measured M2 rows: (cell_id, geometry, arm, variant).
# Variant keys are adapter knobs from grid.md; empty dict = M1 baseline.
# Direct arms ignore variants (control).
M2_ROWS = [
    # -- Session block (M2-S): M1-1 / M1-2 geometries --
    ("M2-S1", "G-SEL100", "pgagroal", {"pipeline": "session"}),
    ("M2-S2", "G-TPCB50", "pgagroal", {"pipeline": "session"}),
    ("M2-S3", "G-SEL100", "pgagroal", {"pipeline": "performance"}),
    ("M2-S4", "G-TPCB50", "pgagroal", {"pipeline": "performance"}),
    ("M2-S5", "G-SEL100", "pgbouncer", {"pool_mode": "session"}),
    ("M2-S6", "G-TPCB50", "pgbouncer", {"pool_mode": "session"}),
    ("M2-S7", "G-SEL100", "odyssey", {"pool": "session", "workers": 1}),
    ("M2-S8", "G-TPCB50", "odyssey", {"pool": "session", "workers": 1}),
    ("M2-S9", "G-SEL100", "pgcat", {"pool_mode": "session"}),
    ("M2-S10", "G-TPCB50", "pgcat", {"pool_mode": "session"}),
    ("M2-S11", "G-SEL100", "pgpool", {}),
    ("M2-S12", "G-TPCB50", "pgpool", {}),
    # Session x I/O cross (grid.md M2 axes applied to session arms):
    ("M2-S13", "G-SEL100", "pgcat",
     {"pool_mode": "session", "worker_threads": 1}),
    ("M2-S14", "G-TPCB50", "pgcat",
     {"pool_mode": "session", "worker_threads": 1}),
    ("M2-S15", "G-SEL100", "pgbouncer",
     {"pool_mode": "session", "instances": 2}),
    ("M2-S16", "G-TPCB50", "pgbouncer",
     {"pool_mode": "session", "instances": 2}),
    # -- Statement block (M2-T): PgBouncer + provisional Odyssey --
    ("M2-T1", "G-SEL100", "pgbouncer", {"pool_mode": "statement"}),
    ("M2-T2", "G-TPCB50", "pgbouncer", {"pool_mode": "statement"}),
    ("M2-T3", "G-SEL100", "odyssey",
     {"pool": "statement", "workers": 1, "provisional": True}),
    ("M2-T4", "G-TPCB50", "odyssey",
     {"pool": "statement", "workers": 1, "provisional": True}),
    # -- I/O block (M2-I) --
    ("M2-I1", "G-SEL100", "pgagroal",
     {"pipeline": "transaction", "ev_backend": "io_uring"}),
    ("M2-I2", "G-TPCB50", "pgagroal",
     {"pipeline": "transaction", "ev_backend": "io_uring"}),
    ("M2-I3", "G-SEL100", "pgagroal",
     {"pipeline": "transaction", "ev_backend": "epoll"}),
    ("M2-I4", "G-TPCB50", "pgagroal",
     {"pipeline": "transaction", "ev_backend": "epoll"}),
    ("M2-I5", "G-SEL100", "pgbouncer",
     {"pool_mode": "transaction", "instances": 2}),
    ("M2-I6", "G-TPCB50", "pgbouncer",
     {"pool_mode": "transaction", "instances": 2}),
    ("M2-I7", "G-SEL100", "odyssey",
     {"pool": "transaction", "workers": 2}),
    ("M2-I8", "G-TPCB50", "odyssey",
     {"pool": "transaction", "workers": 2}),
    ("M2-I9", "G-SEL100", "odyssey",
     {"pool": "transaction", "workers": 4}),
    ("M2-I10", "G-TPCB50", "odyssey",
     {"pool": "transaction", "workers": 4}),
    ("M2-I11", "G-SEL100", "pgcat",
     {"pool_mode": "transaction", "worker_threads": 1}),
    ("M2-I12", "G-TPCB50", "pgcat",
     {"pool_mode": "transaction", "worker_threads": 1}),
    ("M2-I13", "G-SEL100", "pgpool",
     {"num_init_children": 100, "max_pool": 1}),
    ("M2-I14", "G-TPCB50", "pgpool",
     {"num_init_children": 100, "max_pool": 1}),
    ("M2-I15", "G-SEL100", "pgpool",
     {"num_init_children": 200, "max_pool": 1}),
    ("M2-I16", "G-TPCB50", "pgpool",
     {"num_init_children": 200, "max_pool": 1}),
    # -- Workload twins (M2-W): simple-update + churn for session arms --
    ("M2-W1", "G-UPD100", "pgagroal", {"pipeline": "session"}),
    ("M2-W2", "G-UPD100", "pgbouncer", {"pool_mode": "session"}),
    ("M2-W3", "G-UPD100", "odyssey", {"pool": "session", "workers": 1}),
    ("M2-W4", "G-UPD100", "pgcat", {"pool_mode": "session"}),
    ("M2-W5", "G-UPD100", "pgpool", {}),
    ("M2-W6", "G-CHURN100", "pgagroal", {"pipeline": "session"}),
    ("M2-W7", "G-CHURN100", "pgbouncer", {"pool_mode": "session"}),
    ("M2-W8", "G-CHURN100", "odyssey", {"pool": "session", "workers": 1}),
    ("M2-W9", "G-CHURN100", "pgcat", {"pool_mode": "session"}),
    ("M2-W10", "G-CHURN100", "pgpool", {}),
    # -- Prepared twins (M2-P) for arms claiming prepare support --
    ("M2-P1", "G-PREP50", "pgagroal", {"pipeline": "session"}),
    ("M2-P2", "G-PREP50", "pgbouncer", {"pool_mode": "session"}),
    ("M2-P3", "G-PREP50", "pgbouncer", {"pool_mode": "statement"}),
    ("M2-P4", "G-PREP50", "odyssey",
     {"pool": "statement", "workers": 1, "provisional": True,
      "pool_reserve_prepared_statement": True}),
    ("M2-P5", "G-PREP50", "pgcat", {"pool_mode": "session"}),
    ("M2-P6", "G-PREP50", "pgpool", {}),
]

# N/A rows (unsupported, zero time, nulls): (cell_id, geometry, arm, reason).
# pgagroal/pgcat have no statement mode; pgpool-II has session-class only;
# Odyssey session pooling is incompatible with prepared-statement reservation
# (modes.md section 4), so its session prepared twin is N/A while the
# provisional statement prepared twin is measured empirically.
# Records are keyed by (cell_id, pooler); N/A rows reuse the measured twin's
# cell_id with their own pooler.
M2_NA_ROWS = [
    ("M2-T1", "G-SEL100", "pgagroal", "no statement mode"),
    ("M2-T2", "G-TPCB50", "pgagroal", "no statement mode"),
    ("M2-T1", "G-SEL100", "pgcat", "statement unsupported"),
    ("M2-T2", "G-TPCB50", "pgcat", "statement unsupported"),
    ("M2-T1", "G-SEL100", "pgpool", "session-class only"),
    ("M2-T2", "G-TPCB50", "pgpool", "session-class only"),
    ("M2-P6", "G-PREP50", "odyssey",
     "session prepared: reservation incompatible with session pooling"),
]

# Sixteen M2 chunks, each with its own direct control, each under 60 min.
# Cost model (same +30 s setup allowance as M1 chunk.py): each measured row
# runs its own arm plus the direct control, 3 repeats x 2 min per arm-run
# = 12 min per row. Chunks hold at most 4 rows (48 min). Session and
# flagship-style groups split into halves, following the M1 a1/a2 precedent.
# Entries are M2 cell_ids; direct controls are injected by the scheduler.
M2_CHUNKS = {
    "m2a1": ["M2-S1", "M2-S3", "M2-S5", "M2-S13"],
    "m2a2": ["M2-S7", "M2-S9", "M2-S11", "M2-S15"],
    "m2b1": ["M2-S2", "M2-S4", "M2-S6", "M2-S14"],
    "m2b2": ["M2-S8", "M2-S10", "M2-S12", "M2-S16"],
    "m2c": ["M2-T1", "M2-T2", "M2-T3", "M2-T4"],
    "m2d1": ["M2-I1", "M2-I2", "M2-I3", "M2-I4"],
    "m2d2": ["M2-I5", "M2-I6"],
    "m2e": ["M2-I7", "M2-I8", "M2-I9", "M2-I10"],
    "m2f1": ["M2-I11", "M2-I12"],
    "m2f2": ["M2-I13", "M2-I14", "M2-I15", "M2-I16"],
    "m2g1": ["M2-W1", "M2-W2", "M2-W3"],
    "m2g2": ["M2-W4", "M2-W5"],
    "m2h1": ["M2-W6", "M2-W7", "M2-W8"],
    "m2h2": ["M2-W9", "M2-W10"],
    "m2i1": ["M2-P1", "M2-P2", "M2-P3"],
    "m2i2": ["M2-P4", "M2-P5", "M2-P6"],
}

M2_CHUNK_DESCRIPTIONS = {
    "m2a1": "session arms (pgagroal x2, pgbouncer) + pgcat session wt1, select",
    "m2a2": "session arms (odyssey, pgcat, pgpool) + pgbouncer 2-inst, select",
    "m2b1": "session arms (pgagroal x2, pgbouncer) + pgcat session wt1, tpcb",
    "m2b2": "session arms (odyssey, pgcat, pgpool) + pgbouncer 2-inst, tpcb",
    "m2c": "statement arms (PgBouncer + provisional Odyssey)",
    "m2d1": "I/O: pgagroal io_uring vs epoll",
    "m2d2": "I/O: PgBouncer 2-instance so_reuseport",
    "m2e": "I/O: Odyssey workers 2 and 4",
    "m2f1": "I/O: pgcat worker_threads = 1",
    "m2f2": "I/O: pgpool children sweep (100x1, 200x1)",
    "m2g1": "simple-update twins (pgagroal session, pgbouncer, odyssey)",
    "m2g2": "simple-update twins (pgcat session, pgpool)",
    "m2h1": "churn twins (pgagroal session, pgbouncer, odyssey)",
    "m2h2": "churn twins (pgcat session, pgpool)",
    "m2i1": "prepared twins (pgagroal/pgbouncer session, pgbouncer stmt)",
    "m2i2": "prepared twins (odyssey stmt prov, pgcat session, pgpool)",
}


def m2_cell(cell_id):
    """Expand an M2 cell_id into a runner-ready cell dict (with variant)."""
    for (cid, geom, arm, variant) in M2_ROWS:
        if cid == cell_id:
            g = GEOMETRIES[geom]
            cell = {
                "cell_id": cid,
                "workload": g["workload"],
                "clients": g["clients"],
                "pool_size": g["pool_size"],
                "protocol": g["protocol"],
                "churn": g["churn"],
                "duration_s": M2_DURATION_S,
                "warmup_s": M2_WARMUP_S,
                "repeats": M2_REPEATS,
                "flagship": False,
                "scale": M2_SCALE,
                "geometry": geom,
                "arm": arm,
                "variant": dict(variant),
            }
            check_ratio(cell)
            return cell
    raise KeyError("unknown M2 cell %r" % (cell_id,))


def m2_cell_ids():
    return [cid for (cid, _, _, _) in M2_ROWS]


def m2_chunk_cells(chunk):
    if chunk not in M2_CHUNKS:
        raise KeyError("unknown M2 chunk %r (want one of %s)"
                       % (chunk, sorted(M2_CHUNKS)))
    return [m2_cell(cid) for cid in M2_CHUNKS[chunk]]


def m2_chunk_arms(chunk):
    """Arms for a chunk: measured arms plus the direct control."""
    arms = []
    for (cid, _, arm, _) in M2_ROWS:
        if cid in M2_CHUNKS[chunk] and arm not in arms:
            arms.append(arm)
    if "direct" not in arms:
        arms = ["direct"] + arms
    return arms


def m2_chunk_budget_minutes(chunk):
    """Estimated measured wall clock for an M2 chunk.

    Each measured row runs its own arm plus the direct control
    (same-runner discipline), so cost is per-row (arm + direct).
    """
    total = 0.0
    for cell in m2_chunk_cells(chunk):
        per_repeat = (cell["warmup_s"] + cell["duration_s"] + 30) / 60.0
        total += per_repeat * cell["repeats"] * 2  # row arm + direct
    return total


def check_m2_chunk_budgets(cap_minutes=60.0):
    over = {}
    for name in M2_CHUNKS:
        mins = m2_chunk_budget_minutes(name)
        if mins >= cap_minutes:
            over[name] = mins
    return over


def validate_m2_ratios():
    for (cid, _, _, _) in M2_ROWS:
        m2_cell(cid)


def m2_budget_table():
    """Published realized cell counts per pooler (measured rows only).

    Parity reading (test-matrix.md section 5, grid.md section 6): same
    procedure code, same per-row repeats and caps, at most 2 workloads per
    new arm, N/A (not zero) for unsupported modes. Residual spread across
    poolers is structural (pgpool-II has a single mode, pgcat has no
    statement mode) and published here; it favors no arm because every
    measured and N/A row is committed.
    """
    counts = {arm: 0 for arm in ARMS}
    for (_, _, arm, _) in M2_ROWS:
        counts[arm] = counts.get(arm, 0) + 1
    return counts


def m2_direct_geometries():
    """Geometries where the direct control is measured (every M2 geometry)."""
    return sorted({m2_cell(cid)["geometry"] for cid in m2_cell_ids()})
