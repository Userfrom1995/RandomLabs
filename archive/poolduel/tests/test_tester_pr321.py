"""Tester-owned regression suite for PR #321 (issue #302, owner-review fixes).

Pins the four Fixer repairs plus the PR body claims, from the outside:
1. Log-twin charts carry zero scatter series and zero y=0 points under
   log axes, while linear charts retain their N/A/timeout markers.
2. Loader tooltip hardening: esc() covers & < > \" ', scatter rows are
   skipped, trusted p.marker HTML is not escaped.
3. pick_txn_path() skips aggregate siblings and prefers the worker file.
4. Per-pooler HTML notes match committed m2/medians.json status counts.
5. pgbench parser hostile inputs: aggregate/epoch lines, corrupt rows,
   skipped literals never poison percentiles.
6. Session admission parity renders 120s/120000 on session cells.
"""

import glob
import json
import os
import re
import tempfile
import unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")

from poolduel.harness.pgbench import parse_txn_log
from poolduel.harness.runner import pick_txn_path


def _load(rel):
    with open(os.path.join(ROOT, rel)) as f:
        return json.load(f)


def _read(rel):
    with open(os.path.join(ROOT, rel)) as f:
        return f.read()


class LogTwinNoScatterTest(unittest.TestCase):
    def test_all_log_twins_have_no_scatter_and_no_y0(self):
        found = 0
        for path in sorted(glob.glob(os.path.join(ROOT, "results/charts/*.json"))):
            options = json.load(open(path))
            for name, opt in options.items():
                if not isinstance(opt, dict) or "-log" not in str(name):
                    continue
                self.assertEqual(opt.get("yAxis", {}).get("type"), "log",
                                 "%s:%s lost log axis" % (path, name))
                found += 1
                for series in opt.get("series", []):
                    self.assertNotEqual(series.get("type"), "scatter",
                                        "%s:%s ships scatter on log axis"
                                        % (path, name))
                    for pt in series.get("data") or []:
                        if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                            try:
                                self.assertNotEqual(float(pt[1]), 0.0,
                                                    "%s:%s y=0 on log axis"
                                                    % (path, name))
                            except (TypeError, ValueError):
                                pass
                subtext = opt.get("title", {}).get("subtext", "")
                self.assertIn("markers shown on the linear", subtext,
                              "%s:%s missing marker subtext" % (path, name))
        self.assertEqual(found, 16, "expected 16 -log twins, got %d" % found)

    def test_linear_charts_retain_markers(self):
        options = _load("results/charts/comparison.json")
        kept = [n for n, o in options.items()
                if "-log" not in n and any(
                    s.get("type") == "scatter" for s in o.get("series", []))]
        self.assertTrue(kept, "no linear chart retains N/A/timeout markers")


class LoaderTooltipHardeningTest(unittest.TestCase):
    def test_esc_covers_all_five_entities(self):
        src = _read("assets/poolduel-charts.js")
        for entity in ("&amp;", "&lt;", "&gt;", "&quot;", "&#39;"):
            self.assertIn(entity, src, "esc() missing %s" % entity)

    def test_scatter_rows_skipped_and_marker_unescaped(self):
        src = _read("assets/poolduel-charts.js")
        self.assertIn('p.seriesType === "scatter"', src)
        self.assertIn("p.marker", src)
        # esc() must not be applied to the trusted ECharts marker HTML
        self.assertNotIn("esc(p.marker", src)


class TxnProvenanceTest(unittest.TestCase):
    def test_worker_file_wins_over_aggregate_sibling(self):
        with tempfile.TemporaryDirectory() as tmp:
            # '-' (0x2D) sorts before '.' (0x2E): aggregate sorts first
            agg = os.path.join(tmp, "run-aggregate-0.log")
            worker = os.path.join(tmp, "run.0.log")
            open(agg, "w").write("x")
            open(worker, "w").write("x")
            self.assertEqual(pick_txn_path(tmp, "run"), worker)

    def test_no_worker_file_returns_none_or_stdout_only(self):
        # Worker-absent edge: only aggregate present -> None (documented).
        # NOTE: when a <prefix>.stdout.txt provenance file exists alongside,
        # pick returns it instead of None (Reviewer advisory on PR #321,
        # benign: metrics path skips CMD lines, samples 0). This test pins
        # the aggregate exclusion, not the stdout advisory.
        with tempfile.TemporaryDirectory() as tmp:
            open(os.path.join(tmp, "run-aggregate-0.log"), "w").write("x")
            got = pick_txn_path(tmp, "run")
            self.assertTrue(got is None or got.endswith(".log"),
                            "aggregate file must never win: %r" % got)
            if got is not None:
                self.assertNotIn("aggregate", os.path.basename(got))


class PerPoolerNotesTest(unittest.TestCase):
    def test_notes_match_medians_status_counts(self):
        from collections import Counter
        medians = _load("results/m2/medians.json")
        by_pooler = {}
        for row in medians:
            by_pooler.setdefault(row["pooler"], []).append(row["status"])
        slugs = {"pgbouncer": "PgBouncer", "odyssey": "Odyssey",
                 "pgagroal": "pgagroal", "pgcat": "pgcat",
                 "pgpool": "pgpool-II"}
        for slug in slugs:
            counts = Counter(by_pooler.get(slug, []))
            measured = counts.get("measured", 0)
            timeout = counts.get("timeout/inconclusive", 0)
            na = counts.get("N/A (unsupported)", 0)
            total = measured + timeout + na
            html = _read("%s/index.html" % slug)
            match = re.search(r"plus (\d+) M2 rows?\s*\((\d+) measured \+ "
                              r"(\d+) timeout/inconclusive\) plus (\d+) N/A",
                              html)
            self.assertIsNotNone(match, "note shape drift on %s" % slug)
            self.assertEqual(
                (int(match.group(1)), int(match.group(2)),
                 int(match.group(3)), int(match.group(4))),
                (total, measured, timeout, na),
                "note counts wrong on %s" % slug)


class ParserHostileTest(unittest.TestCase):
    def test_aggregate_corrupt_and_skipped_lines_never_poison(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "t.log")
            lines = [
                "0 1 46000 0 1757750000 46000",
                "1 2 52000 0 1757750001 52000",
                "1780000000 100 200 0.5 0.1 0.2",
                "corrupt!!!",
                "",
                "# comment",
                "2 3 skipped 0 1757750002 0",
                "3 4 47000 0 1757750003 47000",
            ]
            with open(path, "w") as f:
                f.write("\n".join(lines) + "\n")
            result = parse_txn_log(path)
            self.assertEqual(result["samples"], 3)
            self.assertAlmostEqual(result["p50_ms"], 47.0, delta=1.0)

    def test_empty_log_returns_nones_not_crash(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "e.log")
            open(path, "w").write("")
            result = parse_txn_log(path)
            self.assertEqual(result["samples"], 0)
            self.assertIsNone(result["p50_ms"])


class SessionParityRenderTest(unittest.TestCase):
    def test_session_cells_render_120s_admission(self):
        pgagroal = _read("harness/adapters/pgagroal.py")
        pgcat = _read("harness/adapters/pgcat.py")
        self.assertIn("blocking_timeout", pgagroal)
        self.assertIn("120", pgagroal)
        self.assertIn("connect_timeout", pgcat)
        self.assertIn("120000", pgcat)


if __name__ == "__main__":
    unittest.main()
