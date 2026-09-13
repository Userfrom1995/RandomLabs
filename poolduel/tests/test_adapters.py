import os
import tempfile
import unittest

from poolduel.harness.adapters import (DirectAdapter, OdysseyAdapter,
                                       PgAgroalAdapter, PgBouncerAdapter,
                                       PgCatAdapter, PgPoolAdapter)
from poolduel.harness.cells import get_cell


class AdapterTest(unittest.TestCase):
    def test_ports_distinct_and_direct_is_pg(self):
        ports = {PgAgroalAdapter().port, PgBouncerAdapter().port,
                 PgPoolAdapter().port, OdysseyAdapter().port,
                 PgCatAdapter().port, DirectAdapter().port}
        self.assertEqual(len(ports), 6)
        self.assertEqual(DirectAdapter().port, 5432)

    def test_config_text_per_cell_pool_size(self):
        cell = get_cell("M1-5")
        self.assertEqual(cell["pool_size"], 20)
        text = PgBouncerAdapter().config_text(cell)
        self.assertIn("default_pool_size = 20", text)
        self.assertIn("pool_mode = transaction", text)
        text = PgAgroalAdapter().config_text(cell)
        self.assertIn("max_connections = 20", text)
        self.assertIn("pipeline = transaction", text)

    def test_prepared_twin_mapping(self):
        cell = get_cell("M1-3")
        text = PgBouncerAdapter().config_text(cell)
        self.assertIn("max_prepared_statements = 200", text)
        simple = get_cell("M1-2")
        text = PgBouncerAdapter().config_text(simple)
        self.assertIn("max_prepared_statements = 0", text)

    def test_pgpool_children_and_no_forbidden_corner(self):
        heavy = get_cell("M1-4")
        ad = PgPoolAdapter()
        self.assertEqual(ad.num_children(heavy), 200)
        self.assertEqual(ad.max_pool(heavy), 1)
        self.assertLessEqual(ad.effective_backends(heavy), 300)
        text = ad.config_text(heavy)
        self.assertIn("num_init_children = 200", text)

    def test_setup_writes_files(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            for ad in (PgAgroalAdapter(), PgBouncerAdapter(),
                       PgPoolAdapter(), OdysseyAdapter(), PgCatAdapter()):
                work = tmp + "/" + ad.NAME
                ad.setup(work, cell)
                cfg = ad.config_text(cell)
                self.assertTrue(cfg)

    def test_no_adapter_timeout_attributes(self):
        # Adapters must not own warmup/retry/timeout knobs.
        for cls in (PgAgroalAdapter, PgBouncerAdapter, PgPoolAdapter,
                    OdysseyAdapter, PgCatAdapter):
            for attr in ("timeout", "warmup", "retries", "retry"):
                self.assertNotIn(attr, cls.__dict__)


class AdapterStartupFixTest(unittest.TestCase):
    """Regression tests for the CI startup/auth fixes (issue #302).

    Each case replays a proven sweep failure from run 34697687073 and
    pins the corrected rendering.
    """

    def test_setup_abspath_workdir(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            work = tmp + "/pgbouncer"
            ad = PgBouncerAdapter()
            ad.setup(work, cell)
            self.assertEqual(ad.workdir, os.path.abspath(work))
            self.assertTrue(ad.workdir.startswith("/"))

    def test_pgagroal_argv_flags(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            ad = PgAgroalAdapter()
            ad.setup(tmp + "/w", cell)
            argv = ad.start_argv(cell)
            self.assertEqual(argv[0], "pgagroal")
            self.assertIn("-c", argv)
            self.assertIn("-a", argv)
            self.assertIn("-l", argv)
            self.assertNotIn("-H", argv)
            self.assertNotIn("-f", argv)
            # every path argument is absolute (no doubling under cwd)
            for flag in ("-c", "-a", "-l"):
                path = argv[argv.index(flag) + 1]
                self.assertTrue(path.startswith("/"), path)

    def test_pgagroal_server_section_and_hba(self):
        cell = get_cell("M1-2")
        text = PgAgroalAdapter().config_text(cell)
        self.assertIn("[primary]", text)
        self.assertIn("port = 5432", text)
        self.assertIn("scram-sha-256", PgAgroalAdapter().hba_text())
        self.assertNotIn("trust", PgAgroalAdapter().hba_text())
        with tempfile.TemporaryDirectory() as tmp:
            ad = PgAgroalAdapter()
            ad.setup(tmp + "/w", cell)
            with open(tmp + "/w/pgagroal_hba.conf") as f:
                self.assertIn("scram-sha-256", f.read())

    def test_odyssey_storage_database_syntax(self):
        cell = get_cell("M1-2")
        text = OdysseyAdapter().config_text(cell)
        self.assertIn('storage "benchdb_store"', text)
        self.assertIn('type "remote"', text)
        self.assertIn('database "benchdb"', text)
        self.assertIn('user "benchuser"', text)
        self.assertIn('authentication "none"', text)
        self.assertIn('storage_user "benchuser"', text)
        self.assertIn('storage_password "benchpass"', text)
        self.assertIn('pool "transaction"', text)
        self.assertNotIn("route {", text)
        self.assertNotIn("service ", text)
        self.assertNotIn("backend_host", text)
        self.assertNotIn("server_pstmt_cache_size", text)

    def test_pgcat_admin_and_shards(self):
        cell = get_cell("M1-2")
        text = PgCatAdapter().config_text(cell)
        self.assertIn('admin_username = "pgcat_admin"', text)
        self.assertIn('admin_password = "pgcat_admin_pass"', text)
        self.assertIn("[pools.benchdb.shards.0]", text)
        self.assertIn('"primary"', text)
        self.assertIn('database = "benchdb"', text)

    def test_pgcat_session_admission_parity(self):
        # M1 transaction rendering stays byte-identical (no per-user
        # connect_timeout); session variants carry the 120s admission
        # parity with PgBouncer query_wait_timeout (M2-S9 artifact:
        # AllServersDown after the 1000ms default).
        from poolduel.harness import m2 as m2_mod
        m1 = PgCatAdapter().config_text(get_cell("M1-2"))
        self.assertNotIn("connect_timeout = 120000", m1)
        s9 = m2_mod.m2_cell("M2-S9")
        text = PgCatAdapter().config_text(s9)
        self.assertIn('pool_mode = "session"', text)
        self.assertIn("connect_timeout = 120000", text)
        self.assertIn("pool_size = 10", text)

    def test_pgbouncer_auth_file(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            ad = PgBouncerAdapter()
            ad.setup(tmp + "/w", cell)
            text = ad.config_text(cell)
            self.assertIn("auth_type = scram-sha-256", text)
            self.assertIn("auth_file = " + tmp + "/w/users.txt", text)
            with open(tmp + "/w/users.txt") as f:
                content = f.read()
            self.assertIn('"benchuser" "benchpass"', content)

    def test_pgpool_passwd(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            ad = PgPoolAdapter()
            ad.setup(tmp + "/w", cell)
            with open(tmp + "/w/pool_passwd") as f:
                content = f.read()
            self.assertIn("benchuser:benchpass", content)


if __name__ == "__main__":
    unittest.main()
