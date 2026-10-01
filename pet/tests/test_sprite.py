"""Headless tests for the procedural sprite pose engine."""

import unittest

from pet.pet_app.sprite import CANVAS_BOX, Pose, blend, draw_on, pose_for, shapes


class TestPosePure(unittest.TestCase):
    def test_all_activities_return_pose(self):
        for name in ("idle", "walk", "play", "sleep", "react", "carried"):
            pose = pose_for(name, 1.0)
            self.assertIsInstance(pose, Pose)

    def test_unknown_activity_falls_back_to_idle(self):
        self.assertEqual(pose_for("dance", 1.0), pose_for("idle", 1.0))

    def test_bad_phase_falls_back_to_zero(self):
        self.assertEqual(pose_for("idle", "nope"), pose_for("idle", 0.0))
        self.assertEqual(pose_for("idle", float("nan")), pose_for("idle", 0.0))

    def test_deterministic(self):
        self.assertEqual(pose_for("walk", 2.5), pose_for("walk", 2.5))

    def test_phase_wraps(self):
        import math
        self.assertEqual(pose_for("play", 0.5),
                         pose_for("play", 0.5 + 2.0 * math.pi))

    def test_accepts_core_activity_enum(self):
        from pet.pet_core.state import Activity
        self.assertEqual(pose_for(Activity.SLEEP, 0.3), pose_for("sleep", 0.3))

    def test_sleep_eyes_closed_and_idle_blinks(self):
        self.assertEqual(pose_for("sleep", 0.0).eye_open, 0.0)
        open_pose = pose_for("idle", 0.0)
        self.assertGreater(open_pose.eye_open, 0.9)

    def test_react_is_taller_than_sleep(self):
        self.assertGreater(pose_for("react", 0.0).squash_y,
                           pose_for("sleep", 0.0).squash_y)

    def test_play_hops(self):
        import math
        self.assertGreater(pose_for("play", math.pi / 4.0).hop, 0.0)

    def test_continuity_small_phase_step(self):
        before = pose_for("walk", 1.0)
        after = pose_for("walk", 1.01)
        for field in ("squash_x", "squash_y", "eye_open", "tail_angle", "hop"):
            self.assertLess(abs(getattr(after, field) - getattr(before, field)),
                            0.08, field)


class TestBlend(unittest.TestCase):
    def test_endpoints(self):
        first = pose_for("idle", 0.0)
        second = pose_for("react", 0.0)
        self.assertEqual(blend(first, second, 0.0).squash_y, first.squash_y)
        self.assertEqual(blend(first, second, 1.0).squash_y, second.squash_y)

    def test_midpoint_between(self):
        first = pose_for("idle", 0.0)
        second = pose_for("react", 0.0)
        mid = blend(first, second, 0.5)
        low = min(first.squash_y, second.squash_y)
        high = max(first.squash_y, second.squash_y)
        self.assertGreaterEqual(mid.squash_y, low - 1e-9)
        self.assertLessEqual(mid.squash_y, high + 1e-9)

    def test_clamps_t(self):
        first = pose_for("idle", 0.0)
        second = pose_for("react", 0.0)
        self.assertEqual(blend(first, second, -5.0).mouth,
                         blend(first, second, 0.0).mouth)
        self.assertEqual(blend(first, second, 99.0).mouth,
                         blend(first, second, 1.0).mouth)


class TestShapes(unittest.TestCase):
    def test_nonempty_and_bounded(self):
        drawing = shapes(pose_for("idle", 0.5))
        self.assertGreater(len(drawing), 8)
        for item in drawing:
            self.assertIn(item["kind"],
                          ("oval", "circle", "polygon", "arc", "line", "text"))
            for value in item["coords"]:
                self.assertGreaterEqual(value, -CANVAS_BOX)
                self.assertLessEqual(value, 2.0 * CANVAS_BOX)

    def test_sleep_has_z_markers(self):
        drawing = shapes(pose_for("sleep", 0.5))
        texts = [i for i in drawing if i["kind"] == "text"]
        self.assertTrue(texts)

    def test_idle_has_no_z_markers(self):
        drawing = shapes(pose_for("idle", 0.5))
        texts = [i for i in drawing if i["kind"] == "text"]
        self.assertFalse(texts)

    def test_scale_linearity(self):
        small = shapes(pose_for("walk", 1.2), size=80.0)
        big = shapes(pose_for("walk", 1.2), size=160.0)
        self.assertEqual(len(small), len(big))
        for left, right in zip(small, big):
            self.assertEqual(left["kind"], right["kind"])
            for lval, rval in zip(left["coords"], right["coords"]):
                self.assertAlmostEqual(rval, lval * 2.0, places=6)

    def test_bad_size_falls_back(self):
        drawing = shapes(pose_for("idle", 0.0), size=-3.0)
        self.assertTrue(drawing)

    def test_react_differs_from_idle(self):
        first = shapes(pose_for("idle", 0.0))
        second = shapes(pose_for("react", 0.0))
        self.assertNotEqual(first, second)


class FakeCanvas:
    def __init__(self):
        self.calls: list[tuple] = []

    def __getattr__(self, name):
        def record(*args, **kwargs):
            self.calls.append((name, args, kwargs))
        return record


class TestDrawOn(unittest.TestCase):
    def test_paints_without_tkinter(self):
        canvas = FakeCanvas()
        draw_on(canvas, shapes(pose_for("play", 0.7)))
        self.assertTrue(canvas.calls)
        kinds = {call[0] for call in canvas.calls}
        self.assertIn("create_oval", kinds)

    def test_offset_shifts_coordinates(self):
        plain = FakeCanvas()
        shifted = FakeCanvas()
        drawing = shapes(pose_for("idle", 0.2))
        draw_on(plain, drawing)
        draw_on(shifted, drawing, dx=10.0, dy=20.0)
        self.assertEqual(len(plain.calls), len(shifted.calls))
        for first, second in zip(plain.calls, shifted.calls):
            for index, value in enumerate(first[1]):
                if isinstance(value, (int, float)):
                    want = value + (10.0 if index % 2 == 0 else 20.0)
                    self.assertAlmostEqual(second[1][index], want)


if __name__ == "__main__":
    unittest.main()
