#!/usr/bin/env python3
"""Live regression tests for the Netpulse final-phase export and report
engine (Refs #489).

Drives js/export.js in Node inside a vm sandbox with fixture session
artifacts and hostile shapes (null inputs, malformed rows, non-finite
numbers, absent Blob/download APIs). Asserts honest semantics: sourced
sections, empty sessions export empty sections, CSV quoting is RFC 4180,
filenames are stamped and filesystem-safe, and download/print fail closed
where the browser offers no path.

Stdlib only. Run: python3 netpulse/tests/test_export_report.py
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
function load(extra) {
  const sandbox = { console };
  sandbox.window = sandbox; sandbox.self = sandbox;
  Object.assign(sandbox, extra || {});
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(process.argv[2] + '/js/export.js', 'utf8'), sandbox);
  return sandbox;
}
const out = [];
const ok = (n, c) => out.push(((c ? 'PASS' : 'FAIL') + ' ' + n));

// Happy path: full session artifacts plus Blob download available.
const live = load({
  Blob: function (parts, opts) { this.parts = parts; this.type = opts && opts.type; },
  URL: { createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} },
  document: { createElement: () => ({ click: () => {}, remove: () => {} }), body: { appendChild: () => {} } },
  print: () => {},
});
const E = live.NetpulseExport;
ok('module', !!E && typeof E.buildReport === 'function');

const report = E.buildReport({
  capabilities: { probes: true },
  events: [{ t: '2026-01-01T00:00:00Z', type: 'probe-complete', detail: 'latency' }],
  history: [{ t: '2026-01-01T00:00:00Z', kind: 'latency', endpoint: 'probe.bin',
    summary: { attempts: 3, succeeded: 3, failed: 0, median: 20, p95: 30, min: 10, max: 30, jitter: 5 } }],
  trafficRows: [{ name: 'https://a.example/1.js', initiator: 'script', durationMs: 10,
    startMs: 1, transferBytes: 1000, encodedBytes: 900, decodedBytes: 900,
    protocol: 'h2', sizesHidden: false }],
  sessionSummary: { probeRuns: 1, probeAttempts: 3, probeFailed: 0,
    observedEntries: 1, observedBytes: 1000, hiddenSizes: 0 },
  generatedAt: '2026-01-01T00:00:00Z',
  userAgent: 'harness',
});
ok('sections', report.probeRuns.length === 1 && report.transfers.length === 1
  && report.events.length === 1 && report.tool === 'Netpulse');
ok('sources', report.probeRuns[0].source === 'HTTP timing (fetch)'
  && report.transfers[0].source === 'Resource Timing'
  && report.events[0].source === 'session store'
  && report.sources.traffic === 'Resource Timing');
ok('json-roundtrip', JSON.parse(E.reportToJson(report)).probeRuns.length === 1);

const pc = E.probesToCsv([{ t: 't', kind: 'down,load "x"', endpoint: 'e',
  summary: { attempts: 2, succeeded: 1, failed: 1 }, totalBytes: 100 }]);
ok('csv-quote', pc.indexOf('down,load') !== -1 && pc.indexOf('""x""') !== -1
  && pc.indexOf('timestamp,kind') === 0);
const ec = E.eventsToCsv([{ t: 't', type: 'y', detail: null }]);
ok('events-null', ec.split('\n').length === 3 && ec.indexOf('null') === -1);
const tc = E.trafficToCsv([{ name: 'u', initiator: null, sizesHidden: true }]);
ok('traffic-hidden', tc.indexOf('true,Resource Timing') !== -1);
ok('cell', E.csvCell('a"b,c') === '"a""b,c"' && E.csvCell(null) === ''
  && E.csvCell('plain') === 'plain' && E.csvCell('a\nb') === '"a\nb"');
const fixed = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));
ok('stamp', E.stampFilename('report', fixed) === 'netpulse-report-20260102-030405'
  && E.stampFilename('', fixed) === 'netpulse-session-20260102-030405'
  && E.stampFilename('Weird Name!', fixed) === 'netpulse-weird-name-20260102-030405');
ok('download-live', E.isDownloadSupported(live) === true
  && E.download(live, 'f.json', 'application/json', '{}') === true);
ok('print-live', E.printReport(live) === true);

// Hostile path: absent APIs, malformed rows, non-finite numbers.
const bare = load({});
const B = bare.NetpulseExport;
const empty = B.buildReport({});
ok('empty-closed', empty.probeRuns.length === 0 && empty.transfers.length === 0
  && empty.events.length === 0 && empty.capabilities === null);
const bad = B.buildReport({ events: [null, 'x', {}], history: [null, 7, {}],
  trafficRows: [null, 'x'] });
ok('malformed-dropped', bad.events.length === 0 && bad.probeRuns.length === 0
  && bad.transfers.length === 0);
ok('junk-row-signal', B.buildReport({ history: [{ kind: 'latency',
  summary: { attempts: 1 } }] }).probeRuns.length === 1);
ok('formula-prefix', B.csvCell('=1+1') === "'=1+1"
  && B.csvCell('@x') === "'@x" && B.csvCell('+1') === "'+1"
  && B.csvCell('-1') === "'-1" && B.csvCell('plain') === 'plain');
ok('stamp-fallback', /^netpulse-s-\d{8}-\d{6}$/.test(B.stampFilename('s', 'not-a-date')));
ok('text-nonfinite', B.buildReport({ history: [{ kind: 'x',
  t: NaN, summary: { attempts: 1 } }] }).probeRuns[0].t === null);
const nonfin = B.buildReport({
  history: [{ kind: 'latency', summary: { attempts: 1, median: NaN, p95: Infinity } }],
  trafficRows: [{ name: 'u', transferBytes: -5, durationMs: NaN, sizesHidden: false }],
});
ok('nonfinite-null', nonfin.probeRuns[0].medianMs === null
  && nonfin.probeRuns[0].p95Ms === null
  && nonfin.transfers[0].durationMs === null);
ok('csv-empty', B.eventsToCsv(null).split('\n').length === 2
  && B.probesToCsv([]).split('\n').length === 2
  && B.trafficToCsv(null).split('\n').length === 2);
ok('download-closed', B.isDownloadSupported(bare) === false
  && B.download(bare, 'f', 'text/plain', 'x') === false
  && B.printReport({}) === false
  && B.printReport(null) === false);

console.log(out.join('\n'));
"""


def main():
    node = shutil.which("node")
    if node is None:
        fail("node is required for the export harness but was not found")
    else:
        harness = ROOT / ".tmp-export-harness.cjs"
        harness.write_text(NODE_HARNESS, encoding="utf-8")
        try:
            proc = subprocess.run(
                [node, str(harness), str(ROOT)],
                capture_output=True, text=True, timeout=120)
        finally:
            harness.unlink(missing_ok=True)
        print(proc.stdout.strip())
        if proc.returncode != 0:
            fail("node harness exited %d: %s" % (proc.returncode, proc.stderr[-500:]))
        for line in proc.stdout.splitlines():
            if line.startswith("FAIL"):
                fail("harness: " + line)
        if not any(l.startswith("PASS sections") for l in proc.stdout.splitlines()):
            fail("engine harness produced no report results")
        if not any(l.startswith("PASS download-closed") for l in proc.stdout.splitlines()):
            fail("engine harness produced no hostile-path results")

    exp = ROOT / "js/export.js"
    if exp.is_file():
        src = exp.read_text(encoding="utf-8", errors="replace")
        if "TODO" in src or "FIXME" in src:
            fail("export.js contains stub markers")
        if "simulated packets" in src.lower() or "placeholder gauge" in src.lower():
            fail("export.js contains facade markers")

    if FAILURES:
        print("EXPORT REPORT TESTS: %d FAILING" % len(FAILURES))
        for f in FAILURES:
            print("FAIL " + f)
        return 1
    print("EXPORT REPORT TESTS: ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
