"""Poolduel M12 reproducibility manifest: deterministic build-hash package.

Reads the committed ``results/m1|m2|m9/raw/*.json`` corpus plus every
derived bundle (``medians.json``, ``matrix.csv``, ``report.json``,
``sitemeta.json``, ``dossiermeta.json``, ``supplementmeta.json``) and
writes ``results/manifest.json``: the single machine-readable source for
the reproducibility page's manifest section (plan sections 11 + 12.2).

Determinism contract (plan section 11): the manifest hash is computed
over ``relpath + sha256`` lines sorted by relpath, never over directory
scan order, so two checkouts of the same commit produce byte-identical
manifest hashes. ``--verify`` recomputes the inventory and fails loudly
on any mismatch with the committed manifest (tamper detection: edited,
added, or removed raw files change the hash).

No hand-typed numbers downstream: the generator counts files, sums
bytes, and hashes content; prose (runbook, challenge flow, BibTeX,
data-availability) is static markup reviewed in git. Only the meta
fragment between ``MANIFEST:meta`` markers is generated.

Corpus policy (plan section 11): per-cell raw JSON is committed in git
(2239 files, ~6 MB, budget 500 MB); per-cell stdout/stderr workdirs ship
as CI sweep-run artifacts (too large for git, linked from the sweep run
page); the manifest records both halves so a missing half is visible.

Stdlib only. No interactive prompts; everything via flags.
"""

import argparse
import glob
import hashlib
import json
import os
import sys

RAW_LEGS = ["m1", "m2", "m9"]

DERIVED_BUNDLES = [
    "m1/medians.json",
    "m1/matrix.csv",
    "m2/medians.json",
    "m2/matrix.csv",
    "m9/medians.json",
    "m9/matrix.csv",
    "report.json",
    "sitemeta.json",
    "dossiermeta.json",
    "supplementmeta.json",
]

SWEEP_WORKFLOWS = [
    ".github/workflows/poolduel-m1.yml",
    ".github/workflows/poolduel-m2.yml",
    ".github/workflows/poolduel-m9.yml",
    ".github/workflows/pages.yml",
]

SIZE_BUDGET_BYTES = 500 * 1024 * 1024


def _sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inventory_raw(results_root, leg):
    """Sorted (relpath, sha256, size) inventory of one leg's raw corpus."""
    pattern = os.path.join(results_root, leg, "raw", "*.json")
    entries = []
    for path in sorted(glob.glob(pattern)):
        rel = "%s/raw/%s" % (leg, os.path.basename(path))
        entries.append({
            "path": rel,
            "sha256": _sha256_file(path),
            "bytes": os.path.getsize(path),
        })
    entries.sort(key=lambda e: e["path"])
    return entries


def manifest_hash(entries):
    """Deterministic build hash over sorted relpath+sha lines."""
    ordered = sorted(entries, key=lambda e: e["path"])
    digest = hashlib.sha256()
    for entry in ordered:
        digest.update(("%s %s\n" % (entry["path"],
                                    entry["sha256"])).encode("utf-8"))
    return digest.hexdigest()


def parse_workflow_pins(repo_root):
    """Record runner images + action pins from sweep workflows (read-only)."""
    pins = {}
    for workflow in SWEEP_WORKFLOWS:
        path = os.path.join(repo_root, workflow)
        try:
            with open(path) as handle:
                text = handle.read()
        except OSError:
            pins[workflow] = {"present": False}
            continue
        uses = sorted({line.strip()[len("- uses:"):].strip()
                       for line in text.splitlines()
                       if line.strip().startswith("- uses:")})
        images = sorted({line.strip()[len("runs-on:"):].strip()
                         for line in text.splitlines()
                         if line.strip().startswith("runs-on:")})
        pins[workflow] = {
            "present": True,
            "sha256": _sha256_file(path),
            "runs_on": images,
            "uses": uses,
        }
    return pins


def build_manifest(results_root, repo_root):
    """Build the manifest dict from committed corpus + bundles."""
    legs = {}
    all_entries = []
    for leg in RAW_LEGS:
        entries = inventory_raw(results_root, leg)
        legs[leg] = {
            "raw_files": len(entries),
            "raw_bytes": sum(e["bytes"] for e in entries),
            "files": entries,
        }
        all_entries.extend(entries)
    total_files = len(all_entries)
    total_bytes = sum(e["bytes"] for e in all_entries)
    bundles = {}
    for bundle in DERIVED_BUNDLES:
        path = os.path.join(results_root, bundle)
        try:
            bundles[bundle] = {
                "present": True,
                "sha256": _sha256_file(path),
                "bytes": os.path.getsize(path),
            }
        except OSError:
            bundles[bundle] = {"present": False}
    pins = parse_workflow_pins(repo_root)
    return {
        "build_hash": manifest_hash(all_entries),
        "total_raw_files": total_files,
        "total_raw_bytes": total_bytes,
        "size_budget_bytes": SIZE_BUDGET_BYTES,
        "within_budget": total_bytes <= SIZE_BUDGET_BYTES,
        "legs": legs,
        "bundles": bundles,
        "workflow_pins": pins,
        "corpus_policy": ("per-cell raw JSON committed in git; "
                          "per-cell stdout/stderr workdirs ship as CI "
                          "sweep-run artifacts linked from the sweep run"),
    }


def render_meta_fragment(meta):
    """Render the pre-rendered HTML fragment for the reproducibility page."""
    legs = meta["legs"]
    bits = ", ".join(
        "%s %d files" % (leg, legs[leg]["raw_files"]) for leg in RAW_LEGS)
    return (
        '<p class="note" id="manifest-counts" data-build-hash="%s" '
        'data-raw-files="%d" data-raw-bytes="%d">'
        'Corpus: %s (%d files, %d bytes, budget %d bytes). '
        'Deterministic build hash <code>%s</code> over sorted raw paths. '
        'Generated from <code>results/manifest.json</code>; '
        'verify with <code>sh poolduel/repro.sh --manifest-verify</code>.</p>'
        % (meta["build_hash"], meta["total_raw_files"],
           meta["total_raw_bytes"], bits, meta["total_raw_files"],
           meta["total_raw_bytes"], meta["size_budget_bytes"],
           meta["build_hash"]))


def apply_to_page(root, meta):
    """Splice the meta fragment into the reproducibility page."""
    fragment = render_meta_fragment(meta)
    path = os.path.join(root, "reproducibility", "index.html")
    with open(path) as handle:
        html = handle.read()
    begin = "<!-- MANIFEST:meta:begin -->"
    end = "<!-- MANIFEST:meta:end -->"
    if begin not in html or end not in html:
        raise ValueError("%s lacks MANIFEST:meta markers" % path)
    before, rest = html.split(begin, 1)
    _, after = rest.split(end, 1)
    new_html = before + begin + "\n" + fragment + "\n" + end + after
    changed = new_html != html
    if changed:
        with open(path, "w") as handle:
            handle.write(new_html)
    return changed


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Build results/manifest.json and splice page meta.")
    parser.add_argument("--results", default="poolduel/results")
    parser.add_argument("--repo", default=".")
    parser.add_argument("--out", default="poolduel/results/manifest.json")
    parser.add_argument("--apply", action="store_true",
                        help="splice the meta fragment into the repro page")
    parser.add_argument("--root", default="poolduel")
    parser.add_argument("--verify", action="store_true",
                        help="recompute and compare with the committed file")
    args = parser.parse_args(argv)
    try:
        meta = build_manifest(args.results, args.repo)
    except OSError as exc:
        print("manifest: corpus unreadable: %s" % exc, file=sys.stderr)
        return 1
    if args.verify:
        try:
            with open(args.out) as handle:
                committed = json.load(handle)
        except (OSError, ValueError) as exc:
            print("manifest: committed file unreadable: %s" % exc,
                  file=sys.stderr)
            return 1
        if committed.get("build_hash") != meta["build_hash"]:
            print("manifest: MISMATCH committed %s != recomputed %s"
                  % (committed.get("build_hash"), meta["build_hash"]),
                  file=sys.stderr)
            return 1
        print("manifest: verified %s (%d files)"
              % (meta["build_hash"], meta["total_raw_files"]))
        return 0
    with open(args.out, "w") as handle:
        json.dump(meta, handle, indent=2, sort_keys=True)
        handle.write("\n")
    if args.apply:
        try:
            changed = apply_to_page(args.root, meta)
        except (OSError, ValueError) as exc:
            print("manifest: apply failed: %s" % exc, file=sys.stderr)
            return 1
        print("manifest: applied (%s)"
              % ("updated" if changed else "idempotent"))
    else:
        print("manifest: wrote %s (%s, %d files)" % (
            args.out, meta["build_hash"], meta["total_raw_files"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
