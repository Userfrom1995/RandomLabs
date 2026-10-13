import unittest

from poolduel.harness import stats
from poolduel.harness import cells as cells_mod
from poolduel.harness import chunk as chunk_mod
from poolduel.harness import schema as schema_mod


class StatsTest(unittest.TestCase):
    def test_median_odd_even(self):
        self.assertEqual(stats.median([3, 1, 2]), 2.0)
        self.assertEqual(stats.median([1, 2, 3, 4]), 2.5)

    def test_compare_needs_bands_and_agreement(self):
        a = stats.summarize([100, 101, 102])
        b = stats.summarize([200, 201, 202])
        p99a = stats.summarize([9.0, 9.1, 9.2])
        p99b = stats.summarize([5.0, 5.1, 5.2])
        self.assertEqual(stats.compare_pair(b, a, p99b, p99a), "A faster")
        # overlapping tps bands -> inconclusive
        c = stats.summarize([100, 150, 200])
        self.assertEqual(stats.compare_pair(c, a, p99b, p99a),
                         "inconclusive")
        # disagreeing direction -> inconclusive
        self.assertEqual(stats.compare_pair(b, a, p99a, p99b),
                         "inconclusive")

    def test_pilot_gate(self):
        per_arm = {"x": {"tps": [100.0], "p99": [9.0]},
                   "y": {"tps": [100.5], "p99": [9.05]}}
        # single-repeat bands are points; near-tie still separates only if
        # bands do not overlap: use clearly separated values
        per_arm2 = {"x": {"tps": [100.0], "p99": [9.0]},
                    "y": {"tps": [500.0], "p99": [2.0]}}
        self.assertTrue(stats.pilot_separates(per_arm2))


class CellsTest(unittest.TestCase):
    def test_all_ratios_valid(self):
        cells_mod.validate_all_ratios()
        self.assertEqual(len(cells_mod.M1_CELLS), 7)

    def test_ratio_guard_rejects(self):
        with self.assertRaises(ValueError):
            cells_mod.check_ratio({"cell_id": "BAD", "clients": 10,
                                   "pool_size": 10})

    def test_flagship_repeats(self):
        self.assertEqual(cells_mod.get_cell("M1-1")["repeats"], 5)
        self.assertEqual(cells_mod.get_cell("M1-3")["repeats"], 3)


class ChunkTest(unittest.TestCase):
    def test_four_chunks_cover_all(self):
        seen = []
        n_reps = {}
        for name in ("a1", "a2", "b1", "b2", "c", "d", "e", "f", "g"):
            for c in chunk_mod.chunk_cells(name):
                seen.append(c["cell_id"])
                n_reps.setdefault(c["cell_id"], 0)
                n_reps[c["cell_id"]] += len(c["_repeats"])
        self.assertEqual(sorted(set(seen)),
                         ["M1-1", "M1-2", "M1-3", "M1-4",
                          "M1-5", "M1-6", "M1-7"])
        self.assertEqual(n_reps["M1-1"], 5)
        self.assertEqual(n_reps["M1-2"], 5)
        self.assertEqual(n_reps["M1-3"], 3)

    def test_round_robin_interleaves(self):
        cells = [cells_mod.get_cell("M1-2")]
        plan = chunk_mod.round_robin_schedule(cells, ["direct", "pgbouncer"],
                                              repeats_per_cell=2)
        arms = [a for (_, a, _) in plan]
        self.assertEqual(arms, ["direct", "pgbouncer",
                                "direct", "pgbouncer"])

    def test_chunk_budgets_under_cap(self):
        over = chunk_mod.check_chunk_budgets()
        self.assertEqual(over, {})


class SchemaTest(unittest.TestCase):
    def _measured(self):
        return {
            "cell_id": "M1-2", "workload": "tpcb-like",
            "pooler": "pgbouncer", "pooler_version": "1.25.2",
            "pooler_config": "x", "pg_version": "PG 17",
            "pg_config": {"shared_buffers": "512MB",
                          "max_connections": 300},
            "scale": 10, "clients": 50, "pool_size": 10, "threads": 4,
            "protocol": "simple", "churn": False, "duration_s": 60,
            "warmup_s": 30, "repeat": 1, "seed": 43,
            "tps": 1000.0, "latency_avg_ms": 4.0,
            "latency_stddev_ms": 1.0, "p50_ms": 3.8, "p90_ms": 6.0,
            "p99_ms": 9.0, "p999_ms": 15.0, "failed": 0, "skipped": 0,
            "exit_code": 0, "status": "measured",
            "artifacts": {"stdout": "a", "txnlog": "b", "agglog": "c"},
        }

    def test_valid(self):
        self.assertEqual(schema_mod.validate_cell(self._measured()), [])

    def test_extra_field_forbidden(self):
        rec = self._measured()
        rec["pgbouncer_special"] = 1
        errs = schema_mod.validate_cell(rec)
        self.assertTrue(any("extra" in e for e in errs))

    def test_na_requires_nulls(self):
        rec = self._measured()
        rec["status"] = "N/A (unsupported)"
        errs = schema_mod.validate_cell(rec)
        self.assertTrue(errs)
        na = schema_mod.make_na_record(
            {"cell_id": "M1-3", "workload": "tpcb-like", "clients": 50,
             "pool_size": 10, "protocol": "prepared", "churn": False,
             "duration_s": 60, "warmup_s": 30},
            "pgcat", "cfg", "PG 17", {"max_connections": 300}, 4, 1, 42)
        self.assertEqual(schema_mod.validate_cell(na), [])

    def test_zero_tps_rejected(self):
        rec = self._measured()
        rec["tps"] = 0
        self.assertTrue(schema_mod.validate_cell(rec))


if __name__ == "__main__":
    unittest.main()
