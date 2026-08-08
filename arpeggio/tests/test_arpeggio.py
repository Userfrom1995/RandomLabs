"""Unit and CLI tests for Arpeggio.

Run from the repository root with::

    python -m unittest discover -s arpeggio/tests
"""

import argparse
import os
import random
import subprocess
import sys
import tempfile
import unittest
import wave

from arpeggio.arpeggio import (
    ARPEGGIO_PATTERNS,
    DEFAULT_BARS,
    DEFAULT_BPM,
    NOTE_NAMES,
    SCALES,
    build_transitions,
    chord,
    compose_piece,
    compose_progression,
    describe_chord,
    note_frequency,
    parse_note,
    render_note,
    roman_numeral,
    synthesize,
    write_wav,
)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _run_cli(*args):
    return subprocess.run(
        [sys.executable, "-m", "arpeggio"] + list(args),
        capture_output=True,
        text=True,
        cwd=ROOT,
    )


class NoteParsingTests(unittest.TestCase):
    def test_pitch_classes(self):
        for name, expected in [
            ("C", 0),
            ("D", 2),
            ("E", 4),
            ("F", 5),
            ("G", 7),
            ("A", 9),
            ("B", 11),
        ]:
            with self.subTest(name=name):
                self.assertEqual(parse_note(name), expected)

    def test_sharps_and_flats(self):
        for name, expected in [
            ("C#", 1),
            ("Db", 1),
            ("F#", 6),
            ("Gb", 6),
            ("Bb", 10),
            ("A#", 10),
        ]:
            with self.subTest(name=name):
                self.assertEqual(parse_note(name), expected)

    def test_case_insensitive(self):
        self.assertEqual(parse_note("db"), 1)
        self.assertEqual(parse_note("  c  "), 0)

    def test_unknown_note_rejected(self):
        with self.assertRaises(ValueError):
            parse_note("H")


class FrequencyTests(unittest.TestCase):
    def test_a4_is_440(self):
        self.assertAlmostEqual(note_frequency(69), 440.0, places=9)

    def test_octave_doubles_frequency(self):
        self.assertAlmostEqual(note_frequency(81), 880.0, places=9)

    def test_c4(self):
        self.assertAlmostEqual(note_frequency(60), 261.6255653005986, places=6)

    def test_twelve_semitones_is_octave(self):
        for midi in (40, 60, 69, 100):
            with self.subTest(midi=midi):
                self.assertAlmostEqual(
                    note_frequency(midi + 12), 2.0 * note_frequency(midi), places=9
                )


class ChordTests(unittest.TestCase):
    def test_major_tonic_triad(self):
        root, tones = chord(SCALES["major"], 1)
        self.assertEqual(root, 0)
        self.assertEqual(tones, (0, 4, 7))  # C E G

    def test_major_dominant_triad(self):
        root, tones = chord(SCALES["major"], 5)
        self.assertEqual(root, 7)
        self.assertEqual(tones, (0, 4, 7))  # G B D

    def test_major_supertonic_is_minor(self):
        root, tones = chord(SCALES["major"], 2)
        self.assertEqual(tones, (0, 3, 7))  # D F A

    def test_major_leading_tone_is_diminished(self):
        root, tones = chord(SCALES["major"], 7)
        self.assertEqual(tones, (0, 3, 6))  # B D F

    def test_minor_tonic_triad(self):
        root, tones = chord(SCALES["minor"], 1)
        self.assertEqual(tones, (0, 3, 7))  # A C E in A minor

    def test_pentatonic_triad(self):
        root, tones = chord(SCALES["pentatonic"], 1)
        self.assertEqual(root, 0)
        self.assertEqual(tones, (0, 4, 9))  # C E A in C pentatonic

    def test_roman_numerals(self):
        self.assertEqual(roman_numeral(1, (0, 4, 7)), "I")
        self.assertEqual(roman_numeral(2, (0, 3, 7)), "ii")
        self.assertEqual(roman_numeral(7, (0, 3, 6)), "vii\u00b0")

    def test_describe_chord(self):
        label = describe_chord(0, SCALES["major"], 1)
        self.assertIn("C", label)
        self.assertIn("I", label)
        self.assertIn("C E G", label)


class MarkovChainTests(unittest.TestCase):
    def test_no_reachable_chord_is_a_dead_end(self):
        for scale_type in SCALES:
            with self.subTest(scale_type=scale_type):
                start, trans = build_transitions(scale_type)
                self.assertTrue(start)
                self.assertTrue(trans)
                reachable = set(start) | {a for a, _ in trans} | {b for _, b in trans}
                for degree in reachable:
                    with self.subTest(degree=degree):
                        self.assertTrue(any(a == degree for a, _ in trans))

    def test_weights_are_positive(self):
        for scale_type in SCALES:
            start, trans = build_transitions(scale_type)
            for weight in start.values():
                self.assertGreater(weight, 0)
            for weight in trans.values():
                self.assertGreater(weight, 0)

    def test_progression_length_and_validity(self):
        for scale_type in SCALES:
            with self.subTest(scale_type=scale_type):
                rng = random.Random(0)
                degrees = compose_progression(rng, scale_type, DEFAULT_BARS)
                self.assertEqual(len(degrees), DEFAULT_BARS)
                for degree in degrees:
                    self.assertIn(degree, range(1, len(SCALES[scale_type]) + 1))

    def test_seed_reproducibility(self):
        first = compose_progression(random.Random(7), "major", 12)
        second = compose_progression(random.Random(7), "major", 12)
        self.assertEqual(first, second)

    def test_different_seeds_differ(self):
        first = compose_progression(random.Random(1), "major", 16)
        second = compose_progression(random.Random(2), "major", 16)
        self.assertNotEqual(first, second)

    def test_on_chord_callback_receives_each_bar(self):
        rng = random.Random(3)
        seen = []
        compose_progression(rng, "major", 5, on_chord=lambda i, d: seen.append((i, d)))
        self.assertEqual(len(seen), 5)
        self.assertEqual([i for i, _ in seen], list(range(5)))


class SynthesisTests(unittest.TestCase):
    def test_note_length_matches_sample_count(self):
        note = render_note(440.0, 4410, "sine", False)
        self.assertEqual(len(note), 4410)

    def test_sine_stays_in_range(self):
        note = render_note(440.0, 44100, "sine", False)
        self.assertLessEqual(max(note), 1.0)
        self.assertGreaterEqual(min(note), -1.0)

    def test_triangle_differs_from_sine(self):
        sine = render_note(440.0, 4410, "sine", False)
        triangle = render_note(440.0, 4410, "triangle", False)
        self.assertNotEqual(sine, triangle)

    def test_harmonic_changes_waveform(self):
        plain = render_note(440.0, 4410, "sine", False)
        with_harmonic = render_note(440.0, 4410, "sine", True)
        self.assertNotEqual(plain, with_harmonic)

    def test_envelope_starts_and_ends_at_silence(self):
        note = render_note(440.0, 44100, "sine", False)
        self.assertEqual(note[0], 0.0)
        self.assertLess(abs(note[-1]), 0.01)

    def test_mix_length_is_sum_of_notes(self):
        notes = [(60, 2205), (64, 2205), (67, 2205)]
        mix = synthesize(notes, "sine", False)
        self.assertEqual(len(mix), 3 * 2205)


class WavTests(unittest.TestCase):
    def test_wav_header_is_valid(self):
        notes = [(60, 4410), (64, 4410), (67, 4410), (60, 4410)]
        mix = synthesize(notes, "sine", True)
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "out.wav")
            write_wav(path, mix)
            with open(path, "rb") as raw:
                header = raw.read(12)
            self.assertEqual(header[:4], b"RIFF")
            self.assertEqual(header[8:12], b"WAVE")
            with wave.open(path, "rb") as wav:
                self.assertEqual(wav.getnchannels(), 1)
                self.assertEqual(wav.getsampwidth(), 2)
                self.assertEqual(wav.getframerate(), 44100)
                self.assertEqual(wav.getnframes(), len(mix))

    def test_write_wav_is_deterministic(self):
        notes = [(60, 4410), (64, 4410), (67, 4410)]
        mix = synthesize(notes, "sine", False)
        with tempfile.TemporaryDirectory() as tmp:
            first = os.path.join(tmp, "a.wav")
            second = os.path.join(tmp, "b.wav")
            write_wav(first, mix)
            write_wav(second, mix)
            with open(first, "rb") as fa, open(second, "rb") as fb:
                self.assertEqual(fa.read(), fb.read())


class ComposePieceTests(unittest.TestCase):
    def test_notes_count_matches_bars_times_grid(self):
        rng = random.Random(0)
        _, notes = compose_piece(rng, 0, "major", 120, 8, 8)
        self.assertEqual(len(notes), 8 * 8)

    def test_notes_per_bar_scales_density(self):
        rng = random.Random(0)
        _, sparse = compose_piece(rng, 0, "major", 120, 4, 4)
        rng = random.Random(0)
        _, dense = compose_piece(rng, 0, "major", 120, 4, 8)
        self.assertEqual(len(dense), 2 * len(sparse))

    def test_notes_are_within_piano_range(self):
        rng = random.Random(1)
        _, notes = compose_piece(rng, 0, "major", 120, 16, 8)
        for midi, _ in notes:
            self.assertGreaterEqual(midi, 48)
            self.assertLessEqual(midi, 96)


class CliTests(unittest.TestCase):
    def test_default_run_writes_wav(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "tune.wav")
            proc = _run_cli("--seed", "42", "--output", out)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertTrue(os.path.exists(out))
            with wave.open(out, "rb") as wav:
                self.assertEqual(wav.getnframes(), 44100 * 16)

    def test_seed_reproducibility_across_runs(self):
        with tempfile.TemporaryDirectory() as tmp:
            first = os.path.join(tmp, "a.wav")
            second = os.path.join(tmp, "b.wav")
            args = ["--seed", "42", "--bars", "4"]
            self.assertEqual(_run_cli(*args, "--output", first).returncode, 0)
            self.assertEqual(_run_cli(*args, "--output", second).returncode, 0)
            with open(first, "rb") as fa, open(second, "rb") as fb:
                self.assertEqual(fa.read(), fb.read())

    def test_seed_printed_when_not_provided(self):
        proc = _run_cli("--seed", "42")
        self.assertNotIn("seed =", proc.stderr)

    def test_preview_prints_progression(self):
        proc = _run_cli("--seed", "42", "--preview")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("bar 1/8", proc.stdout)
        self.assertIn("bar 8/8", proc.stdout)

    def test_duration_caps_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "cap.wav")
            proc = _run_cli("--seed", "42", "--bars", "8", "--duration", "3", "--output", out)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with wave.open(out, "rb") as wav:
                self.assertLessEqual(wav.getnframes() / 44100, 3.1)

    def test_invalid_scale_fails_cleanly(self):
        proc = _run_cli("--scale", "dorian")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("scale", proc.stderr)

    def test_invalid_key_fails_cleanly(self):
        proc = _run_cli("--key", "H")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("key", proc.stderr)

    def test_invalid_bpm_fails_cleanly(self):
        proc = _run_cli("--bpm", "0")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("bpm", proc.stderr)

    def test_invalid_duration_fails_cleanly(self):
        proc = _run_cli("--duration", "-5")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("duration", proc.stderr)

    def test_invalid_wave_fails_cleanly(self):
        proc = _run_cli("--wave", "sawtooth")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("wave", proc.stderr)

    def test_help_lists_options(self):
        proc = _run_cli("--help")
        self.assertEqual(proc.returncode, 0)
        for option in ["--key", "--scale", "--bpm", "--bars", "--seed", "--duration", "--output"]:
            self.assertIn(option, proc.stdout)

    def test_version_flag(self):
        proc = _run_cli("--version")
        self.assertEqual(proc.returncode, 0)
        self.assertIn("arpeggio", proc.stdout)


if __name__ == "__main__":
    unittest.main()
