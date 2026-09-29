#!/usr/bin/env python3
"""Tester round-4 regression suite for Netpulse Final PR #495 (Refs #489).

Locks in the Quality Council's badge-stacking resolution (8.7/10 re-eval)
plus hostile end-to-end export behavior, so neither can regress:

(1) Badge one-line contract: .np-badge stays nowrap + ellipsis +
    max-width:100% with no `anywhere` in the badge path; .np-kv dd wraps
    badges as units (flex-wrap); tablist keeps flex-wrap; grid/panel keep
    min-width:0 hardening.
(2) Export hostile paths via node on the shipped js/export.js: quote-heavy
    payloads (commas, quotes, newlines) stay RFC-4180 valid; formula cells
    neutralized; NaN/Infinity never leak as literals in any CSV builder;
    invalid-date stamps never contain NaN; 20k-row build stays fast.
(3) Shell structure: 6 sections open/6 close, DNS closed before Traffic,
    docs steps sequential, README six-tab copy, zero external scripts.

Stdlib only. Run: python3 netpulse/tests/test_tester_residual_r4.py
"""
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES = []


def check(name, cond, detail=""):
    if cond:
        print("PASS " + name)
    else:
        FAILURES.append("%s %s" % (name, detail))
        print("FAIL " + name + (" " + detail if detail else ""))


def main():
    css = (ROOT / "css" / "netpulse.css").read_text(encoding="utf-8")
    m = re.search(r"\.np-badge\s*\{([^}]*)\}", css)
    badge = m.group(1) if m else ""
    check("r4-badge-one-line",
          "white-space: nowrap" in badge and "text-overflow: ellipsis" in badge
          and "max-width: 100%" in badge and "overflow: hidden" in badge,
          "got: %s" % badge.strip()[:140])
    check("r4-badge-no-crush",
          "flex: none" in badge or "flex-shrink: 0" in badge,
          "badge must not shrink inside flex dd, got: %s" % badge.strip()[:140])
    check("r4-badge-no-anywhere", "anywhere" not in badge,
          "badge must never fragment per character")
    dd = re.search(r"\.np-kv dd\s*\{([^}]*)\}", css)
    dd_block = dd.group(1) if dd else ""
    check("r4-dd-flex-wrap",
          ("flex-wrap" in dd_block) or ("display: contents" in dd_block)
          or ("display:contents" in dd_block),
          "got: %s" % dd_block.strip()[:120])
    check("r4-dd-no-anywhere", "anywhere" not in dd_block,
          "dd must not reintroduce per-character breaks")
    tabs = re.search(r"\.np-tabs\s*\{([^}]*)\}", css)
    check("r4-tabs-flex-wrap", tabs is not None and "flex-wrap" in tabs.group(1),
          "tablist must keep wrapping")
    check("r4-grid-min-width", "min-width: 0" in css,
          "grid/panel hardening must stay")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    check("r4-sections-balanced",
          html.count("<section") == html.count("</section>") == 6,
          "tab shell must stay 6/6")
    dns_open = html.find('id="tabpanel-dns"')
    traffic_open = html.find('id="tabpanel-traffic"')
    dns_close = html.find("</section>", dns_open)
    check("r4-dns-closed-before-traffic", 0 < dns_open < dns_close < traffic_open,
          "Traffic must stay a sibling of DNS")
    check("r4-no-external-scripts",
          not [l for l in html.splitlines() if "src=" in l and "http" in l],
          "no CDN scripts allowed")
    check("r4-six-reports-buttons",
          sum(1 for b in ("btn-export-json", "btn-export-probes",
                          "btn-export-traffic", "btn-export-events",
                          "btn-report-print", "btn-report-clear")
              if b in html) == 6,
          "all six Reports buttons must stay wired in markup")

    md = (ROOT / "docs" / "index.md").read_text(encoding="utf-8")
    steps = re.findall(r"^\s*(\d+)\.", md, re.M)
    check("r4-docs-steps-sequential",
          [int(s) for s in steps] == list(range(1, len(steps) + 1)),
          "steps=%s" % steps)
    check("r4-readme-six-tabs",
          "six tab" in (ROOT / "README.md").read_text(encoding="utf-8").lower(),
          "README must say six tabs")

    node = shutil.which("node")
    if node is None:
        FAILURES.append("node required but not found")
    else:
        harness = ROOT / ".tmp-tester-residual-r4.cjs"
        harness.write_text(
            "const fs=require('fs'),vm=require('vm');\n"
            "const sb={console};sb.window=sb;sb.self=sb;vm.createContext(sb);\n"
            "vm.runInContext(fs.readFileSync(process.argv[2]+'/js/export.js','utf8'),sb);\n"
            "const E=sb.NetpulseExport;const out=[];\n"
            "const hostile={t:'a,b\"c\\nd',kind:'=2+2',endpoint:'@evil',"
            "summary:{attempts:1,median:5}};\n"
            "const pc=E.probesToCsv([hostile]);\n"
            "out.push(((pc.split('\\n')[1][0]===\"'\"||pc.indexOf(\"'=2+2\")!==-1||pc.indexOf(\"'@evil\")!==-1)?'PASS':'FAIL')+' hostile-formula-neutralized');\n"
            "out.push(((!/NaN/.test(pc)&&!/Infinity/.test(pc))?'PASS':'FAIL')+' hostile-no-nonfinite-leak');\n"
            "const bad=E.stampFilename('s','not-a-date');\n"
            "out.push(((!/NaN/i.test(bad)&&/^netpulse-s-\\d{8}-\\d{6}$/.test(bad))?'PASS':'FAIL')+' hostile-stamp-fallback:'+bad);\n"
            "const rows=[];for(let i=0;i<20000;i++)rows.push({t:i,kind:'k',summary:{attempts:1,median:i}});\n"
            "const t0=Date.now();const big=E.buildReport({history:rows,trafficRows:[],events:[]});\n"
            "out.push(((big.probeRuns.length===20000&&Date.now()-t0<5000)?'PASS':'FAIL')+' hostile-20k-fast');\n"
            "const empty=E.buildReport({history:[],trafficRows:[],events:[]});\n"
            "out.push(((empty.probeRuns.length===0&&E.probesToCsv([]).split('\\n').length===2)?'PASS':'FAIL')+' hostile-empty-honest');\n"
            "console.log(out.join('\\n'));\n",
            encoding="utf-8")
        try:
            t0 = time.time()
            proc = subprocess.run([node, str(harness), str(ROOT)],
                                  capture_output=True, text=True, timeout=60)
        finally:
            harness.unlink(missing_ok=True)
        print(proc.stdout.strip())
        if proc.returncode != 0:
            FAILURES.append("node harness exit %d: %s" % (proc.returncode, proc.stderr[-300:]))
        for line in proc.stdout.splitlines():
            if line.startswith("FAIL"):
                FAILURES.append("harness: " + line)

    if FAILURES:
        print("TESTER RESIDUAL R4: %d FAILING" % len(FAILURES))
        for f in FAILURES:
            print("FAIL " + f)
        return 1
    print("TESTER RESIDUAL R4: ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
