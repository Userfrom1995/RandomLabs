"""M8 calibration regression tests (Refs #302).

Covers plan section 7 + spec-v1.md s6: resource fields, workload
breadth + fixed-offer argv, warmup-curve decision rule, scale-100
pilot, runner/schema wiring, CLI readout, and preflight. Stdlib
unittest only.
"""

import copy
import io
import json
import os
import tempfile
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


class TestResources(unittest.TestCase):
    def test_collect_keys_never_raises(self):
        res = resources_mod.collect_self_resources()
        for key in resources_mod.RESOURCE_KEYS:
            self.assertIn(key, res)

    def test_passthrough_not_fabricated(self):
        res = resources_mod.collect_self_resources()
        self.assertIsNone(res["pool_wait"])
        self.assertIsNone(res["pg_stat"])
        wait = {"cl_waiting": 3}
        res2 = resources_mod.collect_self_resources(pool_wait=wait)
        self.assertEqual(res2["pool_wait"], wait)

    def test_delta_subtraction(self):
        before = {"xact_commit": 10, "xact_rollback": 1,
                  "blks_hit": 100}
        after = {"xact_commit": 25, "xact_rollback": 2,
                 "blks_hit": 150}
        delta = resources_mod.delta_snapshots(before, after)
        self.assertEqual(delta["xact_commit"], 15)
        self.assertEqual(delta["xact_rollback"], 1)
        self.assertEqual(delta["blks_hit"], 50)

    def test_delta_missing_key_is_none(self):
        delta = resources_mod.delta_snapshots({"xact_commit": 5}, {})
        self.assertIsNone(delta["xact_commit"])
        self.assertIsNone(delta["blks_hit"])

    def test_validate_none_valid(self):
        self.assertEqual(resources_mod.validate_resources(None), [])

    def test_validate_rejects_extra_and_negative(self):
        bad = {"cpu_time_s": -1.0, "bogus": 1}
        errs = resources_mod.validate_resources(bad)
        self.assertTrue(any("non-negative" in e for e in errs))
        self.assertTrue(any("bogus" in e for e in errs))
        self.assertNotEqual(
            resources_mod.validate_resources("nope"), [])

    def test_validate_rejects_bool_numerics(self):
        errs = resources_mod.validate_resources({"cpu_time_s": True})
        self.assertTrue(any("numeric" in e for e in errs))
        derrs = resources_mod.validate_drift({"rss_delta_kb": False})
        self.assertTrue(any("numeric" in e for e in derrs))

    def test_snapshot_sql_names_counters(self):
        sql = resources_mod.pg_stat_snapshot_sql()
        self.assertIn("pg_stat_database", sql)
        self.assertIn("xact_commit", sql)


class TestWorkloads(unittest.TestCase):
    def test_needs_script_matrix(self):
        for workload in workloads_mod.SCRIPT_WORKLOADS:
            self.assertTrue(workloads_mod.needs_script(workload))
        for workload in ("select-only", "tpcb-like", "simple-update",
                         "think-time"):
            self.assertFalse(workloads_mod.needs_script(workload))

    def test_scripts_carry_mechanism(self):
        self.assertIn("zipfian",
                      workloads_mod.script_sql("zipf-select"))
        multi = workloads_mod.script_sql("multi-statement")
        self.assertIn("BEGIN", multi)
        self.assertIn("END", multi)
        self.assertIn("jsonb", workloads_mod.script_sql("jsonb-write"))
        self.assertIn("INSERT",
                      workloads_mod.script_sql("copy-adjacent"))

    def test_script_builtin_raises(self):
        with self.assertRaises(KeyError):
            workloads_mod.script_sql("select-only")

    def test_write_script_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = workloads_mod.write_script(tmp, "zipf-select")
            self.assertTrue(os.path.isabs(path))
            with open(path) as f:
                self.assertEqual(f.read(),
                                 workloads_mod.script_sql("zipf-select"))

    def test_fixed_offer_flags(self):
        self.assertEqual(workloads_mod.fixed_offer_flags({}), [])
        flags = workloads_mod.fixed_offer_flags(
            {"offer_rate": 5000, "latency_limit": 1})
        self.assertEqual(flags, ["-R", "5000", "-L", "1"])
        with self.assertRaises(ValueError):
            workloads_mod.fixed_offer_flags({"offer_rate": 0})

    def test_pipeline_reason_written(self):
        reason = workloads_mod.PIPELINE_FORBIDDEN_REASON
        self.assertTrue(reason.strip())
        self.assertIn("multi-statement", reason)

    def test_side_table_ddl_once_not_per_cell(self):
        self.assertIsNone(workloads_mod.script_ddl("zipf-select"))
        self.assertIn("CREATE TABLE",
                      workloads_mod.script_ddl("jsonb-write"))


class TestPgbenchBreadth(unittest.TestCase):
    def test_m1_argv_unchanged(self):
        cell = get_cell("M1-1")
        argv = pgbench_mod.build_argv(
            cell, "127.0.0.1", 5432, "benchdb", "benchuser", 4,
            duration_s=120, log_prefix="x", seed=42)
        self.assertNotIn("-f", argv)
        self.assertNotIn("-R", argv)
        self.assertNotIn("-L", argv)

    def test_think_time_rides_select_builtin(self):
        cell = dict(get_cell("M1-1"))
        cell["workload"] = "think-time"
        self.assertIn("-S", pgbench_mod.workload_flags(cell))

    def test_script_workloads_carry_no_builtin(self):
        for workload in workloads_mod.SCRIPT_WORKLOADS:
            cell = dict(get_cell("M1-1"))
            cell["workload"] = workload
            flags = pgbench_mod.workload_flags(cell)
            self.assertNotIn("-S", flags)
            self.assertNotIn("-N", flags)
            self.assertNotIn("-b", flags)
            self.assertIn("-M", flags)  # protocol still recorded

    def test_argv_script_and_offer(self):
        cell = dict(get_cell("M1-1"))
        cell["workload"] = "zipf-select"
        cell["offer_rate"] = 2000
        argv = pgbench_mod.build_argv(
            cell, "h", 1, "d", "u", 4, script_path="/tmp/w.sql")
        self.assertIn("-f", argv)
        self.assertIn("/tmp/w.sql", argv)
        self.assertIn("-R", argv)
        self.assertIn("2000", argv)
        with self.assertRaises(ValueError):
            bad = dict(cell, offer_rate=0)
            pgbench_mod.build_argv(bad, "h", 1, "d", "u", 4)


class TestWarmupCurve(unittest.TestCase):
    def test_candidates_include_provisional(self):
        self.assertIn(30, calibrate_mod.WARMUP_CANDIDATES)
        self.assertEqual(len(set(calibrate_mod.WARMUP_CANDIDATES)),
                         len(calibrate_mod.WARMUP_CANDIDATES))

    def test_picks_smallest_sufficient(self):
        points = [(0, 900.0), (10, 970.0), (30, 1000.0), (60, 1005.0)]
        verdict = calibrate_mod.evaluate_warmup_curve(points)
        self.assertTrue(verdict["sufficient"])
        self.assertEqual(verdict["recommended_warmup_s"], 10)

    def test_boundary_tolerance_passes(self):
        verdict = calibrate_mod.evaluate_warmup_curve(
            [(30, 950.0), (60, 1000.0)])
        self.assertTrue(verdict["sufficient"])
        self.assertEqual(verdict["recommended_warmup_s"], 30)

    def test_insufficient_rises(self):
        verdict = calibrate_mod.evaluate_warmup_curve(
            [(0, 100.0), (10, 200.0), (30, 900.0), (60, 1000.0)])
        self.assertFalse(verdict["sufficient"])
        self.assertIsNone(verdict["recommended_warmup_s"])
        self.assertIn("must rise", verdict["rationale"])

    def test_empty_and_nonpositive_raise(self):
        with self.assertRaises(ValueError):
            calibrate_mod.evaluate_warmup_curve([])
        with self.assertRaises(ValueError):
            calibrate_mod.evaluate_warmup_curve([(30, None)])
        with self.assertRaises(ValueError):
            calibrate_mod.evaluate_warmup_curve([(30, 0.0)])


class TestScale100Pilot(unittest.TestCase):
    def test_cells_scale_and_ratio(self):
        cells = calibrate_mod.scale100_pilot_cells()
        self.assertGreaterEqual(len(cells), 2)
        for cell in cells:
            self.assertEqual(cell["scale"], 100)

    def test_budget_positive(self):
        self.assertGreater(
            calibrate_mod.scale100_pilot_budget_minutes(), 0)
        budget = calibrate_mod.calibration_budget_table()
        self.assertEqual(budget["warmup_curve_points"],
                         len(calibrate_mod.WARMUP_CANDIDATES))
        self.assertEqual(budget["scale100_pilot_cells"], 3)


class TestRecordWiring(unittest.TestCase):
    def test_build_record_carries_resources(self):
        cell, pooler, measurement = _measured()
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show={})
        self.assertIn("resources", rec)
        self.assertEqual(validate_cell(rec), [])

    def test_explicit_resources_recorded(self):
        cell, pooler, measurement = _measured()
        given = {"cpu_time_s": 61.5, "peak_rss_kb": 12345,
                 "fd_count": 12, "pool_wait": None, "pg_stat": None}
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show={}, resources=given)
        self.assertEqual(rec["resources"], given)
        self.assertEqual(validate_cell(rec), [])

    def test_legacy_rows_without_resources_stay_valid(self):
        cell, pooler, measurement = _measured()
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show={})
        legacy = {k: v for k, v in rec.items() if k != "resources"}
        self.assertEqual(validate_cell(legacy), [])

    def test_bad_resources_rejected(self):
        cell, pooler, measurement = _measured()
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show={},
                           resources={"cpu_time_s": -5.0})
        self.assertNotEqual(validate_cell(rec), [])


class TestCalibrationCli(unittest.TestCase):
    def test_list_calibration_json(self):
        from poolduel.harness.cli import print_calibration
        buf = io.StringIO()
        with redirect_stdout(buf):
            print_calibration()
        data = json.loads(buf.getvalue().splitlines()[0])
        self.assertIn(30, data["warmup_candidates_s"])
        self.assertEqual(data["scale100_pilot"],
                         ["M8-P1", "M8-P2", "M8-P3"])
        self.assertIn("zipf-select", data["script_workloads"])

    def test_preflight_covers_m8(self):
        from poolduel.harness.check import check_m8_calibration
        self.assertEqual(check_m8_calibration(), [])


if __name__ == "__main__":
    unittest.main()
