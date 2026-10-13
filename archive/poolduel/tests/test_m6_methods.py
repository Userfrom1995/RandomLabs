"""M6 methods-hardening regression tests (Refs #302).

Covers plan section 9 + spec-v1.md section 3: PG enforcement verdict,
isolation records, auth-posture labels + equalized-churn spec, pgpool
backend labels, and CLI --list-budget parity. Stdlib unittest only.
"""

import copy
import io
import unittest
from contextlib import redirect_stdout

from poolduel.harness import auth as auth_mod
from poolduel.harness import isolate as isolate_mod
from poolduel.harness import pgconf as pgconf_mod
from poolduel.harness.cells import ARMS, get_cell
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


class TestPgconf(unittest.TestCase):
    def test_apply_sql_enforces_four_keys(self):
        stmts = pgconf_mod.apply_sql()
        joined = "\n".join(stmts)
        for key in pgconf_mod.ENFORCED_KEYS:
            self.assertIn(key, joined)
        self.assertTrue(stmts[-1].startswith("SELECT pg_reload_conf"))

    def test_compare_clean_snapshot(self):
        show = {"shared_buffers": "512MB", "max_connections": "300",
                "synchronous_commit": "on", "fsync": "on"}
        self.assertEqual(pgconf_mod.compare_baseline(show), [])

    def test_compare_flags_divergence(self):
        show = {"shared_buffers": "128MB", "max_connections": "300",
                "synchronous_commit": "on", "fsync": "on"}
        div = pgconf_mod.compare_baseline(show)
        self.assertEqual(len(div), 1)
        self.assertIn("shared_buffers", div[0])

    def test_verdict_states(self):
        self.assertEqual(
            pgconf_mod.enforcement_verdict({})["status"], "unknown")
        ok = pgconf_mod.enforcement_verdict(
            {"shared_buffers": "512MB", "max_connections": "300",
             "synchronous_commit": "on", "fsync": "on"})
        self.assertEqual(ok["status"], "enforced")
        bad = pgconf_mod.enforcement_verdict(
            {"shared_buffers": "128MB", "max_connections": "100",
             "synchronous_commit": "off", "fsync": "on"})
        self.assertEqual(bad["status"], "disclosed")
        self.assertEqual(len(bad["divergence"]), 3)

    def test_dataset_policy_sql(self):
        stmts = pgconf_mod.dataset_policy_sql()
        self.assertIn("CHECKPOINT;", stmts)
        self.assertTrue(any("VACUUM" in s for s in stmts))
        self.assertIn("db_size", pgconf_mod.bloat_accounting_sql())


class TestIsolation(unittest.TestCase):
    def test_keys_and_j_pinning(self):
        iso = isolate_mod.collect_isolation(threads=8)
        for key in ("cpu_model", "kernel", "nproc", "governor",
                    "threads", "pgbench_j", "pinning", "topology"):
            self.assertIn(key, iso)
        self.assertEqual(iso["threads"], 8)
        self.assertEqual(iso["pgbench_j"], 8)

    def test_never_raises(self):
        iso = isolate_mod.collect_isolation()
        self.assertIsInstance(iso, dict)


class TestAuth(unittest.TestCase):
    def test_all_arms_labeled(self):
        for arm in ARMS:
            label = auth_mod.posture(arm)
            self.assertIsInstance(label, str)
            self.assertNotEqual(label, "unknown")

    def test_asymmetry_set(self):
        self.assertTrue(auth_mod.is_asymmetric("odyssey"))
        self.assertTrue(auth_mod.is_asymmetric("pgpool"))
        self.assertFalse(auth_mod.is_asymmetric("pgbouncer"))
        self.assertFalse(auth_mod.is_asymmetric("direct"))

    def test_equalized_spec(self):
        spec = auth_mod.EQUALIZED_CHURN_SPEC
        self.assertEqual(spec["geometry"], "G-CHURN100")
        self.assertIn("SCRAM", spec["rule"])
        self.assertIn("M9", spec["status"])


class TestRecordWiring(unittest.TestCase):
    def test_build_record_carries_m6_fields(self):
        cell, pooler, measurement = _measured()
        show = {"shared_buffers": "512MB", "max_connections": "300",
                "synchronous_commit": "on", "fsync": "on"}
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show=show)
        self.assertEqual(rec["pg_config_status"], "enforced")
        self.assertEqual(rec["pg_config_divergence"], [])
        self.assertIn("pgbench_j", rec["isolation"])
        self.assertEqual(rec["auth_posture"],
                         auth_mod.posture(pooler))
        self.assertIn("policy", rec["dataset"])
        self.assertEqual(validate_cell(rec), [])

    def test_divergence_recorded_not_dropped(self):
        cell, pooler, measurement = _measured()
        show = {"shared_buffers": "128MB", "max_connections": "300",
                "synchronous_commit": "on", "fsync": "on"}
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show=show)
        self.assertEqual(rec["pg_config_status"], "disclosed")
        self.assertEqual(len(rec["pg_config_divergence"]), 1)
        self.assertEqual(validate_cell(rec), [])

    def test_old_rows_without_m6_fields_stay_valid(self):
        cell, pooler, measurement = _measured()
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show={})
        legacy = {k: v for k, v in rec.items()
                  if k not in ("pg_config_status", "pg_config_divergence",
                               "isolation", "auth_posture", "dataset")}
        legacy.pop("pg_show", None)
        self.assertEqual(validate_cell(legacy), [])


class TestPgpoolLabel(unittest.TestCase):
    def test_config_carries_children_x_max_pool(self):
        from poolduel.harness.adapters import pgpool as pgpool_mod
        adapter = pgpool_mod.PgPoolAdapter()
        cell = get_cell("M1-4")
        text = adapter.config_text(cell)
        self.assertIn("children x max_pool", text)
        self.assertIn("num_init_children", text)
        self.assertIn("max_pool", text)


class TestListBudget(unittest.TestCase):
    def test_budget_json_covers_all_arms(self):
        import json

        from poolduel.harness.cli import print_budget
        buf = io.StringIO()
        with redirect_stdout(buf):
            print_budget()
        first_line = buf.getvalue().splitlines()[0]
        data = json.loads(first_line)
        for arm in ARMS:
            self.assertIn(arm, data)
            self.assertEqual(data[arm]["m1_cells"], 7)
        # Structural spread published, not hidden.
        self.assertEqual(data["pgbouncer"]["m2_rows"], 12)
        self.assertEqual(data["pgpool"]["m2_rows"], 9)
        # Direct rides every M2 row as control.
        from poolduel.harness.m2 import M2_ROWS
        self.assertEqual(data["direct"]["m2_rows"], len(M2_ROWS))


if __name__ == "__main__":
    unittest.main()
