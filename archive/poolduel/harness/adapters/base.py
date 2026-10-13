"""Adapter interface. No adapter may add warmup, retries, or timeouts.

Timeouts, warmup, invocation, and failure semantics are owned by the
shared runner; adapters only render config, launch the pooler binary,
and answer a health probe. Healthcheck takes its timeout as a parameter
from the runner so no per-pooler special-casing hides inside adapters.
"""

import os
import socket
import subprocess
import time


class AdapterError(RuntimeError):
    pass


class BaseAdapter:
    NAME = "base"
    BINARY = ""
    DEFAULT_PORT = 6432

    def __init__(self, port=None, pg_host="127.0.0.1", pg_port=5432):
        self.port = port if port is not None else self.DEFAULT_PORT
        self.pg_host = pg_host
        self.pg_port = pg_port
        self.workdir = None
        self.proc = None

    # -- interface (override in subclasses) --
    def setup(self, workdir, cell):
        # Absolute workdir: adapters render config paths and argv from it,
        # and relative paths double up when the runner also sets cwd
        # (proven by CI workdirs: relative --out doubled config paths).
        self.workdir = os.path.abspath(workdir)
        self._cell = dict(cell)
        os.makedirs(workdir, exist_ok=True)

    def config_text(self, cell):
        raise NotImplementedError

    def start_argv(self, cell):
        raise NotImplementedError

    # -- shared lifecycle (identical for every arm) --
    def start(self):
        if self.proc is not None:
            raise AdapterError("%s already started" % self.NAME)
        if self.workdir is None:
            raise AdapterError("%s.setup() must run before start()" % self.NAME)
        argv = self.start_argv(self._last_cell() or {})
        self.proc = subprocess.Popen(
            argv, cwd=self.workdir,
            stdout=open(os.path.join(self.workdir, "%s.stdout.log" % self.NAME), "w"),
            stderr=open(os.path.join(self.workdir, "%s.stderr.log" % self.NAME), "w"))

    def _last_cell(self):
        return getattr(self, "_cell", None)

    def healthcheck(self, timeout_s=30, host="127.0.0.1"):
        """Wait until the pooler port accepts TCP, up to timeout_s."""
        deadline = time.time() + timeout_s
        last_err = None
        while time.time() < deadline:
            if self.proc is not None and self.proc.poll() is not None:
                raise AdapterError(
                    "%s exited during startup with rc=%s"
                    % (self.NAME, self.proc.returncode))
            try:
                with socket.create_connection((host, self.port), timeout=2):
                    return True
            except OSError as exc:
                last_err = exc
                time.sleep(0.5)
        raise AdapterError(
            "%s healthcheck failed after %ss on port %d: %s"
            % (self.NAME, timeout_s, self.port, last_err))

    def stop(self):
        proc, self.proc = self.proc, None
        if proc is None:
            return
        proc.terminate()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=15)

    def write_file(self, name, text):
        path = os.path.join(self.workdir, name)
        with open(path, "w") as f:
            f.write(text)
        return path
