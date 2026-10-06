"""Tester fix-verification suite for the final phase (issue #532).

Pins the 7 Evaluator-mandated fixes on the fixed head, driving the REAL
shipped entrypoints (no mocks, hermetic so CI stays green without Chrome):

- unknown --fixture exits 1 (fail-closed); explicit not-found exits 0.
- tb-verify --reduced-motion flag reports reduced_motion:true.
- tb-verify --attempts 0 exits 2 on the built binary.
- motion.go carries no dead MotionCellCap and no unimplemented 1 Hz claim;
  SteppedBar documents the static-snapshot reduced behavior.
- tb-verify loadGoldens sorts by name (doc claim holds).
- The shell status line wires term.FetchLine so the cancel hint reaches
  users (source-wired, plus go test covers the boundary arms).
- go test ./internal/term/ passes (boundary arms: spinner/bar clamps,
  exact-150ms strobe, reduced zero-displacement anchor).
"""
import json
import os
import shutil
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(args, **kw):
    kw.setdefault("cwd", ROOT)
    kw.setdefault("capture_output", True)
    kw.setdefault("text", True)
    kw.setdefault("timeout", 240)
    return subprocess.run(args, **kw)


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
        return fh.read()


@unittest.skipUnless(shutil.which("go"), "go toolchain required")
class FixVerifyLive(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tmp = tempfile.gettempdir()
        cls.tb = os.path.join(tmp, "tester-fixverify-tb")
        cls.verify = os.path.join(tmp, "tester-fixverify-verify")
        for src, dst in (("./cmd/tb", cls.tb),
                         ("./cmd/tb-verify", cls.verify)):
            p = run(["go", "build", "-o", dst, src], timeout=300)
            assert p.returncode == 0, f"build {src}: {p.stderr[-2000:]}"

    def test_unknown_fixture_exits_nonzero(self):
        p = run([self.tb, "--fixture", "does-not-exist-zzz"])
        self.assertEqual(p.returncode, 1, p.stderr[-2000:])
        self.assertIn("unknown fixture", p.stderr)
        self.assertGreater(len(p.stdout), 500,
                           "unknown fixture must still paint the error page")

    def test_explicit_not_found_stays_zero(self):
        p = run([self.tb, "--fixture", "not-found"])
        self.assertEqual(p.returncode, 0, p.stderr[-2000:])

    def test_verify_reduced_motion_flag(self):
        p = run([self.verify, "--hermetic", "--reduced-motion",
                 "--goldens", "tests/fixtures/goldens",
                 "--fixtures", "tests/fixtures"])
        self.assertEqual(p.returncode, 0, p.stderr[-2000:])
        rep = json.loads(p.stdout)
        self.assertTrue(rep["reduced_motion"])
        self.assertTrue(rep["pass"])

    def test_verify_attempts_misuse_exits_2(self):
        p = run([self.verify, "--attempts", "0"])
        self.assertEqual(p.returncode, 2)
        self.assertIn("--attempts must be 1..10", p.stderr)

    def test_motion_dead_code_removed(self):
        body = read("internal/term/motion.go")
        self.assertNotIn("MotionCellCap", body)
        self.assertNotIn("1 Hz", body)
        self.assertNotIn("at most 1 Hz", body)
        self.assertIn("static snapshot", body)

    def test_verify_goldens_sorted_claim_holds(self):
        body = read("cmd/tb-verify/main.go")
        self.assertIn("sort.Slice", body)
        self.assertIn('"reduced-motion"', body)
        self.assertIn("func checkGolden(g Golden, fixtureDir string, width int)",
                      body)

    def test_shell_wires_fetch_line(self):
        body = read("internal/tui/shell.go")
        self.assertIn("term.FetchLine", body)
        self.assertIn("LoadElapsed", body)

    def test_term_go_tests_green(self):
        p = run(["go", "test", "./internal/term/"], timeout=300)
        self.assertEqual(p.returncode, 0, p.stdout[-2000:] + p.stderr[-2000:])


if __name__ == "__main__":
    unittest.main()
