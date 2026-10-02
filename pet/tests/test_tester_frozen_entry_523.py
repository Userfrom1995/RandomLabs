"""Tester regression for PR 523 (issue #515): frozen-bundle entry repair.

Verifies, independent of the Builder's own suite:
- All three source entrypoints agree on the version string.
- Frozen `-m pet` argv prefix is stripped only when sys.frozen is set.
- The shim uses only absolute imports; package main has no relative imports.
"""

import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent


def run_entry(*argv):
    return subprocess.run(
        [sys.executable, *argv],
        cwd=str(ROOT), capture_output=True, text=True, timeout=120)


class TestFrozenEntry523(unittest.TestCase):
    def test_three_entrypoints_agree(self):
        a = run_entry("-m", "pet", "version", "--porcelain")
        b = run_entry("pet/__main__.py", "version", "--porcelain")
        c = run_entry(str(Path("pet") / "packaging" / "entry.py"),
                      "version", "--porcelain")
        for proc in (a, b, c):
            self.assertEqual(proc.returncode, 0, proc.stderr[-1000:])
        self.assertEqual(a.stdout.strip(), b.stdout.strip())
        self.assertEqual(a.stdout.strip(), c.stdout.strip())
        self.assertRegex(a.stdout.strip(), r"^\d+\.\d+\.\d+")

    def test_frozen_m_pet_prefix_stripped(self):
        import importlib
        import pet.__main__ as m
        importlib.reload(m)
        old = getattr(sys, "frozen", None)
        had = hasattr(sys, "frozen")
        try:
            sys.frozen = True
            rc = m.main(["-m", "pet", "version", "--porcelain"])
            self.assertEqual(rc, 0)
        finally:
            if had:
                sys.frozen = old
            else:
                delattr(sys, "frozen")

    def test_unfrozen_m_pet_prefix_not_stripped(self):
        from pet.__main__ import main
        if getattr(sys, "frozen", False):
            self.skipTest("unfrozen-only check")
        with self.assertRaises(SystemExit) as ctx:
            main(["-m", "pet", "version"])
        self.assertEqual(ctx.exception.code, 2)

    def test_no_relative_imports(self):
        for rel in ("pet/__main__.py", "pet/packaging/entry.py"):
            text = (ROOT / rel).read_text(encoding="utf-8")
            for line in text.splitlines():
                s = line.strip()
                if s.startswith("from ."):
                    self.fail("%s keeps relative import: %r" % (rel, line))
        shim = (ROOT / "pet" / "packaging" / "entry.py").read_text(
            encoding="utf-8")
        self.assertIn("from pet.__main__ import main", shim)

    def test_spec_points_at_shim(self):
        spec = (ROOT / "pet" / "packaging" / "desktop-pet.spec").read_text(
            encoding="utf-8")
        entry_lines = [l for l in spec.splitlines()
                       if l.strip().startswith("ENTRY")]
        self.assertTrue(entry_lines)
        for line in entry_lines:
            self.assertIn("entry.py", line)
            self.assertNotIn("__main__.py", line)
        self.assertIn("pathex", spec)
        self.assertIn("datas=", spec)


if __name__ == "__main__":
    unittest.main()
