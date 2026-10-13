"""PgBouncer adapter (M1: transaction pool_mode; M2: session/statement + I/O).

Refs: https://www.pgbouncer.org/config.html,
https://www.pgbouncer.org/features.html, https://www.pgbouncer.org/faq.html

M2 variants from the cell's ``variant`` dict (grid.md section 2):
``pool_mode`` in {transaction, session, statement} (default transaction)
and ``instances`` in {1, 2} (default 1). Two instances share the port via
``so_reuseport`` (modes.md section 2); the adapter launches both and the
shared runner's timeouts still own the run. Cells without a variant
render the M1 baseline byte-identically.
"""

import os
import subprocess

from .base import BaseAdapter


class PgBouncerAdapter(BaseAdapter):
    NAME = "pgbouncer"
    BINARY = "pgbouncer"
    DEFAULT_PORT = 6433

    POOL_MODES = ("transaction", "session", "statement")

    def __init__(self, port=None, pg_host="127.0.0.1", pg_port=5432):
        super().__init__(port=port, pg_host=pg_host, pg_port=pg_port)
        self.procs = []

    def variant(self, cell):
        return dict(cell.get("variant") or {})

    def pool_mode(self, cell):
        mode = self.variant(cell).get("pool_mode", "transaction")
        if mode not in self.POOL_MODES:
            raise ValueError("pgbouncer: unknown pool_mode %r" % (mode,))
        return mode

    def instances(self, cell):
        n = int(self.variant(cell).get("instances", 1))
        if n not in (1, 2):
            raise ValueError("pgbouncer: instances must be 1 or 2")
        return n

    def config_text(self, cell):
        pool_size = int(cell["pool_size"])
        mode = self.pool_mode(cell)
        n = self.instances(cell)
        max_prepared = 200 if cell.get("protocol") == "prepared" else 0
        reuse = 1 if n == 2 else 0
        label = ("M1 baseline (transaction mode)" if mode == "transaction"
                  and n == 1
                  else "M2 variant (pool_mode=%s, instances=%d)" % (mode, n))
        auth_file = (os.path.abspath(self.workdir) if self.workdir
                     else ".") + "/users.txt"
        return (
            "# PgBouncer %s\n" % label +
            "# refs: config.html, features.html, faq.html\n"
            "[pgbouncer]\n"
            "listen_addr = 127.0.0.1\n"
            "listen_port = %d\n" % self.port +
            "pool_mode = %s\n" % mode +
            "default_pool_size = %d\n" % pool_size +
            "max_client_conn = 500\n"
            "min_pool_size = 0\n"
            "reserve_pool_size = 0\n"
            "reserve_pool_timeout = 5.0\n"
            "# client auth (config.html Authentication settings):\n"
            "# scram-sha-256 against users.txt (plaintext benchpass entry,\n"
            "# CI-only). PgBouncer logs into PostgreSQL with the client's\n"
            "# password, so the benchuser/benchpass pair that pgbench\n"
            "# presents (PGPASSWORD in CI) also authenticates the backend.\n"
            "auth_type = scram-sha-256\n"
            "auth_file = %s\n" % auth_file +
            "server_reset_query = DISCARD ALL\n"
            "server_lifetime = 3600.0\n"
            "server_idle_timeout = 600.0\n"
            "query_wait_timeout = 120.0\n"
            "so_reuseport = %d\n" % reuse +
            "max_prepared_statements = %d\n" % max_prepared +
            "\n[databases]\n"
            "benchdb = host=127.0.0.1 port=%d dbname=benchdb\n" % self.pg_port
        )

    def users_text(self):
        # config.html: auth_file may hold plaintext passwords (CI-only).
        return '"benchuser" "benchpass"\n'

    def setup(self, workdir, cell):
        super().setup(workdir, cell)
        self.write_file("pgbouncer.ini", self.config_text(cell))
        self.write_file("users.txt", self.users_text())

    def start_argv(self, cell):
        return [self.BINARY, self.workdir + "/pgbouncer.ini"]

    def start(self):
        # M2 two-instance arm: both processes share the port via
        # so_reuseport (config guarantees reuse=1 when instances=2).
        # Timeouts and healthcheck discipline stay in the shared runner.
        if self.proc is not None or self.procs:
            from .base import AdapterError
            raise AdapterError("%s already started" % self.NAME)
        if self.workdir is None:
            from .base import AdapterError
            raise AdapterError("%s.setup() must run before start()" % self.NAME)
        n = self.instances(self._last_cell() or {})
        argv = self.start_argv(self._last_cell() or {})
        for i in range(n):
            proc = subprocess.Popen(
                argv, cwd=self.workdir,
                stdout=open(os.path.join(
                    self.workdir, "%s-%d.stdout.log" % (self.NAME, i)), "w"),
                stderr=open(os.path.join(
                    self.workdir, "%s-%d.stderr.log" % (self.NAME, i)), "w"))
            if i == 0:
                self.proc = proc
            else:
                self.procs.append(proc)

    def stop(self):
        procs = []
        if self.proc is not None:
            procs.append(self.proc)
            self.proc = None
        procs.extend(self.procs)
        self.procs = []
        if not procs:
            super().stop()
            return
        for proc in procs:
            proc.terminate()
        for proc in procs:
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=15)
