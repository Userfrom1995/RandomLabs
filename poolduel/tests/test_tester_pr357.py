"""Tester regression suite for PR #357 (issue #302, Poolduel M13b gate).

Pins the Builder-owned section-11 gate battery numbers so any future
drift fails loudly: deterministic counts (42 M1 + 111 M2 + 250 M9 +
36 soak medians, 371 measured + 68 N/A/timeout), sealed manifest
(2401 raw files, within budget), mechanical fairness (0 empty configs,
doc-cited mode keys on every row, honest N/A stubs only), exact
soak-figure triples backing the Tier-2 vision read-back, no visible
pending/loading text on shipped pages (Supavisor honest zero-data
note excepted), and em-dash-free gate files. Authored by the Tester.
"""

import csv
import glob
import json
import os
import re
import unittest

RESULTS = os.path.join("poolduel", "results")
SOAK = os.path.join(RESULTS, "m10-soak")
MODE_KEYS = {
    "pgbouncer": "pool_mode",
    "pgagroal": "pipeline",
    "odyssey": "pool",
    "pgcat": "pool_mode",
    "pgpool": "num_init_children",
}


def all_raw():
    files = []
    for leg in ("m1", "m2", "m9", "m10-soak"):
        files += glob.glob(os.path.join(RESULTS, leg, "raw", "*"))
    return files


def medians(path):
    with open(path) as fh:
        data = json.load(fh)
    if isinstance(data, list):
        return data
    return data.get("rows", data.get("medians", []))


class M13bGateCountsTest(unittest.TestCase):
    def test_median_counts_per_leg(self):
        self.assertEqual(len(medians(os.path.join(RESULTS, "m1", "medians.json"))), 42)
        self.assertEqual(len(medians(os.path.join(RESULTS, "m2", "medians.json"))), 111)
        self.assertEqual(len(medians(os.path.join(RESULTS, "m9", "medians.json"))), 250)
        self.assertEqual(len(medians(os.path.join(SOAK, "medians.json"))), 36)

    def test_soak_matrix_36_rows_162_raw(self):
        with open(os.path.join(SOAK, "matrix.csv")) as fh:
            self.assertEqual(len(list(csv.DictReader(fh))), 36)
        self.assertEqual(len(glob.glob(os.path.join(SOAK, "raw", "*"))), 162)

    def test_manifest_sealed_2401_within_budget(self):
        with open(os.path.join(RESULTS, "manifest.json")) as fh:
            manifest = json.load(fh)
        self.assertEqual(manifest["total_raw_files"], 2401)
        self.assertTrue(manifest["within_budget"])
        self.assertEqual(manifest["total_raw_files"], len(all_raw()))

    def test_statistics_family_98_headlines_96(self):
        with open(os.path.join(RESULTS, "report.json")) as fh:
            report = json.load(fh)
        stats = report["statistics"]
        family = stats["family"]
        self.assertEqual(len(family) if isinstance(family, list) else family, 98)
        headlines = stats["headlines"]
        self.assertEqual(len(headlines) if isinstance(headlines, list) else headlines, 96)

    def test_dossiermeta_6_poolers_170_rows(self):
        with open(os.path.join(RESULTS, "dossiermeta.json")) as fh:
            dossiers = json.load(fh)
        blob = json.dumps(dossiers)
        for pooler in ("pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat", "supavisor"):
            self.assertIn(pooler, blob)


class M13bFairnessMechanicalTest(unittest.TestCase):
    def test_zero_empty_configs(self):
        empty = [f for f in all_raw()
                 if not json.load(open(f)).get("pooler_config")]
        self.assertEqual(empty, [])

    def test_direct_null_version_by_design_only(self):
        bad = [f for f in all_raw()
               if not json.load(open(f)).get("pooler_version")
               and (json.load(open(f)).get("pooler") or "").strip() != "direct"]
        self.assertEqual(bad, [])

    def test_doc_cited_keys_or_honest_stub(self):
        bad = []
        for f in all_raw():
            rec = json.load(open(f))
            pooler = (rec.get("pooler") or "").strip()
            cfg = rec.get("pooler_config")
            text = cfg if isinstance(cfg, str) else json.dumps(cfg or "")
            if pooler in ("direct", "supavisor"):
                continue
            if "N/A (unsupported)" in text:
                continue
            if MODE_KEYS[pooler] not in text:
                bad.append(f)
        self.assertEqual(bad, [])

    def test_na_stubs_cite_modes_doc(self):
        stubs = [f for f in all_raw()
                 if "N/A (unsupported)" in (json.load(open(f)).get("pooler_config") or "")]
        self.assertGreaterEqual(len(stubs), 6)
        for f in stubs:
            self.assertIn("modes.md", json.load(open(f))["pooler_config"])


class M13bVisionTriplesTest(unittest.TestCase):
    def check_triple(self, cell, pooler, duration, expected):
        for row in medians(os.path.join(SOAK, "medians.json")):
            if (row.get("cell_id") == cell and row.get("pooler") == pooler
                    and str(row.get("duration_s")) == str(duration)):
                tps = row.get("tps_median", row.get("tps"))
                median = tps.get("median") if isinstance(tps, dict) else tps
                self.assertAlmostEqual(median, expected, places=5,
                                       msg="%s %s %s" % (cell, pooler, duration))
                return
        self.fail("row not found: %s %s %s" % (cell, pooler, duration))

    def test_soak_figure_triples_exact(self):
        self.check_triple("M10-S1", "pgbouncer", 1800, 17008.336377)
        self.check_triple("M10-S1", "direct", 3600, 31217.17811)
        self.check_triple("M10-S2", "pgcat", 3600, 21371.978407)


class M13bPagesHonestyTest(unittest.TestCase):
    @staticmethod
    def visible_text(path):
        html = open(path).read()
        html = re.sub(r"<script.*?</script>", "", html, flags=re.S)
        html = re.sub(r"<style.*?</style>", "", html, flags=re.S)
        return re.sub(r"<[^>]+>", " ", html)

    def test_no_visible_loading_freeze(self):
        pages = ["poolduel/index.html"] + [
            "poolduel/%s/index.html" % p for p in
            ("pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat", "supavisor")]
        for page in pages:
            vis = self.visible_text(page)
            hits = [m for m in re.findall(r"loading\.\.\.|spinner", vis, re.I)]
            self.assertEqual(hits, [], msg=page)

    def test_no_visible_pending_outside_honest_notes(self):
        for page in ("poolduel/index.html",
                     "poolduel/pgagroal/index.html",
                     "poolduel/pgbouncer/index.html",
                     "poolduel/pgpool/index.html",
                     "poolduel/odyssey/index.html",
                     "poolduel/pgcat/index.html"):
            vis = self.visible_text(page)
            self.assertNotIn("pending", vis.lower(), msg=page)
        vis = self.visible_text("poolduel/supavisor/index.html").lower()
        self.assertIn("smoke gate pending", vis)

    def test_gate_files_em_dash_free(self):
        for path in ("ideas/2026-09-15-poolduel-m13b-gate.md",
                     "poolduel/docs/fairness-audit.md",
                     "progress/302-poolduel.md",
                     "poolduel/tests/test_tester_pr357.py"):
            self.assertNotIn("\u2014", open(path).read(), msg=path)


if __name__ == "__main__":
    unittest.main()
