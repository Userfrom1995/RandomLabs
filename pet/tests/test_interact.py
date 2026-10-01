"""Headless tests for the interaction play layer (Phase 3).

Covers stroke streaks, munch sessions, the ball-toss mini-game, the
sleep schedule, and their wiring into the window controller. No display
needed: every clock is injected.
"""

import unittest

from pet.pet_app import controller as ctrl_mod
from pet.pet_app.controller import WindowController, menu_model
from pet.pet_app.interact import (
    CATCHES_TO_FINISH,
    BallGame,
    MunchSession,
    SleepSchedule,
    StrokeTracker,
    wall_hour,
)
from pet.pet_app.sprite import pose_for, shapes
from pet.pet_core.brain import Brain
from pet.pet_core.state import Activity


class TestStrokeTracker(unittest.TestCase):
    def test_streak_builds_in_window(self):
        tracker = StrokeTracker()
        self.assertEqual(tracker.register(100.0), 1)
        self.assertEqual(tracker.register(100.6), 2)
        self.assertEqual(tracker.register(101.2), 3)
        self.assertEqual(tracker.best, 3)

    def test_fast_double_fire_debounced(self):
        tracker = StrokeTracker()
        tracker.register(100.0)
        self.assertEqual(tracker.register(100.1), 1)

    def test_long_gap_restarts(self):
        tracker = StrokeTracker()
        tracker.register(100.0)
        tracker.register(100.5)
        self.assertEqual(tracker.register(110.0), 1)

    def test_backwards_clock_restarts(self):
        tracker = StrokeTracker()
        tracker.register(100.0)
        tracker.register(100.5)
        self.assertEqual(tracker.register(50.0), 1)

    def test_bad_timestamp_ignored(self):
        tracker = StrokeTracker()
        tracker.register(100.0)
        self.assertEqual(tracker.register(float("nan")), 1)
        self.assertEqual(tracker.register("nope"), 1)

    def test_reset(self):
        tracker = StrokeTracker()
        tracker.register(100.0)
        tracker.reset()
        self.assertEqual(tracker.streak, 0)
        self.assertEqual(tracker.register(101.0), 1)


class TestMunchSession(unittest.TestCase):
    def test_active_window(self):
        munch = MunchSession(duration=3.0)
        self.assertFalse(munch.is_active(100.0))
        munch.start(100.0)
        self.assertTrue(munch.is_active(101.0))
        self.assertTrue(munch.is_active(102.9))
        self.assertFalse(munch.is_active(103.5))

    def test_bad_start_ignored(self):
        munch = MunchSession()
        munch.start(float("nan"))
        self.assertFalse(munch.is_active(100.0))

    def test_bad_duration_falls_back(self):
        munch = MunchSession(duration=-5.0)
        munch.start(0.0)
        self.assertTrue(munch.is_active(1.0))


class TestBallGame(unittest.TestCase):
    def test_start_needs_a_clock(self):
        game = BallGame(seed=7)
        self.assertFalse(game.start(float("nan")))
        self.assertFalse(game.active)
        self.assertTrue(game.start(100.0))
        self.assertTrue(game.active)
        self.assertEqual(game.throws, 1)

    def test_deterministic_replay(self):
        def run():
            game = BallGame(seed=11)
            game.start(0.0)
            for i in range(200):
                game.tick(0.1, 0.1 * (i + 1))
            return (round(game.ball_x, 6), round(game.ball_y, 6),
                    game.score, game.catches)

        self.assertEqual(run(), run())

    def test_catch_scores_and_retosses(self):
        game = BallGame(seed=3)
        game.start(0.0)
        catches = 0
        for i in range(600):
            for outcome in game.tick(0.1, 0.1 * (i + 1)):
                if outcome == "catch":
                    catches += 1
            if not game.active:
                break
        self.assertGreater(catches, 0)
        self.assertEqual(game.score, catches)

    def test_finish_by_catches(self):
        game = BallGame(seed=3)
        game.start(0.0)
        events: list[str] = []
        for i in range(3000):
            events.extend(game.tick(0.1, 0.1 * (i + 1)))
            if not game.active:
                break
        self.assertIn("finish", events)
        self.assertFalse(game.active)
        self.assertEqual(game.catches, CATCHES_TO_FINISH)

    def test_finish_by_timeout(self):
        game = BallGame(seed=3)
        game.start(1000.0)
        game._started_at = 1000.0 - 29.9
        events = game.tick(0.1, 1031.0)
        self.assertIn("finish", events)
        self.assertFalse(game.active)

    def test_idle_tick_is_quiet(self):
        game = BallGame(seed=3)
        self.assertEqual(game.tick(0.1, 5.0), [])
        game.start(5.0)
        self.assertEqual(game.tick(float("nan"), 5.1), [])

    def test_ball_shape_in_box(self):
        game = BallGame(seed=3)
        game.start(0.0)
        shape = game.ball_shape(160.0)
        self.assertEqual(shape["kind"], "circle")
        self.assertEqual(len(shape["coords"]), 4)
        for coord in shape["coords"]:
            self.assertGreaterEqual(coord, -10.0)
            self.assertLessEqual(coord, 170.0)

    def test_wall_hour_sane(self):
        hour = wall_hour()
        self.assertIsNotNone(hour)
        self.assertGreaterEqual(hour, 0.0)
        self.assertLess(hour, 24.0)


class TestSleepSchedule(unittest.TestCase):
    def test_overnight_window(self):
        sched = SleepSchedule(enabled=True, bedtime=22.0, wake=7.0)
        self.assertTrue(sched.should_be_asleep(23.0))
        self.assertTrue(sched.should_be_asleep(0.0))
        self.assertTrue(sched.should_be_asleep(6.9))
        self.assertFalse(sched.should_be_asleep(7.0))
        self.assertFalse(sched.should_be_asleep(12.0))
        self.assertFalse(sched.should_be_asleep(21.9))

    def test_daytime_window(self):
        sched = SleepSchedule(enabled=True, bedtime=9.0, wake=17.0)
        self.assertTrue(sched.should_be_asleep(12.0))
        self.assertFalse(sched.should_be_asleep(8.9))
        self.assertFalse(sched.should_be_asleep(17.0))

    def test_degenerate_window_never_fires(self):
        sched = SleepSchedule(enabled=True, bedtime=7.0, wake=7.0)
        self.assertFalse(sched.should_be_asleep(7.0))
        self.assertFalse(sched.should_be_asleep(12.0))

    def test_disabled_and_bad_hours(self):
        sched = SleepSchedule(enabled=False, bedtime=22.0, wake=7.0)
        self.assertFalse(sched.should_be_asleep(23.0))
        sched = SleepSchedule(enabled=True, bedtime="late", wake=None)
        self.assertTrue(sched.should_be_asleep(23.0))
        self.assertFalse(sched.should_be_asleep(float("nan")))
        self.assertFalse(sched.should_be_asleep("midnight"))

    def test_toggle_and_describe(self):
        sched = SleepSchedule()
        self.assertTrue(sched.enabled)
        self.assertFalse(sched.set_enabled(False))
        text = sched.describe()
        self.assertIn("off", text)
        self.assertIn("22:00", text)


class TestControllerPlayLayer(unittest.TestCase):
    def make(self, **kwargs):
        kwargs.setdefault("seed", 7)
        return WindowController(brain=Brain(seed=kwargs.pop("seed")), **kwargs)

    def test_click_stroke_streak_and_combo(self):
        app = self.make()
        before = app.brain.state.affection
        app.handle_gesture("click", now=100.0)
        app.handle_gesture("click", now=100.6)
        app.handle_gesture("click", now=101.2)
        self.assertGreater(app.brain.state.affection, before)
        text = app.handle_gesture("click", now=101.8)
        self.assertTrue(text)
        self.assertTrue(app.bubble.visible)
        self.assertEqual(app.strokes.streak, 4)

    def test_poke_resets_streak(self):
        app = self.make()
        app.handle_gesture("click", now=100.0)
        app.handle_gesture("double-click", now=100.5)
        self.assertEqual(app.strokes.streak, 0)

    def test_feed_opens_munch_pose(self):
        app = self.make()
        app.brain.state.hunger = 80.0
        text, quit_flag = app.run_menu_action("feed", now=200.0)
        self.assertFalse(quit_flag)
        self.assertTrue(text)
        self.assertTrue(app.munch.is_active(200.5))
        pose = app.current_pose(now=200.5)
        self.assertEqual(pose.mouth in ("open", "smile"), True)
        self.assertFalse(app.munch.is_active(260.0))

    def test_play_starts_ball_game(self):
        app = self.make()
        text, quit_flag = app.run_menu_action("play", now=300.0)
        self.assertFalse(quit_flag)
        self.assertTrue(app.game.active)
        shape = app.ball_shape()
        self.assertIsNotNone(shape)
        label = app.activity_label()
        self.assertIn("ball", label)

    def test_play_while_asleep_starts_no_game(self):
        app = self.make()
        app.brain.send_to_sleep()
        app.run_menu_action("play", now=300.0)
        self.assertFalse(app.game.active)
        self.assertIsNone(app.ball_shape())

    def test_sleep_stops_ball_game(self):
        app = self.make()
        app.run_menu_action("play", now=300.0)
        self.assertTrue(app.game.active)
        app.brain.send_to_sleep()
        app.tick(0.1, now=301.0)
        self.assertFalse(app.game.active)

    def test_routine_toggle(self):
        app = self.make()
        self.assertTrue(app.routine.enabled)
        text, quit_flag = app.run_menu_action("routine", now=400.0)
        self.assertFalse(quit_flag)
        self.assertFalse(app.routine.enabled)
        self.assertIn("off", text)
        ids = [item[0] for item in app.menu()]
        self.assertIn("routine", ids)
        labels = dict(app.menu())
        self.assertIn("off", labels["routine"])

    def test_menu_model_routine_label(self):
        awake = menu_model(Activity.IDLE, True)
        self.assertEqual([item[0] for item in awake],
                         ["feed", "play", "sleep", "routine", "about", "quit"])
        self.assertIn("on", dict(awake)["routine"])
        sleeping = menu_model(Activity.SLEEP, False)
        self.assertEqual(sleeping[2][0], "wake")
        self.assertIn("off", dict(sleeping)["routine"])

    def test_schedule_auto_sleep_and_wake(self):
        app = self.make(clock=lambda: 23.5)
        for i in range(5):
            app.tick(0.1, now=500.0 + i)
        self.assertEqual(app.brain.state.activity, Activity.SLEEP)
        app.clock = lambda: 8.0
        for i in range(5):
            app.tick(0.1, now=600.0 + i)
        self.assertNotEqual(app.brain.state.activity, Activity.SLEEP)

    def test_manual_wake_holds_schedule(self):
        app = self.make(clock=lambda: 23.5)
        app.brain.send_to_sleep()
        app.run_menu_action("wake", now=1000.0)
        self.assertEqual(app.brain.state.activity, Activity.IDLE)
        app.tick(0.1, now=1001.0)
        self.assertEqual(app.brain.state.activity, Activity.IDLE)
        app.tick(0.1, now=1200.0)
        self.assertEqual(app.brain.state.activity, Activity.SLEEP)

    def test_no_clock_no_schedule_action(self):
        app = self.make()
        self.assertIsNone(app.clock)
        self.assertIsNone(app._hour())
        count = app.brain.state.tick_count
        app.tick(0.1, now=700.0)
        self.assertEqual(app.brain.state.tick_count, count + 1)

    def test_munch_pose_blends_back(self):
        app = self.make()
        app.run_menu_action("feed", now=200.0)
        active_pose = app.current_pose(now=200.5)
        self.assertIsNotNone(active_pose)
        later = app.current_pose(now=260.0)
        self.assertIsNotNone(later)


class TestMunchSprite(unittest.TestCase):
    def test_munch_pose_deterministic(self):
        self.assertEqual(pose_for("munch", 1.0), pose_for("munch", 1.0))

    def test_munch_chews_across_phase(self):
        mouths = {pose_for("munch", phase).mouth for phase in
                  [i * 0.3 for i in range(21)]}
        self.assertIn("open", mouths)
        self.assertIn("smile", mouths)

    def test_munch_shapes_scale_linearly(self):
        small = shapes(pose_for("munch", 0.7), size=160.0)
        big = shapes(pose_for("munch", 0.7), size=320.0)
        self.assertEqual(len(small), len(big))
        for little, large in zip(small, big):
            self.assertEqual(little["kind"], large["kind"])
            for left, right in zip(little["coords"], large["coords"]):
                self.assertAlmostEqual(right, left * 2.0, places=6)


class TestNoGuiImportsInInteract(unittest.TestCase):
    def test_interact_is_gui_free(self):
        import ast
        from pathlib import Path
        tree = ast.parse((Path("pet") / "pet_app" / "interact.py")
                         .read_text(encoding="utf-8"))
        imported: list[str] = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported.extend(a.name.split(".")[0] for a in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                imported.append(node.module.split(".")[0])
        for mod in ("tkinter", "pygame", "numpy", "PIL", "requests", "plyer"):
            self.assertNotIn(mod, imported)
        self.assertNotIn("input(", (Path("pet") / "pet_app" / "interact.py")
                         .read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
