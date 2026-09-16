"""Regression tests for Curator PR fixing issue #360.

Root README.md and index.html Poolduel entries must reflect the
#302 closure state (closed 2026-09-16 by Owner), not the stale
in-progress wording.

Ground truth verified on this branch:
  - issue #302 CLOSED, closedAt 2026-09-16T16:56:41Z, COMPLETED
  - PR #357 MERGED (M13b gate battery)
  - committed medians: m1 42, m2 111, m9 250, m10-soak 36
  - known open items at close documented in progress/302-poolduel.md
    (Tester sample-cell repro, Supavisor zero measured, Reviewer byte-match)

Run: python3 tests/test_curator_issue360.py
"""

import json
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


def median_count(*parts):
    with open(os.path.join(REPO, *parts), encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return len(data)
    for key in ("rows", "medians", "data"):
        if isinstance(data, dict) and isinstance(data.get(key), list):
            return len(data[key])
    raise AssertionError(f"unexpected medians shape in {'/'.join(parts)}")


class TestCuratorIssue360(unittest.TestCase):
    def test_closure_state_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("#302", body, f"#302 ref missing in {name}")
            self.assertRegex(
                body, re.compile(r"#302 closed 2026-09-16", re.IGNORECASE),
                f"closure stamp missing in {name}",
            )

    def test_stale_in_progress_wording_gone(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            for stale in (
                "M13b final gate pending",
                "Issue #302 stays open",
                "(in progress, issue #302 open)",
                "(issue #302 open)",
                "M13 closure blueprint is filed",
            ):
                self.assertNotIn(stale, body, f"stale {stale!r} still in {name}")

    def test_m9_resweep_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("250 rows", body, f"M9 250 rows missing in {name}")
            self.assertRegex(
                body, re.compile(r"M9 resweep", re.IGNORECASE),
                f"M9 resweep clause missing in {name}",
            )

    def test_m13b_gate_merged_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("M13b", body, f"M13b missing in {name}")
            self.assertIn("#357", body, f"PR #357 ref missing in {name}")
            self.assertRegex(
                body, re.compile(r"verification sweep", re.IGNORECASE),
                f"verification-sweep clause missing in {name}",
            )
            self.assertRegex(
                body, re.compile(r"suite green", re.IGNORECASE),
                f"suite-green clause missing in {name}",
            )

    def test_known_open_items_pointer(self):
        for name in ("README.md", "index.html"):
            body = read(name).lower()
            self.assertIn("known open items", body, f"open-items pointer missing in {name}")
            self.assertIn("progress log", body, f"progress-log pointer missing in {name}")
        # README enumerates the three honestly-open items; the
        # progress log is the source of truth.
        readme = read("README.md")
        for token in ("Tester sample-cell", "Supavisor zero", "byte-match"):
            self.assertIn(token, readme, f"{token} missing in README")
        progress = read("progress/302-poolduel.md")
        self.assertIn("Tester sample-cell repro", progress)
        self.assertIn("Supavisor zero measured", progress)
        self.assertIn("byte-match", progress)

    def test_median_counts_grounded(self):
        self.assertEqual(median_count("poolduel", "results", "m1", "medians.json"), 42)
        self.assertEqual(median_count("poolduel", "results", "m2", "medians.json"), 111)
        self.assertEqual(median_count("poolduel", "results", "m9", "medians.json"), 250)
        self.assertEqual(
            median_count("poolduel", "results", "m10-soak", "medians.json"), 36
        )
        for name in ("README.md", "index.html"):
            body = read(name)
            for token in ("42 rows", "111 rows", "250 rows", "36 medians"):
                self.assertIn(token, body, f"grounded {token} missing in {name}")

    def test_poolduel_tag_closed(self):
        html = read("index.html")
        self.assertIn('<span class="tag">Closed</span>', html)
        # The Poolduel card must no longer carry the In-progress tag.
        poolduel_idx = html.index("Poolduel")
        window = html[max(0, poolduel_idx - 500):poolduel_idx]
        self.assertNotIn("In progress", window, "stale Poolduel tag still present")

    def test_carried_over_claims_intact(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            for token in ("M1 medians", "M2 medians", "M10 soak", "M11a", "#343",
                          "M13a", "absent", "timeout", "dossier", "loader"):
                self.assertIn(token, body, f"carried-over {token} missing in {name}")

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
