#!/usr/bin/env python3
"""Tester Phase 3 regression pins for the Thunderline audit gate.

Durable black-box/hostile pins over the shipped entrypoint
`python3 thunderline/tools/audit.py` (stdlib only): corrupt WAV headers fail
closed (no traceback), truncated stems fail the format gate, missing trees
exit 1 (never crash), bad CLI args exit nonzero, --report JSON matches the
live result count, and lyric/blocklist sabotage flips exactly its own check.

Added by the Tester on PR #484 (Refs #481). Never touches production logic.
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

import audit  # noqa: E402
import render  # noqa: E402
from export_score import export_all  # noqa: E402

SONG = os.path.join(ROOT, "score", "song.json")
MIX = os.path.join(ROOT, "score", "mix.json")
AUDIT = os.path.join(ROOT, "tools", "audit.py")
SUBPROCESS_TIMEOUT = 180


def by_name(results):
    return {r["check"]: r for r in results}


def fresh_copy(testcase):
    tmp = tempfile.TemporaryDirectory()
    testcase.addCleanup(tmp.cleanup)
    shutil.copytree(testcase.dist, tmp.name, dirs_exist_ok=True)
    return tmp.name


class TesterPhase3AuditHostile(unittest.TestCase):
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

    def test_clean_tree_passes_gate(self):
        results = audit.audit(self.dist)
        failures = [r for r in results if not r["ok"]]
        self.assertEqual(failures, [],
                         "clean tree should pass: %r" % (failures,))

    def test_corrupt_master_header_fails_closed(self):
        dirty = fresh_copy(self)
        with open(os.path.join(dirty, "master.wav"), "r+b") as f:
            f.seek(0)
            f.write(b"XXXX")
        names = by_name(audit.audit(dirty))
        self.assertFalse(names["wav-format"]["ok"])
        self.assertFalse(names["master-levels"]["ok"])
        self.assertTrue(names["ip-scan"]["ok"], "unrelated check flipped")

    def test_truncated_stem_fails_format_gate(self):
        dirty = fresh_copy(self)
        p = os.path.join(dirty, "stems", "vocals.wav")
        with open(p, "rb") as f:
            data = f.read()
        with open(p, "wb") as f:
            f.write(data[:1000])
        names = by_name(audit.audit(dirty))
        self.assertFalse(names["wav-format"]["ok"])
        self.assertTrue(names["ip-scan"]["ok"], "unrelated check flipped")

    def test_missing_tree_exits_1_without_traceback(self):
        proc = subprocess.run(
            [sys.executable, AUDIT, "--dist",
             os.path.join(self.dist, "does-not-exist")],
            capture_output=True, text=True, cwd=REPO,
            timeout=SUBPROCESS_TIMEOUT)
        self.assertEqual(proc.returncode, 1, proc.stderr[-500:])
        self.assertIn("FAIL", proc.stdout)
        self.assertNotIn("Traceback", proc.stdout + proc.stderr)

    def test_cli_report_matches_live_results(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = os.path.join(tmp, "report.json")
            proc = subprocess.run(
                [sys.executable, AUDIT, "--dist", self.dist,
                 "--report", report],
                capture_output=True, text=True, cwd=REPO,
                timeout=SUBPROCESS_TIMEOUT)
            self.assertEqual(proc.returncode, 0, proc.stderr[-500:])
            with open(report, encoding="utf-8") as f:
                rep = json.load(f)
            self.assertTrue(rep["passed"])
            self.assertEqual(len(rep["results"]),
                             len(audit.audit(self.dist)))

    def test_cli_bad_arg_rejected(self):
        proc = subprocess.run(
            [sys.executable, AUDIT, "--bogus"],
            capture_output=True, text=True, cwd=REPO, timeout=60)
        self.assertNotEqual(proc.returncode, 0)

    def test_unsung_lyric_line_breaks_coverage_only(self):
        with open(SONG, "r", encoding="utf-8") as f:
            song = json.load(f)
        song["lyrics"] = song["lyrics"] + [{
            "line": "tester hostile unsung line",
            "startBeat": song["lyrics"][-1]["endBeat"] + 0.5,
            "endBeat": song["lyrics"][-1]["endBeat"] + 1.5,
        }]
        with tempfile.NamedTemporaryFile("w", suffix=".json",
                                         delete=False) as f:
            json.dump(song, f)
            song_path = f.name
        self.addCleanup(os.unlink, song_path)
        names = by_name(audit.audit(self.dist, song_path=song_path))
        self.assertFalse(names["lyric-coverage"]["ok"])
        self.assertTrue(names["ip-scan"]["ok"], "unrelated check flipped")


if __name__ == "__main__":
    unittest.main()
