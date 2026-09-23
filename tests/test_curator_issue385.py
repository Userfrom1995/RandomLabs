"""Regression tests for Curator PR fixing issue #385.

Root index.html meta description must name Umbra (shipped via issue
#375 close, after Doom #362) as most recent, not the stale Doom
copy. The meta must stay consistent with the landing Umbra card and
README Live Projects entry.

Locator note: assertions scope the Umbra card via `<h4>Umbra</h4>`
rather than the first "Umbra" occurrence, because the synced meta
description itself now (correctly) mentions Umbra earlier in the file.

Run: python3 tests/test_curator_issue385.py
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


def meta_description(html):
    m = re.search(
        r'<meta\s+name="description"\s+content="([^"]*)"', html, re.IGNORECASE
    )
    assert m, "meta description tag missing"
    return m.group(1)


class TestCuratorIssue385(unittest.TestCase):
    def test_meta_names_umbra_as_most_recent(self):
        desc = meta_description(read("index.html"))
        self.assertIn("Umbra", desc, "meta must name Umbra as most recent")
        self.assertRegex(
            desc, re.compile(r"most recently umbra", re.IGNORECASE),
            "meta must stamp Umbra as most recent project",
        )

    def test_meta_carries_shipped_facts(self):
        desc = meta_description(read("index.html"))
        for token in ("#375", "455/455", "G1-G7", "/umbra/"):
            self.assertIn(token, desc, f"shipped fact {token!r} missing in meta")

    def test_meta_stale_doom_copy_gone(self):
        desc = meta_description(read("index.html"))
        self.assertNotIn(
            "Most recently Doom", desc, "stale Doom-as-latest copy still in meta"
        )
        self.assertNotIn(
            "H1-H5", desc, "stale Doom ledger copy still in meta"
        )

    def test_meta_consistent_with_card_and_readme(self):
        desc = meta_description(read("index.html"))
        html = read("index.html")
        card_at = html.index("<h4>Umbra</h4>")
        card_window = html[card_at:card_at + 2000]
        self.assertIn("Shipped", html[card_at - 500:card_at],
                      "Umbra card missing Shipped tag")
        self.assertIn("issue #375 closed", card_window,
                      "Umbra card must cite (issue #375 closed)")
        for token in ("455/455", "G1-G7"):
            self.assertIn(token, card_window,
                          f"card fact {token!r} missing; meta/card drift")
            self.assertIn(token, desc, f"meta fact {token!r} missing; meta/card drift")
        readme = read("README.md")
        self.assertRegex(readme, re.compile(r"umbra.*shipped|shipped.*umbra",
                                            re.IGNORECASE),
                         "README Umbra shipped entry missing")
        self.assertIn("455/455", readme, "README Umbra test count missing")
        self.assertIn("G1-G7", readme, "README Umbra ledger range missing")

    def test_umbra_entrypoint_present(self):
        self.assertTrue(exists("umbra"), "umbra/ directory missing")
        self.assertTrue(exists("umbra", "index.html"), "umbra/index.html missing")
        self.assertTrue(exists("umbra", "README.md"), "umbra/README.md missing")

    def test_no_placeholders_or_em_dashes(self):
        desc = meta_description(read("index.html"))
        for token in ("TODO", "FIXME", "XXX", "coming soon", "lorem ipsum"):
            self.assertNotIn(token, desc, f"placeholder {token!r} in meta")
        self.assertNotIn("\u2014", desc, "em dash in meta")
        self.assertNotIn("\u2014", read("index.html"), "em dash in index.html")
        self.assertNotIn("\u2014", read("README.md"), "em dash in README.md")

    def test_html_parses_and_umbra_links_resolve(self):
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
            elif t.startswith("/umbra/") or t.startswith("umbra/"):
                local = t.lstrip("/").split("#")[0].split("?")[0]
                if local.endswith("/"):
                    local += "index.html"
            else:
                continue
            if local and not os.path.exists(os.path.join(REPO, local)):
                missing.append(t)
        self.assertEqual(missing, [], f"missing site targets: {missing}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
