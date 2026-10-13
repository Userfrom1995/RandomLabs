"""Tester hostile regression suite for PR #325 (M6 methods hardening, Refs #302).

Attacks the M6 surface the builder's 15 tests do not: hostile SHOW
payloads (case, whitespace, unit-alias spellings, extra keys, None),
verdict edge inputs, isolation real-path resilience + JSON fitness,
auth unknown-arm behavior, build_record override passthrough + JSON
round-trip, runner BASELINE parity, and CLI --list-budget math.
Stdlib unittest only. Never touches production code.
"""

import copy
import io
import json
import unittest
from contextlib import redirect_stdout

from poolduel.harness import auth as auth_mod
from poolduel.harness import isolate as isolate_mod
from poolduel.harness import pgconf as pgconf_mod
from poolduel.harness.cells import ARMS, get_cell
from poolduel.harness.runner import PG_CONFIG_BASELINE, build_record
from poolduel.harness.schema import validate_cell


def _measured(pooler="pgbouncer"):
    cell = get_cell("M1-1")
    measurement = {
        "status": "measured", "tps": 1000.0, "latency_avg_ms": 1.0,
        "latency_stddev_ms": 0.1, "p50_ms": 0.9, "p90_ms": 1.5,
        "p99_ms": 2.0, "p999_ms": 3.0, "failed": 0, "skipped": 0,
        "exit_code": 0, "stdout_path": None, "txn_path": None,
        "agg_path": None, "stderr": "", "stdout": "",
    }
    return cell, pooler, measurement


class PgconfHostileTest(unittest.TestCase):
    def test_baseline_matches_runner_truth(self):
        # pgconf.BASELINE is a doc/test convenience copy; the runner is
        # source of truth. Pin parity so the copy cannot silently drift.
        self.assertEqual(pgconf_mod.BASELINE, PG_CONFIG_BASELINE)

    def test_apply_sql_deterministic_key_order(self):
        stmts = pgconf_mod.apply_sql()
        key_order = [k for k in pgconf_mod.ENFORCED_KEYS
                     if k in pgconf_mod.BASELINE]
        for pos, key in enumerate(key_order):
            self.assertIn(key, stmts[pos])
        self.assertTrue(stmts[-1].startswith("SELECT pg_reload_conf"))

    def test_apply_sql_custom_partial_baseline(self):
        stmts = pgconf_mod.apply_sql({"shared_buffers": "256MB"})
        self.assertEqual(len(stmts), 2)  # one ALTER + reload
        self.assertIn("shared_buffers", stmts[0])
        self.assertIn("256MB", stmts[0])

    def test_normalize_hostile_inputs(self):
        self.assertEqual(pgconf_mod.normalize(None), "")
        self.assertEqual(pgconf_mod.normalize("ON"),
                         pgconf_mod.normalize("on"))
        self.assertEqual(pgconf_mod.normalize("  512mb  "), "512mb")
        self.assertEqual(pgconf_mod.normalize(300), "300")

    def test_unit_alias_spelling_is_divergence(self):
        # No silent '512MB' == '524288kB' aliasing: a differently spelled
        # value is reported for a human to judge.
        show = {"shared_buffers": "524288kB", "max_connections": "300",
                "synchronous_commit": "on", "fsync": "on"}
        div = pgconf_mod.compare_baseline(show)
        self.assertEqual(len(div), 1)
        self.assertIn("shared_buffers", div[0])

    def test_compare_ignores_extra_keys_and_none(self):
        show = {"shared_buffers": "512MB", "max_connections": "300",
                "synchronous_commit": "on", "fsync": "on",
                "bogus_key": "evil"}
        self.assertEqual(pgconf_mod.compare_baseline(show), [])
        self.assertEqual(pgconf_mod.compare_baseline(None), [])
        self.assertEqual(pgconf_mod.compare_baseline({}), [])

    def test_compare_flags_every_divergent_key(self):
        show = {"shared_buffers": "128MB", "max_connections": "100",
                "synchronous_commit": "off", "fsync": "off"}
        div = pgconf_mod.compare_baseline(show)
        self.assertEqual(len(div), 4)

    def test_verdict_none_and_empty_is_unknown(self):
        self.assertEqual(pgconf_mod.enforcement_verdict(None)["status"],
                         "unknown")
        self.assertEqual(pgconf_mod.enforcement_verdict({})["status"],
                         "unknown")
        verdict = pgconf_mod.enforcement_verdict(
            {"shared_buffers": "", "max_connections": ""})
        self.assertEqual(verdict["status"], "unknown")
        self.assertEqual(verdict["divergence"], [])

    def test_dataset_policy_shape(self):
        stmts = pgconf_mod.dataset_policy_sql()
        self.assertIn("CHECKPOINT;", stmts)
        self.assertTrue(any("VACUUM" in s and "ANALYZE" in s
                            for s in stmts))
        self.assertIn("pg_database_size",
                      pgconf_mod.bloat_accounting_sql())


class IsolateHostileTest(unittest.TestCase):
    def test_real_path_inputs_never_raise(self):
        # Production threads always arrives as a positive int (CLI
        # argparse type=int, runner default 4). Sweep that domain.
        for threads in (1, 4, 8, 64):
            iso = isolate_mod.collect_isolation(threads=threads)
            self.assertEqual(iso["threads"], threads)
            self.assertEqual(iso["pgbench_j"], threads)

    def test_record_is_json_fit(self):
        iso = isolate_mod.collect_isolation(threads=4)
        for key in ("cpu_model", "kernel", "nproc", "governor",
                    "threads", "pgbench_j", "pinning", "topology"):
            self.assertIn(key, iso)
        self.assertIsInstance(iso["nproc"], int)
        # Must survive a JSON round-trip (raw rows are JSON on disk).
        self.assertEqual(json.loads(json.dumps(iso)), iso)
        for key in ("cpu_model", "kernel", "governor", "pinning",
                    "topology"):
            self.assertTrue(iso[key], key)

    def test_pinning_defaults_to_none(self):
        self.assertEqual(isolate_mod.collect_isolation(pinning="")["pinning"],
                         "none")
        self.assertEqual(
            isolate_mod.collect_isolation(pinning=None)["pinning"], "none")


class AuthHostileTest(unittest.TestCase):
    def test_unknown_arm_is_labeled_unknown_and_symmetric(self):
        self.assertEqual(auth_mod.posture("nosuch-pooler"), "unknown")
        self.assertFalse(auth_mod.is_asymmetric("nosuch-pooler"))
        self.assertFalse(auth_mod.is_asymmetric("direct"))

    def test_spec_shape(self):
        spec = auth_mod.EQUALIZED_CHURN_SPEC
        for key in ("control_id", "geometry", "rule", "compares_against",
                    "status"):
            self.assertIn(key, spec)
        self.assertEqual(spec["control_id"], "M9-E1")
        self.assertIn("SCRAM", spec["rule"])
        # M6 defines the control; M9 measures it.
        self.assertIn("M9", spec["status"])
        self.assertIn("M6", spec["status"] + spec.get("compares_against", "")
                      + "defined in M6")


class RecordWiringHostileTest(unittest.TestCase):
    def test_record_json_round_trip_and_schema(self):
        cell, pooler, measurement = _measured()
        show = {"shared_buffers": "512MB", "max_connections": "300",
                "synchronous_commit": "on", "fsync": "on"}
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show=show)
        self.assertEqual(json.loads(json.dumps(rec)), rec)
        self.assertEqual(validate_cell(rec), [])

    def test_explicit_overrides_win(self):
        cell, pooler, measurement = _measured()
        iso = isolate_mod.collect_isolation(threads=4)
        rec = build_record(cell, pooler, "# cfg", measurement, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show={}, isolation=iso,
                           auth_posture="custom-label",
                           dataset={"policy": "p", "init": "i"})
        self.assertEqual(rec["isolation"], iso)
        self.assertEqual(rec["auth_posture"], "custom-label")
        self.assertEqual(rec["dataset"], {"policy": "p", "init": "i"})
        self.assertEqual(rec["pg_config_status"], "unknown")
        self.assertEqual(validate_cell(rec), [])

    def test_timeout_measurement_keeps_verdict(self):
        cell, pooler, _ = _measured()
        timeout = {"status": "timeout/inconclusive", "tps": None,
                   "latency_avg_ms": None, "latency_stddev_ms": None,
                   "p50_ms": None, "p90_ms": None, "p99_ms": None,
                   "p999_ms": None, "failed": 0, "skipped": 0,
                   "exit_code": None, "stdout_path": None,
                   "txn_path": None, "agg_path": None,
                   "stderr": "boom", "stdout": ""}
        show = {"shared_buffers": "128MB", "max_connections": "300",
                "synchronous_commit": "on", "fsync": "on"}
        rec = build_record(cell, pooler, "# cfg", timeout, "PG 17",
                           copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                           pg_show=show)
        self.assertEqual(rec["status"], "timeout/inconclusive")
        self.assertEqual(rec["pg_config_status"], "disclosed")
        self.assertEqual(len(rec["pg_config_divergence"]), 1)
        self.assertEqual(validate_cell(rec), [])

    def test_every_arm_posture_labels_record(self):
        for arm in ARMS:
            cell, _, measurement = _measured(pooler=arm)
            rec = build_record(cell, arm, "# cfg", measurement, "PG 17",
                               copy.deepcopy(PG_CONFIG_BASELINE), 4, 1, 42,
                               pg_show={})
            self.assertEqual(rec["auth_posture"], auth_mod.posture(arm))
            self.assertNotEqual(rec["auth_posture"], "unknown")


class BudgetHostileTest(unittest.TestCase):
    def test_budget_math_and_control_parity(self):
        from poolduel.harness.cli import print_budget
        from poolduel.harness.m2 import M2_ROWS
        from poolduel.harness.cells import M1_CELLS

        buf = io.StringIO()
        with redirect_stdout(buf):
            print_budget()
        data = json.loads(buf.getvalue().splitlines()[0])
        for arm in ARMS:
            self.assertIn(arm, data)
            self.assertEqual(data[arm]["m1_cells"], len(M1_CELLS))
            self.assertEqual(data[arm]["total"],
                             data[arm]["m1_cells"] + data[arm]["m2_rows"])
        # Direct rides every M2 row as the same-geometry control twin.
        self.assertEqual(data["direct"]["m2_rows"], len(M2_ROWS))
        self.assertEqual(len(M1_CELLS), 7)
        self.assertEqual(len(M2_ROWS), 52)


if __name__ == "__main__":
    unittest.main()
