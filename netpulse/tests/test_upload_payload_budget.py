#!/usr/bin/env python3
"""Tester regression suite for the advertised Netpulse upload payload sizes.

The shipped page offers 16 KB, 64 KB, and 256 KB upload payloads, and the
docs promise "16/64/256 KB". Every advertised size must actually leave the
browser: runUpload must build the generated payload, POST it to a live echo
endpoint, and report the real byte count for all three choices.

This suite found that the 256 KB choice fails before any request is sent:
probes.js fills the whole buffer with one crypto.getRandomValues() call, and
the WebCrypto quota is 65536 bytes, so Chromium (and Node webcrypto) throw
QuotaExceededError and the UI reports "could not build payload" with zero
POSTs. The 16 KB and 64 KB choices pass.

Stdlib only. Run: python3 netpulse/tests/test_upload_payload_budget.py
"""
import functools
import http.server
import json
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ADVERTISED_SIZES = (16384, 65536, 262144)
FAILURES = []
RECEIVED = []


def fail(msg):
    FAILURES.append(msg)


class EchoHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(length) if length else b""
        RECEIVED.append(len(body))
        payload = json.dumps({"received": len(body)}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


NODE_HARNESS = r"""
const fs = require('fs'), vm = require('vm');
const sandbox = { console };
sandbox.window = sandbox; sandbox.self = sandbox;
sandbox.location = { href: 'http://127.0.0.1/index.html' };
sandbox.fetch = fetch; sandbox.AbortController = AbortController;
sandbox.performance = performance;
sandbox.setTimeout = setTimeout; sandbox.clearTimeout = clearTimeout;
sandbox.crypto = require('crypto').webcrypto; sandbox.Uint8Array = Uint8Array;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(process.argv[2] + '/js/probes.js', 'utf8'), sandbox);
const P = sandbox.NetpulseProbes;
const ECHO = process.argv[3];
const SIZES = process.argv.slice(4).map(Number);
(async () => {
  const results = [];
  for (const size of SIZES) {
    const run = await P.runUpload(ECHO, size, 3);
    results.push({
      size: size,
      attempts: run.summary.attempts,
      succeeded: run.summary.succeeded,
      payloadBytes: run.payloadBytes,
      sampleBytes: run.samples.map((s) => s.bytes),
      errors: run.samples.map((s) => s.error || '').filter(Boolean)
    });
  }
  console.log(JSON.stringify(results));
})().catch((e) => { console.error('HARNESS ' + e.message); process.exit(1); });
"""


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def run_harness(echo_url):
    if not shutil.which("node"):
        print("SKIP: node not installed")
        return None
    with tempfile.TemporaryDirectory() as tmp:
        harness = Path(tmp) / "upload-budget-harness.cjs"
        harness.write_text(NODE_HARNESS, encoding="utf-8")
        proc = subprocess.run(
            ["node", str(harness), str(ROOT / "netpulse"), echo_url]
            + [str(size) for size in ADVERTISED_SIZES],
            capture_output=True, text=True, timeout=120)
    if proc.returncode != 0:
        fail("node harness exited %d: %s" % (proc.returncode, proc.stderr[-500:]))
        return None
    try:
        return json.loads(proc.stdout.strip().splitlines()[-1])
    except Exception as exc:
        fail("node harness returned unparseable output (%s): %r" % (exc, proc.stdout[-500:]))
        return None


def advertised_sizes_in_page():
    html = (ROOT / "netpulse" / "index.html").read_text(encoding="utf-8")
    return sorted(int(v) for v in re.findall(
        r'<option value="(\d+)"[^>]*>\s*\d+ KB</option>', html))


def main():
    documented = (ROOT / "netpulse" / "docs" / "index.md").read_text(encoding="utf-8")
    if "16/64/256 KB" not in documented:
        fail("docs no longer promise the 16/64/256 KB upload payloads")
    if tuple(advertised_sizes_in_page()) != ADVERTISED_SIZES:
        fail("index.html advertises %s, expected %s"
             % (advertised_sizes_in_page(), list(ADVERTISED_SIZES)))

    port = free_port()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), EchoHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    echo_url = "http://127.0.0.1:%d/echo" % port
    try:
        results = run_harness(echo_url)
    finally:
        server.shutdown()
        server.server_close()

    if results is None:
        pass
    else:
        by_size = {row["size"]: row for row in results}
        for size in ADVERTISED_SIZES:
            row = by_size.get(size)
            with_size = row is not None
            if not with_size:
                fail("size %d produced no run result" % size)
                continue
            if row["succeeded"] != 3 or row["attempts"] != 3:
                fail("size %d: UI-visible run succeeded %d/%d, errors: %s"
                     % (size, row["succeeded"], row["attempts"], row["errors"]))
            if row["payloadBytes"] != size:
                fail("size %d: run recorded payloadBytes=%r" % (size, row["payloadBytes"]))
            size_ok = (row["succeeded"] == 3 and row["attempts"] == 3
                       and row["payloadBytes"] == size
                       and bool(row["sampleBytes"])
                       and all(b == size for b in row["sampleBytes"]))
            if not all(b == size for b in row["sampleBytes"]) or not row["sampleBytes"]:
                fail("size %d: sample byte counts %r" % (size, row["sampleBytes"]))
            print("%s size %d: %d/%d samples, bytes %r"
                  % ("PASS" if size_ok else "FAIL", size,
                     row["succeeded"], row["attempts"], row["sampleBytes"]))
        for size in ADVERTISED_SIZES:
            got = RECEIVED.count(size)
            if got != 3:
                fail("echo endpoint received %d requests of %d bytes, expected 3"
                     % (got, size))
            else:
                print("PASS echo %d: 3 requests of %d bytes" % (size, size))

    if FAILURES:
        print("UPLOAD PAYLOAD BUDGET TESTS: %d FAILING" % len(FAILURES))
        for failure in FAILURES:
            print("FAIL " + failure)
        return 1
    print("UPLOAD PAYLOAD BUDGET TESTS: ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
