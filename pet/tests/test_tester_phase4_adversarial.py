"""Tester Phase 4 adversarial suite for Settings and Platform Integration.

Verified live on PR #502 (Phase 4, Refs #498): CLI HH:MM round-trip
through the real `python -m pet settings` entrypoint (the reviewer
round-trip defect), hostile CLI inputs (invalid clock, unknown field,
missing `=`, empty notify, bad ticks), corrupt settings.json recovery
with .bak backup, NaN/wrong-type hostile values, brain wander/play
gating at the weight table plus seeded soak absence, and per-OS shell
dispatcher fail-closed behavior on unknown platforms.

Run: python3 -m unittest pet.tests.test_tester_phase4_adversarial -v
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


def run_pet(*argv, env_extra=None):
    env = dict(os.environ)
    if env_extra:
        env.update(env_extra)
    return subprocess.run(
        [sys.executable, "-m", "pet"] + list(argv),
        cwd=ROOT, capture_output=True, text=True, env=env, timeout=120,
    )


class TestSettingsCliRoundTrip(unittest.TestCase):
    def test_hhmm_round_trip_through_cli(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "settings.json")
            proc = run_pet("settings", "--save", path,
                           "--set", "bedtime=22:00", "--set", "wake=6:30")
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("bedtime=22:00", proc.stdout)
            self.assertIn("wake=06:30", proc.stdout)
            with open(path, encoding="utf-8") as handle:
                data = json.load(handle)
            self.assertEqual(data["bedtime"], 22.0)
            self.assertEqual(data["wake"], 6.5)
            # A second display-only call must show the same values back.
            proc2 = run_pet("settings", "--save", path)
            self.assertEqual(proc2.returncode, 0, proc2.stderr)
            self.assertIn("bedtime=22:00", proc2.stdout)

    def test_numeric_bedtime_still_accepted(self):
        from pet.pet_app.settings import parse_setting_value
        self.assertEqual(parse_setting_value("bedtime", "7.5"), 7.5)
        self.assertEqual(parse_setting_value("wake", "6"), 6.0)
        self.assertEqual(parse_setting_value("bedtime", "22:00"), 22.0)
        self.assertEqual(parse_setting_value("bedtime", "7:30"), 7.5)

    def test_invalid_clock_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "settings.json")
            for bad in ("24:00", "12:60", "ab:cd", "25:00", ""):
                proc = run_pet("settings", "--save", path,
                               "--set", "bedtime=%s" % bad)
                self.assertEqual(proc.returncode, 2,
                                 "bedtime=%r: %s" % (bad, proc.stderr))
                self.assertIn("bedtime", proc.stderr)

    def test_unknown_field_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            proc = run_pet("settings", "--save",
                           os.path.join(tmp, "s.json"),
                           "--set", "bogus=1")
            self.assertEqual(proc.returncode, 2)
            self.assertIn("unknown setting", proc.stderr)

    def test_missing_equals_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            proc = run_pet("settings", "--save",
                           os.path.join(tmp, "s.json"),
                           "--set", "wander")
            self.assertEqual(proc.returncode, 2)
            self.assertIn("field=value", proc.stderr)

    def test_bad_bool_rejected(self):
        from pet.pet_app.settings import parse_setting_value
        with self.assertRaises(ValueError):
            parse_setting_value("wander", "maybe")
        with self.assertRaises(ValueError):
            parse_setting_value("dialogue", "2")


class TestCorruptRecovery(unittest.TestCase):
    def test_corrupt_settings_recovers_with_bak(self):
        from pet.pet_app import settings as settings_mod
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "settings.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("{not valid json!!!")
            loaded, notice = settings_mod.load_settings(path)
            self.assertIsNotNone(notice)
            self.assertIn("corrupt", notice)
            self.assertTrue(os.path.exists(path + ".bak"))
            # Defaults are sane after recovery.
            self.assertTrue(loaded.wander)
            self.assertEqual(loaded.bedtime, 22.0)

    def test_wrong_type_toggle_fails_closed(self):
        from pet.pet_app import settings as settings_mod
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "settings.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump({"wander": "yes-please"}, handle)
            loaded, notice = settings_mod.load_settings(path)
            self.assertIsNotNone(notice)
            self.assertTrue(loaded.wander)

    def test_nan_hour_falls_back_to_default(self):
        from pet.pet_app.settings import AppSettings
        s = AppSettings(bedtime=float("nan"))
        self.assertEqual(s.bedtime, 22.0)
        s2 = AppSettings(wake=float("nan"))
        self.assertEqual(s2.wake, 7.0)

    def test_alpha_scale_clamped_not_rejected(self):
        from pet.pet_app.settings import AppSettings
        s = AppSettings(alpha=99.0, scale=-3.0)
        self.assertLessEqual(s.alpha, 1.0)
        self.assertGreaterEqual(s.scale, 0.5)


class TestBrainGating(unittest.TestCase):
    def test_weights_zero_gated_targets_every_row(self):
        from pet.pet_core.brain import Brain
        from pet.pet_core.state import Activity
        for allow_walk, allow_play in ((False, True), (True, False),
                                       (False, False)):
            brain = Brain(seed=11, allow_walk=allow_walk,
                          allow_play=allow_play)
            for src in Activity:
                brain.state.activity = src
                weights = brain._weights()
                if not allow_walk:
                    self.assertEqual(weights.get(Activity.WALK, 0.0), 0.0,
                                     "walk leak from %r" % (src,))
                if not allow_play:
                    self.assertEqual(weights.get(Activity.PLAY, 0.0), 0.0,
                                     "play leak from %r" % (src,))

    def test_wander_off_soak_never_walks(self):
        from pet.pet_core.brain import Brain
        brain = Brain(seed=42, allow_walk=False, allow_play=True)
        for _ in range(4000):
            brain.tick(0.1)
            self.assertNotEqual(brain.state.activity.value, "walk")

    def test_play_off_soak_never_plays(self):
        from pet.pet_core.brain import Brain
        brain = Brain(seed=42, allow_walk=True, allow_play=False)
        for _ in range(4000):
            brain.tick(0.1)
            self.assertNotEqual(brain.state.activity.value, "play")


class TestShellDispatcher(unittest.TestCase):
    def test_unknown_platform_fails_closed(self):
        from pet.pet_app import shells as shells_mod
        self.assertEqual(shells_mod.current_shell_name("plan9"), "unknown")
        ok, note = shells_mod.set_startup(True, platform="plan9")
        self.assertFalse(ok)
        self.assertIn("not supported", note)
        self.assertFalse(shells_mod.is_startup_enabled(platform="plan9"))
        ok, note = shells_mod.notify("t", "m", platform="plan9")
        self.assertFalse(ok)
        self.assertIn("bubble", note)
        notes = shells_mod.platform_notes("plan9")
        self.assertTrue(notes.strip())

    def test_known_platform_notes_nonempty(self):
        from pet.pet_app import shells as shells_mod
        for plat in ("windows", "macos", "linux"):
            note = shells_mod.platform_notes(plat)
            self.assertTrue(note.strip(), plat)

    def test_startup_status_cli_live(self):
        proc = run_pet("startup", "status")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("start at login", proc.stdout)

    def test_notify_empty_message_rejected(self):
        proc = run_pet("notify", "--message", "   ")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("must not be empty", proc.stderr)

    def test_run_rejects_nonpositive_ticks(self):
        proc = run_pet("run", "--ticks", "0", "--no-save")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("--ticks", proc.stderr)

    def test_run_seeded_headless_live(self):
        proc = run_pet("run", "--ticks", "30", "--seed", "7", "--no-save")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("wakes up", proc.stdout)
        self.assertIn("done after 30 ticks", proc.stdout)


if __name__ == "__main__":
    unittest.main()
