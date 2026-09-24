"""Unit and CLI tests for Cadence.

Run from the repository root with::

    python3 -m unittest discover -s cadence/tests
"""

import io
import os
import subprocess
import sys
import tempfile
import unittest
import wave

from cadence.cadence import (
    ALGORITHMS,
    DEFAULT_OUT,
    F_MAX,
    F_MIN,
    MAX_BOGO_SIZE,
    MAX_NOTE_SECONDS,
    MIN_NOTE_SECONDS,
    MIN_SIZE,
    SAMPLE_RATE,
    FrameRenderer,
    Stats,
    Tracer,
    compute_note_seconds,
    event_label,
    generate_wav,
    make_run,
    main,
    per_algo_out,
    resolve_algo,
    run_count,
    value_to_freq,
)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

NON_BOGO = [name for name in ALGORITHMS if name != "bogo"]


def _run_main(argv, out):
    """Run main() capturing stdout and stderr; returns (rc, stdout)."""
    old_out, old_err = sys.stdout, sys.stderr
    try:
        sys.stdout = out
        sys.stderr = out
        try:
            rc = main(argv)
        except SystemExit as exc:  # argparse --version/--help exit this way
            rc = exc.code if isinstance(exc.code, int) else (0 if exc.code is None else 2)
    finally:
        sys.stdout, sys.stderr = old_out, old_err
    return rc, out.getvalue()


def _subprocess(argv):
    return subprocess.run(
        [sys.executable, "-m", "cadence", *argv],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )


class SortingCorrectnessTest(unittest.TestCase):
    def test_every_algorithm_sorts(self):
        for name in ALGORITHMS:
            for size in (2, 3, 7, 17, 64, 100):
                if name == "bogo" and size > MAX_BOGO_SIZE:
                    continue
                for seed in (1, 42):
                    with self.subTest(algo=name, size=size, seed=seed):
                        _, _, _, arr = run_count(name, size, seed)
                        self.assertEqual(arr, sorted(arr))
                        self.assertEqual(sorted(arr), list(range(1, size + 1)))

    def test_permutation_preserved(self):
        _, _, _, arr = run_count("merge", 64, 7)
        self.assertEqual(sorted(arr), list(range(1, 65)))
        self.assertEqual(set(arr), set(range(1, 65)))


class DeterminismTest(unittest.TestCase):
    def test_stats_are_reproducible(self):
        for name in ("bubble", "quick-hoare", "merge", "heap"):
            a = run_count(name, 50, 123)
            b = run_count(name, 50, 123)
            self.assertEqual(a[0], b[0])
            self.assertEqual(a[1], b[1])

    def test_event_stream_is_reproducible(self):
        kinds_a = [ev.kind for ev in make_run("bubble", 20, 9)[2]]
        kinds_b = [ev.kind for ev in make_run("bubble", 20, 9)[2]]
        self.assertEqual(kinds_a, kinds_b)

    def test_wav_is_reproducible(self):
        def blob(name):
            count, _, _, _ = run_count(name, 40, 7)
            ns = compute_note_seconds(count, None)
            tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            tmp.close()
            try:
                generate_wav(name, 40, 7, ns, tmp.name, 20_000_000, lambda m: None)
                with open(tmp.name, "rb") as f:
                    return f.read()
            finally:
                os.unlink(tmp.name)

        self.assertEqual(blob("merge"), blob("merge"))


class StatsTest(unittest.TestCase):
    def test_accesses_is_reads_plus_writes(self):
        stats = Stats(comparisons=3, swaps=1, reads=7, writes=4)
        self.assertEqual(stats.accesses, 11)

    def test_bubble_stat_counts(self):
        _, stats, _, _ = run_count("bubble", 40, 1)
        # worst case sorted input does n(n-1)/2 comparisons; shuffled does no more
        self.assertLessEqual(stats.comparisons, 40 * 39 // 2)
        self.assertGreater(stats.comparisons, 0)
        self.assertEqual(stats.swaps + (stats.comparisons - stats.swaps), stats.comparisons)

    def test_merge_uses_writes_not_swaps(self):
        _, stats, _, _ = run_count("merge", 64, 2)
        self.assertEqual(stats.swaps, 0)
        self.assertGreater(stats.writes, 0)

    def test_compare_counts_two_reads(self):
        arr = [3, 1, 2]
        tr = Tracer(arr)
        tr.compare(0, 1)
        self.assertEqual(tr.stats.reads, 2)
        self.assertEqual(tr.stats.comparisons, 1)

    def test_bogo_records_attempts(self):
        _, stats, _, _ = run_count("bogo", 5, 3)
        self.assertGreater(stats.bogo_attempts, 0)


class AudioTest(unittest.TestCase):
    def test_pitch_mapping_is_monotonic(self):
        freqs = [value_to_freq(v, 100) for v in range(1, 101)]
        self.assertTrue(all(freqs[i] < freqs[i + 1] for i in range(len(freqs) - 1)))
        self.assertAlmostEqual(freqs[0], F_MIN)
        self.assertAlmostEqual(freqs[-1], F_MAX)

    def test_pitch_mapping_bounds(self):
        self.assertEqual(value_to_freq(1, 1), F_MIN)
        self.assertEqual(value_to_freq(1, 40), F_MIN)
        self.assertEqual(value_to_freq(40, 40), F_MAX)
        # values outside [1, max] are clamped
        self.assertEqual(value_to_freq(0, 40), F_MIN)
        self.assertEqual(value_to_freq(50, 40), F_MAX)

    def test_note_seconds_clamped(self):
        self.assertEqual(compute_note_seconds(10_000_000, None), MIN_NOTE_SECONDS)
        self.assertEqual(compute_note_seconds(1, None), MAX_NOTE_SECONDS)
        self.assertAlmostEqual(compute_note_seconds(500, None), 15.0 / 500)
        self.assertAlmostEqual(compute_note_seconds(100, 20), 0.05)

    def test_wav_file_is_valid_and_bounded(self):
        count, _, _, _ = run_count("merge", 40, 7)
        ns = compute_note_seconds(count, None)
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.close()
        try:
            writer = generate_wav(
                "merge", 40, 7, ns, tmp.name, 100_000_000, lambda m: None
            )
            self.assertGreater(writer.notes, 0)
            self.assertFalse(writer.truncated)
            with wave.open(tmp.name, "rb") as w:
                self.assertEqual(w.getnchannels(), 1)
                self.assertEqual(w.getsampwidth(), 2)
                self.assertEqual(w.getframerate(), SAMPLE_RATE)
                self.assertEqual(w.getnframes(), writer.frames)
                self.assertLessEqual(w.getnframes(), 100_000_000)
                raw = w.readframes(w.getnframes())
            # 16-bit PCM must stay within the signed short range
            import struct

            samples = struct.unpack("<%dh" % (len(raw) // 2), raw)
            self.assertTrue(all(-32768 <= s <= 32767 for s in samples))
            self.assertTrue(any(s != 0 for s in samples))
        finally:
            os.unlink(tmp.name)

    def test_wav_truncation_reports(self):
        count, _, _, _ = run_count("bubble", 200, 1)
        ns = compute_note_seconds(count, None)
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.close()
        warnings = []
        try:
            writer = generate_wav(
                "bubble", 200, 1, ns, tmp.name, 44_100, warnings.append
            )
            self.assertTrue(writer.truncated)
            self.assertEqual(writer.frames, 44_100)
            self.assertEqual(len(warnings), 1)
        finally:
            os.unlink(tmp.name)


class RendererTest(unittest.TestCase):
    def test_replay_reaches_sorted(self):
        for name in NON_BOGO:
            for size in (2, 3, 17, 100):
                with self.subTest(algo=name, size=size):
                    arr, tr, evs = make_run(name, size, 5)
                    ren = FrameRenderer(arr, cols=12, color=False, chars="ascii")
                    for ev in evs:
                        ren.apply(ev)
                    self.assertEqual(ren.arr, sorted(ren.arr))
                    self.assertEqual(sorted(ren.arr), list(range(1, size + 1)))

    def test_frames_build_for_all_sizes(self):
        for name in NON_BOGO:
            for size in (2, 3, 5, 40, 100):
                with self.subTest(algo=name, size=size):
                    arr, tr, evs = make_run(name, size, 5)
                    ren = FrameRenderer(arr, cols=10, color=False, chars="blocks")
                    total = sum(1 for _ in make_run(name, size, 5)[2])
                    for i, ev in enumerate(evs, 1):
                        lines = ren.frame(ev, i, total, tr.stats, 0.0, "HDR")
                        self.assertTrue(lines)
                        self.assertIn(ren.bar, lines[1])

    def test_frame_highlights_persist(self):
        arr, tr, evs = make_run("bubble", 10, 1)
        ren = FrameRenderer(arr, cols=10, color=False)
        total = sum(1 for _ in make_run("bubble", 10, 1)[2])
        seen_compare = False
        seen_sorted = False
        for i, ev in enumerate(evs, 1):
            lines = ren.frame(ev, i, total, tr.stats, 0.0, "HDR")
            if ev.kind == "compare":
                seen_compare = True
                self.assertIn("compare", lines[-3])
            if ev.kind == "sorted":
                seen_sorted = True
        self.assertTrue(seen_compare and seen_sorted)

    def test_event_label_covers_every_kind(self):
        labels = set()
        for name in NON_BOGO:
            for ev in make_run(name, 12, 3)[2]:
                labels.add(event_label(ev))
        self.assertGreater(len(labels), 5)


class CliTest(unittest.TestCase):
    def test_quiet_line_format(self):
        rc, text = _run_main(
            ["--algo", "bubble", "--size", "20", "--seed", "42", "--sound", "none", "--quiet"],
            io.StringIO(),
        )
        self.assertEqual(rc, 0)
        self.assertIn("cadence", text)
        self.assertIn("n=20", text)
        self.assertIn("seed=42", text)
        self.assertIn("compares=", text)
        self.assertIn("accesses=", text)
        self.assertIn("audio=-", text)

    def test_unknown_algo_exits_2(self):
        rc, text = _run_main(["--algo", "nosuch", "--quiet"], io.StringIO())
        self.assertEqual(rc, 2)
        self.assertIn("unknown algorithm", text)

    def test_size_bounds_exit_2(self):
        for bad in (MIN_SIZE - 1, 1001):
            rc, text = _run_main(["--size", str(bad), "--quiet"], io.StringIO())
            self.assertEqual(rc, 2)
            self.assertIn("size must be between", text)

    def test_bogo_cap_exit_2(self):
        rc, text = _run_main(
            ["--algo", "bogo", "--size", str(MAX_BOGO_SIZE + 1), "--quiet"],
            io.StringIO(),
        )
        self.assertEqual(rc, 2)
        self.assertIn("bogo", text)

    def test_alias_quick(self):
        self.assertEqual(resolve_algo("quick"), "quick-hoare")
        rc, text = _run_main(
            ["--algo", "quick", "--size", "10", "--sound", "none", "--quiet"],
            io.StringIO(),
        )
        self.assertEqual(rc, 0)
        self.assertIn("quick-hoare", text)

    def test_list_flag(self):
        rc, text = _run_main(["--list"], io.StringIO())
        self.assertEqual(rc, 0)
        for name in ALGORITHMS:
            self.assertIn(name, text)

    def test_version(self):
        rc, text = _run_main(["--version"], io.StringIO())
        self.assertEqual(rc, 0)
        self.assertIn("cadence", text)

    def test_wav_output_written(self):
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.close()
        try:
            rc, text = _run_main(
                ["--algo", "merge", "--size", "30", "--seed", "3", "--sound", "wav", "--out", tmp.name, "--quiet"],
                io.StringIO(),
            )
            self.assertEqual(rc, 0)
            self.assertIn(f"audio={tmp.name}", text)
            with wave.open(tmp.name, "rb") as w:
                self.assertEqual(w.getnchannels(), 1)
        finally:
            os.unlink(tmp.name)

    def test_race_table(self):
        rc, text = _run_main(
            ["--race", "--size", "12", "--seed", "99", "--sound", "none"],
            io.StringIO(),
        )
        self.assertEqual(rc, 0)
        self.assertIn("algorithm", text)
        for name in ALGORITHMS:
            self.assertIn(name, text)
        self.assertIn("skipped", text)  # bogo at n=12 is skipped

    def test_race_small_size_runs_bogo(self):
        rc, text = _run_main(
            ["--race", "--size", "6", "--seed", "99", "--sound", "none"],
            io.StringIO(),
        )
        self.assertEqual(rc, 0)
        self.assertIn("bogo", text)
        self.assertNotIn("skipped", text)

    def test_race_deterministic(self):
        import re

        def normalized():
            out = io.StringIO()
            self.assertEqual(
                _run_main(["--race", "--size", "12", "--seed", "7", "--sound", "none"], out)[0],
                0,
            )
            text = out.getvalue()
            # The table itself is deterministic; wall-clock timing and the
            # "fastest:" verdict (which ranks by measured time) are not.
            table = text.split("fastest:")[0]
            return re.sub(r"\d+\.\d{4}s", "TIME", table)

        self.assertEqual(normalized(), normalized())

    def test_bad_speed_exit_2(self):
        rc, _ = _run_main(["--speed", "-1", "--quiet"], io.StringIO())
        self.assertEqual(rc, 2)

    def test_bad_out_dir_exit_2(self):
        rc, text = _run_main(
            ["--out", "/nonexistent-dir/x.wav", "--quiet"], io.StringIO()
        )
        self.assertEqual(rc, 2)
        self.assertIn("does not exist", text)

    def test_no_animate_on_non_tty(self):
        rc, text = _run_main(
            ["--algo", "bubble", "--size", "8", "--seed", "1", "--sound", "none", "--no-animate"],
            io.StringIO(),
        )
        self.assertEqual(rc, 0)
        self.assertIn("compare", text)
        self.assertIn("legend", text)

    def test_module_execution(self):
        res = _subprocess(["--list"])
        self.assertEqual(res.returncode, 0)
        self.assertIn("bubble", res.stdout)
        res = _subprocess(["--algo", "merge", "--size", "10", "--sound", "none", "--quiet"])
        self.assertEqual(res.returncode, 0)
        self.assertIn("compares=", res.stdout)

    def test_large_size_no_recursion_error(self):
        rc, _ = _run_main(
            ["--algo", "quick-hoare", "--size", "1000", "--seed", "3", "--sound", "none", "--quiet"],
            io.StringIO(),
        )
        self.assertEqual(rc, 0)
        rc, _ = _run_main(
            ["--algo", "quick-lomuto", "--size", "1000", "--seed", "3", "--sound", "none", "--quiet"],
            io.StringIO(),
        )
        self.assertEqual(rc, 0)
        rc, _ = _run_main(
            ["--algo", "merge", "--size", "1000", "--seed", "3", "--sound", "none", "--quiet"],
            io.StringIO(),
        )
        self.assertEqual(rc, 0)


class RaceAudioTest(unittest.TestCase):
    def test_per_algo_out(self):
        self.assertEqual(per_algo_out("cadence.wav", "merge"), "cadence.merge.wav")
        self.assertEqual(per_algo_out("out.wav", "bubble"), "out.bubble.wav")
        self.assertEqual(per_algo_out("sound", "heap"), "sound.heap.wav")


if __name__ == "__main__":
    unittest.main()
