"""Tester-authored hostile regression for the mcp-framing deferred check.

Covers what the builder pin (test_mcp_framing_deferred.py, issue #544)
does not: the tb-mcp binary and the layered deferred check must stay
resilient under hostile input.

- Corrupt / unknown-method stdio lines produce JSON-RPC error envelopes,
  never a crash or a silent hang (live binary when go exists).
- A truncated inner envelope never false-positives the ==[] check.
- A non-empty deferred list (e.g. ["pdf"]) never satisfies the ==[] check.

Hermetic: no Chrome, no network. Falls back to contract-level simulation
when the go toolchain is absent.
"""
import json
import os
import shutil
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def layered_deferred_empty(lines):
    """Mirror of the repro.sh python check over transcript lines."""
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue
        for item in msg.get("result", {}).get("content", []):
            text = item.get("text", "") if isinstance(item, dict) else ""
            try:
                env = json.loads(text)
            except json.JSONDecodeError:
                continue
            data = env.get("data", {})
            if isinstance(data, dict) and data.get("deferred") == []:
                return True
    return False


def outer_with_text(text):
    return json.dumps(
        {"jsonrpc": "2.0", "id": 4,
         "result": {"content": [{"type": "text", "text": text}]}})


class McpDeferredHostile(unittest.TestCase):
    def test_truncated_inner_envelope_no_false_positive(self):
        truncated = outer_with_text('{"success":true,"data":')
        self.assertFalse(layered_deferred_empty([truncated, "NOT-JSON-LINE"]))

    def test_nonempty_deferred_no_false_positive(self):
        line = outer_with_text(json.dumps(
            {"success": True, "data": {"deferred": ["pdf"]}}))
        self.assertFalse(layered_deferred_empty([line]))

    def test_empty_deferred_still_matches(self):
        line = outer_with_text(json.dumps(
            {"success": True,
             "data": {"caps": [], "tools": ["navigate"], "deferred": []}},
            separators=(",", ":")))
        self.assertTrue(layered_deferred_empty([line]))

    def test_binary_survives_corrupt_stdio(self):
        if not shutil.which("go"):
            self.skipTest("go toolchain absent")
        build = subprocess.run(
            ["go", "build", "-o", "/tmp/tb-mcp-tester-hostile",
             "./cmd/tb-mcp"],
            cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(build.returncode, 0, build.stderr[-2000:])
        reqs = ("NOT JSON AT ALL{{{\n"
                '{"jsonrpc":"2.0","id":9,"method":"nope/nope","params":{}}\n')
        p = subprocess.run(
            ["/tmp/tb-mcp-tester-hostile"], cwd=ROOT, input=reqs,
            capture_output=True, text=True, timeout=120)
        self.assertEqual(p.returncode, 0, p.stderr[-2000:])
        self.assertIn("parse error", p.stdout)
        self.assertIn("method not found", p.stdout)


if __name__ == "__main__":
    unittest.main()
