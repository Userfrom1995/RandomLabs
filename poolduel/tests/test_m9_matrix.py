"""M9 resweep matrix tests: powered repeats, paired seeds, blocks, chunks.

Stdlib unittest only. No network, no database, no numbers claimed.
"""

import io
import unittest
from contextlib import redirect_stdout


class TestM9Repeats(unittest.TestCase):
    def test_flagship_ten_standard_seven(self):
        from poolduel.harness.m9 import (m9_repeats, m9_resweep_cell)
        self.assertEqual(m9_resweep_cell("M1-1")["repeats"], 10)
        self.assertEqual(m9_resweep_cell("M1-2")["repeats"], 10)
        for cid in ("M1-3", "M1-4", "M1-5", "M1-6", "M1-7"):
            self.assertEqual(m9_resweep_cell(cid)["repeats"], 7)

    def test_resweep_ids_match_m1(self):
        from poolduel.harness.m9 import m9_resweep_cell
        cell = m9_resweep_cell("M1-6")
        self.assertEqual(cell["cell_id"], "M1-6")
        self.assertTrue(cell["churn"])
        self.assertEqual(cell["scale"], 10)

    def test_c100_powered(self):
        from poolduel.harness.m9 import m9_c100_cell
        c1 = m9_c100_cell(1)
        self.assertEqual(c1["cell_id"], "M9-C1")
        self.assertEqual(c1["scale"], 100)
        self.assertEqual(c1["repeats"], 10)
        c5 = m9_c100_cell(5)
        self.assertEqual(c5["repeats"], 7)
        self.assertEqual(c5["scale"], 100)

    def test_curve_cells(self):
        from poolduel.harness.m9 import m9_curve_cell
        for warmup, cid in ((0, "M9-K0"), (10, "M9-K10"),
                            (30, "M9-K30"), (60, "M9-K60")):
            cell = m9_curve_cell(warmup)
            self.assertEqual(cell["cell_id"], cid)
            self.assertEqual(cell["warmup_s"], warmup)
            self.assertEqual(cell["duration_s"], 60)
            self.assertEqual(cell["repeats"], 3)
        with self.assertRaises(KeyError):
            m9_curve_cell(45)

    def test_e1_cell(self):
        from poolduel.harness.m9 import m9_e1_cell
        cell = m9_e1_cell()
        self.assertEqual(cell["cell_id"], "M9-E1")
        self.assertTrue(cell["churn"])
        self.assertEqual(cell["variant"], {"auth_mode": "equalized"})
        self.assertEqual(cell["repeats"], 7)


class TestM9Seeds(unittest.TestCase):
    def test_distinct_over_powered_range(self):
        from poolduel.harness.m9 import m9_seed_for
        seeds = [m9_seed_for(r) for r in range(1, 11)]
        self.assertEqual(len(set(seeds)), 10)

    def test_deterministic(self):
        from poolduel.harness.m9 import m9_seed_for
        self.assertEqual(m9_seed_for(4), m9_seed_for(4))

    def test_rejects_nonpositive(self):
        from poolduel.harness.m9 import m9_seed_for
        with self.assertRaises(ValueError):
            m9_seed_for(0)

    def test_no_arm_parameter(self):
        import inspect
        from poolduel.harness.m9 import m9_seed_for
        self.assertNotIn("arm", inspect.signature(m9_seed_for).parameters)


class TestSupavisorMapping(unittest.TestCase):
    def test_transaction_default(self):
        from poolduel.harness.m9 import supavisor_mode_for
        self.assertEqual(supavisor_mode_for("pgbouncer", {}), "transaction")
        self.assertEqual(supavisor_mode_for("pgbouncer",
                                           {"pool_mode": "transaction"}),
                         "transaction")

    def test_session_variants(self):
        from poolduel.harness.m9 import supavisor_mode_for
        self.assertEqual(supavisor_mode_for("pgbouncer",
                                           {"pool_mode": "session"}),
                         "session")
        self.assertEqual(supavisor_mode_for("odyssey", {"pool": "session"}),
                         "session")
        self.assertEqual(supavisor_mode_for("pgagroal",
                                           {"pipeline": "session"}),
                         "session")
        self.assertEqual(supavisor_mode_for("pgagroal",
                                           {"pipeline": "performance"}),
                         "session")
        self.assertEqual(supavisor_mode_for("pgpool", {}), "session")

    def test_statement_is_na(self):
        from poolduel.harness.m9 import supavisor_mode_for
        self.assertIsNone(supavisor_mode_for(
            "pgbouncer", {"pool_mode": "statement"}))
        self.assertIsNone(supavisor_mode_for(
            "odyssey", {"pool": "statement"}))

    def test_supa_rows_and_na(self):
        from poolduel.harness.m9 import (m9_supa_ids, m9_supa_na_rows,
                                         m9_supa_rows)
        rows = m9_supa_rows()
        na = m9_supa_na_rows()
        self.assertEqual(len(rows) + len(na), 52)
        self.assertTrue(all(uid.startswith("M9-U-") for uid in m9_supa_ids()))
        self.assertTrue(all("statement" in reason for (_, _, _, reason)
                            in na))

    def test_supa_cell(self):
        from poolduel.harness.m9 import m9_supa_cell, m9_supa_ids
        cell = m9_supa_cell(m9_supa_ids()[0])
        self.assertEqual(cell["arm"], "supavisor")
        self.assertIn(cell["variant"]["pool_mode"],
                      ("transaction", "session"))
        self.assertEqual(cell["repeats"], 7)
        with self.assertRaises(KeyError):
            m9_supa_cell("M9-U-NOPE")


class TestM9Chunks(unittest.TestCase):
    def test_counts(self):
        from poolduel.harness.m9 import M9_CHUNKS
        self.assertEqual(len(M9_CHUNKS), 103)
        blocks = {}
        for name in M9_CHUNKS:
            blocks[name[:3]] = blocks.get(name[:3], 0) + 1
        self.assertEqual(blocks["m9r"], 25)
        self.assertEqual(blocks["m9w"], 26)
        self.assertEqual(blocks["m9c"], 25)
        self.assertEqual(blocks["m9k"], 1)
        self.assertEqual(blocks["m9e"], 3)
        self.assertEqual(blocks["m9u"], 23)

    def test_budgets_under_cap(self):
        from poolduel.harness.m9 import check_m9_chunk_budgets
        self.assertEqual(check_m9_chunk_budgets(), {})

    def test_scale_split(self):
        from poolduel.harness.m9 import M9_CHUNKS, m9_chunk_scale
        for name in M9_CHUNKS:
            want = 100 if name.startswith("m9c") else 10
            self.assertEqual(m9_chunk_scale(name), want)
        with self.assertRaises(KeyError):
            m9_chunk_scale("nope")

    def test_r_chunk_arms(self):
        from poolduel.harness.m9 import m9_chunk_arms
        arms = m9_chunk_arms("m9r01")
        self.assertEqual(sorted(arms),
                         ["direct", "odyssey", "pgagroal", "pgbouncer",
                          "pgcat", "pgpool", "supavisor"])

    def test_k_chunk_direct_only(self):
        from poolduel.harness.m9 import m9_chunk_arms
        self.assertEqual(m9_chunk_arms("m9k01"), ["direct"])

    def test_w_chunk_row_plus_direct(self):
        from poolduel.harness.m9 import m9_chunk_plan
        plan = m9_chunk_plan("m9w01")
        arms = sorted({a for (_, a, _) in plan})
        self.assertIn("direct", arms)
        # 2 rows per chunk: 2-3 distinct arms (pairs may share an arm)
        self.assertGreaterEqual(len(arms), 2)
        self.assertLessEqual(len(arms), 3)

    def test_unknown_chunk(self):
        from poolduel.harness.m9 import m9_chunk_plan
        with self.assertRaises(KeyError):
            m9_chunk_plan("m9z99")

    def test_total_budget(self):
        from poolduel.harness.m9 import m9_total_budget
        total = m9_total_budget()
        self.assertEqual(total["chunks"], 103)
        self.assertGreater(total["arm_runs"], 2000)
        self.assertGreater(total["measured_hours"], 70.0)

    def test_budget_table_covers_all_arms(self):
        from poolduel.harness.m9 import m9_budget_table
        table = m9_budget_table()
        for arm in ("direct", "pgagroal", "pgbouncer", "pgpool",
                    "odyssey", "pgcat", "supavisor"):
            self.assertGreater(table[arm], 0)


class TestEqualizedAdapters(unittest.TestCase):
    def _cell(self, variant, workload="select-only"):
        return {"cell_id": "M9-E1", "workload": workload, "clients": 100,
                "pool_size": 10, "protocol": "simple", "churn": True,
                "duration_s": 60, "warmup_s": 30, "variant": variant}

    def test_odyssey_baseline_untouched(self):
        from poolduel.harness.adapters.odyssey import OdysseyAdapter
        text = OdysseyAdapter().config_text(self._cell({}))
        self.assertIn('authentication "none"', text)
        self.assertNotIn('    password "', text)

    def test_odyssey_equalized(self):
        from poolduel.harness.adapters.odyssey import OdysseyAdapter
        text = OdysseyAdapter().config_text(
            self._cell({"auth_mode": "equalized"}))
        self.assertIn('authentication "scram-sha-256"', text)
        self.assertIn('password "benchpass"', text)
        self.assertIn("equalized-auth", text)

    def test_pgpool_baseline_untouched(self):
        from poolduel.harness.adapters.pgpool import PgPoolAdapter
        text = PgPoolAdapter().config_text(self._cell({}))
        self.assertIn("pool_hba stays disabled", text)
        self.assertNotIn("enable_pool_hba", text)

    def test_pgpool_equalized(self):
        import tempfile
        from poolduel.harness.adapters.pgpool import PgPoolAdapter
        adapter = PgPoolAdapter()
        text = adapter.config_text(self._cell({"auth_mode": "equalized"}))
        self.assertIn("enable_pool_hba = on", text)
        self.assertIn("scram-sha-256", text)
        with tempfile.TemporaryDirectory() as workdir:
            adapter.setup(workdir, self._cell({"auth_mode": "equalized"}))
            import os
            with open(os.path.join(workdir, "pool_hba.conf")) as f:
                hba = f.read()
            self.assertIn("scram-sha-256", hba)

    def test_other_adapters_tolerate_auth_mode(self):
        from poolduel.harness.adapters.direct import DirectAdapter
        from poolduel.harness.adapters.pgbouncer import PgBouncerAdapter
        from poolduel.harness.adapters.pgcat import PgCatAdapter
        from poolduel.harness.adapters.supavisor import SupavisorAdapter
        cell = self._cell({"auth_mode": "equalized"})
        for maker in (DirectAdapter, PgBouncerAdapter, PgCatAdapter,
                      SupavisorAdapter):
            text = maker().config_text(cell)
            self.assertTrue(text.strip())


class TestRunnerWiring(unittest.TestCase):
    def test_equalized_posture_recorded(self):
        from poolduel.harness.runner import build_record
        measurement = {"tps": 10.0, "latency_avg_ms": 1.0,
                       "latency_stddev_ms": 0.1, "p50_ms": 1.0,
                       "p90_ms": 1.5, "p99_ms": 2.0, "p999_ms": 3.0,
                       "failed": 0, "skipped": 0, "exit_code": 0,
                       "status": "measured"}
        cell = {"cell_id": "M9-E1", "workload": "select-only",
                "clients": 100, "pool_size": 10, "protocol": "simple",
                "churn": True, "duration_s": 60, "warmup_s": 30}
        rec = build_record(cell, "odyssey", "conf", measurement, "PG 17",
                           {}, 4, 1, 42,
                           auth_posture="scram-sha-256 on every frontend "
                                        "(M9-E1 equalized control)")
        self.assertIn("M9-E1", rec["auth_posture"])

    def test_default_posture_preserved(self):
        from poolduel.harness.runner import build_record
        measurement = {"tps": 10.0, "latency_avg_ms": 1.0,
                       "latency_stddev_ms": 0.1, "p50_ms": 1.0,
                       "p90_ms": 1.5, "p99_ms": 2.0, "p999_ms": 3.0,
                       "failed": 0, "skipped": 0, "exit_code": 0,
                       "status": "measured"}
        cell = {"cell_id": "M1-1", "workload": "select-only",
                "clients": 100, "pool_size": 10, "protocol": "simple",
                "churn": False, "duration_s": 120, "warmup_s": 30}
        rec = build_record(cell, "odyssey", "conf", measurement, "PG 17",
                           {}, 4, 1, 42)
        self.assertIn("none", rec["auth_posture"])


class TestM9CLI(unittest.TestCase):
    def test_list_m9(self):
        from poolduel.harness.cli import main
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = main(["--list-m9"])
        self.assertEqual(rc, 0)
        body = buf.getvalue()
        self.assertIn("m9r01", body)
        self.assertIn("M9-U-", body)

    def test_dry_run_k_chunk(self):
        from poolduel.harness.cli import main
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = main(["--matrix", "m9", "--chunk", "m9k01",
                       "--out", "/tmp/m9-test-out", "--dry-run"])
        self.assertEqual(rc, 0)
        body = buf.getvalue()
        self.assertIn("M9-K30", body)
        self.assertIn("seed=", body)
        self.assertIn("plan=12", body)

    def test_dry_run_e1_equalized(self):
        from poolduel.harness.cli import main
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = main(["--matrix", "m9", "--chunk", "m9e01",
                       "--out", "/tmp/m9-test-out", "--dry-run"])
        self.assertEqual(rc, 0)
        body = buf.getvalue()
        self.assertIn("M9-E1", body)
        self.assertIn("auth_mode", body)

    def test_dry_run_r_seeds_paired(self):
        from poolduel.harness.cli import main
        from poolduel.harness.m9 import m9_seed_for
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = main(["--matrix", "m9", "--chunk", "m9r01",
                       "--out", "/tmp/m9-test-out", "--dry-run"])
        self.assertEqual(rc, 0)
        lines = [ln for ln in buf.getvalue().splitlines()
                 if ln.startswith("M1-1 ")]
        by_rep = {}
        for ln in lines:
            tok = [t for t in ln.split() if t.startswith("r")
                   and t[1:].isdigit()][0]
            rep = int(tok[1:])
            seed = int(ln.split("seed=")[1].split()[0])
            by_rep.setdefault(rep, set()).add(seed)
        self.assertTrue(by_rep)
        for rep, seeds in by_rep.items():
            self.assertEqual(seeds, {m9_seed_for(rep)})

    def test_write_m9_na(self):
        import json
        import os
        import tempfile
        from poolduel.harness.cli import main
        with tempfile.TemporaryDirectory() as out:
            buf = io.StringIO()
            with redirect_stdout(buf):
                rc = main(["--matrix", "m9", "--write-na", "--out", out])
            self.assertEqual(rc, 0)
            raws = sorted(f for f in os.listdir(os.path.join(out, "raw"))
                          if f.endswith(".json"))
            self.assertEqual(len(raws), 6)
            with open(os.path.join(out, "raw", raws[0])) as f:
                rec = json.load(f)
            self.assertIsNone(rec["tps"])
            self.assertIn("N/A", rec["status"])


class TestM9Preflight(unittest.TestCase):
    def test_m9_checks_green(self):
        from poolduel.harness import check as check_mod
        self.assertEqual(check_mod.check_m9_coverage(), [])
        self.assertEqual(check_mod.check_m9_seeds(), [])
        self.assertEqual(check_mod.check_m9_supa_na_schema(), [])
        self.assertEqual(check_mod.check_m9_scale_init(), [])


if __name__ == "__main__":
    unittest.main()
