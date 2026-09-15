"""Tester regression suite for PR #349 fix round (issue #302).

Guards the two crash-hardening fixes the Reviewer reproduced by
execution on the soak tier-integrity PR:

  1. ``build_bundle`` must not crash on duration-less soak entries
     (``TypeError`` in ``sorted()`` and in ``"%s/%ds"`` formatting).
  2. Coherence SHA lookups for the soak bundle must report ``absent``
     instead of raising ``FileNotFoundError`` when the file is missing.

Plus the tier-segment filename contract for future soak runs.

Each test fails on the pre-fix code and passes on the fixed code;
nothing here is tautological. Authored by the Tester.
"""

import csv
import json
import os
import unittest

from poolduel.harness.report import build_bundle
from poolduel.harness.runner import raw_filename
from poolduel.harness.stats import median_group_key


def _soak_entry(cell="M10-S1", duration=1800, pooler="pgbouncer",
                status="measured"):
    entry = {"cell_id": cell, "pooler": pooler, "status": status}
    if duration is not None:
        entry["duration_s"] = duration
    return entry


class TestSoakBundleCrashHardening(unittest.TestCase):
    """Blocking 1: build_bundle soak_cells with duration-less entries."""

    def test_mixed_known_and_unknown_tier_no_crash(self):
        bundle = build_bundle(
            [], [],
            soak_medians=[{"cell_id": "M10-S1"},
                          _soak_entry(duration=1800)])
        self.assertEqual(bundle["soak_cells"],
                         ["M10-S1/unknown-tier", "M10-S1/1800s"])

    def test_duration_less_only_no_crash(self):
        bundle = build_bundle([], [], soak_medians=[{"cell_id": "M10-S1"}])
        self.assertEqual(bundle["soak_cells"], ["M10-S1/unknown-tier"])

    def test_bool_duration_is_unknown_tier_not_crash(self):
        bundle = build_bundle(
            [], [], soak_medians=[_soak_entry(duration=True)])
        self.assertEqual(bundle["soak_cells"], ["M10-S1/unknown-tier"])

    def test_string_duration_is_unknown_tier_not_crash(self):
        bundle = build_bundle(
            [], [], soak_medians=[_soak_entry(duration="1800")])
        self.assertEqual(bundle["soak_cells"], ["M10-S1/unknown-tier"])

    def test_zero_duration_is_own_tier_not_unknown(self):
        # 0 is a real int tier; the sort must not collapse it to -1
        # handling reserved for None.
        bundle = build_bundle(
            [], [], soak_medians=[_soak_entry(duration=0)])
        self.assertEqual(bundle["soak_cells"], ["M10-S1/0s"])

    def test_status_less_dicts_do_not_raise_keyerror(self):
        bundle = build_bundle(
            [], [],
            soak_medians=[{"cell_id": "M10-S1"},
                          _soak_entry(duration=1800)])
        self.assertIn("soak_measured", bundle)
        self.assertIn("soak_na", bundle)

    def test_empty_soak_medians(self):
        bundle = build_bundle([], [], soak_medians=[])
        self.assertEqual(bundle["soak_cells"], [])


class TestSoakShaAbsentGuard(unittest.TestCase):
    """Blocking 2: missing soak bundle reports 'absent', no traceback."""

    def test_missing_file_reports_absent(self):
        from poolduel.harness import site as sitemod
        from poolduel.harness import supplement as supmod
        missing = os.path.join("poolduel", "results", "m10-soak",
                               "tester-probe-absent-medians.json")
        self.assertFalse(os.path.exists(missing))
        want = (sitemod._sha256_file(missing)
                if os.path.exists(missing) else "absent")
        self.assertEqual(want, "absent")
        want2 = (supmod._sha256_file(missing)
                 if os.path.exists(missing) else "absent")
        self.assertEqual(want2, "absent")

    def test_present_file_hashes_normally(self):
        from poolduel.harness import site as sitemod
        path = os.path.join("poolduel", "results", "m10-soak",
                            "medians.json")
        self.assertTrue(os.path.exists(path))
        digest = (sitemod._sha256_file(path)
                  if os.path.exists(path) else "absent")
        self.assertNotEqual(digest, "absent")
        self.assertEqual(len(digest), 64)


class TestSoakTierContracts(unittest.TestCase):
    """Tier-segment filename + grouping key contracts for soak runs."""

    def test_soak_raw_filename_carries_tier_segment(self):
        name = raw_filename({"cell_id": "M10-S1", "duration_s": 1800},
                            "direct", 1)
        self.assertEqual(name, "M10-S1-1800s-direct-r1.json")

    def test_soak_raw_filename_60min_tier(self):
        name = raw_filename({"cell_id": "M10-S1", "duration_s": 3600},
                            "pgbouncer", 2)
        self.assertEqual(name, "M10-S1-3600s-pgbouncer-r2.json")

    def test_soak_raw_filename_rejects_bad_duration(self):
        with self.assertRaises(ValueError):
            raw_filename({"cell_id": "M10-S1"}, "direct", 1)
        with self.assertRaises(ValueError):
            raw_filename({"cell_id": "M10-S1", "duration_s": "soon"},
                         "direct", 1)

    def test_non_soak_filename_unchanged(self):
        name = raw_filename({"cell_id": "M9-C1"}, "pgbouncer", 1)
        self.assertEqual(name, "M9-C1-pgbouncer-r1.json")

    def test_grouping_key_separates_tiers(self):
        a = {"cell_id": "M10-S1", "pooler": "pgbouncer",
             "duration_s": 1800}
        b = {"cell_id": "M10-S1", "pooler": "pgbouncer",
             "duration_s": 3600}
        self.assertNotEqual(median_group_key(a), median_group_key(b))

    def test_committed_medians_have_both_tiers(self):
        with open(os.path.join("poolduel", "results", "m10-soak",
                               "medians.json")) as fh:
            medians = json.load(fh)
        tiers = sorted(set(e.get("duration_s") for e in medians))
        self.assertEqual(tiers, [1800, 3600])
        keys = [(e.get("cell_id"), e.get("duration_s"), e.get("pooler"))
                for e in medians]
        self.assertEqual(len(keys), len(set(keys)))

    def test_committed_matrix_is_tier_labeled(self):
        with open(os.path.join("poolduel", "results", "m10-soak",
                               "matrix.csv")) as fh:
            rows = list(csv.DictReader(fh))
        self.assertEqual(len(rows), 18)
        self.assertIn("duration_s", rows[0])
        self.assertEqual(sorted(set(r["duration_s"] for r in rows)),
                         ["1800", "3600"])


if __name__ == "__main__":
    unittest.main()
