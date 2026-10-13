"""Direct-PG control arm: no pooler process, config records PG settings."""

from .base import BaseAdapter


class DirectAdapter(BaseAdapter):
    NAME = "direct"
    BINARY = ""
    DEFAULT_PORT = 5432

    def __init__(self, pg_host="127.0.0.1", pg_port=5432):
        super().__init__(port=pg_port, pg_host=pg_host, pg_port=pg_port)

    def config_text(self, cell):
        return (
            "# direct-PG control (no pooler)\n"
            "# docs: https://www.postgresql.org/docs/17/pgbench.html\n"
            "shared_buffers = 512MB\n"
            "max_connections = 300\n"
            "synchronous_commit = on\n"
            "fsync = on\n"
        )

    def start_argv(self, cell):
        raise RuntimeError("direct arm has no process to start")

    def start(self):
        # Control arm: nothing to launch. workdir must still be set.
        if self.workdir is None:
            from .base import AdapterError
            raise AdapterError("direct.setup() must run before start()")

    def healthcheck(self, timeout_s=30, host="127.0.0.1"):
        import socket
        import time
        deadline = time.time() + timeout_s
        last_err = None
        while time.time() < deadline:
            try:
                with socket.create_connection((host, self.port), timeout=2):
                    return True
            except OSError as exc:
                last_err = exc
                time.sleep(0.5)
        from .base import AdapterError
        raise AdapterError(
            "direct healthcheck failed on PG %s:%d: %s"
            % (host, self.port, last_err))

    def stop(self):
        return
