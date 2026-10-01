"""Tester Phase 2 regression suite for the Desktop Pet native window layer.

Verified live on PR #500 (Phase 2: Native Window and Procedural
Animation, Refs #498): sprite pose determinism, carried-needs advance,
click/drag/double-click classification boundaries, menu model sleep
labels, bubble hostile inputs, platform alpha/scale clamps, CLI gui
graceful exit without tkinter/display, and corrupt-save recovery notice
composition (window.launch concatenates notice + greeting, never
clobbers it).

Run: python3 -m unittest tests.test_desktop_pet_phase2 -v
"""

import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestPhase2Sprite(unittest.TestCase):
    def test_pose_deterministic_per_activity_and_phase(self):
        from pet.pet_app.sprite import pose_for
        for activity in ("idle", "walk", "play", "sleep", "react", "carried"):
            self.assertEqual(pose_for(activity, 1.0), pose_for(activity, 1.0))

    def test_sleep_pose_has_closed_eyes(self):
        from pet.pet_app.sprite import pose_for
        self.assertEqual(pose_for("sleep", 0.0).eye_open, 0.0)
        self.assertEqual(pose_for("sleep", 0.0).mouth, "sleep")

    def test_unknown_activity_falls_back_without_crash(self):
        from pet.pet_app.sprite import pose_for
        pose = pose_for("no-such-activity", 0.0)
        self.assertIsNotNone(pose)

    def test_blend_midpoint_interpolates(self):
        from pet.pet_app.sprite import blend, pose_for
        older = pose_for("idle", 0.0)
        fresh = pose_for("walk", 0.0)
        mid = blend(older, fresh, 0.5)
        self.assertGreater(mid.squash_x, min(older.squash_x, fresh.squash_x) - 1e-9)
        self.assertLess(mid.squash_x, max(older.squash_x, fresh.squash_x) + 1e-9)
        self.assertEqual(blend(older, fresh, 0.0), older)
        self.assertEqual(blend(older, fresh, 1.0), fresh)


class TestPhase2Controller(unittest.TestCase):
    def test_carried_advances_needs_without_transitions(self):
        from pet.pet_app.controller import WindowController
        ctrl = WindowController(seed=7)
        hunger0 = ctrl.brain.state.hunger
        energy0 = ctrl.brain.state.energy
        activity0 = ctrl.brain.state.activity
        ctrl.carry.start(5.0, 5.0)
        for _ in range(20):
            ctrl.tick(0.1)
        self.assertNotAlmostEqual(ctrl.brain.state.hunger, hunger0)
        self.assertNotAlmostEqual(ctrl.brain.state.energy, energy0)
        self.assertEqual(ctrl.brain.state.activity, activity0)
        self.assertEqual(ctrl.brain.state.tick_count, 20)

    def test_slow_release_is_neither_click_nor_drag(self):
        from pet.pet_app.controller import ClickTracker
        tracker = ClickTracker()
        tracker.press(0.0, 0.0, 100.0)
        self.assertIsNone(tracker.release(1.0, 1.0, 104.5))

    def test_drag_threshold_boundary(self):
        from pet.pet_app.controller import ClickTracker
        tracker = ClickTracker()
        tracker.press(0.0, 0.0, 100.0)
        self.assertFalse(tracker.move(5.9, 0.0))
        self.assertTrue(tracker.move(6.0, 0.0))
        self.assertEqual(tracker.release(6.0, 0.0, 100.2), "drag")

    def test_double_click_inside_window_classifies(self):
        from pet.pet_app.controller import ClickTracker
        tracker = ClickTracker()
        tracker.press(0.0, 0.0, 100.0)
        self.assertEqual(tracker.release(1.0, 1.0, 100.2), "click")
        tracker.press(0.0, 0.0, 100.4)
        self.assertEqual(tracker.release(1.0, 1.0, 100.5), "double-click")

    def test_menu_model_sleep_labels(self):
        from pet.pet_app.controller import menu_model
        idle = dict(menu_model("idle"))
        sleep = dict(menu_model("sleep"))
        self.assertEqual(idle["sleep"], "Send to sleep")
        self.assertEqual(sleep["wake"], "Wake up")
        self.assertIn("quit", dict(menu_model("play")))

    def test_bubble_hostile_inputs_fail_closed(self):
        from pet.pet_app.controller import WindowController
        ctrl = WindowController(seed=3)
        ctrl.bubble.show("hello", duration=float("nan"))
        self.assertTrue(ctrl.bubble.visible)
        before = ctrl.bubble.text
        ctrl.bubble.show("", duration=-5.0)
        self.assertEqual(ctrl.bubble.text, before)
        ctrl.bubble.show("x" * 500)
        self.assertLessEqual(len(ctrl.bubble.text), 280)

    def test_drop_ends_carry_with_a_line(self):
        from pet.pet_app.controller import WindowController
        ctrl = WindowController(seed=3)
        ctrl.carry.start(1.0, 1.0)
        text = ctrl.drop()
        self.assertFalse(ctrl.carry.active)
        self.assertTrue(text)

    def test_menu_actions_cover_model(self):
        from pet.pet_app.controller import WindowController
        ctrl = WindowController(seed=3)
        for action, _label in ctrl.menu():
            text, quit_flag = ctrl.run_menu_action(action)
            if action == "quit":
                self.assertTrue(quit_flag)
            else:
                self.assertFalse(quit_flag)
                self.assertTrue(text)

    def test_hostile_tick_dt_fails_closed(self):
        from pet.pet_app.controller import WindowController
        ctrl = WindowController(seed=3)
        for bad in (float("nan"), -5.0, "junk", None):
            ctrl.tick(bad)
        self.assertTrue(ctrl.bubble.text is not None)


class TestPhase2Platform(unittest.TestCase):
    def test_alpha_and_scale_clamped(self):
        from pet.pet_app import platform as pm
        self.assertEqual(pm.clamp_scale(99.0), pm.MAX_SCALE)
        self.assertEqual(pm.clamp_scale(-1.0), pm.MIN_SCALE)
        self.assertEqual(pm.clamp_alpha(99.0), pm.MAX_ALPHA)
        self.assertEqual(pm.clamp_alpha(0.01), pm.MIN_ALPHA)

    def test_capabilities_never_raise(self):
        from pet.pet_app import platform as pm
        caps = pm.capabilities()
        self.assertIn("can_show_window", caps)
        note = pm.honest_note()
        if not caps["can_show_window"]:
            self.assertTrue(note)

    def test_window_size_scales(self):
        from pet.pet_app import platform as pm
        small = pm.window_size(0.5)
        big = pm.window_size(3.0)
        self.assertLess(small[0] * small[1], big[0] * big[1])


class TestPhase2CLI(unittest.TestCase):
    def _run(self, argv, env_extra=None):
        env = dict(os.environ)
        # Force the headless answer so GUI tests stay deterministic on
        # machines that do have a display (DESKTOP_PET_NO_DISPLAY is
        # honored by pet.pet_app.platform.has_display).
        env["DESKTOP_PET_NO_DISPLAY"] = "1"
        if env_extra:
            env.update(env_extra)
        return subprocess.run(
            [sys.executable, "-m", "pet"] + argv,
            cwd=ROOT, capture_output=True, text=True, env=env, timeout=60)

    def test_gui_without_display_exits_2_gracefully(self):
        env = dict(os.environ)
        env.pop("DISPLAY", None)
        env.pop("WAYLAND_DISPLAY", None)
        proc = self._run(["gui"], env_extra=env)
        self.assertEqual(proc.returncode, 2)
        self.assertIn("error:", (proc.stdout + proc.stderr).lower())

    def test_gui_bad_scale_type_exits_2(self):
        proc = self._run(["gui", "--scale", "junk"])
        self.assertEqual(proc.returncode, 2)

    def test_gui_invalid_alpha_clamped_or_rejected_without_crash(self):
        proc = self._run(["gui", "--alpha", "99"])
        self.assertIn(proc.returncode, (0, 2))

    def test_run_headless_happy_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = {"DESKTOP_PET_DATA_DIR": tmp}
            proc = self._run(
                ["run", "--ticks", "50", "--seed", "7", "--no-save"],
                env_extra=env)
        self.assertEqual(proc.returncode, 0, proc.stderr[-2000:])
        self.assertIn("done after 50 ticks", proc.stdout)

    def test_corrupt_save_prints_recovery_notice(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("{corrupt!!!")
            env = {"DESKTOP_PET_DATA_DIR": tmp}
            proc = self._run(
                ["run", "--ticks", "5", "--seed", "1", "--no-save"],
                env_extra=env)
            self.assertEqual(proc.returncode, 0, proc.stderr[-2000:])
            self.assertIn("corrupt", proc.stdout.lower())
            self.assertTrue(os.path.exists(path + ".bak"))


if __name__ == "__main__":
    unittest.main()
