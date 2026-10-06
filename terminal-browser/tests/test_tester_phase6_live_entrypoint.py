"""Tester durable live-entrypoint regression for Phase 6 (issue #532).

Drives the shipped binaries (no Chrome needed):
- happy: `tb -fixture article` renders the article grid, exit 0
- hostile: `tb -fixture bogus-fixture` renders the friendly unknown-fixture
  page with exit 0 and no crash
- happy: `tb-agent extensions -check examples/minimal-reader` validates
- hostile: `tb-agent extensions -check <bad-manifest-dir>` fails closed
- live: `tb-mcp tools/list` behind TB_CAPS=extension_trigger includes
  extension_trigger (Phase 6 live-caps contract)
"""
import json
import os
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN = {"tb": "tb", "agent": "tb-agent", "mcp": "tb-mcp"}


def build_all():
    for src, key in (("./cmd/tb", "tb"), ("./cmd/tb-agent", "agent"),
                     ("./cmd/tb-mcp", "mcp")):
        out = os.path.join(tempfile.gettempdir(), "tb-phase6-" + key)
        p = subprocess.run(["go", "build", "-o", out, src],
                           capture_output=True, text=True, timeout=300,
                           cwd=ROOT)
        if p.returncode != 0:
            raise RuntimeError(f"go build {src}: {p.stderr[-2000:]}")
        BIN[key] = out


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120,
                          cwd=ROOT, **kw)


class Phase6LiveEntrypoint(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        build_all()

    def test_fixture_article_happy(self):
        p = run([BIN["tb"], "-fixture", "article"])
        self.assertEqual(p.returncode, 0, f"tb article: {p.stderr[-1000:]}")
        self.assertIn("Why terminals deserve a real browser",
                      p.stdout + p.stderr)

    def test_fixture_bogus_hostile(self):
        # Fail-closed contract (final phase, issue #532): bogus fixture
        # names paint the honest not-found page AND exit 1.
        p = run([BIN["tb"], "-fixture", "bogus-fixture"])
        self.assertEqual(p.returncode, 1, f"tb bogus: {p.stderr[-1000:]}")
        self.assertIn("No fixture answers that address", p.stdout + p.stderr)

    def test_fixture_not_found_explicit_stays_zero(self):
        # The explicit not-found address is a legitimate page, exit 0.
        p = run([BIN["tb"], "-fixture", "not-found"])
        self.assertEqual(p.returncode, 0, f"tb not-found: {p.stderr[-1000:]}")

    def test_sample_extension_valid(self):
        p = run([BIN["agent"], "extensions", "-check",
                 "examples/minimal-reader"])
        self.assertEqual(p.returncode, 0)
        body = json.loads(p.stdout.strip().splitlines()[-1])
        self.assertTrue(body.get("success"))

    def test_bad_manifest_fail_closed(self):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, "manifest.json"), "w") as f:
                f.write('{"name":"x"}')
            p = run([BIN["agent"], "extensions", "-check", d])
            body = json.loads(p.stdout.strip().splitlines()[-1])
            self.assertFalse(body.get("success"))
            self.assertIn("bad_ext", p.stdout)

    def test_mcp_extension_trigger_live(self):
        init_msg = json.dumps({"jsonrpc": "2.0", "id": 1,
                               "method": "initialize",
                               "params": {"protocolVersion": "2024-11-05",
                                          "capabilities": {},
                                          "clientInfo": {"name": "t",
                                                         "version": "1"}}})
        list_msg = json.dumps({"jsonrpc": "2.0", "id": 3,
                               "method": "tools/list", "params": {}})
        env = dict(os.environ, TB_CAPS="extension_trigger")
        p = subprocess.run([BIN["mcp"]], input=init_msg + "\n" + list_msg,
                           capture_output=True, text=True, timeout=60,
                           cwd=ROOT, env=env)
        names = []
        for line in p.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except ValueError:
                continue
            tools = (o.get("result") or {}).get("tools")
            if tools:
                names = [t["name"] for t in tools]
        self.assertIn("extension_trigger", names,
                      f"MCP tools missing extension_trigger: {names}")


if __name__ == "__main__":
    unittest.main()
