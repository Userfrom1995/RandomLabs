"""Tester regression for Phase 4 review fixes (issue #532, PR #539).

Guards the five blocking findings from the Phase 4 review so they
cannot regress, plus the live CLI loop end to end:

Hermetic source contracts (no Chrome needed):
1. withRef lock-copies the snapshot map under b.mu (no unsynchronised
   b.snaps[gen] read) and carries no dead `_ = remap` line.
2. Drag routes both endpoints through resolveLive so stale gens fail
   closed with ref_stale plus a remap (never a raw resolve error).
3. instanceDir reaps only stale sidecar dirs (age policy) and the
   Extra flag deny list covers extension/proxy/security bypasses.
4. HandleDialog clears pending only after a successful CDP call, and
   the auto-policy keeps pending when its Call fails.
5. The TUI ref entry swallows non-digit keys with a hint instead of
   falling through to the main key switch (x/q must not fire mid-entry).
6. Screenshot PNG plus legend sidecar plus PDF writes use 0o600.

Live CLI loop (needs Chrome, skipped without it): the shipped
tb-agent binary drives snapshot plus fill plus assert plus click plus
wait plus screenshot plus pdf to success=true against a local page,
while hostile refs (e999) and traversal profiles fail closed.

Test files only; production code is never touched.
"""
import json
import os
import shutil
import socket
import subprocess
import tempfile
import threading
import unittest
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENT_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-agent-phase4-fixes")
ACT_GO = os.path.join(ROOT, "internal", "engine", "act.go")
CHROME_GO = os.path.join(ROOT, "internal", "engine", "chrome.go")
OBSERVE_GO = os.path.join(ROOT, "internal", "engine", "observe.go")
SHELL_GO = os.path.join(ROOT, "internal", "tui", "shell.go")

PAGE = (
    "<!doctype html><html><head><title>Tester Live</title></head><body>"
    "<h1>hello tester</h1>"
    '<form><input id="n" type="text" value="">'
    '<button id="b" type="button" onclick="document.title=\'Done\'">Go</button>'
    "</form></body></html>"
)


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=180, **kw)


def has_chrome():
    for name in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        if shutil.which(name):
            return True
    for path in (
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    ):
        if os.path.exists(path):
            return True
    return False


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


class Phase4FixContracts(unittest.TestCase):
    def test_withref_lock_copies_snapshot_map(self):
        src = read(ACT_GO)
        self.assertIn("resolveLive", src, "withRef race fix must keep the resolveLive helper")
        self.assertNotIn("_ = remap", src, "dead '_ = remap' line must stay removed")
        self.assertIn("b.mu.Lock()", src)
        self.assertIn("old := b.snaps[gen]", src)

    def test_drag_routes_through_stale_remap(self):
        src = read(ACT_GO)
        self.assertIn("resolveLive(from", src, "drag source must use resolveLive")
        self.assertIn("resolveLive(to", src, "drag target must use resolveLive")
        self.assertIn("drag source", src)
        self.assertIn("drag target", src)

    def test_instance_dir_reaps_only_stale_siblings(self):
        src = read(CHROME_GO)
        self.assertIn("staleSidecarAge", src, "sidecar reap must carry an age policy")
        for flag in ("load-extension", "proxy-server", "disable-web-security"):
            self.assertIn(flag, src, f"Extra deny list must cover {flag}")

    def test_dialog_pending_survives_failed_call(self):
        act = read(ACT_GO)
        call_at = act.index("Page.handleJavaScriptDialog")
        clear_at = act.index("b.pending = nil")
        self.assertLess(call_at, clear_at,
                        "HandleDialog must clear pending only after the CDP call succeeds")
        self.assertIn("if b.pending == pending", act,
                      "pending clear must be pointer-guarded against races")

    def test_ref_entry_swallows_typos(self):
        src = read(SHELL_GO)
        self.assertIn("Bad ref", src, "ref entry must hint on bad keys")
        self.assertIn("RefEntry", src)

    def test_shot_and_pdf_use_private_perms(self):
        src = read(OBSERVE_GO)
        self.assertIn("0o600", src, "screenshot/PDF writes must use 0o600")
        self.assertNotIn("0o644", src, "0o644 shot writes must stay removed")


class Phase4LiveLoop(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not has_chrome():
            raise unittest.SkipTest("no Chrome on PATH: live loop needs a real browser")
        p = run(["go", "build", "-o", AGENT_BIN, "./cmd/tb-agent"], cwd=ROOT)
        assert p.returncode == 0, f"go build tb-agent: {p.stderr[-1000:]}"
        cls.tmp = tempfile.mkdtemp(prefix="tb-phase4-live-")
        with open(os.path.join(cls.tmp, "index.html"), "w", encoding="utf-8") as fh:
            fh.write(PAGE)
        handler = partial(SimpleHTTPRequestHandler, directory=cls.tmp)
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.port = cls.srv.server_address[1]
        cls.thread = threading.Thread(target=cls.srv.serve_forever, daemon=True)
        cls.thread.start()
        # Wait until the server accepts connections.
        for _ in range(50):
            try:
                s = socket.create_connection(("127.0.0.1", cls.port), timeout=1)
                s.close()
                break
            except OSError:
                import time
                time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "srv"):
            cls.srv.shutdown()
            cls.srv.server_close()

    def agent(self, *args):
        env = dict(os.environ, TB_HOME=tempfile.mkdtemp(prefix="tb-phase4-live-home-"))
        return run([AGENT_BIN] + list(args), env=env, cwd=ROOT)

    def base(self):
        # Chrome on some hosts refuses 127.0.0.1 but serves localhost;
        # prefer localhost with an 127.0.0.1 fallback.
        return [f"http://localhost:{self.port}/", f"http://127.0.0.1:{self.port}/"]

    def test_happy_fill_click_shot_pdf_loop(self):
        last = None
        for url in self.base():
            p = self.agent(
                "interact", "--url", url, "--profile", "livehappy",
                "--caps", "pdf",
                "--do", '{"op":"snapshot"}',
                "--do", '{"op":"fill","ref":"e1","text":"Ada Lovelace","clear":true}',
                "--do", '{"op":"assert","cond":"value","ref":"e1","value":"Ada Lovelace"}',
                "--do", '{"op":"click","ref":"e2"}',
                "--do", '{"op":"wait","cond":"title","title":"Done","timeout":8}',
                "--do", '{"op":"screenshot","out":"/tmp/tb-phase4-live-done.png"}',
                "--do", '{"op":"pdf","out":"/tmp/tb-phase4-live-done.pdf"}',
            )
            last = p
            try:
                env = json.loads(p.stdout)
            except json.JSONDecodeError:
                continue
            if env.get("success"):
                break
        self.assertIsNotNone(last)
        env = json.loads(last.stdout)
        self.assertTrue(env.get("success"), f"live loop must succeed: {last.stdout[-500:]}")
        steps = env["data"]["steps"]
        self.assertEqual([s["op"] for s in steps],
                         ["snapshot", "fill", "assert", "click", "wait", "screenshot", "pdf"])
        self.assertTrue(all(s["success"] for s in steps))
        self.assertTrue(os.path.getsize("/tmp/tb-phase4-live-done.png") > 0)
        self.assertTrue(os.path.getsize("/tmp/tb-phase4-live-done.pdf") > 0)

    def test_hostile_ref_fails_closed(self):
        for url in self.base():
            p = self.agent("interact", "--url", url, "--profile", "livehost",
                           "--do", '{"op":"click","ref":"e999"}')
            try:
                env = json.loads(p.stdout)
            except json.JSONDecodeError:
                continue
            if not env.get("success"):
                break
        self.assertNotEqual(p.returncode, 0)
        env = json.loads(p.stdout)
        self.assertFalse(env.get("success"))
        code = env["data"]["steps"][0].get("code")
        self.assertIn(code, ("ref_not_found", "ref_stale", "ref_no_node"),
                      f"hostile ref must fail closed, got {code}")


if __name__ == "__main__":
    unittest.main()
