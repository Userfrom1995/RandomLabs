"""M7 Supavisor-onboarding regression tests (Refs #302).

Covers plan section 8 + spec-v1.md s6: pinned version plus SHA rule,
provisioned env, metadata fixture, tenant payload, adapter contract,
schema/auth wiring, M9 equal budget, smoke gate, and CLI entry points.
Stdlib unittest only.
"""

import copy
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout

from poolduel.harness import auth as auth_mod
from poolduel.harness import supavisor as supavisor_mod
from poolduel.harness.adapters import supavisor as adapter_mod
from poolduel.harness.cells import ARMS, M1_CELLS, get_cell
from poolduel.harness.m2 import M2_ROWS
from poolduel.harness.runner import PG_CONFIG_BASELINE, build_record
from poolduel.harness.schema import (POOLER_VERSIONS, make_na_record,
                                      validate_cell)


def _cell(**over):
    cell = get_cell("M1-1")
    cell.update(over)
    return cell


def _good_env():
    return {"SECRET_KEY_BASE": "s", "VAULT_ENC_KEY": "0" * 32,
            "DATABASE_URL": "ecto://localhost/meta",
            "API_JWT_SECRET": "j"}


def _bundle(pool_size=10, mode="transaction"):
    return {
        "supavisor.env": supavisor_mod.env_text(pool_size),
        "tenant.json": supavisor_mod.tenant_payload_json(
            pool_size, pool_mode=mode),
        "metadata.sql": supavisor_mod.metadata_sql(),
        "SUPAVISOR_RUN.sh": "#!/bin/sh\nexec supavisor start\n",
    }


class TestPin(unittest.TestCase):
    def test_pinned_version(self):
        self.assertEqual(supavisor_mod.PINNED_VERSION, "v2.9.13")

    def test_sha_strips(self):
        self.assertEqual(
            supavisor_mod.pin_sha("  %s\n" % ("b" * 40)), "b" * 40)

    def test_empty_sha_blocking(self):
        for bad in ("", "   ", None):
            with self.assertRaises(ValueError):
                supavisor_mod.pin_sha(bad)

    def test_blocked_markers_rejected(self):
        # CI toolchain flakes write BLOCKED markers into
        # supavisor.sha; they must fail loudly here so the smoke
        # gate reports fail (matrix entry stays blocked) instead
        # of recording a pass on a fake SHA.
        for bad in ("BLOCKED:", "BLOCKED: no elixir toolchain",
                    "BLOCKED: hex install failed",
                    "BLOCKED: deps.get failed",
                    "abc123", "b" * 39, "b" * 41, "z" * 40):
            with self.assertRaises(ValueError):
                supavisor_mod.pin_sha(bad)


class TestEnv(unittest.TestCase):
    def test_required_keys_rendered(self):
        text = supavisor_mod.env_text(10)
        for key in supavisor_mod.REQUIRED_ENV:
            self.assertIn(key, text)
        self.assertIn("POOL_SIZE=10", text)
        self.assertIn("v2.9.13", text)

    def test_vault_length_enforced(self):
        with self.assertRaises(ValueError):
            supavisor_mod.env_text(10, vault_enc_key="short")

    def test_check_env_clean(self):
        self.assertEqual(supavisor_mod.check_env(_good_env()), [])

    def test_check_env_missing_and_short(self):
        env = _good_env()
        del env["DATABASE_URL"]
        env["VAULT_ENC_KEY"] = "short"
        errs = supavisor_mod.check_env(env)
        self.assertEqual(len(errs), 2)


class TestMetadataAndPayload(unittest.TestCase):
    def test_fixture_tables(self):
        sql = supavisor_mod.metadata_sql()
        self.assertIn("CREATE TABLE IF NOT EXISTS tenants", sql)
        self.assertIn("CREATE TABLE IF NOT EXISTS users", sql)
        self.assertIn("tenant_external_id", sql)

    def test_modes_accepted(self):
        for mode in ("transaction", "session", "native"):
            payload = supavisor_mod.tenant_payload(10, pool_mode=mode)
            self.assertEqual(payload["users"][0]["mode_type"], mode)

    def test_statement_rejected(self):
        with self.assertRaises(ValueError):
            supavisor_mod.tenant_payload(10, pool_mode="statement")

    def test_no_manager_bypass(self):
        payload = supavisor_mod.tenant_payload(10)
        user = payload["users"][0]
        self.assertTrue(user["require_user"])
        self.assertFalse(user["is_manager"])
        self.assertEqual(payload["external_id"], "bench")
        self.assertEqual(supavisor_mod.TENANT_USER, "benchuser.bench")

    def test_json_deterministic(self):
        first = supavisor_mod.tenant_payload_json(10)
        second = supavisor_mod.tenant_payload_json(10)
        self.assertEqual(first, second)
        self.assertEqual(json.loads(first)["users"][0]["pool_size"], 10)


class TestAdapterContract(unittest.TestCase):
    def test_identity(self):
        adapter = adapter_mod.SupavisorAdapter()
        self.assertEqual(adapter.NAME, "supavisor")
        self.assertEqual(adapter.BINARY, "supavisor")
        self.assertEqual(adapter.DEFAULT_PORT, 6437)

    def test_default_variant_is_transaction(self):
        adapter = adapter_mod.SupavisorAdapter()
        self.assertEqual(adapter.pool_mode(_cell()), "transaction")

    def test_session_and_native_variants(self):
        adapter = adapter_mod.SupavisorAdapter()
        self.assertEqual(
            adapter.pool_mode(_cell(variant={"pool_mode": "session"})),
            "session")
        self.assertEqual(
            adapter.pool_mode(_cell(variant={"pool_mode": "native"})),
            "native")

    def test_statement_rejected_as_na(self):
        adapter = adapter_mod.SupavisorAdapter()
        with self.assertRaises(ValueError):
            adapter.pool_mode(_cell(variant={"pool_mode": "statement"}))

    def test_setup_writes_bundle(self):
        adapter = adapter_mod.SupavisorAdapter(port=6440)
        with tempfile.TemporaryDirectory() as tmp:
            workdir = os.path.join(tmp, "work")
            adapter.setup(workdir, _cell())
            for name in ("supavisor.env", "tenant.json", "metadata.sql",
                         "SUPAVISOR_RUN.sh", "supavisor.conf.txt"):
                path = os.path.join(workdir, name)
                self.assertTrue(os.path.isfile(path), name)
            run = os.path.join(workdir, "SUPAVISOR_RUN.sh")
            self.assertTrue(os.access(run, os.X_OK))
            self.assertTrue(adapter.workdir.startswith("/"))
            argv = adapter.start_argv(_cell())
            self.assertEqual(argv, [run])
            self.assertTrue(argv[0].startswith("/"))

    def test_config_text_cites_upstream(self):
        adapter = adapter_mod.SupavisorAdapter()
        with tempfile.TemporaryDirectory() as tmp:
            adapter.setup(os.path.join(tmp, "w"), _cell())
            text = adapter.config_text(_cell())
        self.assertIn("v2.9.13", text)
        self.assertIn("benchuser.bench", text)
        self.assertIn("configuration/pool_modes", text)
        self.assertIn("configuration/env", text)

    def test_no_runner_owned_params_in_adapter(self):
        # Contract: timeouts/warmup/retries live in the shared runner.
        # The adapter must neither take a timeout parameter nor call
        # sleep/retry helpers; prose mentions of the contract are fine.
        import inspect

        source = inspect.getsource(adapter_mod)
        self.assertNotIn("timeout_s", source)
        self.assertNotIn("time.sleep", source)
        self.assertNotIn("retries", source.lower())
        for name in ("setup", "start_argv", "config_text"):
            params = inspect.signature(
                getattr(adapter_mod.SupavisorAdapter, name)).parameters
            self.assertNotIn("timeout_s", params)


class TestSchemaAndAuth(unittest.TestCase):
    def test_pooler_version_pinned(self):
        self.assertEqual(POOLER_VERSIONS["supavisor"], "v2.9.13")

    def test_measured_record_valid(self):
        cell = _cell()
        measurement = {
            "status": "measured", "tps": 5000.0, "latency_avg_ms": 2.0,
            "latency_stddev_ms": 0.2, "p50_ms": 1.8, "p90_ms": 3.0,
            "p99_ms": 4.0, "p999_ms": 6.0, "failed": 0, "skipped": 0,
            "exit_code": 0, "stdout_path": None, "txn_path": None,
            "agg_path": None, "stderr": "", "stdout": "",
        }
        rec = build_record(cell, "supavisor", "# cfg", measurement,
                           "PG 17", copy.deepcopy(PG_CONFIG_BASELINE),
                           4, 1, 42)
        self.assertEqual(validate_cell(rec), [])

    def test_na_statement_record_valid(self):
        cell = _cell()
        rec = make_na_record(cell, "supavisor", "N/A: no statement mode",
                             "PG 17", copy.deepcopy(PG_CONFIG_BASELINE),
                             4, 1, 42)
        self.assertEqual(validate_cell(rec), [])

    def test_posture_labeled_symmetric(self):
        label = auth_mod.posture("supavisor")
        self.assertNotEqual(label, "unknown")
        self.assertIn("scram", label.lower())
        self.assertFalse(auth_mod.is_asymmetric("supavisor"))

    def test_m1_m2_arms_frozen(self):
        # M1/M2 provenance is immutable: Supavisor enters via M9, so the
        # historical arm universe must not gain a member here.
        self.assertNotIn("supavisor", ARMS)
        self.assertEqual(len(M1_CELLS), 7)
        self.assertEqual(len(M2_ROWS), 52)


class TestBudget(unittest.TestCase):
    def test_m9_equal_budget(self):
        budget = supavisor_mod.M9_SUPAVISOR_BUDGET
        self.assertEqual(
            (budget["m1_cells"], budget["m2_rows"], budget["total"]),
            (7, 52, 59))

    def test_parity_against_matrix_totals(self):
        ok, detail = supavisor_mod.budget_parity_ok()
        self.assertTrue(ok, detail)
        self.assertIn("59", detail)

    def test_check_wiring(self):
        from poolduel.harness.check import check_supavisor_budget
        self.assertEqual(check_supavisor_budget(), [])


class TestSmokeGate(unittest.TestCase):
    def test_static_pass_with_sha(self):
        rows = supavisor_mod.smoke_gate(
            _bundle(), recorded_sha="a" * 40, env=_good_env())
        fails = [r for r in rows if r[1] == "fail"]
        self.assertEqual(fails, [])
        self.assertTrue(supavisor_mod.gate_passes(rows))
        # Live probes stay pending, never passes from static inspection.
        live = [r for r in rows if r[1] == "pending"]
        self.assertEqual(len(live), 4)

    def test_missing_sha_blocks(self):
        rows = supavisor_mod.smoke_gate(
            _bundle(), recorded_sha="", env=_good_env())
        self.assertFalse(supavisor_mod.gate_passes(rows))
        self.assertTrue(any(r[1] == "fail" and "SHA" in r[0]
                            for r in rows))

    def test_missing_artifact_blocks(self):
        bundle = _bundle()
        del bundle["tenant.json"]
        rows = supavisor_mod.smoke_gate(
            bundle, recorded_sha="a" * 40, env=_good_env())
        self.assertFalse(supavisor_mod.gate_passes(rows))

    def test_bad_env_blocks(self):
        env = _good_env()
        env["VAULT_ENC_KEY"] = "short"
        rows = supavisor_mod.smoke_gate(
            _bundle(), recorded_sha="a" * 40, env=env)
        self.assertFalse(supavisor_mod.gate_passes(rows))

    def test_session_bundle_passes(self):
        rows = supavisor_mod.smoke_gate(
            _bundle(mode="session"), recorded_sha="a" * 40,
            env=_good_env())
        self.assertTrue(supavisor_mod.gate_passes(rows))


class TestCli(unittest.TestCase):
    def test_load_adapters_has_supavisor(self):
        from poolduel.harness.cli import load_adapters
        adapters = load_adapters(["supavisor"])
        self.assertEqual(adapters["supavisor"].NAME, "supavisor")

    def test_list_budget_supavisor_line(self):
        from poolduel.harness.cli import print_budget
        buf = io.StringIO()
        with redirect_stdout(buf):
            print_budget()
        out = buf.getvalue()
        self.assertIn("supavisor (M9 entry, smoke-gated)", out)
        self.assertIn("M1 7 cells + M2 52 rows = 59", out)
        # First line stays the pure M1+M2 JSON universe.
        data = json.loads(out.splitlines()[0])
        for arm in ARMS:
            self.assertIn(arm, data)

    def test_smoke_supavisor_cli(self):
        from poolduel.harness.cli import build_parser, smoke_supavisor
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "out")
            args = build_parser().parse_args(
                ["--smoke-supavisor", "--out", out])
            old = os.environ.get("SUPAVISOR_SHA")
            os.environ["SUPAVISOR_SHA"] = "b" * 40
            try:
                buf = io.StringIO()
                with redirect_stdout(buf):
                    rc = smoke_supavisor(args)
            finally:
                if old is None:
                    del os.environ["SUPAVISOR_SHA"]
                else:
                    os.environ["SUPAVISOR_SHA"] = old
            self.assertEqual(rc, 0)
            self.assertIn("PASS", buf.getvalue())
            self.assertTrue(os.path.isfile(
                os.path.join(out, "supavisor-smoke", "tenant.json")))

    def test_smoke_supavisor_cli_blocked_without_sha(self):
        from poolduel.harness.cli import build_parser, smoke_supavisor
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "out")
            args = build_parser().parse_args(
                ["--smoke-supavisor", "--out", out])
            old = os.environ.get("SUPAVISOR_SHA")
            if "SUPAVISOR_SHA" in os.environ:
                del os.environ["SUPAVISOR_SHA"]
            try:
                buf = io.StringIO()
                with redirect_stdout(buf):
                    rc = smoke_supavisor(args)
            finally:
                if old is not None:
                    os.environ["SUPAVISOR_SHA"] = old
            self.assertEqual(rc, 1)
            self.assertIn("BLOCKED", buf.getvalue())


if __name__ == "__main__":
    unittest.main()
