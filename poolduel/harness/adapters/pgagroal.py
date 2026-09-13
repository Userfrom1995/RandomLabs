"""pgagroal adapter (M1: transaction pipeline; M2: session/performance + I/O).

Refs: https://pgagroal.github.io/doc/CONFIGURATION.html,
https://pgagroal.github.io/doc/PIPELINES.html,
https://pgagroal.github.io/doc/ARCHITECTURE.html

Transaction-pipeline mandates (proven against upstream source
src/libpgagroal/configuration.c, transaction branch of the validator,
plus test/conf/01-02 which pin allow_unknown_users = false):
- users MUST be defined (user vault via ``-u``); the pooler refuses to
  start otherwise ("Users must be defined for the transaction pipeline");
- ``allow_unknown_users`` MUST be false ("Transaction pipeline does not
  support allow_unknown_users");
- every limit row needs max_size/initial_size/min_size ALL > 0
  ("Defining limits for the transaction pipeline is mandatory",
  "min_size/initial_size/max_size ... must be greater than 0").
  We prefill all connections (initial = max, min = max) per the
  PIPELINES prefill recommendation ("highly recommended that you
  prefill all connections for each user").

The vault is provisioned in setup() via ``pgagroal-admin`` (master key
plus benchuser entry, CI-only bench credential matching PGPASSWORD in
the sweep workflow). When the binary is absent (unit tests, dev
machines without an install) setup() skips provisioning and the pooler
fails loudly at startup with the upstream message; nothing is
invented.

M2 variants come from the cell's ``variant`` dict (grid.md section 1):
``pipeline`` in {transaction, session, performance} (default transaction,
the M1 arm; ``auto`` is never benchmarked, modes.md section 1) and
``ev_backend`` in {auto, io_uring, epoll} (default auto, the M1 arm).
The vault/limits shape is identical for every pipeline (session and
performance accept it too), so M1 cells render exactly as before apart
from the two transaction-mandated corrections above.
"""

import os
import shutil
import subprocess

from .base import AdapterError, BaseAdapter

BENCH_USER = "benchuser"
BENCH_PASSWORD = "benchpass"
BENCH_DATABASE = "benchdb"


class PgAgroalAdapter(BaseAdapter):
    NAME = "pgagroal"
    BINARY = "pgagroal"
    ADMIN_BINARY = "pgagroal-admin"
    DEFAULT_PORT = 6432

    PIPELINES = ("transaction", "session", "performance")
    EV_BACKENDS = ("auto", "io_uring", "epoll")

    def variant(self, cell):
        return dict(cell.get("variant") or {})

    def pipeline(self, cell):
        pipe = self.variant(cell).get("pipeline", "transaction")
        if pipe not in self.PIPELINES:
            raise ValueError("pgagroal: unknown pipeline %r" % (pipe,))
        return pipe

    def ev_backend(self, cell):
        ev = self.variant(cell).get("ev_backend", "auto")
        if ev not in self.EV_BACKENDS:
            raise ValueError("pgagroal: unknown ev_backend %r" % (ev,))
        return ev

    def config_text(self, cell):
        pool_size = int(cell["pool_size"])
        pipe = self.pipeline(cell)
        ev = self.ev_backend(cell)
        track = "on" if cell.get("protocol") == "prepared" else "off"
        # grid.md: blocking_timeout 0 in transaction mode (M1 baseline,
        # byte-identical); 120s in session/performance (M2). The 120s is
        # frontend-admission parity with PgBouncer query_wait_timeout=120s
        # and pgcat per-user connect_timeout=120s: queued session clients
        # wait for a backend instead of failing at connect time, while the
        # backend pool stays at the cell's pool_size for every arm.
        # (pgagroal CONFIGURATION.html: blocking_timeout is the time the
        # process blocks for a connection. Proven need: M2-S1..S4 failed
        # in 30.1s with FATAL connection pool is full on blocking 30s.)
        blocking = "0" if pipe == "transaction" else "120s"
        label = ("M1 baseline (transaction pipeline)" if pipe == "transaction"
                  and ev == "auto"
                  else "M2 variant (pipeline=%s, ev_backend=%s)" % (pipe, ev))
        return (
            "# pgagroal %s\n" % label +
            "# refs: CONFIGURATION.html, PIPELINES.html, ARCHITECTURE.html\n"
            "[pgagroal]\n"
            "host = 127.0.0.1\n"
            "port = %d\n" % self.port +
            "unix_socket_dir = /tmp\n"
            "max_connections = %d\n" % pool_size +
            "pipeline = %s\n" % pipe +
            "ev_backend = %s\n" % ev +
            "blocking_timeout = %s\n" % blocking +
            "idle_timeout = 0\n"
            "max_connection_age = 0\n"
            "validation = off\n"
            "track_prepared_statements = %s\n" % track +
            "nodelay = on\n"
            "keep_alive = on\n"
            "# allow_unknown_users = false is MANDATORY for the transaction\n"
            "# pipeline (upstream validator FATALs otherwise; test/conf/01-02\n"
            "# pin the same). benchuser is defined in the user vault\n"
            "# (pgagroal_users.conf via -u), provisioned in setup().\n"
            "allow_unknown_users = false\n"
            "log_type = console\n"
            "log_level = info\n"
            "# backend server section (CONFIGURATION.html: sections other\n"
            "# than [pgagroal] each configure one PostgreSQL backend;\n"
            "# without one the pooler has no server to pool)\n"
            "[primary]\n"
            "host = 127.0.0.1\n"
            "port = %d\n" % self.pg_port +
            "primary = on\n" +
            "# per-db pool (pgagroal_databases.conf): full\n"
            "# DATABASE USER MAX_SIZE INITIAL_SIZE MIN_SIZE triple, all > 0\n"
            "# (mandatory for the transaction pipeline); prefilled to max\n"
            "# per the PIPELINES prefill recommendation.\n"
            "# HBA (pgagroal_hba.conf, CI-only): scram-sha-256 so the\n"
            "# vault-known benchuser authenticates against PostgreSQL\n"
            "# itself (CONFIGURATION.html); `trust` cannot be used because\n"
            "# the pooler would then hold no password for the SCRAM backend.\n"
        )

    def databases_text(self, cell):
        pool_size = int(cell["pool_size"])
        return "%s %s %d %d %d\n" % (BENCH_DATABASE, BENCH_USER,
                                     pool_size, pool_size, pool_size)

    def hba_text(self):
        return "host benchdb benchuser 127.0.0.1/32 scram-sha-256\n"

    def users_path(self):
        return self.workdir + "/pgagroal_users.conf"

    def provision_users(self):
        """Create the user vault (master key + benchuser) via pgagroal-admin.

        Returns True when the vault file was (re)provisioned, False when
        pgagroal-admin is not installed (unit-test/dev path). Raises
        AdapterError on any provisioning failure so CI fails loudly
        before pgbench time is spent. Password travels via the
        PGAGROAL_PASSWORD env var (per pgagroal-admin(1)), never on the
        command line; stdin is DEVNULL so a credential prompt can never
        block the runner.
        """
        admin = shutil.which(self.ADMIN_BINARY)
        if admin is None:
            return False
        env = dict(os.environ, PGAGROAL_PASSWORD=BENCH_PASSWORD)
        key_path = os.path.join(os.path.expanduser("~"), ".pgagroal",
                                "master.key")
        try:
            if not os.path.exists(key_path):
                subprocess.run([admin, "master-key"],
                               env=env, stdin=subprocess.DEVNULL,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, check=True)
            users_file = self.users_path()
            if os.path.exists(users_file):
                os.remove(users_file)
            subprocess.run([admin, "-f", users_file, "-U", BENCH_USER,
                            "user", "add"],
                           env=env, stdin=subprocess.DEVNULL,
                           stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE, check=True)
        except (OSError, subprocess.CalledProcessError) as exc:
            raise AdapterError(
                "%s: user vault provisioning failed: %s"
                % (self.NAME, exc))
        return True

    def setup(self, workdir, cell):
        super().setup(workdir, cell)
        self.write_file("pgagroal.conf", self.config_text(cell))
        self.write_file("pgagroal_databases.conf",
                        self.databases_text(cell))
        self.write_file("pgagroal_hba.conf", self.hba_text())
        self.provision_users()

    def start_argv(self, cell):
        # Flags per pgagroal CLI: -c config, -a HBA, -l limit/databases
        # file, -u user vault (mandatory for the transaction pipeline).
        # -d is a daemon flag taking no argument. Foreground run.
        return [self.BINARY, "-c",
                self.workdir + "/pgagroal.conf", "-a",
                self.workdir + "/pgagroal_hba.conf", "-l",
                self.workdir + "/pgagroal_databases.conf", "-u",
                self.workdir + "/pgagroal_users.conf"]
