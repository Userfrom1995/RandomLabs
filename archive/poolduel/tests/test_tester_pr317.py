"""Tester-owned hostile regression suite for PR #317 (issue #302).

Builder's AdapterStartupFixTest pins the five sweep-34697687073 startup/auth
fixes. This suite red-teams AROUND those fixes: adversarial variant inputs,
lifecycle guards, backend-ceiling math, and argv/config invariants the happy
path never exercises. CI-only bench credentials (benchuser/benchpass) match
the pre-existing harness fixtures.
"""

import os
import tempfile
import unittest
from unittest import mock

from poolduel.harness.adapters import (OdysseyAdapter, PgAgroalAdapter,
                                       PgBouncerAdapter, PgCatAdapter,
                                       PgPoolAdapter)
from poolduel.harness.adapters.base import AdapterError
from poolduel.harness.cells import get_cell


class StartupArgvHostileTest(unittest.TestCase):
    def test_every_argv_path_absolute_after_relative_setup(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            for cls in (PgAgroalAdapter, PgBouncerAdapter, PgPoolAdapter,
                        OdysseyAdapter, PgCatAdapter):
                ad = cls()
                ad.setup(tmp + "/rel-" + ad.NAME, cell)
                self.assertTrue(ad.workdir.startswith("/"))
                for tok in ad.start_argv(cell)[1:]:
                    if tok.startswith("-"):
                        continue
                    self.assertTrue(tok.startswith("/"),
                                    "%s argv token not absolute: %r"
                                    % (ad.NAME, tok))

    def test_pgagroal_no_daemon_or_host_flags(self):
        ad = PgAgroalAdapter()
        with tempfile.TemporaryDirectory() as tmp:
            ad.setup(tmp + "/w", get_cell("M1-2"))
            argv = ad.start_argv(get_cell("M1-2"))
        for bad in ("-d", "-H", "-f"):
            self.assertNotIn(bad, argv)

    def test_pgpool_foreground_and_conffile(self):
        ad = PgPoolAdapter()
        with tempfile.TemporaryDirectory() as tmp:
            ad.setup(tmp + "/w", get_cell("M1-2"))
            argv = ad.start_argv(get_cell("M1-2"))
        self.assertIn("-n", argv)
        self.assertIn("-f", argv)
        self.assertTrue(argv[argv.index("-f") + 1].endswith("pgpool.conf"))


class VariantValidationHostileTest(unittest.TestCase):
    def test_garbage_variants_raise_valueerror(self):
        bad_cells = [
            {"pool_size": 10, "variant": {"pipeline": "bogus"}},
            {"pool_size": 10, "variant": {"ev_backend": "bogus"}},
            {"pool_size": 10, "variant": {"pool": "bogus"}},
            {"pool_size": 10, "variant": {"workers": 3}},
            {"pool_size": 10, "variant": {"pool_mode": "bogus"}},
            {"pool_size": 10, "variant": {"instances": 3}},
            {"pool_size": 10, "variant": {"worker_threads": 3}},
            {"pool_size": 10, "clients": 50,
             "variant": {"num_init_children": 50}},
            {"pool_size": 10, "clients": 50, "variant": {"max_pool": 2}},
        ]
        calls = [
            lambda c: PgAgroalAdapter().pipeline(c),
            lambda c: PgAgroalAdapter().ev_backend(c),
            lambda c: OdysseyAdapter().pool(c),
            lambda c: OdysseyAdapter().workers(c),
            lambda c: PgBouncerAdapter().pool_mode(c),
            lambda c: PgBouncerAdapter().instances(c),
            lambda c: PgCatAdapter().worker_threads(c),
            lambda c: PgPoolAdapter().num_children(c),
            lambda c: PgPoolAdapter().max_pool(c),
        ]
        for cell, fn in zip(bad_cells, calls):
            with self.assertRaises(ValueError, msg=str(cell)):
                fn(cell)

    def test_pgcat_statement_always_rejected(self):
        with self.assertRaises(ValueError):
            PgCatAdapter().pool_mode(
                {"pool_size": 10, "variant": {"pool_mode": "statement"}})

    def test_forbidden_200x4_corner_substituted(self):
        ad = PgPoolAdapter()
        cell = {"pool_size": 20, "clients": 200,
                "variant": {"num_init_children": 200, "max_pool": 4}}
        self.assertEqual(ad.max_pool(cell), 1)
        self.assertEqual(ad.effective_backends(cell), 200)
        self.assertLessEqual(ad.effective_backends(cell), 300)

    def test_m1_heavy_cell_never_exceeds_pg_ceiling(self):
        ad = PgPoolAdapter()
        for mid in ("M1-1", "M1-2", "M1-3", "M1-4", "M1-5"):
            self.assertLessEqual(
                ad.effective_backends(get_cell(mid)), 300, mid)


class LifecycleGuardHostileTest(unittest.TestCase):
    def test_start_without_setup_raises_adapter_error(self):
        for cls in (PgAgroalAdapter, PgBouncerAdapter, PgPoolAdapter,
                    OdysseyAdapter, PgCatAdapter):
            with self.assertRaises(AdapterError, msg=cls.NAME):
                cls().start()

    def test_double_start_raises(self):
        with tempfile.TemporaryDirectory() as tmp:
            ad = OdysseyAdapter()
            ad.setup(tmp + "/o", get_cell("M1-2"))
            with mock.patch("subprocess.Popen"):
                ad.start()
                with self.assertRaises(AdapterError):
                    ad.start()
                ad.stop()

    def test_healthcheck_fast_fails_on_exited_proc(self):
        with tempfile.TemporaryDirectory() as tmp:
            ad = OdysseyAdapter(port=1)
            ad.setup(tmp + "/o", get_cell("M1-2"))

            class DeadProc:
                returncode = 1

                def poll(self):
                    return 1

                def terminate(self):
                    pass

                def wait(self, timeout=None):
                    pass

            ad.proc = DeadProc()
            with self.assertRaises(AdapterError):
                ad.healthcheck(timeout_s=3)
            ad.proc = None


class ConfigSemanticsHostileTest(unittest.TestCase):
    def test_pgagroal_blocking_rule_per_pipeline(self):
        ad = PgAgroalAdapter()
        self.assertIn("blocking_timeout = 0",
                      ad.config_text({"pool_size": 10}))
        self.assertIn("blocking_timeout = 120s",
                      ad.config_text({"pool_size": 10,
                                      "variant": {"pipeline": "session"}}))

    def test_pgbouncer_reuseport_only_for_two_instances(self):
        ad = PgBouncerAdapter()
        self.assertIn("so_reuseport = 0",
                      ad.config_text({"pool_size": 10}))
        self.assertIn("so_reuseport = 1",
                      ad.config_text({"pool_size": 10,
                                      "variant": {"instances": 2}}))

    def test_odyssey_reserve_follows_protocol(self):
        ad = OdysseyAdapter()
        self.assertIn("pool_reserve_prepared_statement yes",
                      ad.config_text({"pool_size": 10,
                                      "protocol": "prepared"}))
        self.assertIn("pool_reserve_prepared_statement no",
                      ad.config_text({"pool_size": 10}))

    def test_setup_writes_match_config_text(self):
        cell = get_cell("M1-2")
        expected = {"pgagroal": "pgagroal.conf", "pgbouncer": "pgbouncer.ini",
                    "pgpool": "pgpool.conf", "odyssey": "odyssey.conf",
                    "pgcat": "pgcat.toml"}
        with tempfile.TemporaryDirectory() as tmp:
            for cls in (PgAgroalAdapter, PgBouncerAdapter, PgPoolAdapter,
                        OdysseyAdapter, PgCatAdapter):
                ad = cls()
                work = os.path.join(tmp, ad.NAME)
                ad.setup(work, cell)
                with open(os.path.join(work, expected[ad.NAME])) as f:
                    self.assertEqual(f.read(), ad.config_text(cell))


if __name__ == "__main__":
    unittest.main()
