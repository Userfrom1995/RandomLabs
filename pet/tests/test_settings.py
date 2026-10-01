"""Headless tests for settings, brain toggles, shells, and wiring."""

import json
import os
import tempfile
import unittest

from pet.pet_app import controller as ctrl_mod
from pet.pet_app import settings as settings_mod
from pet.pet_app.controller import WindowController
from pet.pet_app.settings import (
    AppSettings,
    load_settings,
    parse_clock,
    parse_setting_value,
    save_settings,
    with_field,
)
from pet.pet_core.brain import Brain
from pet.pet_core.state import Activity


class TestAppSettingsModel(unittest.TestCase):
    def test_defaults(self):
        settings = AppSettings()
        self.assertTrue(settings.wander)
        self.assertTrue(settings.play_invites)
        self.assertTrue(settings.sleep_schedule)
        self.assertTrue(settings.dialogue)
        self.assertTrue(settings.topmost)
        self.assertEqual(settings.alpha, 1.0)
        self.assertEqual(settings.scale, 1.0)

    def test_alpha_and_scale_clamp(self):
        settings = AppSettings(alpha=9.0, scale=-2.0)
        self.assertEqual(settings.alpha, 1.0)
        self.assertEqual(settings.scale, 0.5)
        settings = AppSettings(alpha="bad", scale="bad")
        self.assertEqual(settings.alpha, 1.0)
        self.assertEqual(settings.scale, 1.0)

    def test_bad_toggle_type_raises(self):
        with self.assertRaises(ValueError):
            AppSettings(wander="yes")
        with self.assertRaises(ValueError):
            AppSettings.from_dict({"wander": "yes"})

    def test_int_toggle_accepted(self):
        self.assertFalse(AppSettings(wander=0).wander)
        self.assertTrue(AppSettings(wander=1).wander)

    def test_round_trip(self):
        original = AppSettings(wander=False, alpha=0.55, scale=1.5,
                               bedtime=23.5, wake=6.25)
        clone = AppSettings.from_dict(
            json.loads(json.dumps(original.to_dict())))
        self.assertEqual(original, clone)

    def test_bad_schema_raises(self):
        with self.assertRaises(ValueError):
            AppSettings.from_dict({"schema_version": 999})
        with self.assertRaises(ValueError):
            AppSettings.from_dict([1, 2])

    def test_unknown_keys_ignored(self):
        settings = AppSettings.from_dict({"future_flag": True})
        self.assertTrue(settings.wander)

    def test_hours_wrap(self):
        settings = AppSettings(bedtime=25.0, wake="bad")
        self.assertAlmostEqual(settings.bedtime, 1.0)
        self.assertAlmostEqual(settings.wake, 7.0)

    def test_describe_lists_every_field(self):
        text = AppSettings().describe()
        for field in ("wander", "play_invites", "sleep_schedule", "dialogue",
                      "topmost", "alpha", "scale", "bedtime", "wake"):
            self.assertIn(field, text)


class TestSettingsPersistence(unittest.TestCase):
    def test_save_load_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "settings.json")
            original = AppSettings(dialogue=False, alpha=0.7)
            save_settings(original, path)
            loaded, notice = load_settings(path)
            self.assertIsNone(notice)
            self.assertEqual(original, loaded)

    def test_missing_file_gives_defaults(self):
        with tempfile.TemporaryDirectory() as tmp:
            loaded, notice = load_settings(os.path.join(tmp, "nope.json"))
            self.assertEqual(loaded, AppSettings())
            self.assertTrue(notice)

    def test_corrupt_file_backs_up_and_resets(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "settings.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("{not json")
            loaded, notice = load_settings(path)
            self.assertEqual(loaded, AppSettings())
            self.assertTrue(notice)
            self.assertTrue(os.path.exists(path + ".bak"))

    def test_wrong_typed_file_backs_up(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "settings.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump({"wander": "yes"}, handle)
            loaded, notice = load_settings(path)
            self.assertEqual(loaded, AppSettings())
            self.assertTrue(notice)


class TestSettingValues(unittest.TestCase):
    def test_parse_bool_forms(self):
        for raw in ("on", "true", "yes", "1", " ON "):
            self.assertTrue(parse_setting_value("wander", raw))
        for raw in ("off", "false", "no", "0"):
            self.assertFalse(parse_setting_value("wander", raw))
        with self.assertRaises(ValueError):
            parse_setting_value("wander", "maybe")
        with self.assertRaises(ValueError):
            parse_setting_value("nope", "1")

    def test_parse_numbers(self):
        self.assertAlmostEqual(parse_setting_value("alpha", "0.5"), 0.5)
        with self.assertRaises(ValueError):
            parse_setting_value("alpha", "opaque")

    def test_with_field_validates(self):
        updated = with_field(AppSettings(), "alpha", 0.4)
        self.assertAlmostEqual(updated.alpha, 0.4)
        with self.assertRaises(ValueError):
            with_field(AppSettings(), "nope", 1)

    def test_parse_clock(self):
        self.assertAlmostEqual(parse_clock("22:00"), 22.0)
        self.assertAlmostEqual(parse_clock("7:30"), 7.5)
        self.assertAlmostEqual(parse_clock("6"), 6.0)
        with self.assertRaises(ValueError):
            parse_clock("bedtime")
        with self.assertRaises(ValueError):
            parse_clock("24:00")
        with self.assertRaises(ValueError):
            parse_clock("10:60")
        with self.assertRaises(ValueError):
            parse_clock("")

    def test_parse_bedtime_accepts_clock_format(self):
        self.assertAlmostEqual(
            parse_setting_value("bedtime", "22:00"), 22.0)
        self.assertAlmostEqual(
            parse_setting_value("wake", "6"), 6.0)
        self.assertAlmostEqual(
            parse_setting_value("bedtime", "7:30"), 7.5)
        with self.assertRaises(ValueError):
            parse_setting_value("bedtime", "24:00")

    def test_nonfinite_hours_fall_back_or_raise(self):
        import math
        for bad in (float("inf"), float("-inf"), float("nan"),
                    "inf", "-inf", "nan", "Infinity"):
            settings = AppSettings(bedtime=bad, wake=bad)
            self.assertTrue(math.isfinite(settings.bedtime))
            self.assertTrue(math.isfinite(settings.wake))
            # describe() must never raise on sanitized values.
            settings.describe()
        for bad in ("inf", "-inf", "nan", "Infinity"):
            with self.assertRaises(ValueError):
                parse_setting_value("bedtime", bad)
            with self.assertRaises(ValueError):
                parse_setting_value("wake", bad)
        # Directly poisoned attributes still render safely.
        settings = AppSettings()
        settings.bedtime = float("nan")
        settings.wake = float("inf")
        settings.describe()


class TestBrainToggles(unittest.TestCase):
    def test_wander_off_never_walks(self):
        brain = Brain(seed=11, allow_walk=False)
        seen = set()
        for _ in range(3000):
            brain.tick(0.1)
            seen.add(brain.state.activity.value)
        self.assertNotIn("walk", seen)

    def test_play_off_never_plays_spontaneously(self):
        brain = Brain(seed=22, allow_play=False)
        for _ in range(3000):
            brain.tick(0.1)
            self.assertNotEqual(brain.state.activity, Activity.PLAY)

    def test_manual_play_still_works_when_gated(self):
        brain = Brain(seed=33, allow_play=False)
        event = brain.invite_play()
        self.assertEqual(event.activity, Activity.PLAY)

    def test_weights_zero_gated_targets(self):
        brain = Brain(seed=44, allow_walk=False, allow_play=False)
        for activity in (Activity.IDLE, Activity.WALK, Activity.PLAY,
                         Activity.REACT):
            brain.state.activity = activity
            weights = brain._weights()
            self.assertEqual(weights[Activity.WALK], 0.0)
            self.assertEqual(weights[Activity.PLAY], 0.0)
            self.assertAlmostEqual(sum(weights.values()), 1.0)

    def test_defaults_gate_nothing(self):
        brain = Brain(seed=55)
        self.assertTrue(brain.allow_walk)
        self.assertTrue(brain.allow_play)


class TestControllerSettings(unittest.TestCase):
    def make(self, **kwargs):
        return WindowController(brain=Brain(seed=7), **kwargs)

    def test_settings_source_alpha_scale_topmost(self):
        app = self.make(settings=AppSettings(alpha=0.6, scale=2.0,
                                             topmost=False))
        self.assertAlmostEqual(app.alpha, 0.6)
        self.assertAlmostEqual(app.scale, 2.0)
        self.assertFalse(app.topmost)

    def test_settings_sync_brain_and_routine(self):
        app = self.make(settings=AppSettings(wander=False,
                                             play_invites=False,
                                             sleep_schedule=False,
                                             bedtime=23.0, wake=6.0))
        self.assertFalse(app.brain.allow_walk)
        self.assertFalse(app.brain.allow_play)
        self.assertFalse(app.routine.enabled)
        self.assertAlmostEqual(app.routine.bedtime, 23.0)
        self.assertAlmostEqual(app.routine.wake, 6.0)

    def test_dialogue_off_hides_all_chatter(self):
        app = self.make(settings=AppSettings(dialogue=False))
        app.handle_gesture("click", now=100.0)
        self.assertFalse(app.bubble.visible)
        app.handle_gesture("double-click", now=200.0)
        self.assertFalse(app.bubble.visible)
        app.run_menu_action("feed", now=300.0)
        self.assertFalse(app.bubble.visible)
        app.run_menu_action("play", now=400.0)
        self.assertFalse(app.bubble.visible)
        app.tick(0.5, now=500.0)
        self.assertFalse(app.bubble.visible)

    def test_dialogue_on_unchanged(self):
        app = self.make()
        app.handle_gesture("click", now=100.0)
        self.assertTrue(app.bubble.visible)

    def test_menu_lists_settings(self):
        ids = [item[0] for item in self.make().menu()]
        self.assertEqual(ids, ["feed", "play", "sleep", "routine",
                               "settings", "about", "quit"])

    def test_routine_menu_toggle_syncs_settings(self):
        app = self.make()
        app.run_menu_action("routine", now=10.0)
        self.assertEqual(app.settings.sleep_schedule, app.routine.enabled)
        app.run_menu_action("routine", now=20.0)
        self.assertEqual(app.settings.sleep_schedule, app.routine.enabled)

    def test_apply_settings_rejects_wrong_type(self):
        with self.assertRaises(ValueError):
            self.make().apply_settings({"alpha": 0.5})

    def test_apply_settings_pushes_live(self):
        app = self.make()
        app.apply_settings(AppSettings(alpha=0.5, scale=1.5, topmost=False,
                                       wander=False, dialogue=False))
        self.assertAlmostEqual(app.alpha, 0.5)
        self.assertAlmostEqual(app.scale, 1.5)
        self.assertFalse(app.topmost)
        self.assertFalse(app.brain.allow_walk)
        app.handle_gesture("click", now=100.0)
        self.assertFalse(app.bubble.visible)

    def test_menu_model_settings_entry(self):
        ids = [item[0] for item in ctrl_mod.menu_model(Activity.IDLE)]
        self.assertIn("settings", ids)


if __name__ == "__main__":
    unittest.main()
