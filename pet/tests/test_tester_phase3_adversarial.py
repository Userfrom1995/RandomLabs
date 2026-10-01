"""Tester Phase 3 adversarial suite for the Desktop Pet play layer.

Verified live on PR #501 (Phase 3: Interaction and Play Layer,
Refs #498): stroke streak/debounce/backwards-clock boundaries, munch
window timing, seeded ball-toss determinism plus catch/timeout finish
paths, ball bounds over long soaks, SleepSchedule midnight-wrap plus
degenerate/disabled/hostile inputs, describe() minute-rounding hour
carry, controller wiring (click combo, poke reset, feed munch pose,
play start, play-while-asleep, sleep-stops-game, routine toggle and
grace hold, no-clock no-op, carry suspends schedule, hostile gestures),
and CLI live paths (run deterministic, selftest green, gui graceful
without tkinter/display).

Run: python3 -m unittest pet.tests.test_tester_phase3_adversarial -v
"""

import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


class TestReviewerRegressions(unittest.TestCase):
    def test_rally_timeout_fires_from_t_zero(self):
        from pet.pet_app.interact import BallGame
        game = BallGame(seed=3)
        self.assertTrue(game.start(0.0))
        events = game.tick(0.1, 31.0)
        self.assertIn("finish", events)
        self.assertFalse(game.active)

    def test_rally_timeout_fires_from_nonzero(self):
        from pet.pet_app.interact import BallGame
        game = BallGame(seed=3)
        game.start(1000.0)
        events = game.tick(0.1, 1031.0)
        self.assertIn("finish", events)
        self.assertFalse(game.active)

    def test_timeout_boundary_exact_vs_just_under(self):
        from pet.pet_app.interact import BallGame
        game = BallGame(seed=9)
        game.start(500.0)
        self.assertEqual(game.tick(0.1, 529.9), [])
        self.assertTrue(game.active)
        game2 = BallGame(seed=9)
        game2.start(500.0)
        self.assertIn("finish", game2.tick(0.1, 530.0))
        self.assertFalse(game2.active)

    def test_describe_rounding_carries_the_hour(self):
        from pet.pet_app.interact import SleepSchedule
        sched = SleepSchedule(enabled=True, bedtime=6.999, wake=7.0)
        self.assertIn("07:00", sched.describe())
        plain = SleepSchedule()
        self.assertIn("22:00", plain.describe())
        self.assertIn("07:00", plain.describe())


class TestBallGameHostile(unittest.TestCase):
    def test_deterministic_replay_from_t_zero(self):
        from pet.pet_app.interact import BallGame

        def run():
            game = BallGame(seed=11)
            game.start(0.0)
            for i in range(200):
                game.tick(0.1, 0.1 * (i + 1))
            return (round(game.ball_x, 6), round(game.ball_y, 6),
                    game.score, game.catches)

        self.assertEqual(run(), run())

    def test_finish_by_catches_and_score_match(self):
        from pet.pet_app.interact import BallGame, CATCHES_TO_FINISH
        game = BallGame(seed=3)
        game.start(0.0)
        events: list = []
        for i in range(3000):
            events.extend(game.tick(0.1, 0.1 * (i + 1)))
            if not game.active:
                break
        self.assertIn("finish", events)
        self.assertEqual(game.catches, CATCHES_TO_FINISH)
        self.assertEqual(game.score, CATCHES_TO_FINISH)

    def test_hostile_dt_and_now_fail_closed_without_crash(self):
        from pet.pet_app.interact import BallGame
        game = BallGame(seed=1)
        self.assertFalse(game.start(float("nan")))
        self.assertFalse(game.active)
        self.assertTrue(game.start(10.0))
        for bad_dt in (float("nan"), -1.0, "junk", None):
            self.assertEqual(game.tick(bad_dt, 10.1), [])
        self.assertTrue(game.active)
        for bad_now in ("junk", float("nan"), None.__class__):
            try:
                game.tick(0.1, bad_now)
            except Exception as exc:  # pragma: no cover
                self.fail("tick raised on hostile now: %r" % (exc,))
        self.assertEqual(game.tick(0.1, "junk"), [])
        self.assertEqual(game.elapsed("junk"), 0.0)
        idle = BallGame(seed=1)
        self.assertEqual(idle.elapsed(5.0), 0.0)
        self.assertEqual(idle.tick(0.1, 5.0), [])

    def test_long_soak_stays_in_bounds_without_nan(self):
        from pet.pet_app.interact import BallGame
        game = BallGame(seed=42)
        game.start(0.0)
        for i in range(3000):
            game.tick(0.5, 0.5 * (i + 1))
            for value in (game.ball_x, game.ball_y, game.pet_x,
                          game.ball_vx, game.ball_vy):
                self.assertFalse(value != value, "NaN leaked")
            self.assertGreaterEqual(game.ball_x, 0.05)
            self.assertLessEqual(game.ball_x, 0.95)
            if not game.active:
                break

    def test_ball_shape_hostile_box_falls_back(self):
        from pet.pet_app.interact import BallGame
        game = BallGame(seed=3)
        game.start(0.0)
        for bad in ("junk", -5.0, float("nan"), None):
            shape = game.ball_shape(bad)
            self.assertEqual(shape["kind"], "circle")
            self.assertEqual(len(shape["coords"]), 4)

    def test_toss_while_inactive_is_noop(self):
        from pet.pet_app.interact import BallGame
        game = BallGame(seed=3)
        throws0 = game.throws
        game.toss(5.0)
        self.assertEqual(game.throws, throws0)
        self.assertFalse(game.active)


class TestStrokeAndMunchHostile(unittest.TestCase):
    def test_stroke_gap_boundaries(self):
        from pet.pet_app.interact import StrokeTracker
        tracker = StrokeTracker()
        self.assertEqual(tracker.register(0.0), 1)
        self.assertEqual(tracker.register(0.1), 1)  # debounced
        self.assertEqual(tracker.register(0.6), 2)
        self.assertEqual(tracker.register(0.6 + 2.5), 3)  # inclusive edge
        self.assertEqual(tracker.register(0.6 + 2.5 + 2.51), 1)  # restart

    def test_stroke_hostile_timestamps_ignored(self):
        from pet.pet_app.interact import StrokeTracker
        tracker = StrokeTracker()
        tracker.register(100.0)
        for bad in (float("nan"), "nope", None.__class__, float("inf")):
            try:
                tracker.register(bad)
            except Exception as exc:  # pragma: no cover
                self.fail("register raised: %r" % (exc,))
        self.assertIn(tracker.streak, (1, 2))

    def test_munch_window_and_hostile_inputs(self):
        from pet.pet_app.interact import MunchSession
        munch = MunchSession(duration=3.0)
        self.assertFalse(munch.is_active(100.0))
        munch.start(100.0)
        self.assertTrue(munch.is_active(102.9))
        self.assertFalse(munch.is_active(103.5))
        bad = MunchSession()
        bad.start(float("nan"))
        self.assertFalse(bad.is_active(100.0))
        fallback = MunchSession(duration=-5.0)
        fallback.start(0.0)
        self.assertTrue(fallback.is_active(1.0))
        junk = MunchSession(duration="junk")
        self.assertAlmostEqual(junk.duration, 3.0)


class TestSleepScheduleHostile(unittest.TestCase):
    def test_overnight_wrap_and_edges(self):
        from pet.pet_app.interact import SleepSchedule
        sched = SleepSchedule(enabled=True, bedtime=22.0, wake=7.0)
        self.assertTrue(sched.should_be_asleep(22.0))
        self.assertTrue(sched.should_be_asleep(23.5))
        self.assertTrue(sched.should_be_asleep(0.0))
        self.assertTrue(sched.should_be_asleep(6.9))
        self.assertFalse(sched.should_be_asleep(7.0))
        self.assertFalse(sched.should_be_asleep(12.0))

    def test_degenerate_disabled_and_bad_inputs(self):
        from pet.pet_app.interact import SleepSchedule
        self.assertFalse(SleepSchedule(
            enabled=True, bedtime=7.0, wake=7.0).should_be_asleep(7.0))
        self.assertFalse(SleepSchedule(
            enabled=False, bedtime=22.0, wake=7.0).should_be_asleep(23.0))
        healed = SleepSchedule(enabled=True, bedtime="late", wake=None)
        self.assertTrue(healed.should_be_asleep(23.0))
        self.assertFalse(healed.should_be_asleep(float("nan")))
        self.assertFalse(healed.should_be_asleep("midnight"))
        self.assertFalse(healed.should_be_asleep(None))


class TestControllerPlayWiring(unittest.TestCase):
    def make(self, **kwargs):
        from pet.pet_app.controller import WindowController
        from pet.pet_core.brain import Brain
        kwargs.setdefault("seed", 7)
        seed = kwargs.pop("seed")
        return WindowController(brain=Brain(seed=seed), **kwargs)

    def test_click_combo_and_poke_reset(self):
        app = self.make()
        before = app.brain.state.affection
        app.handle_gesture("click", now=100.0)
        app.handle_gesture("click", now=100.6)
        app.handle_gesture("click", now=101.2)
        text = app.handle_gesture("click", now=101.8)
        self.assertTrue(text)
        self.assertEqual(app.strokes.streak, 4)
        self.assertGreater(app.brain.state.affection, before)
        app.handle_gesture("double-click", now=102.0)
        self.assertEqual(app.strokes.streak, 0)

    def test_hostile_gestures_and_menu_are_noops(self):
        app = self.make()
        self.assertIsNone(app.handle_gesture("junk", now=1.0))
        self.assertIsNone(app.handle_gesture(None, now=1.0))
        self.assertIsNone(app.handle_gesture("drag", now=1.0))
        text, quit_flag = app.run_menu_action("bogus", now=1.0)
        self.assertIsNone(text)
        self.assertFalse(quit_flag)

    def test_feed_play_sleep_game_lifecycle(self):
        from pet.pet_core.state import Activity
        app = self.make()
        app.brain.state.hunger = 80.0
        text, quit_flag = app.run_menu_action("feed", now=200.0)
        self.assertFalse(quit_flag)
        self.assertTrue(app.munch.is_active(200.5))
        app.run_menu_action("play", now=300.0)
        self.assertTrue(app.game.active)
        self.assertIsNotNone(app.ball_shape())
        self.assertIn("ball", app.activity_label())
        app.brain.send_to_sleep()
        app.tick(0.1, now=301.0)
        self.assertFalse(app.game.active)
        sleeping = self.make()
        sleeping.brain.send_to_sleep()
        self.assertEqual(sleeping.brain.state.activity, Activity.SLEEP)
        sleeping.run_menu_action("play", now=300.0)
        self.assertFalse(sleeping.game.active)

    def test_routine_toggle_menu_label_and_hold(self):
        from pet.pet_core.state import Activity
        app = self.make()
        text, _ = app.run_menu_action("routine", now=400.0)
        self.assertFalse(app.routine.enabled)
        self.assertIn("off", text)
        self.assertIn("off", dict(app.menu())["routine"])
        held = self.make(clock=lambda: 23.5)
        held.brain.send_to_sleep()
        held.run_menu_action("wake", now=1000.0)
        self.assertEqual(held.brain.state.activity, Activity.IDLE)
        held.tick(0.1, now=1001.0)
        self.assertEqual(held.brain.state.activity, Activity.IDLE)
        held.tick(0.1, now=1200.0)
        self.assertEqual(held.brain.state.activity, Activity.SLEEP)

    def test_schedule_auto_sleep_wake_and_carry_suspends(self):
        from pet.pet_core.state import Activity
        app = self.make(clock=lambda: 23.5)
        for i in range(5):
            app.tick(0.1, now=500.0 + i)
        self.assertEqual(app.brain.state.activity, Activity.SLEEP)
        app.clock = lambda: 8.0
        for i in range(5):
            app.tick(0.1, now=600.0 + i)
        self.assertNotEqual(app.brain.state.activity, Activity.SLEEP)
        quiet = self.make()
        count = quiet.brain.state.tick_count
        quiet.tick(0.1, now=700.0)
        self.assertEqual(quiet.brain.state.tick_count, count + 1)
        carried = self.make(clock=lambda: 23.5)
        carried.carry.start(5.0, 5.0)
        carried.tick(0.1, now=800.0)
        self.assertNotEqual(carried.brain.state.activity, Activity.SLEEP)


class TestCliLivePaths(unittest.TestCase):
    def test_run_is_deterministic_with_seed(self):
        outputs = []
        for _ in range(2):
            with tempfile.TemporaryDirectory() as tmp:
                env = dict(os.environ)
                env["DESKTOP_PET_DATA_DIR"] = tmp
                proc = subprocess.run(
                    [sys.executable, "-m", "pet", "run",
                     "--ticks", "100", "--seed", "7", "--no-save"],
                    cwd=ROOT, capture_output=True, text=True,
                    env=env, timeout=60)
            self.assertEqual(proc.returncode, 0)
            outputs.append(proc.stdout)
        self.assertEqual(outputs[0], outputs[1])
        self.assertIn("wakes up", outputs[0])

    def test_gui_without_display_exits_honestly(self):
        env = dict(os.environ)
        env["DESKTOP_PET_NO_DISPLAY"] = "1"
        proc = subprocess.run(
            [sys.executable, "-m", "pet", "gui"],
            cwd=ROOT, capture_output=True, text=True, timeout=60,
            env=env)
        combined = (proc.stdout or "") + (proc.stderr or "")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("no window today", combined.lower())


if __name__ == "__main__":
    unittest.main()
