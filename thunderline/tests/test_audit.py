#!/usr/bin/env python3
"""Thunderline Phase 3 gate: stems and reproducibility audit (stdlib only).

Renders the full track once to a temp dir, exports the score artifacts
beside it, and pins the audit contract: a clean tree passes every check,
and targeted sabotage (tampered stem, drifted lyrics, hostile blocklist,
deleted stem) fails exactly the right check. Also pins the audit CLI
(exit codes, --report JSON, bad-arg rejection).
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))

import render  # noqa: E402
import audit  # noqa: E402
from export_score import export_all  # noqa: E402

SONG = os.path.join(ROOT, "score", "song.json")
MIX = os.path.join(ROOT, "score", "mix.json")
AUDIT = os.path.join(ROOT, "tools", "audit.py")
SUBPROCESS_TIMEOUT = 120


def results_by_name(results):
    return {r["check"]: r for r in results}


def fresh_dist(testcase):
    """Copy the pristine rendered tree for a sabotage test."""
    tmp = tempfile.TemporaryDirectory()
    testcase.addCleanup(tmp.cleanup)
    shutil.copytree(testcase.dist, tmp.name, dirs_exist_ok=True)
    return tmp.name


class AuditGate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(SONG, "r", encoding="utf-8") as f:
            cls.song = json.load(f)
        with open(MIX, "r", encoding="utf-8") as f:
            cls.mix = json.load(f)
        cls._tmp = tempfile.TemporaryDirectory()
        cls.dist = cls._tmp.name
        assert export_all(cls.dist) == 0
        assert render.render_song(cls.song, cls.mix, cls.dist) == 0

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_clean_tree_passes_all_checks(self):
        results = audit.audit(self.dist)
        names = sorted(r["check"] for r in results)
        for expected in ("artifacts", "score-load", "wav-format", "duration",
                         "master-levels", "stems-audible", "stem-null",
                         "manifest", "lyric-coverage", "ip-scan", "energy",
                         "score-artifacts"):
            self.assertIn(expected, names, "audit dropped check: %s" % expected)
        failures = [r for r in results if not r["ok"]]
        self.assertEqual(failures, [], "clean tree should pass: %r" % failures)

    def test_stem_null_is_tight_not_just_under_tolerance(self):
        results = results_by_name(audit.audit(self.dist))
        detail = results["stem-null"]["detail"]
        rms_val = float(detail.split()[2])
        self.assertLess(rms_val, 0.005,
                        "stem-null reconstruction drifted: %s" % detail)

    def test_silenced_stem_breaks_manifest_and_null(self):
        dirty = fresh_dist(self)
        bass_p = os.path.join(dirty, "stems", "bass.wav")
        with open(bass_p, "r+b") as f:
            data = f.read()
            f.seek(44)  # keep the fixed header, silence the whole bus
            f.write(b"\x00" * (len(data) - 44))
        by_name = results_by_name(audit.audit(dirty))
        self.assertFalse(by_name["manifest"]["ok"], "tamper missed by manifest")
        self.assertFalse(by_name["stem-null"]["ok"], "tamper missed by null")
        self.assertTrue(by_name["ip-scan"]["ok"], "unrelated check flipped")

    def test_lyric_drift_detected(self):
        dirty = fresh_dist(self)
        lyrics_p = os.path.join(dirty, "lyrics.json")
        with open(lyrics_p, "r", encoding="utf-8") as f:
            exported = json.load(f)
        exported[3]["startSec"] = exported[3]["startSec"] + 5.0
        with open(lyrics_p, "w", encoding="utf-8") as f:
            json.dump(exported, f, indent=1, sort_keys=True)
            f.write("\n")
        by_name = results_by_name(audit.audit(dirty))
        self.assertFalse(by_name["lyric-coverage"]["ok"])
        self.assertTrue(by_name["manifest"]["ok"], "unrelated check flipped")

    def test_hostile_blocklist_hit_detected(self):
        with tempfile.NamedTemporaryFile("w", suffix=".txt",
                                         delete=False) as f:
            f.write("midnight\n")
            bl_path = f.name
        self.addCleanup(os.unlink, bl_path)
        by_name = results_by_name(audit.audit(self.dist,
                                              blocklist_path=bl_path))
        self.assertFalse(by_name["ip-scan"]["ok"])
        self.assertTrue(by_name["manifest"]["ok"], "unrelated check flipped")

    def test_missing_stem_detected(self):
        dirty = fresh_dist(self)
        os.unlink(os.path.join(dirty, "stems", "drums.wav"))
        by_name = results_by_name(audit.audit(dirty))
        self.assertFalse(by_name["artifacts"]["ok"])
        self.assertFalse(by_name["stems-audible"]["ok"])
        self.assertFalse(by_name["stem-null"]["ok"])
        self.assertTrue(by_name["ip-scan"]["ok"], "unrelated check flipped")

    def test_cli_exit_codes_report_and_bad_arg(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = os.path.join(tmp, "report.json")
            proc = subprocess.run(
                [sys.executable, AUDIT, "--dist", self.dist,
                 "--report", report],
                capture_output=True, text=True, cwd=REPO,
                timeout=SUBPROCESS_TIMEOUT)
            self.assertEqual(proc.returncode, 0, proc.stderr[-500:])
            self.assertIn("audit: ", proc.stdout)
            with open(report, encoding="utf-8") as f:
                rep = json.load(f)
            self.assertTrue(rep["passed"])
            self.assertEqual(len(rep["results"]),
                             len(audit.audit(self.dist)))
        bad = subprocess.run([sys.executable, AUDIT, "--bogus"],
                             capture_output=True, text=True, cwd=REPO,
                             timeout=60)
        self.assertNotEqual(bad.returncode, 0)
        missing = subprocess.run(
            [sys.executable, AUDIT, "--dist",
             os.path.join(self.dist, "does-not-exist")],
            capture_output=True, text=True, cwd=REPO, timeout=60)
        self.assertNotEqual(missing.returncode, 0)


if __name__ == "__main__":
    unittest.main()
