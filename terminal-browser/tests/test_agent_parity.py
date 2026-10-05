"""Phase 5 parity conformance (issue #532): CLI JSON equals MCP results.

Runs one multi-page task through both control-plane surfaces (tb-mcp
tool calls over stdio, tb-agent interact --script with the equivalent
ops) against the same local site, canonicalizes run-scoped values,
and asserts per-row equality. Needs the Go toolchain and Chrome;
without either the matrix skips with a clear message.
"""
import copy
import http.server
import json
import os
import shutil
import socket
import subprocess
import tempfile
import threading
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MCP_BIN = os.path.join(tempfile.gettempdir(), "parity-tb-mcp")
CLI_BIN = os.path.join(tempfile.gettempdir(), "parity-tb-agent")

INDEX = """<!doctype html><html><head><title>Index</title></head>
<body><h1>Directory</h1><a href="/form">Open form</a></body></html>"""
FORM = """<!doctype html><html><head><title>Form</title></head>
<body><h1>Signup</h1><form action="/done" method="GET">
<label>Name <input id="name" name="name" type="text"></label>
<button id="go" type="submit">Sign up</button></form></body></html>"""
DONE = """<!doctype html><html><head><title>Done</title></head>
<body><h1>Welcome aboard</h1><p>task complete</p></body></html>"""


class Site(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = INDEX
        if self.path == "/form":
            body = FORM
        elif self.path == "/done":
            body = DONE
        raw = body.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *a):
        pass


def chrome_present():
    if os.environ.get("TB_CHROME"):
        return os.path.exists(os.environ["TB_CHROME"])
    for name in ("google-chrome", "google-chrome-stable", "chromium",
                 "chromium-browser", "chrome-headless-shell"):
        if shutil.which(name):
            return True
    for cand in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                 "/Applications/Chromium.app/Contents/MacOS/Chromium"):
        if os.path.exists(cand):
            return True
    return False


def canon(value):
    """Canonicalize one envelope data payload for cross-surface compare."""
    v = copy.deepcopy(value)
    drop = {"ms", "cold_ms", "total_ms", "time_ms", "started_unix",
            "endpoint", "probe_error", "path", "out", "file",
            "offloaded", "duration_ms"}
    if isinstance(v, dict):
        for key in list(v.keys()):
            if key in drop:
                del v[key]
            elif key in ("gen", "current_gen"):
                v[key] = "G"
            elif key in ("session", "handle"):
                v[key] = "H"
            elif key == "active" and isinstance(v[key], str):
                v[key] = "H"
            elif key == "closed" and isinstance(v[key], str):
                v[key] = "H"
            elif key in ("path",):
                del v[key]
            else:
                v[key] = canon(v[key])
        if "refs" in v and isinstance(v["refs"], list):
            for ref in v["refs"]:
                if isinstance(ref, dict):
                    ref.pop("backendDOMNodeId", None)
        if "entries" in v and isinstance(v["entries"], list):
            for entry in v["entries"]:
                if isinstance(entry, dict):
                    entry.pop("time_ms", None)
        # PDF byte counts embed timestamps: compare presence only.
        if set(v.keys()) == {"path", "bytes"} or set(v.keys()) == {"bytes"}:
            return {"pdf": True}
        return v
    if isinstance(v, list):
        return [canon(x) for x in v]
    return v


class MCP:
    def __init__(self, env):
        self.proc = subprocess.Popen(
            [MCP_BIN], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, text=True, bufsize=1, env=env)
        self.next_id = 0

    def call(self, method, params=None):
        self.next_id += 1
        req = {"jsonrpc": "2.0", "id": self.next_id, "method": method}
        if params is not None:
            req["params"] = params
        self.proc.stdin.write(json.dumps(req) + "\n")
        self.proc.stdin.flush()
        while True:
            line = self.proc.stdout.readline()
            if not line:
                raise RuntimeError(f"no reply to {method}")
            msg = json.loads(line)
            if "id" in msg:
                return msg

    def tool(self, name, args=None):
        msg = self.call("tools/call", {"name": name, "arguments": args or {}})
        res = msg.get("result", {})
        text = res["content"][0]["text"]
        return json.loads(text)

    def close(self):
        try:
            self.proc.stdin.close()
        except BrokenPipeError:
            pass
        self.proc.wait(timeout=60)


class ParityMatrix(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if shutil.which("go") is None:
            raise unittest.SkipTest("go toolchain absent")
        if not chrome_present():
            raise unittest.SkipTest("no chrome install found")
        for bin, pkg in ((MCP_BIN, "./cmd/tb-mcp"), (CLI_BIN, "./cmd/tb-agent")):
            p = subprocess.run(["go", "build", "-o", bin, pkg], cwd=ROOT,
                               capture_output=True, text=True, timeout=300)
            assert p.returncode == 0, f"go build {pkg}: {p.stderr[-1000:]}"
        with socket.socket() as srv:
            srv.bind(("127.0.0.1", 0))
            cls.port = srv.getsockname()[1]
        cls.httpd = http.server.HTTPServer(("127.0.0.1", cls.port), Site)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.port}"

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def find_ref(self, data, role, name):
        for ref in data["refs"]:
            if ref["role"] == role and name in ref["name"]:
                return ref["id"]
        self.fail(f"no {role} {name!r} in {data['refs']}")

    def run_mcp(self):
        home = tempfile.mkdtemp(prefix="tb-parity-mcp-")
        shot = os.path.join(home, "mcp.png")
        mcp = MCP(dict(os.environ, TB_HOME=home))
        rows = []
        try:
            mcp.call("initialize", {})
            rows.append(("session_open", mcp.tool("session_open", {"url": self.base})))
            rows.append(("snapshot", mcp.tool("snapshot")))
            link = self.find_ref(rows[-1][1]["data"], "link", "Open form")
            rows.append(("click", mcp.tool("click", {"ref": link})))
            rows.append(("wait_for", mcp.tool("wait_for", {
                "cond": "title", "title": "Form", "timeout": 8.0})))
            snap = mcp.tool("snapshot")
            rows.append(("snapshot", snap))
            box = self.find_ref(snap["data"], "textbox", "Name")
            rows.append(("type", mcp.tool("type", {
                "ref": box, "text": "Ada Lovelace", "clear": True})))
            rows.append(("assert", mcp.tool("assert", {
                "cond": "value", "ref": box, "value": "Ada Lovelace"})))
            rows.append(("evaluate", mcp.tool("evaluate", {"expr": "document.title"})))
            rows.append(("screenshot", mcp.tool("screenshot", {
                "kind": "viewport", "out": shot})))
            rows.append(("console", mcp.tool("console")))
            rows.append(("back", mcp.tool("back")))
            rows.append(("forward", mcp.tool("forward")))
            rows.append(("session_close", mcp.tool("session_close", {"handle": "s1"})))
        finally:
            mcp.close()
        return rows

    def run_cli(self, link, box):
        home = tempfile.mkdtemp(prefix="tb-parity-cli-")
        shot = os.path.join(home, "cli.png")
        steps = [
            {"op": "snapshot"},
            {"op": "click", "ref": link},
            {"op": "wait", "cond": "title", "title": "Form", "timeout": 8.0},
            {"op": "snapshot"},
            {"op": "fill", "ref": box, "text": "Ada Lovelace", "clear": True},
            {"op": "assert", "cond": "value", "ref": box, "value": "Ada Lovelace"},
            {"op": "evaluate", "expr": "document.title"},
            {"op": "screenshot", "kind": "viewport", "out": shot},
            {"op": "console"},
            {"op": "back"},
            {"op": "forward"},
        ]
        script = os.path.join(home, "steps.json")
        with open(script, "w") as fh:
            json.dump(steps, fh)
        p = subprocess.run(
            [CLI_BIN, "interact", "--url", self.base, "--script", script],
            cwd=ROOT, capture_output=True, text=True, timeout=300,
            env=dict(os.environ, TB_HOME=home))
        self.assertEqual(p.returncode, 0, f"cli interact: {p.stdout[-500:]}")
        env = json.loads(p.stdout)
        self.assertTrue(env["success"], env)
        got = [(s["op"], {"success": s["success"], "data": s["data"],
                          "code": s.get("code") or "", "warning": s.get("warning") or ""})
               for s in env["data"]["steps"]]
        return got

    def test_parity_matrix(self):
        mcp_rows = self.run_mcp()
        # Refs are deterministic per page: reuse the MCP-observed ids.
        link = self.find_ref(mcp_rows[1][1]["data"], "link", "Open form")
        form_snap = [r for r in mcp_rows if r[0] == "snapshot"][1][1]
        box = self.find_ref(form_snap["data"], "textbox", "Name")
        cli_steps = self.run_cli(link, box)
        # CLI step 0 is the post-open snapshot; MCP row 0 is the open
        # itself (carries the gen-1 snapshot): align snapshot-to-snapshot.
        pairs = [
            ("snapshot(open)", mcp_rows[0][1], {"success": True, "data": None}),
            ("snapshot", mcp_rows[1][1], cli_steps[0][1]),
            ("click", mcp_rows[2][1], cli_steps[1][1]),
            ("wait_for", mcp_rows[3][1], cli_steps[2][1]),
            ("snapshot", mcp_rows[4][1], cli_steps[3][1]),
            ("type", mcp_rows[5][1], cli_steps[4][1]),
            ("assert", mcp_rows[6][1], cli_steps[5][1]),
            ("evaluate", mcp_rows[7][1], cli_steps[6][1]),
            ("screenshot", mcp_rows[8][1], cli_steps[7][1]),
            ("console", mcp_rows[9][1], cli_steps[8][1]),
            ("back", mcp_rows[10][1], cli_steps[9][1]),
            ("forward", mcp_rows[11][1], cli_steps[10][1]),
        ]
        failures = []
        for name, mcp_env, cli_env in pairs:
            if name == "snapshot(open)":
                # The CLI has no separate open row: the open snapshot
                # must equal the CLI's first snapshot instead. The
                # session handle rides only on the open envelope.
                mcp_env = copy.deepcopy(mcp_env)
                mcp_env["data"].pop("session", None)
                cli_first = cli_steps[0][1]
                cli_first = cli_steps[0][1]
                if canon(mcp_env["data"]) != canon(cli_first["data"]):
                    failures.append(f"{name}: open snapshot != cli first snapshot")
                continue
            mc, cc = canon(mcp_env.get("data")), canon(cli_env.get("data"))
            mcode, ccode = mcp_env.get("code") or "", cli_env.get("code") or ""
            if mcp_env.get("success") != cli_env.get("success"):
                failures.append(f"{name}: success {mcp_env.get('success')} != {cli_env.get('success')}")
            elif mcode != ccode:
                failures.append(f"{name}: code {mcode!r} != {ccode!r}")
            elif mc != cc:
                failures.append(f"{name}: data drift\n  mcp={json.dumps(mc)[:400]}\n  cli={json.dumps(cc)[:400]}")
        self.assertEqual(failures, [], "parity matrix:\n" + "\n".join(failures))


if __name__ == "__main__":
    unittest.main()
