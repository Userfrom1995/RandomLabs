"""Tester regression suite for PR #338 (M10 soak + statistics, Refs #302).

Hostile black-box pins for the M10 statistics engine and soak matrix:
determinism, verdict-reason precedence, quarantine kill rule, Holm
robustness, non-finite exclusion, cross-cell pairing, soak budget
arithmetic, subprocess-cap regression, drift null-degradation, report
no-clobber contract, and staged-workflow fail-fast presence.

Synthetic data only; tiny bootstrap budgets for speed. Never touches
production logic.
"""

import json
import os
import tempfile
import unittest

import yaml

from poolduel.harness import report
from poolduel.harness import resources as resources_mod
from poolduel.harness import runner
from poolduel.harness import soak
from poolduel.harness import statistics as S


def row(cell, rep, seed, tps, p99=5.0, status="measured"):
    return {"cell_id": cell, "repeat": rep, "seed": seed,
            "status": status, "tps": tps, "p99_ms": p99}


def full_rec(cell, pooler, repeat, tps, seed=42, status="measured"):
    return {
        "cell_id": cell, "workload": "tpcb", "pooler": pooler,
        "pooler_version": "test",
        "pooler_config": "# test config for %s" % pooler,
        "pg_version": "PG 17 (test)",
        "pg_config": {"shared_buffers": "512MB", "max_connections": 300,
                      "synchronous_commit": "on", "fsync": "on"},
        "scale": 10, "clients": 50, "pool_size": 10, "threads": 4,
        "protocol": "simple", "churn": False, "duration_s": 60,
        "warmup_s": 30, "repeat": repeat, "seed": seed + repeat,
        "tps": tps, "latency_avg_ms": 4.0 if tps else None,
        "latency_stddev_ms": 0.1 if tps else None,
        "p50_ms": 3.9 if tps else None, "p90_ms": 5.0 if tps else None,
        "p99_ms": 5.0, "p999_ms": 7.5,
        "failed": 0, "skipped": 0,
        "exit_code": 0 if status == "measured" else None,
        "status": status,
        "artifacts": {"stdout": None, "txnlog": None, "agglog": None},
    }


class TestSoakCapRegression(unittest.TestCase):
    def test_cap_clears_every_soak_cell_tier(self):
        for cid in soak.SOAK_CELL_IDS:
            for dur in soak.SOAK_DURATIONS:
                cell = soak.soak_cell(cid, dur)
                cap = runner.cell_cap_s(cell)
                self.assertGreater(cap, dur, (cid, dur, cap))
                self.assertGreaterEqual(
                    cap, dur + cell["warmup_s"], (cid, dur, cap))
                self.assertGreaterEqual(cap, runner.STANDARD_CAP_S)

    def test_short_cell_keeps_standard_cap(self):
        cap = runner.cell_cap_s({"flagship": False, "duration_s": 60,
                                 "warmup_s": 10})
        self.assertEqual(cap, runner.STANDARD_CAP_S)

    def test_flagship_cap_untouched(self):
        cap = runner.cell_cap_s({"flagship": True, "duration_s": 60,
                                 "warmup_s": 10})
        self.assertEqual(cap, runner.FLAGSHIP_CAP_S)


class TestSoakMatrixArithmetic(unittest.TestCase):
    def test_36_chunks_108_runs(self):
        self.assertEqual(len(soak.SOAK_CHUNKS), 36)
        self.assertEqual(len(soak.soak_full_plan()), 108)
        total = soak.soak_total_budget()
        self.assertEqual(total["chunks"], 36)
        self.assertEqual(total["arm_runs"], 108)
        self.assertAlmostEqual(total["measured_hours"], 86.4, places=6)

    def test_per_arm_parity_18(self):
        counts = soak.soak_budget_table()
        self.assertEqual(set(counts), set(soak.SOAK_ARMS))
        for arm, n in counts.items():
            self.assertEqual(n, 18, arm)

    def test_every_chunk_under_budget_cap(self):
        self.assertEqual(soak.check_soak_chunk_budgets(), {})
        for name in soak.SOAK_CHUNKS:
            mins = soak.soak_chunk_budget_minutes(name)
            self.assertLess(mins,
                            soak.SOAK_CHUNK_BUDGET_CAP_MINUTES, name)

    def test_chunk_descriptions_cover_all(self):
        self.assertEqual(set(soak.SOAK_CHUNK_DESCRIPTIONS),
                         set(soak.SOAK_CHUNKS))

    def test_soak_cell_ids_wired_into_check(self):
        self.assertEqual(soak.soak_cell_ids(), list(soak.SOAK_CELL_IDS))
        soak.validate_soak_ratios()

    def test_unknown_cell_and_duration_rejected(self):
        with self.assertRaises(KeyError):
            soak.soak_cell("M10-NOPE", 1800)
        with self.assertRaises(ValueError):
            soak.soak_cell("M10-S1", 999)
        with self.assertRaises(KeyError):
            soak.soak_chunk_plan("m10s99")


class TestStatisticsDeterminism(unittest.TestCase):
    def test_bootstrap_ci_byte_identical(self):
        diffs = [1.0, -2.0, 3.0, 0.5, 2.5, -1.0, 4.0]
        self.assertEqual(S.bootstrap_ci(diffs), S.bootstrap_ci(diffs))

    def test_bootstrap_p_deterministic(self):
        diffs = [10.0, 12.0, 9.0, 11.0, 13.0]
        self.assertEqual(S.bootstrap_p(diffs), S.bootstrap_p(diffs))

    def test_known_shift_headline_shape(self):
        a = [row("C", i, 100 + i, 100.0) for i in range(1, 7)]
        b = [row("C", i, 100 + i, 200.0) for i in range(1, 7)]
        comp = S.compare_ci(a, b, metric="tps", b=500, seed=7)
        self.assertEqual(comp["verdict"], "B faster")
        self.assertIsNone(comp["reason"])
        self.assertGreater(comp["ci_lo"], 0)
        fam = S.family_verdicts([comp])
        self.assertTrue(fam[0]["headline"])

    def test_zero_shift_inconclusive_ci_reason(self):
        vals = [-2.0, -1.0, 0.0, 1.0, 2.0, -0.5, 0.5, 1.5]
        a = [row("C", i, 200 + i, 100.0 + v) for i, v in enumerate(vals)]
        b = [row("C", i, 200 + i, 100.0 - v) for i, v in enumerate(vals)]
        comp = S.compare_ci(a, b, metric="tps", b=500, seed=7)
        self.assertEqual(comp["verdict"], "inconclusive")
        self.assertEqual(comp["reason"], "ci_includes_zero")


class TestVerdictPrecedence(unittest.TestCase):
    def test_too_few_beats_ci_includes_zero(self):
        comp = S.compare_ci([row("C", 1, 1, 100.0)],
                            [row("C", 1, 1, 500.0)],
                            metric="tps", b=200, seed=7)
        self.assertEqual((comp["verdict"], comp["reason"]),
                         ("inconclusive", "too_few"))

    def test_all_timeout_is_mixed_status(self):
        a = [row("C", 1, 1, 100.0, status="timeout/inconclusive")]
        b = [row("C", 1, 1, 120.0, status="timeout/inconclusive")]
        comp = S.compare_ci(a, b, metric="tps")
        self.assertEqual((comp["verdict"], comp["reason"]),
                         ("inconclusive", "mixed_status"))

    def test_empty_is_too_few(self):
        comp = S.compare_ci([], [], metric="tps")
        self.assertEqual((comp["verdict"], comp["reason"]),
                         ("inconclusive", "too_few"))


class TestQuarantineKill(unittest.TestCase):
    def test_decisive_p99_killed_by_quarantine(self):
        a = [row("C", i, 300 + i, 100.0, p99=10.0) for i in range(1, 7)]
        b = [row("C", i, 300 + i, 200.0, p99=20.0) for i in range(1, 7)]
        comp = S.compare_ci(a, b, metric="p99_ms", b=500, seed=7,
                            a_quarantined=True)
        self.assertEqual(comp["verdict"], "inconclusive")
        self.assertEqual(comp["reason"], "quarantined")
        self.assertEqual(comp["quarantine_label"], "tps-only")
        fam = S.family_verdicts([comp])
        self.assertFalse(fam[0]["headline"])

    def test_tps_ignores_quarantine_flag(self):
        a = [row("C", i, 400 + i, 100.0) for i in range(1, 7)]
        b = [row("C", i, 400 + i, 200.0) for i in range(1, 7)]
        comp = S.compare_ci(a, b, metric="tps", b=500, seed=7,
                            a_quarantined=True)
        self.assertEqual(comp["verdict"], "B faster")

    def test_missing_claim_data_kills(self):
        out = S.rederive_claims([], {})
        self.assertEqual(len(out), 5)
        for entry in out:
            self.assertEqual(entry["verdict"], "inconclusive")
            self.assertEqual(entry["killed_by"], "missing_data")


class TestHolmRobustness(unittest.TestCase):
    def test_invalid_p_never_rejects(self):
        adj = S.holm_adjust([float("nan"), float("inf"), -0.5, 1.5,
                             None, True, "junk"])
        for entry in adj:
            self.assertIsNone(entry["adj_p"])
            self.assertFalse(entry["reject"])

    def test_adjusted_ps_bounded_and_monotone(self):
        import random
        rng = random.Random(20260914)
        for _ in range(50):
            ps = [rng.random() for _ in range(rng.randint(1, 8))]
            adj = S.holm_adjust(ps)
            ordered = [e["adj_p"] for _, e in
                       sorted(zip(ps, adj), key=lambda t: t[0])]
            for v in ordered:
                self.assertGreaterEqual(v, 0.0)
                self.assertLessEqual(v, 1.0)
            for lo, hi in zip(ordered, ordered[1:]):
                self.assertGreaterEqual(hi, lo)

    def test_step_down_stops_at_first_failure(self):
        adj = S.holm_adjust([0.01, 0.02, 0.5])
        self.assertTrue(adj[0]["reject"])
        self.assertTrue(adj[1]["reject"])
        self.assertFalse(adj[2]["reject"])


class TestNonFiniteExclusion(unittest.TestCase):
    def test_nan_inf_bool_rows_excluded(self):
        a = [row("C", 1, 1, 100.0), row("C", 2, 2, float("nan")),
             row("C", 3, 3, float("inf")), row("C", 4, 4, True),
             row("C", 5, 5, 110.0)]
        b = [row("C", 1, 1, 120.0), row("C", 2, 2, 120.0),
             row("C", 3, 3, 120.0), row("C", 4, 4, 120.0),
             row("C", 5, 5, 130.0)]
        pairs, forensics = S.paired_differences(a, b, metric="tps")
        self.assertEqual(len(pairs), 2)
        self.assertEqual(forensics["excluded_a_null"], 3)

    def test_bootstrap_rejects_non_finite(self):
        with self.assertRaises(ValueError):
            S.bootstrap_ci([1.0, float("nan")])
        with self.assertRaises(ValueError):
            S.bootstrap_p([1.0, float("inf")])
        with self.assertRaises(ValueError):
            S.bootstrap_ci([])

    def test_cross_cell_pairing_flag(self):
        a = [{"cell_id": "M2-I1", "repeat": i, "seed": 100 + i,
              "status": "measured", "tps": 100.0 + i} for i in range(1, 4)]
        b = [{"cell_id": "M2-I3", "repeat": i, "seed": 100 + i,
              "status": "measured", "tps": 120.0 + i} for i in range(1, 4)]
        pairs, forensics = S.paired_differences(a, b, metric="tps")
        self.assertTrue(forensics["cross_cell_pairing"])
        self.assertEqual(len(pairs), 3)


class TestDriftNullDegradation(unittest.TestCase):
    def test_missing_samples_degrade_to_none(self):
        drift = soak.soak_drift(None, None)
        for value in drift.values():
            self.assertIsNone(value)

    def test_garbage_and_negative_wall_degrade(self):
        pre = {"peak_rss_kb": float("nan"), "fd_count": "x",
               "cpu_time_s": 1.0, "wall_s": 10.0}
        post = {"peak_rss_kb": 100.0, "fd_count": 5.0,
                "cpu_time_s": 2.0, "wall_s": 5.0}
        drift = soak.soak_drift(pre, post)
        self.assertIsNone(drift["rss_delta_kb"])
        self.assertIsNone(drift["fd_delta"])
        self.assertAlmostEqual(drift["cpu_time_s"], 1.0)
        self.assertIsNone(drift["duration_s"])

    def test_resource_validators_reject_bools(self):
        self.assertNotEqual(
            resources_mod.validate_resources({"peak_rss_kb": True}), [])
        self.assertNotEqual(
            resources_mod.validate_drift({"rss_delta_kb": True}), [])


class TestReportNoClobber(unittest.TestCase):
    def test_bare_m9_dir_leaves_m1_m2_empty(self):
        recs = ([full_rec("M9-R1", "direct", i + 1, 100.0)
                 for i in range(7)]
                + [full_rec("M9-R1", "pgbouncer", i + 1, 200.0)
                   for i in range(7)])
        with tempfile.TemporaryDirectory() as raw:
            os.makedirs(os.path.join(raw, "raw"))
            for i, rec in enumerate(recs):
                with open(os.path.join(raw, "raw", "r%d.json" % i),
                          "w") as f:
                    json.dump(rec, f)
            with tempfile.TemporaryDirectory() as out:
                rc = report.main(["--m9-dir", raw, "--bootstrap-b",
                                  "200", "--bootstrap-seed", "7",
                                  "--out", out])
                self.assertEqual(rc, 0)
                # write-guards: bare --m9-dir must leave m1/m2
                # medians absent-or-empty, never clobbered with [].
                for matrix in ("m1", "m2"):
                    path = os.path.join(out, matrix, "medians.json")
                    if os.path.exists(path):
                        with open(path) as f:
                            self.assertEqual(json.load(f), [])
                with open(os.path.join(out, "report.json")) as f:
                    bundle = json.load(f)
                self.assertIn("statistics", bundle)
                self.assertEqual(bundle["m9_cells"], ["M9-R1"])


class TestStagedWorkflow(unittest.TestCase):
    def test_soak_workflow_parses_and_fails_fast(self):
        with open("poolduel/ci/poolduel-m10-soak.yml") as f:
            doc = yaml.safe_load(f)
        jobs = doc.get("jobs", {})
        self.assertIn("sweep", jobs)
        steps = jobs["sweep"].get("steps", [])
        names = [s.get("name", "") for s in steps]
        self.assertIn("Require arm binary", names)
        gate = next(s for s in steps
                    if s.get("name") == "Require arm binary")
        body = gate.get("run", "")
        self.assertIn("exit 1", body)
        self.assertIn("direct", body)


if __name__ == "__main__":
    unittest.main()
