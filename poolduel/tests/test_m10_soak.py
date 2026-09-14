"""M10 soak matrix tests (Refs #302).

Soak geometries, 36-chunk cover, tiered budgets, paired seeds reusing
m9_seed_for, Supavisor deferral, pre/post drift math, CLI --list-soak,
and runner argv byte-identity. Stdlib unittest only. No network, no
database, no numbers claimed.
"""

import copy
import io
import unittest
from contextlib import redirect_stdout


class TestSoakGeometries(unittest.TestCase):
    def test_three_cells_reuse_proven_shapes(self):
        from poolduel.harness.cells import get_cell
        from poolduel.harness.soak import soak_cell
        for soak_id, m1_id, duration in (("M10-S1", "M1-1", 1800),
                                         ("M10-S2", "M1-4", 3600),
                                         ("M10-S3", "M1-6", 1800)):
            cell = soak_cell(soak_id, duration)
            src = get_cell(m1_id)
            for field in ("workload", "clients", "pool_size",
                          "protocol", "churn"):
                self.assertEqual(cell[field], src[field],
                                 "%s.%s must twin %s"
                                 % (soak_id, field, m1_id))
            self.assertEqual(cell["warmup_s"], 60)
            self.assertEqual(cell["scale"], 10)
            self.assertEqual(cell["repeats"], 3)

    def test_durations_and_warmup(self):
        from poolduel.harness.soak import (SOAK_DURATIONS, SOAK_WARMUP_S,
                                           soak_cell)
        self.assertEqual(SOAK_DURATIONS, (1800, 3600))
        self.assertEqual(SOAK_WARMUP_S, 60)
        for duration in SOAK_DURATIONS:
            self.assertEqual(soak_cell("M10-S1", duration)["duration_s"],
                             duration)

    def test_unknown_cell_and_duration_rejected(self):
        from poolduel.harness.soak import soak_cell
        with self.assertRaises(KeyError):
            soak_cell("M10-S9", 1800)
        with self.assertRaises(ValueError):
            soak_cell("M10-S1", 60)

    def test_saturation_shape_is_200c_10p(self):
        from poolduel.harness.soak import soak_cell
        cell = soak_cell("M10-S2", 1800)
        self.assertEqual((cell["clients"], cell["pool_size"]), (200, 10))

    def test_churn_shape_carries_churn(self):
        from poolduel.harness.soak import soak_cell
        self.assertTrue(soak_cell("M10-S3", 1800)["churn"])
        self.assertFalse(soak_cell("M10-S1", 1800)["churn"])


class TestSoakArms(unittest.TestCase):
    def test_six_incumbents_no_supavisor(self):
        from poolduel.harness.soak import SOAK_ARMS
        self.assertEqual(SOAK_ARMS,
                         ["direct", "pgagroal", "pgbouncer", "pgpool",
                          "odyssey", "pgcat"])
        self.assertNotIn("supavisor", SOAK_ARMS)

    def test_deferral_reason_written(self):
        from poolduel.harness.soak import SUPAVISOR_SOAK_DEFERRAL
        self.assertTrue(SUPAVISOR_SOAK_DEFERRAL.strip())
        self.assertIn("supavisor", SUPAVISOR_SOAK_DEFERRAL.lower())
        self.assertIn("smoke gate", SUPAVISOR_SOAK_DEFERRAL)


class TestSoakSeeds(unittest.TestCase):
    def test_reuses_m9_bases(self):
        from poolduel.harness.m9 import m9_seed_for
        from poolduel.harness.soak import soak_seed_for
        for rep in (1, 2, 3):
            self.assertEqual(soak_seed_for(rep), m9_seed_for(rep))
        self.assertEqual(soak_seed_for(1), 42)

    def test_distinct_across_repeats(self):
        from poolduel.harness.soak import soak_seed_for
        seeds = [soak_seed_for(r) for r in range(1, 4)]
        self.assertEqual(len(set(seeds)), 3)

    def test_rejects_nonpositive(self):
        from poolduel.harness.soak import soak_seed_for
        with self.assertRaises(ValueError):
            soak_seed_for(0)

    def test_no_arm_parameter(self):
        import inspect
        from poolduel.harness.soak import soak_seed_for
        self.assertNotIn("arm", inspect.signature(soak_seed_for).parameters)


class TestSoakChunks(unittest.TestCase):
    def test_count_and_names(self):
        from poolduel.harness.soak import SOAK_CHUNKS
        self.assertEqual(len(SOAK_CHUNKS), 36)
        self.assertEqual(sorted(SOAK_CHUNKS),
                         ["m10s%02d" % n for n in range(1, 37)])

    def test_chunk_name_cover(self):
        from poolduel.harness.soak import (SOAK_ARMS, SOAK_CELL_IDS,
                                           SOAK_CHUNKS, SOAK_DURATIONS)
        seen = set()
        for chunk, entries in SOAK_CHUNKS.items():
            self.assertEqual(len(entries), 1)
            _ns, cid, duration, arm = entries[0]
            seen.add((cid, duration, arm))
        want = {(cid, duration, arm)
                for cid in SOAK_CELL_IDS
                for duration in SOAK_DURATIONS
                for arm in SOAK_ARMS}
        self.assertEqual(seen, want)

    def test_direct_arm_present_per_cell_duration(self):
        from poolduel.harness.soak import (SOAK_CELL_IDS, SOAK_CHUNKS,
                                           SOAK_DURATIONS)
        for cid in SOAK_CELL_IDS:
            for duration in SOAK_DURATIONS:
                arms = [entries[0][3] for entries in SOAK_CHUNKS.values()
                        for _ in [0]
                        if entries[0][1] == cid
                        and entries[0][2] == duration]
                self.assertIn("direct", arms)
                self.assertEqual(len(arms), 6)

    def test_budgets_tiered_short_under_120_all_under_200(self):
        # Deviation from the 120-min-everywhere draft: a 60-min tier
        # chunk floors at 3 x 61 = 183 measured minutes before any
        # overhead, so no 3-repeat 60-min chunk can fit 120. The soak
        # cap is 200 (sized by CI timeout, stated in soak.py); the
        # 30-min tier still fits the classic 120.
        from poolduel.harness.soak import (SOAK_CHUNKS,
                                           SOAK_DURATIONS,
                                           check_soak_chunk_budgets,
                                           soak_chunk_budget_minutes,
                                           soak_entry_cells)
        self.assertEqual(check_soak_chunk_budgets(), {})
        for chunk in SOAK_CHUNKS:
            cell, _arms, _reps = soak_entry_cells(SOAK_CHUNKS[chunk][0])
            mins = soak_chunk_budget_minutes(chunk)
            if cell["duration_s"] == 1800:
                self.assertLess(mins, 120, chunk)
            self.assertLess(mins, 200, chunk)
        self.assertEqual(SOAK_DURATIONS, (1800, 3600))

    def test_scale_split_all_ten(self):
        from poolduel.harness.soak import SOAK_CHUNKS, soak_chunk_scale
        for name in SOAK_CHUNKS:
            self.assertEqual(soak_chunk_scale(name), 10)
        with self.assertRaises(KeyError):
            soak_chunk_scale("nope")

    def test_single_arm_chunks(self):
        from poolduel.harness.soak import SOAK_CHUNKS, soak_chunk_arms
        for name in SOAK_CHUNKS:
            self.assertEqual(len(soak_chunk_arms(name)), 1)

    def test_unknown_chunk(self):
        from poolduel.harness.soak import soak_chunk_plan
        with self.assertRaises(KeyError):
            soak_chunk_plan("m10s99")

    def test_total_budget(self):
        from poolduel.harness.soak import soak_total_budget
        total = soak_total_budget()
        self.assertEqual(total["chunks"], 36)
        self.assertEqual(total["arm_runs"], 108)
        self.assertEqual(round(total["measured_hours"], 2), 86.40)
        self.assertEqual(sorted(total["blocks"]),
                         ["M10-S1", "M10-S2", "M10-S3"])

    def test_budget_table_parity(self):
        from poolduel.harness.soak import SOAK_ARMS, soak_budget_table
        table = soak_budget_table()
        for arm in SOAK_ARMS:
            self.assertEqual(table[arm], 18)

    def test_plan_repeats_paired(self):
        from poolduel.harness.m9 import m9_seed_for
        from poolduel.harness.soak import SOAK_CHUNKS, soak_chunk_plan
        for chunk in SOAK_CHUNKS:
            plan = soak_chunk_plan(chunk)
            self.assertEqual(len(plan), 3)
            self.assertEqual([r for (_c, _a, r) in plan], [1, 2, 3])
            arms = {a for (_c, a, _r) in plan}
            self.assertEqual(len(arms), 1)
        # Paired-seed spot check: repeat r prices seed m9_seed_for(r).
        self.assertEqual(m9_seed_for(1), 42)


class TestSoakDrift(unittest.TestCase):
    def _samples(self):
        pre = {"cpu_time_s": 5.0, "peak_rss_kb": 1000, "fd_count": 10,
               "pool_wait": None, "pg_stat": None, "wall_s": 100.0}
        post = {"cpu_time_s": 8.5, "peak_rss_kb": 1100, "fd_count": 12,
                "pool_wait": None, "pg_stat": None, "wall_s": 1900.0}
        return pre, post

    def test_drift_math(self):
        from poolduel.harness.soak import soak_drift
        pre, post = self._samples()
        drift = soak_drift(pre, post)
        self.assertEqual(drift, {"rss_delta_kb": 100.0, "fd_delta": 2.0,
                                 "cpu_time_s": 3.5,
                                 "duration_s": 1800.0})

    def test_negative_delta_is_evidence_not_error(self):
        from poolduel.harness.soak import soak_drift
        pre, post = self._samples()
        post = dict(post, peak_rss_kb=900, fd_count=8)
        drift = soak_drift(pre, post)
        self.assertEqual(drift["rss_delta_kb"], -100.0)
        self.assertEqual(drift["fd_delta"], -2.0)

    def test_none_passthrough(self):
        from poolduel.harness.soak import soak_drift
        pre, post = self._samples()
        self.assertEqual(soak_drift(None, post),
                         {"rss_delta_kb": None, "fd_delta": None,
                          "cpu_time_s": None, "duration_s": None})
        self.assertEqual(soak_drift(pre, None),
                         {"rss_delta_kb": None, "fd_delta": None,
                          "cpu_time_s": None, "duration_s": None})
        self.assertEqual(soak_drift({}, {}),
                         {"rss_delta_kb": None, "fd_delta": None,
                          "cpu_time_s": None, "duration_s": None})
        partial = soak_drift({"peak_rss_kb": 4}, {"peak_rss_kb": 9})
        self.assertEqual(partial["rss_delta_kb"], 5.0)
        self.assertIsNone(partial["fd_delta"])
        self.assertIsNone(partial["cpu_time_s"])
        self.assertIsNone(partial["duration_s"])

    def test_hostile_never_raises_never_fabricates(self):
        from poolduel.harness.soak import soak_drift
        for bad in (None, {}, "x", 123, ["x"],
                    {"peak_rss_kb": "s", "fd_count": float("nan"),
                     "cpu_time_s": float("inf"), "wall_s": "t"}):
            for other in (None, {}, {"peak_rss_kb": 5}):
                try:
                    drift = soak_drift(bad, other)
                except Exception as exc:
                    self.fail("soak_drift(%r, %r) raised %r"
                              % (bad, other, exc))
                self.assertEqual(set(drift),
                                 {"rss_delta_kb", "fd_delta",
                                  "cpu_time_s", "duration_s"})
        pre, post = self._samples()
        post = dict(post, wall_s=50.0)  # clock oddity: negative window
        self.assertIsNone(soak_drift(pre, post)["duration_s"])


class TestSoakRunnerWiring(unittest.TestCase):
    def _measured(self, **over):
        measurement = {"tps": 1000.0, "latency_avg_ms": 1.0,
                       "latency_stddev_ms": 0.1, "p50_ms": 0.9,
                       "p90_ms": 1.5, "p99_ms": 2.0, "p999_ms": 3.0,
                       "failed": 0, "skipped": 0, "exit_code": 0,
                       "status": "measured"}
        measurement.update(over)
        return measurement

    def test_soak_record_carries_drift(self):
        from poolduel.harness.runner import PG_CONFIG_BASELINE
        from poolduel.harness.runner import build_record
        from poolduel.harness.schema import validate_cell
        from poolduel.harness.soak import soak_cell
        cell = soak_cell("M10-S1", 1800)
        pre = {"cpu_time_s": 1.0, "peak_rss_kb": 500, "fd_count": 9,
               "pool_wait": None, "pg_stat": None, "wall_s": 10.0}
        post = {"cpu_time_s": 4.0, "peak_rss_kb": 560, "fd_count": 9,
                "pool_wait": None, "pg_stat": None, "wall_s": 1810.0}
        rec = build_record(cell, "pgbouncer", "cfg",
                           self._measured(resources_pre=pre,
                                          resources_post=post),
                           "PG 17", copy.deepcopy(PG_CONFIG_BASELINE),
                           4, 1, 42)
        self.assertEqual(rec["resources_pre"], pre)
        self.assertEqual(rec["resources_post"], post)
        self.assertEqual(rec["resources_drift"]["rss_delta_kb"], 60.0)
        self.assertEqual(rec["resources_drift"]["duration_s"], 1800.0)
        self.assertEqual(validate_cell(rec), [])

    def test_nonsoak_record_carries_samples_no_drift(self):
        from poolduel.harness.cells import get_cell
        from poolduel.harness.runner import build_record
        from poolduel.harness.schema import validate_cell
        cell = get_cell("M1-1")
        pre = {"cpu_time_s": 1.0, "peak_rss_kb": 500, "fd_count": 9,
               "pool_wait": None, "pg_stat": None, "wall_s": 10.0}
        rec = build_record(cell, "direct", "cfg",
                           self._measured(resources_pre=pre,
                                          resources_post=dict(pre)),
                           "PG 17", None, 4, 1, 43)
        self.assertEqual(rec["resources_pre"], pre)
        self.assertIsNone(rec["resources_drift"])
        self.assertEqual(validate_cell(rec), [])

    def test_legacy_skeleton_stays_valid(self):
        from poolduel.harness.cells import get_cell
        from poolduel.harness.runner import build_record
        from poolduel.harness.schema import validate_cell
        rec = build_record(get_cell("M1-1"), "pgbouncer", "cfg",
                           self._measured(), "PG 17", None, 4, 1, 43)
        self.assertIsNone(rec["resources_pre"])
        self.assertIsNone(rec["resources_post"])
        self.assertIsNone(rec["resources_drift"])
        self.assertEqual(validate_cell(rec), [])

    def test_m1_argv_byte_identity(self):
        # Guard: soak runner work must not reshape M1/M2 argv rendering.
        from poolduel.harness import pgbench as pgbench_mod
        from poolduel.harness.cells import get_cell
        argv = pgbench_mod.build_argv(get_cell("M1-1"), "127.0.0.1",
                                      5432, "benchdb", "benchuser", 4)
        self.assertEqual(argv,
                         ["pgbench", "-h", "127.0.0.1", "-p", "5432",
                          "-U", "benchuser", "-S", "-M", "simple",
                          "-c", "100", "-j", "4", "-T", "120",
                          "-P", "10", "-l", "--log-prefix=cell",
                          "--random-seed=42", "benchdb"])


class TestSoakCLI(unittest.TestCase):
    def test_list_soak(self):
        from poolduel.harness.cli import main
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = main(["--list-soak"])
        self.assertEqual(rc, 0)
        body = buf.getvalue()
        self.assertIn("m10s01", body)
        self.assertIn("m10s36", body)
        self.assertIn("supavisor", body.lower())

    def test_dry_run_chunk(self):
        from poolduel.harness.cli import main
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = main(["--matrix", "soak", "--chunk", "m10s01",
                       "--out", "/tmp/soak-test-out", "--dry-run"])
        self.assertEqual(rc, 0)
        body = buf.getvalue()
        self.assertIn("M10-S1", body)
        self.assertIn("seed=", body)
        self.assertIn("plan=3", body)

    def test_dry_run_seeds_paired(self):
        from poolduel.harness.cli import main
        from poolduel.harness.m9 import m9_seed_for
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = main(["--matrix", "soak", "--chunk", "m10s01",
                       "--out", "/tmp/soak-test-out", "--dry-run"])
        self.assertEqual(rc, 0)
        seeds = set()
        for line in buf.getvalue().splitlines():
            if line.startswith("M10-S1 "):
                seeds.add(int(line.split("seed=")[1].split()[0]))
        self.assertEqual(seeds, {m9_seed_for(1), m9_seed_for(2),
                                 m9_seed_for(3)})

    def test_cells_filter(self):
        from poolduel.harness.cli import main
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = main(["--matrix", "soak", "--chunk", "m10s01",
                       "--cells", "M10-S1",
                       "--out", "/tmp/soak-test-out", "--dry-run"])
        self.assertEqual(rc, 0)
        self.assertIn("M10-S1", buf.getvalue())
        with self.assertRaises(SystemExit):
            main(["--matrix", "soak", "--chunk", "m10s01",
                  "--cells", "M10-NOPE",
                  "--out", "/tmp/soak-test-out", "--dry-run"])


class TestSoakPreflight(unittest.TestCase):
    def test_soak_checks_green(self):
        from poolduel.harness import check as check_mod
        self.assertEqual(check_mod.check_soak_coverage(), [])
        self.assertEqual(check_mod.check_soak_budgets(), [])
        self.assertEqual(check_mod.check_soak_scale_init(), [])
        self.assertEqual(check_mod.check_soak_seeds(), [])


class TestSoakCapRegression(unittest.TestCase):
    def test_cap_clears_duration_plus_warmup_every_cell_tier(self):
        from poolduel.harness.runner import cell_cap_s
        from poolduel.harness.soak import (SOAK_CELL_IDS, SOAK_DURATIONS,
                                           soak_cell)
        for cid in SOAK_CELL_IDS:
            for duration in SOAK_DURATIONS:
                cell = soak_cell(cid, duration)
                cap = cell_cap_s(cell)
                self.assertGreater(
                    cap, duration,
                    "%s/%ds cap %d must clear the measured window"
                    % (cid, duration, cap))
                self.assertGreaterEqual(
                    cap, cell["duration_s"] + cell["warmup_s"],
                    "%s/%ds cap %d must clear duration + warmup"
                    % (cid, duration, cap))

    def test_standard_cap_untouched_for_short_cells(self):
        from poolduel.harness.cells import get_cell
        from poolduel.harness.runner import STANDARD_CAP_S, cell_cap_s
        self.assertEqual(cell_cap_s(get_cell("M1-3")), STANDARD_CAP_S)


if __name__ == "__main__":
    unittest.main()
