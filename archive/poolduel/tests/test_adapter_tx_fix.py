"""Regression suite for the transaction-pipeline fixes (issue #302).

Replays the proven sweep-34699523244 failures:
- pgagroal tip rc=1 "Users must be defined for the transaction pipeline"
  (validator: src/libpgagroal/configuration.c transaction branch
  requires users defined, allow_unknown_users = false, and a full
  max/initial/min limit triple all > 0);
- odyssey 1.5.1 rc=1 "log_format is not defined" (mandatory global per
  sources/config.c od_config_validate; value verbatim from upstream
  odyssey.conf).
"""

import os
import subprocess
import tempfile
import unittest
from unittest import mock

from poolduel.harness.adapters import OdysseyAdapter, PgAgroalAdapter
from poolduel.harness.adapters.base import AdapterError
from poolduel.harness.cells import get_cell


class PgAgroalTransactionMandatesTest(unittest.TestCase):
    def test_allow_unknown_users_is_false(self):
        text = PgAgroalAdapter().config_text({"pool_size": 10})
        self.assertIn("allow_unknown_users = false", text)
        self.assertNotIn("allow_unknown_users = true", text)

    def test_databases_triple_prefilled(self):
        ad = PgAgroalAdapter()
        for pool_size in (5, 10, 20):
            text = ad.databases_text({"pool_size": pool_size})
            parts = text.split()
            self.assertEqual(parts[:2], ["benchdb", "benchuser"])
            sizes = [int(x) for x in parts[2:5]]
            self.assertEqual(len(sizes), 3)
            for size in sizes:
                self.assertGreater(size, 0)
            self.assertEqual(sizes, [pool_size] * 3)

    def test_setup_writes_databases_matching_text(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch("shutil.which", return_value=None):
                ad = PgAgroalAdapter()
                ad.setup(tmp + "/w", cell)
                with open(tmp + "/w/pgagroal_databases.conf") as f:
                    self.assertEqual(f.read(),
                                     ad.databases_text(cell))

    def test_start_argv_carries_vault_flag(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch("shutil.which", return_value=None):
                ad = PgAgroalAdapter()
                ad.setup(tmp + "/w", cell)
                argv = ad.start_argv(cell)
        self.assertIn("-u", argv)
        for flag in ("-c", "-a", "-l", "-u"):
            path = argv[argv.index(flag) + 1]
            self.assertTrue(path.startswith("/"), path)
        self.assertTrue(argv[argv.index("-u") + 1].endswith(
            "pgagroal_users.conf"))

    def test_provision_skipped_without_admin_binary(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch("shutil.which", return_value=None), \
                    mock.patch("subprocess.run") as run:
                ad = PgAgroalAdapter()
                ad.setup(tmp + "/w", cell)
                run.assert_not_called()
                self.assertFalse(
                    os.path.exists(tmp + "/w/pgagroal_users.conf"))

    def test_provision_creates_key_and_user(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp + "/home"
            os.makedirs(home)
            with mock.patch.dict(os.environ, {"HOME": home}), \
                    mock.patch("shutil.which",
                               return_value="/usr/local/bin/pgagroal-admin"), \
                    mock.patch("subprocess.run") as run:
                run.return_value = mock.Mock(returncode=0)
                ad = PgAgroalAdapter()
                ad.setup(tmp + "/w", cell)
                self.assertEqual(run.call_count, 2)
                master_call, add_call = run.call_args_list
                self.assertEqual(
                    master_call[0][0],
                    ["/usr/local/bin/pgagroal-admin", "master-key"])
                self.assertEqual(
                    add_call[0][0],
                    ["/usr/local/bin/pgagroal-admin", "-f",
                     tmp + "/w/pgagroal_users.conf", "-U", "benchuser",
                     "user", "add"])
                for call in run.call_args_list:
                    _, kwargs = call
                    self.assertEqual(
                        kwargs["env"]["PGAGROAL_PASSWORD"], "benchpass")
                    self.assertIs(kwargs["stdin"], subprocess.DEVNULL)
                    self.assertTrue(kwargs["check"])
                # password never on the command line
                for call in run.call_args_list:
                    for tok in call[0][0]:
                        self.assertNotIn("benchpass", tok)

    def test_provision_skips_key_when_present(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp + "/home"
            os.makedirs(home + "/.pgagroal")
            with open(home + "/.pgagroal/master.key", "w") as f:
                f.write("existing")
            with mock.patch.dict(os.environ, {"HOME": home}), \
                    mock.patch("shutil.which",
                               return_value="/usr/local/bin/pgagroal-admin"), \
                    mock.patch("subprocess.run") as run:
                run.return_value = mock.Mock(returncode=0)
                ad = PgAgroalAdapter()
                ad.setup(tmp + "/w", cell)
                self.assertEqual(run.call_count, 1)
                self.assertEqual(
                    run.call_args[0][0][-3:], ["benchuser", "user", "add"])

    def test_provision_failure_raises_loudly(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp + "/home"
            os.makedirs(home)
            with mock.patch.dict(os.environ, {"HOME": home}), \
                    mock.patch("shutil.which",
                               return_value="/usr/local/bin/pgagroal-admin"), \
                    mock.patch("subprocess.run",
                               side_effect=subprocess.CalledProcessError(
                                   1, "pgagroal-admin")):
                ad = PgAgroalAdapter()
                with self.assertRaises(AdapterError):
                    ad.setup(tmp + "/w", cell)

    def test_transaction_mandates_hold_per_pipeline(self):
        # session/performance arms share the vault/limits shape.
        ad = PgAgroalAdapter()
        for pipe in ("transaction", "session", "performance"):
            cell = {"pool_size": 10, "variant": {"pipeline": pipe}}
            text = ad.config_text(cell)
            self.assertIn("pipeline = %s" % pipe, text)
            self.assertIn("allow_unknown_users = false", text)
            self.assertEqual(ad.databases_text(cell).split()[2:], ["10"] * 3)


class OdysseyLogFormatTest(unittest.TestCase):
    def test_log_format_and_stdout_present(self):
        text = OdysseyAdapter().config_text({"pool_size": 10})
        self.assertIn('log_format "%p %t %l [%i %s] (%c) %m\\n"', text)
        self.assertIn("log_to_stdout yes", text)

    def test_log_globals_hold_per_variant(self):
        ad = OdysseyAdapter()
        for variant in ({"pool": "session", "workers": 4},
                        {"pool": "statement"},
                        {"pool": "transaction", "workers": 2}):
            text = ad.config_text({"pool_size": 10, "variant": variant})
            self.assertIn("log_format", text)
            self.assertIn("log_to_stdout yes", text)

    def test_unix_socket_absent_so_no_mode_required(self):
        # sources/config.c only FATALs on unix_socket_mode when
        # unix_socket_dir is set; the harness sets neither.
        text = OdysseyAdapter().config_text(get_cell("M1-2"))
        self.assertNotIn("unix_socket_dir", text)
        self.assertNotIn("unix_socket_mode", text)


if __name__ == "__main__":
    unittest.main()
