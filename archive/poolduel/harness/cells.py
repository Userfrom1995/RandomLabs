"""M1 cell table as DATA (test-matrix.md section 2, normative).

Every measured cell satisfies clients >> pool_size (minimum 5x).
Cells are plain dicts; no per-pooler branches live here.
"""

ARMS = ["direct", "pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat"]

# workload: one of tpcb-like | select-only | simple-update
# protocol: simple | prepared ; churn: connect-per-transaction (-C)
M1_CELLS = [
    {
        "cell_id": "M1-1",
        "workload": "select-only",
        "clients": 100,
        "pool_size": 10,
        "protocol": "simple",
        "churn": False,
        "duration_s": 120,
        "warmup_s": 30,
        "repeats": 5,
        "flagship": True,
        "scale": 10,
    },
    {
        "cell_id": "M1-2",
        "workload": "tpcb-like",
        "clients": 50,
        "pool_size": 10,
        "protocol": "simple",
        "churn": False,
        "duration_s": 120,
        "warmup_s": 30,
        "repeats": 5,
        "flagship": True,
        "scale": 10,
    },
    {
        "cell_id": "M1-3",
        "workload": "tpcb-like",
        "clients": 50,
        "pool_size": 10,
        "protocol": "prepared",
        "churn": False,
        "duration_s": 60,
        "warmup_s": 30,
        "repeats": 3,
        "flagship": False,
        "scale": 10,
    },
    {
        "cell_id": "M1-4",
        "workload": "select-only",
        "clients": 200,
        "pool_size": 10,
        "protocol": "simple",
        "churn": False,
        "duration_s": 60,
        "warmup_s": 30,
        "repeats": 3,
        "flagship": False,
        "scale": 10,
    },
    {
        "cell_id": "M1-5",
        "workload": "simple-update",
        "clients": 100,
        "pool_size": 20,
        "protocol": "simple",
        "churn": False,
        "duration_s": 60,
        "warmup_s": 30,
        "repeats": 3,
        "flagship": False,
        "scale": 10,
    },
    {
        "cell_id": "M1-6",
        "workload": "select-only",
        "clients": 100,
        "pool_size": 10,
        "protocol": "simple",
        "churn": True,
        "duration_s": 60,
        "warmup_s": 30,
        "repeats": 3,
        "flagship": False,
        "scale": 10,
    },
    {
        "cell_id": "M1-7",
        "workload": "tpcb-like",
        "clients": 100,
        "pool_size": 10,
        "protocol": "simple",
        "churn": False,
        "duration_s": 60,
        "warmup_s": 30,
        "repeats": 3,
        "flagship": False,
        "scale": 10,
    },
]

MIN_RATIO = 5


def check_ratio(cell):
    """Reject cells that measure nothing (clients must be >= 5x pool_size)."""
    clients = int(cell["clients"])
    pool_size = int(cell["pool_size"])
    if pool_size <= 0:
        raise ValueError("pool_size must be positive")
    if clients < MIN_RATIO * pool_size:
        raise ValueError(
            "cell %s violates clients >> pool_size: clients=%d pool_size=%d "
            "ratio=%.2f < %d"
            % (cell.get("cell_id", "?"), clients, pool_size,
               clients / pool_size, MIN_RATIO)
        )
    return clients / pool_size


def get_cell(cell_id):
    for cell in M1_CELLS:
        if cell["cell_id"] == cell_id:
            return dict(cell)
    raise KeyError("unknown M1 cell %r" % (cell_id,))


def cell_ids():
    return [c["cell_id"] for c in M1_CELLS]


def validate_all_ratios():
    for cell in M1_CELLS:
        check_ratio(cell)
