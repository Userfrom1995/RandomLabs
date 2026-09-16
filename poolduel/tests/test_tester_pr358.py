"""Tester regression suite for PR #358 (issue #302, Poolduel verification sweep).

PR #358 is a log-only verification pass (progress/302-poolduel.md +28/-0,
no product change on top of M13b merge #357 at 01d3aca9). This suite pins
the sweep's re-verified claims so any future drift fails loudly:
committed truth (42 M1 + 111 M2 + 250 M9 + 36 soak medians, 162 soak raw),
statistics family 98 / headlines 96, sealed manifest (2401 raw files,
within budget), check.py green, repro.sh --dry-run rc=0 with the 12-row
pilot plan, honestly-open ledger state (supavisor stubs only, no
Verified-by in soak medians yet), and log hygiene (Refs not Closes,
em-dash free, Tester-scope routing). Authored by the Tester.
"""

import glob
import json
import os
import re
import subprocess
import unittest

RESULTS = os.path.join("poolduel", "results")
SOAK = os.path.join(RESULTS, "m10-soak")
PROGRESS = os.path.join("progress", "302-poolduel.md")


def medians(path):
    with open(path) as fh:
        data = json.load(fh)
    if isinstance(data, list):
        return data
    return data.get("rows", data.get("medians", []))


def all_raw():
    files = []
    for leg in ("m1", "m2", "m9", "m10-soak"):
        files += glob.glob(os.path.join(RESULTS, leg, "raw", "*"))
    return files


class PR358CommittedTruthTest(unittest.TestCase):
    def test_median_counts_per_leg(self):
        self.assertEqual(len(medians(os.path.join(RESULTS, "m1", "medians.json"))), 42)
        self.assertEqual(len(medians(os.path.join(RESULTS, "m2", "medians.json"))), 111)
        self.assertEqual(len(medians(os.path.join(RESULTS, "m9", "medians.json"))), 250)
        self.assertEqual(len(medians(os.path.join(SOAK, "medians.json"))), 36)

    def test_soak_raw_162(self):
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


class PR358GateCLITest(unittest.TestCase):
    def test_check_py_green(self):
        env = dict(os.environ, PYTHONPATH=".")
        proc = subprocess.run(
            ["python3", "poolduel/harness/check.py"],
            capture_output=True, text=True, timeout=120, env=env,
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr[-2000:])
        self.assertIn("poolduel check ok", proc.stdout)

    def test_repro_dry_run_rc0_12_row_pilot(self):
        proc = subprocess.run(
            ["bash", "poolduel/repro.sh", "--dry-run"],
            capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(proc.returncode, 0, msg=proc.stderr[-2000:])
        self.assertIn("plan=12", proc.stdout)


class PR358HonestOpensTest(unittest.TestCase):
    def test_supavisor_stubs_only(self):
        sup = [f for f in all_raw()
               if (json.load(open(f)).get("pooler") or "").strip() == "supavisor"]
        self.assertGreaterEqual(len(sup), 6)
        for f in sup:
            rec = json.load(open(f))
            cfg = rec.get("pooler_config") or ""
            text = cfg if isinstance(cfg, str) else json.dumps(cfg)
            self.assertTrue(text.startswith("N/A"), msg=f)

    def test_soak_medians_have_no_verified_by_ledger_yet(self):
        rows = medians(os.path.join(SOAK, "medians.json"))
        self.assertEqual(len(rows), 36)
        for row in rows:
            self.assertNotIn("Verified-by", row)


class PR358LogHygieneTest(unittest.TestCase):
    def test_sweep_section_uses_refs_not_closes(self):
        text = open(PROGRESS).read()
        sweep = text.split("## Verification sweep (Builder, 2026-09-16")[1]
        self.assertIn("Refs #302", sweep)
        self.assertNotIn("Closes #302", sweep)
        self.assertNotIn("Fixes #302", sweep)

    def test_sweep_section_routes_to_tester_scope(self):
        text = open(PROGRESS).read()
        sweep = text.split("## Verification sweep (Builder, 2026-09-16")[1]
        self.assertIn("no code change", sweep)
        self.assertIn("Tester sample-cell repro", sweep)

    def test_progress_log_em_dash_free(self):
        self.assertNotIn("\u2014", open(PROGRESS).read())


if __name__ == "__main__":
    unittest.main()
