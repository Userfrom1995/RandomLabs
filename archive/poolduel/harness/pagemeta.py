"""Poolduel M5 page-metadata generator: medians in, page facts out.

Reads the committed ``results/m1/medians.json`` +
``results/m2/medians.json`` and writes ``results/pagemeta.json``: the
single machine-readable source for every count, peak, and scope string
that appears in page prose (banner sentences, matrix intros, chart
subtitles). Pages render these values from this file (progressive
enhancement over the committed static fallback); the drift test
(``tests/test_pagemeta_drift.py``) fails when page text disagrees with
this file or this file disagrees with the medians.

No hand-typed counts anywhere downstream: the generator counts the
medians, never the other way round.

Scope strings (warmup, dataset scale, PG build) are emitted here as
constants with their provenance citations so every page shares one
spelling; measurement facts (counts, peaks, holders) are computed from
the medians.

Stdlib only. No interactive prompts; everything via flags.
"""

import argparse
import hashlib
import json
import os
import sys

# Measurement-context scope strings: one spelling shared by every page.
# Provenance: test-matrix.md section 5 + methodology.md (warmup, scale),
# versions.md (PG build). M6-M8 may revise these constants with citations;
# pages never carry their own copies.
SCOPE = {
    "warmup": "30 s warmup discarded",
    "warmup_provenance": "docs/test-matrix.md section 5 (M8 sensitivity curve pending)",
    "scale": "scale -s 10",
    "pg_build": "PostgreSQL 17 (PGDG)",
    "pg_provenance": "docs/versions.md",
}

MEASURED = "measured"
TIMEOUT = "timeout/inconclusive"
NA = "N/A (unsupported)"


def _sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _summarize(entries, label):
    if not isinstance(entries, list) or not entries:
        raise ValueError("%s has no median entries" % label)
    total = len(entries)
    by_status = {}
    for entry in entries:
        by_status[entry.get("status", "?")] = \
            by_status.get(entry.get("status", "?"), 0) + 1
    cells = sorted({e["cell_id"] for e in entries if "cell_id" in e})

    def _tps_median(entry):
        tps = entry.get("tps")
        if isinstance(tps, dict):
            tps = tps.get("median")
        return tps if isinstance(tps, (int, float)) else None

    measured = [(e, _tps_median(e)) for e in entries
                if e.get("status") == MEASURED]
    measured = [(e, t) for e, t in measured if t is not None]
    peak = None
    if measured:
        best, best_tps = max(measured, key=lambda pair: pair[1])
        peak = {"tps": best_tps, "pooler": best.get("pooler"),
                "cell_id": best.get("cell_id")}
    return {
        "total": total,
        "measured": by_status.get(MEASURED, 0),
        "timeout": by_status.get(TIMEOUT, 0),
        "na": by_status.get(NA, 0),
        "statuses": dict(sorted(by_status.items())),
        "distinct_cells": len(cells),
        "cells": cells,
        "peak": peak,
    }


def build_pagemeta(m1_entries, m2_entries):
    """Compute the page-facts dict from median entry lists."""
    m1 = _summarize(m1_entries, "m1")
    m2 = _summarize(m2_entries, "m2")
    banner = ("M1: %d cells, M2: %d records incl. %d N/A with nulls"
              % (m1["total"], m2["total"], m2["na"]))
    return {
        "scope": dict(SCOPE),
        "m1": m1,
        "m2": m2,
        "banner_sentence": banner,
    }


def build_parser():
    p = argparse.ArgumentParser(description="emit results/pagemeta.json")
    p.add_argument("--m1", default="poolduel/results/m1/medians.json")
    p.add_argument("--m2", default="poolduel/results/m2/medians.json")
    p.add_argument("--out", default="poolduel/results/pagemeta.json")
    return p


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    missing = [p for p in (args.m1, args.m2) if not os.path.isfile(p)]
    if missing:
        for path in missing:
            print("poolduel pagemeta FAILED: missing input %s "
                  "(run repro.sh --report first; not inventing numbers)"
                  % path, file=sys.stderr)
        return 1
    try:
        with open(args.m1) as f:
            m1_entries = json.load(f)
        with open(args.m2) as f:
            m2_entries = json.load(f)
    except (ValueError, OSError) as exc:
        print("poolduel pagemeta FAILED: unreadable input (%s)" % exc,
              file=sys.stderr)
        return 1
    try:
        meta = build_pagemeta(m1_entries, m2_entries)
    except ValueError as exc:
        print("poolduel pagemeta FAILED: %s" % exc, file=sys.stderr)
        return 1
    meta["sources"] = {
        "m1/medians.json": _sha256_file(args.m1),
        "m2/medians.json": _sha256_file(args.m2),
    }
    outdir = os.path.dirname(args.out) or "."
    os.makedirs(outdir, exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(meta, f, indent=2, sort_keys=True)
        f.write("\n")
    print("poolduel pagemeta: %s" % args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
