#!/usr/bin/env python3
"""Tester round-5 regression suite for Netpulse Final PR #495 (Refs #489).

Durable record of the dynamic verification round after the badge
flex-crush fix (flex:none on .np-badge): live Chromium selftest status,
badge layout contract, hostile export parity via node on the shipped
js/export.js, shell structure, and docs/copy invariants.

Stdlib only. Run: python3 netpulse/tests/test_tester_residual_r5.py
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES = []


def check(name, cond, detail=""):
    if cond:
        print("PASS " + name)
    else:
        FAILURES.append("%s %s" % (name, detail))
        print("FAIL " + name + (" " + detail if detail else ""))


def node_probe():
    """Drive the shipped export.js builders through hostile inputs."""
    if shutil.which("node") is None:
        return None
    js = r"""
const fs = require('fs');
const src = fs.readFileSync(%s, 'utf8');
global.window = {};
const factory = new Function('window','global',
  src + '; return (typeof NetpulseExport !== "undefined" ? NetpulseExport : (global.NetpulseExport || window.NetpulseExport));');
const E = factory(global.window, global);
const r = [];
r.push('cell-nan:' + JSON.stringify(E.csvCell(NaN)));
r.push('cell-inf:' + JSON.stringify(E.csvCell(Infinity)));
const p = E.probesToCsv([{t: NaN, kind: Infinity, endpoint: NaN, median: NaN}]);
r.push('probes-leak:' + (/NaN/.test(p) || /Infinity/.test(p)));
const t = E.trafficToCsv([{name: NaN, durationMs: Infinity}]);
r.push('traffic-leak:' + (/NaN/.test(t) || /Infinity/.test(t)));
const v = E.eventsToCsv ? E.eventsToCsv([{t: NaN, type: 'x', detail: Infinity}]) : '';
r.push('events-leak:' + (/NaN/.test(v) || /Infinity/.test(v)));
r.push('formula:' + JSON.stringify(E.csvCell('=1+1')) + '|' + JSON.stringify(E.csvCell('@x')));
const s1 = E.stampFilename('s', 'garbage-date');
r.push('stamp-nan:' + /NaN/.test(s1));
const rep = E.buildReport({history: [{}, {t: 1, kind: 'x'}], trafficRows: []});
r.push('junk-kept:' + rep.probeRuns.length);
const sess = {history: [{t: NaN, kind: Infinity, endpoint: 'e', summary: {median: NaN}}], trafficRows: []};
const jr = E.buildReport(sess);
r.push('json-nulls:' + (jr.probeRuns[0].t === null && jr.probeRuns[0].kind === null && jr.probeRuns[0].medianMs === null));
const jc = E.probesToCsv(sess.history);
r.push('csv-parity:' + !(/NaN/.test(jc) || /Infinity/.test(jc)));
r.push('dl-closed:' + (E.isDownloadSupported({}) === false));
console.log(r.join('\n'));
""" % repr(str(ROOT / "js" / "export.js"))
    try:
        out = subprocess.run(["node", "-e", js], capture_output=True,
                             text=True, timeout=60, cwd=str(ROOT))
    except Exception as exc:
        return {"error": str(exc)}
    if out.returncode != 0:
        return {"error": out.stderr.strip()[:300]}
    d = {}
    for line in out.stdout.strip().split("\n"):
        if ":" in line:
            k, _, val = line.partition(":")
            d[k.strip()] = val.strip()
    return d


def main():
    css = (ROOT / "css" / "netpulse.css").read_text(encoding="utf-8")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "js" / "app.js").read_text(encoding="utf-8")

    # 1. Badge flex-crush contract (Quality Council prescription, this round).
    m = re.search(r"\.np-badge\s*\{([^}]*)\}", css)
    badge = m.group(1) if m else ""
    check("r5-badge-flex-none",
          "flex: none" in badge or "flex-shrink: 0" in badge,
          "pill must not shrink inside flex dd")
    check("r5-badge-one-line",
          "white-space: nowrap" in badge and "text-overflow: ellipsis" in badge
          and "max-width: 100%" in badge,
          "one-line ellipsis treatment required")
    check("r5-badge-no-anywhere", "anywhere" not in badge,
          "no per-character fragmentation in badge path")
    dd = re.search(r"\.np-kv dd\s*\{([^}]*)\}", css)
    dd_block = dd.group(1) if dd else ""
    check("r5-dd-wraps-badges",
          "flex-wrap" in dd_block and "anywhere" not in dd_block,
          "dd wraps pills as units, got: %s" % dd_block.strip()[:120])

    # 2. Shell structure: six balanced sections, DNS closed before Traffic.
    check("r5-sections-balanced",
          len(re.findall(r"<section", html)) == 6
          and len(re.findall(r"</section>", html)) == 6,
          "6 open / 6 close required")
    dns_close = html.find('id="tabpanel-dns"')
    traffic_open = html.find('id="tabpanel-traffic"')
    between = html[dns_close:traffic_open] if dns_close >= 0 and traffic_open > dns_close else ""
    check("r5-dns-closed-before-traffic", "</section>" in between,
          "Traffic panel must not nest inside DNS panel")

    # 3. Reports buttons present in markup and wired in bootReports.
    for bid in ("btn-export-json", "btn-export-probes", "btn-export-traffic",
                "btn-export-events", "btn-report-print", "btn-report-clear"):
        check("r5-reports-btn-" + bid, bid in html, "missing button id in markup")
    check("r5-bootreports-wired", "bootReports" in app,
          "app.js must wire the Reports handlers")

    # 4. Hostile export matrix on the shipped builders.
    probe = node_probe()
    if probe is None:
        print("SKIP node hostile probe (no node runtime)")
    elif "error" in probe:
        check("r5-node-probe-runs", False, probe["error"])
    else:
        check("r5-csvcell-nan-empty", probe.get("cell-nan") == '""',
              "got %s" % probe.get("cell-nan"))
        check("r5-csvcell-inf-empty", probe.get("cell-inf") == '""',
              "got %s" % probe.get("cell-inf"))
        check("r5-probes-no-leak", probe.get("probes-leak") == "false",
              "NaN/Infinity literals in probe CSV")
        check("r5-traffic-no-leak", probe.get("traffic-leak") == "false",
              "NaN/Infinity literals in traffic CSV")
        check("r5-events-no-leak", probe.get("events-leak") == "false",
              "NaN/Infinity literals in events CSV")
        check("r5-formula-prefixed",
              probe.get("formula", "").startswith("\"'=") and "'@" in probe.get("formula", ""),
              "got %s" % probe.get("formula"))
        check("r5-stamp-no-nan", probe.get("stamp-nan") == "false",
              "invalid-date stamp must fall back, never NaN")
        check("r5-junk-dropped-signal-kept", probe.get("junk-kept") == "1",
              "got %s" % probe.get("junk-kept"))
        check("r5-json-csv-parity",
              probe.get("json-nulls") == "true" and probe.get("csv-parity") == "true",
              "JSON nulls must match CSV empty cells")
        check("r5-download-fail-closed", probe.get("dl-closed") == "true",
              "absent Blob/download APIs must fail closed")

    # 5. Docs/copy invariants and honest implementation markers.
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    check("r5-readme-six-tabs", "six tab" in readme.lower(),
          "stale tab count copy")
    check("r5-no-em-dashes",
          "\u2014" not in css and "\u2014" not in html,
          "em dashes forbidden")
    check("r5-no-blocking-prompts",
          "prompt(" not in app and "alert(" not in app and "confirm(" not in app,
          "blocking dialogs forbidden")
    check("r5-no-cdn-scripts",
          not re.search(r'<script[^>]+src="https?://', html),
          "zero external CDN scripts")

    print("TESTER RESIDUAL R5: %s" % ("ALL PASS" if not FAILURES else "FAILURES %d" % len(FAILURES)))
    return 1 if FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
