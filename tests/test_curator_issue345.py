"""Regression tests for Curator PR fixing issue #345.

Supersedes the Poolduel M9 clause in tests/test_curator_issue333.py:
root README.md and index.html Poolduel entries must reflect verified
main state as of M10-M12 (not the stale M1/M2/M3 + M9-in-flight wording).

Ground truth verified on main ancestry:
  - issue #302 OPEN (poolduel shootout tracker)
  - M10 soak wired (b5b42374, 3f22d523) but undispatched
  - M11a statistics + M11b/M11c/M11d website rebuild merged
  - M12 reproducibility manifest merged (PR #343:
    harness/manifest.py, results/manifest.json, docs/digests.md,
    honestly-empty docs/errata.md)

Run: python3 tests/test_curator_issue345.py
"""

import json
import os
import re
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(name):
    with open(os.path.join(REPO, name), encoding="utf-8") as f:
        return f.read()


def exists(*parts):
    return os.path.exists(os.path.join(REPO, *parts))


class TestCuratorIssue345(unittest.TestCase):
    def test_stale_m9_wording_gone(self):
        stale = "M9 powered resweep in flight"
        self.assertNotIn(stale, read("README.md"), "stale M9 wording in README")
        self.assertNotIn(stale, read("index.html"), "stale M9 wording in site")

    def test_m10_wired_undispatched_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("M10", body, f"M10 missing in {name}")
            self.assertRegex(
                body,
                re.compile(r"M10 soak is wired[^.]*undispatched", re.IGNORECASE),
                f"M10 wired-but-undispatched clause missing in {name}",
            )

    def test_m11_merged_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("M11", body, f"M11 missing in {name}")
            for token in ("M11a", "M11b", "M11c", "M11d"):
                self.assertIn(token, body, f"{token} missing in {name}")

    def test_m12_manifest_merged_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("M12", body, f"M12 missing in {name}")
            self.assertIn("#343", body, f"PR #343 ref missing in {name}")
            self.assertIn("663 tests green", body, f"test count missing in {name}")

    def test_issue_302_stays_open_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name).lower()
            self.assertIn("#302", body, f"#302 ref missing in {name}")
            self.assertIn("open", body, f"open state missing in {name}")

    def test_m12_artifacts_exist(self):
        for target in (
            ("poolduel", "results", "manifest.json"),
            ("poolduel", "docs", "digests.md"),
            ("poolduel", "docs", "errata.md"),
            ("poolduel", "docs", "test-matrix.md"),
            ("poolduel", "README.md"),
            ("progress", "302-poolduel.md"),
            ("ideas", "2026-09-11-poolduel-shootout-report.md"),
        ):
            self.assertTrue(exists(*target), f"{'/'.join(target)} missing")

    def test_manifest_json_valid(self):
        path = os.path.join(REPO, "poolduel", "results", "manifest.json")
        with open(path, encoding="utf-8") as f:
            manifest = json.load(f)
        self.assertIsInstance(manifest, dict)
        self.assertTrue(manifest, "manifest.json is empty")

    def test_errata_honestly_empty(self):
        errata = read("poolduel/docs/errata.md")
        self.assertIn("No errata filed yet", errata)

    def test_poolduel_links_intact(self):
        html = read("index.html")
        for url in (
            "https://userfrom1995.github.io/RandomLabs/poolduel/",
            "https://github.com/Userfrom1995/RandomLabs/blob/main/poolduel/README.md",
            "https://github.com/Userfrom1995/RandomLabs/blob/main/ideas/2026-09-11-poolduel-shootout-report.md",
        ):
            self.assertIn(url, html, f"poolduel link missing: {url}")
        readme = read("README.md")
        for ref in (
            "ideas/2026-09-11-poolduel-shootout-report.md",
            "poolduel/README.md",
            "progress/302-poolduel.md",
        ):
            self.assertIn(ref, readme, f"poolduel ref missing in README: {ref}")

    def test_no_placeholders_or_todos_in_entries(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            for token in ("TODO", "FIXME", "XXX", "coming soon", "lorem ipsum"):
                self.assertNotIn(token, body, f"placeholder {token!r} in {name}")
            self.assertNotIn("\u2014", body, f"em dash in {name}")

    def test_html_tags_balanced(self):
        html = read("index.html")
        self.assertEqual(
            len(re.findall(r"<a ", html)),
            len(re.findall(r"</a>", html)),
            "unbalanced <a> tags",
        )
        self.assertEqual(
            len(re.findall(r"<div", html)),
            len(re.findall(r"</div>", html)),
            "unbalanced <div> tags",
        )

    def test_readme_first_section_preserved(self):
        self.assertIn(
            "projects ideated, written, maintained",
            read("README.md"),
            "root README first-section attribution damaged",
        )

    def test_readme_site_poolduel_consistent(self):
        # Both surfaces must agree on the milestone state keywords.
        readme = read("README.md")
        html = read("index.html")
        for token in ("M10", "M11a", "M12", "#302"):
            self.assertIn(token, readme, f"{token} missing in README")
            self.assertIn(token, html, f"{token} missing in index.html")


if __name__ == "__main__":
    unittest.main(verbosity=2)
