"""Tester hostile regression suite for M7 Supavisor onboarding (PR #326, Refs #302).

Durable traps proving the smoke gate cannot be fooled statically:
empty/corrupt/evil bundles block, whitespace SHAs block, live probes
stay pending-never-pass, vault/mode boundaries raise, ports collide
with no other arm. Stdlib unittest only.
"""

import json
import unittest

from poolduel.harness import supavisor as supavisor_mod
from poolduel.harness.adapters import supavisor as adapter_mod


def _good_env():
    return {"SECRET_KEY_BASE": "s", "VAULT_ENC_KEY": "0" * 32,
            "DATABASE_URL": "ecto://localhost/meta",
            "API_JWT_SECRET": "j"}


def _good_bundle(pool_size=10, mode="transaction"):
    return {
        "supavisor.env": supavisor_mod.env_text(pool_size),
        "tenant.json": supavisor_mod.tenant_payload_json(
            pool_size, pool_mode=mode),
        "metadata.sql": supavisor_mod.metadata_sql(),
        "SUPAVISOR_RUN.sh": "#!/bin/sh\nexec supavisor start\n",
    }


class TestTesterHostileGate(unittest.TestCase):
    def test_empty_bundle_blocks(self):
        rows = supavisor_mod.smoke_gate({}, recorded_sha="", env={})
        self.assertFalse(supavisor_mod.gate_passes(rows))
        self.assertTrue(any(s == "fail" for _, s, _ in rows))

    def test_corrupt_tenant_json_blocks(self):
        b = _good_bundle()
        b["tenant.json"] = "{corrupt"
        rows = supavisor_mod.smoke_gate(
            b, recorded_sha="a" * 40, env=_good_env())
        self.assertFalse(supavisor_mod.gate_passes(rows))

    def test_evil_tenant_shape_blocks(self):
        b = _good_bundle()
        b["tenant.json"] = json.dumps({
            "external_id": "evil",
            "users": [{"username": "root", "mode_type": "transaction"}]})
        rows = supavisor_mod.smoke_gate(
            b, recorded_sha="a" * 40, env=_good_env())
        self.assertFalse(supavisor_mod.gate_passes(rows))

    def test_whitespace_shas_block(self):
        for bad in ("   ", "\n\t ", None, ""):
            with self.assertRaises(ValueError):
                supavisor_mod.pin_sha(bad)

    def test_live_probes_pending_never_pass(self):
        rows = supavisor_mod.smoke_gate(
            _good_bundle(), recorded_sha="a" * 40, env=_good_env())
        live = [r for r in rows if r[1] == "pending"]
        self.assertEqual(len(live), 4)
        leaked = [r for r in rows if r[1] == "pass" and any(
            k in r[0] for k in ("binary", "migrated", "REST", "listener"))]
        self.assertEqual(leaked, [])

    def test_vault_boundaries(self):
        for n in (31, 33):
            with self.assertRaises(ValueError):
                supavisor_mod.env_text(10, vault_enc_key="x" * n)
            errs = supavisor_mod.check_env(
                dict(_good_env(), VAULT_ENC_KEY="x" * n))
            self.assertTrue(any("VAULT_ENC_KEY" in e for e in errs))

    def test_unknown_modes_rejected_both_layers(self):
        for bad in ("statement", "foobar", ""):
            with self.assertRaises(ValueError):
                supavisor_mod.tenant_payload(10, pool_mode=bad)
            with self.assertRaises(ValueError):
                adapter_mod.SupavisorAdapter().pool_mode(
                    {"variant": {"pool_mode": bad}})

    def test_port_collision_free(self):
        from poolduel.harness.cli import load_adapters
        ads = load_adapters(
            ["supavisor", "pgbouncer", "pgcat", "direct"])
        ports = [a.DEFAULT_PORT for a in ads.values()]
        self.assertEqual(len(set(ports)), len(ports))
        self.assertEqual(
            adapter_mod.SupavisorAdapter.DEFAULT_PORT, 6437)

    def test_budget_parity_and_m9_total(self):
        ok, detail = supavisor_mod.budget_parity_ok()
        self.assertTrue(ok, detail)
        b = supavisor_mod.M9_SUPAVISOR_BUDGET
        self.assertEqual(b["total"], b["m1_cells"] + b["m2_rows"])
        self.assertEqual((b["m1_cells"], b["m2_rows"]), (7, 52))


if __name__ == "__main__":
    unittest.main()
