"""Tester live-regression suite for the terminal browser (Phase 1).

Drives the REAL shipped entrypoints (tb and tb-agent binaries built from
this module) through happy-path and hostile flows. Offscreen fixture mode
is used so no TTY is required; the no-TTY interactive path is asserted as
a hostile case with piped stdin.
"""
import json
import os
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TB_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-live")
AGENT_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-agent-live")

TIERS = ("block", "sixel", "iterm2", "kitty")
FIXTURES = ("home", "article", "table", "not-found")


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120, **kw)


class LiveRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for src, dst in (("./cmd/tb", TB_BIN), ("./cmd/tb-agent", AGENT_BIN)):
            p = run(["go", "build", "-o", dst, src], cwd=ROOT)
            assert p.returncode == 0, f"build {src}: {p.stderr[-2000:]}"

    def test_all_tiers_render_nonzero_bytes(self):
        for tier in TIERS:
            with self.subTest(tier=tier):
                p = run([TB_BIN, "--fixture", "home", "--tier", tier])
                self.assertEqual(p.returncode, 0, p.stderr[-1000:])
                self.assertGreater(len(p.stdout), 1000,
                                   f"tier {tier} emitted suspiciously few bytes")

    def test_tier_outputs_differ(self):
        outs = {}
        for tier in TIERS:
            p = run([TB_BIN, "--fixture", "home", "--tier", tier])
            self.assertEqual(p.returncode, 0)
            outs[tier] = p.stdout
        self.assertEqual(len(set(outs.values())), len(TIERS),
                         "every tier must produce a distinct byte stream")

    def test_all_fixtures_render(self):
        for fix in FIXTURES:
            with self.subTest(fixture=fix):
                p = run([TB_BIN, "--fixture", fix, "--tier", "block"])
                self.assertEqual(p.returncode, 0, p.stderr[-1000:])
                self.assertGreater(len(p.stdout), 500)

    def test_unknown_fixture_yields_error_page_not_crash(self):
        p = run([TB_BIN, "--fixture", "fixture://nonexistent-xyz", "--tier", "block"])
        self.assertEqual(p.returncode, 0, p.stderr[-1000:])
        self.assertGreater(len(p.stdout), 500,
                           "unknown fixture must render the honest error page")

    def test_bad_tier_rejected(self):
        p = run([TB_BIN, "--fixture", "home", "--tier", "bogus"])
        self.assertEqual(p.returncode, 2)
        self.assertIn("unknown tier", p.stderr)

    def test_interactive_without_tty_fails_honestly(self):
        p = run([TB_BIN], stdin=subprocess.DEVNULL)
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("no terminal", p.stderr)

    def test_agent_probe_envelope(self):
        p = run([AGENT_BIN, "probe"])
        self.assertEqual(p.returncode, 0)
        env = json.loads(p.stdout)
        self.assertTrue(env["success"])
        for key in ("width", "height", "tier"):
            self.assertIn(key, env["data"])

    def test_agent_render_envelope(self):
        p = run([AGENT_BIN, "render", "--fixture", "home", "--graphics-tier", "block"])
        self.assertEqual(p.returncode, 0)
        env = json.loads(p.stdout)
        self.assertTrue(env["success"])
        self.assertEqual(env["data"]["address"], "fixture://home")
        self.assertGreater(env["data"]["bytes"], 500)
        self.assertEqual(env["data"]["tier"], "block")

    def test_agent_render_bad_tier_envelope(self):
        p = run([AGENT_BIN, "render", "--fixture", "home", "--graphics-tier", "bogus"])
        self.assertNotEqual(p.returncode, 0)
        env = json.loads(p.stdout)
        self.assertFalse(env["success"])
        self.assertEqual(env["code"], "bad_tier")

    def test_agent_unknown_command_rejected(self):
        p = run([AGENT_BIN, "frobnicate"])
        self.assertEqual(p.returncode, 2)

    def test_dump_stats_reports_consistent_bytes(self):
        p = run([TB_BIN, "--fixture", "home", "--tier", "block", "--dump-stats"])
        self.assertEqual(p.returncode, 0)
        self.assertIn("bytes=", p.stderr)
        reported = int(p.stderr.split("bytes=")[1].split()[0])
        self.assertEqual(reported, len(p.stdout.encode("utf-8", "replace")),
                         "dump-stats byte count must match actual stdout size")


if __name__ == "__main__":
    import sys
    sys.exit(0 if unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromName("__main__")).wasSuccessful() else 1)
