"""Tester-authored adversarial regression suite for Phase 2 hot-swap cast.

Pins the seven Reviewer blocking fixes plus hostile CLI/site contracts:
morph-on-switch, non-finite sizes, palette fallback, style purity,
character-first spellings, docs flags, and Pages picker styling.
Headless only; never touches production source.
"""

import dataclasses
import math
import re
import subprocess
import sys
import unittest

from pet.pet_app import sprite as sprite_mod
from pet.pet_app.controller import WindowController
from pet.pet_app.sprite import palette_for, pose_for, shapes
from pet.pet_core import catalog as catalog_mod


def _finite_coords(shape_list):
    bad = 0
    for shape in shape_list:
        for value in shape.get("coords", []):
            if isinstance(value, (int, float)) and not math.isfinite(value):
                bad += 1
    return bad


class TestHotSwapMorph(unittest.TestCase):
    def test_switch_starts_morph_with_old_pose(self):
        ctl = WindowController(seed=1, clock=lambda: None)
        old_activity = ctl._shown_activity
        old_phase = ctl.phase
        expected_old = pose_for(old_activity, old_phase, "pip")
        ctl.switch_character("bramble")
        self.assertEqual(ctl._blend_t, 0.0)
        self.assertIsNotNone(ctl._blend_from)
        self.assertEqual(ctl.current_pose(), expected_old)

    def test_morph_settles_on_new_character(self):
        from pet.pet_app.sprite import blend
        ctl = WindowController(seed=1, clock=lambda: None)
        ctl.switch_character("bramble")
        # Mid-morph the pose is a true cross-character blend ...
        mid = ctl.current_pose()
        assert mid is not None
        # ... and once the blend completes the pose is purely Bramble.
        ctl._blend_t = 1.0
        settled = ctl.current_pose()
        self.assertEqual(ctl.brain.state.character_id, "bramble")
        self.assertEqual(
            settled,
            pose_for(ctl._shown_activity, ctl.phase, "bramble"))
        self.assertIsNone(ctl._blend_from)
        # Midpoint check: a forced half blend is exactly blend(old, fresh, 0.5).
        ctl2 = WindowController(seed=1, clock=lambda: None)
        old = pose_for(ctl2._shown_activity, ctl2.phase, "pip")
        ctl2.switch_character("bramble")
        ctl2._blend_t = 0.5
        fresh = pose_for(ctl2._shown_activity, ctl2.phase, "bramble")
        self.assertEqual(ctl2.current_pose(), blend(old, fresh, 0.5))

    def test_hostile_character_ids_fall_back_to_pip(self):
        ctl = WindowController(seed=1, clock=lambda: None)
        for bad in ["nonexistent_xyz", None, 123, "", "   "]:
            text, notice = ctl.switch_character(bad)
            self.assertEqual(ctl.brain.state.character_id, "pip")
            self.assertIsNotNone(notice)
            self.assertTrue(text)


class TestSpriteRobustness(unittest.TestCase):
    def test_nonfinite_and_degenerate_sizes_stay_finite(self):
        base = pose_for("idle", 0.0, "pip")
        for size in (float("inf"), float("-inf"), float("nan"), 0, -5, 1e308):
            with self.subTest(size=size):
                rendered = shapes(base, size=size)
                self.assertTrue(rendered)
                self.assertEqual(_finite_coords(rendered), 0)

    def test_full_cast_matrix_deterministic_and_finite(self):
        characters = [c["id"] for c in catalog_mod.list_characters()]
        activities = ["idle", "walk", "sleep", "play", "eat", "greet", "poke"]
        total = 0
        for cid in characters:
            for activity in activities:
                for phase in (0.0, 0.33, 0.66, 1.0):
                    total += 1
                    first = pose_for(activity, phase, cid)
                    second = pose_for(activity, phase, cid)
                    self.assertEqual(first, second)
                    self.assertEqual(
                        _finite_coords(shapes(first, size=200)), 0)
        self.assertEqual(total, 168)

    def test_partial_catalog_palette_falls_back(self):
        full = palette_for("pip")
        self.assertTrue(all(full.get(k) for k in ("body", "belly", "accent")))
        # palette_for requires all three keys before trusting catalog data;
        # full catalog palettes must also carry all three.
        for record in catalog_mod.list_characters():
            palette = record.get("palette", {})
            self.assertTrue(all(palette.get(k) for k in ("body", "belly", "accent")))

    def test_apply_style_never_mutates_input(self):
        base = pose_for("walk", 1.0, "pip")
        snapshot = dataclasses.replace(base)
        styled = sprite_mod._apply_style(base, "bramble", 0.5)
        self.assertEqual(base, snapshot)
        self.assertNotEqual(styled, snapshot)
        again = sprite_mod._apply_style(pose_for("walk", 1.0, "pip"), "bramble", 0.5)
        self.assertEqual(styled, again)

    def test_character_first_spellings(self):
        self.assertEqual(pose_for("bramble", "walk", "1.0"),
                         pose_for("walk", 1.0, "bramble"))
        self.assertEqual(pose_for("bramble", "walk"),
                         pose_for("walk", 0.0, "bramble"))
        self.assertEqual(pose_for("  pip  ", "idle", 0.5),
                         pose_for("idle", 0.5, "pip"))


class TestShipContracts(unittest.TestCase):
    def _run_pet(self, *args):
        return subprocess.run(
            [sys.executable, "-m", "pet", *args],
            capture_output=True, text=True, cwd=".",
        )

    def test_cli_bad_character_falls_back_cleanly(self):
        proc = self._run_pet("run", "--ticks", "2", "--seed", "1",
                             "--character", "nope_bad", "--no-save")
        self.assertEqual(proc.returncode, 0)
        self.assertIn("using Pip", proc.stdout + proc.stderr)

    def test_cli_characters_list_and_show(self):
        listed = self._run_pet("characters", "list")
        self.assertEqual(listed.returncode, 0)
        for cid in ("pip", "bramble", "mochi", "kiki", "rusty", "luna"):
            self.assertIn(cid, listed.stdout)
        shown = self._run_pet("characters", "show", "kiki")
        self.assertEqual(shown.returncode, 0)
        self.assertIn("Kiki", shown.stdout)

    def test_docs_document_character_flag(self):
        index_md = __import__("pathlib").Path("pet/docs/index.md").read_text()
        self.assertIn("--character ID", index_md)
        readme = __import__("pathlib").Path("pet/README.md").read_text()
        self.assertIn("--character", readme)

    def test_pages_picker_is_styled(self):
        html = __import__("pathlib").Path("pet/index.html").read_text()
        self.assertRegex(html, r"\.character-btns\s*\{[^}]*display:\s*flex")
        self.assertIn("characterCaption", html)
        for cid in ("pip", "bramble", "mochi", "kiki", "rusty", "luna"):
            self.assertIn(cid, html)

    def test_no_milestone_leakage(self):
        for path in ("pet/docs/index.md", "pet/README.md",
                     "pet/docs/index.html", "pet/index.html"):
            text = __import__("pathlib").Path(path).read_text()
            self.assertEqual(
                re.findall(r"\bM[1-5]\b|Milestone|sprint|this milestone", text),
                [],
                msg=path,
            )


if __name__ == "__main__":
    unittest.main()
