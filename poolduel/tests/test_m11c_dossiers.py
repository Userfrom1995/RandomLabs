"""Poolduel M11c dossier tests (redesign section 10, dossiers slice).

The six per-pooler dossiers are static-first: every number in the
pin line, config table, flatness verdict, ranked verdicts, N/A
table, and resource evidence is pre-rendered from committed bundles
by ``harness/dossiers.py`` (``repro.sh --dossiers``), never
hand-typed, never fetched into empty ``pending`` cells. These tests
fail when a page disagrees with ``results/dossiermeta.json`` or
that file disagrees with the bundles.

Stdlib only (unittest + re + json).
"""

import json
import os
import re
import unittest

from poolduel.harness import dossiers as dossmod

ROOT = os.path.join(os.path.dirname(__file__), "..")
DOSSIERMETA = os.path.join(ROOT, "results", "dossiermeta.json")
M1_MEDIANS = os.path.join(ROOT, "results", "m1", "medians.json")
M2_MEDIANS = os.path.join(ROOT, "results", "m2", "medians.json")
M9_MEDIANS = os.path.join(ROOT, "results", "m9", "medians.json")
SOAK_MEDIANS = os.path.join(ROOT, "results", "m10-soak", "medians.json")
REPORT = os.path.join(ROOT, "results", "report.json")


def _load(path):
    with open(path) as f:
        return json.load(f)


def _entry(cell_id, pooler, status, tps, workload="select-only",
           clients=100, pool=10, protocol="simple", scale=10):
    entry = {"cell_id": cell_id, "pooler": pooler, "status": status,
             "workload": workload, "clients": clients, "pool_size": pool,
             "protocol": protocol, "scale": scale,
             "tps": ({"median": tps[0], "min": tps[1], "max": tps[2], "n": 3}
                     if tps is not None else
                     {"median": None, "min": None, "max": None, "n": 0}),
             "p99_ms": {"median": 5.0, "min": 4.0, "max": 6.0, "n": 3}}
    return entry


def _fixture_bundle():
    return {
        "pooler_versions": {"pgbouncer": "1.25.2", "supavisor": "v2.9.13"},
        "pg_version": "PG 17",
        "best": {
            "M1-1": {
                "ranked": [{"pooler": "pgbouncer", "verdict": "best",
                            "tps": {"median": 1000.0, "min": 900.0,
                                    "max": 1100.0, "n": 3},
                            "p99_ms": {"median": 5.0, "min": 4.0,
                                       "max": 6.0, "n": 3}}],
                "na": [],
            },
        },
        "flatness": {
            "pgbouncer": {"configs_measured": 1, "spread": 0.0,
                          "verdict": "single-point",
                          "peak": {"cell_id": "M1-1", "tps_median": 1000.0,
                                   "workload": "select-only"},
                          "trough": {"cell_id": "M1-1", "tps_median": 1000.0,
                                     "workload": "select-only"}},
        },
    }


class TestDedupe(unittest.TestCase):
    def test_powered_repeat_wins_over_pilot(self):
        thin = _entry("M1-1", "pgbouncer", "measured", (900.0, 800.0, 950.0))
        thin["tps"]["n"] = 3
        fat = _entry("M1-1", "pgbouncer", "measured",
                     (950.0, 900.0, 1000.0))
        fat["tps"]["n"] = 10
        out = dossmod.dedupe_entries([thin], [], [fat])
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["tps"]["n"], 10)

    def test_same_cell_never_listed_twice(self):
        a = _entry("M2-S1", "pgbouncer", "measured", (1.0, 1.0, 1.0))
        b = _entry("M2-S1", "pgbouncer", "measured", (2.0, 2.0, 2.0))
        out = dossmod.dedupe_entries([], [a], [b])
        self.assertEqual(len(out), 1)

    def test_distinct_cells_survive(self):
        a = _entry("M1-1", "pgbouncer", "measured", (1.0, 1.0, 1.0))
        b = _entry("M1-2", "pgbouncer", "timeout/inconclusive", None)
        out = dossmod.dedupe_entries([a, b], [], [])
        self.assertEqual(len(out), 2)


class TestParseSettings(unittest.TestCase):
    def test_plain_and_na_rows_both_parse(self):
        page = (
            '<tr data-cell="M1-1" data-pooler="x"><td>M1-1</td>'
            "<td>select-only, 100c/10p, simple</td>"
            "<td><code>pool_mode=transaction</code></td>"
            '<td><a href="../docs/configs/x.md">x.md</a></td>'
            '<td class="live-tps">loading...</td>'
            '<td class="live-status">loading...</td></tr>'
            '<tr data-cell="M2-T1" data-pooler="x"><td>M2-T1</td>'
            "<td>select-only, 100c/10p, simple</td>"
            '<td class="na">N/A (unsupported): no statement mode</td>'
            '<td><a href="../docs/configs/x.md">x.md</a></td>'
            '<td class="live-tps">loading...</td>'
            '<td class="live-status">loading...</td></tr>')
        parsed = dossmod.parse_settings(page)
        self.assertEqual(set(parsed), {"M1-1", "M2-T1"})
        self.assertIn("pool_mode=transaction", parsed["M1-1"][1])
        self.assertIn("no statement mode", parsed["M2-T1"][1])

    def test_load_never_carries_tags(self):
        page = (
            '<tr data-cell="M2-T1" data-pooler="x"><td>M2-T1</td>'
            "<td>select-only, 100c/10p, simple</td>"
            '<td class="na">N/A (unsupported)</td>'
            '<td><a href="../docs/configs/x.md">x.md</a></td>'
            '<td class="live-tps">loading...</td>'
            '<td class="live-status">loading...</td></tr>')
        load, _settings, _docs = dossmod.parse_settings(page)["M2-T1"]
        self.assertNotIn("<", load)

    def test_rerender_is_stable(self):
        m1 = [_entry("M1-1", "pgbouncer", "measured", (1000.0, 900.0,
                                                      1100.0))]
        dossier = dossmod.build_dossier("pgbouncer", m1, [], [], {},
                                       {}, {})
        first = dossmod.render_all(dossier)["config"]
        reparsed = {}
        for cell in ("M1-1",):
            self.assertIn('data-cell="%s"' % cell, first)
        self.assertIn("1,000 [900-1,100]", first)


class TestDossierBuild(unittest.TestCase):
    def test_supavisor_na_only_no_numbers_claimed(self):
        m9 = [_entry("M9-U-T1", "supavisor", "N/A (unsupported)", None)]
        dossier = dossmod.build_dossier("supavisor", [], [], m9,
                                       _fixture_bundle(), {}, {})
        self.assertEqual(dossier["counts"]["M9"]["na"], 1)
        self.assertEqual(dossier["counts"]["M9"]["measured"], 0)
        html = dossmod.render_all(dossier)["config"]
        self.assertIn("N/A (unsupported)", html)
        self.assertNotIn("loading", html)

    def test_peak_cell_tagged(self):
        m1 = [_entry("M1-1", "pgbouncer", "measured", (1000.0, 900.0,
                                                      1100.0))]
        dossier = dossmod.build_dossier("pgbouncer", m1, [], [],
                                       _fixture_bundle(), {}, {})
        html = dossmod.render_all(dossier)["config"]
        self.assertIn("PEAK", html)

    def test_m2_note_shape_matches_tester_contract(self):
        m1 = [_entry("M1-1", "pgbouncer", "measured", (1000.0, 900.0,
                                                      1100.0))]
        m2 = [_entry("M2-S1", "pgbouncer", "measured", (500.0, 400.0,
                                                       600.0))]
        dossier = dossmod.build_dossier("pgbouncer", m1, m2, [],
                                       _fixture_bundle(), {}, {})
        html = dossmod.render_all(dossier)["config"]
        match = re.search(r"plus (\d+) M2 rows?\s*\((\d+) measured \+ "
                          r"(\d+) timeout/inconclusive\) plus (\d+) N/A",
                          html)
        self.assertIsNotNone(match)
        self.assertEqual(
            (int(match.group(1)), int(match.group(2)),
             int(match.group(3)), int(match.group(4))), (1, 1, 0, 0))

    def test_resources_absent_note_when_no_raw(self):
        dossier = dossmod.build_dossier("supavisor", [], [], [],
                                       _fixture_bundle(), {}, {})
        html = dossmod.render_all(dossier)["resources"]
        self.assertIn("no measured raw", html)


class TestDossierDrift(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.meta = _load(DOSSIERMETA)
        cls.m1 = _load(M1_MEDIANS)
        cls.m2 = _load(M2_MEDIANS)
        cls.m9 = _load(M9_MEDIANS)
        cls.soak = _load(SOAK_MEDIANS)
        cls.bundle = _load(REPORT)

    def test_all_six_dossiers_present(self):
        self.assertEqual(sorted(self.meta["dossiers"]),
                         ["odyssey", "pgagroal", "pgbouncer", "pgcat",
                          "pgpool", "supavisor"])

    def test_rows_match_deduped_bundles(self):
        for pooler, dossier in self.meta["dossiers"].items():
            fresh = dossmod.build_dossier(pooler, self.m1, self.m2,
                                         self.m9, self.bundle, {}, {},
                                         soak=self.soak)
            self.assertEqual(
                [(r["cell_id"], r["status"], r["tps_band"]) for r in
                 dossier["rows"]],
                [(r["cell_id"], r["status"], r["tps_band"]) for r in
                 fresh["rows"]],
                "dossiermeta rows drifted for %s" % pooler)

    def test_leg_counts_match_raw_bundles(self):
        for pooler, dossier in self.meta["dossiers"].items():
            fresh_legs = dossmod.leg_counts(
                {"M1": self.m1, "M2": self.m2, "M9": self.m9,
                 "soak": self.soak}, pooler)
            self.assertEqual(dossier["legs"], fresh_legs,
                             "leg counts drifted for %s" % pooler)

    def test_sources_sha_match(self):
        for key in ("m1/medians.json", "m2/medians.json",
                    "m9/medians.json", "m10-soak/medians.json",
                    "report.json"):
            path = os.path.join(ROOT, "results", key)
            with open(path, "rb") as handle:
                import hashlib
                digest = hashlib.sha256(handle.read()).hexdigest()
            self.assertEqual(self.meta["sources"][key], digest, key)

    def test_pages_carry_no_loading_cells(self):
        for pooler in dossmod.DOSSIERS:
            page = os.path.join(ROOT, pooler, "index.html")
            with open(page) as handle:
                text = handle.read()
            self.assertNotIn("loading", text, pooler)
            for name in dossmod.MARKERS:
                self.assertIn("<!-- DOSSIER:%s:begin -->" % name, text,
                              "%s lacks marker %s" % (pooler, name))

    def test_template_sameness_across_six(self):
        sections = None
        for pooler in dossmod.DOSSIERS:
            page = os.path.join(ROOT, pooler, "index.html")
            with open(page) as handle:
                text = handle.read()
            found = re.findall(r'<div class="section" id="([^"]+)">', text)
            if sections is None:
                sections = found
            self.assertEqual(found, sections, pooler)
        self.assertEqual(len(sections), 7)

    def test_page_tables_match_meta_rows(self):
        # Multiset comparison: soak tier-cells share one cell id
        # across the 1800 s and 3600 s tiers (M13a), so duplicate
        # data-cell values are expected wherever both tiers render.
        for pooler, dossier in self.meta["dossiers"].items():
            page = os.path.join(ROOT, pooler, "index.html")
            with open(page) as handle:
                text = handle.read()
            cells = re.findall(r'data-cell="([^"]+)"', text)
            self.assertEqual(
                sorted(cells),
                sorted(r["cell_id"] for r in dossier["rows"]), pooler)


if __name__ == "__main__":
    unittest.main()
