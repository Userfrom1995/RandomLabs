"""Tester regression suite for PR #340 (M11b static-first master report, Refs #302).

Black-box pins for the committed M11b artifacts: sitemeta.json shape
(5 executive cards, 7 flagship rows, 52 M2 rows, M9 leg, matched-only
iso, named peak/trough flatness, source SHAs in sync), index.html
pre-render coherence (SITE markers match generator output, zero
``pending`` as visible content, 7 Best-in-class badges, toggle +
560px chart hosts present), generator robustness on degenerate inputs
(None/empty/unmatched bundles render inconclusive, never a win, never
a crash), HTML-escaping of rendered dynamics, and NaN-freedom of the
committed bundles (the one loud-ValueError path in fmt_int is
unreachable from real inputs).

Reads committed bundles; never touches production logic.
"""

import json
import os
import re
import unittest

from poolduel.harness import site as sitemod

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = os.path.join(REPO, "poolduel")
INDEX = os.path.join(ROOT, "index.html")
SITEMETA = os.path.join(ROOT, "results", "sitemeta.json")


def load_results(*parts):
    with open(os.path.join(ROOT, "results", *parts), encoding="utf-8") as fh:
        return json.load(fh)


def read_index():
    with open(INDEX, encoding="utf-8") as fh:
        return fh.read()


def visible_text(html):
    text = re.sub(r"<script.*?</script>", "", html, flags=re.DOTALL)
    text = re.sub(r"<style.*?</style>", "", text, flags=re.DOTALL)
    return re.sub(r"<[^>]+>", "", text)


class TestM11bSitemetaShape(unittest.TestCase):
    def test_card_flagship_m2_counts(self):
        meta = load_results("sitemeta.json")
        self.assertEqual(len(meta["executive_cards"]), 5)
        self.assertEqual(len(meta["flagship"]), 7)
        self.assertEqual(
            sum(len(b["rows"]) for b in meta["m2_blocks"]), 52)

    def test_claim4_inconclusive_per_kill_rule(self):
        meta = load_results("sitemeta.json")
        by_id = {c["claim"]: c for c in meta["executive_cards"]}
        self.assertEqual(by_id[4]["badge"], "inconclusive")
        self.assertIn("mixed_status", by_id[4]["detail"])
        for cid in (1, 2, 3, 5):
            self.assertEqual(by_id[cid]["badge"], "verified",
                             "claim %d has a surviving win" % cid)

    def test_m9_leg_and_flatness_named_endpoints(self):
        meta = load_results("sitemeta.json")
        leg = meta["m9_leg"]
        for key in ("total", "measured", "timeout", "na",
                    "family", "headlines", "method"):
            self.assertIn(key, leg)
        self.assertGreater(leg["total"], 0)
        self.assertGreater(len(meta["flatness"]), 0)
        for entry in meta["flatness"]:
            self.assertIn("@", entry["peak"])
            self.assertIn("@", entry["trough"])

    def test_iso_matched_only(self):
        meta = load_results("sitemeta.json")
        bundle = load_results("report.json")
        matched = {tuple(sorted(r.get("matched_cells", [])))
                   for r in bundle.get("iso_regions", []) if r.get("matched")}
        for region in meta["iso_regions"]:
            self.assertIn(tuple(sorted(region["cells"])), matched)

    def test_source_shas_in_sync(self):
        meta = load_results("sitemeta.json")
        for key, rel in (("m1/medians.json", "m1/medians.json"),
                         ("m2/medians.json", "m2/medians.json"),
                         ("m9/medians.json", "m9/medians.json"),
                         ("report.json", "report.json")):
            self.assertEqual(
                meta["sources"][key],
                sitemod._sha256_file(
                    os.path.join(ROOT, "results", rel)))

    def test_bundles_nan_free(self):
        for rel in ("m1/medians.json", "m2/medians.json",
                    "m9/medians.json", "report.json"):
            with open(os.path.join(ROOT, "results", rel),
                      encoding="utf-8") as fh:
                raw = fh.read()
            self.assertNotIn("NaN", raw, rel)
            self.assertNotIn("Infinity", raw, rel)
            json.loads(raw)


class TestM11bPreRender(unittest.TestCase):
    def test_markers_match_generator_output(self):
        html = read_index()
        rendered = sitemod.render_all(load_results("sitemeta.json"))
        for name, fragment in rendered.items():
            match = re.search(
                r"<!-- SITE:%s:begin -->(.*?)<!-- SITE:%s:end -->"
                % (name, name), html, re.DOTALL)
            self.assertIsNotNone(match, "marker %s lost" % name)
            self.assertEqual(match.group(1).strip(), fragment.strip(),
                             "section %s drifted; re-run site --apply" % name)

    def test_zero_pending_as_visible_content(self):
        text = visible_text(read_index())
        self.assertNotIn("pending", text.lower())
        self.assertNotIn("Loading live data", text)

    def test_badges_toggle_chart_hosts(self):
        html = read_index()
        self.assertEqual(html.count("Best in class"), 7)
        self.assertIn("verified", html)
        self.assertIn("inconclusive", html)
        self.assertIn('data-view="tps"', html)
        self.assertIn('data-view="lat"', html)
        self.assertIn("All telemetry", html)
        self.assertIn("min-height: 560px", html)


class TestM11bHostile(unittest.TestCase):
    def test_degenerate_bundles_render_inconclusive_never_win(self):
        for bundle in (None, {}, {"statistics": {}},
                       {"statistics": {"claims": []}}):
            cards, _, _ = sitemod.build_executive_cards(bundle)
            self.assertEqual(len(cards), 5)
            for card in cards:
                self.assertEqual(card["badge"], "inconclusive")

    def test_null_missing_helpers_never_crash(self):
        self.assertIsNone(sitemod.fmt_band(None))
        self.assertIsNone(sitemod.fmt_band({"median": None}))
        self.assertIsNone(sitemod.fmt_band("junk"))
        self.assertEqual(sitemod.fmt_ms(None), "-")
        self.assertEqual(sitemod.fmt_ms({}), "-")
        self.assertEqual(sitemod.fmt_int(None), "-")
        self.assertEqual(sitemod.fmt_ci(None, None), "CI n/a")

    def test_unmatched_iso_renders_empty(self):
        regions, flat = sitemod.build_iso_flat(
            {"iso_regions": [{"matched": False}], "flatness": {}})
        self.assertEqual(regions, [])
        self.assertEqual(flat, [])

    def test_rendered_dynamics_are_escaped(self):
        html = sitemod.render_cards_html(
            [{"claim": 9, "title": "<script>alert(1)</script>",
              "badge": "verified", "verdict": "A faster",
              "detail": "<b>x</b>", "arms": "a vs b"}])
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)

    def test_apply_fails_loudly_without_markers(self):
        import tempfile
        with tempfile.NamedTemporaryFile(
                "w", suffix=".html", delete=False) as fh:
            fh.write("<html><body>no markers here</body></html>")
            path = fh.name
        try:
            with self.assertRaises(ValueError):
                sitemod.apply_to_index(
                    path, {"exec": "<p>x</p>"})
        finally:
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
