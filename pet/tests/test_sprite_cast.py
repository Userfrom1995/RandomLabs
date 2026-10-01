"""Headless tests for the parametric sprite cast (Phase 2).

Every character renders through the same pose/shapes contract with its
own body plan, palette, and motion style. These tests pin the cast:
registry coverage, Pip motion identity with the shipped engine, pose
parity fixtures, palette/body-plan dispatch, DPI linearity per
character, hot-swap through the controller, and the Pages mirror
contract (every primitive kind the Python engine can emit must have a
JS painter).
"""

import math
import unittest

from pet.pet_app import sprite as sprite_mod
from pet.pet_app.sprite import (
    BODY_PLANS,
    CANVAS_BOX,
    CHARACTER_IDS,
    Pose,
    blend,
    body_plan_for,
    normalize_character,
    palette_for,
    pose_for,
    render_character,
    shapes,
)


class TestCastRegistry(unittest.TestCase):
    def test_six_characters_in_order(self):
        self.assertEqual(CHARACTER_IDS,
                         ("pip", "bramble", "mochi", "kiki", "rusty", "luna"))

    def test_body_plans_cover_all_six(self):
        plans = {body_plan_for(cid) for cid in CHARACTER_IDS}
        self.assertEqual(plans, set(BODY_PLANS))

    def test_body_plan_matches_catalog(self):
        from pet.pet_core import catalog as catalog_mod

        for cid in CHARACTER_IDS:
            record, _ = catalog_mod.get(cid)
            self.assertEqual(body_plan_for(cid), record["body_plan"])

    def test_palette_matches_catalog(self):
        from pet.pet_core import catalog as catalog_mod

        for cid in CHARACTER_IDS:
            record, _ = catalog_mod.get(cid)
            self.assertEqual(palette_for(cid), record["palette"])

    def test_unknown_character_normalizes_to_pip(self):
        self.assertEqual(normalize_character("nope"), "pip")
        self.assertEqual(normalize_character(None), "pip")
        self.assertEqual(normalize_character("  BRAMBLE  "), "bramble")
        self.assertEqual(body_plan_for("nope"), body_plan_for("pip"))
        self.assertEqual(palette_for("nope"), palette_for("pip"))

    def test_palette_values_are_hex(self):
        import re

        for cid in CHARACTER_IDS:
            palette = palette_for(cid)
            for key in ("body", "belly", "accent"):
                self.assertRegex(palette[key], r"^#[0-9a-fA-F]{6}$",
                                 "%s palette %s" % (cid, key))

    def test_palettes_distinct_per_character(self):
        bodies = {palette_for(cid)["body"] for cid in CHARACTER_IDS}
        self.assertEqual(len(bodies), len(CHARACTER_IDS))


class TestPoseCharacter(unittest.TestCase):
    ACTIVITIES = ("idle", "walk", "play", "sleep", "react", "carried",
                  "munch")

    def test_all_characters_pose(self):
        for cid in CHARACTER_IDS:
            for activity in self.ACTIVITIES:
                pose = pose_for(activity, 1.0, cid)
                self.assertIsInstance(pose, Pose, (cid, activity))

    def test_pip_pose_identity_with_legacy_defaults(self):
        # Pip passes no style layer: explicit pip matches omitted default.
        for activity in self.ACTIVITIES:
            self.assertEqual(pose_for(activity, 1.3),
                             pose_for(activity, 1.3, "pip"), activity)

    def test_character_first_spelling_matches(self):
        self.assertEqual(pose_for("bramble", "walk", 1.0),
                         pose_for("walk", 1.0, "bramble"))
        self.assertEqual(pose_for("luna", "sleep", 0.5),
                         pose_for("sleep", 0.5, "luna"))

    def test_non_pip_styles_differ_from_pip(self):
        for cid in ("bramble", "mochi", "kiki", "rusty", "luna"):
            with self.subTest(character=cid):
                differs = any(
                    pose_for(activity, 1.0, cid) != pose_for(activity, 1.0)
                    for activity in self.ACTIVITIES)
                self.assertTrue(differs, cid)

    def test_styles_are_bounded(self):
        for cid in CHARACTER_IDS:
            for activity in self.ACTIVITIES:
                pose = pose_for(activity, 2.2, cid)
                self.assertGreaterEqual(pose.eye_open, 0.0)
                self.assertLessEqual(pose.eye_open, 1.0)
                self.assertGreaterEqual(pose.blush, 0.0)
                self.assertLessEqual(pose.blush, 1.0)
                self.assertIn(pose.mouth, ("smile", "open", "sleep", "oh"))

    def test_bramble_jumps_highest_mochi_lowest(self):
        wave = math.pi / 4.0
        hops = {cid: pose_for("play", wave, cid).hop
                for cid in CHARACTER_IDS}
        self.assertGreater(hops["bramble"], hops["pip"])
        self.assertGreater(hops["pip"], hops["mochi"])
        self.assertGreater(hops["kiki"], hops["mochi"])

    def test_sleep_eyes_closed_for_all(self):
        for cid in CHARACTER_IDS:
            self.assertEqual(pose_for("sleep", 0.0, cid).eye_open, 0.0, cid)

    def test_pose_deterministic_per_character(self):
        for cid in CHARACTER_IDS:
            self.assertEqual(pose_for("walk", 2.5, cid),
                             pose_for("walk", 2.5, cid), cid)

    def test_pose_phase_wraps_per_character(self):
        for cid in CHARACTER_IDS:
            self.assertEqual(pose_for("play", 0.5, cid),
                             pose_for("play", 0.5 + 2.0 * math.pi, cid), cid)

    def test_unknown_character_pose_matches_pip(self):
        self.assertEqual(pose_for("walk", 1.0, "nope"),
                         pose_for("walk", 1.0, "pip"))

    def test_blend_across_characters(self):
        first = pose_for("idle", 0.0, "mochi")
        second = pose_for("react", 0.0, "bramble")
        mid = blend(first, second, 0.5)
        self.assertIsInstance(mid, Pose)


class TestShapesCast(unittest.TestCase):
    def test_every_character_renders(self):
        for cid in CHARACTER_IDS:
            drawing = render_character(cid, "idle", 0.5)
            self.assertGreater(len(drawing), 8, cid)
            for item in drawing:
                self.assertIn(item["kind"],
                              ("oval", "circle", "polygon", "arc", "line",
                               "text"), cid)

    def test_coordinates_bounded_for_all(self):
        for cid in CHARACTER_IDS:
            for activity in ("idle", "walk", "play", "sleep", "react",
                             "munch", "carried"):
                for item in render_character(cid, activity, 1.1):
                    for value in item["coords"]:
                        self.assertGreaterEqual(value, -CANVAS_BOX, (cid, activity))
                        self.assertLessEqual(value, 2.0 * CANVAS_BOX,
                                             (cid, activity))

    def test_body_uses_catalog_palette(self):
        for cid in CHARACTER_IDS:
            palette = palette_for(cid)
            drawing = render_character(cid, "idle", 0.0)
            fills = {item.get("fill") for item in drawing}
            self.assertIn(palette["body"], fills, cid)
            self.assertIn(palette["belly"], fills, cid)

    def test_characters_visually_distinct(self):
        pip = render_character("pip", "idle", 0.5)
        for cid in ("bramble", "mochi", "kiki", "rusty", "luna"):
            self.assertNotEqual(render_character(cid, "idle", 0.5), pip, cid)

    def test_robot_has_visor_and_antenna(self):
        drawing = render_character("rusty", "idle", 0.3)
        fills = [item.get("fill") for item in drawing]
        self.assertIn("#3C4043", fills)  # visor backing
        self.assertIn(palette_for("rusty")["accent"], fills)

    def test_slime_has_shine_and_puddle(self):
        drawing = render_character("mochi", "idle", 0.3)
        fills = [item.get("fill") for item in drawing]
        self.assertIn("#ffffff", fills)

    def test_winged_has_extra_geometry(self):
        pip = render_character("pip", "walk", 0.7)
        luna = render_character("luna", "walk", 0.7)
        self.assertGreater(len(luna), len(pip))

    def test_sleep_markers_for_all(self):
        for cid in CHARACTER_IDS:
            texts = [i for i in render_character(cid, "sleep", 0.5)
                     if i["kind"] == "text"]
            self.assertTrue(texts, cid)

    def test_scale_linearity_per_character(self):
        for cid in CHARACTER_IDS:
            small = render_character(cid, "walk", 1.2, size=80.0)
            big = render_character(cid, "walk", 1.2, size=160.0)
            self.assertEqual(len(small), len(big), cid)
            for left, right in zip(small, big):
                self.assertEqual(left["kind"], right["kind"], cid)
                for lval, rval in zip(left["coords"], right["coords"]):
                    self.assertAlmostEqual(rval, lval * 2.0, places=6)

    def test_unknown_character_shapes_match_pip(self):
        self.assertEqual(shapes(pose_for("idle", 0.4), character_id="nope"),
                         shapes(pose_for("idle", 0.4), character_id="pip"))

    def test_shapes_positional_compat(self):
        # Old call sites pass (pose) or (pose, size): both keep working.
        pose = pose_for("idle", 0.2)
        self.assertEqual(shapes(pose), shapes(pose, 160.0, "pip"))


class TestHotSwap(unittest.TestCase):
    def test_controller_pose_follows_character(self):
        from pet.pet_app.controller import WindowController

        app = WindowController(seed=11)
        app.brain.set_character("bramble")
        pose = app.current_pose()
        self.assertEqual(pose, pose_for(app._shown_activity, app.phase,
                                       "bramble"))

    def test_switch_character_returns_event_and_rerenders(self):
        from pet.pet_app.controller import WindowController

        app = WindowController(seed=11)
        text, notice = app.switch_character("mochi")
        self.assertIsInstance(text, str)
        self.assertTrue(text)
        self.assertIsNone(notice)
        self.assertEqual(app.brain.state.character_id, "mochi")
        self.assertEqual(app.brain.personality.character_id, "mochi")
        drawing = sprite_mod.shapes(app.current_pose(), size=160.0,
                                    character_id="mochi")
        self.assertIn(palette_for("mochi")["body"],
                      {item.get("fill") for item in drawing})

    def test_switch_unknown_falls_back_with_notice(self):
        from pet.pet_app.controller import WindowController

        app = WindowController(seed=11)
        text, notice = app.switch_character("nope-not-real")
        self.assertIsNotNone(notice)
        self.assertIn("Pip", notice)
        self.assertEqual(app.brain.state.character_id, "pip")

    def test_switch_cycles_all_characters(self):
        from pet.pet_app.controller import WindowController

        app = WindowController(seed=11)
        for cid in CHARACTER_IDS:
            app.switch_character(cid)
            self.assertEqual(app.brain.state.character_id, cid, cid)


class TestPagesMirrorContract(unittest.TestCase):
    def test_js_mirror_covers_all_primitives(self):
        import pathlib

        hub = (pathlib.Path(__file__).resolve().parents[1]
               / "index.html").read_text(encoding="utf-8")
        for kind in ("oval", "circle", "polygon", "arc", "line", "text"):
            self.assertIn(kind, hub, kind)

    def test_js_mirror_covers_cast(self):
        import pathlib

        hub = (pathlib.Path(__file__).resolve().parents[1]
               / "index.html").read_text(encoding="utf-8")
        for cid in CHARACTER_IDS:
            self.assertIn(cid, hub, cid)


if __name__ == "__main__":
    unittest.main()
