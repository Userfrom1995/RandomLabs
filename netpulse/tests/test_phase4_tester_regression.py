#!/usr/bin/env python3
"""Tester regression suite for Netpulse Phase 4 traffic + monitor (Refs #489).

Guards the exact defects caught in review on PR #494:
  1. Buffered-replay double count: the live-stream merge in js/app.js must
     dedupe incoming rows against a stable row key (not bare concat), so a
     PerformanceObserver buffered replay of the snapshot never inflates
     entry counts or byte totals.
  2. Hidden-size copy must read "hidden by headers or served from cache"
     (cache hits are not mislabeled as cross-origin header hiding).
  3. Traffic DOM lookups must be null-guarded (origin body, transfer body,
     waterfall root, control listeners) so one missing id cannot break
     boot() chaining into bootMonitor.
  4. transferActivity entries must count only non-null rows.

Plus hostile engine checks (malformed entries, null filters, 1000-row cap
semantics) driven through node against the real js/traffic.js + js/monitor.js.

Stdlib only. Run: python3 netpulse/tests/test_phase4_tester_regression.py
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "js" / "app.js"
FAILURES = []


def fail(msg):
    FAILURES.append(msg)


def check(name, cond, detail=""):
    if cond:
        print("PASS " + name)
    else:
        fail("%s %s" % (name, detail))


NODE_HARNESS = r"""
const fs = require('fs'), vm = require('vm');
const out = [];
const ok = (n, c) => out.push(((c ? 'PASS' : 'FAIL') + ' ' + n));
function load(files) {
  const sandbox = { console };
  sandbox.window = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(fs.readFileSync(process.argv[2] + '/' + f, 'utf8'), sandbox);
  return sandbox;
}
const sb = load(['js/traffic.js', 'js/monitor.js']);
const T = sb.NetpulseTraffic, M = sb.NetpulseMonitor;
// Hostile: malformed + null shapes fail closed, never throw.
try {
  ok('hostile-malformed', T.normalizeEntry({ garbage: true }).durationMs === null
    && T.normalizeEntry(null).sizesHidden === false
    && T.normalizeEntry(undefined).name === '(unparseable entry)');
} catch (e) { ok('hostile-malformed', false); }
try {
  ok('hostile-null-filters', T.aggregateByOrigin(null).length === 0
    && T.protocolBreakdown(undefined).length === 0
    && T.filterRows(null, null).length === 0
    && T.filterRows([], 'x').length === 0);
} catch (e) { ok('hostile-null-filters', false); }
// Hostile: 100k-entry aggregate must terminate with sane rollup.
try {
  const big = [];
  for (let i = 0; i < 100000; i++) big.push({ name: 'https://h.test/f' + (i % 7), transferBytes: 10, sizesHidden: false, durationMs: 1, initiator: 'script', protocol: 'h2', startMs: i });
  const agg = T.aggregateByOrigin(big);
  ok('hostile-100k', agg.length === 1 && agg[0].bytes === 1000000 && agg[0].entries === 100000);
} catch (e) { ok('hostile-100k', false); }
// Hostile: null holes in transferActivity counted honestly.
try {
  const act = M.transferActivity([{ transferBytes: 5, sizesHidden: false }, null, undefined, { transferBytes: 7, sizesHidden: false }]);
  ok('hostile-null-holes', act.entries === 2 && act.totalBytes === 12 && act.cumulativeBytes.length === 2);
} catch (e) { ok('hostile-null-holes', false); }
// Hostile: filter is case-insensitive and trims.
try {
  const rows = [{ name: 'https://x/Probe.BIN', initiator: 'fetch', protocol: 'h2' }];
  ok('hostile-filter-case', T.filterRows(rows, '  probe.bin ').length === 1 && T.filterRows(rows, 'H2').length === 1);
} catch (e) { ok('hostile-filter-case', false); }
// Monitor: selftest fixtures excluded, traffic events kept, cap honored.
try {
  const evs = [];
  for (let i = 0; i < 60; i++) evs.push({ t: 't' + i, type: 'probe-complete', detail: 'd' });
  evs.push({ t: 's', type: 'selftest-probe', detail: 'fixture' });
  const kept = M.monitorEvents(evs);
  ok('hostile-monitor-cap', kept.length === 40 && kept.every(e => e.type === 'probe-complete'));
} catch (e) { ok('hostile-monitor-cap', false); }
console.log(out.join('\n'));
"""


def main():
    src = APP.read_text(encoding="utf-8")

    # 1. Dedupe merge present, bare concat gone.
    check("merge-dedupes",
          "seen[trafficRowKey(r)]" in src or "seen[trafficRowKey" in src,
          "live-stream merge does not dedupe against trafficRowKey")
    # No `rows = rows.concat(incoming)` anywhere in the observe callback.
    check("merge-no-bare-concat",
          "rows.concat(incoming)" not in src,
          "bare rows.concat(incoming) still present")
    check("rowkey-stable",
          re.search(r"function trafficRowKey\(r\)", src) is not None
          and "r.transferBytes" in src and "r.protocol" in src,
          "trafficRowKey helper missing or unstable")

    # 2. Hidden-size copy.
    check("copy-cache-honest",
          "hidden by headers or served from cache" in src,
          "user-facing copy does not mention cache")

    # 3. Null guards.
    check("guard-origin-body",
          re.search(r"if\s*\(\s*originBody\s*\)", src) is not None,
          "traffic-origin-body dereferenced without guard")
    check("guard-transfer-body",
          re.search(r"if\s*\(\s*body\s*\)", src) is not None,
          "traffic-body dereferenced without guard")
    check("guard-waterfall",
          "if (!root) return" in src,
          "renderTrafficWaterfall has no null-root guard")
    check("guard-observe-btn",
          'getElementById("btn-traffic-observe")' in src
          and "if (btnObserve)" in src,
          "observe button listener unguarded")
    check("guard-refresh-btn",
          "if (btnRefresh)" in src,
          "refresh button listener unguarded")

    # 4. Null-hole counting fixed in monitor.js.
    mon = (ROOT / "js" / "monitor.js").read_text(encoding="utf-8")
    check("monitor-counts-non-null",
          "counted" in mon and "if (!r) return" in mon,
          "transferActivity does not skip null holes")

    # 5. Node hostile harness against the real engines.
    if not shutil.which("node"):
        print("SKIP node hostile harness (node not installed)")
    else:
        harness = ROOT / ".tmp-tester-phase4-harness.cjs"
        harness.write_text(NODE_HARNESS, encoding="utf-8")
        try:
            proc = subprocess.run(["node", str(harness), str(ROOT)],
                                  capture_output=True, text=True, timeout=120)
        finally:
            harness.unlink(missing_ok=True)
        if proc.returncode != 0:
            fail("node harness exit %d: %s" % (proc.returncode, proc.stderr[-500:]))
        for line in proc.stdout.splitlines():
            print(("tester-harness " + line) if line.startswith("FAIL") else line)
            if line.startswith("FAIL"):
                fail("engine: " + line)

    if FAILURES:
        print("TESTER PHASE4 REGRESSION: %d FAILING" % len(FAILURES))
        for f in FAILURES:
            print("FAIL " + f)
        return 1
    print("TESTER PHASE4 REGRESSION: ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
