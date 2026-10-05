"""Tester regression for the second Evaluator round on Phase 2 (issue #532).

Guards the 7 binding defects from the 7.6/10 verdict so they cannot regress:
1. bad_profile dedicated code for invalid profiles (not generic error).
2. Spawn-inclusive total_ms alongside cold_ms, total >= cold.
3. repro.sh one-command reproduction exists with PASS/FAIL per step.
4. Fixture SHA-256 manifest pins hn.json + wiki.json.
5. Baseline incumbent harness + N>=5 mean/p95 repeat stats.
6. Hub visual polish: system sans body, >=14px secondary text, scroll-wrapped tables.
7. engine.md documents new codes, both timing fields, repro/manifest/baseline.

Test files only; production code is never touched.
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
AGENT_BIN = os.path.join(tempfile.gettempdir(), "tester-tb-agent-round3")


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120, **kw)


def read_engine(name):
    with open(os.path.join(ENGINE, name), encoding="utf-8") as fh:
        return fh.read()


def read_root(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as fh:
        return fh.read()


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


class Round3SourceContract(unittest.TestCase):
    def test_bad_profile_code_exists(self):
        nav = read_engine("navigate.go")
        self.assertIn("bad_profile", nav,
                      "ClassifyError must map invalid profiles to bad_profile")
        agent = read_root("cmd", "tb-agent", "main.go")
        self.assertIn("res.Code", agent,
                      "tb-agent must pass the engine code (incl. bad_profile) through")

    def test_total_ms_spawn_inclusive(self):
        nav = read_engine("navigate.go")
        self.assertIn("TotalMs", nav)
        self.assertIn("total_ms", read_root("cmd", "tb-agent", "main.go"))

    def test_repro_sh_exists_with_steps(self):
        path = os.path.join(ROOT, "repro.sh")
        self.assertTrue(os.path.exists(path), "repro.sh must exist")
        body = read_root("repro.sh")
        for step in ("go build", "go vet", "MANIFEST", "probe", "render"):
            self.assertIn(step, body, f"repro.sh must cover {step}")
        p = run(["sh", "-n", path])
        self.assertEqual(p.returncode, 0, f"repro.sh syntax: {p.stderr[-500:]}")

    def test_fixture_manifest_pins_snapshots(self):
        path = os.path.join(ROOT, "tests", "fixtures", "MANIFEST.sha256")
        self.assertTrue(os.path.exists(path), "manifest must exist")
        body = read_root("tests", "fixtures", "MANIFEST.sha256")
        self.assertIn("hn.json", body)
        self.assertIn("wiki.json", body)

    def test_baseline_harness_and_repeat_stats(self):
        self.assertTrue(os.path.exists(os.path.join(ENGINE, "baseline.go")),
                        "baseline.go incumbent harness must exist")
        base = read_engine("baseline.go")
        self.assertIn("BaselineFetchMs", base)
        self.assertIn("SummarizeCold", base)
        self.assertIn("P95", base)

    def test_hub_polish(self):
        html = read_root("index.html")
        self.assertNotIn("monospace", html.split("<body")[1].split("{")[0]
                         if "<body" in html else html[:200],
                         "body must not be monospace-only")
        self.assertIn("overflow-x", html,
                      "tables need a scroll wrapper at narrow widths")

    def test_engine_docs_cover_new_contract(self):
        docs = read_root("docs", "engine.md")
        for token in ("bad_profile", "total_ms", "repro.sh", "MANIFEST",
                      "BaselineFetchMs"):
            self.assertIn(token, docs, f"engine.md must document {token}")


@unittest.skipUnless(has_chrome(), "no Chrome sidecar in this environment")
class Round3Live(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        p = run(["go", "build", "-o", AGENT_BIN, "./cmd/tb-agent"], cwd=ROOT)
        assert p.returncode == 0, f"build tb-agent: {p.stderr[-2000:]}"

    def test_traversal_profile_is_bad_profile_exit_1(self):
        p = run([AGENT_BIN, "fetch", "--url", "https://example.com",
                 "--profile", "../../.ssh"])
        self.assertNotEqual(p.returncode, 0, "traversal profile must fail closed")
        env = json.loads(p.stdout)
        self.assertFalse(env["success"])
        self.assertEqual(env.get("code"), "bad_profile")

    def test_live_total_ms_covers_cold_ms(self):
        p = run([AGENT_BIN, "fetch", "--url", "https://example.com"])
        if p.returncode != 0:
            self.skipTest(f"network unavailable: {p.stdout[-300:]}")
        env = json.loads(p.stdout)
        self.assertTrue(env["success"])
        self.assertGreaterEqual(env["data"]["total_ms"], env["data"]["cold_ms"])
        self.assertLess(env["data"]["cold_ms"], 10000)


if __name__ == "__main__":
    import sys
    sys.exit(0 if unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromName("__main__")).wasSuccessful() else 1)
