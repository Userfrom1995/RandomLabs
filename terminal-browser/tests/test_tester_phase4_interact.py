"""Tester regression for Phase 4 interaction loop (issue #532).

Guards the agent script surface so it cannot regress:
1. interact gates --profile through resolveProfile: traversal input
   fails closed with exit 1 + success=false + code bad_profile.
2. Missing --url fails closed with bad_url before any launch.
3. Step validation runs before the browser opens: unknown ops,
   missing ref/out/key/file fields, bad dialog policy, corrupt
   script JSON, and bad count comparators all fail closed with
   bad_step and never cost a sidecar (no Chrome needed).
4. The envelope stays single-line JSON with success=false.

Hermetic only: no Chrome, no network. Test files only; production
code is never touched.
"""
import json
import os
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENT_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-agent-phase4")


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120, **kw)


def envelope(t, proc):
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        t.fail(f"must emit a JSON envelope: {proc.stdout[-300:]!r}")


class Phase4InteractContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        p = run(["go", "build", "-o", AGENT_BIN, "./cmd/tb-agent"], cwd=ROOT)
        assert p.returncode == 0, f"go build tb-agent: {p.stderr[-1000:]}"

    def agent(self, *args):
        env = dict(os.environ, TB_HOME=tempfile.mkdtemp(prefix="tb-phase4-"))
        return run([AGENT_BIN] + list(args), env=env, cwd=ROOT)

    def assert_fail_closed(self, proc, code):
        self.assertNotEqual(proc.returncode, 0, "must exit nonzero")
        env = envelope(self, proc)
        self.assertFalse(env.get("success"), "success must be false")
        self.assertEqual(env.get("code"), code,
                         f"code must be {code}, got {env.get('code')}")

    def test_profile_traversal_rejected(self):
        p = self.agent("interact", "--url", "https://example.com/",
                       "--profile", "../escape",
                       "--do", '{"op":"snapshot"}')
        self.assert_fail_closed(p, "bad_profile")

    def test_missing_url_rejected(self):
        p = self.agent("interact", "--profile", "default",
                       "--do", '{"op":"snapshot"}')
        self.assert_fail_closed(p, "bad_url")

    def test_no_steps_rejected(self):
        p = self.agent("interact", "--url", "https://example.com/")
        self.assert_fail_closed(p, "bad_step")

    def test_bad_dialog_policy_rejected(self):
        p = self.agent("interact", "--url", "https://example.com/",
                       "--dialog-policy", "sometimes",
                       "--do", '{"op":"snapshot"}')
        self.assert_fail_closed(p, "bad_step")

    def test_corrupt_do_json_rejected(self):
        p = self.agent("interact", "--url", "https://example.com/",
                       "--do", '{"op":')
        self.assert_fail_closed(p, "bad_step")

    def test_corrupt_script_file_rejected(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
            fh.write("[not json")
            path = fh.name
        try:
            p = self.agent("interact", "--url", "https://example.com/",
                           "--script", path)
        finally:
            os.unlink(path)
        self.assert_fail_closed(p, "bad_step")

    def test_missing_script_file_rejected(self):
        p = self.agent("interact", "--url", "https://example.com/",
                       "--script", "/nonexistent/tb-steps.json")
        self.assert_fail_closed(p, "bad_path")

    def test_unknown_and_malformed_ops_rejected(self):
        bad_steps = [
            '{"op":"teleport","ref":"e1"}',
            '{"op":"click"}',
            '{"op":"fill"}',
            '{"op":"fill","ref":"e1"}',
            '{"op":"press"}',
            '{"op":"scroll"}',
            '{"op":"select","ref":"e1"}',
            '{"op":"check"}',
            '{"op":"drag","from":"e1"}',
            '{"op":"upload","ref":"e1"}',
            '{"op":"cursor","x":1}',
            '{"op":"dialog"}',
            '{"op":"dialog","action":"maybe"}',
            '{"op":"wait","cond":"bogus"}',
            '{"op":"wait","cond":"text"}',
            '{"op":"wait","cond":"count","selector":"a","cmp":"gt"}',
            '{"op":"assert","cond":"value"}',
            '{"op":"screenshot"}',
            '{"op":"screenshot","kind":"panorama","out":"/tmp/x.png"}',
            '{"op":"screenshot","kind":"element","out":"/tmp/x.png"}',
            '{"op":"pdf"}',
            '{"op":"evaluate"}',
            '{"op":"navigate"}',
            '{}',
        ]
        for do in bad_steps:
            with self.subTest(step=do):
                p = self.agent("interact", "--url", "https://example.com/",
                               "--do", do)
                self.assert_fail_closed(p, "bad_step")

    def test_docs_cover_every_op(self):
        with open(os.path.join(ROOT, "docs", "interact.md"), encoding="utf-8") as fh:
            docs = fh.read()
        for op in ("snapshot", "click", "fill", "press_key", "hover",
                   "scroll", "select", "check", "drag", "upload", "cursor",
                   "dialog", "wait_for", "assert", "console", "network",
                   "screenshot", "pdf", "evaluate", "navigate", "hints",
                   "back", "forward", "reload", "session_open", "trace",
                   "stdin", "ref_stale"):
            self.assertIn(op, docs, f"docs/interact.md must cover {op}")


if __name__ == "__main__":
    unittest.main()
