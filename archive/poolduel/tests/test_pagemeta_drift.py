"""Poolduel M5 drift + IA-lock tests (plan section 10, step 0).

Fails when page prose disagrees with the medians: the banner counts in
``poolduel/index.html`` must match ``results/pagemeta.json``, which must
match a recomputation from the committed medians. The M2 variant-row
sentence must match the ``M2_ROWS`` / ``M2_NA_ROWS`` tables in code.

The IA lock is enforced here too: static site only, relative links,
vendored assets, no CDN, no Mermaid renderer dependency, and the fixed
7-section contract on every per-pooler dossier.

Stdlib only (unittest + re + json).
"""

import json
import os
import re
import unittest

from poolduel.harness import pagemeta
from poolduel.harness import m2 as m2mod

ROOT = os.path.join(os.path.dirname(__file__), "..")
INDEX = os.path.join(ROOT, "index.html")
PAGEMETA = os.path.join(ROOT, "results", "pagemeta.json")
M1_MEDIANS = os.path.join(ROOT, "results", "m1", "medians.json")
M2_MEDIANS = os.path.join(ROOT, "results", "m2", "medians.json")
DOSSIERS = ["pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat"]
SECTIONS = ["s-header", "s-charts", "s-flatness", "s-config",
            "s-verdict", "s-na", "s-repro"]


def _load(path):
    with open(path) as f:
        return json.load(f)


class TestPagemetaMatchesMedians(unittest.TestCase):
    def test_committed_pagemeta_recomputes(self):
        committed = _load(PAGEMETA)
        fresh = pagemeta.build_pagemeta(_load(M1_MEDIANS),
                                        _load(M2_MEDIANS))
        for key in ("scope", "m1", "m2", "banner_sentence"):
            self.assertEqual(committed[key], fresh[key],
                             "pagemeta.json[%s] drifted from medians; "
                             "re-run repro.sh --pagemeta" % key)

    def test_source_shas_match(self):
        committed = _load(PAGEMETA)
        self.assertEqual(
            committed["sources"]["m1/medians.json"],
            pagemeta._sha256_file(M1_MEDIANS))
        self.assertEqual(
            committed["sources"]["m2/medians.json"],
            pagemeta._sha256_file(M2_MEDIANS))

    def test_expected_shape(self):
        meta = pagemeta.build_pagemeta(_load(M1_MEDIANS),
                                       _load(M2_MEDIANS))
        self.assertEqual(meta["m1"]["total"], 42)
        self.assertEqual(meta["m2"]["total"], 111)
        self.assertEqual(meta["m2"]["na"], 7)
        self.assertEqual(meta["m2"]["distinct_cells"], 52)
        self.assertIn("M1: 42 cells", meta["banner_sentence"])


class TestBannerDrift(unittest.TestCase):
    def _banner_span(self):
        with open(INDEX) as f:
            html = f.read()
        match = re.search(
            r'<span id="pagemeta-counts"([^>]*)>(.*?)</span>',
            html, re.S)
        self.assertIsNotNone(match, "index.html lost its #pagemeta-counts "
                                    "generated-include span")
        return match.group(1), re.sub(r"\s+", " ", match.group(2)).strip()

    def test_banner_text_matches_generator(self):
        attrs, text = self._banner_span()
        meta = _load(PAGEMETA)
        self.assertEqual(text, meta["banner_sentence"],
                         "banner fallback text drifted from pagemeta.json; "
                         "sync the static fallback with the generator")

    def test_banner_data_attrs_match_generator(self):
        attrs, _text = self._banner_span()
        meta = _load(PAGEMETA)
        for attr, value in (("data-m1-total", meta["m1"]["total"]),
                            ("data-m2-total", meta["m2"]["total"]),
                            ("data-m2-na", meta["m2"]["na"])):
            found = re.search(r'%s="(\d+)"' % attr, attrs)
            self.assertIsNotNone(found, "banner span missing %s" % attr)
            self.assertEqual(int(found.group(1)), value)

    def test_m2_variant_row_sentence_matches_code(self):
        with open(INDEX) as f:
            html = f.read()
        flat = re.sub(r"\s+", " ", html)
        sentence = "%d measured rows plus %d N/A rows" % (
            len(m2mod.M2_ROWS), len(m2mod.M2_NA_ROWS))
        self.assertIn(sentence, flat,
                      "M2 variant-row sentence drifted from m2.py tables")


class TestIALock(unittest.TestCase):
    def _pages(self):
        pages = [INDEX]
        for dossier in DOSSIERS:
            pages.append(os.path.join(ROOT, dossier, "index.html"))
        return pages

    def test_no_absolute_or_cdn_asset_refs(self):
        for page in self._pages():
            with open(page) as f:
                html = f.read()
            for attr in re.findall(r'(?:src|href)="([^"]*)"', html):
                self.assertFalse(
                    attr.startswith("http://")
                    or attr.startswith("https://")
                    or attr.startswith("//"),
                    "%s carries a non-relative ref: %s "
                    "(static site: relative links, vendored assets, no CDN)"
                    % (page, attr))

    def test_no_mermaid_renderer_dependency(self):
        for page in self._pages():
            with open(page) as f:
                html = f.read().lower()
            self.assertNotIn("mermaid", html,
                             "%s depends on a Mermaid renderer; ship "
                             "diagrams as text or SVG" % page)

    def test_vendored_echarts_exists(self):
        vendor = os.path.join(ROOT, "vendor", "echarts-5.5.1")
        self.assertTrue(os.path.isfile(
            os.path.join(vendor, "dist", "echarts.min.js")),
            "vendored ECharts bundle missing")
        self.assertTrue(os.path.isfile(os.path.join(ROOT, "vendor",
                                                     "VERSION")),
                        "vendored ECharts VERSION pin missing")

    def test_dossier_section_contract(self):
        for dossier in DOSSIERS:
            path = os.path.join(ROOT, dossier, "index.html")
            with open(path) as f:
                html = f.read()
            found = re.findall(r'id="(s-[a-z]+)"', html)
            self.assertEqual(found, SECTIONS,
                             "%s breaks the 7-section-ID contract "
                             "(order fixed)" % path)


if __name__ == "__main__":
    unittest.main()
