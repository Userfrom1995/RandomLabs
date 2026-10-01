"""Tester CLI-level nonfinite regression suite (Phase 4 follow-up, Refs #498).

The Evaluator's crash-grade finding on PR #502: infinite/NaN hour inputs
poisoned bedtime/wake to NaN and crashed describe(). The Fixer repaired
_clean_hour/parse_setting_value/_clock_parts with math.isfinite guards and
added unit-level tests in test_settings.py. This suite pins the fix at the
shipped entrypoint level: every nonfinite spelling must exit 2 through
`python -m pet settings --set`, and a hand-edited settings.json holding
Infinity (valid Python json, reachable without the CLI) must boot to safe
defaults instead of crashing.

Run: python3 -m unittest pet.tests.test_tester_phase4_nonfinite_cli -v
"""

import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


def run_pet(*argv):
    return subprocess.run(
        [sys.executable, "-m", "pet"] + list(argv),
        cwd=ROOT, capture_output=True, text=True, timeout=120,
    )


class TestNonfiniteCliRejected(unittest.TestCase):
    def test_inf_nan_spellings_exit_2(self):
        for bad in ("inf", "-inf", "nan", "Infinity", "NaN", "INF"):
            with tempfile.TemporaryDirectory() as tmp:
                path = os.path.join(tmp, "s.json")
                for field in ("bedtime", "wake"):
                    proc = run_pet("settings", "--save", path,
                                   "--set", "%s=%s" % (field, bad))
                    self.assertEqual(
                        proc.returncode, 2,
                        "%s=%r should exit 2: %s" % (field, bad,
                                                     proc.stderr))
                    self.assertIn(field, proc.stderr)

    def test_infinity_settings_json_boots_safe_defaults(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "settings.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write('{"schema_version": 1, "bedtime": Infinity,'
                             ' "wake": -Infinity}')
            proc = run_pet("settings", "--save", path)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("bedtime=22:00", proc.stdout)
            self.assertIn("wake=07:00", proc.stdout)

    def test_describe_never_raises_on_poisoned_attributes(self):
        from pet.pet_app.settings import AppSettings
        app = AppSettings()
        app.bedtime = float("nan")
        app.wake = float("inf")
        text = app.describe()
        self.assertIn("bedtime=", text)
        self.assertIn("wake=", text)


if __name__ == "__main__":
    unittest.main()
