"""Tester-owned hostile regression suite for PR #350 (issue #302, M13a).

M13a ships six soak stability figures plus a new gate
(`check_soak_figure_coherence`) and a new median helper
(`charts._median_of`, bare `import statistics`). Tier-1
`test_m13a_soak_figure.py` pins the happy path in package mode
(`python3 -m ...`), where everything is green (739/739).

This suite red-teams AROUND it: the lab's documented one-command entry
points (`repro.sh` default/pilot/full paths) invoke the gate as a
SCRIPT (`PYTHONPATH=. python3 poolduel/harness/check.py`), and CPython
prepends the script's directory (`poolduel/harness/`) to `sys.path`.
That directory contains the lab's OWN `statistics.py` (M10 paired
statistics), which shadows the stdlib `statistics` module, so the bare
`import statistics` inside `_median_of` resolves to the wrong module
(no `median` attribute) and the gate dies with an uncaught
AttributeError (which `check_soak_figure_coherence` does not catch -
it only catches ValueError/KeyError). Every `repro.sh` sweep path hits
this before doing any work.
"""

import math
import os
import shutil
import subprocess
import sys
import unittest

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

from poolduel.harness import charts as charts_mod


def _env_with_repo_on_path():
    env = dict(os.environ)
    env["PYTHONPATH"] = REPO + (
        os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
    return env


class ScriptModeShadowTest(unittest.TestCase):
    def test_median_of_survives_harness_dir_on_path(self):
        # Faithful miniature of script-mode invocation: CPython puts the
        # script's directory first on sys.path, so `import statistics`
        # must still reach the STDLIB, not poolduel/harness/statistics.py.
        code = (
            "import sys; sys.path.insert(0, 'poolduel/harness');"
            "from poolduel.harness.charts import _median_of;"
            "print(_median_of([1.0, 2.0, 3.0]))"
        )
        proc = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True, text=True, cwd=REPO,
            env=_env_with_repo_on_path(), timeout=60)
        self.assertEqual(
            proc.returncode, 0,
            "median helper dies under script-mode sys.path shadowing:\n%s"
            % proc.stderr[-2000:])
        self.assertEqual(proc.stdout.strip(), "2.0")

    def test_check_gate_passes_in_script_mode(self):
        # The exact command `repro.sh` runs on its default/pilot/full
        # paths. Must exit 0 with the ok banner, never a traceback.
        if shutil.which("pgbench") is None or shutil.which("psql") is None:
            self.skipTest("pgbench/psql absent in this container")
        proc = subprocess.run(
            [sys.executable, "poolduel/harness/check.py"],
            capture_output=True, text=True, cwd=REPO,
            env=_env_with_repo_on_path(), timeout=300)
        self.assertEqual(
            proc.returncode, 0,
            "script-mode gate failed:\n%s\n%s"
            % (proc.stdout[-2000:], proc.stderr[-2000:]))
        self.assertIn("poolduel check ok", proc.stdout)
        self.assertNotIn("Traceback", proc.stderr)


class MedianOfHostileTest(unittest.TestCase):
    # Guard rails for the FIX: whatever replaces the bare import must
    # keep these degenerate-input contracts (n/a as None, never raise).
    def test_empty_and_all_nonfinite_yield_none(self):
        self.assertIsNone(charts_mod._median_of([]))
        self.assertIsNone(charts_mod._median_of(
            [float("nan"), float("inf"), float("-inf"), None, "x"]))

    def test_nonfinite_values_excluded_not_leaked(self):
        self.assertEqual(
            charts_mod._median_of([1.0, float("nan"), 3.0]), 2.0)
        self.assertEqual(
            charts_mod._median_of([True, 4.0, 6.0]), 5.0)

    def test_drift_from_raw_never_raises_on_hostile_shapes(self):
        recs = [None, 42, "nope", {}, {"cell_id": "S1"},
                {"cell_id": "S1", "duration_s": "bad", "pooler": "p",
                 "resources_drift": None},
                {"cell_id": "S1", "duration_s": 60, "pooler": "p",
                 "resources_drift": {"rss_delta_kb": float("nan"),
                                     "fd_delta": "huge"}}]
        out = charts_mod.soak_drift_from_raw(recs)
        for entry in out.values():
            for key in ("rss_delta_kb", "fd_delta"):
                value = entry[key]
                self.assertTrue(
                    value is None or math.isfinite(value),
                    "non-finite drift leak: %r" % (entry,))


if __name__ == "__main__":
    unittest.main()
