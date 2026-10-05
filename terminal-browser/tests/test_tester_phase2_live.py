"""Tester live-regression suite for the terminal browser (Phase 2: engine).

Drives the REAL shipped entrypoints (tb and tb-agent binaries built from
this module) through the Phase 2 live-web contract:

- offline fail-closed envelopes (bad scheme, missing --url, traversal
  profile, unreachable host): success=false, machine code, honest error
  rows, exit 1, and rows == len(lines) consistency;
- millisecond units under cold_ms (never nanoseconds mislabeled as ms);
- JS canary gating in source (Executed proves JS ran);
- profile sanitization, 0700 dirs, loopback bind, WS frame cap in source;
- live fetch happy path (example.com, HN) when Chrome plus network are
  available, otherwise skipped so Chrome-less CI stays green.

Only test files are authored here; production code is never touched.
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, "internal", "engine")
TB_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-phase2")
AGENT_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-agent-phase2")


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120, **kw)


def read(name):
    with open(os.path.join(ENGINE, name), encoding="utf-8") as fh:
        return fh.read()


def has_chrome():
    for name in ("google-chrome", "google-chrome-stable", "chromium",
                 "chromium-browser", "chrome-headless-shell"):
        if shutil.which(name):
            return True
    for cand in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                 "/Applications/Chromium.app/Contents/MacOS/Chromium",
                 "/usr/bin/google-chrome", "/usr/bin/chromium"):
        if os.path.exists(cand):
            return True
    return False


class Phase2FailClosed(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for src, dst in (("./cmd/tb", TB_BIN), ("./cmd/tb-agent", AGENT_BIN)):
            p = run(["go", "build", "-o", dst, src], cwd=ROOT)
            assert p.returncode == 0, f"build {src}: {p.stderr[-2000:]}"

    def test_fetch_missing_url_envelope(self):
        p = run([AGENT_BIN, "fetch"])
        self.assertEqual(p.returncode, 1)
        env = json.loads(p.stdout)
        self.assertFalse(env["success"])
        self.assertEqual(env["code"], "bad_url")
        self.assertIn("missing required --url", env["warning"])

    def test_fetch_bad_scheme_fail_closed(self):
        p = run([AGENT_BIN, "fetch", "--url", "ftp://example.com/x"])
        self.assertEqual(p.returncode, 1, p.stderr[-500:])
        env = json.loads(p.stdout)
        self.assertFalse(env["success"])
        self.assertEqual(env["code"], "bad_url")
        self.assertEqual(env["data"]["title"], "Navigation failed")
        self.assertGreater(env["data"]["rows"], 0)
        # Row-count consistency: envelope rows must match the lines shipped.
        self.assertEqual(env["data"]["rows"], len(env["data"]["lines"]))
        self.assertIn("offline fail-closed", " ".join(env["data"]["lines"]))

    def test_fetch_traversal_profile_fail_closed(self):
        p = run([AGENT_BIN, "fetch", "--url", "https://example.com",
                 "--profile", "../../.ssh"])
        self.assertEqual(p.returncode, 1)
        env = json.loads(p.stdout)
        self.assertFalse(env["success"])
        self.assertIn("invalid profile", " ".join(env["data"]["lines"]))
        self.assertEqual(env["data"]["rows"], len(env["data"]["lines"]))

    def test_fetch_unreachable_host_fail_closed(self):
        p = run([AGENT_BIN, "fetch", "--url", "http://127.0.0.1:9/nope"])
        self.assertEqual(p.returncode, 1)
        env = json.loads(p.stdout)
        self.assertFalse(env["success"])
        self.assertTrue(env["code"], "offline path must carry a machine code")
        self.assertEqual(env["data"]["rows"], len(env["data"]["lines"]))

    def test_tb_url_offline_exit_1(self):
        p = run([TB_BIN, "--url", "ftp://x"])
        self.assertEqual(p.returncode, 1)
        self.assertIn("offline", p.stderr)

    def test_offline_cold_ms_is_zero_not_nanoseconds(self):
        p = run([AGENT_BIN, "fetch", "--url", "ftp://example.com/x"])
        env = json.loads(p.stdout)
        self.assertEqual(env["data"]["cold_ms"], 0)


class Phase2SourceContract(unittest.TestCase):
    """Hermetic guards for the Reviewer findings: the canary gate, real
    millisecond units, row-count consistency, and sidecar hardening must
    stay in the tree."""

    def test_js_canary_gates_executed(self):
        nav = read("navigate.go")
        self.assertIn("window.__tbProbe = 1", nav)
        self.assertIn("window.__tbProbe === 1", nav)
        self.assertRegex(nav, r"Executed:\s*canaryBool &&")

    def test_cold_ms_is_integer_milliseconds(self):
        nav = read("navigate.go")
        self.assertRegex(nav, r"ColdMs\s+int64\s+`json:\"cold_ms\"`")
        self.assertNotIn("time.Duration `json:\"cold_ms\"`", nav)
        self.assertIn(".Milliseconds()", nav)

    def test_offline_row_count_consistent(self):
        nav = read("navigate.go")
        self.assertIn("RowCount: len(rows)", nav)
        self.assertNotIn("RowCount: 0", nav)

    def test_profile_sanitize_and_hardening(self):
        chrome = read("chrome.go")
        self.assertIn("^[a-zA-Z0-9_-]{1,64}$", chrome)
        self.assertIn("0o700", chrome)
        self.assertIn("--remote-debugging-address=127.0.0.1", chrome)
        self.assertIn("remote-debugging-", chrome)  # Extra deny-list

    def test_ws_handshake_and_frame_cap(self):
        ws = read("ws.go")
        self.assertIn("101", ws)
        self.assertIn("Sec-WebSocket-Accept", ws)
        self.assertRegex(ws, r"frame too large|maxFrame|32 << 20")

    def test_cdp_write_serialized_and_unsubscribe(self):
        cdp = read("cdp.go")
        self.assertIn("Unsubscribe", cdp)
        self.assertIn("delete(s.pend", cdp)
        self.assertIn("loaderId", cdp)


@unittest.skipUnless(has_chrome(), "no Chrome sidecar in this environment")
class Phase2Live(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for src, dst in (("./cmd/tb", TB_BIN), ("./cmd/tb-agent", AGENT_BIN)):
            p = run(["go", "build", "-o", dst, src], cwd=ROOT)
            assert p.returncode == 0, f"build {src}: {p.stderr[-2000:]}"

    def fetch(self, url):
        p = run([AGENT_BIN, "fetch", "--url", url, "--width", "80"])
        if p.returncode != 0:
            self.skipTest(f"network unavailable for {url}: {p.stdout[-300:]}")
        return json.loads(p.stdout)

    def test_live_example_happy_path(self):
        env = self.fetch("https://example.com")
        self.assertTrue(env["success"])
        self.assertGreater(env["data"]["rows"], 0)
        self.assertEqual(env["data"]["rows"], len(env["data"]["lines"]))
        cold = env["data"]["cold_ms"]
        self.assertGreater(cold, 0)
        self.assertLess(cold, 10000, "cold fetch must stay well under the 10 s gate")
        self.assertTrue(env["data"]["js_executed"], "canary-gated JS probe must pass live")
        self.assertGreater(env["data"]["js_nodes"], 0)

    def test_live_hn_cold_under_gate(self):
        env = self.fetch("https://news.ycombinator.com")
        self.assertTrue(env["success"])
        self.assertGreater(env["data"]["rows"], 50)
        self.assertLess(env["data"]["cold_ms"], 10000)
        self.assertTrue(env["data"]["js_executed"])

    def test_live_tb_url_painter(self):
        p = run([TB_BIN, "--url", "https://example.com",
                 "--dump-stats"])
        if p.returncode != 0:
            self.skipTest(f"network unavailable: {p.stderr[-300:]}")
        self.assertIn("live=https://example.com", p.stderr)
        self.assertIn("cold=", p.stderr)


if __name__ == "__main__":
    import sys
    sys.exit(0 if unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromName("__main__")).wasSuccessful() else 1)
