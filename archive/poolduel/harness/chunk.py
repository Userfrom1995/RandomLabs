"""Chunked execution discipline (test-matrix.md section 5, normative).

The M1 sweep splits into 4 job chunks by workload pair. Every chunk carries
its own direct-PG control arm, runs under 60 minutes, and resumes via a
manifest file. Same-runner round-robin ordering, never blocked.
"""

import json
import os

from .cells import ARMS, M1_CELLS, get_cell

# Nine chunks: flagship cells split into repeat-halves so every chunk fits
# under 60 minutes wall clock (flagship full-cell would be ~90 min for
# 5 repeats x 6 arms x 3 min per arm-run). Each chunk carries its own
# direct-PG control arm. Chunk entries are (cell_id, repeat_list).
CHUNKS = {
    "a1": [("M1-1", [1, 2, 3])],
    "a2": [("M1-1", [4, 5])],
    "b1": [("M1-2", [1, 2, 3])],
    "b2": [("M1-2", [4, 5])],
    "c": [("M1-3", [1, 2, 3])],
    "d": [("M1-4", [1, 2, 3])],
    "e": [("M1-5", [1, 2, 3])],
    "f": [("M1-6", [1, 2, 3])],
    "g": [("M1-7", [1, 2, 3])],
}

CHUNK_DESCRIPTIONS = {
    "a1": "select-only flagship repeats 1-3",
    "a2": "select-only flagship repeats 4-5",
    "b1": "tpcb-like flagship repeats 1-3",
    "b2": "tpcb-like flagship repeats 4-5",
    "c": "tpcb-like prepared twin",
    "d": "select-only saturation",
    "e": "simple-update",
    "f": "select-only churn twin",
    "g": "tpcb-like heavy",
}


def chunk_cells(chunk):
    if chunk not in CHUNKS:
        raise KeyError("unknown chunk %r (want one of %s)"
                       % (chunk, sorted(CHUNKS)))
    out = []
    for (cid, reps) in CHUNKS[chunk]:
        cell = get_cell(cid)
        cell["_repeats"] = list(reps)
        out.append(cell)
    return out


def ensure_direct(arms):
    if "direct" not in arms:
        return ["direct"] + list(arms)
    return list(arms)


def round_robin_schedule(cells, arms, repeats_per_cell=None):
    """Yield (cell, arm, repeat) in round-robin order across arms.

    Per repeat index, every arm runs before the next repeat starts
    (A,B,C,A,B,C...), never blocked (AAxBBxCC). Cells cycle outer so a
    chunk with two cells alternates workloads within each arm pass.
    """
    arms = ensure_direct(arms)
    plan = []
    for cell in cells:
        reps = cell.get("_repeats")
        if reps is None:
            r = (repeats_per_cell if repeats_per_cell is not None
                 else cell.get("repeats", 3))
            reps = list(range(1, r + 1))
        for rep in reps:
            for arm in arms:
                plan.append((cell, arm, rep))
    # Interleave across arms per repeat is inherent (arm inner loop);
    # order cells outer so repeats stay grouped per cell for resume.
    return plan


def manifest_path(out_dir):
    return os.path.join(out_dir, "manifest.json")


def load_manifest(out_dir):
    path = manifest_path(out_dir)
    if not os.path.exists(path):
        return {"completed": []}
    with open(path) as f:
        data = json.load(f)
    if "completed" not in data:
        data["completed"] = []
    return data


def save_manifest(out_dir, manifest):
    os.makedirs(out_dir, exist_ok=True)
    with open(manifest_path(out_dir), "w") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)


def result_key(cell_id, arm, repeat):
    return "%s/%s/r%d" % (cell_id, arm, repeat)


def filter_completed(plan, manifest):
    done = set(manifest.get("completed", []))
    return [(c, a, r) for (c, a, r) in plan
            if result_key(c["cell_id"], a, r) not in done]


def mark_completed(out_dir, cell_id, arm, repeat):
    manifest = load_manifest(out_dir)
    key = result_key(cell_id, arm, repeat)
    if key not in manifest["completed"]:
        manifest["completed"].append(key)
    save_manifest(out_dir, manifest)


def chunk_budget_minutes(chunk):
    """Estimated measured wall clock for a chunk (all 6 arms)."""
    total = 0.0
    for cell in chunk_cells(chunk):
        n_reps = len(cell.get("_repeats") or range(cell["repeats"]))
        per_repeat = (cell["warmup_s"] + cell["duration_s"] + 30) / 60.0
        total += per_repeat * n_reps * len(ARMS)
    return total


def check_chunk_budgets(cap_minutes=60.0):
    over = {}
    for name in CHUNKS:
        mins = chunk_budget_minutes(name)
        if mins >= cap_minutes:
            over[name] = mins
    return over
