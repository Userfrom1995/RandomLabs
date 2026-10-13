"""Tester regression suite for PR #353 soak 36-group sync (issue #302).

Guards the 36-group truth across every derived bundle rebuilt from
committed data: matrix.csv (36 rows: 29 measured + 7 timeout), raw/
(162 files over 36 tier-groups), report/supplement/sitemeta agreement,
manifest raw total 2401 = 150+319+1770+162, dossier source SHAs fresh,
and comparison.json showing zero "tier not in git" absents.

The absent set is EMPTY against the 36-group geometry
(3 cells x 6 poolers x 2 tiers): the formerly absent pair
(M10-S3, 3600, odyssey) and (M10-S3, 3600, pgcat) has landed, so the
tripwire asserts absent == empty and present == full spec, failing
loudly if any group ever goes missing again. Each test fails on stale
36-group bundles and passes on the synced 36-group bundles; nothing
here is tautological. Authored by the Tester.
"""

import csv
import hashlib
import json
import os
import re
import unittest

RESULTS = os.path.join("poolduel", "results")
SOAK = os.path.join(RESULTS, "m10-soak")

CELLS = ["M10-S1", "M10-S2", "M10-S3"]
POOLERS = ["direct", "pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat"]
TIERS = ["1800", "3600"]
# Historical note: before the re-dispatch landed, the absent set was
# exactly {("M10-S3", "3600", "odyssey"), ("M10-S3", "3600", "pgcat")}.
# That pair is now committed, so the tripwire below asserts EMPTY.


def _load_matrix():
    with open(os.path.join(SOAK, "matrix.csv")) as fh:
        return list(csv.DictReader(fh))


class TestSoak36GroupTruth(unittest.TestCase):
    """Matrix shape: 36 rows, 29 measured, 7 timeout, both tiers."""

    def test_matrix_row_counts(self):
        rows = _load_matrix()
        self.assertEqual(len(rows), 36)
        measured = [r for r in rows if r["status"] == "measured"]
        timeout = [r for r in rows if r["status"] != "measured"]
        self.assertEqual(len(measured), 29)
        self.assertEqual(len(timeout), 7)

    def test_matrix_covers_both_tiers(self):
        rows = _load_matrix()
        self.assertEqual(sorted(set(r["duration_s"] for r in rows)),
                         ["1800", "3600"])

    def test_absent_set_is_empty_tripwire(self):
        rows = _load_matrix()
        present = set((r["cell_id"], r["duration_s"], r["pooler"])
                      for r in rows)
        full = set((c, t, p) for c in CELLS for t in TIERS for p in POOLERS)
        self.assertEqual(full - present, set())
        self.assertEqual(present, full)

    def test_measured_rows_carry_finite_tps(self):
        for r in _load_matrix():
            if r["status"] == "measured":
                v = float(r["tps_median"])
                self.assertTrue(v > 0 and v == v)
                self.assertTrue(float(r["tps_min"]) > 0)
                self.assertTrue(float(r["tps_max"]) >= float(r["tps_min"]))

    def test_timeout_rows_carry_no_tps(self):
        for r in _load_matrix():
            if r["status"] != "measured":
                self.assertEqual(r["tps_median"].strip(), "")


class TestSoakRawCoverage(unittest.TestCase):
    """Raw corpus: 162 files (54 legacy untiered + 108 tiered).

    The original sweep kept one tier per arm under untiered filenames
    (last-writer-wins defect, see docs/errata.md); the re-dispatch
    landed tiered filenames. The 18 original tier-groups therefore
    pool 3 legacy + 3 re-dispatch repeats (n=6); the 18 newer groups
    have 3 repeats (n=3). 18*6 + 18*3 = 162.
    """

    def test_raw_file_count(self):
        names = os.listdir(os.path.join(SOAK, "raw"))
        self.assertEqual(len(names), 162)
        tiered = [n for n in names if "1800s" in n or "3600s" in n]
        legacy = [n for n in names if "1800s" not in n and "3600s" not in n]
        self.assertEqual(len(tiered), 108)
        self.assertEqual(len(legacy), 54)

    def test_raw_content_groups_match_matrix(self):
        import glob
        counts = {}
        for path in glob.glob(os.path.join(SOAK, "raw", "*.json")):
            with open(path) as fh:
                d = json.load(fh)
            key = (d["cell_id"], str(d["duration_s"]), d["pooler"])
            counts[key] = counts.get(key, 0) + 1
        rows = _load_matrix()
        matrix_groups = set((r["cell_id"], r["duration_s"], r["pooler"])
                            for r in rows)
        self.assertEqual(set(counts), matrix_groups)
        self.assertEqual(len(counts), 36)
        self.assertEqual(sorted(counts.values()),
                         [3] * 18 + [6] * 18)

    def test_matrix_n_matches_raw_repeats(self):
        import glob
        counts = {}
        for path in glob.glob(os.path.join(SOAK, "raw", "*.json")):
            with open(path) as fh:
                d = json.load(fh)
            key = (d["cell_id"], str(d["duration_s"]), d["pooler"])
            counts[key] = counts.get(key, 0) + 1
        for r in _load_matrix():
            key = (r["cell_id"], r["duration_s"], r["pooler"])
            self.assertEqual(int(r["n"]), counts[key],
                             "matrix n skew vs raw for %s" % (key,))


class TestSoakBundleAgreement(unittest.TestCase):
    """Derived bundles agree on 36/29/7 with 0 absent."""

    def test_report_soak_leg(self):
        with open(os.path.join(RESULTS, "report.json")) as fh:
            rep = json.load(fh)
        self.assertEqual(rep["soak_measured"], 29)
        self.assertEqual(rep["soak_na"], 7)

    def test_supplement_counts(self):
        with open(os.path.join(RESULTS, "supplementmeta.json")) as fh:
            sup = json.load(fh)
        self.assertEqual(sup["counts"]["soak_total"], 36)
        self.assertEqual(sup["counts"]["soak_measured"], 29)

    def test_sitemeta_soak_leg(self):
        with open(os.path.join(RESULTS, "sitemeta.json")) as fh:
            site = json.load(fh)
        leg = site["soak_leg"]
        self.assertEqual(leg["present"], 36)
        self.assertEqual(leg["missing"], 0)
        self.assertEqual(leg["timeout"], 7)
        self.assertEqual(leg["total"], 36)

    def test_manifest_raw_totals(self):
        with open(os.path.join(RESULTS, "manifest.json")) as fh:
            man = json.load(fh)
        legs = man["legs"]
        counts = {k: len(v["files"]) for k, v in legs.items()}
        self.assertEqual(counts["m10-soak"], 162)
        self.assertEqual(counts["m1"], 150)
        self.assertEqual(counts["m2"], 319)
        self.assertEqual(counts["m9"], 1770)
        self.assertEqual(man["total_raw_files"], 2401)
        self.assertEqual(man["total_raw_files"],
                         150 + 319 + 1770 + 162)

    def test_dossier_sources_fresh(self):
        with open(os.path.join(RESULTS, "dossiermeta.json")) as fh:
            dm = json.load(fh)
        for src, sha in dm.get("sources", {}).items():
            path = os.path.join(RESULTS, src)
            self.assertTrue(os.path.exists(path), "missing " + src)
            with open(path, "rb") as fh:
                digest = hashlib.sha256(fh.read()).hexdigest()
            self.assertEqual(digest, sha, "stale dossier source " + src)

    def test_comparison_has_no_absent_markers(self):
        with open(os.path.join(RESULTS, "charts",
                               "comparison.json")) as fh:
            comp = json.load(fh)
        self.assertEqual(json.dumps(comp).count("tier not in git"), 0)


if __name__ == "__main__":
    unittest.main()
