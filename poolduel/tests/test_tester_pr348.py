"""Tester regression gate for PR #348 (M10 soak surfaces sync, Refs #302).

Pins the root README Poolduel line and landing Poolduel card to the
committed M10 soak truth, from the outside:
1. Both surfaces claim M10 soak GREEN with exact counts (36 medians:
   29 measured plus 7 timeout/inconclusive, 162 raw) and no pending
   re-dispatch clause.
2. Counts match poolduel/results/m10-soak/medians.json (36 rows,
   3 cells x 6 arms x 2 tiers, nothing absent) and raw/ file
   count (162).
3. pr323 SYNCED substrings still present in both surfaces.
4. No stale "undispatched" / "wired but undispatched" soak claim.
5. No pinned "663 tests green" count (redesign no-fixed-count rule).
6. No em dashes in either surface.
"""

import glob
import json
import os
import unittest

REPO = os.path.join(os.path.dirname(__file__), "..", "..")
POOLDUEL = os.path.join(os.path.dirname(__file__), "..")


def _read(rel):
    with open(os.path.join(REPO, rel)) as handle:
        return handle.read()


def _load(rel):
    with open(os.path.join(REPO, rel)) as handle:
        return json.load(handle)


class M10SoakSurfacesSyncTest(unittest.TestCase):
    def test_both_surfaces_claim_m10_green_with_exact_counts(self):
        for rel in ("README.md", "index.html"):
            text = _read(rel)
            self.assertIn("M10 soak sweep is GREEN", text, rel)
            self.assertIn("36 medians", text, rel)
            self.assertIn("29 measured", text, rel)
            self.assertIn("7 timeout/inconclusive", text, rel)
            self.assertIn("162 raw", text, rel)

    def test_no_pending_redispatch_clause(self):
        for rel in ("README.md", "index.html"):
            low = _read(rel).lower()
            self.assertNotIn("pending maintainer re-dispatch", low, rel)
            self.assertNotIn("groups pending", low, rel)
            self.assertNotIn("pending re-dispatch", low, rel)

    def test_counts_match_committed_data(self):
        medians = _load("poolduel/results/m10-soak/medians.json")
        self.assertIsInstance(medians, list)
        self.assertEqual(len(medians), 36)
        measured = [r for r in medians if r.get("status") == "measured"]
        inconc = [r for r in medians
                  if r.get("status") == "timeout/inconclusive"]
        self.assertEqual(len(measured), 29)
        self.assertEqual(len(inconc), 7)
        cells = set(r["cell_id"] for r in medians)
        self.assertEqual(cells, {"M10-S1", "M10-S2", "M10-S3"})
        poolers = set(r["pooler"] for r in medians)
        self.assertEqual(poolers, {"direct", "odyssey", "pgagroal",
                                   "pgbouncer", "pgcat", "pgpool"})
        triples = set((r["cell_id"], r["duration_s"], r["pooler"])
                      for r in medians)
        full = set((c, d, p)
                   for c in ("M10-S1", "M10-S2", "M10-S3")
                   for d in (1800, 3600)
                   for p in ("direct", "odyssey", "pgagroal",
                             "pgbouncer", "pgcat", "pgpool"))
        self.assertEqual(triples, full)
        raw = glob.glob(os.path.join(
            REPO, "poolduel", "results", "m10-soak", "raw", "*"))
        self.assertEqual(len(raw), 162)

    def test_pr323_synced_substrings_intact(self):
        synced = "M1 medians (42 rows) and M2 medians (111 rows)"
        for rel in ("README.md", "index.html"):
            text = _read(rel)
            self.assertIn(synced, text, rel)
            self.assertIn("report bundle", text, rel)

    def test_no_stale_undispatched_claim(self):
        for rel in ("README.md", "index.html"):
            low = _read(rel).lower()
            self.assertNotIn("undispatched", low, rel)
            self.assertNotIn("wired but", low, rel)

    def test_no_pinned_test_count(self):
        for rel in ("README.md", "index.html"):
            self.assertNotIn("663 tests green", _read(rel), rel)

    def test_no_em_dashes(self):
        for rel in ("README.md", "index.html"):
            self.assertNotIn("—", _read(rel), rel)


if __name__ == "__main__":
    unittest.main()
