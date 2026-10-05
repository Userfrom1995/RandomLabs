"""Tester regression for Phase 5 review fixes (issue #532, PR #540).

Guards the five blocking findings from the Phase 5 review so they
cannot regress, plus the agent control plane end to end:

Hermetic source and CLI contracts (no Chrome needed):
1. ParseSteps fails closed on trailing garbage: `[{...}] {...}` exits 1
   with bad_step (never silently drops steps), and a corrupt NDJSON
   second line errors instead of breaking the loop silently.
2. The capabilities tool reports only live caps. Phase 6 (issue #532)
   promoted extension_trigger and webmcp to live capabilities
   (internal/agent/agent.go LiveCaps), so TB_CAPS=extension_trigger now
   yields caps:["extension_trigger"] with an empty deferred list (every
   known cap is live, so known-but-not-live is always empty).
3. The press_key schema advertises only ctrl, alt, or shift (never cmd),
   matching the engine, and mod=cmd is rejected hermetically.
4. Manager.Open honors defaultLite (lite = lite || m.defaultLite) and
   tb-mcp advertises the --lite flag.
5. Browser.Lookup treats only gen == 0 as latest; negative gens fail
   closed with ref_not_found (source contract plus live CLI check).

Live control plane (needs Chrome, skipped without it): the shipped
tb-mcp stdio server drives navigate plus snapshot plus capabilities
against a local page, and tb-agent interact runs snapshot plus a
negative-gen click that must fail closed with ref_not_found.

Test files only; production code is never touched.
"""
import json
import os
import shutil
import subprocess
import tempfile
import threading
import unittest
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENT_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-agent-phase5")
MCP_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-mcp-phase5")
STEPS_GO = os.path.join(ROOT, "internal", "agent", "steps.go")
AGENT_GO = os.path.join(ROOT, "internal", "agent", "agent.go")
LOOKUP_GO = os.path.join(ROOT, "internal", "engine", "interact.go")

PAGE = (
    "<!doctype html><html><head><title>Phase5 Live</title></head><body>"
    "<h1>control plane</h1>"
    '<a href="/next">Next</a></body></html>'
)
NEXT = (
    "<!doctype html><html><head><title>Phase5 Next</title></head><body>"
    "<h1>second page</h1></body></html>"
)


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=180, **kw)


def has_chrome():
    for name in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        if shutil.which(name):
            return True
    for app in (
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ):
        if os.path.exists(app):
            return True
    return False


def has_go():
    return shutil.which("go") is not None


def ensure_bins():
    for path, pkg in ((AGENT_BIN, "./cmd/tb-agent"), (MCP_BIN, "./cmd/tb-mcp")):
        if not os.path.exists(path):
            r = run(["go", "build", "-o", path, pkg], cwd=ROOT)
            if r.returncode != 0:
                raise unittest.SkipTest("go build failed: %s" % r.stderr[-500:])


def mcp_session(payloads, env=None):
    ensure_bins()
    base = dict(os.environ)
    if env:
        base.update(env)
    base["TB_HOME"] = tempfile.mkdtemp(prefix="tb-phase5-mcp-")
    proc = subprocess.run(
        [MCP_BIN],
        input="\n".join(json.dumps(p) for p in payloads) + "\n",
        capture_output=True, text=True, timeout=180, env=base,
    )
    out = []
    for line in proc.stdout.splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return proc.returncode, out


def cli(*args, env=None):
    ensure_bins()
    base = dict(os.environ)
    home = tempfile.mkdtemp(prefix="tb-phase5-cli-")
    base["TB_HOME"] = home
    if env:
        base.update(env)
    return run([AGENT_BIN] + list(args), cwd=ROOT, env=base)


def serve_dir():
    d = tempfile.mkdtemp(prefix="tb-phase5-site-")
    with open(os.path.join(d, "index.html"), "w") as f:
        f.write(PAGE)
    with open(os.path.join(d, "next.html"), "w") as f:
        f.write(NEXT)
    srv = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=d)
    )
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return srv, "http://127.0.0.1:%d/" % port


class Phase5ControlContracts(unittest.TestCase):
    def test_trailing_garbage_after_array_fails_closed(self):
        ensure_bins()
        r = cli(
            "interact", "--url", "https://example.com/",
            "--do", '[{"op":"snapshot"}] {"op":"hints"}',
        )
        self.assertNotEqual(r.returncode, 0, "trailing garbage must exit nonzero")
        body = json.loads(r.stdout or r.stderr)
        self.assertFalse(body["success"])
        self.assertEqual(body.get("code"), "bad_step")

    def test_corrupt_ndjson_second_line_fails_closed(self):
        ensure_bins()
        r = cli(
            "interact", "--url", "https://example.com/",
            "--do", '{"op":"snapshot"}\nNOTJSON',
        )
        self.assertNotEqual(r.returncode, 0, "corrupt NDJSON must exit nonzero")
        body = json.loads(r.stdout or r.stderr)
        self.assertFalse(body["success"])
        self.assertEqual(body.get("code"), "bad_step")

    def test_parse_steps_source_contract(self):
        with open(STEPS_GO) as f:
            src = f.read()
        self.assertIn("trailing data after step array", src)
        self.assertIn("io.EOF", src)
        self.assertNotIn("dec.More()", src)

    def test_capabilities_reports_only_live_caps(self):
        # Phase 6 contract: extension_trigger is a live cap, so enabling
        # it reports it in caps; deferred (known-but-not-live) is empty
        # because every known cap is live now.
        code, msgs = mcp_session(
            [
                {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
                {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
                 "params": {"name": "capabilities", "arguments": {}}},
            ],
            env={"TB_CAPS": "extension_trigger"},
        )
        self.assertEqual(code, 0)
        caps_msg = [m for m in msgs if m.get("id") == 2][0]
        payload = json.loads(caps_msg["result"]["content"][0]["text"])
        self.assertTrue(payload["success"])
        self.assertEqual(payload["data"]["caps"], ["extension_trigger"])
        self.assertEqual(payload["data"]["deferred"], [])
        self.assertIn("extension_trigger", payload["data"]["tools"])

    def test_capabilities_source_contract(self):
        with open(AGENT_GO) as f:
            src = f.read()
        self.assertIn("for _, l := range LiveCaps", src)

    def test_press_key_schema_matches_engine(self):
        code, msgs = mcp_session(
            [
                {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
                {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
            ]
        )
        self.assertEqual(code, 0)
        tools = [m for m in msgs if m.get("id") == 2][0]["result"]["tools"]
        press = [t for t in tools if t["name"] == "press_key"][0]
        mod_desc = press["inputSchema"]["properties"]["mod"]["description"]
        self.assertNotIn("cmd", mod_desc)
        self.assertIn("ctrl", mod_desc)
        # The engine rejects cmd hermetically (pre-Chrome validation).
        r = cli(
            "interact", "--url", "https://example.com/",
            "--do", '{"op":"press_key","key":"a","mod":"cmd"}',
        )
        blob = (r.stdout or "") + (r.stderr or "")
        self.assertIn("bad modifier", blob)

    def test_default_lite_source_contract_and_flag(self):
        with open(AGENT_GO) as f:
            src = f.read()
        self.assertIn("lite = lite || m.defaultLite", src)
        ensure_bins()
        r = run([MCP_BIN, "--help"])
        self.assertIn("-lite", r.stdout + r.stderr)

    def test_lookup_negative_gen_source_contract(self):
        with open(LOOKUP_GO) as f:
            src = f.read()
        self.assertIn("if gen == 0", src)
        self.assertIn("bad gen %d", src)
        self.assertIn("ref_not_found", src)

    def test_mcp_framing_and_pdf_gate(self):
        code, msgs = mcp_session(
            [
                {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
                {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
                {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
                 "params": {"name": "pdf", "arguments": {"out": "/tmp/x.pdf"}}},
            ]
        )
        self.assertEqual(code, 0)
        init = [m for m in msgs if m.get("id") == 1][0]
        self.assertEqual(
            init["result"]["protocolVersion"], "2024-11-05"
        )
        tools = [m for m in msgs if m.get("id") == 2][0]["result"]["tools"]
        names = [t["name"] for t in tools]
        for core in ("navigate", "snapshot", "click", "type", "press_key",
                     "scroll", "screenshot", "wait_for", "assert",
                     "evaluate", "console", "dialog_handle"):
            self.assertIn(core, names)
        gated = [m for m in msgs if m.get("id") == 3][0]
        self.assertIn("capability_disabled", json.dumps(gated))


@unittest.skipUnless(has_go() and has_chrome(), "needs Go toolchain and Chrome")
class Phase5ControlLive(unittest.TestCase):
    def test_mcp_navigate_snapshot_capabilities(self):
        srv, base = serve_dir()
        try:
            code, msgs = mcp_session(
                [
                    {"jsonrpc": "2.0", "id": 1, "method": "initialize",
                     "params": {}},
                    {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
                     "params": {"name": "navigate",
                                "arguments": {"url": base}}},
                    {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
                     "params": {"name": "snapshot", "arguments": {}}},
                    {"jsonrpc": "2.0", "id": 4, "method": "tools/call",
                     "params": {"name": "capabilities", "arguments": {}}},
                ]
            )
        finally:
            srv.shutdown()
        self.assertEqual(code, 0)
        by_id = {m.get("id"): m for m in msgs}
        nav = json.loads(by_id[2]["result"]["content"][0]["text"])
        self.assertTrue(nav["success"], nav)
        self.assertIn("Phase5 Live", json.dumps(nav))
        snap = json.loads(by_id[3]["result"]["content"][0]["text"])
        self.assertTrue(snap["success"], snap)
        caps = json.loads(by_id[4]["result"]["content"][0]["text"])
        self.assertTrue(caps["success"], caps)

    def test_cli_negative_gen_fails_closed_live(self):
        srv, base = serve_dir()
        try:
            with tempfile.NamedTemporaryFile(
                "w", suffix=".json", delete=False
            ) as f:
                json.dump(
                    [{"op": "snapshot"},
                     {"op": "click", "ref": "e1", "gen": -1}], f
                )
                script = f.name
            ensure_bins()
            home = tempfile.mkdtemp(prefix="tb-phase5-neg-")
            env = dict(os.environ, TB_HOME=home)
            r = subprocess.run(
                [AGENT_BIN, "interact", "--url", base,
                 "--script", script],
                cwd=ROOT, capture_output=True, text=True,
                timeout=180, env=env,
            )
        finally:
            srv.shutdown()
        body = json.loads(r.stdout)
        steps = body["data"]["steps"]
        self.assertTrue(steps[0]["success"])
        self.assertFalse(steps[1]["success"])
        self.assertEqual(steps[1]["code"], "ref_not_found")
        self.assertIn("bad gen -1", steps[1]["data"]["error"])


if __name__ == "__main__":
    unittest.main()
