#!/usr/bin/env python3
"""Tester Phase 2 regression pins for the Thunderline deterministic render.

Durable black-box/hostile pins over the shipped entrypoint
`python3 thunderline/tools/render.py` (stdlib only): wavetable determinism,
per-voice stream independence, buffer-fit truncation (no wrap), envelope
shapes, formant determinism, CLI contract, WAV header shape, and a tiny
in-memory double-render determinism + peak-gate probe (fast: ~3 s of audio,
no 156 s render).

Added by the Tester on PR #483 (Refs #481). Never touches production logic.
"""
import array
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

import render  # noqa: E402

SONG = os.path.join(ROOT, "score", "song.json")
MIX = os.path.join(ROOT, "score", "mix.json")
RENDER = os.path.join(ROOT, "tools", "render.py")


def tiny_song():
    with open(SONG, encoding="utf-8") as f:
        full = json.load(f)
    song = copy.deepcopy(full)
    song["totalBars"] = 2
    song["durationSec"] = 3.0
    song["chords"] = [{"bar": 0, "chord": "E7"}, {"bar": 1, "chord": "A7"}]
    song["arrangement"] = [
        {"bar": 0, "bass": "walking", "drums": "backbeat", "dynamics": 1.0,
         "front": "leadVocal", "rhythm": "powerChords", "section": "verse1"},
        {"bar": 1, "bass": "walking", "drums": "halfTime", "dynamics": 1.0,
         "front": "leadGuitar", "rhythm": "powerChords", "section": "verse1"},
    ]
    song["melody"] = [dict(n, startBeat=min(n["startBeat"], 3.0))
                      for n in full["melody"] if n["startBeat"] < 4.0][:4]
    for n in song["melody"]:
        n["durBeats"] = min(n["durBeats"], 0.5)
    song["leadGuitar"] = [dict(n, startBeat=4.0 + (n["startBeat"] % 2.0))
                          for n in full["leadGuitar"] if n["startBeat"] < 12.0][:4]
    for n in song["leadGuitar"]:
        n["durBeats"] = min(n["durBeats"], 0.5)
    return song


def tiny_mix():
    with open(MIX, encoding="utf-8") as f:
        return json.load(f)


def sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


class TesterPhase2RenderPins(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.song = tiny_song()
        cls.mix = tiny_mix()
        cls.dirs = [tempfile.TemporaryDirectory() for _ in range(2)]
        for d in cls.dirs:
            rc = render.render_song(cls.song, cls.mix, d.name)
            assert rc == 0

    @classmethod
    def tearDownClass(cls):
        for d in cls.dirs:
            d.cleanup()

    def test_tiny_double_render_bit_identical(self):
        names = ["master.wav", "manifest.json"] + [
            os.path.join("stems", s + ".wav")
            for s in ("vocals", "guitars", "bass", "drums")]
        prev_a = ("preview.wav" if os.path.exists(
            os.path.join(self.dirs[0].name, "preview.wav")) else "preview.ogg")
        names.append(prev_a)
        for name in names:
            a = os.path.join(self.dirs[0].name, name)
            b = os.path.join(self.dirs[1].name, name)
            self.assertTrue(os.path.isfile(a), "missing artifact: %s" % name)
            self.assertEqual(sha(a), sha(b),
                             "nondeterministic tiny render: %s" % name)

    def test_tiny_master_peak_gate_and_duration(self):
        with open(os.path.join(self.dirs[0].name, "master.wav"), "rb") as f:
            data = f.read()
        (nbytes,) = struct.unpack("<I", data[40:44])
        pcm = array.array("h", data[44:44 + nbytes])
        self.assertAlmostEqual(len(pcm) / 44100, 3.0, delta=0.01)
        peak = max(abs(v) for v in pcm) / 32767.0
        self.assertLessEqual(peak, self.mix["masterCeiling"] + 1e-3)
        self.assertGreater(peak, 0.05, "tiny master suspiciously quiet")
        self.assertEqual(sum(1 for v in pcm if abs(v) >= 32767), 0)

    def test_tiny_manifest_provenance(self):
        with open(os.path.join(self.dirs[0].name, "manifest.json"),
                  encoding="utf-8") as f:
            man = json.load(f)
        self.assertEqual(man["generator"], "tools/render.py (stdlib only)")
        self.assertEqual(man["scoreSha256"], sha(SONG))
        self.assertEqual(man["mixSha256"], sha(MIX))
        for rel, digest in man["files"].items():
            self.assertEqual(
                sha(os.path.join(self.dirs[0].name, rel)), digest,
                "manifest hash mismatch: %s" % rel)

    def test_wav_header_fixed_shape(self):
        with open(os.path.join(self.dirs[0].name, "master.wav"), "rb") as f:
            head = f.read(44)
        self.assertEqual(len(head), 44)
        self.assertEqual(head[0:4], b"RIFF")
        self.assertEqual(head[8:20], b"WAVEfmt " + struct.pack("<I", 16))
        self.assertEqual(struct.unpack("<HH", head[20:24]), (1, 1))
        self.assertEqual(struct.unpack("<I", head[24:28])[0], 44100)

    def test_cli_bad_args_rejected(self):
        bad = subprocess.run([sys.executable, RENDER, "--out"],
                             capture_output=True, text=True, cwd=REPO,
                             timeout=60)
        self.assertNotEqual(bad.returncode, 0)
        unknown = subprocess.run([sys.executable, RENDER, "--bogus-flag"],
                                 capture_output=True, text=True, cwd=REPO,
                                 timeout=60)
        self.assertNotEqual(unknown.returncode, 0)

    def test_hostile_unknown_table_kind_raises(self):
        s = render.Synth(44100, "seed")
        with self.assertRaises(ValueError):
            s.table("no-such-kind", 440.0)

    def test_hostile_fit_truncates_never_wraps(self):
        bus = array.array("f", [0.0]) * 100
        self.assertEqual(render.Synth.fit(bus, -5, 10), 0)
        self.assertEqual(render.Synth.fit(bus, 95, 10), 5)
        self.assertEqual(render.Synth.fit(bus, 100, 10), 0)
        self.assertEqual(render.Synth.fit(bus, 200, 10), 0)
        s = render.Synth(44100, "seed")
        env = [1.0] * 50
        before = list(bus[:90])
        s.add_tone(bus, 90, 440.0, 1.0, "sine", 0.5, env)
        self.assertEqual(list(bus[:90]), before,
                         "outro-fill write wrapped around the buffer")

    def test_hostile_stream_order_independent(self):
        a = render.Synth(44100, "k").stream("noise").random()
        b = render.Synth(44100, "k").stream("noise").random()
        self.assertEqual(a, b)
        s1 = render.Synth(44100, "k")
        s1.stream("vel-drums").random()
        v1 = s1.stream("vel-bass").random()
        s2 = render.Synth(44100, "k")
        v2 = s2.stream("vel-bass").random()
        self.assertEqual(v1, v2,
                         "per-voice stream depends on draw order")

    def test_hostile_formant_deterministic(self):
        s = render.Synth(44100, "k")
        t1 = list(render.apply_formants(s, 440.0, "a"))
        s2 = render.Synth(44100, "k")
        t2 = list(render.apply_formants(s2, 440.0, "a"))
        self.assertEqual(t1, t2)
        s3 = render.Synth(44100, "k")
        t3 = list(render.apply_formants(s3, 440.0, "e"))
        self.assertNotEqual(t1, t3, "vowel formants not distinguished")

    def test_envelope_shapes_pinned(self):
        env = render.Synth.envelope(44100, 44100)
        self.assertLess(env[0], 0.05, "attack does not start near zero")
        self.assertAlmostEqual(env[len(env) // 2], 0.8, places=3)
        self.assertGreaterEqual(min(env), 0.0)
        self.assertLessEqual(max(env), 1.0)
        short = render.Synth.envelope(1000, 44100)
        self.assertGreaterEqual(min(short), 0.0)
        self.assertLessEqual(max(short), 1.0)
        pluck = render.Synth.pluck_envelope(4410, 44100)
        self.assertLess(pluck[-1], pluck[len(pluck) // 4],
                        "pluck envelope does not decay")

    def test_midi_to_freq_a440(self):
        self.assertAlmostEqual(render.midi_to_freq(69), 440.0, places=6)
        self.assertAlmostEqual(render.midi_to_freq(57), 220.0, places=3)

    def test_vowel_mapping_stable(self):
        self.assertEqual(render.vowel_for_line("hello world"),
                         render.vowel_for_line("hello world"))
        self.assertIn(render.vowel_for_line("anything"), ("a", "e", "i", "o"))

    def test_no_em_dash_in_render_source(self):
        with open(RENDER, encoding="utf-8") as f:
            src = f.read()
        self.assertNotIn("\u2014", src)


if __name__ == "__main__":
    unittest.main()
