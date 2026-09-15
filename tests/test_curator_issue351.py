"""Regression tests for Curator PR fixing issue #351.

Root README.md and index.html Poolduel entries must reflect verified
main state as of M13a (not the stale M12-ending wording from PR #343).

Ground truth verified on main ancestry:
  - issue #302 OPEN (poolduel shootout tracker)
  - M13a soak-figure work on main (soak visuals with absent-vs-timeout
    markers, tier-suffixed dossiers, loader guards; full suite 739/739)
  - M13 closure blueprint filed
    (ideas/2026-09-15-poolduel-m13-closure.md)
  - M13b final gate pending, issue #302 stays open (Refs #302)

Run: python3 tests/test_curator_issue351.py
"""

import os
import re
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(name):
    with open(os.path.join(REPO, name), encoding="utf-8") as f:
        return f.read()


def exists(*parts):
    return os.path.exists(os.path.join(REPO, *parts))


class TestCuratorIssue351(unittest.TestCase):
    def test_m12_ending_wording_gone(self):
        # The entries must no longer END at the M12 clause: M13a must
        # follow the carried-over M12 text in both surfaces.
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("M13a", body, f"M13a missing in {name}")
            self.assertLess(
                body.index("M12"),
                body.index("M13a"),
                f"M13a does not follow M12 in {name}",
            )

    def test_m13a_on_main_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("M13a", body, f"M13a missing in {name}")
            self.assertIn("739/739", body, f"739/739 count missing in {name}")

    def test_m13a_feature_markers_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name).lower()
            self.assertIn("absent", body, f"absent-marker note missing in {name}")
            self.assertIn("timeout", body, f"timeout-marker note missing in {name}")
            self.assertIn("dossier", body, f"dossier note missing in {name}")
            self.assertIn("loader", body, f"loader-guard note missing in {name}")

    def test_m13_closure_blueprint_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("M13", body, f"M13 missing in {name}")
            self.assertRegex(
                body,
                re.compile(r"M13 closure blueprint is filed", re.IGNORECASE),
                f"M13 closure blueprint clause missing in {name}",
            )

    def test_m13b_pending_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("M13b", body, f"M13b missing in {name}")
            self.assertRegex(
                body,
                re.compile(r"M13b final gate pending", re.IGNORECASE),
                f"M13b pending clause missing in {name}",
            )

    def test_issue_302_stays_open_noted(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            self.assertIn("#302", body, f"#302 ref missing in {name}")
            self.assertRegex(
                body, re.compile(r"stays open|#302 open", re.IGNORECASE),
                f"open-state wording missing in {name}",
            )
        # The "Refs #302" tracker convention lives in the README entry.
        self.assertIn("Refs #302", read("README.md"), "Refs #302 missing in README")

    def test_m13a_ground_truth_files_exist(self):
        for target in (
            ("ideas", "2026-09-15-poolduel-m13a-soak-figure.md"),
            ("ideas", "2026-09-15-poolduel-m13-closure.md"),
            ("poolduel", "README.md"),
            ("progress", "302-poolduel.md"),
        ):
            self.assertTrue(exists(*target), f"{'/'.join(target)} missing")

    def test_m13a_suite_count_grounded(self):
        ideas = read("ideas/2026-09-15-poolduel-m13a-soak-figure.md")
        self.assertIn("739/739", ideas, "739/739 not grounded in M13a ideas entry")

    def test_m12_claims_carried_over(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            for token in ("M10", "M11a", "#343", "42 rows", "111 rows"):
                self.assertIn(token, body, f"carried-over {token} missing in {name}")

    def test_no_placeholders_or_em_dashes(self):
        for name in ("README.md", "index.html"):
            body = read(name)
            for token in ("TODO", "FIXME", "XXX", "coming soon", "lorem ipsum"):
                self.assertNotIn(token, body, f"placeholder {token!r} in {name}")
            self.assertNotIn("\u2014", body, f"em dash in {name}")

    def test_readme_site_poolduel_consistent(self):
        readme = read("README.md")
        html = read("index.html")
        for token in ("M13a", "M13b", "739/739", "#302"):
            self.assertIn(token, readme, f"{token} missing in README")
            self.assertIn(token, html, f"{token} missing in index.html")

    def test_readme_links_resolve(self):
        links = re.findall(r"\[([^\]]+)\]\(([^)]+)\)", read("README.md"))
        self.assertGreater(len(links), 30, "unexpectedly few README links")
        broken = [
            url for _, url in links
            if not url.startswith("http") and not os.path.exists(url.split("#")[0])
        ]
        self.assertEqual(broken, [], f"broken README links: {broken}")

    def test_site_blob_targets_exist(self):
        html = read("index.html")
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
                continue  # github.com issue/repo URLs: verified by pattern below
            if local and not os.path.exists(os.path.join(REPO, local)):
                missing.append(t)
        self.assertEqual(missing, [], f"missing site targets: {missing}")
        # Non-blob github.com links must be well-formed issue/blob URLs.
        for t in targets:
            if t.startswith("https://github.com/Userfrom1995/RandomLabs/"):
                self.assertRegex(
                    t,
                    re.compile(r"^https://github\.com/Userfrom1995/RandomLabs/(blob/main/\S+|issues/\d+)$"),
                    f"malformed repo link: {t}",
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
