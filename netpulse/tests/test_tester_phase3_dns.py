#!/usr/bin/env python3
"""Tester regression for Netpulse Phase 3 DNS toolkit and egress identity
(Refs #489, PR #493).

Durable hostile-path suite authored by the Tester: drives js/dns.js,
js/identity.js, and pure js/webrtc.js in Node with real fetch against a
local stub, plus input-fuzz guards (cleanName, cleanUrl, parseAnswers,
normalizeEcho truncation, summarizeStats degenerate shapes, never-reject
contracts). Complements tests/test_dns_identity.py (happy-path live stub)
and tests/test_netpulse.py (static gate).

Stdlib only. Run: python3 netpulse/tests/test_tester_phase3_dns.py
"""
import http.server
import json
import shutil
import socket
import subprocess
import sys
import threading
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES = []


def fail(msg):
    FAILURES.append(msg)


DNS_FIXTURE = {
    "Status": 0,
    "Question": [{"name": "example.com", "type": 1}],
    "Answer": [{"name": "example.com.", "type": 1, "TTL": 60, "data": "93.184.215.14"}],
}
ECHO_FIXTURE = {"ip": "203.0.113.9"}


class Stub(http.server.BaseHTTPRequestHandler):
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
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif parsed.path == "/plain":
            body = b"not json"
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
  // cleanName fuzz: tester hostile inputs
  ok('t-clean-underscore', DNS.cleanName('bad_host.com') === null);
  ok('t-clean-long-label', DNS.cleanName('a'.repeat(64) + '.com') === null);
  ok('t-clean-trailing-dot', DNS.cleanName('example.com.') === 'example.com');
  ok('t-clean-upper', DNS.cleanName('EXAMPLE.COM') === 'example.com');
  ok('t-clean-null', DNS.cleanName(null) === null && DNS.cleanName(undefined) === null);
  ok('t-clean-300', DNS.cleanName('a'.repeat(300)) === null);
  // parseAnswers hostile shapes
  ok('t-parse-string-answer', DNS.parseAnswers({ Answer: 'x' }).length === 0);
  ok('t-parse-unknown-type', DNS.parseAnswers({ Answer: [{ name: 'x.', type: 9999, TTL: 1, data: 'v' }] })[0].type === 'TYPE9999');
  ok('t-parse-bad-ttl', DNS.parseAnswers({ Answer: [{ name: 'x.', type: 1, TTL: 'x', data: 'v' }] })[0].ttl === null);
  // bad record type fails closed, never rejects
  const badT = await DNS.query(DNS.RESOLVERS[0], 'example.com', 'BOGUS', { endpoint: BASE + '/dns-query' });
  ok('t-bad-type-closed', !badT.ok && /unsupported record type/.test(badT.error || ''));
  let rej = false;
  await DNS.query(DNS.RESOLVERS[0], 'example.com', 'A', { endpoint: 'http://127.0.0.1:1/x' }).catch(() => { rej = true; });
  ok('t-never-rejects', !rej);
  // live stub still honest
  const live = await DNS.query(DNS.RESOLVERS[0], 'example.com', 'A', { endpoint: BASE + '/dns-query' });
  ok('t-live-doh', live.ok && live.answers.length === 1 && typeof live.ms === 'number');
  // identity hostile
  ok('t-id-spaces', IDN.cleanUrl('https://a b') === null);
  const many = {};
  for (let i = 0; i < 100; i++) many['k' + i] = i;
  ok('t-id-truncate-25', IDN.normalizeEcho(many).length === 25);
  ok('t-id-nested-marker', IDN.normalizeEcho({ a: { x: 1 } })[0][1] === '{object, see raw}');
  const plain = await IDN.reveal('stub', BASE + '/plain', { force: true });
  ok('t-id-nonjson-closed', !plain.ok && /JSON/.test(plain.error || ''));
  IDN.clearCache();
  const e1 = await IDN.reveal('stub', BASE + '/echo');
  const e2 = await IDN.reveal('stub', BASE + '/echo');
  ok('t-id-cache', e1.ok && !e1.cached && e2.ok && e2.cached === true);
  // webrtc hostile shapes
  ok('t-wrtc-null-report', W.summarizeStats(null).pair === null);
  ok('t-wrtc-garbage', W.summarizeStats({ x: { nonsense: 1 } }).rttMs === null);
  ok('t-wrtc-inf-rtt', W.summarizeStats({ p: { type: 'candidate-pair', currentRoundTripTime: Infinity } }).rttMs === null);
  ok('t-wrtc-mdns-label', W.candidateLabel({ type: 'host', protocol: 'udp', address: 'a.local', port: 5 }).indexOf('masked') !== -1);
  const insp = await W.inspect({ RTCPeerConnection: undefined, navigator: { onLine: true } }, {});
  ok('t-wrtc-no-rtc-closed', !insp.ok && insp.candidates.length === 0);
  console.log(out.join('\n'));
})().catch(e => { console.log('FAIL harness ' + e.message); process.exit(1); });
"""


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main():
    if not shutil.which("node"):
        print("SKIP: node not installed")
        return 0
    # wiring gate: entrypoint must wire all three phase-3 engines
    html = (ROOT / "index.html").read_text(encoding="utf-8", errors="replace")
    for token in ["js/dns.js", "js/identity.js", "js/webrtc.js",
                  "tabpanel-dns", "btn-dns-compare", "btn-identity",
                  "btn-webrtc", "webrtc-body", "result-dns-raw"]:
        if token not in html:
            fail("index.html missing phase-3 wiring: " + token)
    port = free_port()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Stub)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = "http://127.0.0.1:%d" % port
    try:
        harness = ROOT / ".tmp-tester-phase3.cjs"
        harness.write_text(NODE_HARNESS, encoding="utf-8")
        try:
            proc = subprocess.run(
                ["node", str(harness), str(ROOT), base],
                capture_output=True, text=True, timeout=120)
        finally:
            harness.unlink(missing_ok=True)
        if proc.returncode != 0:
            fail("node harness exited %d: %s" % (proc.returncode, proc.stderr[-500:]))
        for line in proc.stdout.splitlines():
            if line.startswith("FAIL"):
                fail("engine: " + line)
        if not any(l.startswith("PASS t-live-doh") for l in proc.stdout.splitlines()):
            fail("harness produced no live results")
    finally:
        server.shutdown()
    if FAILURES:
        print("TESTER PHASE3 DNS REGRESSION: %d FAILING" % len(FAILURES))
        for f in FAILURES:
            print("FAIL " + f)
        return 1
    print("TESTER PHASE3 DNS REGRESSION: ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
