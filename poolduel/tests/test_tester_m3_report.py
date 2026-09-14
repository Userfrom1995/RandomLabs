"""Tester hostile regression suite for poolduel M3 report engine (Refs #302).

Locks the Reviewer/Fixer findings plus dynamic verification of the
publication layer: mixed-status median nulling, flatness schema symmetry,
load_raw resilience to corrupt/sidecar/schema-invalid payloads,
empty-input grace, CSV quoting, all-N/A best listing, flatness boundary,
CLI loud failures, repro.sh DB-free plan/report modes, and the Pages
report live-hook contract (results/-only fetches, esc() on innerHTML).

All hermetic except the repro.sh subprocess probes (sh + python3 only,
never pgbench/psql) and the node --check probe (skipped if node absent).
"""

import csv
import io
import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest

from poolduel.harness import report
from poolduel.tests.test_report import make_rec, trio

REPO_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPRO = os.path.join(REPO_ROOT, "poolduel", "repro.sh")
PAGE = os.path.join(REPO_ROOT, "poolduel", "index.html")


class M3MixedStatusNullTest(unittest.TestCase):
    def test_mixed_status_emits_null_medians_not_partial(self):
        recs = trio("M1-1", "pgbouncer", [1000.0, 1100.0, 1200.0],
                    [2.0, 2.1, 2.2])
        bad = make_rec("M1-1", "pgbouncer", 4, status="timeout/inconclusive")
        med = report.aggregate(recs + [bad])
        self.assertEqual(med[0]["status"], "timeout/inconclusive")
        for metric in report.METRIC_KEYS:
            self.assertIsNone(med[0][metric]["median"], metric)
            self.assertIsNone(med[0][metric]["min"], metric)
            self.assertIsNone(med[0][metric]["max"], metric)

    def test_mixed_status_csv_stays_empty_never_partial(self):
        recs = trio("M1-1", "pgbouncer", [1000.0, 1100.0, 1200.0],
                    [2.0, 2.1, 2.2])
        bad = make_rec("M1-1", "pgbouncer", 4, status="timeout/inconclusive")
        rows = list(csv.DictReader(
            io.StringIO(report.matrix_csv(report.aggregate(recs + [bad])))))
        self.assertEqual(rows[0]["status"], "timeout/inconclusive")
        self.assertEqual(rows[0]["tps_median"], "")


class M3FlatnessSymmetryTest(unittest.TestCase):
    def test_single_point_carries_null_trough(self):
        single = trio("C1", "odyssey", [900.0, 950.0, 1000.0], [2.4, 2.5, 2.6])
        flat = report.flatness(report.aggregate(single))
        self.assertEqual(flat["odyssey"]["verdict"], "single-point")
        self.assertIsNone(flat["odyssey"]["peak"])
        self.assertIn("trough", flat["odyssey"])
        self.assertIsNone(flat["odyssey"]["trough"])
        self.assertIsNone(flat["odyssey"]["spread"])

    def test_boundary_spread_at_or_below_15pct_is_flat(self):
        recs = (trio("C1", "pgbouncer", [990.0, 1000.0, 1010.0],
                     [2.0, 2.1, 2.2])
                + trio("C2", "pgbouncer", [1140.0, 1150.0, 1160.0],
                       [1.9, 2.0, 2.1]))
        flat = report.flatness(report.aggregate(recs))
        self.assertLessEqual(flat["pgbouncer"]["spread"], 0.15)
        self.assertEqual(flat["pgbouncer"]["verdict"], "flat")
        self.assertEqual(flat["pgbouncer"]["peak"]["cell_id"], "C2")
        self.assertEqual(flat["pgbouncer"]["trough"]["cell_id"], "C1")


class M3LoadRawHostileTest(unittest.TestCase):
    def test_corrupt_sidecar_and_schema_invalid_never_crash(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, "raw")
            os.makedirs(raw)
            with open(os.path.join(raw, "garbage.json"), "w") as f:
                f.write("{not json")
            with open(os.path.join(raw, "sidecar.json"), "w") as f:
                json.dump({"completed": []}, f)
            rec = make_rec("M1-1", "direct", 1, tps=900.0, p99=2.5)
            with open(os.path.join(raw, "ok.json"), "w") as f:
                json.dump(rec, f)
            bad = dict(rec)
            bad["tps"] = 0  # measured zero is schema-invalid
            with open(os.path.join(raw, "bad.json"), "w") as f:
                json.dump(bad, f)
            recs, errors = report.load_raw([raw])
            self.assertEqual(len(recs), 1)
            self.assertGreaterEqual(len(errors), 2)
            self.assertTrue(any("unreadable" in e for e in errors))
            self.assertTrue(any("schema" in e for e in errors))


class M3EmptyInputTest(unittest.TestCase):
    def test_empty_inputs_degrade_gracefully_never_crash(self):
        self.assertEqual(report.aggregate([]), [])
        self.assertEqual(report.per_cell_best([]), {})
        self.assertEqual(report.pairwise([]), {})
        self.assertEqual(report.iso_regions([]), [])
        self.assertEqual(report.flatness([]), {})
        rows = list(csv.DictReader(io.StringIO(report.matrix_csv([]))))
        self.assertEqual(rows, [])
        bundle = report.build_bundle([], [])
        self.assertEqual(bundle["measured"], 0)
        self.assertEqual(bundle["na"], 0)

    def test_all_na_cell_listed_never_ranked(self):
        recs = [make_rec("M2-T9", "pgcat", 1, status="N/A (unsupported)")]
        best = report.per_cell_best(report.aggregate(recs))
        self.assertEqual(best["M2-T9"]["ranked"], [])
        self.assertEqual(best["M2-T9"]["na"],
                         [{"pooler": "pgcat", "status": "N/A (unsupported)"}])

    def test_csv_quoting_roundtrips_hostile_cell_id(self):
        recs = trio('M1-1,evil"cell', "pgbouncer",
                    [2000.0, 2100.0, 2200.0], [1.0, 1.1, 1.2])
        rows = list(csv.DictReader(
            io.StringIO(report.matrix_csv(report.aggregate(recs)))))
        self.assertEqual(rows[0]["cell_id"], 'M1-1,evil"cell')


class M3CliLoudFailureTest(unittest.TestCase):
    def test_cli_no_dirs_is_usage_error(self):
        with self.assertRaises(SystemExit) as ctx:
            report.main([])
        self.assertNotEqual(ctx.exception.code, 0)

    def test_cli_empty_results_fails_loudly(self):
        with tempfile.TemporaryDirectory() as tmp:
            empty = os.path.join(tmp, "empty")
            os.makedirs(os.path.join(empty, "raw"))
            self.assertEqual(
                report.main(["--m1-dir", empty,
                             "--out", os.path.join(tmp, "out")]), 1)

    def test_cli_builds_bundle_and_csvs_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp:
            m1 = os.path.join(tmp, "m1res")
            os.makedirs(os.path.join(m1, "raw"))
            for rec in trio("M1-1", "direct", [900.0, 950.0, 1000.0],
                            [2.4, 2.5, 2.6]):
                with open(os.path.join(
                        m1, "raw",
                        "M1-1-direct-r%d.json" % rec["repeat"]), "w") as f:
                    json.dump(rec, f)
            out = os.path.join(tmp, "out")
            self.assertEqual(report.main(["--m1-dir", m1, "--out", out]), 0)
            for path in ("m1/medians.json", "m1/matrix.csv",
                         "m2/medians.json", "m2/matrix.csv", "report.json"):
                self.assertTrue(os.path.exists(os.path.join(out, path)), path)
            bundle = json.load(open(os.path.join(out, "report.json")))
            for key in ("best", "pairwise", "iso_regions", "flatness",
                        "measured", "na", "pg_version", "pooler_versions"):
                self.assertIn(key, bundle)


class M3ReproModesTest(unittest.TestCase):
    def _run(self, args, env_extra=None):
        env = dict(os.environ)
        env.update(env_extra or {})
        return subprocess.run(
            ["sh", REPRO] + args, capture_output=True, text=True,
            cwd=REPO_ROOT, env=env, timeout=120)

    def test_dry_run_plans_pilot_without_measuring(self):
        proc = self._run(["--dry-run"])
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("plan=12", proc.stdout)

    def test_m2_dry_run_plans_full_matrix(self):
        proc = self._run(["--m2-dry-run"])
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("plan=312", proc.stdout)

    def test_report_with_no_sweep_data_fails_loudly(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = {"OUT": os.path.join(tmp, "m1"),
                   "M2OUT": os.path.join(tmp, "m2"),
                   "M9OUT": os.path.join(tmp, "m9")}
            proc = self._run(["--report"], env_extra=env)
            self.assertNotEqual(proc.returncode, 0)
            combined = proc.stdout + proc.stderr
            self.assertIn("no sweep data", combined)
            self.assertIn("not inventing numbers", combined)


class M3PageContractTest(unittest.TestCase):
    def _js(self):
        with open(PAGE) as f:
            src = f.read()
        return src.split("<script>")[1].split("</script>")[0]

    def test_page_fetches_results_only_and_stays_pending(self):
        js = self._js()
        urls = set(re.findall(r'"(results/[^"]+)"', js))
        self.assertEqual(urls,
                         {"results/m1/medians.json", "results/report.json",
                          "results/pagemeta.json"})
        self.assertIn("pending", js)
        self.assertIn("function esc", js)

    def test_page_js_parses_clean(self):
        if shutil.which("node") is None:
            self.skipTest("node not installed")
        with tempfile.NamedTemporaryFile(
                "w", suffix=".js", delete=False) as f:
            f.write(self._js())
            path = f.name
        try:
            proc = subprocess.run(["node", "--check", path],
                                  capture_output=True, text=True, timeout=60)
            self.assertEqual(proc.returncode, 0, proc.stderr)
        finally:
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
