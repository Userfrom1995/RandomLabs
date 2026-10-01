"""Tester final-phase regression (PR 503, issue #498).

Covers the two gate-blocking fixes plus packaging fail-closed guards:
- DESKTOP_PET_NO_DISPLAY override forces headless for every truthy spelling.
- run_menu_action("settings") returns the live settings summary.
- build.sh / build-windows.ps1 fail closed when the bundle selftest fails.
- desktop-pet.spec entry resolves to pet/__main__.py (console build keeps CLI).
"""

import os
import unittest
from pathlib import Path

from pet.pet_app import platform as platform_mod
from pet.pet_app.controller import WindowController
from pet.pet_core.brain import Brain


class TestHeadlessOverride(unittest.TestCase):
    def test_all_truthy_spellings_force_headless(self):
        old = os.environ.get("DESKTOP_PET_NO_DISPLAY")
        try:
            for value in ("1", "true", "yes", "on", "TRUE", " On "):
                os.environ["DESKTOP_PET_NO_DISPLAY"] = value
                self.assertFalse(platform_mod.has_display(),
                                 "override %r should force headless" % value)
        finally:
            if old is None:
                os.environ.pop("DESKTOP_PET_NO_DISPLAY", None)
            else:
                os.environ["DESKTOP_PET_NO_DISPLAY"] = old


class TestSettingsActionSummary(unittest.TestCase):
    def test_settings_action_reflects_live_state(self):
        app = WindowController(brain=Brain(seed=11))
        text, quit_flag = app.run_menu_action("settings")
        self.assertFalse(quit_flag)
        self.assertEqual(text, app.settings.describe())
        self.assertIn("wander=", text)


class TestPackagingFailClosed(unittest.TestCase):
    def test_build_sh_fails_closed(self):
        text = Path("pet/packaging/build.sh").read_text(encoding="utf-8")
        self.assertIn("bundle selftest failed", text)
        self.assertIn("exit 1", text)
        self.assertNotIn("selftest >/dev/null && echo", text)

    def test_build_ps1_checks_lastexitcode(self):
        text = Path("pet/packaging/build-windows.ps1").read_text(
            encoding="utf-8")
        self.assertIn("$LASTEXITCODE", text)
        self.assertIn("exit 1", text)

    def test_spec_entry_resolves(self):
        from pathlib import Path as _P  # noqa: F401
        spec = Path("pet/packaging/desktop-pet.spec").read_text(
            encoding="utf-8")
        self.assertIn("__main__.py", spec)
        self.assertIn("console=True", spec)
        self.assertTrue(Path("pet/__main__.py").exists())


if __name__ == "__main__":
    unittest.main()
