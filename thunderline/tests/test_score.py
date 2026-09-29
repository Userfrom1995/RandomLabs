#!/usr/bin/env python3
"""Thunderline Phase 1 gate: composition source schema, musical integrity,
lyric coverage, IP blocklist scan, and export determinism (stdlib only)."""
import hashlib
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))

from export_score import load_score, validate, export_all  # noqa: E402

SONG = os.path.join(ROOT, "score", "song.json")
MIX = os.path.join(ROOT, "score", "mix.json")
BLOCKLIST = os.path.join(ROOT, "score", "blocklist.txt")


def sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


class ScoreGate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.song = load_score(SONG)
        with open(MIX, "r", encoding="utf-8") as f:
            cls.mix = json.load(f)
        with open(BLOCKLIST, "r", encoding="utf-8") as f:
            cls.blocked = [ln.strip().lower() for ln in f
                           if ln.strip() and not ln.startswith("#")]

    def test_schema_valid(self):
        self.assertEqual(validate(self.song), [])

    def test_duration_gate(self):
        self.assertGreaterEqual(self.song["durationSec"], 150.0)
        self.assertLessEqual(self.song["durationSec"], 210.0)
        self.assertEqual(self.song["tempo"]["bpm"], 160)

    def test_skeleton_sections_present(self):
        names = [s["section"] for s in self.song["form"]]
        for need in ("intro", "verse1", "chorus1", "verse2", "chorus2",
                     "leadbreak", "finalchorus", "outro"):
            self.assertIn(need, names)
        bars = {s["section"]: s["bars"] for s in self.song["form"]}
        self.assertGreaterEqual(bars["intro"], 4)
        self.assertGreaterEqual(bars["verse1"], 12)
        self.assertGreaterEqual(bars["chorus1"], 8)
        self.assertGreaterEqual(bars["leadbreak"], 12)
        self.assertGreaterEqual(bars["finalchorus"], 8)
        self.assertGreaterEqual(bars["outro"], 4)

    def test_melody_singable(self):
        for n in self.song["melody"]:
            self.assertGreaterEqual(n["midi"], 40)
            self.assertLessEqual(n["midi"], 84)
            self.assertGreater(n["durBeats"], 0)

    def test_full_coverage_every_bar(self):
        by_bar = {a["bar"]: a for a in self.song["arrangement"]}
        for c in self.song["chords"]:
            a = by_bar[c["bar"]]
            self.assertTrue(a["rhythm"])
            self.assertTrue(a["bass"])
            self.assertTrue(a["front"])

    def test_solo_distinct_from_verse(self):
        verse = sorted(n["midi"] for n in self.song["melody"]
                       if n.get("section") == "verse1")
        solo = sorted(n["midi"] for n in self.song["leadGuitar"]
                      if n.get("section") == "leadbreak")
        self.assertTrue(solo)
        self.assertNotEqual(verse, solo)
        # solo sits higher on average than the verse vocal
        self.assertGreater(sum(solo) / len(solo), sum(verse) / len(verse))

    def test_dynamics_lift_final(self):
        def mean(sec):
            vals = [a["dynamics"] for a in self.song["arrangement"]
                    if a["section"] == sec]
            return sum(vals) / len(vals)
        self.assertGreater(mean("finalchorus"), mean("verse1"))

    def test_lyric_timing_inside_bounds(self):
        total = self.song["totalBeats"]
        prev = -1.0
        for lyr in self.song["lyrics"]:
            self.assertGreater(lyr["endBeat"], lyr["startBeat"])
            self.assertGreaterEqual(lyr["startBeat"], 0)
            self.assertLessEqual(lyr["endBeat"], total)
            self.assertGreaterEqual(lyr["startBeat"], prev,
                                    "lyrics out of order: %r" % lyr)
            prev = lyr["startBeat"]
        self.assertGreaterEqual(len(self.song["lyrics"]), 20)

    def test_hook_present(self):
        lines = [l["line"] for l in self.song["lyrics"]]
        self.assertTrue(any("thunderline" in l.lower() for l in lines))

    def test_blocklist_clean(self):
        for lyr in self.song["lyrics"]:
            low = lyr["line"].lower()
            for frag in self.blocked:
                self.assertNotIn(frag, low,
                                 "lyric %r contains blocked fragment %r" % (lyr["line"], frag))

    def test_mix_constants(self):
        for bus in ("vocals", "guitars", "bass", "drums"):
            self.assertIn(bus, self.mix["buses"])
        self.assertLessEqual(self.mix["masterCeiling"], 1.0)
        self.assertEqual(self.mix["sampleRate"], 44100)

    def test_export_deterministic(self):
        with tempfile.TemporaryDirectory() as t1, tempfile.TemporaryDirectory() as t2:
            self.assertEqual(export_all(t1), 0)
            self.assertEqual(export_all(t2), 0)
            for name in ("song.mid", "sheet.html", "lyrics.json"):
                self.assertEqual(sha(os.path.join(t1, name)),
                                 sha(os.path.join(t2, name)),
                                 "nondeterministic export: %s" % name)

    def test_midi_parses(self):
        with tempfile.TemporaryDirectory() as t:
            self.assertEqual(export_all(t), 0)
            with open(os.path.join(t, "song.mid"), "rb") as f:
                data = f.read()
        self.assertTrue(data.startswith(b"MThd"))
        self.assertIn(b"MTrk", data)
        self.assertGreater(len(data), 1000)

    def test_sheet_has_title_and_chords(self):
        with tempfile.TemporaryDirectory() as t:
            self.assertEqual(export_all(t), 0)
            with open(os.path.join(t, "sheet.html"), encoding="utf-8") as f:
                html = f.read()
        self.assertIn("Thunderline", html)
        self.assertIn("E7", html)
        self.assertIn("midnight", html.lower())


if __name__ == "__main__":
    unittest.main()
