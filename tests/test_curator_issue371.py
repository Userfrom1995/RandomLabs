"""Regression tests for Curator PR fixing issue #371.

Root index.html meta description must name Doom (shipped via issue
#362 close, PR #367 merge) as most recent, not the stale Prism
finished-at-ceiling copy. The meta must stay consistent with the
landing Doom card and README Live Projects entry.

Locator note: assertions scope the Doom card via `<h4>Doom</h4>`
rather than the first "Doom" occurrence, because the synced meta
description itself now (correctly) mentions Doom earlier in the file.

Run: python3 tests/test_curator_issue371.py
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


class TestCuratorIssue371(unittest.TestCase):
    def test_meta_names_doom_as_most_recent(self):
        desc = meta_description(read("index.html"))
        self.assertIn("Doom", desc, "meta must name Doom as most recent")
        self.assertRegex(
            desc, re.compile(r"most recently doom", re.IGNORECASE),
            "meta must stamp Doom as most recent project",
        )

    def test_meta_carries_shipped_facts(self):
        desc = meta_description(read("index.html"))
        for token in ("#362", "424/424", "H1-H5", "/doom/"):
            self.assertIn(token, desc, f"shipped fact {token!r} missing in meta")

    def test_meta_stale_prism_copy_gone(self):
        desc = meta_description(read("index.html"))
        self.assertNotIn(
            "Most recently Prism", desc, "stale Prism-as-latest copy still in meta"
        )
        self.assertNotIn(
            "finished-at-ceiling", desc, "stale Prism ceiling copy still in meta"
        )

    def test_meta_consistent_with_card_and_readme(self):
        desc = meta_description(read("index.html"))
        html = read("index.html")
        card_at = html.index("<h4>Doom</h4>")
        card_window = html[card_at:card_at + 1500]
        self.assertIn("Shipped", html[card_at - 500:card_at],
                      "Doom card missing Shipped tag")
        for token in ("424/424", "H1-H5"):
            self.assertIn(token, card_window,
                          f"card fact {token!r} missing; meta/card drift")
            self.assertIn(token, desc, f"meta fact {token!r} missing; meta/card drift")
        readme = read("README.md")
        self.assertRegex(readme, re.compile(r"doom.*shipped|shipped.*doom",
                                            re.IGNORECASE),
                         "README Doom shipped entry missing")

    def test_doom_entrypoint_present(self):
        self.assertTrue(exists("doom"), "doom/ directory missing")
        self.assertTrue(exists("doom", "index.html"), "doom/index.html missing")

    def test_no_placeholders_or_em_dashes(self):
        desc = meta_description(read("index.html"))
        for token in ("TODO", "FIXME", "XXX", "coming soon", "lorem ipsum"):
            self.assertNotIn(token, desc, f"placeholder {token!r} in meta")
        self.assertNotIn("\u2014", desc, "em dash in meta")
        self.assertNotIn("\u2014", read("index.html"), "em dash in index.html")

    def test_html_parses_and_doom_links_resolve(self):
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
            elif t.startswith("/doom/") or t.startswith("doom/"):
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
