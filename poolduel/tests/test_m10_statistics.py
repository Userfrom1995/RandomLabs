"""M10 statistics tests: paired bootstrap CIs, Holm, outliers, kill rule.

Synthetic data only; no network, no fixtures outside this file.
"""

import json
import unittest

from poolduel.harness import statistics as st


def make_rows(cell_id, pooler, values, metric="tps", seed0=100,
              status="measured", other_metric="p99_ms",
              other_value=10.0):
    rows = []
    for i, v in enumerate(values):
        row = {
            "cell_id": cell_id,
            "pooler": pooler,
            "repeat": i + 1,
            "seed": seed0 + i,
            "status": status,
            metric: v,
        }
        if other_metric != metric:
            row[other_metric] = other_value
        rows.append(row)
    return rows


SHIFT_A = [100.0, 102.0, 98.0, 105.0, 101.0, 99.0, 103.0, 104.0]
SHIFT_B = [112.0, 114.0, 110.0, 117.0, 113.0, 111.0, 115.0, 116.0]

# Decisive full CI (excludes zero) that flips when the three extreme
# points are trimmed: trimmed median 0.29 with a CI covering zero.
FLIP_DIFFS = [-0.87, -0.34, -0.21, -0.18, 0.27, 0.31, 0.73, 1.39,
              1.83, 2.41, 79.59, 69.32, 37.08]


class TestBootstrapDeterminism(unittest.TestCase):
    def test_same_seed_byte_identical(self):
        diffs = [1.5, -0.5, 2.0, 1.0, -1.0, 0.5, 1.2, -0.3]
        first = st.bootstrap_ci(diffs)
        second = st.bootstrap_ci(diffs)
        self.assertEqual(first, second)
        self.assertEqual(json.dumps(first, sort_keys=True),
                         json.dumps(second, sort_keys=True))
        self.assertEqual(st.bootstrap_p(diffs),
                         st.bootstrap_p(diffs))

    def test_different_seed_runs_valid(self):
        # A different seed may differ; it must at least run and keep
        # the contract (lo <= hi, counts echoed).
        diffs = [1.5, -0.5, 2.0, 1.0, -1.0, 0.5, 1.2, -0.3]
        res = st.bootstrap_ci(diffs, seed=12345)
        self.assertLessEqual(res["lo"], res["hi"])
        self.assertEqual(res["n"], len(diffs))
        self.assertEqual(res["b"], st.BOOTSTRAP_B)
        self.assertEqual(res["seed"], 12345)
        p = st.bootstrap_p(diffs, seed=12345)
        self.assertGreaterEqual(p, 0.0)
        self.assertLessEqual(p, 1.0)


class TestKnownShift(unittest.TestCase):
    def test_shift_excludes_zero_correct_sign(self):
        a = make_rows("M1-1", "direct", SHIFT_A)
        b = make_rows("M1-1", "pgbouncer", SHIFT_B)
        comp = st.compare_ci(a, b, metric="tps",
                             higher_is_better=True)
        self.assertGreater(comp["ci_lo"], 0)
        self.assertEqual(comp["verdict"], "B faster")
        self.assertIsNone(comp["reason"])
        self.assertGreater(comp["effect_abs"], 0)
        # Relative effect is against the arm-A median (~101.5).
        self.assertAlmostEqual(comp["effect_rel"],
                               comp["effect_abs"] / 101.5)
        self.assertLess(comp["p"], st.ALPHA)

    def test_zero_shift_inconclusive(self):
        vals = [100.0, 102.0, 98.0, 105.0, 101.0, 99.0, 103.0,
                104.0]
        a = make_rows("M1-1", "direct", vals)
        b = make_rows("M1-1", "pgbouncer", list(vals))
        comp = st.compare_ci(a, b, metric="tps")
        self.assertEqual(comp["effect_abs"], 0.0)
        self.assertLessEqual(comp["ci_lo"], 0)
        self.assertGreaterEqual(comp["ci_hi"], 0)
        self.assertEqual(comp["verdict"], "inconclusive")
        self.assertEqual(comp["reason"], "ci_includes_zero")

    def test_lower_is_better_direction(self):
        # p99: B lower than A means B faster when higher_is_better
        # is False (None infers it from the metric name).
        a = make_rows("M1-1", "direct", SHIFT_B, metric="p99_ms")
        b = make_rows("M1-1", "pgbouncer", SHIFT_A, metric="p99_ms")
        comp = st.compare_ci(a, b, metric="p99_ms",
                             higher_is_better=None)
        self.assertFalse(comp["higher_is_better"])
        self.assertLess(comp["ci_hi"], 0)
        self.assertEqual(comp["verdict"], "B faster")


class TestHolm(unittest.TestCase):
    def test_exact_rejections(self):
        out = st.holm_adjust([0.01, 0.02, 0.03, 0.5])
        self.assertEqual([r["adj_p"] for r in out],
                         [0.04, 0.06, 0.06, 0.5])
        self.assertEqual([r["reject"] for r in out],
                         [True, False, False, False])

    def test_none_safe(self):
        out = st.holm_adjust([0.01, None, 0.5])
        self.assertEqual(out[1], {"p": None, "adj_p": None,
                                  "reject": False})
        self.assertTrue(out[0]["reject"])
        self.assertFalse(out[2]["reject"])

    def test_empty(self):
        self.assertEqual(st.holm_adjust([]), [])


class TestOutliers(unittest.TestCase):
    def test_extreme_point_flagged(self):
        vals = [1.0, 1.5, 0.5, 2.0, 1.2, 0.8, 1.1, 1.4, 50.0]
        res = st.flag_outliers(vals)
        self.assertEqual(res["rule"], st.OUTLIER_RULE)
        self.assertEqual(res["flags"][-1], "extreme")
        self.assertEqual(res["n_extreme"], 1)
        self.assertGreaterEqual(res["n_flagged"], 1)
        self.assertTrue(res["flags"][:-1].count("ok") >= 7)

    def test_clean_data_no_flags(self):
        res = st.flag_outliers([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
        self.assertEqual(res["n_flagged"], 0)
        self.assertTrue(all(f == "ok" for f in res["flags"]))

    def test_sensitivity_flip_demotion(self):
        base = [200.0] * len(FLIP_DIFFS)
        a = make_rows("M1-4", "direct", base)
        b = make_rows("M1-4", "pgcat",
                      [x + y for x, y in zip(base, FLIP_DIFFS)])
        comp = st.compare_ci(a, b, metric="tps")
        # Full CI excludes zero, but dropping the three extremes
        # flips CI-excludes-zero, so the win is demoted.
        self.assertGreater(comp["ci_lo"], 0)
        self.assertTrue(comp["sensitivity"]["verdict_flips"])
        self.assertFalse(comp["sensitivity"]["too_few"])
        self.assertEqual(comp["verdict"], "inconclusive")
        self.assertEqual(comp["reason"], "sensitivity_flip")

    def test_too_few_guard(self):
        res = st.trimmed_sensitivity(
            [1.0, 2.0, 100.0, 200.0],
            ["ok", "ok", "flag", "extreme"])
        self.assertTrue(res["too_few"])
        self.assertIsNone(res["verdict_flips"])
        self.assertIsNone(res["trimmed_median"])

    def test_flag_length_mismatch_raises(self):
        with self.assertRaises(ValueError):
            st.trimmed_sensitivity([1.0, 2.0], ["ok"])


class TestKillRule(unittest.TestCase):
    def test_quarantined_p99_never_wins(self):
        a = make_rows("M1-1", "direct", [10.0] * 8,
                      metric="p99_ms")
        b = make_rows("M1-1", "pgbouncer", [50.0] * 8,
                      metric="p99_ms")
        comp = st.compare_ci(a, b, metric="p99_ms",
                             higher_is_better=False,
                             a_quarantined=True)
        self.assertEqual(comp["quarantine_label"], "tps-only")
        self.assertEqual(comp["verdict"], "inconclusive")
        self.assertEqual(comp["reason"], "quarantined")

    def test_tps_verdict_ignores_quarantine(self):
        a = make_rows("M1-1", "direct", SHIFT_A)
        b = make_rows("M1-1", "pgbouncer", SHIFT_B)
        comp = st.compare_ci(a, b, metric="tps",
                             a_quarantined=True,
                             b_quarantined=True)
        self.assertIsNone(comp["quarantine_label"])
        self.assertEqual(comp["verdict"], "B faster")

    def test_rederive_ci_kill(self):
        # Claim 3 (pgagroal epoll vs io_uring) with identical arms:
        # CI covers zero, so it dies as inconclusive, never a win.
        vals = [2500.0, 2600.0, 2400.0, 2550.0, 2450.0, 2650.0,
                2520.0]
        raw = {
            ("M2-I1", "pgagroal"): make_rows("M2-I1", "pgagroal",
                                             vals),
            ("M2-I3", "pgagroal"): make_rows("M2-I3", "pgagroal",
                                             list(vals)),
        }
        medians = [
            {"cell_id": "M2-I1", "pooler": "pgagroal",
             "p_quarantined": False},
            {"cell_id": "M2-I3", "pooler": "pgagroal",
             "p_quarantined": False},
        ]
        out = st.rederive_claims(medians, raw)
        self.assertEqual(len(out), 5)
        third = [c for c in out if c["claim"] == 3][0]
        self.assertEqual(third["verdict"], "inconclusive")
        self.assertEqual(third["killed_by"], "ci_includes_zero")
        for c in out:
            self.assertIn("killed_by", c)
            if c["verdict"] != "inconclusive":
                self.assertIsNone(c["killed_by"])

    def test_rederive_quarantine_kill(self):
        # A p-latency claim under quarantine can never be a win even
        # with a huge shift.
        patched = [dict(c) for c in st.CLAIM_CELLS]
        patched[0] = dict(patched[0], metric="p99_ms")
        a = make_rows("M1-1", "pgbouncer", [10.0] * 7,
                      metric="p99_ms")
        b = make_rows("M2-I5", "pgbouncer", [100.0] * 7,
                      metric="p99_ms")
        raw = {("M1-1", "pgbouncer"): a,
               ("M2-I5", "pgbouncer"): b}
        medians = [
            {"cell_id": "M1-1", "pooler": "pgbouncer",
             "p_quarantined": True},
            {"cell_id": "M2-I5", "pooler": "pgbouncer",
             "p_quarantined": True},
        ]
        real = st.CLAIM_CELLS
        st.CLAIM_CELLS = patched
        try:
            out = st.rederive_claims(medians, raw)
        finally:
            st.CLAIM_CELLS = real
        first = [c for c in out if c["claim"] == 1][0]
        self.assertEqual(first["verdict"], "inconclusive")
        self.assertEqual(first["killed_by"], "quarantined")

    def test_rederive_missing_data(self):
        out = st.rederive_claims([], {})
        self.assertEqual(len(out), 5)
        for c in out:
            self.assertEqual(c["verdict"], "inconclusive")
            self.assertEqual(c["killed_by"], "missing_data")

    def test_claim_cells_cited(self):
        self.assertEqual(len(st.CLAIM_CELLS), 5)
        for entry in st.CLAIM_CELLS:
            for key in ("claim", "cell_a", "arm_a", "cell_b",
                        "arm_b", "metric", "source"):
                self.assertIn(key, entry)
            self.assertIn("claims.md", entry["source"])
            self.assertIn("m9.py", entry["source"])


class TestEdgeCases(unittest.TestCase):
    def test_empty_diffs_raise(self):
        with self.assertRaises(ValueError):
            st.bootstrap_ci([])
        with self.assertRaises(ValueError):
            st.bootstrap_p([])

    def test_unmatched_repeats_in_forensics(self):
        a = make_rows("M1-1", "direct", [1.0, 2.0, 3.0])
        b = make_rows("M1-1", "pgbouncer", [1.0, 2.0, 3.0])
        b_extra = make_rows("M1-1", "pgbouncer", [9.0], seed0=200)
        pairs, forensics = st.paired_differences(a, b + b_extra)
        self.assertEqual(len(pairs), 3)
        self.assertEqual(forensics["n_paired"], 3)
        self.assertEqual(len(forensics["unmatched_b"]), 1)
        self.assertEqual(forensics["unmatched_b"][0][1], 1)
        self.assertEqual(forensics["unmatched_a"], [])

    def test_cross_cell_pairing(self):
        a = make_rows("M2-I1", "pgagroal", SHIFT_A)
        b = make_rows("M2-I3", "pgagroal", SHIFT_B)
        pairs, forensics = st.paired_differences(a, b)
        self.assertEqual(len(pairs), len(SHIFT_A))
        self.assertTrue(forensics["cross_cell_pairing"])

    def test_excluded_null_and_status(self):
        a = make_rows("M1-1", "direct", [1.0, 2.0, 3.0])
        a[0]["tps"] = None
        b = make_rows("M1-1", "pgbouncer", [1.0, 2.0, 3.0])
        b[1]["status"] = "timeout/inconclusive"
        pairs, forensics = st.paired_differences(a, b)
        self.assertEqual(len(pairs), 1)
        self.assertEqual(forensics["excluded_a_null"], 1)
        self.assertEqual(forensics["excluded_b_status"], 1)

    def test_compare_ci_too_few(self):
        a = make_rows("M1-1", "direct", [1.0, 2.0])
        b = make_rows("M1-1", "pgbouncer", [5.0, 6.0])
        comp = st.compare_ci(a, b)
        self.assertEqual(comp["n"], 2)
        self.assertEqual(comp["verdict"], "inconclusive")
        self.assertEqual(comp["reason"], "too_few")

    def test_compare_ci_empty_mixed_status(self):
        a = make_rows("M1-1", "direct", [1.0], status="timeout")
        b = make_rows("M1-1", "pgbouncer", [1.0], status="timeout")
        comp = st.compare_ci(a, b)
        self.assertEqual(comp["verdict"], "inconclusive")
        self.assertEqual(comp["reason"], "mixed_status")
        self.assertIsNone(comp["p"])

    def test_dict_order_effect_ci_verdict_p(self):
        a = make_rows("M1-1", "direct", SHIFT_A)
        b = make_rows("M1-1", "pgbouncer", SHIFT_B)
        comp = st.compare_ci(a, b)
        keys = list(comp.keys())
        self.assertLess(keys.index("effect_abs"),
                        keys.index("ci_lo"))
        self.assertLess(keys.index("ci_hi"),
                        keys.index("verdict"))
        self.assertLess(keys.index("verdict"), keys.index("p"))
        self.assertEqual(keys[-1], "p")


class TestFamily(unittest.TestCase):
    def test_headline_needs_holm(self):
        a = make_rows("M1-1", "direct", SHIFT_A)
        b = make_rows("M1-1", "pgbouncer", SHIFT_B)
        strong = st.compare_ci(a, b)
        vals = [100.0, 102.0, 98.0, 105.0, 101.0, 99.0, 103.0,
                104.0]
        weak = st.compare_ci(make_rows("M1-1", "direct", vals),
                             make_rows("M1-1", "pgbouncer",
                                       list(vals)))
        out = st.family_verdicts([strong, weak])
        self.assertEqual(len(out), 2)
        self.assertIn("headline", out[0])
        self.assertIn("adj_p", out[0])
        # Weak comparison never headlines; strong needs Holm.
        self.assertFalse(out[1]["headline"])
        self.assertEqual(out[0]["headline"],
                         out[0]["p"] is not None
                         and out[0]["adj_p"] < st.ALPHA)

    def test_quarantined_never_headlines(self):
        row = {"verdict": "B faster", "ci_lo": 1.0, "ci_hi": 2.0,
               "p": 0.0001, "quarantine_label": "tps-only"}
        out = st.family_verdicts([row])
        self.assertFalse(out[0]["headline"])


class TestNonFiniteGuards(unittest.TestCase):
    def test_nan_inf_rows_excluded_with_forensics(self):
        a = make_rows("M1-1", "direct", [100.0, 102.0, 98.0])
        b = make_rows("M1-1", "pgbouncer",
                      [110.0, float("nan"), float("inf")])
        pairs, forensics = st.paired_differences(a, b)
        self.assertEqual(len(pairs), 1)
        self.assertEqual(forensics["excluded_b_null"], 2)

    def test_bootstrap_rejects_non_finite(self):
        with self.assertRaises(ValueError):
            st.bootstrap_ci([1.0, float("nan")], b=50)
        with self.assertRaises(ValueError):
            st.bootstrap_p([1.0, float("inf")], b=50)

    def test_holm_absorbs_invalid_p_as_none(self):
        out = st.holm_adjust([float("nan"), 2.0, -0.1, 0.0001])
        self.assertIsNone(out[0]["adj_p"])
        self.assertFalse(out[0]["reject"])
        self.assertIsNone(out[1]["adj_p"])
        self.assertIsNone(out[2]["adj_p"])
        self.assertTrue(out[3]["reject"])

    def test_too_few_beats_ci_includes_zero(self):
        a = make_rows("M1-1", "direct", [100.0, 100.0])
        b = make_rows("M1-1", "pgbouncer", [100.0, 100.0])
        comp = st.compare_ci(a, b)
        self.assertEqual(comp["verdict"], "inconclusive")
        self.assertEqual(comp["reason"], "too_few")


if __name__ == "__main__":
    unittest.main()
