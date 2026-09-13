"""Tester-owned hostile regression suite for PR #320 (issue #302, M4).

Tier-1 `test_charts.py` pins the happy path (template sameness, palette,
zero hand values, furniture, offline-clean). This suite red-teams AROUND
it: corrupt/degenerate generator inputs, CLI failure atomicity (no partial
chart writes), serving contract (every page + asset + chart JSON over
HTTP), loader host resolution, vendor integrity, banner state, and the
exact chart-count contract (8 comparison figures, own-m1/own-m2 per
pooler page).
"""

import hashlib
import http.server
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.request
from functools import partial

from poolduel.harness import charts as charts_mod

ROOT = os.path.join(os.path.dirname(__file__), "..")
POOLDUEL = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "poolduel"))
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _load(rel):
    with open(os.path.join(ROOT, rel)) as f:
        return json.load(f)


def _read(rel):
    with open(os.path.join(ROOT, rel)) as f:
        return f.read()


class ChartsCliHostileTest(unittest.TestCase):
    def _run(self, *args):
        return subprocess.run(
            [sys.executable, "poolduel/harness/charts.py"] + list(args),
            capture_output=True, text=True, cwd=REPO)

    def test_missing_input_fails_loud_with_convention(self):
        with tempfile.TemporaryDirectory() as tmp:
            proc = self._run("--m1", "/nonexistent/a.json", "--out", tmp)
            self.assertNotEqual(proc.returncode, 0)
            self.assertIn("FAILED", proc.stderr)
            self.assertEqual(os.listdir(tmp), [],
                             "failure must not leave partial artifacts")

    def test_malformed_json_fails_loud(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = os.path.join(tmp, "bad.json")
            with open(bad, "w") as f:
                f.write("{not json")
            proc = self._run("--m1", bad, "--out",
                             os.path.join(tmp, "out"))
            self.assertNotEqual(proc.returncode, 0)
            self.assertIn("FAILED", proc.stderr)

    def test_empty_median_list_fails_loud(self):
        with tempfile.TemporaryDirectory() as tmp:
            empty = os.path.join(tmp, "empty.json")
            with open(empty, "w") as f:
                f.write("[]")
            proc = self._run("--m1", empty, "--out",
                             os.path.join(tmp, "out"))
            self.assertNotEqual(proc.returncode, 0)
            self.assertIn("FAILED", proc.stderr)
            self.assertFalse(os.path.exists(os.path.join(tmp, "out")))

    def test_schema_violating_entry_fails_loud_not_silent(self):
        # Entries missing cell_id/pooler are corrupt fixtures: the
        # generator must fail loudly, never emit zero-filled charts.
        bad = [{"status": "measured",
                "tps": {"median": 1, "min": 1, "max": 1}}]
        with self.assertRaises(Exception):
            charts_mod.build_options(bad, [], {})

    def test_schema_violation_writes_no_partial_charts(self):
        with tempfile.TemporaryDirectory() as tmp:
            m1 = os.path.join(tmp, "m1.json")
            with open(m1, "w") as f:
                json.dump([{"status": "measured",
                            "tps": {"median": 1, "min": 1, "max": 1}}], f)
            out = os.path.join(tmp, "out")
            proc = self._run("--m1", m1, "--out", out)
            self.assertNotEqual(proc.returncode, 0)
            produced = []
            if os.path.isdir(out):
                produced = [p for p in os.listdir(out)
                            if p.endswith(".json")]
            self.assertEqual(produced, [],
                             "corrupt input must not yield chart JSON: %r"
                             % produced)


class DegenerateButValidTest(unittest.TestCase):
    def test_none_and_missing_tps_become_nulls(self):
        m1 = [
            {"cell_id": "X", "pooler": "pgbouncer", "status": "measured",
             "tps": None},
            {"cell_id": "Y", "pooler": "pgbouncer", "status": "measured"},
        ]
        pages = charts_mod.build_options(m1, [], {})
        blob = json.dumps(pages)  # must stay JSON-serializable
        self.assertIn("X", blob)
        opt = pages["comparison"]["m1-best"]
        self.assertEqual(opt["yAxis"]["min"], 0)
        for series in opt["series"]:
            if series.get("type") != "bar":
                continue
            for point in series["data"]:
                self.assertTrue(point is None or isinstance(point, (int, float)))

    def test_unknown_status_never_zero_fills(self):
        m1 = [{"cell_id": "X", "pooler": "pgbouncer", "status": "weird!!",
               "tps": {"median": 5, "min": 4, "max": 6}}]
        pages = charts_mod.build_options(m1, [], {})
        for series in pages["comparison"]["m1-best"]["series"]:
            if series.get("type") != "bar":
                continue
            for point in series["data"]:
                self.assertNotEqual(point, 5 // 1 - 5, "placeholder leak")
                self.assertTrue(point is None or isinstance(point, (int, float)))

    def test_empty_inputs_still_emit_all_six_pages(self):
        pages = charts_mod.build_options([], [], {})
        self.assertEqual(sorted(pages),
                         ["comparison", "odyssey", "pgagroal",
                          "pgbouncer", "pgcat", "pgpool"])


class ChartCountContractTest(unittest.TestCase):
    def test_comparison_figures_linear_plus_log_twins(self):
        options = _load("results/charts/comparison.json")
        self.assertEqual(
            sorted(options),
            ["flatness", "iso-overlay", "m1-best", "m1-best-log",
             "m2-io", "m2-io-log", "m2-prepared", "m2-prepared-log",
             "m2-session", "m2-session-log", "m2-statement",
             "m2-statement-log", "m2-workloads", "m2-workloads-log"])

    def test_pooler_pages_have_own_m1_and_own_m2(self):
        for slug in charts_mod.PAGE_POOLERS:
            options = _load("results/charts/%s.json" % slug)
            self.assertEqual(sorted(options),
                             ["own-m1", "own-m1-log", "own-m2", "own-m2-log"],
                             "chart drift on %s" % slug)

    def test_manifest_lists_all_six_pages(self):
        manifest = _load("results/charts/manifest.json")
        self.assertEqual(sorted(manifest["pages"]),
                         ["comparison", "odyssey", "pgagroal",
                          "pgbouncer", "pgcat", "pgpool"])

    def test_manifest_page_shas_match_files(self):
        manifest = _load("results/charts/manifest.json")
        for page, meta in manifest["pages"].items():
            path = os.path.join(ROOT, "results/charts", meta["file"])
            digest = hashlib.sha256()
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    digest.update(chunk)
            self.assertEqual(meta["sha256"], digest.hexdigest(),
                             "stale manifest SHA for %s" % page)


class VendorIntegrityTest(unittest.TestCase):
    def test_bundle_matches_version_pin(self):
        version = _read("vendor/VERSION")
        pinned = re.search(r"sha256:\s*([0-9a-f]{64})", version)
        self.assertIsNotNone(pinned, "VERSION pin missing sha256")
        digest = hashlib.sha256()
        with open(os.path.join(
                ROOT, "vendor/echarts-5.5.1/dist/echarts.min.js"), "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                digest.update(chunk)
        self.assertEqual(digest.hexdigest(), pinned.group(1))

    def test_bundle_is_real_and_licensed(self):
        path = os.path.join(
            ROOT, "vendor/echarts-5.5.1/dist/echarts.min.js")
        self.assertGreater(os.path.getsize(path), 500000,
                           "vendor bundle suspiciously small")
        self.assertTrue(os.path.isfile(os.path.join(
            ROOT, "vendor/echarts-5.5.1/LICENSE")))
        with open(path) as f:
            blob = f.read()
        self.assertIn("setOption", blob)
        self.assertIn("5.5.1", blob)


class BannerAndHeadingsTest(unittest.TestCase):
    def test_status_banner_is_published(self):
        html = _read("index.html")
        match = re.search(
            r'<div class="banner[^"]*"[^>]*>.*?</div>', html, re.S)
        self.assertIsNotNone(match)
        self.assertIn("published", match.group(0).lower())
        self.assertNotIn('class="banner pending"', html)

    def test_no_stale_pending_section_headings(self):
        html = _read("index.html")
        for tag in re.findall(r"<h[23][^>]*>(.*?)</h[23]>", html, re.S):
            text = re.sub(r"<[^>]+>", "", tag).strip().lower()
            self.assertNotIn("pending", text,
                             "stale pending heading: %r" % text[:80])


class ServingContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = partial(http.server.SimpleHTTPRequestHandler,
                          directory=POOLDUEL)
        cls._server = http.server.HTTPServer(("127.0.0.1", 0), handler)
        cls.port = cls._server.server_address[1]
        cls._thread = threading.Thread(
            target=cls._server.serve_forever, daemon=True)
        cls._thread.start()

    @classmethod
    def tearDownClass(cls):
        cls._server.shutdown()
        cls._thread.join(timeout=5)

    def _get(self, path):
        with urllib.request.urlopen(
                "http://127.0.0.1:%d/%s" % (self.port, path),
                timeout=10) as resp:
            self.assertEqual(resp.status, 200, path)
            return resp.read()

    def test_all_pages_serve_200(self):
        for path in ["index.html", "pgagroal/index.html",
                     "pgbouncer/index.html", "pgpool/index.html",
                     "odyssey/index.html", "pgcat/index.html"]:
            body = self._get(path)
            self.assertGreater(len(body), 1000, path)

    def test_loader_vendor_and_chart_json_serve_200(self):
        self.assertGreater(
            len(self._get("assets/poolduel-charts.js")), 500)
        self.assertGreater(
            len(self._get("vendor/echarts-5.5.1/dist/echarts.min.js")),
            500000)
        for page in ["comparison", "pgbouncer", "pgpool", "pgcat",
                     "pgagroal", "odyssey"]:
            body = self._get("results/charts/%s.json" % page)
            self.assertTrue(json.loads(body), page)

    def test_every_host_resolves_to_a_served_option(self):
        for slug in ["comparison"] + list(charts_mod.PAGE_POOLERS):
            rel = ("index.html" if slug == "comparison"
                   else "%s/index.html" % slug)
            html = self._get(rel).decode("utf-8")
            hosts = re.findall(
                r'class="echart" data-page="([^"]+)" data-chart="([^"]+)"',
                html)
            self.assertTrue(hosts, "no chart hosts on %s" % slug)
            seen_pages = {page for page, _ in hosts}
            options = {}
            for page in seen_pages:
                options[page] = json.loads(
                    self._get("results/charts/%s.json" % page))
            for page, chart in hosts:
                self.assertIn(chart, options[page],
                              "%s/%s host has no served option"
                              % (slug, chart))


if __name__ == "__main__":
    unittest.main()
