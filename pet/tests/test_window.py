"""Headless tests for the window controller, menu, bubble, and platform probe."""

import unittest

from pet.pet_app import controller as ctrl_mod
from pet.pet_app import platform as platform_mod
from pet.pet_app.controller import (
    Bubble,
    CarrySession,
    ClickTracker,
    WindowController,
    activity_of,
    menu_model,
)
from pet.pet_core.brain import Brain
from pet.pet_core.state import Activity, PetState


class TestBubble(unittest.TestCase):
    def test_show_and_expire(self):
        bubble = Bubble()
        bubble.show("hello", duration=2.0, now=100.0)
        self.assertTrue(bubble.tick(now=101.0))
        self.assertFalse(bubble.tick(now=102.5))
        self.assertEqual(bubble.text, "")

    def test_empty_text_ignored(self):
        bubble = Bubble()
        bubble.show("   ", now=0.0)
        self.assertFalse(bubble.visible)

    def test_text_truncated(self):
        bubble = Bubble()
        bubble.show("x" * 500, now=0.0)
        self.assertLessEqual(len(bubble.text), 280)

    def test_bad_duration_falls_back(self):
        bubble = Bubble()
        bubble.show("hi", duration=-3.0, now=0.0)
        self.assertTrue(bubble.tick(now=1.0))


class TestClickTracker(unittest.TestCase):
    def test_click(self):
        tracker = ClickTracker()
        tracker.press(10.0, 10.0, 1.0)
        self.assertEqual(tracker.release(11.0, 11.0, 1.2), "click")

    def test_slow_release_is_none(self):
        tracker = ClickTracker()
        tracker.press(10.0, 10.0, 1.0)
        self.assertIsNone(tracker.release(10.0, 10.0, 5.0))

    def test_drag(self):
        tracker = ClickTracker()
        tracker.press(10.0, 10.0, 1.0)
        self.assertTrue(tracker.move(40.0, 10.0))
        self.assertEqual(tracker.release(40.0, 10.0, 1.1), "drag")

    def test_double_click(self):
        tracker = ClickTracker()
        tracker.press(10.0, 10.0, 1.0)
        self.assertEqual(tracker.release(10.0, 10.0, 1.1), "click")
        tracker.press(10.0, 10.0, 1.3)
        self.assertEqual(tracker.release(10.0, 10.0, 1.4), "double-click")

    def test_release_without_press(self):
        self.assertIsNone(ClickTracker().release(0.0, 0.0, 0.0))


class TestMenuModel(unittest.TestCase):
    def test_awake_menu(self):
        items = menu_model(Activity.IDLE)
        ids = [item[0] for item in items]
        self.assertEqual(ids, ["feed", "play", "sleep", "about", "quit"])

    def test_sleep_menu_offers_wake(self):
        items = menu_model(Activity.SLEEP)
        ids = [item[0] for item in items]
        self.assertIn("wake", ids)
        self.assertNotIn("sleep", ids)

    def test_accepts_string(self):
        self.assertEqual(menu_model("sleep")[2][0], "wake")


class TestCarrySession(unittest.TestCase):
    def test_start_stop(self):
        carry = CarrySession()
        carry.start(4.0, 9.0)
        self.assertTrue(carry.active)
        carry.stop()
        self.assertFalse(carry.active)


class TestWindowController(unittest.TestCase):
    def make(self, **kwargs):
        brain = Brain(seed=7)
        return WindowController(brain=brain, **kwargs)

    def test_click_shows_dialogue(self):
        app = self.make()
        text = app.handle_gesture("click")
        self.assertTrue(text)
        self.assertTrue(app.bubble.visible)

    def test_double_click_pokes(self):
        app = self.make()
        text = app.handle_gesture("double-click")
        self.assertTrue(text)
        self.assertEqual(app.brain.state.activity, Activity.REACT)

    def test_drag_gesture_returns_none(self):
        self.assertIsNone(self.make().handle_gesture("drag"))

    def test_menu_feed_restores_hunger(self):
        app = self.make()
        app.brain.state.hunger = 80.0
        text, quit_flag = app.run_menu_action("feed")
        self.assertFalse(quit_flag)
        self.assertTrue(text)
        self.assertLess(app.brain.state.hunger, 80.0)

    def test_menu_play_and_sleep_cycle(self):
        app = self.make()
        app.run_menu_action("play")
        self.assertEqual(app.brain.state.activity, Activity.PLAY)
        app.run_menu_action("sleep")
        self.assertEqual(app.brain.state.activity, Activity.SLEEP)
        items = app.menu()
        self.assertIn("wake", [item[0] for item in items])
        app.run_menu_action("wake")
        self.assertEqual(app.brain.state.activity, Activity.IDLE)

    def test_menu_about_and_quit(self):
        app = self.make()
        text, quit_flag = app.run_menu_action("about")
        self.assertFalse(quit_flag)
        self.assertIn("Desktop Pet", text)
        self.assertIn(app.brain.state.name, text)
        text, quit_flag = app.run_menu_action("quit")
        self.assertTrue(quit_flag)
        self.assertIsNone(text)

    def test_unknown_action(self):
        text, quit_flag = self.make().run_menu_action("dance")
        self.assertEqual((text, quit_flag), (None, False))

    def test_carry_suspends_activity_changes(self):
        app = self.make()
        app.carry.start(3.0, 3.0)
        before = app.brain.state.activity
        for _ in range(50):
            app.tick(0.1)
        self.assertEqual(app.brain.state.activity, before)
        line = app.drop()
        self.assertTrue(line)
        self.assertFalse(app.carry.active)

    def test_tick_advances_brain(self):
        app = self.make()
        count = app.brain.state.tick_count
        app.tick(0.1)
        self.assertEqual(app.brain.state.tick_count, count + 1)

    def test_tick_survives_bad_dt(self):
        app = self.make()
        app.tick(float("nan"))
        app.tick(-4.0)
        app.tick("nope")

    def test_current_pose_blends(self):
        app = self.make()
        first = app.current_pose()
        self.assertIsNotNone(first)
        app.brain.send_to_sleep()
        blended = app.current_pose()
        self.assertIsNotNone(blended)

    def test_settings_clamp(self):
        app = self.make()
        self.assertEqual(app.set_alpha(99.0), 1.0)
        self.assertEqual(app.set_alpha(-1.0), 0.3)
        self.assertEqual(app.set_scale(99.0), 3.0)
        self.assertEqual(app.set_topmost(False), False)

    def test_about_hint_mentions_menu(self):
        self.assertIn("menu", self.make().about_hint())

    def test_activity_of(self):
        self.assertEqual(activity_of(PetState(activity=Activity.PLAY)), "play")
        self.assertEqual(activity_of(object()), "idle")


class TestPlatform(unittest.TestCase):
    def test_capabilities_shape(self):
        caps = platform_mod.capabilities()
        for key in ("platform", "tkinter", "display", "can_show_window",
                    "topmost", "alpha", "notifications"):
            self.assertIn(key, caps)

    def test_clamp_alpha(self):
        self.assertEqual(platform_mod.clamp_alpha(0.1), 0.3)
        self.assertEqual(platform_mod.clamp_alpha(2.0), 1.0)
        self.assertEqual(platform_mod.clamp_alpha("nope"), 1.0)
        self.assertEqual(platform_mod.clamp_alpha(float("nan")), 1.0)

    def test_clamp_scale(self):
        self.assertEqual(platform_mod.clamp_scale(0.1), 0.5)
        self.assertEqual(platform_mod.clamp_scale(9.0), 3.0)
        self.assertEqual(platform_mod.clamp_scale("nope"), 1.0)

    def test_window_size_grows_with_scale(self):
        small = platform_mod.window_size(0.5)
        big = platform_mod.window_size(2.0)
        self.assertGreater(big[0], small[0])
        self.assertGreater(big[1], small[1])

    def test_probe_tk_scaling_fallback(self):
        class Broken:
            @property
            def tk(self):
                raise RuntimeError("no tk")
        self.assertEqual(platform_mod.probe_tk_scaling(Broken()), 1.0)
        self.assertEqual(platform_mod.probe_tk_scaling(object()), 1.0)

    def test_honest_note_type(self):
        note = platform_mod.honest_note()
        self.assertTrue(note is None or isinstance(note, str))

    def test_controller_module_has_no_gui_import(self):
        import ast
        from pathlib import Path
        for name in ("controller.py", "platform.py", "sprite.py"):
            path = Path("pet/pet_app") / name
            tree = ast.parse(path.read_text(encoding="utf-8"))
            imported: list[str] = []
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    imported.extend(a.name.split(".")[0] for a in node.names)
                elif isinstance(node, ast.ImportFrom) and node.module:
                    imported.append(node.module.split(".")[0])
            for mod in ("tkinter", "pygame", "numpy", "PIL", "requests", "plyer"):
                self.assertNotIn(mod, imported, "%s imports %s" % (name, mod))


if __name__ == "__main__":
    unittest.main()
