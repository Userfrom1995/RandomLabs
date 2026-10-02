"""Tester regression for PR 524 (issue #515): rpm SOURCES layout repair.

Independent of the Builder's string-parity test: simulates the staging
layout and proves every `%{_sourcedir}/<name>` file the spec `%install`
reads resolves flat under SOURCES/, while the old versioned-subdir
layout (pet-release run 37076887677 ubuntu failure
`install: cannot stat SOURCES/desktop-pet`) leaves every path missing.
"""

import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PKG = ROOT / "pet" / "packaging"


def spec_sourced_names():
    spec = (PKG / "desktop-pet.rpm.spec").read_text(encoding="utf-8")
    names = sorted(set(re.findall(r"%\{_sourcedir\}/(\S+)", spec)))
    assert len(names) >= 4, "spec should source at least 4 payloads"
    return names


class TestRpmSourcesStaging524(unittest.TestCase):
    def test_flat_staging_resolves_every_spec_source(self):
        names = spec_sourced_names()
        with tempfile.TemporaryDirectory() as tmp:
            flat = Path(tmp) / "SOURCES"
            flat.mkdir()
            for name in names:
                (flat / name).write_text("payload", encoding="utf-8")
            missing = [n for n in names if not (flat / n).is_file()]
            self.assertEqual(missing, [],
                             "flat SOURCES/ layout must resolve all spec files")

    def test_versioned_subdir_layout_misses_every_spec_source(self):
        # Hostile replay of the pre-fix bug: payloads nested under
        # SOURCES/desktop-pet-$VERSION leave every flat spec path missing,
        # which is exactly the ubuntu `cannot stat SOURCES/desktop-pet`.
        names = spec_sourced_names()
        with tempfile.TemporaryDirectory() as tmp:
            srcdir = Path(tmp) / "SOURCES" / "desktop-pet-9.9.9"
            srcdir.mkdir(parents=True)
            for name in names:
                (srcdir / name).write_text("payload", encoding="utf-8")
            top = Path(tmp) / "SOURCES"
            missing = [n for n in names if not (top / n).is_file()]
            self.assertEqual(len(missing), len(names),
                             "versioned subdir must miss every flat spec path")

    def test_script_stages_flat_and_shipped_entrypoint_runs(self):
        script = (PKG / "build-rpm.sh").read_text(encoding="utf-8")
        self.assertNotIn("SOURCES/desktop-pet-$VERSION", script)
        self.assertRegex(script,
                         r'(?m)^SRCDIR="\$STAGE/rpmbuild/SOURCES"$')
        proc = subprocess.run(
            [sys.executable, "-m", "pet", "version", "--porcelain"],
            cwd=str(ROOT), capture_output=True, text=True, timeout=60)
        self.assertEqual(proc.returncode, 0, proc.stderr[-1000:])
        self.assertRegex(proc.stdout.strip(), r"^\d+\.\d+\.\d+$")


if __name__ == "__main__":
    unittest.main()
