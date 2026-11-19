#!/usr/bin/env python3
"""Tester regression suite for the WebCrypto per-call quota in the upload probe.

The shipped page advertises 16 KB, 64 KB, and 256 KB payloads, and the
engine also accepts custom sizes up to 1 MB. WebCrypto's getRandomValues
throws QuotaExceededError when one call asks for more than 65536 bytes, so
the payload must be filled in quota-sized chunks (or by the Math.random
fallback when WebCrypto is unavailable).

This suite wraps crypto.getRandomValues in a hard 65536-byte quota gate:
the old single-call implementation throws at 256 KB and never POSTs, while
the chunked implementation passes every advertised size. It also proves the
no-WebCrypto fallback still builds and sends the largest accepted payload.

Stdlib plus Node only. Run: python3 netpulse/tests/test_upload_quota_chunks.py
"""
import http.server
import json
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUOTA = 65536
SIZES = (16384, 65536, 262144, 1048576)
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
const fs = require('fs'), vm = require('vm'), nodeCrypto = require('crypto');
const ECHO = process.argv[2];
const MODE = process.argv[3];
const SIZES = process.argv.slice(5).map(Number);
const calls = [];
const real = nodeCrypto.webcrypto;
function quotaCrypto() {
  return {
    getRandomValues(view) {
      calls.push(view.byteLength);
      if (view.byteLength > 65536) {
        const e = new Error('QuotaExceededError: ' + view.byteLength + ' exceeds 65536');
        e.name = 'QuotaExceededError';
        throw e;
      }
      return real.getRandomValues(view);
    }
  };
}
const sandbox = { console };
sandbox.window = sandbox; sandbox.self = sandbox;
sandbox.location = { href: 'http://127.0.0.1/index.html' };
sandbox.fetch = fetch; sandbox.AbortController = AbortController;
sandbox.performance = performance;
sandbox.setTimeout = setTimeout; sandbox.clearTimeout = clearTimeout;
sandbox.Uint8Array = Uint8Array;
if (MODE === 'quota') sandbox.crypto = quotaCrypto();
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(process.argv[4] + '/js/probes.js', 'utf8'), sandbox);
const P = sandbox.NetpulseProbes;
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
  console.log(JSON.stringify({ mode: MODE, calls: calls, results: results }));
})().catch((e) => { console.error('HARNESS ' + e.message); process.exit(1); });
"""


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def run_harness(echo_url, mode):
    if not shutil.which("node"):
        print("SKIP: node not installed")
        return None
    with tempfile.TemporaryDirectory() as tmp:
        harness = Path(tmp) / "upload-quota-harness.cjs"
        harness.write_text(NODE_HARNESS, encoding="utf-8")
        proc = subprocess.run(
            ["node", str(harness), echo_url, mode, str(ROOT / "netpulse")]
            + [str(size) for size in SIZES],
            capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        fail("node harness (%s) exited %d: %s" % (mode, proc.returncode, proc.stderr[-500:]))
        return None
    try:
        return json.loads(proc.stdout.strip().splitlines()[-1])
    except Exception as exc:
        fail("node harness (%s) returned unparseable output (%s): %r"
             % (mode, exc, proc.stdout[-500:]))
        return None


def check_rows(label, rows):
    if rows is None:
        return
    by_size = {row["size"]: row for row in rows}
    for size in SIZES:
        row = by_size.get(size)
        if row is None:
            fail("%s: size %d produced no run result" % (label, size))
            continue
        row_ok = (row["succeeded"] == 3 and row["attempts"] == 3
                  and row["payloadBytes"] == size
                  and len(row["sampleBytes"]) == 3
                  and all(b == size for b in row["sampleBytes"]))
        if row["succeeded"] != 3 or row["attempts"] != 3:
            fail("%s: size %d run succeeded %d/%d, errors: %s"
                 % (label, size, row["succeeded"], row["attempts"], row["errors"]))
        if row["payloadBytes"] != size:
            fail("%s: size %d recorded payloadBytes=%r" % (label, size, row["payloadBytes"]))
        if len(row["sampleBytes"]) != 3 or any(b != size for b in row["sampleBytes"]):
            fail("%s: size %d sample byte counts %r" % (label, size, row["sampleBytes"]))
        print("%s %s size %d: %d/%d samples, bytes %r"
              % ("PASS" if row_ok else "FAIL", label, size,
                 row["succeeded"], row["attempts"], row["sampleBytes"]))


def main():
    port = free_port()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), EchoHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    echo_url = "http://127.0.0.1:%d/echo" % port
    try:
        quota_run = run_harness(echo_url, "quota")
        fallback_run = run_harness(echo_url, "fallback")
    finally:
        server.shutdown()
        server.server_close()

    check_rows("quota", (quota_run or {}).get("results"))
    check_rows("fallback", (fallback_run or {}).get("results"))

    calls = (quota_run or {}).get("calls", [])
    if not calls:
        fail("quota harness saw zero getRandomValues calls")
    oversized = [n for n in calls if n > QUOTA]
    if oversized:
        fail("getRandomValues called with %r bytes, above the %d-byte quota"
             % (oversized, QUOTA))
    expected_min_calls = {16384: 1, 65536: 1, 262144: 4, 1048576: 16}
    if len(calls) < sum(expected_min_calls.values()):
        fail("quota harness saw %d getRandomValues calls, expected at least %d"
             % (len(calls), sum(expected_min_calls.values())))
    print("PASS quota: %d getRandomValues calls, max %d bytes, quota %d"
          % (len(calls), max(calls) if calls else 0, QUOTA))

    for size in SIZES:
        got = RECEIVED.count(size)
        if got != 6:
            fail("echo endpoint received %d requests of %d bytes, expected 6"
                 % (got, size))
        else:
            print("PASS echo %d: 6 requests of %d bytes" % (size, size))

    if FAILURES:
        print("UPLOAD QUOTA CHUNK TESTS: %d FAILING" % len(FAILURES))
        for failure in FAILURES:
            print("FAIL " + failure)
        return 1
    print("UPLOAD QUOTA CHUNK TESTS: ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
