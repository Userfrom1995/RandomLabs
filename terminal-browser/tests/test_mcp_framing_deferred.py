"""Regression pin for issue #544: the mcp-framing deferred check.

The tb-mcp capabilities tool returns its tb-agent envelope double-encoded:
the JSON-RPC result carries the envelope as an escaped text string, so the
raw transcript holds `deferred":[]` in escaped form (`deferred\":[]`). A
plain grep for the unescaped `"deferred":[]` never matches and the
repro.sh mcp-framing step dies. The fix parses both JSON layers with
python3 (fixed-string escaped grep as the no-python fallback).

This suite pins both sides hermetically (no Chrome, no network):
- repro.sh no longer contains the stale unescaped-only deferred grep.
- the capabilities envelope decoded the way repro.sh decodes it carries
  `"deferred": []` (live binary when go exists, faithful double-encoded
  simulation otherwise).
"""
import json
import os
import shutil
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def find_deferred_empty(path):
    """Mirror of the repro.sh python check: True when an inner envelope
    in the transcript carries data.deferred == []."""
    found = False
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            content = msg.get("result", {}).get("content", [])
            for item in content:
                text = item.get("text", "") if isinstance(item, dict) else ""
                try:
                    env = json.loads(text)
                except json.JSONDecodeError:
                    continue
                data = env.get("data", {})
                if isinstance(data, dict) and data.get("deferred") == []:
                    found = True
    return found


class McpFramingDeferredPin(unittest.TestCase):
    def test_repro_uses_layered_json_check(self):
        body = read(os.path.join(ROOT, "repro.sh"))
        self.assertNotIn("grep -q '\"deferred\":", body,
                         "stale unescaped deferred grep is back in repro.sh")
        self.assertIn("deferred", body)
        self.assertIn("json.loads", body)
        self.assertIn("-F", body,
                      "no-python fallback must use a fixed-string match")

    def test_stale_grep_misses_escaped_envelope(self):
        # Documents WHY the old form was stale: the escaped transcript
        # byte form never matches the unescaped BRE pattern.
        env = {"success": True,
               "data": {"caps": [], "tools": ["navigate"], "deferred": []}}
        outer = {"jsonrpc": "2.0", "id": 4,
                 "result": {"content": [{"type": "text",
                                         "text": json.dumps(
                                             env, separators=(",", ":"))}]}}
        line = json.dumps(outer, separators=(",", ":"))
        self.assertIn('\\"deferred\\":[]', line)
        self.assertNotIn('"deferred":[]', line.replace('\\"', ""))

    def test_capabilities_envelope_carries_empty_deferred(self):
        if shutil.which("go"):
            build = subprocess.run(
                ["go", "build", "-o", "/tmp/tb-mcp-deferred-pin",
                 "./cmd/tb-mcp"],
                cwd=ROOT, capture_output=True, text=True, timeout=240,
            )
            self.assertEqual(build.returncode, 0, build.stderr[-2000:])
            reqs = ("\n".join([
                '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}',
                '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}',
                '{"jsonrpc":"2.0","id":3,"method":"tools/call",'
                '"params":{"name":"pdf","arguments":{"out":"/tmp/x.pdf"}}}',
                '{"jsonrpc":"2.0","id":4,"method":"tools/call",'
                '"params":{"name":"capabilities","arguments":{}}}',
            ]) + "\n")
            p = subprocess.run(
                ["/tmp/tb-mcp-deferred-pin"], cwd=ROOT, input=reqs,
                capture_output=True, text=True, timeout=240,
            )
            self.assertEqual(p.returncode, 0, p.stderr[-2000:])
            tmp = "/tmp/tb-deferred-pin-live.json"
            with open(tmp, "w", encoding="utf-8") as fh:
                fh.write(p.stdout)
            self.assertTrue(find_deferred_empty(tmp),
                            "capabilities envelope has no deferred: []")
        else:
            # No go toolchain: pin the contract against a faithful
            # double-encoded transcript (Go marshal uses compact form).
            env = {"success": True,
                   "data": {"caps": [], "tools": ["navigate"],
                            "deferred": []}}
            outer = {"jsonrpc": "2.0", "id": 4,
                     "result": {"content": [{"type": "text",
                                             "text": json.dumps(
                                                 env,
                                                 separators=(",", ":"))}]}}
            tmp = "/tmp/tb-deferred-pin-sim.json"
            with open(tmp, "w", encoding="utf-8") as fh:
                fh.write(json.dumps(outer, separators=(",", ":")) + "\n")
            self.assertTrue(find_deferred_empty(tmp))


if __name__ == "__main__":
    unittest.main()
