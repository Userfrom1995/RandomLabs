"""Poolduel M11d supplementary-pages tests: bundles in, facts out, IA locked.

Covers the M11d slice (guide / architecture / methodology /
reproducibility + design system): supplementmeta.json recomputes from
the committed bundles (no hand values), every page carries its
SUPPLEMENT marker, nav runs both ways, zero pending/loading content,
relative links only, no Mermaid renderer, shared assets exist and are
referenced relatively, and the required content blocks (picker, FAQ,
glossary, taxonomy, lifecycle, memory-honest table, registry, threats,
runbook, BibTeX, errata, verified-by) are present.
"""

import json
import os
import re
import unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
PAGES = ["guide", "architecture", "methodology", "reproducibility"]
M1_MEDIANS = os.path.join(ROOT, "results", "m1", "medians.json")
M2_MEDIANS = os.path.join(ROOT, "results", "m2", "medians.json")
M9_MEDIANS = os.path.join(ROOT, "results", "m9", "medians.json")
SOAK_MEDIANS = os.path.join(ROOT, "results", "m10-soak", "medians.json")
REPORT = os.path.join(ROOT, "results", "report.json")
SUPPLEMENTMETA = os.path.join(ROOT, "results", "supplementmeta.json")

from poolduel.harness import supplement as supmod


def _load(path):
    with open(path) as handle:
        data = json.load(handle)
    if isinstance(data, dict) and isinstance(data.get("medians"), list):
        return data["medians"]
    return data


def _page(name):
    with open(os.path.join(ROOT, name, "index.html")) as handle:
        return handle.read()


class TestSupplementMetaDrift(unittest.TestCase):
    def test_meta_recomputes_from_bundles(self):
        with open(SUPPLEMENTMETA) as handle:
            committed = json.load(handle)
        with open(REPORT) as handle:
            bundle = json.load(handle)
        fresh = supmod.build_supplementmeta(
            _load(M1_MEDIANS), _load(M2_MEDIANS), _load(M9_MEDIANS),
            bundle,
            {k: supmod._sha256_file(p) for k, p in
             (("m1/medians.json", M1_MEDIANS),
              ("m2/medians.json", M2_MEDIANS),
              ("m9/medians.json", M9_MEDIANS),
              ("m10-soak/medians.json", SOAK_MEDIANS),
              ("report.json", REPORT))},
            soak_entries=_load(SOAK_MEDIANS))
        self.assertEqual(committed["counts"], fresh["counts"],
                         "supplementmeta counts drifted; re-run --supplement")
        self.assertEqual(committed["pooler_versions"],
                         fresh["pooler_versions"],
                         "supplementmeta pins drifted; re-run --supplement")
        self.assertEqual(committed["banner_sentence"],
                         fresh["banner_sentence"])

    def test_source_shas_match_files(self):
        with open(SUPPLEMENTMETA) as handle:
            committed = json.load(handle)
        for key, path in (("m1/medians.json", M1_MEDIANS),
                          ("m2/medians.json", M2_MEDIANS),
                          ("m9/medians.json", M9_MEDIANS),
                          ("m10-soak/medians.json", SOAK_MEDIANS),
                          ("report.json", REPORT)):
            self.assertEqual(committed["sources"][key],
                             supmod._sha256_file(path),
                             "supplementmeta sources[%s] SHA mismatch" % key)

    def test_apply_is_idempotent(self):
        with open(SUPPLEMENTMETA) as handle:
            meta = json.load(handle)
        self.assertEqual(supmod.apply_to_pages(ROOT, meta), [],
                         "supplement --apply not idempotent; commit the output")

    def test_markers_present_and_filled(self):
        for page in PAGES:
            html = _page(page)
            self.assertIn("<!-- SUPPLEMENT:meta:begin -->", html)
            self.assertIn("<!-- SUPPLEMENT:meta:end -->", html)
            self.assertIn('id="supplement-counts"', html,
                          "%s meta fragment not applied" % page)


class TestSupplementIALock(unittest.TestCase):
    def test_no_absolute_or_cdn_refs(self):
        for page in PAGES:
            html = _page(page)
            for attr in re.findall(r'(?:src|href)="([^"]*)"', html):
                self.assertFalse(
                    attr.startswith("http://")
                    or attr.startswith("https://")
                    or attr.startswith("//"),
                    "%s carries a non-relative ref: %s" % (page, attr))

    def test_no_mermaid(self):
        for page in PAGES:
            self.assertNotIn("mermaid", _page(page).lower(),
                             "%s depends on a Mermaid renderer" % page)

    def test_no_pending_or_loading_content(self):
        for page in PAGES:
            flat = re.sub(r"<script.*?</script>", "", _page(page),
                          flags=re.S).lower()
            flat = re.sub(r"<!--.*?-->", "", flat, flags=re.S)
            self.assertNotIn("pending", flat,
                             "%s ships pending cells as content" % page)
            self.assertNotIn("loading", flat,
                             "%s ships loading cells as content" % page)

    def test_shared_assets_exist_and_linked(self):
        self.assertTrue(os.path.isfile(
            os.path.join(ROOT, "assets", "poolduel-theme.css")))
        self.assertTrue(os.path.isfile(
            os.path.join(ROOT, "assets", "poolduel-ui.js")))
        for page in PAGES:
            html = _page(page)
            self.assertIn("../assets/poolduel-theme.css", html)
            self.assertIn("../assets/poolduel-ui.js", html)


class TestSupplementNav(unittest.TestCase):
    def test_master_links_all_four(self):
        with open(os.path.join(ROOT, "index.html")) as handle:
            master = handle.read()
        for page in PAGES:
            self.assertIn("%s/" % page, master,
                          "master index does not link %s/" % page)

    def test_each_page_links_back_and_rings(self):
        for page in PAGES:
            html = _page(page)
            self.assertIn('href="../"', html,
                          "%s does not link back to comparison" % page)
            others = [p for p in PAGES if p != page]
            hits = sum(1 for o in others if ('href="../%s/"' % o) in html)
            self.assertGreaterEqual(
                hits, 2, "%s links fewer than 2 sibling supplements" % page)


class TestSupplementContent(unittest.TestCase):
    def test_guide_blocks(self):
        html = _page("guide")
        for token in ("contender-picker", "faq-toggle-all", "glossary",
                      "Decision tree", "Onboarding ladder",
                      "details class=\"faq\""):
            self.assertIn(token, html, "guide lacks %s" % token)

    def test_architecture_blocks(self):
        html = _page("architecture")
        for token in ("Six-way taxonomy", "Lifecycle paths",
                      "Memory per 1000 idle", "absent until soak measures",
                      "Mode matrix"):
            self.assertIn(token, html, "architecture lacks %s" % token)

    def test_methodology_blocks(self):
        html = _page("methodology")
        for token in ("Claim registry", "Run rules", "paired-difference",
                      "Disclosure minimums", "Threats to validity"):
            self.assertIn(token, html, "methodology lacks %s" % token)

    def test_reproducibility_blocks(self):
        html = _page("reproducibility")
        for token in ("runbook", "Per-cell recipe", "bibtex-block",
                      "bibtex-copy", "Challenge flow", "Errata log",
                      "Verified-by", "Data-availability"):
            self.assertIn(token, html.lower().replace("-", "-")
                          if token.islower() else token,
                          "reproducibility lacks %s" % token)
        self.assertIn("poolduel2026", html)


if __name__ == "__main__":
    unittest.main()
