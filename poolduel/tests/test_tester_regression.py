"""Tester regression suite for poolduel M1 harness (Refs #302).

Hostile boundary coverage added by the Tester after dynamic verification:
empty inputs, degenerate payloads, schema impostors, oversize guards,
manifest resume, and the end-to-end stub run_plan pipeline. All hermetic
(stdlib + harness only, no PG/pgbench binaries, no network).
"""

import json
import os
import tempfile
import unittest
from unittest import mock

from poolduel.harness import chunk as chunk_mod
from poolduel.harness import pgbench
from poolduel.harness import runner
from poolduel.harness import schema as schema_mod
from poolduel.harness import stats
from poolduel.harness.cells import check_ratio, get_cell, validate_all_ratios
from poolduel.harness.chunk import (
    CHUNKS,
    chunk_cells,
    ensure_direct,
    filter_completed,
    load_manifest,
    mark_completed,
    result_key,
    round_robin_schedule,
)
from poolduel.harness.cli import build_parser, resolve_arms, resolve_cells


def _measured(**over):
    rec = {
        "cell_id": "M1-2", "workload": "tpcb-like",
        "pooler": "pgbouncer", "pooler_version": "1.25.2",
        "pooler_config": "x", "pg_version": "PG 17",
        "pg_config": {"shared_buffers": "512MB", "max_connections": 300},
        "scale": 10, "clients": 50, "pool_size": 10, "threads": 4,
        "protocol": "simple", "churn": False, "duration_s": 60,
        "warmup_s": 30, "repeat": 1, "seed": 43,
        "tps": 1000.0, "latency_avg_ms": 4.0,
        "latency_stddev_ms": 1.0, "p50_ms": 3.8, "p90_ms": 6.0,
        "p99_ms": 9.0, "p999_ms": 15.0, "failed": 0, "skipped": 0,
        "exit_code": 0, "status": "measured",
        "artifacts": {"stdout": "a", "txnlog": "b", "agglog": "c"},
    }
    rec.update(over)
    return rec


class StatsHostileTest(unittest.TestCase):
    def test_median_mean_empty_raise(self):
        with self.assertRaises(ValueError):
            stats.median([])
        with self.assertRaises(ValueError):
            stats.mean([])

    def test_stdev_single_is_zero(self):
        self.assertEqual(stats.stdev([5.0]), 0.0)

    def test_summarize_degenerate(self):
        self.assertEqual(stats.summarize([])["n"], 0)
        self.assertIsNone(stats.summarize([None, None])["median"])

    def test_bands_null_means_overlap(self):
        self.assertTrue(stats.bands_overlap(
            {"min": None, "max": None}, {"min": 1.0, "max": 2.0}))

    def test_compare_nulls_inconclusive(self):
        none = {"median": None, "min": None, "max": None}
        one = {"median": 1.0, "min": 1.0, "max": 1.0}
        self.assertEqual(stats.compare_pair(none, one, none, one),
                         "inconclusive")

    def test_pilot_needs_two_separated_arms(self):
        self.assertFalse(stats.pilot_separates({}))
        self.assertFalse(stats.pilot_separates(
            {"a": {"tps": [100.0], "p99": [5.0]}}))
        self.assertTrue(stats.pilot_separates(
            {"a": {"tps": [100.0], "p99": [9.0]},
             "b": {"tps": [500.0], "p99": [2.0]}}))

    def test_failed_ratio_exact_boundary(self):
        self.assertFalse(pgbench.failed_ratio_exceeds(
            {"failed": 100, "processed": 10000}))
        self.assertTrue(pgbench.failed_ratio_exceeds(
            {"failed": 101, "processed": 10000}))
        self.assertFalse(pgbench.failed_ratio_exceeds({"failed": 0}))
        self.assertTrue(pgbench.failed_ratio_exceeds({"failed": 1}))


class CellsHostileTest(unittest.TestCase):
    def test_pool_size_nonpositive_rejected(self):
        for bad in (0, -5):
            with self.assertRaises(ValueError):
                check_ratio({"cell_id": "Z", "clients": 10,
                             "pool_size": bad})

    def test_ratio_boundary(self):
        with self.assertRaises(ValueError):
            check_ratio({"cell_id": "Z", "clients": 49, "pool_size": 10})
        self.assertEqual(
            check_ratio({"cell_id": "Z", "clients": 50, "pool_size": 10}),
            5.0)

    def test_unknown_cell_raises(self):
        with self.assertRaises(KeyError):
            get_cell("NOPE")

    def test_all_m1_ratios_clean(self):
        validate_all_ratios()


class SchemaHostileTest(unittest.TestCase):
    def test_missing_field_rejected(self):
        rec = _measured()
        del rec["tps"]
        self.assertTrue(schema_mod.validate_cell(rec))

    def test_unknown_pooler_rejected(self):
        self.assertTrue(schema_mod.validate_cell(_measured(pooler="nosuch")))

    def test_bad_status_rejected(self):
        self.assertTrue(schema_mod.validate_cell(_measured(status="bogus")))

    def test_na_rows_must_be_null_never_zero(self):
        rec = _measured(status="N/A (unsupported)", tps=0.0,
                        latency_avg_ms=1.0, latency_stddev_ms=1.0,
                        p50_ms=1.0, p90_ms=1.0, p99_ms=1.0, p999_ms=1.0)
        self.assertTrue(schema_mod.validate_cell(rec))

    def test_measured_tps_must_be_positive_numeric(self):
        self.assertTrue(schema_mod.validate_cell(_measured(tps=-5)))
        self.assertTrue(schema_mod.validate_cell(_measured(tps=0)))
        self.assertTrue(schema_mod.validate_cell(_measured(tps="fast")))
        self.assertEqual(schema_mod.validate_cell(_measured()), [])

    def test_artifacts_must_be_object(self):
        self.assertTrue(schema_mod.validate_cell(_measured(artifacts="x")))

    def test_na_factory_rejects_measured(self):
        with self.assertRaises(ValueError):
            schema_mod.make_na_record(
                get_cell("M1-2"), "pgbouncer", "c", "PG 17", {}, 4, 1, 42,
                reason="measured")


class PgbenchHostileTest(unittest.TestCase):
    def test_unknown_workload_raises(self):
        with self.assertRaises(ValueError):
            pgbench.workload_flags({"workload": "nosuch"})

    def test_empty_stdout_raises(self):
        with self.assertRaises(ValueError):
            pgbench.parse_stdout("")

    def test_minimal_stdout_latencies_none(self):
        p = pgbench.parse_stdout(
            "tps = 10 (without initial connection time)")
        self.assertEqual(p["tps"], 10.0)
        self.assertIsNone(p["latency_avg_ms"])

    def test_txn_log_skips_garbage_and_negatives(self):
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            f.write("# comment\n\nbad line\n1 2 three\n1 2 -5\n"
                    "0 1 1000 0 0 0\n0 2 2000 0 0 0\n")
            path = f.name
        try:
            pct = pgbench.parse_txn_log(path)
        finally:
            os.unlink(path)
        self.assertEqual(pct["samples"], 2)
        self.assertLess(pct["p50_ms"], pct["p99_ms"])

    def test_txn_log_empty_is_all_none(self):
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            f.write("# only comments\n")
            path = f.name
        try:
            pct = pgbench.parse_txn_log(path)
        finally:
            os.unlink(path)
        self.assertEqual(pct["samples"], 0)
        self.assertIsNone(pct["p99_ms"])

    def test_txn_log_oversize_guard(self):
        with mock.patch("os.path.getsize",
                        return_value=300 * 1024 * 1024):
            with self.assertRaises(ValueError):
                pgbench.parse_txn_log("/tmp/never-there.log")

    def test_quantile_degenerate(self):
        self.assertIsNone(
            pgbench.percentiles_from_values([])["p50_ms"])
        single = pgbench.percentiles_from_values([7.0])
        self.assertEqual(single["p50_ms"], 7.0)
        self.assertEqual(single["p999_ms"], 7.0)


class ChunkCliHostileTest(unittest.TestCase):
    def test_unknown_chunk_raises(self):
        with self.assertRaises(KeyError):
            chunk_cells("zzz")

    def test_ensure_direct_injects_once(self):
        self.assertEqual(ensure_direct(["pgbouncer"]),
                         ["direct", "pgbouncer"])
        self.assertEqual(ensure_direct(["direct", "pgbouncer"]),
                         ["direct", "pgbouncer"])

    def test_schedule_auto_injects_direct(self):
        plan = round_robin_schedule([get_cell("M1-2")], ["pgbouncer"],
                                    repeats_per_cell=1)
        self.assertEqual(sorted(a for (_, a, _) in plan),
                         ["direct", "pgbouncer"])

    def test_all_chunks_under_cap(self):
        self.assertEqual(chunk_mod.check_chunk_budgets(), {})

    def test_pilot_plan_is_12(self):
        args = build_parser().parse_args(["--pilot"])
        plan = round_robin_schedule(resolve_cells(args),
                                    resolve_arms(args),
                                    repeats_per_cell=1)
        self.assertEqual(len(plan), 12)

    def test_unknown_arm_exits(self):
        with self.assertRaises(SystemExit):
            resolve_arms(build_parser().parse_args(["--arms", "nosuch"]))

    def test_repro_preflight_carries_pythonpath(self):
        with open("poolduel/repro.sh") as f:
            body = f.read()
        self.assertIn("PYTHONPATH=. python3 poolduel/harness/check.py", body)


class RunnerHostileTest(unittest.TestCase):
    def test_missing_binary_reported_not_raised(self):
        res = runner.run_subprocess(["__no_such_bin_xyz__"], timeout_s=5)
        self.assertIsNone(res["rc"])
        self.assertFalse(res["timed_out"])
        self.assertIn("missing binary", res["stderr"])

    def test_timeout_flag(self):
        res = runner.run_subprocess(["sleep", "5"], timeout_s=0.2)
        self.assertTrue(res["timed_out"])

    def test_find_log_empty_is_none(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertIsNone(runner.find_log(d, "prefix"))

    def test_pick_txn_path_skips_aggregate_sibling(self):
        with tempfile.TemporaryDirectory() as d:
            agg = os.path.join(d, "cell-X-aggregate-12345.log")
            worker = os.path.join(d, "cell-X-r1-12345.12345.log")
            open(agg, "w").close()
            open(worker, "w").close()
            # "-" sorts before ".", so the aggregate wins an naive glob.
            self.assertLess(os.path.basename(agg), os.path.basename(worker))
            self.assertEqual(runner.pick_txn_path(d, "cell-X"), worker)
            self.assertIsNone(runner.pick_txn_path(d, "nothing-here"))

    def test_manifest_resume_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "o")
            self.assertEqual(load_manifest(out), {"completed": []})
            mark_completed(out, "M1-2", "direct", 1)
            mark_completed(out, "M1-2", "direct", 1)
            self.assertEqual(load_manifest(out)["completed"],
                             ["M1-2/direct/r1"])
            plan = round_robin_schedule([get_cell("M1-2")],
                                        ["direct", "pgbouncer"],
                                        repeats_per_cell=1)
            rest = filter_completed(plan, load_manifest(out))
            self.assertEqual([(a, r) for (_, a, r) in rest],
                             [("pgbouncer", 1)])
            self.assertEqual(result_key("M1-2", "direct", 1),
                             "M1-2/direct/r1")

    def test_build_record_validates(self):
        cell = get_cell("M1-7")
        meas = {"tps": 500.0, "latency_avg_ms": 8.0,
                "latency_stddev_ms": 1.0, "p50_ms": 7.0, "p90_ms": 12.0,
                "p99_ms": 20.0, "p999_ms": 40.0, "failed": 0, "skipped": 0,
                "exit_code": 0, "status": "measured",
                "stdout_path": "a", "txn_path": "b", "agg_path": "c"}
        rec = runner.build_record(cell, "pgbouncer", "cfg", meas,
                                  "PG 17", None, 4, 1, 43)
        self.assertEqual(schema_mod.validate_cell(rec), [])

    def test_run_plan_rejects_unknown_pooler_keeps_known(self):
        class FakeAdapter:
            port = 5999

            def setup(self, workdir, cell):
                os.makedirs(workdir, exist_ok=True)

            def start(self):
                pass

            def healthcheck(self, timeout_s=30):
                return True

            def stop(self):
                pass

            def config_text(self, cell):
                return "fake"

        def fake_measure(cell, host, port, dbname, user, threads, seed,
                         repeat, workdir, pg_config=None, env=None):
            return {"status": "measured", "tps": 1000.0,
                    "latency_avg_ms": 4.0, "latency_stddev_ms": 1.0,
                    "p50_ms": 3.8, "p90_ms": 6.0, "p99_ms": 9.0,
                    "p999_ms": 15.0, "failed": 0, "skipped": 0,
                    "exit_code": 0, "stdout_path": "s", "txn_path": "t",
                    "agg_path": "a", "stderr": "", "stdout": "tps = 1"}

        from poolduel.harness.chunk import round_robin_schedule as _rr
        with tempfile.TemporaryDirectory() as d:
            plan = _rr([get_cell("M1-6")], ["direct", "fake"],
                       repeats_per_cell=1)
            # Hermetic: stub adapters for both arms (the real
            # DirectAdapter.healthcheck dials live PG 127.0.0.1:5432,
            # which needs a database, not a unit test). The arm NAME
            # is what the schema validates, not the adapter class.
            adapters = {"direct": FakeAdapter(), "fake": FakeAdapter()}
            with mock.patch.object(runner, "measure_once",
                                   side_effect=fake_measure):
                records, errors = runner.run_plan(plan, adapters, d,
                                                  threads=2, seed=7)
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["pooler"], "direct")
            self.assertTrue(any("unknown pooler" in e for e in errors))
            meds = runner.write_medians(
                records, os.path.join(d, "medians.json"))
            self.assertEqual(meds[0]["tps"]["median"], 1000.0)

    def test_write_medians_skips_null_repeats(self):
        base = _measured()
        recs = [dict(base, repeat=1, tps=100.0, p99_ms=9.0),
                dict(base, repeat=2, tps=200.0, p99_ms=5.0),
                dict(base, repeat=3, tps=None, p99_ms=None,
                     status="timeout/inconclusive")]
        with tempfile.TemporaryDirectory() as d:
            meds = runner.write_medians(
                recs, os.path.join(d, "medians.json"))
        self.assertEqual(meds[0]["tps"]["median"], 150.0)
        self.assertEqual(meds[0]["tps"]["n"], 2)


if __name__ == "__main__":
    unittest.main()
