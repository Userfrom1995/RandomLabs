"""Tester regression for Phase 3 sessions (issue #532).

Guards the Reviewer round-1 blocking finding plus the Phase 3 session
contract so they cannot regress:
1. Every tb-agent session entry point gates --profile through
   resolveProfile and fails closed with exit 1 + success=false +
   code bad_profile on traversal input (no silent default fallback
   with a dishonest envelope).
2. Hermetic session round-trip under isolated TB_HOME: cookies-set,
   cookies list, bookmark-add, bookmarks list, state-save,
   cookies-clear count, state-load restore, history query, session
   status all succeed.
3. Corrupt jar JSON fails closed (exit 1, success=false), never a
   fake empty success.
4. Store layer does a real fsync before rename (comment matches code)
   and envelopes echo the sanitized profile.

Hermetic only: no Chrome, no network. Test files only; production
code is never touched.
"""
import json
import os
import shutil
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENT_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-agent-phase3")

SESSION_CMDS = [
    ["cookies"],
    ["cookies-set", "--name", "x", "--value", "y"],
    ["cookies-clear"],
    ["history"],
    ["history-clear"],
    ["bookmark-add", "--url", "https://example.com/"],
    ["bookmarks"],
    ["bookmark-remove", "--url", "https://example.com/"],
    ["session"],
    ["session-back"],
    ["session-forward"],
    ["session-reload"],
    ["state-save", "--file", os.path.join(tempfile.gettempdir(), "tb-phase3-x.json")],
    ["state-load", "--file", os.path.join(tempfile.gettempdir(), "tb-phase3-x.json")],
]


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=60, **kw)


def read_rel(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as fh:
        return fh.read()


class Phase3SessionContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        p = run(["go", "build", "-o", AGENT_BIN, "./cmd/tb-agent"], cwd=ROOT)
        assert p.returncode == 0, f"go build tb-agent: {p.stderr[-1000:]}"

    def fresh_home(self):
        home = tempfile.mkdtemp(prefix="tb-phase3-")
        self.addCleanup(shutil.rmtree, home, True)
        return home

    def agent(self, home, *args):
        env = dict(os.environ, TB_HOME=home)
        return run([AGENT_BIN] + list(args), env=env, cwd=ROOT)

    def test_all_session_cmds_reject_traversal_fail_closed(self):
        home = self.fresh_home()
        # Seed the default jar so we can prove invalid profiles leave it alone.
        seed = self.agent(home, "cookies-set", "--profile", "default",
                          "--name", "keep", "--value", "1", "--domain", "example.com")
        self.assertEqual(seed.returncode, 0, f"seed: {seed.stdout[-300:]}")
        for argv in SESSION_CMDS:
            with self.subTest(cmd=argv[0]):
                p = self.agent(home, *argv, "--profile", "../escape")
                self.assertNotEqual(p.returncode, 0,
                                    f"{argv[0]} must exit nonzero on ../escape")
                try:
                    env = json.loads(p.stdout)
                except json.JSONDecodeError:
                    self.fail(f"{argv[0]} must emit a JSON envelope: {p.stdout[-300:]!r}")
                self.assertFalse(env.get("success"), f"{argv[0]} success must be false")
                self.assertEqual(env.get("code"), "bad_profile",
                                 f"{argv[0]} code must be bad_profile, got {env.get('code')}")
        # Default jar untouched by every rejected attempt.
        got = self.agent(home, "cookies", "--profile", "default")
        self.assertEqual(got.returncode, 0)
        body = json.loads(got.stdout)
        names = [c.get("name") for c in body["data"]["cookies"]]
        self.assertEqual(names, ["keep"], f"default jar polluted: {names}")

    def test_hermetic_session_round_trip(self):
        home = self.fresh_home()
        state_file = os.path.join(home, "state.json")
        p = self.agent(home, "cookies-set", "--profile", "repro",
                       "--name", "sid", "--value", "abc", "--domain", "example.com")
        self.assertEqual(p.returncode, 0, p.stdout[-300:])
        p = self.agent(home, "cookies", "--profile", "repro")
        self.assertEqual(p.returncode, 0)
        self.assertIn("sid", p.stdout)
        p = self.agent(home, "bookmark-add", "--profile", "repro",
                       "--url", "https://example.com/", "--title", "Example")
        self.assertEqual(p.returncode, 0, p.stdout[-300:])
        p = self.agent(home, "bookmarks", "--profile", "repro")
        self.assertEqual(p.returncode, 0)
        self.assertIn("example.com", p.stdout)
        p = self.agent(home, "state-save", "--profile", "repro", "--file", state_file)
        self.assertEqual(p.returncode, 0, p.stdout[-300:])
        p = self.agent(home, "cookies-clear", "--profile", "repro")
        self.assertEqual(p.returncode, 0)
        self.assertIn('"cleared":1', p.stdout.replace(" ", ""))
        p = self.agent(home, "state-load", "--profile", "repro", "--file", state_file)
        self.assertEqual(p.returncode, 0, p.stdout[-300:])
        self.assertIn("cookies", p.stdout)
        for cmd in (["history", "--profile", "repro"], ["session", "--profile", "repro"]):
            p = self.agent(home, *cmd)
            self.assertEqual(p.returncode, 0, f"{cmd}: {p.stdout[-300:]}")
            self.assertIn('"success":true', p.stdout.replace(" ", ""))

    def test_corrupt_jar_fails_closed(self):
        home = self.fresh_home()
        p = self.agent(home, "cookies-set", "--profile", "live",
                       "--name", "a", "--value", "b", "--domain", "example.com")
        self.assertEqual(p.returncode, 0)
        # Locate the jar under the TB_HOME tree and corrupt it.
        jar = None
        for dirpath, _dirs, files in os.walk(home):
            if "cookies.json" in files:
                jar = os.path.join(dirpath, "cookies.json")
                break
        self.assertIsNotNone(jar, "jar file must exist after cookies-set")
        with open(jar, "w", encoding="utf-8") as fh:
            fh.write("NOT JSON{{{")
        p = self.agent(home, "cookies", "--profile", "live")
        self.assertNotEqual(p.returncode, 0, "corrupt jar must exit nonzero")
        self.assertIn('"success":false', p.stdout.replace(" ", ""))

    def test_resolve_profile_gate_and_fsync_in_source(self):
        agent_src = read_rel("cmd", "tb-agent", "main.go")
        self.assertIn("func resolveProfile", agent_src,
                      "tb-agent must gate --profile through resolveProfile")
        self.assertIn('"bad_profile"', agent_src)
        store_src = read_rel("internal", "engine", "store.go")
        self.assertIn("f.Sync()", store_src,
                      "writeStore must fsync before rename (comment matches code)")

    def test_envelope_echoes_sanitized_profile(self):
        home = self.fresh_home()
        p = self.agent(home, "cookies", "--profile", "repro")
        self.assertEqual(p.returncode, 0)
        body = json.loads(p.stdout)
        self.assertEqual(body["data"]["profile"], "repro")
        # Empty profile documents to default and reports default honestly.
        p = self.agent(home, "cookies", "--profile", "")
        self.assertEqual(p.returncode, 0)
        body = json.loads(p.stdout)
        self.assertEqual(body["data"]["profile"], "default")


if __name__ == "__main__":
    unittest.main()
