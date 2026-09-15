"""Poolduel M11b static-site tests (plan section 10, step 1).

The master report is static-first: every number in the executive cards,
flagship baseline, M2 blocks, M9 leg, and iso/flatness sections is
pre-rendered from committed bundles by ``harness/site.py``
(``repro.sh --site``), never hand-typed, never fetched into empty
``pending`` cells. These tests fail when the page disagrees with
``results/sitemeta.json`` or that file disagrees with the bundles.

Stdlib only (unittest + re + json).
"""

import json
import os
import re
import unittest

from poolduel.harness import site as sitemod

ROOT = os.path.join(os.path.dirname(__file__), "..")
INDEX = os.path.join(ROOT, "index.html")
SITEMETA = os.path.join(ROOT, "results", "sitemeta.json")
M1_MEDIANS = os.path.join(ROOT, "results", "m1", "medians.json")
M2_MEDIANS = os.path.join(ROOT, "results", "m2", "medians.json")
M9_MEDIANS = os.path.join(ROOT, "results", "m9", "medians.json")
SOAK_MEDIANS = os.path.join(ROOT, "results", "m10-soak", "medians.json")
REPORT = os.path.join(ROOT, "results", "report.json")


def _load(path):
    with open(path) as f:
        return json.load(f)


def _entry(cell_id, pooler, status, tps, p99=None, n=3):
    entry = {"cell_id": cell_id, "pooler": pooler, "status": status,
             "tps": ({"median": tps[0], "min": tps[1], "max": tps[2], "n": n}
                     if tps is not None else None)}
    if p99 is not None:
        entry["p99_ms"] = {"median": p99, "min": p99, "max": p99, "n": n}
    return entry


def _fixture_bundle():
    return {
        "best": {
            "M2-S1": {
                "ranked": [{
                    "pooler": "pgbouncer",
                    "verdict": "best",
                    "tps": {"median": 1000.4, "min": 900.2,
                            "max": 1100.9, "n": 3},
                    "p99_ms": {"median": 5.05, "min": 4.9,
                               "max": 5.2, "n": 3},
                }],
                "na": [{"pooler": "pgpool", "status": "N/A (unsupported)"}],
            },
            "M2-T1": {"ranked": [], "na": []},
        },
        "statistics": {
            "family_size": 2,
            "headlines": 1,
            "claims": [
                {"claim": 1, "effect": 10.0, "ci": [1.0, 19.0],
                 "verdict": "A faster", "killed_by": None},
                {"claim": 2, "effect": None, "ci": [None, None],
                 "verdict": "inconclusive", "killed_by": "mixed_status"},
                {"claim": 3, "effect": None, "ci": None,
                 "verdict": "inconclusive", "killed_by": "missing_data"},
                {"claim": 4, "effect": None, "ci": [None, None],
                 "verdict": "inconclusive", "killed_by": "mixed_status"},
                {"claim": 5, "effect": 5.0, "ci": [2.0, 8.0],
                 "verdict": "B faster", "killed_by": None},
            ],
        },
        "iso_regions": [
            {"workload": "select-only", "clients": 100, "pool_size": 10,
             "duration_s": 120, "churn": False, "matched": True,
             "matched_cells": ["M1-1", "M2-S1"]},
            {"workload": "tpcb-like", "clients": 50, "pool_size": 10,
             "duration_s": 120, "churn": False, "matched": False,
             "matched_cells": ["M1-2"]},
        ],
        "flatness": {
            "direct": {"configs_measured": 7, "spread": 0.5,
                       "verdict": "peaky",
                       "peak": {"cell_id": "M1-1", "tps_median": 2000.0},
                       "trough": {"cell_id": "M1-6", "tps_median": 1000.0}},
        },
    }


class TestFormatHelpers(unittest.TestCase):
    def test_thousands_separated_integers(self):
        self.assertEqual(sitemod.fmt_int(24038.53), "24,039")
        self.assertEqual(sitemod.fmt_int(None), "-")

    def test_band_uses_formatted_ints(self):
        band = sitemod.fmt_band({"median": 24038.53, "min": 23305.4,
                                 "max": 24716.2, "n": 5})
        self.assertEqual(band, "24,039 [23,305-24,716]")

    def test_band_none_when_unmeasured(self):
        self.assertIsNone(sitemod.fmt_band(None))
        self.assertIsNone(sitemod.fmt_band({"median": None}))

    def test_ms_one_decimal(self):
        self.assertEqual(
            sitemod.fmt_ms({"median": 19.138}), "19.1 ms")
        self.assertEqual(sitemod.fmt_ms(None), "-")


class TestPlainTitles(unittest.TestCase):
    def test_title_carries_geometry_not_jargon(self):
        title = sitemod.plain_title({"workload": "select-only",
                                     "clients": 100, "pool_size": 10,
                                     "protocol": "simple", "churn": False,
                                     "flagship": True})
        self.assertIn("100 clients / 10 pooled", title)
        self.assertNotIn("M1-1", title)

    def test_title_names_churn_and_prepares(self):
        title = sitemod.plain_title({"workload": "tpcb-like", "clients": 50,
                                     "pool_size": 10, "protocol": "prepared",
                                     "churn": True, "flagship": False})
        self.assertIn("churn", title)
        self.assertIn("prepares", title)


class TestExecutiveCards(unittest.TestCase):
    def test_five_registered_claims_with_badges(self):
        cards, headlines, family = sitemod.build_executive_cards(
            _fixture_bundle())
        self.assertEqual([c["claim"] for c in cards], [1, 2, 3, 4, 5])
        by_id = {c["claim"]: c for c in cards}
        self.assertEqual(by_id[1]["badge"], "verified")
        self.assertEqual(by_id[5]["badge"], "verified")
        for cid in (2, 3, 4):
            self.assertEqual(by_id[cid]["badge"], "inconclusive",
                             "claim %d must never ship as a win" % cid)
        self.assertIn("mixed_status", by_id[2]["detail"])
        self.assertEqual(headlines, 1)
        self.assertEqual(family, 2)

    def test_card_titles_come_from_registry(self):
        from poolduel.harness import statistics as stats_mod
        cards, _, _ = sitemod.build_executive_cards(_fixture_bundle())
        titles = {s["claim"]: s["title"] for s in stats_mod.CLAIM_CELLS}
        for card in cards:
            self.assertEqual(card["title"], titles[card["claim"]])


class TestGeneratorsOnFixtures(unittest.TestCase):
    def test_m2_blocks_sort_numerically_and_mark_empty(self):
        blocks = sitemod.build_m2_blocks(_fixture_bundle())
        prefixes = [b["prefix"] for b in blocks]
        self.assertEqual(prefixes, ["M2-S", "M2-T", "M2-I", "M2-W", "M2-P"])
        by_prefix = {b["prefix"]: b for b in blocks}
        row = by_prefix["M2-S"]["rows"][0]
        self.assertEqual(row["head"], "pgbouncer")
        self.assertEqual(row["tps_band"], "1,000 [900-1,101]")
        self.assertEqual(row["na_arms"], ["pgpool"])
        empty = by_prefix["M2-T"]["rows"][0]
        self.assertIsNone(empty["head"])
        self.assertEqual(empty["verdict"], "no measured arms")

    def test_iso_keeps_matched_only(self):
        regions, flat = sitemod.build_iso_flat(_fixture_bundle())
        self.assertEqual(len(regions), 1)
        self.assertIn("M1-1", regions[0]["cells"])
        self.assertEqual(len(flat), 1)
        self.assertIn("M1-1", flat[0]["peak"])
        self.assertIn("M1-6", flat[0]["trough"])

    def test_m9_leg_counts(self):
        entries = [_entry("M9-R1", "direct", "measured", (100.0, 90.0, 110.0)),
                   _entry("M9-R1", "pgpool", "timeout/inconclusive", None),
                   _entry("M9-S1", "supa", "N/A (unsupported)", None)]
        leg = sitemod.build_m9_leg(entries, _fixture_bundle())
        self.assertEqual((leg["total"], leg["measured"],
                          leg["timeout"], leg["na"]), (3, 1, 1, 1))


class TestCommittedSitemetaDrift(unittest.TestCase):
    def test_sitemeta_recomputes_from_bundles(self):
        committed = _load(SITEMETA)
        fresh = sitemod.build_sitemeta(_load(M1_MEDIANS), _load(M2_MEDIANS),
                                       _load(M9_MEDIANS), _load(REPORT),
                                       soak_entries=_load(SOAK_MEDIANS))
        for key in ("executive_cards", "flagship", "m2_blocks", "m9_leg",
                    "soak_leg", "iso_regions", "flatness", "counts"):
            self.assertEqual(committed[key], fresh[key],
                             "sitemeta.json[%s] drifted; "
                             "re-run repro.sh --site" % key)

    def test_source_shas_match(self):
        committed = _load(SITEMETA)
        for key, rel in (("m1/medians.json", "m1/medians.json"),
                         ("m2/medians.json", "m2/medians.json"),
                         ("m9/medians.json", "m9/medians.json"),
                         ("m10-soak/medians.json",
                          "m10-soak/medians.json"),
                         ("report.json", "report.json")):
            self.assertEqual(
                committed["sources"][key],
                sitemod._sha256_file(os.path.join(ROOT, "results", rel)))

    def test_counts_shape(self):
        meta = _load(SITEMETA)
        self.assertEqual(meta["counts"]["m1_total"], 42)
        self.assertEqual(meta["counts"]["m2_total"], 111)
        self.assertEqual(meta["counts"]["m2_na"], 7)
        self.assertEqual(meta["counts"]["soak_total"], 34)
        self.assertEqual(len(meta["executive_cards"]), 5)
        self.assertEqual(len(meta["flagship"]), 7)
        self.assertEqual(
            sum(len(b["rows"]) for b in meta["m2_blocks"]), 52)
        self.assertEqual(len(meta["soak_leg"]["rows"]), 6)


class TestIndexPreRender(unittest.TestCase):
    def _index(self):
        with open(INDEX) as handle:
            return handle.read()

    def test_all_site_markers_present(self):
        html = self._index()
        for name in sitemod.SECTIONS:
            self.assertIn("<!-- SITE:%s:begin -->" % name, html)
            self.assertIn("<!-- SITE:%s:end -->" % name, html)

    def test_markers_match_generator_output(self):
        html = self._index()
        rendered = sitemod.render_all(_load(SITEMETA))
        for name, fragment in rendered.items():
            pattern = re.compile(
                r"<!-- SITE:%s:begin -->(.*?)<!-- SITE:%s:end -->"
                % (name, name), re.DOTALL)
            match = pattern.search(html)
            self.assertIsNotNone(match, "marker %s lost" % name)
            self.assertEqual(match.group(1).strip(), fragment.strip(),
                             "index.html section %s drifted; "
                             "re-run site --apply" % name)

    def test_no_pending_as_visible_content(self):
        html = self._index()
        text = re.sub(r"<script.*?</script>", "", html, flags=re.DOTALL)
        text = re.sub(r"<style.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", "", text)
        self.assertNotIn("pending", text.lower(),
                         "pre-rendered page still ships pending cells")
        self.assertNotIn("Loading live data", text)

    def test_badges_and_toggle_present(self):
        html = self._index()
        self.assertEqual(html.count("Best in class"), 7)
        self.assertIn("verified", html)
        self.assertIn("inconclusive", html)
        self.assertIn('data-view="tps"', html)
        self.assertIn('data-view="lat"', html)
        self.assertIn("All telemetry", html)
        self.assertIn('data-col="tps"', html)
        self.assertIn("min-height: 560px", html)

    def test_no_stale_pending_headings(self):
        html = self._index()
        for tag in re.findall(r"<h[23][^>]*>(.*?)</h[23]>", html, re.S):
            text = re.sub(r"<[^>]+>", "", tag).strip().lower()
            self.assertNotIn("pending", text)


if __name__ == "__main__":
    unittest.main()
