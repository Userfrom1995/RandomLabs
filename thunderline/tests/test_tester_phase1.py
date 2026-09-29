#!/usr/bin/env python3
"""Tester Phase 1 regression pins for Thunderline composition source.

Durable black-box pins over the shipped entrypoint
`python3 thunderline/tools/export_score.py` (stdlib only):
live export determinism, fixed SMF header, lyric-timing derivation,
hostile validation rejections, and the IP blocklist guardrail.

Added by the Tester on PR #482 (Refs #481). Never touches production logic.
"""
import copy
import hashlib
import json
import os
import struct
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))

from export_score import load_score, validate, lyric_timings  # noqa: E402

SONG = os.path.join(ROOT, "score", "song.json")
MIX = os.path.join(ROOT, "score", "mix.json")
BLOCKLIST = os.path.join(ROOT, "score", "blocklist.txt")
EXPORTER = os.path.join(ROOT, "tools", "export_score.py")


def sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def run_exporter(cwd=REPO):
    return subprocess.run(
        [sys.executable, EXPORTER],
        capture_output=True, text=True, cwd=cwd, timeout=120,
    )


class TesterPhase1LivePins(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.song = load_score(SONG)

    def test_live_entrypoint_exports_three_artifacts(self):
        r = run_exporter()
        self.assertEqual(r.returncode, 0, "exporter failed: %s" % r.stderr[-500:])
        for name in ("song.mid", "sheet.html", "lyrics.json"):
            self.assertTrue(
                os.path.isfile(os.path.join(ROOT, "dist", name)),
                "missing derived artifact: %s" % name)

    def test_live_double_run_byte_identical(self):
        self.assertEqual(run_exporter().returncode, 0)
        first = {n: sha(os.path.join(ROOT, "dist", n))
                 for n in ("song.mid", "sheet.html", "lyrics.json")}
        self.assertEqual(run_exporter().returncode, 0)
        for name, digest in first.items():
            self.assertEqual(sha(os.path.join(ROOT, "dist", name)), digest,
                             "nondeterministic live export: %s" % name)

    def test_live_midi_fixed_header(self):
        self.assertEqual(run_exporter().returncode, 0)
        with open(os.path.join(ROOT, "dist", "song.mid"), "rb") as f:
            data = f.read()
        self.assertTrue(data.startswith(b"MThd"))
        fmt, ntracks, division = struct.unpack(">HHH", data[8:14])
        self.assertEqual(fmt, 0)
        self.assertEqual(ntracks, 1)
        self.assertEqual(division, 480)
        self.assertIn(b"MTrk", data)
        self.assertTrue(data.endswith(b"\x00\xff\x2f\x00"))
        self.assertGreater(len(data), 1000)

    def test_live_lyric_timings_derived_from_score(self):
        self.assertEqual(run_exporter().returncode, 0)
        with open(os.path.join(ROOT, "dist", "lyrics.json"),
                  encoding="utf-8") as f:
            disk = json.load(f)
        self.assertEqual(disk, lyric_timings(self.song))
        self.assertEqual(len(disk), len(self.song["lyrics"]))
        bpm = self.song["tempo"]["bpm"]
        for lyr, timed in zip(self.song["lyrics"], disk):
            self.assertEqual(timed["line"], lyr["line"])
            self.assertAlmostEqual(
                timed["startSec"], round(lyr["startBeat"] * 60.0 / bpm, 3))
            self.assertAlmostEqual(
                timed["endSec"], round(lyr["endBeat"] * 60.0 / bpm, 3))
            self.assertGreater(timed["endSec"], timed["startSec"])
            self.assertLessEqual(timed["endSec"], self.song["durationSec"])

    def test_hostile_bad_tempo_rejected(self):
        bad = copy.deepcopy(self.song)
        bad["tempo"]["bpm"] = 300
        errs = validate(bad)
        self.assertTrue(any("tempo" in e for e in errs),
                        "out-of-range tempo accepted: %r" % errs)

    def test_hostile_missing_melody_rejected(self):
        bad = copy.deepcopy(self.song)
        del bad["melody"]
        self.assertTrue(validate(bad), "missing melody key accepted")

    def test_hostile_negative_note_duration_rejected(self):
        bad = copy.deepcopy(self.song)
        bad["melody"][0]["durBeats"] = -1
        errs = validate(bad)
        self.assertTrue(any("duration" in e for e in errs),
                        "negative note duration accepted")

    def test_hostile_corrupt_score_file_fails_loudly(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json",
                                         delete=False) as f:
            f.write("{not valid json")
            path = f.name
        try:
            with self.assertRaises(Exception):
                load_score(path)
        finally:
            os.unlink(path)

    def test_hostile_missing_score_file_raises(self):
        with self.assertRaises(FileNotFoundError):
            load_score(os.path.join(tempfile.gettempdir(),
                                    "thunderline-no-such-score.json"))

    def test_blocklist_guardrail_independent_rescan(self):
        with open(BLOCKLIST, encoding="utf-8") as f:
            blocked = [ln.strip().lower() for ln in f
                       if ln.strip() and not ln.startswith("#")]
        self.assertGreaterEqual(len(blocked), 10)
        for lyr in self.song["lyrics"]:
            low = lyr["line"].lower()
            for frag in blocked:
                self.assertNotIn(frag, low,
                                 "lyric %r hits blocked fragment %r"
                                 % (lyr["line"], frag))

    def test_mix_constants_pinned(self):
        with open(MIX, encoding="utf-8") as f:
            mix = json.load(f)
        self.assertEqual(mix["sampleRate"], 44100)
        for bus in ("vocals", "guitars", "bass", "drums"):
            self.assertIn(bus, mix["buses"])
        self.assertLessEqual(mix["masterCeiling"], 1.0)

    def test_score_duration_gate_independent(self):
        expect = round(self.song["totalBeats"] * 60.0
                       / self.song["tempo"]["bpm"], 3)
        self.assertAlmostEqual(self.song["durationSec"], expect, places=3)
        self.assertGreaterEqual(self.song["durationSec"], 150.0)
        self.assertLessEqual(self.song["durationSec"], 210.0)

    def test_no_em_dash_in_lyrics(self):
        for lyr in self.song["lyrics"]:
            self.assertNotIn("\u2014", lyr["line"],
                             "em dash in lyric: %r" % lyr["line"])


if __name__ == "__main__":
    unittest.main()
