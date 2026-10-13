"""pgpool-II adapter (M1/M2: session-class, the only pooling mode).

Refs: https://www.pgpool.net/docs/latest/en/html/runtime-config-connection-pooling.html,
https://www.pgpool.net/docs/latest/en/html/runtime-config-connection.html

M2 variants from the cell's ``variant`` dict (grid.md section 3):
``num_init_children`` in {100, 200} and ``max_pool`` in {1, 4}. Without a
variant the M1 auto rule applies (children cover max clients, max_pool 4
unless the children x max_pool ceiling would exceed PG max_connections,
in which case 1; the 200x4 corner is forbidden and substituted with 200x1).
Cells without a variant render the M1 baseline byte-identically.

M9-E1 equalized control: ``auth_mode=equalized`` enables pool_hba with a
scram-sha-256 host entry (pgpool-II 4.7.2 docs chapter 6 Client
Authentication, section 6.2.4.2: pool_passwd plaintext entry plus a
scram-sha-256 pool_hba.conf line), so churn arms stop mixing auth costs.
CI startup proves the lookup; a rejection fails loudly at healthcheck.
"""

from .base import BaseAdapter


class PgPoolAdapter(BaseAdapter):
    NAME = "pgpool"
    BINARY = "pgpool"
    DEFAULT_PORT = 6434

    PG_MAX_CONNECTIONS = 300

    def variant(self, cell):
        return dict(cell.get("variant") or {})

    def num_children(self, cell):
        variant = self.variant(cell)
        if "num_init_children" in variant:
            children = int(variant["num_init_children"])
            if children not in (100, 200):
                raise ValueError(
                    "pgpool: num_init_children must be 100 or 200")
            return children
        return 200 if int(cell["clients"]) > 100 else 100

    def max_pool(self, cell):
        variant = self.variant(cell)
        if "max_pool" in variant:
            asked = int(variant["max_pool"])
            if asked not in (1, 4):
                raise ValueError("pgpool: max_pool must be 1 or 4")
            children = self.num_children(cell)
            if children * asked > self.PG_MAX_CONNECTIONS - 20:
                return 1  # forbidden corner (200x4) substituted with 200x1
            return asked
        children = self.num_children(cell)
        if children * 4 <= self.PG_MAX_CONNECTIONS - 20:
            return 4
        return 1

    def effective_backends(self, cell):
        return self.num_children(cell) * self.max_pool(cell)

    def auth_mode(self, cell):
        return self.variant(cell).get("auth_mode", "default")

    def pool_hba_text(self):
        # M9-E1 equalized frontend (pgpool-II 4.7.2 docs, chapter 6
        # Client Authentication, sections 6.1 + 6.2.4.2): with
        # enable_pool_hba on, pool_hba.conf beside pgpool.conf gates
        # frontends; the scram-sha-256 entry pairs with the workdir
        # pool_passwd plaintext benchuser entry. CI-only credentials.
        return ("# pool_hba.conf (M9-E1 equalized control)\n"
                "# refs: pgpool-II 4.7.2 docs ch.6 (6.1, 6.2.4.2)\n"
                "host all all 127.0.0.1/32 scram-sha-256\n")

    def config_text(self, cell):
        children = self.num_children(cell)
        pool = self.max_pool(cell)
        is_m1 = not self.variant(cell)
        equalized = self.auth_mode(cell) == "equalized"
        if equalized and self.variant(cell).keys() == {"auth_mode"}:
            label = ("M9-E1 equalized control (session-class, "
                     "pool_hba scram-sha-256)")
        else:
            label = ("M1 baseline (session-class, the only pooling mode)"
                     if is_m1
                     else "M2 variant (num_init_children=%d, max_pool=%d)"
                     % (children, pool))
            if equalized:
                label += " + equalized-auth"
        lines = (
            "# pgpool-II %s\n" % label +
            "# refs: runtime-config-connection-pooling.html, "
            "runtime-config-connection.html\n"
            "listen_addresses = '127.0.0.1'\n"
            "port = %d\n" % self.port +
            "backend_hostname0 = '127.0.0.1'\n"
            "backend_port0 = %d\n" % self.pg_port +
            "connection_cache = on\n"
            "max_pool = %d\n" % self.max_pool(cell) +
            "num_init_children = %d\n" % self.num_children(cell) +
            "reserved_connections = 0\n"
            "listen_backlog_multiplier = 2\n"
            "serialize_accept = off\n"
            "child_life_time = 300\n"
            "child_max_connections = 0\n"
            "connection_life_time = 0\n"
            "client_idle_limit = 0\n"
            "reset_query_list = 'ABORT; DISCARD ALL'\n"
            "load_balance_mode = off\n"
            "# auth (docs ch.6 Client Authentication, CI-only): frontend\n"
        )
        if equalized:
            lines += ("enable_pool_hba = on\n"
                      "# pool_hba.conf in this workdir carries the "
                      "scram-sha-256 host entry (6.2.4.2).\n")
        else:
            lines += ("# pool_hba stays disabled (default), backend SCRAM uses the\n"
                      "# workdir pool_passwd plaintext benchuser entry (6.2.4.1).\n")
        lines += ("# effective backends (children x max_pool) = %d\n"
                  % self.effective_backends(cell))
        return lines

    def pool_passwd_text(self):
        # Backend auth (pgpool-II 4.7.2 docs, chapter 6 Client
        # Authentication, section 6.2.4.1): pool_passwd must hold the
        # user password in plaintext (or AES) for SCRAM backend auth;
        # md5 entries cannot be used for scram. CI-only credentials.
        # pgpool resolves pool_passwd in its startup cwd, which the
        # shared runner sets to this workdir, so the file lands there.
        return "benchuser:benchpass\n"

    def setup(self, workdir, cell):
        super().setup(workdir, cell)
        self.write_file("pgpool.conf", self.config_text(cell))
        self.write_file("pool_passwd", self.pool_passwd_text())
        if self.auth_mode(cell) == "equalized":
            self.write_file("pool_hba.conf", self.pool_hba_text())

    def start_argv(self, cell):
        return [self.BINARY, "-f", self.workdir + "/pgpool.conf", "-n"]
