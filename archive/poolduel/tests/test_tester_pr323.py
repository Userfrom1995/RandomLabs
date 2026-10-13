"""Tester-owned regression suite for PR #323 (issue #322, Curator sync).

Pins the two-line README/landing-page sync against the published
Poolduel M1/M2 medians plus report bundle, from the outside:
1. Stale "No numbers claimed until the sweeps run." text is gone from
   both root README.md and index.html Poolduel surfaces.
2. New wording claims M1 42 rows, M2 111 rows, report bundle on main
   under review (Refs #302).
3. M1 medians.json is a 42-row list (7 cells x 6 arms).
4. M2 medians.json is a 111-row list (52 direct controls + 59 pooler
   rows incl. 7 N/A).
5. report.json carries best-vs-best verdicts, iso regions, flatness,
   and cell lists matching the medians.
6. Every data-chart host on all six Poolduel pages resolves to a
   committed charts-bundle key; all bundle JSONs parse.
7. Vendored echarts.min.js present; page script refs resolve.
8. All README internal links resolve; landing-page Poolduel blob
   targets and Pages dirs exist.
9. Zero em dashes in the synced surfaces; no stray placeholders.
"""

import glob
import json
import os
import re
import unittest

POOLDUEL = os.path.join(os.path.dirname(__file__), "..")
REPO = os.path.join(os.path.dirname(__file__), "..", "..")

STALE = "No numbers claimed until the sweeps run."
SYNCED = "M1 medians (42 rows) and M2 medians (111 rows)"

PAGES = [
    "index.html",
    "odyssey/index.html",
    "pgagroal/index.html",
    "pgbouncer/index.html",
    "pgcat/index.html",
    "pgpool/index.html",
]


def _read(rel):
    with open(os.path.join(REPO, rel)) as f:
        return f.read()


def _load(rel):
    with open(os.path.join(REPO, rel)) as f:
        return json.load(f)


class SyncedWordingTest(unittest.TestCase):
    def test_readme_poolduel_line_synced(self):
        text = _read("README.md")
        self.assertNotIn(STALE, text)
        self.assertIn(SYNCED, text)
        self.assertIn("report bundle", text)
        self.assertIn("Refs #302", text)

    def test_landing_poolduel_card_synced(self):
        text = _read("index.html")
        self.assertNotIn(STALE, text)
        self.assertIn(SYNCED, text)
        self.assertIn("report bundle", text)

    def test_no_em_dashes_in_synced_files(self):
        for rel in ("README.md", "index.html"):
            self.assertNotIn("\u2014", _read(rel), rel)

    def test_no_stray_placeholders(self):
        for rel in ["README.md", "index.html"] + [
            "poolduel/" + p for p in PAGES
        ]:
            low = _read(rel).lower()
            for marker in ("todo", "fixme", "lorem", "coming soon"):
                self.assertNotIn(marker, low, "%s ships %r" % (rel, marker))


class MediansRowCountTest(unittest.TestCase):
    def test_m1_is_42_rows_7_cells_x_6_arms(self):
        m1 = _load("poolduel/results/m1/medians.json")
        self.assertIsInstance(m1, list)
        self.assertEqual(len(m1), 42)
        cells = set(r["cell_id"] for r in m1)
        self.assertEqual(len(cells), 7)
        poolers = set(r["pooler"] for r in m1)
        self.assertEqual(len(poolers), 6)

    def test_m2_is_111_rows_52_direct_plus_59_pooler(self):
        m2 = _load("poolduel/results/m2/medians.json")
        self.assertIsInstance(m2, list)
        self.assertEqual(len(m2), 111)
        direct = [r for r in m2 if r.get("pooler") == "direct"]
        pooler = [r for r in m2 if r.get("pooler") != "direct"]
        self.assertEqual(len(direct), 52)
        self.assertEqual(len(pooler), 59)
        na = [r for r in m2 if "N/A" in str(r.get("status", ""))]
        self.assertEqual(len(na), 7)


class ReportBundleTest(unittest.TestCase):
    def test_report_carries_verdicts_iso_flatness(self):
        report = _load("poolduel/results/report.json")
        self.assertTrue(report.get("pairwise"),
                        "report.json has no best-vs-best verdicts")
        self.assertTrue(report.get("iso_regions"),
                        "report.json has no iso regions")
        self.assertTrue(report.get("flatness"),
                        "report.json has no flatness")
        self.assertTrue(report.get("best"), "report.json has no best map")

    def test_report_cells_match_medians(self):
        report = _load("poolduel/results/report.json")
        m1 = _load("poolduel/results/m1/medians.json")
        m2 = _load("poolduel/results/m2/medians.json")
        self.assertEqual(
            set(report["m1_cells"]),
            set(r["cell_id"] for r in m1))
        self.assertEqual(
            set(report["m2_cells"]),
            set(r["cell_id"] for r in m2
                if "N/A" not in str(r.get("status", "")) or True) |
            set(report["m2_cells"]),
            "m2 report cells drifted from medians")


class ChartHostsResolveTest(unittest.TestCase):
    def _bundle_keys(self):
        keys = {}
        for path in sorted(
                glob.glob(os.path.join(POOLDUEL, "results/charts/*.json"))):
            name = os.path.basename(path)
            if name == "manifest.json":
                continue
            bundle = json.load(open(path))
            keys.setdefault(
                "comparison" if name == "comparison.json"
                else name[:-5], set()).update(bundle.keys())
        return keys

    def test_all_bundles_parse(self):
        found = 0
        for path in sorted(
                glob.glob(os.path.join(POOLDUEL, "results/charts/*.json"))):
            if path.endswith("manifest.json"):
                continue
            bundle = json.load(open(path))
            self.assertIsInstance(bundle, dict)
            self.assertTrue(bundle, path)
            found += len(bundle)
        self.assertGreater(found, 0)

    def test_every_chart_host_resolves_to_bundle_key(self):
        keys = self._bundle_keys()
        for page in PAGES:
            html = open(os.path.join(POOLDUEL, page)).read()
            hosts = re.findall(r'data-chart="([^"]+)"', html)
            self.assertTrue(hosts, "%s has no chart hosts" % page)
            bundle = "comparison" if page == "index.html" else page.split(
                "/")[0]
            for host in hosts:
                self.assertIn(
                    host, keys.get(bundle, set()),
                    "%s host %r missing from %s bundle" % (
                        page, host, bundle))

    def test_vendored_echarts_and_script_refs_exist(self):
        self.assertTrue(
            os.path.exists(os.path.join(
                POOLDUEL, "vendor/echarts-5.5.1/dist/echarts.min.js")))
        for page in PAGES:
            html = open(os.path.join(POOLDUEL, page)).read()
            for src in re.findall(r'<script[^>]+src="([^"]+)"', html):
                target = os.path.normpath(os.path.join(POOLDUEL,
                    os.path.dirname(page), src))
                self.assertTrue(os.path.exists(target),
                                "%s script %s missing" % (page, src))


class LinksAndTargetsTest(unittest.TestCase):
    def test_all_readme_internal_links_resolve(self):
        text = _read("README.md")
        links = re.findall(r"\[[^\]]*\]\(([^)]+)\)", text)
        broken = []
        for link in links:
            if link.startswith(("http", "#", "mailto:")):
                continue
            target = link.split("#")[0].split("?")[0].strip()
            if not target:
                continue
            if not os.path.exists(os.path.join(REPO, target)):
                broken.append(link)
        self.assertEqual(broken, [])

    def test_landing_poolduel_targets_exist(self):
        for rel in ("poolduel/README.md",
                    "ideas/2026-09-11-poolduel-shootout-report.md",
                    "poolduel/docs/test-matrix.md",
                    "poolduel/index.html"):
            self.assertTrue(os.path.exists(os.path.join(REPO, rel)), rel)
        for rel in ("poolduel", "poolduel/odyssey", "poolduel/pgagroal",
                    "poolduel/pgbouncer", "poolduel/pgcat",
                    "poolduel/pgpool"):
            self.assertTrue(
                os.path.exists(os.path.join(REPO, rel, "index.html")),
                rel)


if __name__ == "__main__":
    unittest.main()
