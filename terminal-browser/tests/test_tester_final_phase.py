"""Tester regression suite for the terminal browser final phase (issue #532).

Drives the REAL shipped entrypoints (no mocks):
- tb-verify hermetic run exits 0 with pass:true and 5 goldens green.
- tb-verify --attempts 0 exits 2 (flag-misuse contract).
- tb-agent probe plus render succeed; fixture:// fetch fails closed.
- Motion policy pins: tick table, strobe window, reduced-motion wiring.

Hermetic by design so CI stays green without Chrome or network; the
live corpus (5/5) plus strict-live plus e2e were proven natively by the
Tester on macOS darwin/arm64 with Chrome 152 and are recorded in the
live-run evidence, not re-asserted here.
"""
import json
import os
import re
import shutil
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERIFY = ["go", "run", "./cmd/tb-verify"]
AGENT = ["go", "run", "./cmd/tb-agent"]


def run(args, cwd=ROOT, timeout=240):
    return subprocess.run(
        args, cwd=cwd, capture_output=True, text=True, timeout=timeout,
    )


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


@unittest.skipUnless(shutil.which("go"), "go toolchain required")
class FinalPhaseLive(unittest.TestCase):
    def test_verify_hermetic_passes(self):
        p = run(VERIFY + [
            "--hermetic",
            "--goldens", "tests/fixtures/goldens",
            "--fixtures", "tests/fixtures",
        ])
        self.assertEqual(p.returncode, 0, p.stderr[-2000:])
        rep = json.loads(p.stdout)
        self.assertTrue(rep["pass"])
        self.assertEqual(len(rep["goldens"]), 5)
        self.assertTrue(all(g["pass"] for g in rep["goldens"]))
        by_name = {g["name"]: g for g in rep["goldens"]}
        for name in ("hn", "wiki"):
            self.assertTrue(by_name[name]["rows"] > 0, name)
            self.assertTrue(by_name[name]["marker_found"], name)

    def test_verify_attempts_flag_misuse_exits_2(self):
        # Exercise the built binary: `go run` masks a child exit 2 as 1.
        build = run(["go", "build", "-o", "/tmp/tb-verify-tester",
                     "./cmd/tb-verify"])
        self.assertEqual(build.returncode, 0, build.stderr[-2000:])
        p = run(["/tmp/tb-verify-tester", "--attempts", "0"])
        self.assertEqual(p.returncode, 2)
        self.assertIn("--attempts must be 1..10", p.stderr)

    def test_verify_reduced_motion_reports(self):
        env = dict(os.environ, TB_MOTION="reduced")
        p = subprocess.run(
            VERIFY + ["--hermetic",
                      "--goldens", "tests/fixtures/goldens",
                      "--fixtures", "tests/fixtures"],
            cwd=ROOT, capture_output=True, text=True, timeout=240, env=env,
        )
        self.assertEqual(p.returncode, 0, p.stderr[-2000:])
        rep = json.loads(p.stdout)
        self.assertTrue(rep["reduced_motion"])
        self.assertTrue(rep["pass"])

    def test_agent_probe_and_render_live(self):
        probe = run(AGENT + ["probe"])
        self.assertEqual(probe.returncode, 0, probe.stderr[-2000:])
        self.assertIn('"success":true', probe.stdout)
        render = run(AGENT + ["render", "--fixture", "home"])
        self.assertEqual(render.returncode, 0, render.stderr[-2000:])
        self.assertIn('"success":true', render.stdout)

    def test_agent_fixture_fetch_fails_closed(self):
        p = run(AGENT + ["fetch", "--url", "fixture://home"])
        self.assertNotEqual(p.returncode, 0, "fixture:// fetch must fail")
        body = p.stdout + p.stderr
        self.assertIn('"success":false', body)
        self.assertIn("offline", body.lower())

    def test_motion_tick_table_pinned(self):
        body = read(os.path.join(ROOT, "internal", "term", "motion.go"))
        for token in ("T1Ms = 33", "T2Ms = 50", "T3Ms = 100",
                      "StrobeWindowMs = 150", "SpinnerMaxFrames = 6",
                      "REDUCED_MOTION", 'TB_MOTION', "SetReduced",
                      "func AnchorFor", "func StrobeCollapse",
                      "func SpinnerFrame", "func SteppedBar", "func FetchLine"):
            self.assertIn(token, body, f"motion policy missing: {token}")

    def test_reduced_motion_flag_wired(self):
        body = read(os.path.join(ROOT, "cmd", "tb", "main.go"))
        self.assertIn("reduced-motion", body)
        self.assertIn("SetReduced", body)

    def test_no_em_dashes_in_final_phase_docs(self):
        for rel in ("docs/verification.md", "README.md", "index.html",
                    "docs/architecture.md", "docs/support.md"):
            body = read(os.path.join(ROOT, rel))
            self.assertNotIn("\u2014", body, f"em dash in {rel}")


if __name__ == "__main__":
    unittest.main()
