"""Tester regression for the Evaluator binding defects on Phase 2 (issue #532).

Guards the three must-fix items so they cannot regress:
1. tb-agent fetch ships every row (no truncation): rows == len(lines) even
   on 400+ row pages (Wikipedia live, skipped without Chrome/network).
2. No dangling docs/parity.md reference in terminal-browser docs.
3. Hub index.html links rendered GitHub views, never raw docs/*.md.

Test files only; production code is never touched.
"""
import json
import os
import shutil
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENT_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-agent-evalfix")


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120, **kw)


def has_chrome():
    for name in ("google-chrome", "google-chrome-stable", "chromium",
                 "chromium-browser", "chrome-headless-shell"):
        if shutil.which(name):
            return True
    for cand in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                 "/usr/bin/google-chrome", "/usr/bin/chromium"):
        if os.path.exists(cand):
            return True
    return False


class EvalFixSourceContract(unittest.TestCase):
    def test_fetch_ships_full_lines_no_truncation(self):
        with open(os.path.join(ROOT, "cmd", "tb-agent", "main.go"),
                  encoding="utf-8") as fh:
            src = fh.read()
        self.assertNotIn("lines[:200]", src,
                         "tb-agent must not truncate lines while emitting full RowCount")
        self.assertIn("lines_returned", src)

    def test_parity_md_reference_resolves(self):
        # Phase 5 ships docs/parity.md, so references must resolve to
        # the real file instead of dangling (the old prohibition).
        target = os.path.join(ROOT, "docs", "parity.md")
        self.assertTrue(os.path.isfile(target), "docs/parity.md must exist")
        hits = []
        for dirpath, _, files in os.walk(ROOT):
            if ".git" in dirpath:
                continue
            for fn in files:
                if fn.endswith((".md", ".html", ".py", ".go")):
                    p = os.path.join(dirpath, fn)
                    if os.path.basename(p) == os.path.basename(__file__):
                        continue
                    with open(p, encoding="utf-8", errors="replace") as fh:
                        if "parity.md" in fh.read():
                            hits.append(os.path.relpath(p, ROOT))
        self.assertTrue(hits, "control-plane files must reference docs/parity.md")

    def test_hub_docs_links_rendered(self):
        with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as fh:
            html = fh.read()
        self.assertNotIn('href="docs/', html,
                         "hub must not link raw docs/*.md that Pages serves as text")
        self.assertIn("github.com", html)


@unittest.skipUnless(has_chrome(), "no Chrome sidecar in this environment")
class EvalFixLiveLargePage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        p = run(["go", "build", "-o", AGENT_BIN, "./cmd/tb-agent"], cwd=ROOT)
        assert p.returncode == 0, f"build tb-agent: {p.stderr[-2000:]}"

    def test_large_page_rows_equal_lines(self):
        p = run([AGENT_BIN, "fetch", "--url",
                 "https://en.wikipedia.org/wiki/Go_(programming_language)",
                 "--width", "80"])
        if p.returncode != 0:
            self.skipTest(f"network unavailable: {p.stdout[-300:]}")
        env = json.loads(p.stdout)
        self.assertTrue(env["success"])
        self.assertGreater(env["data"]["rows"], 200,
                           "probe page must exceed the old 200-line cap")
        self.assertEqual(env["data"]["rows"], len(env["data"]["lines"]),
                         "rows must equal shipped lines on 400+ row pages")
        self.assertEqual(env["data"]["lines_returned"], len(env["data"]["lines"]))


if __name__ == "__main__":
    import sys
    sys.exit(0 if unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromName("__main__")).wasSuccessful() else 1)
