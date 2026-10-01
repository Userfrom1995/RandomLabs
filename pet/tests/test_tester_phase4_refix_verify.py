"""Tester Phase 4 refix verification (Evaluator rejection follow-up), Refs #504.

Pins the two binding fail-open crashes from the Quality Council rejection
plus the Pages discoverability gap, all through shipped paths:

- F1: clamp_to_screen with hostile origins ('abc', None, nan, inf) must
  pin to (0, 0) and never raise (window.py handler returned a constant).
- F2: tick_count null/list/dict in pet.json must fail closed (fresh
  state plus .bak) and never crash run_loop or switch_character, at both
  the module level and the shipped `python -m pet service switch` CLI.
- Pages: pet/index.html and pet/docs/index.html must surface the
  always-on service/tray feature (not markdown-only).

Run: python3 -m unittest pet.tests.test_tester_phase4_refix_verify -v
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


def run_pet(*argv, data_dir=None):
    env = dict(os.environ)
    if data_dir is not None:
        env["DESKTOP_PET_DATA_DIR"] = data_dir
    return subprocess.run(
        [sys.executable, "-m", "pet"] + list(argv),
        cwd=ROOT, capture_output=True, text=True, env=env, timeout=120,
    )


def write_save(data_dir, payload):
    path = os.path.join(data_dir, "pet.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle)
    return path


class TestClampHostileOrigins(unittest.TestCase):
    def test_string_origin_pins_to_origin(self):
        from pet.pet_app.window import clamp_to_screen
        self.assertEqual(
            clamp_to_screen("abc", 0, 160, 224, 1280, 800), (0, 0))

    def test_none_origin_pins_to_origin(self):
        from pet.pet_app.window import clamp_to_screen
        self.assertEqual(
            clamp_to_screen(None, None, 160, 224, 1280, 800), (0, 0))

    def test_nonfinite_origins_pin_to_origin(self):
        from pet.pet_app.window import clamp_to_screen
        self.assertEqual(
            clamp_to_screen(float("nan"), 0, 160, 224, 1280, 800), (0, 0))
        self.assertEqual(
            clamp_to_screen(float("inf"), 0, 160, 224, 1280, 800), (0, 0))

    def test_sane_geometry_unchanged(self):
        from pet.pet_app.window import clamp_to_screen
        self.assertEqual(
            clamp_to_screen(2000, 900, 160, 224, 1280, 800), (1120, 576))
        self.assertEqual(
            clamp_to_screen(50, 50, 2000, 2000, 1280, 800), (0, 0))


class TestCorruptTickCountRefix(unittest.TestCase):
    BAD_VALUES = (None, [1, 2], {"x": 1})

    def test_load_fails_closed_with_backup(self):
        from pet.pet_core.persistence import load
        for bad in self.BAD_VALUES:
            with tempfile.TemporaryDirectory() as data:
                path = write_save(data, {"schema_version": 2,
                                         "tick_count": bad})
                state, notice = load(path)
                self.assertEqual(state.tick_count, 0)
                self.assertTrue(notice, "bad=%r" % (bad,))
                self.assertTrue(os.path.exists(path + ".bak"))

    def test_run_loop_survives_corrupt_save(self):
        from pet.pet_app import service as service_mod
        for bad in self.BAD_VALUES:
            with tempfile.TemporaryDirectory() as data:
                write_save(data, {"schema_version": 2, "tick_count": bad})
                self.assertEqual(
                    service_mod.run_loop(max_ticks=3, save_every=1,
                                         data=data), 0, "bad=%r" % (bad,))

    def test_switch_survives_corrupt_save(self):
        from pet.pet_app import service as service_mod
        for bad in self.BAD_VALUES:
            with tempfile.TemporaryDirectory() as data:
                write_save(data, {"schema_version": 2, "tick_count": bad})
                ok, text = service_mod.switch_character("pip", data=data)
                self.assertTrue(ok, "bad=%r" % (bad,))
                self.assertIn("pip", text.lower())

    def test_cli_switch_survives_null_tick_count(self):
        with tempfile.TemporaryDirectory() as data:
            write_save(data, {"schema_version": 2, "tick_count": None})
            proc = run_pet("service", "switch", "pip", data_dir=data)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("pip", proc.stdout.lower())


class TestLogsBoundedTail(unittest.TestCase):
    def test_huge_log_clamps_to_500(self):
        from pet.pet_app import service as service_mod
        with tempfile.TemporaryDirectory() as data:
            with open(os.path.join(data, "service.log"), "w",
                      encoding="utf-8") as handle:
                for i in range(1000):
                    handle.write("line %d\n" % i)
            ok, text = service_mod.logs(lines=99999, data=data)
            self.assertTrue(ok)
            self.assertLessEqual(len(text.splitlines()), 500)
            self.assertIn("line 999", text)


class TestTrayCliLive(unittest.TestCase):
    def test_tray_status_answers(self):
        proc = run_pet("tray", "status")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("tray backend", proc.stdout)

    def test_tray_hide_always_succeeds(self):
        proc = run_pet("tray", "hide")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("hidden", proc.stdout)


class TestPagesSurfaceSynced(unittest.TestCase):
    def _count(self, rel, *words):
        with open(os.path.join(ROOT, rel), encoding="utf-8") as handle:
            html = handle.read().lower()
        return sum(html.count(word) for word in words)

    def test_index_covers_service_tray(self):
        self.assertGreaterEqual(
            self._count("pet/index.html", "service", "tray"), 10)

    def test_docs_covers_service_tray(self):
        self.assertGreaterEqual(
            self._count("pet/docs/index.html", "service", "tray"), 5)

    def test_docs_keeps_conversation_section(self):
        with open(os.path.join(ROOT, "pet/docs/index.html"),
                  encoding="utf-8") as handle:
            html = handle.read().lower()
        self.assertIn("conversation", html)


if __name__ == "__main__":
    unittest.main()
