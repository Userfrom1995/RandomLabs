"""Supavisor adapter (M7 onboarding; measured in M9).

Refs: https://supabase.github.io/supavisor/configuration/pool_modes/,
https://supabase.github.io/supavisor/configuration/env/,
https://supabase.github.io/supavisor/development/installation/,
https://supabase.github.io/supavisor/development/setup/,
https://supabase.github.io/supavisor/connecting/authentication/

Modes come from the cell's ``variant`` dict: ``pool_mode`` in
{transaction, session, native} (default transaction, the M1-equivalent
arm; statement does not exist upstream, so the harness never renders
it and records N/A with reason where the matrix probes it). Native is
a direct passthrough (no multiplexing), still measured as a mode arm.

Contract discipline (identical to every other arm): the adapter only
renders the provisioning bundle and launches the release; timeouts,
warmup, invocation, and failure semantics stay in the shared runner.
setup() writes supavisor.env + tenant.json + metadata.sql +
SUPAVISOR_RUN.sh with absolute paths, exactly as the M7 smoke gate
(``harness/supavisor.py:smoke_gate``) inspects them.
"""

import os

from .. import supavisor as supavisor_mod
from .base import BaseAdapter


class SupavisorAdapter(BaseAdapter):
    NAME = "supavisor"
    BINARY = "supavisor"
    # Harness-assigned CI listener (upstream defaults are 6543
    # transaction / 5432 session; 5432 is PostgreSQL itself in CI, so
    # the harness remaps. The remap is documented in
    # docs/configs/supavisor.md and carries no performance claim).
    DEFAULT_PORT = 6437

    POOL_MODES = ("transaction", "session", "native")

    def variant(self, cell):
        return dict(cell.get("variant") or {})

    def pool_mode(self, cell):
        mode = self.variant(cell).get("pool_mode", "transaction")
        if mode not in self.POOL_MODES:
            raise ValueError(
                "supavisor: pool_mode %r unknown (statement does not "
                "exist upstream; record N/A)" % (mode,))
        return mode

    def config_text(self, cell):
        pool_size = int(cell["pool_size"])
        mode = self.pool_mode(cell)
        label = ("M9 matrix entry (pool_mode=%s)" % mode
                 if mode != "transaction"
                 else "M9 matrix entry (transaction mode)")
        lines = [
            "# Supavisor %s" % label,
            "# refs: configuration/pool_modes/, configuration/env/, "
            "development/setup/",
            "# pinned release: %s (SHA in artifact manifest)" %
            supavisor_mod.PINNED_VERSION,
            "# bundle: supavisor.env + tenant.json + metadata.sql + "
            "SUPAVISOR_RUN.sh",
            "# tenant login: %s (user.tenant rewrite, setup doc)" %
            supavisor_mod.TENANT_USER,
            supavisor_mod.env_text(pool_size),
            "# tenant PUT /api/tenants/%s payload:" % supavisor_mod.BENCH_TENANT,
            supavisor_mod.tenant_payload_json(pool_size, pool_mode=mode),
        ]
        return "\n".join(lines) + "\n"

    def run_script_text(self):
        # The exact release invocation CI execs (installation doc: Mix
        # release image). The smoke gate proves the binary resolves
        # post-build; unit machines without it fail loudly at startup.
        return (
            "#!/bin/sh\n"
            "# Supavisor release entrypoint (M9 matrix entry)\n"
            "# refs: development/installation/\n"
            "set -eu\n"
            'cd "$(dirname "$0")"\n'
            "set -a\n"
            ". ./supavisor.env\n"
            "set +a\n"
            'exec supavisor start\n'
        )

    def setup(self, workdir, cell):
        super().setup(workdir, cell)
        pool_size = int(cell["pool_size"])
        mode = self.pool_mode(cell)
        self.write_file("supavisor.env",
                        supavisor_mod.env_text(pool_size))
        self.write_file("tenant.json",
                        supavisor_mod.tenant_payload_json(
                            pool_size, pool_mode=mode))
        self.write_file("metadata.sql", supavisor_mod.metadata_sql())
        path = self.write_file("SUPAVISOR_RUN.sh",
                               self.run_script_text())
        os.chmod(path, 0o755)
        self.write_file("supavisor.conf.txt", self.config_text(cell))

    def start_argv(self, cell):
        return [self.workdir + "/SUPAVISOR_RUN.sh"]
