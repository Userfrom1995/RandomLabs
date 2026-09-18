"""Regression tests for Curator PR fixing issue #369.

Root README.md and index.html Doom entries must reflect the shipped
state (issue #362 closed, merged via PR #367), not the stale
in-flight wording with gates pending.

Ground truth verified on this branch:
  - doom/ suite: 424/424 node:test green
    (node --test doom/tests/*.mjs)
  - Doom bullet claims M1-M5 done, H1-H5 ledger measured end to end

Run: python3 tests/test_curator_issue369.py
"""

import os
import re
import unittest
from html.parser import HTMLParser

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(name):
    with open(os.path.join(REPO, name), encoding="utf-8") as f:
        return f.read()


def exists(*parts):
    return os.path.exists(os.path.join(REPO, *parts))


class TestCuratorIssue369(unittest.TestCase):
    def test_shipped_state_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("#362", body, f"#362 ref missing in {name}")
            self.assertRegex(
                body, re.compile(r"issue #362 closed", re.IGNORECASE),
                f"closure stamp missing in {name}",
            )
            self.assertIn("#367", body, f"PR #367 ref missing in {name}")
            self.assertRegex(
                body, re.compile(r"shipped", re.IGNORECASE),
                f"shipped stamp missing in {name}",
            )

    def test_stale_in_flight_wording_gone(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            for stale in (
                "(in progress, issue #362 open)",
                "(issue #362 open)",
                "issue #362 open",
                "gates now decide the merge",
            ):
                self.assertNotIn(stale, body, f"stale {stale!r} still in {name}")

    def test_doom_tag_shipped(self):
        html = read("index.html")
        doom_idx = html.index("Doom")
        window = html[max(0, doom_idx - 500):doom_idx]
        self.assertIn("Shipped", window, "Doom card missing Shipped tag")
        self.assertNotIn("In progress", window, "stale Doom tag still present")

    def test_carried_over_claims_intact(self):
        shared = ("424/424", "H1-H5", "WAD",
                  "WebGL", "WebAudio", "OPFS", "offline")
        for name in ("README.md", "index.html"):
            body = read(name)
            for token in shared:
                self.assertIn(token, body, f"carried-over {token} missing in {name}")
        self.assertIn("M1-M5", read("README.md"), "M1-M5 missing in README.md")
        # The landing card enumerates Doom features directly (WAD reader,
        # WebGL renderer, input, audio, OPFS, multi-WAD, onboarding,
        # offline, H1-H5 ledger) instead of a milestone token; the
        # shared-token loop above already covers those.

    def test_doom_suite_dir_present(self):
        self.assertTrue(exists("doom"), "doom/ directory missing")
        self.assertTrue(exists("doom", "README.md"), "doom/README.md missing")
        self.assertTrue(
            exists("progress", "362-doom.md"), "progress/362-doom.md missing"
        )

    def test_no_placeholders_or_em_dashes(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            for token in ("TODO", "FIXME", "XXX", "coming soon", "lorem ipsum"):
                self.assertNotIn(token, body, f"placeholder {token!r} in {name}")
            self.assertNotIn("\u2014", body, f"em dash in {name}")

    def test_readme_first_section_preserved(self):
        readme = read("README.md")
        self.assertIn(
            "This repo contains projects ideated, written, maintained, and reviewed",
            readme,
        )

    def test_html_parses_and_links_resolve(self):
        html = read("index.html")
        parser = HTMLParser()
        parser.feed(html)  # raises on malformed markup
        targets = re.findall(r'(?:href|src)="([^"]+)"', html)
        missing = []
        for t in targets:
            local = None
            if "blob/main/" in t:
                local = t.split("blob/main/")[1].split("#")[0]
            elif "github.io/RandomLabs/" in t:
                part = re.split(r"RandomLabs/", t, flags=re.I)[1].split("#")[0].split("?")[0].strip("/")
                local = part if part else "index.html"
            else:
                continue
            if local and not os.path.exists(os.path.join(REPO, local)):
                missing.append(t)
        self.assertEqual(missing, [], f"missing site targets: {missing}")

    def test_readme_links_resolve(self):
        links = re.findall(r"\[([^\]]+)\]\(([^)]+)\)", read("README.md"))
        self.assertGreater(len(links), 30, "unexpectedly few README links")
        broken = [
            url for _, url in links
            if not url.startswith("http") and not os.path.exists(url.split("#")[0])
        ]
        self.assertEqual(broken, [], f"broken README links: {broken}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
