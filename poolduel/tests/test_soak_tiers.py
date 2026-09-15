"""Soak tier-integrity regression gate (issue #302, M10 soak follow-up).

Proven 2026-09-15: the m10-soak aggregate grouped raw by
``(cell_id, pooler)`` and merged a flat raw dir whose filenames
(``M10-S1-direct-r1.json``) carried no duration tier, so the 30-min
and 60-min tiers of one arm overwrote each other at copy time: 18 of
36 soak groups never reached git (see docs/errata.md). This module
pins the fix:

- ``runner.raw_filename`` segments soak filenames by duration tier
  while M1/M2/M9 names stay byte-identical;
- ``stats.median_group_key`` / ``report.aggregate`` /
  ``runner.write_medians`` group by ``(cell_id, duration_s,
  pooler)`` so two tiers of one arm stay separate medians;
- the committed soak rebuild carries a ``duration_s`` tier label on
  every median with numbers identical to the pre-fix commit.
"""

import json
import os
import unittest

from poolduel.harness import report
from poolduel.harness.runner import raw_filename, write_medians
from poolduel.harness.stats import median_group_key

RESULTS = os.path.join("poolduel", "results")

# The 18 (cell, duration, arm) groups present in git after the
# 2026-09-15 sweep (run 34910054732, commit e7675597). The
# complementary 18 groups are absent (filename-collision loss, see
# docs/errata.md) and belong to the Maintainer re-dispatch, never to
# interpolation here.
PRESENT_GROUPS = frozenset([
    ("M10-S1", 1800, "direct"), ("M10-S1", 1800, "pgagroal"),
    ("M10-S1", 1800, "pgcat"), ("M10-S1", 1800, "pgpool"),
    ("M10-S1", 3600, "odyssey"), ("M10-S1", 3600, "pgbouncer"),
    ("M10-S2", 1800, "pgbouncer"), ("M10-S2", 1800, "pgcat"),
    ("M10-S2", 1800, "pgpool"), ("M10-S2", 3600, "direct"),
    ("M10-S2", 3600, "odyssey"), ("M10-S2", 3600, "pgagroal"),
    ("M10-S3", 1800, "direct"), ("M10-S3", 1800, "odyssey"),
    ("M10-S3", 1800, "pgagroal"), ("M10-S3", 1800, "pgbouncer"),
    ("M10-S3", 1800, "pgcat"), ("M10-S3", 3600, "pgpool"),
])

ALL_ARMS = ("direct", "pgagroal", "pgbouncer", "pgpool", "odyssey",
            "pgcat")
ALL_GROUPS = frozenset(
    (cid, dur, arm)
    for cid in ("M10-S1", "M10-S2", "M10-S3")
    for dur in (1800, 3600)
    for arm in ALL_ARMS)

MISSING_GROUPS = ALL_GROUPS - PRESENT_GROUPS


def _rec(cell, duration, pooler, repeat, tps=1000.0):
    return {"cell_id": cell, "duration_s": duration, "pooler": pooler,
            "repeat": repeat, "status": "measured", "tps": tps,
            "latency_avg_ms": 1.0, "p50_ms": None, "p90_ms": None,
            "p99_ms": None, "p999_ms": None, "workload": "select-only",
            "clients": 100, "pool_size": 10, "protocol": "simple",
            "churn": False, "scale": 10}


class RawFilenameTest(unittest.TestCase):
    def test_soak_filename_carries_duration_tier(self):
        self.assertEqual(
            raw_filename({"cell_id": "M10-S1", "duration_s": 1800},
                         "direct", 1),
            "M10-S1-1800s-direct-r1.json")
        self.assertEqual(
            raw_filename({"cell_id": "M10-S3", "duration_s": 3600},
                         "pgcat", 3),
            "M10-S3-3600s-pgcat-r3.json")

    def test_two_tiers_no_longer_collide(self):
        a = raw_filename({"cell_id": "M10-S1", "duration_s": 1800},
                         "direct", 1)
        b = raw_filename({"cell_id": "M10-S1", "duration_s": 3600},
                         "direct", 1)
        self.assertNotEqual(a, b)

    def test_legacy_matrices_byte_identical(self):
        self.assertEqual(
            raw_filename({"cell_id": "M1-1", "duration_s": 120},
                         "direct", 1),
            "M1-1-direct-r1.json")
        self.assertEqual(
            raw_filename({"cell_id": "M2-I5", "duration_s": 60},
                         "pgbouncer", 2),
            "M2-I5-pgbouncer-r2.json")
        self.assertEqual(
            raw_filename({"cell_id": "M9-R01", "duration_s": 120},
                         "odyssey", 3),
            "M9-R01-odyssey-r3.json")


class GroupKeyTest(unittest.TestCase):
    def test_key_includes_duration(self):
        self.assertEqual(
            median_group_key({"cell_id": "M10-S1", "duration_s": 1800,
                              "pooler": "direct"}),
            ("M10-S1", 1800, "direct"))

    def test_legacy_records_group_under_none(self):
        self.assertEqual(
            median_group_key({"cell_id": "M1-1", "pooler": "direct"}),
            ("M1-1", None, "direct"))


class NoMixTest(unittest.TestCase):
    def test_two_tiers_yield_two_medians(self):
        recs = []
        for dur, base in ((1800, 1000.0), (3600, 2000.0)):
            for rep in (1, 2, 3):
                recs.append(_rec("M10-S1", dur, "direct", rep,
                                 tps=base + rep))
        med = report.aggregate(recs)
        self.assertEqual(len(med), 2)
        by_dur = {e["duration_s"]: e for e in med}
        self.assertEqual(set(by_dur), {1800, 3600})
        self.assertAlmostEqual(by_dur[1800]["tps"]["median"], 1002.0)
        self.assertAlmostEqual(by_dur[3600]["tps"]["median"], 2002.0)
        for e in med:
            self.assertFalse(e["context_mixed"])

    def test_write_medians_matches_aggregate_grouping(self):
        recs = []
        for dur in (1800, 3600):
            for rep in (1, 2, 3):
                recs.append(_rec("M10-S9", dur, "pgcat", rep))
        med = write_medians(recs, "/tmp/poolduel-soak-nomix.json")
        self.assertEqual(len(med), 2)
        self.assertEqual({e["duration_s"] for e in med}, {1800, 3600})
        for e in med:
            self.assertIn("workload", e)
            self.assertIn("p_quarantined", e)


class CommittedSoakTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(os.path.join(RESULTS, "m10-soak",
                               "medians.json")) as f:
            cls.medians = json.load(f)

    def test_eighteen_tier_labeled_medians(self):
        self.assertEqual(len(self.medians), 18)
        groups = {(e["cell_id"], e["duration_s"], e["pooler"])
                  for e in self.medians}
        self.assertEqual(groups, PRESENT_GROUPS)

    def test_every_median_carries_context(self):
        for e in self.medians:
            for key in ("workload", "clients", "pool_size",
                        "protocol", "churn", "duration_s", "scale",
                        "context_mixed", "p_quarantined"):
                self.assertIn(key, e, "%s missing %s" % (e.get(
                    "cell_id"), key))
            self.assertFalse(e["context_mixed"])

    def test_no_cell_pooler_spans_two_tiers(self):
        seen = {}
        for e in self.medians:
            key = (e["cell_id"], e["pooler"])
            self.assertNotIn(key, seen,
                             "%s spans tiers" % (key,))
            seen[key] = e["duration_s"]

    def test_missing_groups_are_exactly_the_known_eighteen(self):
        # Tripwire in both directions: a re-dispatch landing new
        # groups without a bundle rebuild fails here, and so does
        # silently dropping a committed group.
        self.assertEqual(len(MISSING_GROUPS), 18)
        raw_groups = set()
        raw_dir = os.path.join(RESULTS, "m10-soak", "raw")
        for base in os.listdir(raw_dir):
            if not base.endswith(".json"):
                continue
            with open(os.path.join(raw_dir, base)) as f:
                rec = json.load(f)
            raw_groups.add((rec["cell_id"], rec["duration_s"],
                            rec["pooler"]))
        self.assertEqual(raw_groups, PRESENT_GROUPS)


if __name__ == "__main__":
    unittest.main()
