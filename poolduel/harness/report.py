"""M3 publication report engine: raw records -> medians -> comparisons.

Reads the raw per-repeat cell JSON committed by the M1/M2 sweeps
(validated by ``schema.validate_cell``), aggregates medians with bands,
and derives every comparison the Pages report publishes:

- best-vs-best per cell (ranked tps medians, pairwise binding-gate
  verdicts from ``stats.compare_pair``),
- iso-region slices on the shared axes
  (workload, clients, backends, duration, protocol, churn),
- surface flatness per pooler (fast everywhere vs one magic setting),
- full-matrix CSV plus a single report bundle for ``index.html``.

Unsupported cells stay ``N/A (unsupported)`` with nulls, never zeros,
never interpolated. Over-cap cells stay ``timeout/inconclusive``.
With no sweep data on disk the CLI fails loudly instead of inventing
numbers; the report page stays honestly pending by design.

Stdlib only. No interactive prompts; everything via flags.
"""

import argparse
import csv
import glob
import io
import json
import os
import sys

from .schema import POOLER_VERSIONS, validate_cell
from .stats import compare_pair, summarize

# Flatness verdict threshold: a pooler whose tps medians spread more than
# this fraction of its own peak across its measured configs is "peaky"
# (fast at one magic setting); at or below it is "flat".
FLATNESS_SPREAD_FRACTION = 0.15

METRIC_KEYS = ("tps", "latency_avg_ms", "p50_ms", "p90_ms",
               "p99_ms", "p999_ms")

# Context copied from raw records into each median entry so iso-region
# grouping and flatness math need no sidecar lookup.
CONTEXT_KEYS = ("workload", "clients", "pool_size", "protocol",
                "churn", "duration_s", "scale")

SKIP_BASENAMES = ("manifest.json", "summary.json", "medians.json",
                  "report.json", "comparisons.json")


def load_raw(raw_dirs):
    """Load raw record dicts from one or more results/raw directories.

    Returns (records, errors). Files that fail to parse or fail schema
    validation are reported in errors, never silently dropped.
    """
    records, errors = [], []
    for raw_dir in raw_dirs:
        paths = sorted(glob.glob(os.path.join(raw_dir, "*.json")))
        if not paths:
            errors.append("no JSON files in %s" % raw_dir)
            continue
        for path in paths:
            base = os.path.basename(path)
            if base in SKIP_BASENAMES:
                continue
            try:
                with open(path) as f:
                    rec = json.load(f)
            except (ValueError, OSError) as exc:
                errors.append("%s: unreadable (%s)" % (path, exc))
                continue
            if not isinstance(rec, dict) or "cell_id" not in rec:
                continue  # sidecar file, not a cell record
            errs = validate_cell(rec)
            if errs:
                errors.append("%s schema: %s" % (path, "; ".join(errs)))
                continue
            rec["_source"] = path
            records.append(rec)
    return records, errors


def aggregate(records):
    """Group raw repeat records into median entries with bands and CV.

    Output entries carry the same ``cell_id``/``pooler``/metric-summary
    shape as ``runner.write_medians`` plus the measurement context
    (workload, clients, pool_size, protocol, churn, duration_s, scale)
    taken from the first record of each group. Groups whose repeats
    disagree on context are still aggregated; the disagreement is
    recorded in ``context_mixed: true`` instead of failing the report.
    """
    grouped = {}
    for rec in records:
        grouped.setdefault((rec["cell_id"], rec["pooler"]), []).append(rec)
    medians = []
    for (cell_id, pooler), rows in sorted(grouped.items()):
        rows = sorted(rows, key=lambda r: r["repeat"])
        entry = {"cell_id": cell_id, "pooler": pooler,
                 "n": len(rows), "status": rows[0]["status"]}
        for key in CONTEXT_KEYS:
            entry[key] = rows[0].get(key)
        entry["context_mixed"] = any(
            r.get(key) != rows[0].get(key)
            for r in rows for key in CONTEXT_KEYS)
        statuses = {r["status"] for r in rows}
        if len(statuses) > 1:
            entry["status"] = "timeout/inconclusive"
            for metric in METRIC_KEYS:
                entry[metric] = summarize([])
        else:
            for metric in METRIC_KEYS:
                entry[metric] = summarize(
                    [r[metric] for r in rows if r[metric] is not None])
        quarantine_p_latency(entry)
        medians.append(entry)
    return medians


# Quarantine rule for the M4 aggregate-log contamination (proven 2026-09-13
# on local pgbench 16.15/17.11): runs logged with --aggregate-interval
# wrote aggregate SUM lines that the old parser read as latencies, so every
# committed p50/p90/p99/p999 from those runs is off by orders of magnitude
# (e.g. direct M1-1 lat_avg 3.9ms with p50 249895ms) or exactly 0.0. A
# measured median whose p50 is exactly 0 or more than 100x its own
# latency_avg is quarantined (p-summaries nulled, flag set) so the binding
# gate falls back to its documented tps-only verdict instead of ruling on
# garbage. Raw records are untouched: the evidence stays, the derived
# medians say what they can honestly say. Fresh sweeps (no aggregate
# interval, multi-worker per-txn logs) fill real percentiles.
P_QUARANTINE_RATIO = 100.0


def quarantine_p_latency(entry):
    """Null proven-invalid p-latency summaries in place. Returns True if so."""
    if entry.get("status") != "measured":
        entry["p_quarantined"] = False
        return False
    lat = (entry.get("latency_avg_ms") or {}).get("median")
    p50 = (entry.get("p50_ms") or {}).get("median")
    if lat is None or p50 is None:
        entry["p_quarantined"] = False
        return False
    if (p50 == 0 and (entry.get("p50_ms") or {}).get("n", 0) > 0) or \
            (lat > 0 and p50 > P_QUARANTINE_RATIO * lat):
        for metric in ("p50_ms", "p90_ms", "p99_ms", "p999_ms"):
            entry[metric] = summarize([])
        entry["p_quarantined"] = True
        return True
    entry["p_quarantined"] = False
    return False


def measured_entries(medians):
    return [e for e in medians if e["status"] == "measured"]


def na_entries(medians):
    return [e for e in medians if e["status"] != "measured"]


def per_cell_best(medians):
    """Best-vs-best per cell: ranked arms plus verdict against the best.

    The head arm is the highest tps median; every other measured arm
    carries the binding-gate verdict (``stats.compare_pair``) of
    best-vs-arm, so a higher median with overlapping bands honestly
    reads ``inconclusive``. N/A and timeout arms are listed, never
    ranked, never zero-filled.
    """
    best = {}
    cells = sorted({e["cell_id"] for e in medians})
    for cell_id in cells:
        rows = [e for e in medians if e["cell_id"] == cell_id]
        measured = sorted(
            [e for e in rows if e["status"] == "measured"],
            key=lambda e: (e["tps"]["median"] is None,
                           -(e["tps"]["median"] or 0.0)))
        na = sorted(
            [{"pooler": e["pooler"], "status": e["status"]}
             for e in rows if e["status"] != "measured"],
            key=lambda d: d["pooler"])
        ranked = []
        head = measured[0] if measured else None
        for entry in measured:
            if head is entry:
                verdict = "best"
            else:
                verdict = compare_pair(
                    head["tps"], entry["tps"], head["p99_ms"],
                    entry["p99_ms"])
                verdict = ("best-vs-%s: %s"
                           % (entry["pooler"], verdict))
            ranked.append({
                "pooler": entry["pooler"],
                "tps": entry["tps"],
                "p99_ms": entry["p99_ms"],
                "p999_ms": entry["p999_ms"],
                "n": entry["n"],
                "verdict": verdict,
            })
        best[cell_id] = {"ranked": ranked, "na": na}
    return best


def pairwise(medians):
    """Every pairwise binding-gate verdict per cell (tps + p99 agreement)."""
    out = {}
    cells = sorted({e["cell_id"] for e in medians})
    for cell_id in cells:
        measured = [e for e in medians
                    if e["cell_id"] == cell_id
                    and e["status"] == "measured"]
        pairs = []
        for i in range(len(measured)):
            for j in range(i + 1, len(measured)):
                a, b = measured[i], measured[j]
                verdict = compare_pair(
                    a["tps"], b["tps"], a["p99_ms"], b["p99_ms"])
                pairs.append({"a": a["pooler"], "b": b["pooler"],
                              "verdict": verdict})
        out[cell_id] = pairs
    return out


def iso_key(entry):
    return (entry.get("workload"), entry.get("clients"),
            entry.get("pool_size"), entry.get("duration_s"),
            entry.get("protocol"), entry.get("churn"))


def iso_regions(medians):
    """Group median entries on the shared iso-region axes.

    Slices with two or more distinct cell_ids let readers compare
    pooler configs at exactly matched clients, backends, duration,
    protocol, and churn (for example M1-1 beside M2 session rows on
    the G-SEL100 geometry). Single-cell groups are still emitted so
    no measured cell is hidden.
    """
    groups = {}
    for entry in measured_entries(medians):
        groups.setdefault(iso_key(entry), []).append(entry)
    regions = []
    for key in sorted(groups, key=lambda k: [str(v) for v in k]):
        rows = sorted(groups[key],
                      key=lambda e: (e["cell_id"], e["pooler"]))
        cells = sorted({r["cell_id"] for r in rows})
        regions.append({
            "workload": key[0], "clients": key[1],
            "pool_size": key[2], "duration_s": key[3],
            "protocol": key[4], "churn": key[5],
            "matched_cells": cells,
            "matched": len(cells) > 1,
            "rows": [{"cell_id": r["cell_id"], "pooler": r["pooler"],
                      "tps": r["tps"], "p99_ms": r["p99_ms"],
                      "p999_ms": r["p999_ms"], "n": r["n"]}
                     for r in rows],
        })
    return regions


def flatness(medians):
    """Surface-flatness per pooler: fast everywhere vs one magic setting.

    Spread is (peak - trough) / peak over the pooler's own measured tps
    medians. At or below FLATNESS_SPREAD_FRACTION the surface reads
    "flat"; above it reads "peaky". Poolers with fewer than two
    measured configs read "single-point" (never a verdict on one cell).
    Peak/trough carry their workload so charts never compare mixed
    workloads silently.
    """
    out = {}
    poolers = sorted({e["pooler"] for e in medians})
    for pooler in poolers:
        peaks = [(e["cell_id"], e["tps"]["median"], e.get("workload"))
                 for e in measured_entries(medians)
                 if e["pooler"] == pooler
                 and e["tps"]["median"] is not None]
        if len(peaks) < 2:
            out[pooler] = {"configs_measured": len(peaks),
                           "spread": None, "verdict": "single-point",
                           "peak": None, "trough": None}
            continue
        by_med = sorted(peaks, key=lambda p: p[1])
        trough, peak = by_med[0], by_med[-1]
        spread = (peak[1] - trough[1]) / peak[1] if peak[1] else None
        verdict = ("inconclusive" if spread is None
                   else "flat" if spread <= FLATNESS_SPREAD_FRACTION
                   else "peaky")
        out[pooler] = {
            "configs_measured": len(peaks),
            "spread": spread,
            "verdict": verdict,
            "peak": {"cell_id": peak[0], "tps_median": peak[1],
                     "workload": peak[2]},
            "trough": {"cell_id": trough[0], "tps_median": trough[1],
                       "workload": trough[2]},
        }
    return out


def matrix_csv(medians):
    """Full-matrix CSV: every measured and N/A cell, never hidden."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "cell_id", "pooler", "workload", "clients", "pool_size",
        "protocol", "churn", "duration_s", "n", "status",
        "tps_median", "tps_min", "tps_max", "tps_cv",
        "p50_ms", "p90_ms", "p99_ms", "p999_ms",
    ])

    def num(summary, field="median"):
        value = summary.get(field) if summary else None
        return "" if value is None else value

    for entry in sorted(medians,
                        key=lambda e: (e["cell_id"], e["pooler"])):
        tps = entry.get("tps") or {}
        writer.writerow([
            entry["cell_id"], entry["pooler"], entry.get("workload", ""),
            entry.get("clients", ""), entry.get("pool_size", ""),
            entry.get("protocol", ""), entry.get("churn", ""),
            entry.get("duration_s", ""), entry.get("n", ""),
            entry.get("status", ""),
            num(tps), num(tps, "min"), num(tps, "max"), num(tps, "cv"),
            num(entry.get("p50_ms")), num(entry.get("p90_ms")),
            num(entry.get("p99_ms")), num(entry.get("p999_ms")),
        ])
    return buf.getvalue()


def build_bundle(m1_medians, m2_medians, pg_version="PG 17"):
    """Single report bundle consumed by index.html live hooks."""
    medians = list(m1_medians) + list(m2_medians)
    return {
        "pg_version": pg_version,
        "pooler_versions": dict(POOLER_VERSIONS),
        "m1_cells": sorted({e["cell_id"] for e in m1_medians}),
        "m2_cells": sorted({e["cell_id"] for e in m2_medians}),
        "measured": len(measured_entries(medians)),
        "na": len(na_entries(medians)),
        "best": per_cell_best(medians),
        "pairwise": pairwise(medians),
        "iso_regions": iso_regions(medians),
        "flatness": flatness(medians),
    }


def write_outputs(m1_medians, m2_medians, out_dir, pg_version="PG 17"):
    """Write medians.json + matrix.csv per matrix plus report.json."""
    os.makedirs(os.path.join(out_dir, "m1"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "m2"), exist_ok=True)
    for name, med in (("m1", m1_medians), ("m2", m2_medians)):
        with open(os.path.join(out_dir, name, "medians.json"), "w") as f:
            json.dump(med, f, indent=2, sort_keys=True)
        with open(os.path.join(out_dir, name, "matrix.csv"), "w") as f:
            f.write(matrix_csv(med))
    bundle = build_bundle(m1_medians, m2_medians, pg_version=pg_version)
    with open(os.path.join(out_dir, "report.json"), "w") as f:
        json.dump(bundle, f, indent=2, sort_keys=True)
    return bundle


def build_parser():
    p = argparse.ArgumentParser(
        description="Poolduel M3 report builder: raw JSON -> medians, "
                    "CSV, and the Pages report bundle.")
    p.add_argument("--m1-dir", action="append", default=[],
                   help="M1 results dir (contains raw/); repeatable")
    p.add_argument("--m2-dir", action="append", default=[],
                   help="M2 results dir (contains raw/); repeatable")
    p.add_argument("--out", default="poolduel/results",
                   help="output dir for m1/, m2/, report.json")
    p.add_argument("--pg-version", default="PG 17")
    return p


def _raw_subdirs(dirs):
    subs = []
    for d in dirs:
        raw = os.path.join(d, "raw")
        subs.append(raw if os.path.isdir(raw) else d)
    return subs


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.m1_dir and not args.m2_dir:
        parser.error("need at least one of --m1-dir / --m2-dir")
    errors = []
    m1_medians, m2_medians = [], []
    for label, dirs in (("m1", args.m1_dir), ("m2", args.m2_dir)):
        if not dirs:
            continue
        records, load_errors = load_raw(_raw_subdirs(dirs))
        errors.extend(("%s: %s" % (label, e)) for e in load_errors)
        if not records:
            errors.append("%s: no valid cell records under %s"
                          % (label, dirs))
            continue
        if label == "m1":
            m1_medians = aggregate(records)
        else:
            m2_medians = aggregate(records)
    if errors:
        for err in errors:
            print("poolduel report FAILED: %s" % err, file=sys.stderr)
        return 1
    bundle = write_outputs(m1_medians, m2_medians, args.out,
                           pg_version=args.pg_version)
    print("poolduel report: %d m1 + %d m2 median entries "
          "(%d measured, %d N/A/timeout) -> %s"
          % (len(m1_medians), len(m2_medians),
             bundle["measured"], bundle["na"], args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
