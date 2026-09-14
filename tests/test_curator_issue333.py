"""Regression tests for Curator PR fixing issue #333.

Covers the three defect classes repaired by the Curator:
  1. Folio/Tabula/Sextant Documentation links pointed at Pages directory
     URLs (.../folio/docs/ etc.) that 404 (docs dirs ship only .md files,
     no index.html). They must point at the GitHub blob docs directories,
     matching the Obsidian/Prism convention.
  2. Prism cards claimed C++20; ground truth is C++17
     (prism/CMakeLists.txt, prism/README.md, root README.md).
  3. Poolduel entries must note the in-flight M9 powered resweep.

Run: python3 tests/test_curator_issue333.py
"""

import os
import re
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(name):
    with open(os.path.join(REPO, name), encoding="utf-8") as f:
        return f.read()


class TestCuratorIssue333(unittest.TestCase):
    def test_docs_links_point_at_blob_dirs(self):
        html = read("index.html")
        for proj in ("folio", "tabula", "sextant"):
            blob = (
                "https://github.com/Userfrom1995/RandomLabs/blob/main/"
                f"{proj}/docs/"
            )
            old = f"https://userfrom1995.github.io/RandomLabs/{proj}/docs/"
            self.assertIn(blob, html, f"{proj} blob docs link missing")
            self.assertNotIn(old, html, f"{proj} stale Pages docs URL remains")

    def test_blob_docs_targets_exist_locally(self):
        for proj in ("folio", "tabula", "sextant"):
            d = os.path.join(REPO, proj, "docs")
            self.assertTrue(os.path.isdir(d), f"{d} missing")
            md = [f for f in os.listdir(d) if f.endswith(".md")]
            self.assertTrue(md, f"{d} has no .md files")
            self.assertFalse(
                os.path.exists(os.path.join(d, "index.html")),
                f"{d}/index.html exists, Pages dir URL would not 404",
            )

    def test_prism_standard_is_cxx17(self):
        html = read("index.html")
        self.assertNotIn("C++20", html, "stale C++20 claim remains in site")
        self.assertGreaterEqual(
            html.count("C++17"), 2, "expected 2+ C++17 Prism mentions"
        )
        with open(os.path.join(REPO, "prism", "CMakeLists.txt")) as f:
            cmake = f.read()
        self.assertIn("CMAKE_CXX_STANDARD 17", cmake)
        self.assertIn("C++17", read("prism/README.md"))

    def test_poolduel_m9_in_flight_noted(self):
        # SUPERSEDED by issue #345 (PR #346): the M9-in-flight wording was
        # correct at #333 time but the entries have since moved to the
        # verified M10-M12 state. Assert the stale clause is gone and the
        # new state is present; detailed M10-M12 coverage lives in
        # tests/test_curator_issue345.py.
        stale = "M9 powered resweep in flight"
        self.assertNotIn(stale, read("index.html"))
        self.assertNotIn(stale, read("README.md"))
        self.assertIn("M12", read("index.html"))
        self.assertIn("#302", read("index.html"))

    def test_no_em_dashes_in_changed_files(self):
        for name in ("index.html", "README.md"):
            self.assertNotIn("\u2014", read(name), f"em dash in {name}")

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
        readme = read("README.md")
        self.assertIn(
            "projects ideated, written, maintained",
            readme,
            "root README first-section attribution damaged",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
