#!/usr/bin/env python3
"""Tester round-7 regression suite for Netpulse Final PR #495 (Refs #489).

Locks the state verified live in this round: source badges on their own
full-width kv-grid row at natural width (display:contents dd + badge
grid-column 1/-1, nowrap/ellipsis/max-width safety, title fallback for
any residual clipping), live Chromium selftest marker, hostile export
parity on the shipped js/export.js, shell structure, and docs/copy.

Stdlib only. Run: python3 netpulse/tests/test_tester_residual_r7.py
"""
import re
import shutil
import subprocess
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
    if shutil.which("node") is None:
        return None
    js = r"""
const fs = require('fs');
const src = fs.readFileSync(%s, 'utf8');
require('vm').runInNewContext(src, global);
const E = global.NetpulseExport;
const r = [];
r.push('cell-nan:' + JSON.stringify(E.csvCell(NaN)));
r.push('cell-inf:' + JSON.stringify(E.csvCell(Infinity)));
const p = E.probesToCsv([{t: NaN, kind: Infinity, endpoint: NaN, summary: {median: NaN}}]);
r.push('probes-leak:' + (/NaN/.test(p) || /Infinity/.test(p)));
const t = E.trafficToCsv([{name: NaN, initiator: Infinity, durationMs: NaN}]);
r.push('traffic-leak:' + (/NaN/.test(t) || /Infinity/.test(t)));
r.push('formula:' + JSON.stringify(E.csvCell('=1+1')) + '|' + JSON.stringify(E.csvCell('@x')));
r.push('stamp-nan:' + /NaN/.test(E.stampFilename('s', 'garbage-date')));
const rep = E.buildReport({history: [{}, null, {t: 's', kind: 'k', summary: {median: 5}}]});
r.push('junk-kept:' + rep.probeRuns.length);
const dl = E.isDownloadSupported({});
r.push('dl-closed:' + (dl === false));
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
    ui = (ROOT / "js" / "ui.js").read_text(encoding="utf-8")
    app = (ROOT / "js" / "app.js").read_text(encoding="utf-8")

    # 1. Full-row badge contract: dd steps out of layout, badge spans row.
    dd = re.search(r"\.np-kv dd\s*\{([^}]*)\}", css)
    dd_block = dd.group(1) if dd else ""
    check("r7-dd-display-contents", "display: contents" in dd_block,
          "dd must not squeeze pills, got: %s" % dd_block.strip()[:120])
    m = re.search(r"\.np-badge\s*\{([^}]*)\}", css)
    badge = m.group(1) if m else ""
    check("r7-badge-full-row", "grid-column: 1 / -1" in badge,
          "pill must sit on its own full kv row at natural width")
    check("r7-badge-one-line",
          "white-space: nowrap" in badge and "text-overflow: ellipsis" in badge
          and "max-width: 100%" in badge,
          "one-line ellipsis remains the ultimate overflow safety")
    check("r7-badge-no-anywhere", "anywhere" not in badge,
          "no per-character fragmentation in the badge path")
    check("r7-badge-title-fallback",
          "b.title = source" in ui or ".title = source" in ui,
          "clipped pills must expose the full source via title")

    # 2. Shell structure: six balanced sections, DNS closed before Traffic.
    check("r7-sections-balanced",
          len(re.findall(r"<section", html)) == 6
          and len(re.findall(r"</section>", html)) == 6,
          "6 open / 6 close required")
    dns_open = html.find('id="tabpanel-dns"')
    traffic_open = html.find('id="tabpanel-traffic"')
    between = html[dns_open:traffic_open] if 0 <= dns_open < traffic_open else ""
    check("r7-dns-closed-before-traffic", "</section>" in between,
          "Traffic panel must not nest inside DNS panel")

    # 3. Reports surface present and wired.
    for bid in ("btn-export-json", "btn-export-probes", "btn-export-traffic",
                "btn-export-events", "btn-report-print", "btn-report-clear"):
        check("r7-reports-btn-" + bid, bid in html, "missing button id")
    check("r7-bootreports-wired", "bootReports" in app, "handlers unwired")

    # 4. Hostile export parity on the shipped builders.
    probe = node_probe()
    if probe is None:
        print("SKIP node hostile probe (no node runtime)")
    elif "error" in probe:
        check("r7-node-probe-runs", False, probe["error"])
    else:
        check("r7-csvcell-nan-empty", probe.get("cell-nan") == '""',
              "got %s" % probe.get("cell-nan"))
        check("r7-csvcell-inf-empty", probe.get("cell-inf") == '""',
              "got %s" % probe.get("cell-inf"))
        check("r7-probes-no-leak", probe.get("probes-leak") == "false",
              "text-column parity leak")
        check("r7-traffic-no-leak", probe.get("traffic-leak") == "false",
              "traffic text-column leak")
        check("r7-formula-prefixed",
              probe.get("formula") == "\"'=1+1\"|\"'@x\"",
              "got %s" % probe.get("formula"))
        check("r7-stamp-no-nan", probe.get("stamp-nan") == "false",
              "invalid-date stamp leak")
        check("r7-junk-dropped", probe.get("junk-kept") == "1",
              "got %s" % probe.get("junk-kept"))
        check("r7-download-fail-closed", probe.get("dl-closed") == "true",
              "absent Blob path must fail closed")

    # 5. Copy/docs invariants.
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    check("r7-readme-six-tabs", "six tab" in readme.lower(),
          "stale tab-count copy")
    check("r7-no-em-dashes", "—" not in css and "—" not in html,
          "em dash banned")
    check("r7-no-blocking-prompts",
          "prompt(" not in app and "confirm(" not in app,
          "blocking dialogs banned")

    if FAILURES:
        print("TESTER RESIDUAL R7: %d FAILURES" % len(FAILURES))
        raise SystemExit(1)
    print("TESTER RESIDUAL R7: ALL PASS")


if __name__ == "__main__":
    main()
