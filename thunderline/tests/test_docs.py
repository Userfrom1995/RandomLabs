#!/usr/bin/env python3
"""Thunderline final gate: unified docs surface plus edge-fade mix constants.

Pins the behind-the-scenes surface without touching production logic: every
docs page exists with a real H1 and substantive body, public docs carry zero
internal milestone markers and zero em dashes, every relative link from the
docs hub / README / player footer resolves to a committed file, the license
page declares the original lab-owned work, and the mix constants the docs
describe (edge fades, ceiling, stem-null tolerance) match score/mix.json.
"""
import json
import os
import re
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(ROOT)

DOCS = os.path.join(ROOT, "docs")
PAGES = ("index.md", "story.md", "chords-arrangement.md", "mix.md",
         "repro.md", "license.md", "index.html")
FORBIDDEN = (re.compile(r"\bM[1-9]\b"), re.compile(r"milestone", re.IGNORECASE),
             re.compile(r"sprint", re.IGNORECASE),
             re.compile(r"changelog", re.IGNORECASE),
             re.compile(r"TODO|FIXME|XXX|lorem ipsum", re.IGNORECASE),
             re.compile(r"coming soon", re.IGNORECASE))
HREF = re.compile(r'href="([^"#:]+)"')


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


class DocsGate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.texts = {}
        for page in PAGES:
            cls.texts[page] = read(os.path.join(DOCS, page))
        with open(os.path.join(ROOT, "score", "mix.json"),
                  encoding="utf-8") as f:
            cls.mix = json.load(f)
        cls.readme = read(os.path.join(ROOT, "README.md"))
        cls.player_index = read(os.path.join(ROOT, "index.html"))

    def test_all_pages_exist_with_h1_and_body(self):
        for page in PAGES:
            body = self.texts[page]
            self.assertGreater(len(body), 400, "thin docs page: %s" % page)
            if page.endswith(".md"):
                self.assertTrue(body.startswith("# "),
                                "missing H1: %s" % page)
            else:
                self.assertIn("<h1>", body, "missing H1: %s" % page)
                self.assertIn("<title>", body, "missing title: %s" % page)

    def test_no_milestone_leakage_no_placeholders(self):
        checked = dict(self.texts)
        checked["README.md"] = self.readme
        for name, body in checked.items():
            for pat in FORBIDDEN:
                self.assertIsNone(
                    pat.search(body),
                    "forbidden marker %r in %s" % (pat.pattern, name))

    def test_no_em_dashes(self):
        for name, body in {"README.md": self.readme,
                           "index.html": self.player_index,
                           **self.texts}.items():
            self.assertNotIn("\u2014", body, "em dash in %s" % name)

    def test_hub_links_resolve(self):
        hub = self.texts["index.html"]
        links = [h for h in HREF.findall(hub) if not h.startswith("http")]
        self.assertGreater(len(links), 5, "hub links too few: %r" % links)
        for href in links:
            if href.startswith("../"):
                target = os.path.normpath(os.path.join(DOCS, href))
            else:
                target = os.path.join(DOCS, href)
            self.assertTrue(os.path.exists(target),
                            "hub link dead: %s" % href)

    def test_readme_and_player_link_docs(self):
        for target in ("docs/story.md", "docs/chords-arrangement.md",
                       "docs/mix.md", "docs/repro.md", "docs/license.md"):
            self.assertIn(target, self.readme,
                          "README never links %s" % target)
            self.assertTrue(os.path.isfile(os.path.join(ROOT, target)),
                            "README link target missing: %s" % target)
        self.assertIn('href="docs/"', self.player_index,
                      "player footer never links the docs hub")

    def test_license_declares_original_lab_owned(self):
        lic = self.texts["license.md"].lower()
        self.assertIn("original work", lic)
        self.assertIn("lab", lic)
        self.assertIn("mit", lic)

    def test_docs_match_mix_constants(self):
        mix_notes = self.texts["mix.md"]
        self.assertEqual(self.mix["fadeInSec"], 0.02)
        self.assertEqual(self.mix["fadeOutSec"], 0.25)
        self.assertIn("20 ms", mix_notes, "mix notes never state the fade-in")
        self.assertIn("250 ms", mix_notes,
                      "mix notes never state the fade-out")
        self.assertIn(str(self.mix["masterCeiling"]), mix_notes)
        self.assertIn(str(self.mix["stemNullToleranceRms"]), mix_notes)


if __name__ == "__main__":
    unittest.main()
