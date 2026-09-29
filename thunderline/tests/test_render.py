#!/usr/bin/env python3
"""Thunderline Phase 2 gate: deterministic render engine and master audio.

Renders the full 156 s track twice to temp dirs (stdlib only) and pins:
bit-identical master/stems/preview, valid fixed WAV headers, duration and
peak gates, per-section energy (no dead air, final-chorus lift), non-silent
stems, manifest provenance, and the CLI contract.
"""
import array
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
SUBPROCESS_TIMEOUT = 600


def sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def read_mono16(path):
    """Parse a mono 16-bit PCM WAV; return (sample_rate, array('h'))."""
    with open(path, "rb") as f:
        data = f.read()
    assert data[0:4] == b"RIFF", "missing RIFF: %s" % path
    assert data[8:12] == b"WAVE", "missing WAVE: %s" % path
    assert data[12:16] == b"fmt ", "missing fmt: %s" % path
    (fmt_len, audio, ch, sr, _br, _ba, bits) = struct.unpack(
        "<IHHIIHH", data[16:36])
    assert fmt_len == 16, "unexpected fmt len: %r" % fmt_len
    assert audio == 1 and ch == 1 and bits == 16
    assert data[36:40] == b"data", "missing data chunk: %s" % path
    (nbytes,) = struct.unpack("<I", data[40:44])
    raw = data[44:44 + nbytes]
    assert len(raw) == nbytes
    return sr, array.array("h", raw)


def section_bounds(song, sr):
    beat = 60.0 / song["tempo"]["bpm"]
    out = []
    for sec in song["form"]:
        a = int(round(sec["startBar"] * 4 * beat * sr))
        b = int(round((sec["startBar"] + sec["bars"]) * 4 * beat * sr))
        out.append((sec["section"], a, b))
    return out


class RenderGate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(SONG, "r", encoding="utf-8") as f:
            cls.song = json.load(f)
        with open(MIX, "r", encoding="utf-8") as f:
            cls.mix = json.load(f)
        cls.dirs = [tempfile.TemporaryDirectory() for _ in range(2)]
        for d in cls.dirs:
            rc = render.render_song(cls.song, cls.mix, d.name)
            assert rc == 0
        cls.out = cls.dirs[0].name
        cls.sr, cls.master = read_mono16(os.path.join(cls.out, "master.wav"))

    @classmethod
    def tearDownClass(cls):
        for d in cls.dirs:
            d.cleanup()

    def test_double_render_bit_identical(self):
        names = ["master.wav", "manifest.json",
                 "preview.wav" if os.path.exists(
                     os.path.join(self.dirs[0].name, "preview.wav"))
                 else "preview.ogg"]
        names += [os.path.join("stems", s + ".wav")
                  for s in ("vocals", "guitars", "bass", "drums")]
        for name in names:
            a = os.path.join(self.dirs[0].name, name)
            b = os.path.join(self.dirs[1].name, name)
            self.assertTrue(os.path.isfile(a), "missing artifact: %s" % name)
            self.assertEqual(sha(a), sha(b),
                             "nondeterministic render: %s" % name)

    def test_wav_format_fixed(self):
        self.assertEqual(self.sr, 44100)
        for name in ["master.wav"] + [os.path.join("stems", s + ".wav")
                                      for s in ("vocals", "guitars", "bass",
                                                "drums")]:
            with open(os.path.join(self.out, name), "rb") as f:
                head = f.read(44)
        self.assertEqual(len(head), 44)
        # fixed header shape: RIFF/size/WAVE/fmt 16/PCM/mono/44100/data
        self.assertEqual(head[0:4], b"RIFF")
        self.assertEqual(head[8:20], b"WAVEfmt " + struct.pack("<I", 16))
        self.assertEqual(struct.unpack("<HH", head[20:24]), (1, 1))

    def test_duration_gate(self):
        dur = len(self.master) / self.sr
        self.assertGreaterEqual(dur, 150.0)
        self.assertLessEqual(dur, 210.0)
        self.assertAlmostEqual(dur, self.song["durationSec"], delta=0.01)

    def test_peak_ceiling_no_clip_no_dc(self):
        peak = 0
        total = 0
        for v in self.master:
            a = abs(v)
            if a > peak:
                peak = a
            total += v
        self.assertLessEqual(peak / 32767.0, self.mix["masterCeiling"] + 1e-3)
        self.assertGreater(peak / 32767.0, 0.3, "master suspiciously quiet")
        clipped = sum(1 for v in self.master if abs(v) >= 32767)
        self.assertEqual(clipped, 0, "master has clipped samples")
        dc = total / len(self.master) / 32767.0
        self.assertLess(abs(dc), 0.01, "master DC offset: %r" % dc)

    def test_edge_fades_no_start_click(self):
        fade_in_n = int(self.sr * self.mix["fadeInSec"])
        fade_out_n = int(self.sr * self.mix["fadeOutSec"])
        self.assertGreater(fade_in_n, 0)
        self.assertGreater(fade_out_n, 0)
        # 2 ms probe windows: the ramps rise from / fall to digital silence,
        # so a probe at either edge must stay near zero (no discontinuity).
        probe = int(self.sr * 0.002)
        for label, data in [("master", self.master)] + [
                (s, read_mono16(os.path.join(
                    self.out, "stems", s + ".wav"))[1])
                for s in ("vocals", "guitars", "bass", "drums")]:
            self.assertEqual(data[0], 0, "%s must start at zero" % label)
            self.assertEqual(data[-1], 0, "%s must end at zero" % label)
            onset = max(abs(v) for v in data[:probe]) / 32767.0
            offset = max(abs(v) for v in data[-probe:]) / 32767.0
            self.assertLess(onset, 0.15, "%s onset too hot: %r" % (label,
                                                                  onset))
            self.assertLess(offset, 0.05, "%s offset too hot: %r" % (label,
                                                                    offset))

    def test_no_dead_air_final_lift(self):
        energy = {}
        for section, a, b in section_bounds(self.song, self.sr):
            seg = self.master[a:b]
            rms = (sum(v * v for v in seg) / len(seg)) ** 0.5 / 32767.0
            energy[section] = rms
            self.assertGreater(rms, 0.05, "dead air in %s" % section)
        self.assertGreater(energy["finalchorus"], energy["verse1"],
                           "no dynamics lift into final chorus: %r" % energy)

    def test_stems_non_silent(self):
        for stem in ("vocals", "guitars", "bass", "drums"):
            _, data = read_mono16(os.path.join(self.out, "stems",
                                               stem + ".wav"))
            self.assertEqual(len(data), len(self.master),
                             "stem length mismatch: %s" % stem)
            rms = (sum(v * v for v in data) / len(data)) ** 0.5 / 32767.0
            self.assertGreater(rms, 0.03, "silent stem: %s" % stem)

    def test_manifest_provenance(self):
        with open(os.path.join(self.out, "manifest.json"),
                  encoding="utf-8") as f:
            man = json.load(f)
        self.assertEqual(man["generator"], "tools/render.py (stdlib only)")
        self.assertEqual(man["scoreSha256"], sha(SONG))
        self.assertEqual(man["mixSha256"], sha(MIX))
        self.assertEqual(man["masterSeed"], self.song["masterSeed"])
        for rel, digest in man["files"].items():
            self.assertEqual(sha(os.path.join(self.out, rel)), digest,
                             "manifest hash mismatch: %s" % rel)

    def test_preview_matches_master(self):
        prev_wav = os.path.join(self.out, "preview.wav")
        prev_ogg = os.path.join(self.out, "preview.ogg")
        self.assertTrue(os.path.exists(prev_wav) or os.path.exists(prev_ogg),
                        "no preview artifact rendered")
        if os.path.exists(prev_wav):
            psr, pcm = read_mono16(prev_wav)
            self.assertEqual(psr, 22050)
            self.assertAlmostEqual(len(pcm) / psr,
                                   len(self.master) / self.sr, delta=0.01)
        else:
            self.assertGreater(os.path.getsize(prev_ogg), 10000)

    def test_cli_entrypoint_and_bad_arg(self):
        with tempfile.TemporaryDirectory() as tmp:
            proc = subprocess.run(
                [sys.executable, RENDER, "--out", tmp],
                capture_output=True, text=True, cwd=REPO,
                timeout=SUBPROCESS_TIMEOUT)
            self.assertEqual(proc.returncode, 0, proc.stderr[-500:])
            self.assertTrue(os.path.isfile(os.path.join(tmp, "master.wav")))
            self.assertEqual(sha(os.path.join(tmp, "master.wav")),
                             sha(os.path.join(self.out, "master.wav")))
        bad = subprocess.run([sys.executable, RENDER, "--out"],
                             capture_output=True, text=True, cwd=REPO,
                             timeout=60)
        self.assertNotEqual(bad.returncode, 0)


if __name__ == "__main__":
    unittest.main()
