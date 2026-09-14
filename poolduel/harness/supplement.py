"""Poolduel M11d supplementary-pages generator: bundles in, shared facts out.

Reads the committed ``results/m1/medians.json`` +
``results/m2/medians.json`` + ``results/m9/medians.json`` +
``results/report.json`` and writes ``results/supplementmeta.json``: the
single machine-readable source for every generated number on the four
supplementary pages (guide, architecture, methodology, reproducibility).
``--apply`` splices the generated fragment into each page between
``SUPPLEMENT:meta:begin/end`` markers, so the pages read correctly with
JavaScript disabled and carry zero pending cells as content.

No hand-typed numbers downstream: the generator counts the bundles
(medians lists, N/A nulls, pooler_versions pins, file SHAs), never the
other way round. Prose (decision tree, taxonomy, runbook, FAQ,
glossary, BibTeX) is static markup reviewed in git; only the meta
fragment is generated.

Stdlib only. No interactive prompts; everything via flags.
"""

import argparse
import hashlib
import json
import os
import sys

SUPPLEMENT_PAGES = ["guide", "architecture", "methodology", "reproducibility"]

POOLERS = ["pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat", "supavisor"]


def _sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_json(path):
    with open(path) as handle:
        data = json.load(handle)
    if isinstance(data, dict) and isinstance(data.get("medians"), list):
        return data["medians"]
    return data


def _count(entries):
    total = len(entries)
    measured = sum(1 for e in entries
                   if isinstance(e, dict) and e.get("status") == "measured")
    na = sum(1 for e in entries if isinstance(e, dict)
             and (e.get("status") or "").startswith("N/A"))
    return total, measured, na


def build_supplementmeta(m1_entries, m2_entries, m9_entries, bundle,
                         paths):
    """Build the supplementmeta dict from committed bundles (no hand values)."""
    m1_total, m1_measured, _ = _count(m1_entries)
    m2_total, m2_measured, m2_na = _count(m2_entries)
    m9_total, m9_measured, m9_na = _count(m9_entries)
    pooler_versions = {}
    if isinstance(bundle, dict):
        pooler_versions = dict(bundle.get("pooler_versions") or {})
    pins = {p: pooler_versions.get(p) for p in POOLERS}
    sentence = ("M1: %d cells, M2: %d records incl. %d N/A, M9: %d cells "
                "(%d measured, %d N/A)" % (
                    m1_total, m2_total, m2_na, m9_total,
                    m9_measured, m9_na))
    return {
        "counts": {
            "m1_total": m1_total,
            "m1_measured": m1_measured,
            "m2_total": m2_total,
            "m2_measured": m2_measured,
            "m2_na": m2_na,
            "m9_total": m9_total,
            "m9_measured": m9_measured,
            "m9_na": m9_na,
        },
        "pooler_versions": pins,
        "sources": dict(paths),
        "banner_sentence": sentence,
    }


def render_meta_fragment(meta):
    """Render the pre-rendered HTML fragment spliced into each page."""
    counts = meta["counts"]
    pins = meta["pooler_versions"]
    pin_bits = ", ".join("%s %s" % (p, pins.get(p) or "n/a")
                         for p in POOLERS)
    return (
        '<p class="note" id="supplement-counts" '
        'data-m1-total="%d" data-m2-total="%d" data-m2-na="%d" '
        'data-m9-total="%d" data-m9-measured="%d" data-m9-na="%d">'
        'Evidence: M1 %d cells, M2 %d records incl. %d N/A, M9 %d cells '
        '(%d measured, %d N/A). Pins: %s. '
        'Generated from <code>results/supplementmeta.json</code>.</p>'
        % (counts["m1_total"], counts["m2_total"], counts["m2_na"],
           counts["m9_total"], counts["m9_measured"], counts["m9_na"],
           counts["m1_total"], counts["m2_total"], counts["m2_na"],
           counts["m9_total"], counts["m9_measured"], counts["m9_na"],
           pin_bits))


def apply_to_pages(root, meta):
    """Splice the meta fragment into all four pages. Returns changed list."""
    fragment = render_meta_fragment(meta)
    changed = []
    for page in SUPPLEMENT_PAGES:
        path = os.path.join(root, page, "index.html")
        with open(path) as handle:
            html = handle.read()
        begin = "<!-- SUPPLEMENT:meta:begin -->"
        end = "<!-- SUPPLEMENT:meta:end -->"
        if begin not in html or end not in html:
            raise ValueError("%s lacks SUPPLEMENT:meta markers" % path)
        before, rest = html.split(begin, 1)
        _, after = rest.split(end, 1)
        new_html = before + begin + "\n" + fragment + "\n" + end + after
        if new_html != html:
            with open(path, "w") as handle:
                handle.write(new_html)
            changed.append(page)
    return changed


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Build results/supplementmeta.json and splice page meta.")
    parser.add_argument("--m1", default="poolduel/results/m1/medians.json")
    parser.add_argument("--m2", default="poolduel/results/m2/medians.json")
    parser.add_argument("--m9", default="poolduel/results/m9/medians.json")
    parser.add_argument("--report", default="poolduel/results/report.json")
    parser.add_argument("--out",
                        default="poolduel/results/supplementmeta.json")
    parser.add_argument("--apply", action="store_true",
                        help="splice the meta fragment into the four pages")
    parser.add_argument("--root", default="poolduel")
    args = parser.parse_args(argv)
    try:
        m1 = _load_json(args.m1)
        m2 = _load_json(args.m2)
        m9 = _load_json(args.m9)
        with open(args.report) as handle:
            bundle = json.load(handle)
    except (OSError, ValueError) as exc:
        print("supplement: input bundle unreadable: %s" % exc, file=sys.stderr)
        return 1
    paths = {
        "m1/medians.json": _sha256_file(args.m1),
        "m2/medians.json": _sha256_file(args.m2),
        "m9/medians.json": _sha256_file(args.m9),
        "report.json": _sha256_file(args.report),
    }
    meta = build_supplementmeta(m1, m2, m9, bundle, paths)
    meta["sources"] = paths
    with open(args.out, "w") as handle:
        json.dump(meta, handle, indent=2, sort_keys=True)
        handle.write("\n")
    if args.apply:
        try:
            changed = apply_to_pages(args.root, meta)
        except (OSError, ValueError) as exc:
            print("supplement: apply failed: %s" % exc, file=sys.stderr)
            return 1
        print("supplement: applied to %s" %
              (", ".join(changed) if changed else "0 pages (idempotent)"))
    else:
        print("supplement: wrote %s (%s)" % (args.out,
                                             meta["banner_sentence"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
