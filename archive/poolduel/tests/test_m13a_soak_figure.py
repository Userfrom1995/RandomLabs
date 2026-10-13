"""Poolduel M13a soak-figure tests (Refs #302).

The soak stability figure is the last open mechanism panel: tps +
p99 tails per arm per tier with min-max bands, beside harness
   RSS/FD drift panels, generated from the committed soak bundles by
   committed code. The full 3x2x6 spec has landed in git (36 medians,
   162 raw files, zero absent triples): committed figures carry no
   absent markers, so present tiers render measured values and
   timeout/inconclusive findings keep their own distinct marks.
   Synthetic fixtures below still prove the absent path (spec minus
   present renders as off-baseline markers, never zeros and never
   interpolated) for any future gap. Nullable resources mark
   ``n/a (not recorded)``.
"""

import copy
import json
import os
import unittest

from poolduel.harness import charts as chartsmod
from poolduel.harness.soak import (SOAK_ABSENT_LABEL, SOAK_ARMS,
                                   SOAK_CELL_IDS, SOAK_DURATIONS,
                                   soak_absent, soak_cell,
                                   soak_spec_triples)

ROOT = os.path.join(os.path.dirname(__file__), "..")
SOAK_MEDIANS = os.path.join(ROOT, "results", "m10-soak", "medians.json")
SOAK_RAW_DIR = os.path.join(ROOT, "results", "m10-soak", "raw")
COMPARISON = os.path.join(ROOT, "results", "charts", "comparison.json")


def _load(path):
    with open(path) as handle:
        return json.load(handle)


def _fixture_median(cell_id, duration, pooler, median, status="measured",
                    lo=None, hi=None, p99=None):
    entry = {"cell_id": cell_id, "pooler": pooler,
             "duration_s": duration, "status": status,
             "tps": {"median": median,
                     "min": lo if lo is not None else median,
                     "max": hi if hi is not None else median,
                     "n": 3, "cv": 0.01}}
    entry["p99_ms"] = ({"median": p99, "min": p99, "max": p99, "n": 3,
                        "cv": None} if p99 is not None
                       else {"median": None, "min": None, "max": None,
                             "n": 0, "cv": None})
    return entry


class TestSoakAbsentDerivation(unittest.TestCase):
    def test_spec_covers_36_triples_in_chunk_order(self):
        triples = soak_spec_triples()
        self.assertEqual(len(triples), 36)
        self.assertEqual(triples[0], ("M10-S1", "direct", 1800))
        self.assertEqual(triples[-1], ("M10-S3", "pgcat", 3600))
        self.assertEqual({t[2] for t in triples}, {1800, 3600})
        self.assertEqual({t[1] for t in triples}, set(SOAK_ARMS))
        self.assertEqual({t[0] for t in triples}, set(SOAK_CELL_IDS))

    def test_absent_is_spec_minus_present(self):
        soak = _load(SOAK_MEDIANS)
        absent = soak_absent(soak)
        present = {(e["cell_id"], e["pooler"], e["duration_s"])
                   for e in soak}
        self.assertEqual(len(absent), 36 - len(present))
        self.assertFalse(set(absent) & present)
        # The s8 re-dispatch has landed on 36-group data: the full
        # 3x2x6 spec is present (29 measured + 7
        # timeout/inconclusive), so committed absent is empty.
        self.assertEqual(len(soak), 36)
        self.assertEqual(absent, [])
        # Present tiers are never marked absent.
        self.assertNotIn(("M10-S1", "direct", 1800), absent)
        # Synthetic-fixture proof: absent still equals
        # spec-minus-present when something is missing.
        fixture = [_fixture_median("M10-S1", 1800, "direct",
                                   23247.4)]
        synth_absent = soak_absent(fixture)
        spec = soak_spec_triples()
        self.assertEqual(len(synth_absent),
                         len(spec) - 1)
        self.assertNotIn(("M10-S1", "direct", 1800),
                         synth_absent)
        self.assertIn(("M10-S3", "pgcat", 3600), synth_absent)

    def test_absent_shrinks_when_tiers_land(self):
        soak = _load(SOAK_MEDIANS)
        # Committed landing is complete: absent is already empty.
        self.assertEqual(soak_absent(soak), [])
        # Shrink-logic proof on a synthetic fixture missing the two
        # landed triples (M10-S3/3600 odyssey + pgcat): each landing
        # shrinks absent by one, and reaching the full spec yields
        # the empty set.
        partial = [
            _fixture_median(cid, dur, arm, 5500.0)
            for (cid, arm, dur) in soak_spec_triples()
            if (cid, arm, dur) not in {("M10-S3", "odyssey", 3600),
                                       ("M10-S3", "pgcat", 3600)}
        ]
        before = soak_absent(partial)
        self.assertEqual(len(before), 2)
        grown = partial + [_fixture_median("M10-S3", 3600,
                                           "odyssey", 5500.0)]
        after = soak_absent(grown)
        self.assertEqual(len(after), len(before) - 1)
        self.assertNotIn(("M10-S3", "odyssey", 3600), after)
        self.assertIn(("M10-S3", "pgcat", 3600), after)
        landed = grown + [_fixture_median("M10-S3", 3600,
                                          "pgcat", 5400.0)]
        self.assertEqual(soak_absent(landed), [])


class TestSoakTpsFigure(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.soak = _load(SOAK_MEDIANS)
        cls.absent = soak_absent(cls.soak)

    def test_tier_axis_in_numeric_order(self):
        opt = chartsmod.soak_tps_chart("M10-S1", self.soak,
                                       self.absent)
        labels = opt["xAxis"]["data"]
        self.assertEqual(labels, ["30-min tier (1800 s)",
                                  "60-min tier (3600 s)"])
        self.assertEqual(SOAK_DURATIONS, (1800, 3600))

    def test_bar_values_trace_to_medians_no_hand_values(self):
        fixture = [
            _fixture_median("M10-S1", 1800, "direct", 23247.4,
                            lo=23199.0, hi=23752.5, p99=4.3),
            _fixture_median("M10-S1", 3600, "direct", 22100.0,
                            lo=22000.0, hi=22300.0, p99=4.5),
        ]
        absent = [t for t in soak_absent(fixture)
                  if not (t[0] == "M10-S1" and t[1] == "direct")]
        opt = chartsmod.soak_tps_chart("M10-S1", fixture, absent)
        by_name = {s["name"]: s for s in opt["series"]}
        self.assertEqual(by_name["direct"]["data"],
                         [23247.4, 22100.0])
        self.assertEqual(by_name["direct min"]["data"],
                         [23199.0, 22000.0])
        self.assertEqual(by_name["direct max"]["data"],
                         [23752.5, 22300.0])
        self.assertEqual(by_name["direct p99"]["data"], [4.3, 4.5])

    def test_absent_markers_for_every_missing_triple(self):
        # Committed 36-group data: every cell is fully landed, so no
        # tps figure carries an absent series (empty series are
        # dropped, never zero-filled).
        for cell_id in SOAK_CELL_IDS:
            opt = chartsmod.soak_tps_chart(cell_id, self.soak,
                                           self.absent)
            markers = [s for s in opt["series"]
                       if s.get("type") == "scatter"
                       and s.get("name") == SOAK_ABSENT_LABEL]
            cell_absent = [t for t in self.absent
                           if t[0] == cell_id]
            if not cell_absent:
                # Fully landed cells carry no absent series
                # (empty series are dropped, never zero-filled).
                self.assertEqual(markers, [], cell_id)
                continue
            self.assertEqual(len(markers), 1, cell_id)
            got = sorted(p[0] for p in markers[0]["data"])
            # One marker per affected tier (x positions dedupe
            # across arms sharing the tier).
            expect = sorted({SOAK_DURATIONS.index(t[2])
                             for t in self.absent
                             if t[0] == cell_id})
            self.assertEqual(got, expect, cell_id)
            # Off-baseline contract: y=0 values with symbolOffset,
            # never bars that could read as zero throughput.
            self.assertTrue(all(p[1] == 0 for p in
                                markers[0]["data"]))
            self.assertEqual(markers[0].get("symbolOffset"),
                             [0, -14])
        # Committed-data pin: zero absent markers across all three
        # cells on the landed 36-group bundles.
        total_absent = sum(
            1 for cell_id in SOAK_CELL_IDS
            for s in chartsmod.soak_tps_chart(
                cell_id, self.soak, self.absent)["series"]
            if s.get("type") == "scatter"
            and s.get("name") == SOAK_ABSENT_LABEL)
        self.assertEqual(total_absent, 0)
        # Synthetic-fixture proof: a missing triple still renders one
        # off-baseline absent marker per affected tier.
        fixture = [
            _fixture_median("M10-S1", 1800, "direct", 23247.4,
                            lo=23199.0, hi=23752.5, p99=4.3),
            _fixture_median("M10-S1", 3600, "direct", 22100.0,
                            lo=22000.0, hi=22300.0, p99=4.5),
        ]
        synth_absent = [t for t in soak_absent(fixture)
                        if t[0] == "M10-S1" and t[1] == "odyssey"
                        and t[2] == 3600]
        self.assertEqual(len(synth_absent), 1)
        synth_opt = chartsmod.soak_tps_chart("M10-S1", fixture,
                                             synth_absent)
        synth_markers = [s for s in synth_opt["series"]
                         if s.get("type") == "scatter"
                         and s.get("name") == SOAK_ABSENT_LABEL]
        self.assertEqual(len(synth_markers), 1)
        self.assertEqual(sorted(p[0] for p in
                                synth_markers[0]["data"]), [1])
        self.assertTrue(all(p[1] == 0 for p in
                            synth_markers[0]["data"]))
        self.assertEqual(synth_markers[0].get("symbolOffset"),
                         [0, -14])

    def test_timeout_markers_distinct_from_absent(self):
        # Committed 36-group data: M10-S3 carries timeout markers
        # (pgagroal/1800+3600 present in git as
        # timeout/inconclusive) and zero absent markers (the
        # odyssey+pgcat/3600 re-dispatch has landed).
        opt = chartsmod.soak_tps_chart("M10-S3", self.soak,
                                       self.absent)
        scatters = [s for s in opt["series"]
                    if s.get("type") == "scatter"]
        names = [s["name"] for s in scatters]
        self.assertIn("timeout/inconclusive", names)
        self.assertEqual(
            sum(1 for s in scatters
                if s.get("name") == SOAK_ABSENT_LABEL), 0)
        # Fixture-level distinctness proof: with one absent triple
        # and one timeout entry side by side, both markers render
        # with distinct symbols and colors.
        fixture = [
            _fixture_median("M10-S1", 1800, "direct", 23247.4,
                            p99=4.3),
            _fixture_median("M10-S1", 3600, "direct", None,
                            status="timeout/inconclusive"),
        ]
        synth_absent = [("M10-S1", "odyssey", 3600)]
        synth_opt = chartsmod.soak_tps_chart("M10-S1", fixture,
                                             synth_absent)
        synth_names = [s["name"] for s in synth_opt["series"]
                       if s.get("type") == "scatter"]
        self.assertIn(SOAK_ABSENT_LABEL, synth_names)
        self.assertIn("timeout/inconclusive", synth_names)
        absent_sym = next(s["symbol"] for s in synth_opt["series"]
                          if s.get("name") == SOAK_ABSENT_LABEL)
        timeout_sym = next(s["symbol"] for s in synth_opt["series"]
                           if s.get("name") ==
                           "timeout/inconclusive")
        self.assertNotEqual(absent_sym, timeout_sym)
        absent_color = next(s["itemStyle"]["color"]
                            for s in synth_opt["series"]
                            if s.get("name") == SOAK_ABSENT_LABEL)
        timeout_color = next(s["itemStyle"]["color"]
                             for s in synth_opt["series"]
                             if s.get("name") ==
                             "timeout/inconclusive")
        self.assertNotEqual(absent_color, timeout_color)

    def test_quarantined_p99_breaks_line_never_interpolates(self):
        fixture = [
            _fixture_median("M10-S1", 1800, "direct", 23247.4,
                            p99=None),
            _fixture_median("M10-S1", 3600, "direct", 22100.0,
                            p99=4.5),
        ]
        absent = [t for t in soak_absent(fixture)
                  if not (t[0] == "M10-S1" and t[1] == "direct")]
        opt = chartsmod.soak_tps_chart("M10-S1", fixture, absent)
        p99 = next(s for s in opt["series"]
                   if s["name"] == "direct p99")
        self.assertEqual(p99["data"], [None, 4.5])

    def test_axes_zero_based_with_zoom_and_export(self):
        opt = chartsmod.soak_tps_chart("M10-S1", self.soak,
                                       self.absent)
        self.assertEqual(opt["yAxis"][0]["min"], 0)
        self.assertTrue(opt["dataZoom"])
        self.assertIn("saveAsImage",
                      opt["toolbox"]["feature"])
        self.assertEqual(opt["legend"]["type"], "scroll")

    def test_shared_palette_on_every_figure(self):
        for cell_id in SOAK_CELL_IDS:
            opt = chartsmod.soak_tps_chart(cell_id, self.soak,
                                           self.absent)
            bars = {s["name"]: s["itemStyle"]["color"]
                    for s in opt["series"] if s.get("type") == "bar"}
            for arm, color in chartsmod.PALETTE.items():
                if arm in SOAK_ARMS:
                    self.assertEqual(bars[chartsmod.DISPLAY[arm]],
                                     color, (cell_id, arm))


class TestSoakDriftFigure(unittest.TestCase):
    def test_drift_medians_trace_to_raw(self):
        raw = [
            {"cell_id": "M10-S1", "duration_s": 1800,
             "pooler": "direct", "repeat": 1,
             "resources_drift": {"rss_delta_kb": 10.0,
                                 "fd_delta": 1.0}},
            {"cell_id": "M10-S1", "duration_s": 1800,
             "pooler": "direct", "repeat": 2,
             "resources_drift": {"rss_delta_kb": 30.0,
                                 "fd_delta": 3.0}},
            {"cell_id": "M10-S1", "duration_s": 1800,
             "pooler": "direct", "repeat": 3,
             "resources_drift": {"rss_delta_kb": 20.0,
                                 "fd_delta": 2.0}},
        ]
        drift = chartsmod.soak_drift_from_raw(raw)
        point = drift[("M10-S1", 1800, "direct")]
        self.assertEqual(point["rss_delta_kb"], 20.0)
        self.assertEqual(point["fd_delta"], 2.0)
        self.assertEqual(point["n"], 3)

    def test_nullable_resources_mark_na_never_zero(self):
        fixture = [_fixture_median("M10-S1", 1800, "direct",
                                   23247.4)]
        absent = [t for t in soak_absent(fixture)
                  if not (t[0] == "M10-S1" and t[1] == "direct"
                           and t[2] == 1800)]
        # No raw at all: present tier marks n/a, absent tier marks
        # absent; neither renders a zero bar.
        opt = chartsmod.soak_drift_chart("M10-S1", {}, absent)
        names = [s["name"] for s in opt["series"]
                 if s.get("type") == "scatter"]
        self.assertIn("n/a (not recorded)", names)
        self.assertIn(SOAK_ABSENT_LABEL, names)
        for series in opt["series"]:
            if series.get("type") in ("bar", "line"):
                for value in series["data"]:
                    self.assertNotEqual(value, 0,
                                        series["name"])

    def test_hostile_drift_shapes_degrade_to_na(self):
        raw = [
            {"cell_id": "M10-S1", "duration_s": 1800,
             "pooler": "direct",
             "resources_drift": {"rss_delta_kb": float("nan"),
                                 "fd_delta": "x"}},
            {"cell_id": "M10-S1", "duration_s": 1800,
             "pooler": "direct", "resources_drift": None},
            "not-a-record",
            {"cell_id": "M10-S1", "duration_s": "bogus",
             "pooler": "direct"},
        ]
        drift = chartsmod.soak_drift_from_raw(raw)
        point = drift[("M10-S1", 1800, "direct")]
        self.assertIsNone(point["rss_delta_kb"])
        self.assertIsNone(point["fd_delta"])

    def test_committed_raw_yields_flat_honest_drift(self):
        soak = _load(SOAK_MEDIANS)
        raw = []
        for name in sorted(os.listdir(SOAK_RAW_DIR)):
            if name.endswith(".json"):
                raw.append(_load(os.path.join(SOAK_RAW_DIR, name)))
        drift = chartsmod.soak_drift_from_raw(raw)
        # Every present tier-group has drift evidence (harness idle:
        # zeros are measured, distinct from null).
        present = {(e["cell_id"], e["duration_s"], e["pooler"])
                   for e in soak}
        for key in present:
            self.assertIn(key, drift, key)


class TestSoakChartsBundle(unittest.TestCase):
    def test_six_figures_two_per_cell(self):
        soak = _load(SOAK_MEDIANS)
        charts = chartsmod.build_soak_charts(soak, [])
        self.assertEqual(sorted(charts),
                         ["soak-M10-S1", "soak-M10-S1-drift",
                          "soak-M10-S2", "soak-M10-S2-drift",
                          "soak-M10-S3", "soak-M10-S3-drift"])

    def test_empty_soak_cuts_figures(self):
        self.assertEqual(chartsmod.build_soak_charts([], []), {})

    def test_committed_options_deep_equal_fresh_run(self):
        soak = _load(SOAK_MEDIANS)
        raw = []
        for name in sorted(os.listdir(SOAK_RAW_DIR)):
            if name.endswith(".json"):
                raw.append(_load(os.path.join(SOAK_RAW_DIR, name)))
        committed = _load(COMPARISON)
        fresh = chartsmod.build_soak_charts(soak, raw)
        for chart_id, opt in fresh.items():
            self.assertEqual(committed.get(chart_id), opt,
                             chart_id)

    def test_build_options_without_soak_keeps_m4_shape(self):
        import copy as _copy
        m1 = _load(os.path.join(ROOT, "results", "m1",
                                "medians.json"))
        m2 = _load(os.path.join(ROOT, "results", "m2",
                                "medians.json"))
        bundle = _load(os.path.join(ROOT, "results",
                                    "report.json"))
        pages = chartsmod.build_options(m1, m2, bundle)
        soak_ids = [c for c in pages["comparison"]
                    if str(c).startswith("soak-")]
        self.assertEqual(soak_ids, [])


class TestSoakDossierAbsentRows(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from poolduel.harness import dossiers as dossmod
        cls.dossmod = dossmod
        cls.m1 = _load(os.path.join(ROOT, "results", "m1",
                                    "medians.json"))
        cls.m2 = _load(os.path.join(ROOT, "results", "m2",
                                    "medians.json"))
        cls.m9 = _load(os.path.join(ROOT, "results", "m9",
                                    "medians.json"))
        cls.soak = _load(SOAK_MEDIANS)
        cls.bundle = _load(os.path.join(ROOT, "results",
                                        "report.json"))

    def test_absent_rows_present_with_tier_labels(self):
        dossier = self.dossmod.build_dossier(
            "odyssey", self.m1, self.m2, self.m9, self.bundle,
            {}, {}, soak=self.soak)
        missing = [r for r in dossier["rows"]
                   if r["status"] == SOAK_ABSENT_LABEL]
        # The s8 re-dispatch has landed: every odyssey tier-group is
        # present in git, so the committed dossier carries zero
        # absent rows (all tiers present).
        self.assertEqual(missing, [])
        # Synthetic-fixture proof: with M10-S3/3600 odyssey withheld,
        # that one triple renders as an absent row with
        # tier-suffixed labels, null bands, and no peak flag.
        partial = [e for e in self.soak
                   if not (e.get("cell_id") == "M10-S3"
                           and e.get("pooler") == "odyssey"
                           and e.get("duration_s") == 3600)]
        synth = self.dossmod.build_dossier(
            "odyssey", self.m1, self.m2, self.m9, self.bundle,
            {}, {}, soak=partial)
        synth_missing = [r for r in synth["rows"]
                         if r["status"] == SOAK_ABSENT_LABEL]
        self.assertEqual(
            sorted((r["cell_id"], r["duration_s"])
                   for r in synth_missing),
            [("M10-S3", 3600)])
        for row in synth_missing:
            minutes = row["duration_s"] // 60
            self.assertIn("%d-min tier" % minutes, row["load"])
            self.assertIn("%d-min tier" % minutes,
                          row["settings"])
            self.assertIsNone(row["tps_band"])
            self.assertIsNone(row["tps_median"])
            self.assertFalse(row["peak"])

    def test_supavisor_gains_no_soak_rows(self):
        dossier = self.dossmod.build_dossier(
            "supavisor", self.m1, self.m2, self.m9, self.bundle,
            {}, {}, soak=self.soak)
        soak_rows = [r for r in dossier["rows"]
                     if r["leg"] == "soak"]
        self.assertEqual(soak_rows, [])

    def test_soak_rows_sort_tiers_numerically(self):
        dossier = self.dossmod.build_dossier(
            "pgpool", self.m1, self.m2, self.m9, self.bundle,
            {}, {}, soak=self.soak)
        tiers = [(r["cell_id"], r["duration_s"]) for r in
                 dossier["rows"] if r["leg"] == "soak"]
        for cid in SOAK_CELL_IDS:
            durs = [d for (c, d) in tiers if c == cid]
            self.assertEqual(durs, sorted(durs), cid)

    def test_absent_rows_excluded_from_na_table(self):
        dossier = self.dossmod.build_dossier(
            "pgbouncer", self.m1, self.m2, self.m9, self.bundle,
            {}, {}, soak=self.soak)
        html = self.dossmod.render_na(dossier)
        self.assertNotIn(SOAK_ABSENT_LABEL, html)


class TestSoakSiteFigureSlot(unittest.TestCase):
    def test_soak_panel_carries_figure_hosts(self):
        from poolduel.harness import site as sitemod
        soak = _load(SOAK_MEDIANS)
        leg = sitemod.build_soak_leg(soak)
        html = sitemod.render_soak_html(leg)
        for cell_id in SOAK_CELL_IDS:
            self.assertIn('data-chart="soak-%s"' % cell_id, html)
            self.assertIn('data-chart="soak-%s-drift"' % cell_id,
                          html)
        self.assertNotIn("pending", html.lower())


if __name__ == "__main__":
    unittest.main()
