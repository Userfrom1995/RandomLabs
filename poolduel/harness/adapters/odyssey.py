"""Odyssey adapter (M1: transaction pool; M2: session/statement + workers).

Refs: https://pg-odyssey.tech/configuration/rules.html,
https://pg-odyssey.tech/configuration/global.html,
https://pg-odyssey.tech/features/pooling.html

M2 variants from the cell's ``variant`` dict (grid.md section 4):
``pool`` in {transaction, session, statement} (default transaction) and
``workers`` in {1, 2, 4} (default 1). The statement arm is provisional
(modes.md section 4: accepted by config, thin upstream prose): results
carry a provisional config comment and the empirical 26000 rule still
applies. Cells without a variant render the M1 baseline byte-identically.

M9-E1 equalized control: ``auth_mode=equalized`` switches the frontend
from CI-only ``none`` to ``scram-sha-256`` with a password, so churn
deltas measure multiplexing, not auth cost (rules.html authentication
+ password reference). CI startup proves the password form; a rejection
fails loudly at healthcheck, never silently.
"""

from .base import BaseAdapter


class OdysseyAdapter(BaseAdapter):
    NAME = "odyssey"
    BINARY = "odyssey"
    DEFAULT_PORT = 6435

    POOLS = ("transaction", "session", "statement")

    def variant(self, cell):
        return dict(cell.get("variant") or {})

    def pool(self, cell):
        pool = self.variant(cell).get("pool", "transaction")
        if pool not in self.POOLS:
            raise ValueError("odyssey: unknown pool %r" % (pool,))
        return pool

    def workers(self, cell):
        workers = int(self.variant(cell).get("workers", 1))
        if workers not in (1, 2, 4):
            raise ValueError("odyssey: workers must be 1, 2, or 4")
        return workers

    def auth_lines(self, cell):
        """Frontend auth lines: CI-only none, or SCRAM when equalized."""
        if self.variant(cell).get("auth_mode") == "equalized":
            return ['    authentication "scram-sha-256"',
                    '    password "benchpass"']
        return ['    authentication "none"']

    def config_text(self, cell):
        pool_size = int(cell["pool_size"])
        pool = self.pool(cell)
        workers = self.workers(cell)
        variant = self.variant(cell)
        if "pool_reserve_prepared_statement" in variant:
            reserve = "yes" if variant["pool_reserve_prepared_statement"] else "no"
        else:
            reserve = ("yes" if cell.get("protocol") == "prepared" else "no")
        prov = bool(variant.get("provisional", pool == "statement"))
        equalized = variant.get("auth_mode") == "equalized"
        label = ("M1 baseline (transaction pool, workers = 1)"
                 if pool == "transaction" and workers == 1 and not prov
                 and not equalized
                 else "M2 variant (pool=%s, workers=%d%s%s)"
                 % (pool, workers, ", provisional" if prov else "",
                    ", equalized-auth" if equalized else ""))
        lines = [
            "# Odyssey %s" % label,
            "# refs: rules.html, global.html, storage.html, "
            "features/pooling.html",
        ]
        if prov:
            lines.append("# PROVISIONAL statement arm: verify empirically "
                         "(modes.md section 4)")
        lines.extend([
            "workers %d" % workers,
            "resolvers 1",
            "backend_connect_timeout_ms 30000",
            # log_format is MANDATORY (odyssey 1.5.1 sources/config.c
            # od_config_validate FATALs "log_format is not defined"
            # otherwise); value verbatim from upstream odyssey.conf.
            # log_to_stdout keeps logs in the runner capture, matching
            # pgagroal log_type = console.
            'log_format "%p %t %l [%i %s] (%c) %m\\n"',
            "log_to_stdout yes",
            "listen {",
            '  host "127.0.0.1"',
            "  port %d" % self.port,
            "}",
            # Backend endpoint (storage.html): single remote PG node.
            'storage "benchdb_store" {',
            '  type "remote"',
            '  host "127.0.0.1"',
            "  port %d" % self.pg_port,
            "}",
            # Routing rule (rules.html): database/user blocks referencing
            # the storage. Frontend authentication "none" is CI-only (the
            # benchmark client is trusted); the backend leg always uses
            # storage_user/storage_password against PostgreSQL scram.
            # M9-E1 equalized control (auth_mode=equalized): frontend
            # scram-sha-256 with password (rules.html authentication +
            # password: plain/MD5/SCRAM secret accepted), so churn arms
            # stop mixing auth costs.
            'database "benchdb" {',
            '  user "benchuser" {',
        ])
        lines.extend(self.auth_lines(cell))
        lines.extend([
            '    storage "benchdb_store"',
            '    storage_user "benchuser"',
            '    storage_password "benchpass"',
            '    pool "%s"' % pool,
            "    pool_size %d" % pool_size,
            "    pool_discard yes",
            "    pool_smart_discard no",
            "    pool_cancel yes",
            "    pool_rollback yes",
            "    pool_timeout 0",
            "    pool_ttl 0",
            "    server_lifetime 3600",
            '    pool_reserve_prepared_statement %s' % reserve,
            "  }",
            "}",
        ])
        return "\n".join(lines) + "\n"

    def setup(self, workdir, cell):
        super().setup(workdir, cell)
        self.write_file("odyssey.conf", self.config_text(cell))

    def start_argv(self, cell):
        return [self.BINARY, self.workdir + "/odyssey.conf"]
