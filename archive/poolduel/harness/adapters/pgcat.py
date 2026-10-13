"""pgcat adapter (M1: transaction pool_mode; M2: session + worker_threads).

Refs: https://github.com/postgresml/pgcat/blob/main/CONFIG.md,
https://github.com/postgresml/pgcat/blob/main/README.md

M2 variants from the cell's ``variant`` dict (grid.md section 5):
``pool_mode`` in {transaction, session} (default transaction; statement is
declared but documented UNSUPPORTED, modes.md section 5, so the harness
never renders it) and ``worker_threads`` in {1, 5} (default 5, the M1 arm).
Cells without a variant render the M1 baseline byte-identically.
"""

from .base import BaseAdapter


class PgCatAdapter(BaseAdapter):
    NAME = "pgcat"
    BINARY = "pgcat"
    DEFAULT_PORT = 6436

    POOL_MODES = ("transaction", "session")

    def variant(self, cell):
        return dict(cell.get("variant") or {})

    def pool_mode(self, cell):
        mode = self.variant(cell).get("pool_mode", "transaction")
        if mode not in self.POOL_MODES:
            raise ValueError(
                "pgcat: pool_mode %r unsupported (statement is N/A)" % (mode,))
        return mode

    def worker_threads(self, cell):
        threads = int(self.variant(cell).get("worker_threads", 5))
        if threads not in (1, 5):
            raise ValueError("pgcat: worker_threads must be 1 or 5")
        return threads

    def config_text(self, cell):
        pool_size = int(cell["pool_size"])
        mode = self.pool_mode(cell)
        threads = self.worker_threads(cell)
        label = ("M1 baseline (transaction mode, file: pgcat.toml)"
                 if mode == "transaction" and threads == 5
                 else "M2 variant (pool_mode=%s, worker_threads=%d)"
                 % (mode, threads))
        # Session admission parity (M2 only; M1 transaction rendering is
        # byte-identical): per-user connect_timeout 120000ms matches
        # PgBouncer query_wait_timeout=120s and pgagroal
        # blocking_timeout=120s, so queued session clients wait for a
        # server connection instead of aborting after the 1000ms default.
        # (pgcat CONFIG.md: general.connect_timeout is "similar to
        # PgBouncer's query_wait_timeout"; the per-user key inherits the
        # global when unset. Proven need: M2-S9 failed in 1.0s with
        # FATAL could not get connection from the pool - AllServersDown
        # on the 1000ms default.) The backend pool stays pool_size.
        user_connect_timeout = (
            "" if mode == "transaction"
            else "connect_timeout = 120000\n")
        return (
            "# pgcat %s\n" % label +
            "# refs: CONFIG.md, README.md, pgcat.toml example\n"
            "[general]\n"
            'host = "0.0.0.0"\n'
            "port = %d\n" % self.port +
            "connect_timeout = 1000\n"
            "idle_timeout = 30000\n"
            "server_lifetime = 86400000\n"
            "worker_threads = %d\n" % threads +
            "# admin console credentials (CONFIG.md: general.admin_username\n"
            "# / admin_password are required fields; CI-only values)\n"
            'admin_username = "pgcat_admin"\n'
            'admin_password = "pgcat_admin_pass"\n'
            "\n[pools.benchdb]\n"
            'pool_mode = "%s"\n' % mode +
            'load_balancing_mode = "random"\n'
            'default_role = "any"\n'
            "query_parser_enabled = true\n"
            "primary_reads_enabled = true\n"
            "prepared_statements_cache_size = 0\n"
            "\n[pools.benchdb.users.0]\n"
            'username = "benchuser"\n'
            'password = "benchpass"\n'
            "pool_size = %d\n" % pool_size +
            user_connect_timeout +
            "# single-shard layout (CONFIG.md pools.<pool>.shards.<idx>:\n"
            "# servers are [host, port, role] triples, database selects\n"
            "# the backend database; one primary shard, no replicas)\n"
            "\n[pools.benchdb.shards.0]\n"
            'servers = [ ["127.0.0.1", %d, "primary"] ]\n' % self.pg_port +
            'database = "benchdb"\n'
        )

    def setup(self, workdir, cell):
        super().setup(workdir, cell)
        self.write_file("pgcat.toml", self.config_text(cell))

    def start_argv(self, cell):
        return [self.BINARY, self.workdir + "/pgcat.toml"]
