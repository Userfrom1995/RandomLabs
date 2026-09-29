#!/usr/bin/env python3
"""Live regression tests for Netpulse Phase 4 traffic observer and monitor
dashboard engines (Refs #489).

Drives js/traffic.js and js/monitor.js in Node inside a vm sandbox with
fixture Resource Timing entries, a fake PerformanceObserver stream, and
hostile shapes (absent APIs, malformed entries, hidden cross-origin sizes).
Asserts honest semantics: hidden sizes flagged not zeroed, nulls fail
closed, observers disconnect, monitor series derive only from real runs.

Stdlib only. Run: python3 netpulse/tests/test_traffic_monitor.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES = []


def fail(msg):
    FAILURES.append(msg)


NODE_HARNESS = r"""
const fs = require('fs'), vm = require('vm');
function load(files, extra) {
  const sandbox = { console };
  sandbox.window = sandbox; sandbox.self = sandbox;
  sandbox.location = { href: 'https://netpulse.test/index.html' };
  sandbox.navigator = { onLine: true };
  Object.assign(sandbox, extra || {});
  vm.createContext(sandbox);
  for (const f of files) {
    vm.runInContext(fs.readFileSync(process.argv[2] + '/' + f, 'utf8'), sandbox);
  }
  return sandbox;
}
const out = [];
const ok = (n, c) => out.push(((c ? 'PASS' : 'FAIL') + ' ' + n));
const FIXTURES = [
  { name: 'https://netpulse.test/js/app.js', initiatorType: 'script', duration: 12.5,
    startTime: 3, transferSize: 1500, encodedBodySize: 1400, decodedBodySize: 1400,
    nextHopProtocol: 'h2' },
  { name: 'https://cdn.example/img.png', initiatorType: 'img', duration: 40,
    startTime: 20, transferSize: 0, encodedBodySize: 0, decodedBodySize: 5000,
    nextHopProtocol: '' },
  { name: 'https://netpulse.test/css/netpulse.css', initiatorType: 'link', duration: 8,
    startTime: 1, transferSize: 900, encodedBodySize: 880, decodedBodySize: 880,
    nextHopProtocol: 'h1' },
];

// Happy path: entries exposed, observer streams.
const live = load(['js/traffic.js', 'js/monitor.js'], {
  performance: { getEntriesByType: (t) => (t === 'resource' ? FIXTURES.slice() : []) },
  PerformanceObserver: function (cb) { this._cb = cb; },
});
live.PerformanceObserver.prototype.observe = function () {
  const self = this;
  self._timer = setTimeout(() => {
    self._cb({ getEntries: () => [FIXTURES[0]] });
  }, 5);
};
live.PerformanceObserver.prototype.disconnect = function () { clearTimeout(this._timer); };
const T = live.NetpulseTraffic, M = live.NetpulseMonitor;
ok('supported', T.isSupported(live) === true);
const rows = T.snapshot(live);
ok('snapshot-rows', rows.length === 3 && rows[0].initiator === 'script'
  && rows[0].transferBytes === 1500 && rows[0].sizesHidden === false);
ok('hidden-flagged', rows[1].sizesHidden === true && rows[1].transferBytes === 0
  && rows[1].protocol === null);
const agg = T.aggregateByOrigin(rows);
ok('aggregate', agg.length === 2 && agg[0].origin === 'https://netpulse.test'
  && agg[0].bytes === 2400 && agg[0].entries === 2 && agg[0].meanDurationMs === 10.25
  && agg[1].hiddenSizes === 1 && agg[1].bytes === 0);
const proto = T.protocolBreakdown(rows);
ok('protocol', proto.length === 3 && proto.every(p => p.entries === 1));
ok('filter-hit', T.filterRows(rows, 'APP.JS').length === 1);
ok('filter-miss', T.filterRows(rows, 'no-such-resource').length === 0);
ok('filter-empty', T.filterRows(rows, '  ').length === 3);
ok('format', T.formatBytes(1536) === '1.5 KB' && T.formatBytes(0) === '0 B'
  && T.formatBytes(-1) === 'no data' && T.formatMs(12.345) === '12.35 ms');
ok('origin-inline', T.originOf('blob:https://x/1') === '(inline)'
  && T.originOf('https://h.test:1/a') === 'https://h.test:1');

(async () => {
  let streamed = null;
  const stop = T.observe(live, (incoming) => { streamed = incoming; });
  ok('observe-handle', typeof stop === 'function');
  await new Promise(r => setTimeout(r, 30));
  ok('observe-stream', Array.isArray(streamed) && streamed.length === 1
    && streamed[0].name === FIXTURES[0].name);
  stop();

  const hist = [
    { kind: 'latency', summary: { median: 20, attempts: 5, failed: 0 } },
    { kind: 'download', summary: { median: 9, attempts: 3, failed: 1 }, throughputKBps: 512 },
    { kind: 'upload', summary: { median: 30, attempts: 2, failed: 2 }, throughputKbps: 64 },
  ];
  const series = M.probeSeries(hist);
  ok('series', series.latencyMedians.length === 1 && series.latencyMedians[0] === 20
    && series.throughputRates.length === 2 && series.throughputRates[0] === 512
    && series.throughputRates[1] === 64);
  const act = M.transferActivity(rows);
  ok('activity', act.totalBytes === 2400 && act.hiddenSizes === 1 && act.entries === 3
    && act.cumulativeBytes[2] === 2400);
  const evs = M.monitorEvents([
    { t: '2026-01-01T00:00:00Z', type: 'selftest-probe', detail: 'x' },
    { t: '2026-01-01T00:00:01Z', type: 'probe-complete', detail: 'a' },
    { t: '2026-01-01T00:00:02Z', type: 'traffic-refresh', detail: 'b' },
  ]);
  ok('events', evs.length === 2 && evs[0].type === 'traffic-refresh'
    && M.MONITOR_TYPES.indexOf('traffic-refresh') !== -1);
  const sum = M.sessionSummary(hist, act);
  ok('summary', sum.probeRuns === 3 && sum.probeAttempts === 10 && sum.probeFailed === 3
    && sum.observedBytes === 2400);
  ok('empty-closed', M.probeSeries([]).latencyMedians.length === 0
    && M.transferActivity([]).totalBytes === 0
    && M.monitorEvents([]).length === 0
    && M.sessionSummary([], M.transferActivity([])).probeRuns === 0);

  // Hostile path: no timing APIs at all.
  const bare = load(['js/traffic.js', 'js/monitor.js'], {});
  const BT = bare.NetpulseTraffic;
  ok('unsupported-flag', BT.isSupported(bare) === false);
  ok('snapshot-empty', BT.snapshot(bare).length === 0);
  ok('observe-null', BT.observe(bare, () => {}) === null);
  ok('malformed-closed', BT.normalizeEntry({ garbage: true }).durationMs === null
    && BT.normalizeEntry('nope').name === '(unparseable entry)'
    && BT.aggregateByOrigin(null).length === 0
    && BT.protocolBreakdown(null).length === 0
    && BT.filterRows(null, null).length === 0);
  console.log(out.join('\n'));
})().catch(e => { console.log('FAIL harness ' + e.message); process.exit(1); });
"""


def main():
    if not shutil.which('node'):
        print('SKIP: node not installed')
        return 0
    harness = ROOT / '.tmp-traffic-harness.cjs'
    harness.write_text(NODE_HARNESS, encoding='utf-8')
    try:
        proc = subprocess.run(
            ['node', str(harness), str(ROOT)],
            capture_output=True, text=True, timeout=120)
    finally:
        harness.unlink(missing_ok=True)
    if proc.returncode != 0:
        fail('node harness exited %d: %s' % (proc.returncode, proc.stderr[-500:]))
    for line in proc.stdout.splitlines():
        if line.startswith('FAIL'):
            fail('engine: ' + line)
    if not any(l.startswith('PASS snapshot-rows') for l in proc.stdout.splitlines()):
        fail('engine harness produced no traffic results')
    if not any(l.startswith('PASS unsupported-flag') for l in proc.stdout.splitlines()):
        fail('engine harness produced no hostile-path results')
    if FAILURES:
        print('TRAFFIC/MONITOR LIVE TESTS: %d FAILING' % len(FAILURES))
        for f in FAILURES:
            print('FAIL ' + f)
        return 1
    print('TRAFFIC/MONITOR LIVE TESTS: ALL PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
