"""Tester final-phase regression (PR 503, issue #498).

Covers the two gate-blocking fixes plus packaging fail-closed guards:
- DESKTOP_PET_NO_DISPLAY override forces headless for every truthy spelling.
- run_menu_action("settings") returns the live settings summary.
- build.sh / build-windows.ps1 fail closed when the bundle selftest fails.
- desktop-pet.spec entry resolves to the packaging shim (absolute imports
  only, so the frozen bundle has a parent package; issue #515).
- Direct-script runs (`python pet/__main__.py`, `python
  pet/packaging/entry.py`) work like `python -m pet` (issue #515).
"""

import os
import subprocess
import sys
import unittest
from pathlib import Path

from pet.pet_app import platform as platform_mod
from pet.pet_app.controller import WindowController
from pet.pet_core.brain import Brain

ROOT = Path(__file__).resolve().parent.parent.parent


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
        text = (ROOT / "pet" / "packaging" / "build.sh").read_text(encoding="utf-8")
        self.assertIn("bundle selftest failed", text)
        self.assertIn("exit 1", text)
        self.assertNotIn("selftest >/dev/null && echo", text)

    def test_build_ps1_checks_lastexitcode(self):
        text = (ROOT / "pet" / "packaging" / "build-windows.ps1").read_text(
            encoding="utf-8")
        self.assertIn("$LASTEXITCODE", text)
        self.assertIn("exit 1", text)

    def test_spec_entry_resolves(self):
        spec = (ROOT / "pet" / "packaging" / "desktop-pet.spec").read_text(
            encoding="utf-8")
        # The frozen entry is the packaging shim (absolute imports only):
        # freezing pet/__main__.py directly breaks because a frozen
        # top-level __main__ has no parent package for relative imports.
        entry_lines = [line for line in spec.splitlines()
                       if line.strip().startswith("ENTRY")]
        self.assertTrue(entry_lines, "spec has no ENTRY assignment")
        for line in entry_lines:
            self.assertIn("entry.py", line)
            self.assertNotIn("__main__.py", line,
                             "frozen ENTRY must be the shim, not __main__")
        self.assertIn("console=True", spec)
        # The bundle selftest reads repo files (packaging scripts,
        # hub/docs pages) via __file__-derived paths, which land in the
        # _MEI extract dir when frozen, so the pet/ tree must ship as
        # data preserving its repo-relative layout.
        self.assertIn('"pet"', spec)
        self.assertIn("datas=", spec)
        shim = (ROOT / "pet" / "packaging" / "entry.py").read_text(
            encoding="utf-8")
        self.assertIn("from pet.__main__ import main", shim)
        self.assertTrue((ROOT / "pet" / "packaging" / "entry.py").exists())
        self.assertTrue((ROOT / "pet" / "__main__.py").exists())


class TestFrozenEntryShim(unittest.TestCase):
    def _run(self, *argv: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, *argv],
            cwd=str(ROOT), capture_output=True, text=True, timeout=120)

    @unittest.skipIf(getattr(sys, "frozen", False),
                     "frozen bundle has no .py entry to exec; "
                     "source-tree invocation only")
    def test_direct_script_run_matches_package_run(self):
        # Maiden pet-release run 37074448281 failed here: freezing
        # pet/__main__.py directly left the bundle with no parent
        # package, so `from . import __version__` raised ImportError.
        script = self._run("pet/__main__.py", "version")
        package = self._run("-m", "pet", "version")
        self.assertEqual(script.returncode, 0, script.stderr[-1000:])
        self.assertEqual(script.stdout, package.stdout)
        self.assertIn("desktop-pet", script.stdout)

    @unittest.skipIf(getattr(sys, "frozen", False),
                     "frozen bundle has no .py shim to exec; "
                     "source-tree invocation only")
    def test_entry_shim_runs_like_package(self):
        shim = self._run(str(Path("pet") / "packaging" / "entry.py"),
                         "version", "--porcelain")
        package = self._run("-m", "pet", "version", "--porcelain")
        self.assertEqual(shim.returncode, 0, shim.stderr[-1000:])
        self.assertEqual(shim.stdout.strip(), package.stdout.strip())

    def test_no_relative_imports_in_package_main(self):
        text = (ROOT / "pet" / "__main__.py").read_text(encoding="utf-8")
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith("from .") or stripped == "from .":
                self.fail("relative import survives in pet/__main__.py: %r"
                          % line)

    def test_windows_probe_is_stop_safe(self):
        text = (ROOT / "pet" / "packaging" / "build-windows.ps1").read_text(
            encoding="utf-8")
        self.assertIn("Stop-safe", text)
        self.assertIn("$probeCode", text)


if __name__ == "__main__":
    unittest.main()
