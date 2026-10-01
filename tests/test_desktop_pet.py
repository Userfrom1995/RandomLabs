"""Static gate for the desktop pet companion (behavior brain plus window).

Verifies file wiring, the stdlib-only and GUI-free core rule, absence of
facade markers, and unified docs. Behavior itself is covered headlessly
in pet/tests/ (run: python -m pet selftest).
Run: python3 tests/test_desktop_pet.py
"""
import os
import re
import ast
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PET = ROOT / "pet"
CORE = PET / "pet_core"
APP = PET / "pet_app"

REQUIRED_CORE = [
    "__init__.py",
    "state.py",
    "brain.py",
    "needs.py",
    "personality.py",
    "persistence.py",
]
REQUIRED_APP = [
    "__init__.py",
    "sprite.py",
    "platform.py",
    "controller.py",
    "window.py",
]
REQUIRED_TOP = ["__init__.py", "__main__.py", "README.md", "index.html"]
REQUIRED_DOCS = ["index.md", "index.html"]

FORBIDDEN_IMPORTS = ("tkinter", "pygame", "numpy", "PIL", "requests", "plyer")
THIRD_PARTY_IMPORTS = ("pygame", "numpy", "PIL", "requests", "plyer")
GUI_FREE_APP_MODULES = ("sprite.py", "platform.py", "controller.py")
FACADE_MARKERS = (
    "coming soon",
    "coming-soon",
    "TODO",
    "NotImplementedError",
    "pass-through",
    "honest scope: deferred",
)
MILESTONE_PATTERNS = (
    r"\bM[1-9]\b",
    r"[Mm]ilestone \d+",
    r"this milestone",
    r"[Ss]print",
    r"[Cc]hangelog",
)


class TestDesktopPetWiring(unittest.TestCase):
    def test_required_files_exist(self):
        for name in REQUIRED_CORE:
            self.assertTrue((CORE / name).is_file(), "missing pet/pet_core/%s" % name)
        for name in REQUIRED_APP:
            self.assertTrue((APP / name).is_file(), "missing pet/pet_app/%s" % name)
        for name in REQUIRED_TOP:
            self.assertTrue((PET / name).is_file(), "missing pet/%s" % name)
        for name in REQUIRED_DOCS:
            self.assertTrue((PET / "docs" / name).is_file(),
                            "missing pet/docs/%s" % name)
        self.assertTrue((PET / "tests" / "__init__.py").is_file())
        for name in ("test_sprite.py", "test_window.py"):
            self.assertTrue((PET / "tests" / name).is_file(),
                            "missing pet/tests/%s" % name)

    def _imports_of(self, path: Path) -> list[str]:
        """Top-level imported module names via AST (docstrings ignored)."""
        tree = ast.parse(path.read_text(encoding="utf-8"))
        names: list[str] = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                names.extend(a.name.split(".")[0] for a in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                names.append(node.module.split(".")[0])
        return names

    def _calls_input(self, path: Path) -> bool:
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                if node.func.id == "input":
                    return True
        return False

    def test_core_is_gui_and_dependency_free(self):
        for path in CORE.glob("*.py"):
            imported = self._imports_of(path)
            for mod in FORBIDDEN_IMPORTS:
                self.assertNotIn(
                    mod, imported,
                    "%s imports forbidden module %s" % (path.name, mod))
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("pip install", text,
                             "%s must not require pip installs" % path.name)
            self.assertFalse(self._calls_input(path),
                             "%s must not block on input()" % path.name)

    def test_main_is_noninteractive(self):
        self.assertFalse(self._calls_input(PET / "__main__.py"))

    def test_app_is_stdlib_only(self):
        for path in APP.glob("*.py"):
            imported = self._imports_of(path)
            for mod in THIRD_PARTY_IMPORTS:
                self.assertNotIn(
                    mod, imported,
                    "%s imports third-party module %s" % (path.name, mod))
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("pip install", text,
                             "%s must not require pip installs" % path.name)
            self.assertFalse(self._calls_input(path),
                             "%s must not block on input()" % path.name)

    def test_app_logic_layers_are_gui_free(self):
        for name in GUI_FREE_APP_MODULES:
            imported = self._imports_of(APP / name)
            self.assertNotIn(
                "tkinter", imported,
                "%s must stay import-safe without tkinter" % name)

    def test_no_facade_markers_in_app(self):
        for path in list(APP.glob("*.py")) + [PET / "__main__.py"]:
            text = path.read_text(encoding="utf-8")
            for marker in FACADE_MARKERS:
                self.assertNotIn(marker, text,
                                 "%s contains facade marker %r" % (path.name, marker))

    def test_no_facade_markers_in_core(self):
        for path in list(CORE.glob("*.py")) + [PET / "__main__.py"]:
            text = path.read_text(encoding="utf-8")
            for marker in FACADE_MARKERS:
                self.assertNotIn(marker, text,
                                 "%s contains facade marker %r" % (path.name, marker))

    def test_docs_are_unified(self):
        for path in [PET / "README.md", PET / "docs" / "index.md",
                     PET / "index.html", PET / "docs" / "index.html"]:
            text = path.read_text(encoding="utf-8")
            for pattern in MILESTONE_PATTERNS:
                self.assertIsNone(
                    re.search(pattern, text),
                    "%s leaks milestone marker %r" % (path.name, pattern))
            self.assertNotIn("\u2014", text,
                             "%s contains an em dash" % path.name)

    def test_headless_suite_passes(self):
        env = dict(os.environ)
        with tempfile.TemporaryDirectory() as tmp:
            env["DESKTOP_PET_DATA_DIR"] = tmp
            proc = subprocess.run(
                [sys.executable, "-m", "unittest", "discover",
                 "-s", "pet/tests", "-t", "."],
                cwd=str(ROOT), capture_output=True, text=True, env=env,
                timeout=120)
        self.assertEqual(proc.returncode, 0, proc.stderr[-2000:])

    def test_cli_selftest_passes(self):
        env = dict(os.environ)
        with tempfile.TemporaryDirectory() as tmp:
            env["DESKTOP_PET_DATA_DIR"] = tmp
            proc = subprocess.run(
                [sys.executable, "-m", "pet", "selftest"],
                cwd=str(ROOT), capture_output=True, text=True, env=env,
                timeout=120)
        self.assertEqual(proc.returncode, 0, proc.stderr[-2000:] + proc.stdout[-2000:])
        self.assertIn("SELFTEST PASS", proc.stdout)

    def test_cli_help_mentions_gui(self):
        proc = subprocess.run(
            [sys.executable, "-m", "pet", "help"],
            cwd=str(ROOT), capture_output=True, text=True, timeout=60)
        self.assertEqual(proc.returncode, 0, proc.stderr[-2000:])
        self.assertIn("gui", proc.stdout)

    def test_cli_gui_help_needs_no_display(self):
        proc = subprocess.run(
            [sys.executable, "-m", "pet", "gui", "--help"],
            cwd=str(ROOT), capture_output=True, text=True, timeout=60)
        self.assertEqual(proc.returncode, 0, proc.stderr[-2000:])
        self.assertIn("--scale", proc.stdout)
        self.assertIn("--alpha", proc.stdout)


if __name__ == "__main__":
    unittest.main()
