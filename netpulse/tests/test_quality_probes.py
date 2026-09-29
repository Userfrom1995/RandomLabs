#!/usr/bin/env python3
"""Live regression tests for Netpulse Phase 2 quality probes (Refs #489).

Happy-path plus hostile-path coverage against the real shipped engine:
serves netpulse/ over local HTTP, drives js/probes.js in Node with real
fetch, and asserts honest failure semantics (404, POST-refused, NaN
guards, byte-based MB/s units, never-rejecting series).

Stdlib only. Run: python3 netpulse/tests/test_quality_probes.py
"""
import functools
import http.server
import json
import shutil
import socket
import subprocess
import sys
import threading
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES = []


def fail(msg):
    FAILURES.append(msg)


NODE_HARNESS = r"""
const fs = require('fs'), vm = require('vm');
const sandbox = { console };
sandbox.window = sandbox; sandbox.self = sandbox;
sandbox.location = { href: process.argv[3] + '/index.html' };
sandbox.fetch = fetch; sandbox.AbortController = AbortController;
sandbox.performance = performance;
sandbox.setTimeout = setTimeout; sandbox.clearTimeout = clearTimeout;
sandbox.crypto = require('crypto').webcrypto; sandbox.Uint8Array = Uint8Array;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(process.argv[2] + '/js/probes.js', 'utf8'), sandbox);
const P = sandbox.NetpulseProbes;
const BASE = process.argv[3];
const out = [];
const ok = (n, c) => out.push(((c ? 'PASS' : 'FAIL') + ' ' + n));
(async () => {
  ok('units-MBps', P.formatRate(2048) === '2 MB/s' && P.formatRate(512) === '512 KB/s');
  ok('units-never-megabits', !/Mb\/s/.test(P.formatRate(2048)) && !/Mb\/s/.test(P.formatRate(1 << 20)));
  ok('alias-parity', P.throughputKbps(1024, 1000) === P.throughputKBps(1024, 1000));
  ok('nan-guards', P.formatRate(NaN) === 'no data' && P.formatRate(Infinity) === 'no data'
    && P.formatRate(-1) === 'no data' && P.formatMs(NaN) === 'no data');
  const lat = await P.runLatency(BASE + '/probe.bin', 2);
  ok('live-latency', lat.summary.succeeded === 2 && lat.samples.every(s => s.ok && s.bytes > 0));
  const bad = await P.runLatency(BASE + '/nope.bin', 2);
  ok('hostile-404', bad.summary.failed === 2 && /HTTP 404/.test(bad.samples[0].error || ''));
  const up = await P.runUpload(BASE + '/probe.bin', 4096, 1);
  ok('hostile-upload', up.summary.succeeded === 0 && (up.samples[0].error || '').length > 0);
  let rejected = false;
  await P.runLatency(BASE + '/nope.bin', 1).catch(() => { rejected = true; });
  ok('never-rejects', !rejected);
  const mem = { m: {}, get(k) { return this.m[k]; }, set(k, v) { this.m[k] = v; } };
  P.saveRun(mem, lat); P.saveRun(mem, bad);
  const loss = P.lossApproximation(P.loadHistory(mem));
  ok('history-loss', loss.attempts === 4 && loss.failed === 2 && loss.successRate === 50);
  console.log(out.join('\n'));
})().catch(e => { console.log('FAIL harness ' + e.message); process.exit(1); });
"""


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def main():
    if not shutil.which('node'):
        print('SKIP: node not installed')
        return 0
    port = free_port()
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = 'http://127.0.0.1:%d' % port
    try:
        with urllib.request.urlopen(base + '/probe.bin', timeout=10) as r:
            body = r.read()
            if r.status != 200 or not body:
                fail('probe.bin must serve 200 with a body')
        try:
            urllib.request.urlopen(base + '/nope.bin', timeout=10)
            fail('missing asset must 404')
        except urllib.error.HTTPError as e:
            if e.code != 404:
                fail('missing asset must 404, got %d' % e.code)
        harness = ROOT / '.tmp-quality-harness.cjs'
        harness.write_text(NODE_HARNESS, encoding='utf-8')
        try:
            proc = subprocess.run(
                ['node', str(harness), str(ROOT), base],
                capture_output=True, text=True, timeout=90)
        finally:
            harness.unlink(missing_ok=True)
        if proc.returncode != 0:
            fail('node harness exited %d: %s' % (proc.returncode, proc.stderr[-500:]))
        for line in proc.stdout.splitlines():
            if line.startswith('FAIL'):
                fail('engine: ' + line)
        if not any(l.startswith('PASS live-latency') for l in proc.stdout.splitlines()):
            fail('engine harness produced no live results')
    finally:
        server.shutdown()
    if FAILURES:
        print('QUALITY PROBE LIVE TESTS: %d FAILING' % len(FAILURES))
        for f in FAILURES:
            print('FAIL ' + f)
        return 1
    print('QUALITY PROBE LIVE TESTS: ALL PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
