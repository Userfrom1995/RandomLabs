#!/usr/bin/env python3
"""Live regression tests for Netpulse Phase 3 DNS, identity, and WebRTC
engines (Refs #489).

Serves stub DoH-JSON and echo endpoints over local HTTP, drives
js/dns.js, js/identity.js, and the pure parts of js/webrtc.js in Node
with real fetch, and asserts honest failure semantics (invalid hostnames,
unreachable resolvers, non-JSON echoes, missing RTCPeerConnection).

Stdlib only. Run: python3 netpulse/tests/test_dns_identity.py
"""
import functools
import http.server
import json
import shutil
import socket
import subprocess
import sys
import threading
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES = []


def fail(msg):
    FAILURES.append(msg)


DNS_FIXTURE = {
    "Status": 0,
    "TC": False,
    "RD": True,
    "RA": True,
    "AD": False,
    "CD": False,
    "Question": [{"name": "example.com", "type": 1}],
    "Answer": [
        {"name": "example.com.", "type": 1, "TTL": 300, "data": "93.184.215.14"},
        {"name": "example.com.", "type": 1, "TTL": 300, "data": "93.184.216.14"},
    ],
}

ECHO_FIXTURE = {"ip": "203.0.113.7", "country": "Exampleland"}


class StubHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/dns-query":
            body = json.dumps(DNS_FIXTURE).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/dns-json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif parsed.path == "/echo":
            body = json.dumps(ECHO_FIXTURE).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif parsed.path == "/plain":
            body = b"not json at all"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()


NODE_HARNESS = r"""
const fs = require('fs'), vm = require('vm');
const sandbox = { console };
sandbox.window = sandbox; sandbox.self = sandbox;
sandbox.location = { href: process.argv[3] + '/index.html' };
sandbox.navigator = { onLine: true };
sandbox.fetch = fetch; sandbox.AbortController = AbortController;
sandbox.performance = performance;
sandbox.setTimeout = setTimeout; sandbox.clearTimeout = clearTimeout;
vm.createContext(sandbox);
for (const f of ['js/dns.js', 'js/identity.js', 'js/webrtc.js']) {
  vm.runInContext(fs.readFileSync(process.argv[2] + '/' + f, 'utf8'), sandbox);
}
const DNS = sandbox.NetpulseDNS, IDN = sandbox.NetpulseIdentity, W = sandbox.NetpulseWebRTC;
const BASE = process.argv[3];
const out = [];
const ok = (n, c) => out.push(((c ? 'PASS' : 'FAIL') + ' ' + n));
(async () => {
  ok('clean-valid', DNS.cleanName('  Example.COM. ') === 'example.com');
  ok('clean-rejects', DNS.cleanName('') === null && DNS.cleanName('http://x/y') === null
    && DNS.cleanName('bad host') === null && DNS.cleanName('-x.com') === null);
  const rows = DNS.parseAnswers({ Answer: [{ name: 'e.', type: 1, TTL: 5, data: '1.2.3.4' }, { bad: 1 }] });
  ok('parse-fixture', rows.length === 1 && rows[0].type === 'A' && rows[0].data === '1.2.3.4');
  const live = await DNS.query(DNS.RESOLVERS[0], 'example.com', 'A', { endpoint: BASE + '/dns-query' });
  ok('live-doh', live.ok && live.answers.length === 2 && live.answers[0].data === '93.184.215.14'
    && typeof live.ms === 'number' && live.ms >= 0 && !!live.raw);
  const missing = await DNS.query(DNS.RESOLVERS[0], 'example.com', 'A', { endpoint: BASE + '/absent' });
  ok('hostile-404', !missing.ok && /HTTP 404/.test(missing.error || ''));
  const dead = await DNS.query(DNS.RESOLVERS[0], 'example.com', 'A', { endpoint: 'http://127.0.0.1:1/dns-query' });
  ok('hostile-unreachable', !dead.ok && (dead.error || '').length > 0);
  const badName = await DNS.query(DNS.RESOLVERS[0], 'not a host!!', 'A', { endpoint: BASE + '/dns-query' });
  ok('invalid-hostname', !badName.ok && /valid hostname/.test(badName.error || ''));
  let rejected = false;
  await DNS.query(DNS.RESOLVERS[0], 'example.com', 'A', { endpoint: 'http://127.0.0.1:1/x' }).catch(() => { rejected = true; });
  ok('never-rejects', !rejected);
  const cmp = await DNS.compare('example.com', 'A', { endpoint: BASE + '/dns-query' });
  ok('compare-both', cmp.results.length === 2 && cmp.results.every(r => r.ok) && cmp.fastest !== null);
  ok('identity-clean', IDN.cleanUrl('https://api.ipify.org?format=json') !== null
    && IDN.cleanUrl('ftp://x') === null && IDN.cleanUrl('  ') === null);
  const echo = await IDN.reveal('stub', BASE + '/echo');
  ok('live-echo', echo.ok && !echo.cached && echo.rows.some(r => r[0] === 'ip' && r[1] === '203.0.113.7'));
  const echo2 = await IDN.reveal('stub', BASE + '/echo');
  ok('session-cache', echo2.ok && echo2.cached === true);
  const plain = await IDN.reveal('stub', BASE + '/plain', { force: true });
  ok('hostile-nonjson', !plain.ok && /JSON/.test(plain.error || ''));
  const off = await IDN.reveal('stub', 'not a url', { force: true });
  ok('invalid-url', !off.ok);
  let irej = false;
  await IDN.reveal('stub', 'http://127.0.0.1:1/echo', { force: true }).catch(() => { irej = true; });
  ok('identity-never-rejects', !irej);
  ok('webrtc-unsupported-honest', W.isSupported(sandbox) === false);
  const insp = await W.inspect(sandbox, {});
  ok('webrtc-fails-closed', !insp.ok && /not available/.test(insp.error || '') && insp.candidates.length === 0);
  ok('webrtc-kinds', W.addressKind('x.local') === 'mdns-masked' && W.addressKind('10.0.0.1') === 'ipv4');
  const sum = W.summarizeStats({ p: { type: 'candidate-pair', nominated: true, currentRoundTripTime: 0.05 },
    o: { type: 'outbound-rtp', packetsSent: 9, bytesSent: 90 } });
  ok('webrtc-stats', sum.pair !== null && Math.round(sum.rttMs) === 50 && sum.packetsSent === 9);
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
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), StubHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = 'http://127.0.0.1:%d' % port
    try:
        with urllib.request.urlopen(base + '/echo', timeout=10) as r:
            if r.status != 200 or json.loads(r.read()) != ECHO_FIXTURE:
                fail('stub echo must serve the fixture')
        harness = ROOT / '.tmp-dns-harness.cjs'
        harness.write_text(NODE_HARNESS, encoding='utf-8')
        try:
            proc = subprocess.run(
                ['node', str(harness), str(ROOT), base],
                capture_output=True, text=True, timeout=120)
        finally:
            harness.unlink(missing_ok=True)
        if proc.returncode != 0:
            fail('node harness exited %d: %s' % (proc.returncode, proc.stderr[-500:]))
        for line in proc.stdout.splitlines():
            if line.startswith('FAIL'):
                fail('engine: ' + line)
        if not any(l.startswith('PASS live-doh') for l in proc.stdout.splitlines()):
            fail('engine harness produced no live results')
    finally:
        server.shutdown()
    if FAILURES:
        print('DNS/IDENTITY LIVE TESTS: %d FAILING' % len(FAILURES))
        for f in FAILURES:
            print('FAIL ' + f)
        return 1
    print('DNS/IDENTITY LIVE TESTS: ALL PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
