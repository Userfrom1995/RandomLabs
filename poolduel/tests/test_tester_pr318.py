"""Tester-owned hostile regression suite for PR #318 (issue #302).

Builder's test_adapter_tx_fix.py pins the 12 happy-path transaction mandates
(pgagroal vault + odyssey log_format). This suite red-teams AROUND those
fixes: the reviewer-caught `primary = on` regression, argv/config invariants,
provisioning edge cases (OSError, stale vault, env hygiene), and per-pipeline
rendering the happy path never exercises.
"""

import os
import subprocess
import tempfile
import unittest
from unittest import mock

from poolduel.harness.adapters import OdysseyAdapter, PgAgroalAdapter
from poolduel.harness.adapters.base import AdapterError
from poolduel.harness.cells import get_cell


class PgAgroalPrimaryHostileTest(unittest.TestCase):
    def test_primary_on_present_under_primary_section(self):
        # Reviewer catch on PR #318: the first revision silently dropped
        # `primary = on`. Pin it so it can never regress again.
        text = PgAgroalAdapter().config_text(get_cell("M1-2"))
        idx = text.index("[primary]")
        section = text[idx:]
        self.assertIn("primary = on", section)

    def test_primary_on_holds_per_pipeline(self):
        ad = PgAgroalAdapter()
        for pipe in ("transaction", "session", "performance"):
            cell = {"pool_size": 10, "variant": {"pipeline": pipe}}
            section = ad.config_text(cell).split("[primary]")[1]
            self.assertIn("primary = on", section)

    def test_config_and_docs_agree(self):
        with open("poolduel/docs/configs/pgagroal.md") as f:
            docs = f.read()
        self.assertIn("primary = on", docs)
        text = PgAgroalAdapter().config_text(get_cell("M1-2"))
        self.assertIn("primary = on", text)


class PgAgroalArgvHostileTest(unittest.TestCase):
    def test_vault_path_absolute_and_no_password_on_cmdline(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch("shutil.which", return_value=None):
                ad = PgAgroalAdapter()
                ad.setup(tmp + "/w", cell)
                argv = ad.start_argv(cell)
        self.assertIn("-u", argv)
        vault = argv[argv.index("-u") + 1]
        self.assertTrue(vault.startswith("/"), vault)
        self.assertTrue(vault.endswith("pgagroal_users.conf"), vault)
        for tok in argv:
            self.assertNotIn("benchpass", tok)

    def test_no_daemon_flag(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch("shutil.which", return_value=None):
                ad = PgAgroalAdapter()
                ad.setup(tmp + "/w", cell)
                argv = ad.start_argv(cell)
        self.assertNotIn("-d", argv)

    def test_blocking_timeout_per_pipeline(self):
        ad = PgAgroalAdapter()
        tx = ad.config_text({"pool_size": 10,
                             "variant": {"pipeline": "transaction"}})
        sess = ad.config_text({"pool_size": 10,
                               "variant": {"pipeline": "session"}})
        self.assertIn("blocking_timeout = 0", tx)
        self.assertIn("blocking_timeout = 120s", sess)


class PgAgroalProvisionHostileTest(unittest.TestCase):
    def test_oserror_raises_adapter_error(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp + "/home"
            os.makedirs(home)
            with mock.patch.dict(os.environ, {"HOME": home}), \
                    mock.patch("shutil.which",
                               return_value="/usr/bin/pgagroal-admin"), \
                    mock.patch("subprocess.run",
                               side_effect=OSError("no exec")):
                ad = PgAgroalAdapter()
                with self.assertRaises(AdapterError):
                    ad.setup(tmp + "/w", cell)

    def test_stale_vault_removed_before_readd(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp + "/home"
            os.makedirs(home)
            with mock.patch.dict(os.environ, {"HOME": home}), \
                    mock.patch("shutil.which",
                               return_value="/usr/bin/pgagroal-admin"), \
                    mock.patch("subprocess.run") as run:
                run.return_value = mock.Mock(returncode=0)
                ad = PgAgroalAdapter()
                ad.setup(tmp + "/w", cell)
                stale = tmp + "/w/pgagroal_users.conf"
                with open(stale, "w") as f:
                    f.write("stale-vault-contents")
                ad.setup(tmp + "/w", cell)
                self.assertFalse(os.path.exists(stale))

    def test_password_env_and_stdin_devnull(self):
        cell = get_cell("M1-2")
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp + "/home"
            os.makedirs(home)
            with mock.patch.dict(os.environ, {"HOME": home}), \
                    mock.patch("shutil.which",
                               return_value="/usr/bin/pgagroal-admin"), \
                    mock.patch("subprocess.run") as run:
                run.return_value = mock.Mock(returncode=0)
                ad = PgAgroalAdapter()
                ad.setup(tmp + "/w", cell)
                self.assertTrue(run.call_count >= 1)
                for call in run.call_args_list:
                    _, kwargs = call
                    self.assertEqual(
                        kwargs["env"]["PGAGROAL_PASSWORD"], "benchpass")
                    self.assertIs(kwargs["stdin"], subprocess.DEVNULL)
                    self.assertTrue(kwargs["check"])

    def test_databases_triple_hostile_sizes(self):
        ad = PgAgroalAdapter()
        for size in (1, 100):
            parts = ad.databases_text({"pool_size": size}).split()
            self.assertEqual(parts[:2], ["benchdb", "benchuser"])
            self.assertEqual([int(x) for x in parts[2:5]], [size] * 3)


class OdysseyGlobalsHostileTest(unittest.TestCase):
    def test_log_format_verbatim_all_variants(self):
        ad = OdysseyAdapter()
        want = 'log_format "%p %t %l [%i %s] (%c) %m\\n"'
        cells = [{"pool_size": 10},
                 {"pool_size": 10, "variant": {"pool": "session",
                                               "workers": 4}},
                 {"pool_size": 10, "variant": {"pool": "statement"}},
                 {"pool_size": 1, "variant": {"pool": "transaction",
                                              "workers": 2}}]
        for cell in cells:
            text = ad.config_text(cell)
            self.assertIn(want, text)
            self.assertIn("log_to_stdout yes", text)

    def test_no_unix_socket_globals(self):
        text = OdysseyAdapter().config_text(get_cell("M1-2"))
        self.assertNotIn("unix_socket_dir", text)
        self.assertNotIn("unix_socket_mode", text)

    def test_unknown_pool_workers_raise(self):
        ad = OdysseyAdapter()
        with self.assertRaises(ValueError):
            ad.config_text({"pool_size": 10,
                            "variant": {"pool": "bogus"}})
        with self.assertRaises(ValueError):
            ad.config_text({"pool_size": 10,
                            "variant": {"workers": 3}})


if __name__ == "__main__":
    unittest.main()
