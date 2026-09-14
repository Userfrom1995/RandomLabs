"""Tester regression suite for PR #339 (M11a statistics publication, Refs #302).

Black-box pins for the committed M11a bundles: m9 bundle size and
enrichment keys, matrix/medians key parity, timeout-value leak freedom
(the M2-I15/pgpool single-sample leak stays fixed), the M1-4/pgagroal
mixed-status null rule, statistics-block shape (family 98, headlines 96,
claims 1/2/3/5 faster with claim 4 killed by mixed_status), manifest SHA
sync for report.json, and end-to-end deterministic rebuild of the
committed bundles from committed raw only.

Reads committed bundles; never touches production logic.
"""

import csv
import hashlib
import json
import os
import tempfile
import unittest

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RESULTS = os.path.join(REPO, "poolduel", "results")


def load(name):
    with open(os.path.join(RESULTS, name), encoding="utf-8") as fh:
        return json.load(fh)


class TestM11aBundlePublication(unittest.TestCase):
    def test_m9_medians_count_and_enrichment(self):
        m9 = load("m9/medians.json")
        self.assertIsInstance(m9, list)
        self.assertEqual(len(m9), 250)
        for e in m9:
            self.assertIn("context_mixed", e)
            self.assertIn("p_quarantined", e)

    def test_matrix_medians_key_parity(self):
        m9 = load("m9/medians.json")
        with open(os.path.join(RESULTS, "m9", "matrix.csv"),
                  encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        self.assertEqual(len(rows), 250)
        med_keys = {(e["cell_id"], e["pooler"]) for e in m9}
        csv_keys = {(r["cell_id"], r["pooler"]) for r in rows}
        self.assertEqual(med_keys, csv_keys)

    def test_no_timeout_value_leaks(self):
        with open(os.path.join(RESULTS, "m9", "matrix.csv"),
                  encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        leaks = [r for r in rows
                 if r["status"] in ("timeout", "timeout/inconclusive")
                 and r["tps_median"] not in ("", None, "null")]
        self.assertEqual(leaks, [])

    def test_m1_4_pgagroal_mixed_null_rule(self):
        m9 = load("m9/medians.json")
        hits = [e for e in m9 if e.get("cell_id") == "M1-4"
                and e.get("pooler") == "pgagroal"]
        self.assertEqual(len(hits), 1)
        e = hits[0]
        self.assertEqual(e["status"], "timeout/inconclusive")
        self.assertIsNone(e["tps"]["median"])
        self.assertEqual(e["n"], 7)

    def test_m2_i15_pgpool_timeout_null_rule(self):
        m9 = load("m9/medians.json")
        hits = [e for e in m9 if e.get("cell_id") == "M2-I15"
                and e.get("pooler") == "pgpool"]
        self.assertEqual(len(hits), 1)
        e = hits[0]
        self.assertEqual(e["status"], "timeout/inconclusive")
        self.assertIsNone(e["tps"]["median"])
        self.assertEqual(e["n"], 7)

    def test_statistics_block_shape(self):
        r = load("report.json")
        s = r["statistics"]
        self.assertEqual(s["family_size"], 98)
        self.assertEqual(len(s["family"]), 98)
        self.assertEqual(s["headlines"], 96)
        self.assertEqual(len(s["claims"]), 5)
        by_claim = {c["claim"]: c for c in s["claims"]}
        for n in (1, 2, 3, 5):
            self.assertTrue(by_claim[n]["verdict"].endswith("faster"),
                            (n, by_claim[n]))
            self.assertIsNone(by_claim[n]["killed_by"])
        self.assertEqual(by_claim[4]["verdict"], "inconclusive")
        self.assertEqual(by_claim[4]["killed_by"], "mixed_status")

    def test_report_has_m9_leg(self):
        r = load("report.json")
        self.assertIn("m9_cells", r)
        self.assertEqual(r["m9_measured"] + r["m9_na"], 250)

    def test_manifest_report_sha_in_sync(self):
        manifest = load("charts/manifest.json")
        with open(os.path.join(RESULTS, "report.json"), "rb") as fh:
            digest = hashlib.sha256(fh.read()).hexdigest()
        self.assertEqual(manifest["sources"]["report.json"], digest)

    def test_deterministic_rebuild_from_committed_raw(self):
        from poolduel.harness import report as report_mod

        with tempfile.TemporaryDirectory() as tmp:
            report_mod.main([
                "--m1-dir", os.path.join(RESULTS, "m1"),
                "--m2-dir", os.path.join(RESULTS, "m2"),
                "--m9-dir", os.path.join(RESULTS, "m9"),
                "--out", tmp,
            ])
            for rel in ("m1/medians.json", "m2/medians.json",
                        "m9/medians.json", "m9/matrix.csv",
                        "report.json"):
                with open(os.path.join(tmp, rel), "rb") as fh:
                    fresh = fh.read()
                with open(os.path.join(RESULTS, rel), "rb") as fh:
                    committed = fh.read()
                self.assertEqual(fresh, committed, rel)


if __name__ == "__main__":
    unittest.main()
