"""Gate for the real-world verification harness (issue #532).

Checks the tb-verify corpus runner, the fixture goldens, the manifest
coverage, and the verification doc without needing Go or Chrome:
file presence, corpus pins, retry policy, Chrome floor reference,
golden schema, and the repro.sh wiring.
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERIFY = os.path.join(ROOT, "cmd", "tb-verify", "main.go")
GOLDENS = os.path.join(ROOT, "tests", "fixtures", "goldens")
DOC = os.path.join(ROOT, "docs", "verification.md")

WANT_ENTRIES = {
    "hn": "https://news.ycombinator.com/",
    "wiki": "https://en.wikipedia.org/wiki/Terminal_pager",
    "todomvc": "https://todomvc.com/examples/react/dist/",
    "botwall": "https://bot.sannysoft.com/",
    "github-login": "https://github.com/login",
}


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


class TestVerifyHarness(unittest.TestCase):
    def test_runner_present(self):
        self.assertTrue(os.path.isfile(VERIFY), "cmd/tb-verify/main.go missing")

    def test_corpus_pinned(self):
        body = read(VERIFY)
        for name, url in WANT_ENTRIES.items():
            self.assertIn(url, body, f"corpus URL missing: {url}")
            self.assertIn(f'Name: "{name}"', body, f"corpus entry missing: {name}")

    def test_retry_policy(self):
        body = read(VERIFY)
        self.assertIn("--attempts", body)
        self.assertIn("500 * time.Millisecond", body)
        self.assertIn("maxAttempts", body)

    def test_chrome_floor(self):
        body = read(VERIFY)
        self.assertIn("CheckFloor", body)
        self.assertIn("no_chrome", body)

    def test_offline_fallback_honest(self):
        body = read(VERIFY)
        self.assertIn("Fallback", body)
        self.assertIn("never", body)
        self.assertNotIn("fake_live", body)

    def test_goldens_schema(self):
        self.assertTrue(os.path.isdir(GOLDENS), "goldens dir missing")
        names = set()
        for name in sorted(os.listdir(GOLDENS)):
            if not name.endswith(".json"):
                continue
            with open(os.path.join(GOLDENS, name), encoding="utf-8") as fh:
                g = json.load(fh)
            self.assertIn("name", g, f"{name}: missing name")
            self.assertIn("min_rows", g, f"{name}: missing min_rows")
            self.assertGreater(g["min_rows"], 0, f"{name}: min_rows must be positive")
            names.add(g["name"])
        for want in WANT_ENTRIES:
            self.assertIn(want, names, f"golden missing for {want}")

    def test_golden_markers_match_fixtures(self):
        for golden_name in ("hn.json", "wiki.json"):
            with open(os.path.join(GOLDENS, golden_name), encoding="utf-8") as fh:
                g = json.load(fh)
            self.assertTrue(g.get("fixture"), f"{golden_name}: fixture-backed golden must name its fixture")
            self.assertTrue(g.get("marker"), f"{golden_name}: fixture-backed golden must pin a marker")
            fixture = read(os.path.join(ROOT, "tests", "fixtures", g["fixture"]))
            self.assertIn(g["marker"], fixture, f"{golden_name}: marker not in fixture text")

    def test_manifest_covers_goldens(self):
        manifest = read(os.path.join(ROOT, "tests", "fixtures", "MANIFEST.sha256"))
        for name in os.listdir(GOLDENS):
            if name.endswith(".json"):
                self.assertIn(f"tests/fixtures/goldens/{name}", manifest)

    def test_doc_present_and_unified(self):
        self.assertTrue(os.path.isfile(DOC), "docs/verification.md missing")
        body = read(DOC)
        for token in ("tb-verify", "3 attempts", "140", "goldens", "strict-live", "e2e"):
            self.assertIn(token, body, f"verification doc missing: {token}")
        hits = [l for l in body.splitlines()
                if re.search(r"\bM[1-9]\b|milestone\s+\d|this milestone|sprint\s+\d|changelog", l, re.IGNORECASE)]
        self.assertEqual(hits, [], "\n".join(hits))

    def test_repro_wires_verify(self):
        repro = read(os.path.join(ROOT, "repro.sh"))
        self.assertIn("tb-verify", repro)

    def test_e2e_present(self):
        body = read(VERIFY)
        self.assertIn("runE2E", body)
        self.assertIn("engine.Open", body)
        self.assertIn("skipped", body)


if __name__ == "__main__":
    unittest.main()
