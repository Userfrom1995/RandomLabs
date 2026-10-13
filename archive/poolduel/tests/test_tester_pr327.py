"""Tester hostile regression suite for PR #327 (M8 calibration, Refs #302).

Attacks the M8 surface the builder's 31 tests do not: non-finite
warmup-curve medians (NaN/inf must raise, never a "nan tps" verdict),
delta_snapshots never-raises contract on hostile shapes, resource
passthrough aliasing, fixed-offer hostile types, unknown-workload
argv paths, M1 argv byte-identity across all 7 cells, CLI
--list-calibration JSON fitness, and calibration budget math.
Stdlib unittest only. Never touches production code.
"""

import copy
import io
import json
import math
import unittest
from contextlib import redirect_stdout

from poolduel.harness import calibrate as calibrate_mod
from poolduel.harness import pgbench as pgbench_mod
from poolduel.harness import resources as resources_mod
from poolduel.harness import workloads as workloads_mod
from poolduel.harness.cells import get_cell
from poolduel.harness.runner import PG_CONFIG_BASELINE, build_record
from poolduel.harness.schema import validate_cell


def _measured(cell_id="M1-1", pooler="pgbouncer"):
    cell = get_cell(cell_id)
    measurement = {
        "status": "measured", "tps": 1000.0, "latency_avg_ms": 1.0,
        "latency_stddev_ms": 0.1, "p50_ms": 0.9, "p90_ms": 1.5,
        "p99_ms": 2.0, "p999_ms": 3.0, "failed": 0, "skipped": 0,
        "exit_code": 0, "stdout_path": None, "txn_path": None,
        "agg_path": None, "stderr": "", "stdout": "",
    }
    return cell, pooler, measurement


class WarmupCurveHostileTest(unittest.TestCase):
    def test_nan_median_raises(self):
        # A NaN median is not a positive measurement. The contract
        # promises ValueError on non-positive medians; a "nan tps ...
        # must rise" verdict would burn M9 budget on poisoned input.
        with self.assertRaises(ValueError):
            calibrate_mod.evaluate_warmup_curve([(30, float("nan"))])

    def test_inf_median_raises(self):
        # No physical throughput median is infinite; accepting inf
        # yields verdicts like "within 5% of best (inf tps)".
        with self.assertRaises(ValueError):
            calibrate_mod.evaluate_warmup_curve([(30, float("inf"))])
        with self.assertRaises(ValueError):
            calibrate_mod.evaluate_warmup_curve(
                [(0, 900.0), (30, float("inf"))])

    def test_nan_anywhere_in_curve_raises(self):
        with self.assertRaises(ValueError):
            calibrate_mod.evaluate_warmup_curve(
                [(0, 900.0), (10, float("nan")), (30, 1000.0)])

    def test_plateau_rise_rule_fires(self):
        # Best uniquely on the max candidate with nobody in tolerance:
        # must rise, not declare the boundary sufficient.
        verdict = calibrate_mod.evaluate_warmup_curve(
            [(0, 100.0), (10, 200.0), (30, 900.0), (60, 1000.0)])
        self.assertFalse(verdict["sufficient"])
        self.assertIsNone(verdict["recommended_warmup_s"])

    def test_all_equal_picks_smallest(self):
        verdict = calibrate_mod.evaluate_warmup_curve(
            [(60, 1000.0), (30, 1000.0), (10, 1000.0), (0, 1000.0)])
        self.assertTrue(verdict["sufficient"])
        self.assertEqual(verdict["recommended_warmup_s"], 0)

    def test_single_point_sufficient(self):
        verdict = calibrate_mod.evaluate_warmup_curve([(42, 500.0)])
        self.assertTrue(verdict["sufficient"])
        self.assertEqual(verdict["recommended_warmup_s"], 42)

    def test_boundary_tolerance_passes(self):
        verdict = calibrate_mod.evaluate_warmup_curve(
            [(30, 950.0), (60, 1000.0)])
        self.assertTrue(verdict["sufficient"])
        self.assertEqual(verdict["recommended_warmup_s"], 30)

    def test_verdict_rationale_never_names_nan(self):
        # Guard against "nan tps" leaking into progress logs even on
        # paths that stay sufficient: every verdict rationale must be
        # finite-text.
        for points in ([(0, 900.0), (10, 970.0), (30, 1000.0)],
                       [(0, 100.0), (30, 1000.0)]):
            verdict = calibrate_mod.evaluate_warmup_curve(points)
            self.assertNotIn("nan", verdict["rationale"].lower())
            self.assertTrue(math.isfinite(verdict["best_tps"]))


class ResourcesHostileTest(unittest.TestCase):
    def test_delta_never_raises_on_hostile_shapes(self):
        # Module contract: "never raises, never guesses". Snapshot
        # queries can return unexpected shapes when Lab-scope wiring
        # meets a live database; every shape must degrade to None.
        hostile = [None, {}, "x", 123, ["x"], (("xact_commit", 1),),
                   {"xact_commit": "s"}, {"xact_commit": float("nan")}]
        for bad in hostile:
            for other in (None, {}, {"xact_commit": 5}):
                try:
                    delta = resources_mod.delta_snapshots(bad, other)
                except Exception as exc:
                    self.fail("delta_snapshots(%r, %r) raised %r"
                              % (bad, other, exc))
                self.assertEqual(set(delta.keys()),
                                 set(resources_mod.PG_STAT_KEYS))

    def test_delta_numeric_strings_stay_none(self):
        delta = resources_mod.delta_snapshots(
            {"xact_commit": "25"}, {"xact_commit": "30"})
        self.assertIsNone(delta["xact_commit"])

    def test_passthrough_copies_not_aliases(self):
        wait = {"cl_waiting": 3}
        res = resources_mod.collect_self_resources(pool_wait=wait)
        res["pool_wait"]["cl_waiting"] = 999
        self.assertEqual(wait, {"cl_waiting": 3})
        res2 = resources_mod.collect_self_resources(pool_wait=wait)
        self.assertEqual(res2["pool_wait"], {"cl_waiting": 3})

    def test_collect_never_raises_and_keys_stable(self):
        res = resources_mod.collect_self_resources()
        self.assertEqual(set(res.keys()),
                         set(resources_mod.RESOURCE_KEYS))
        for key in ("cpu_time_s", "peak_rss_kb", "fd_count"):
            self.assertTrue(res[key] is None or res[key] >= 0)

    def test_record_round_trips_through_json(self):
        cell, pooler, measurement = _measured()
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show={})
        json.loads(json.dumps(rec["resources"]))
        self.assertEqual(validate_cell(rec), [])


class WorkloadsHostileTest(unittest.TestCase):
    def test_fixed_offer_hostile_types_rejected(self):
        for bad in ({"offer_rate": "x"}, {"offer_rate": float("nan")},
                    {"offer_rate": -3}, {"latency_limit": "s"},
                    {"latency_limit": float("nan")},
                    {"latency_limit": 0}):
            with self.assertRaises((ValueError, TypeError)):
                workloads_mod.fixed_offer_flags(bad)

    def test_latency_limit_alone_renders_L_only(self):
        flags = workloads_mod.fixed_offer_flags({"latency_limit": 2})
        self.assertEqual(flags, ["-L", "2"])

    def test_unknown_workloads_rejected_in_flags(self):
        for workload in ("fixed-offer", "pipeline", "", "tpcb_like"):
            with self.assertRaises(ValueError):
                pgbench_mod.workload_flags(
                    dict(get_cell("M1-1"), workload=workload))

    def test_think_time_requires_rate_key_for_offer(self):
        # think-time without offer_rate renders plain select-only; the
        # M9 matrix must set the rate key to get throttling. Pin the
        # current shape so M9 cannot assume throttling by name alone.
        cell = dict(get_cell("M1-1"), workload="think-time")
        argv = pgbench_mod.build_argv(cell, "h", 1, "d", "u", 4)
        self.assertIn("-S", argv)
        self.assertNotIn("-R", argv)

    def test_m1_argv_byte_identical_all_cells(self):
        for cid in ("M1-1", "M1-2", "M1-3", "M1-4",
                    "M1-5", "M1-6", "M1-7"):
            argv = pgbench_mod.build_argv(
                get_cell(cid), "h", 1, "d", "u", 4)
            self.assertNotIn("-f", argv, cid)
            self.assertNotIn("-R", argv, cid)
            self.assertNotIn("-L", argv, cid)

    def test_script_argv_carries_file_and_offer(self):
        cell = dict(get_cell("M1-1"), workload="zipf-select",
                    offer_rate=2000)
        argv = pgbench_mod.build_argv(
            cell, "h", 1, "d", "u", 4, script_path="/tmp/w.sql")
        self.assertIn("-f", argv)
        self.assertIn("-R", argv)
        self.assertNotIn("-S", argv)
        self.assertNotIn("-N", argv)
        self.assertNotIn("-b", argv)

    def test_write_script_rejects_unknown(self):
        with self.assertRaises(KeyError):
            workloads_mod.write_script("/tmp", "nope")


class CalibrationCliHostileTest(unittest.TestCase):
    def test_list_calibration_first_line_valid_json(self):
        from poolduel.harness.cli import print_calibration
        buf = io.StringIO()
        with redirect_stdout(buf):
            print_calibration()
        data = json.loads(buf.getvalue().splitlines()[0])
        self.assertEqual(data["scale100_pilot"],
                         ["M8-P1", "M8-P2", "M8-P3"])
        self.assertIn(30, data["warmup_candidates_s"])
        self.assertIn("zipf-select", data["script_workloads"])

    def test_budget_math_matches_specs(self):
        budget = calibrate_mod.calibration_budget_table()
        self.assertEqual(budget["warmup_curve_points"],
                         len(calibrate_mod.WARMUP_CANDIDATES))
        self.assertEqual(budget["warmup_curve_runs"],
                         len(calibrate_mod.WARMUP_CANDIDATES)
                         * calibrate_mod.WARMUP_CURVE_SPEC["repeats"])
        self.assertEqual(budget["scale100_pilot_cells"], 3)
        self.assertEqual(budget["scale100_pilot_runs"], 9)
        self.assertGreater(
            calibrate_mod.scale100_pilot_budget_minutes(), 0)

    def test_preflight_covers_m8(self):
        from poolduel.harness.check import check_m8_calibration
        self.assertEqual(check_m8_calibration(), [])


if __name__ == "__main__":
    unittest.main()
