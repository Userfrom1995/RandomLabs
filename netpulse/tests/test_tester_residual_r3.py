#!/usr/bin/env python3
"""Tester residual-round regression suite for Netpulse Final PR #495 (Refs #489).

Locks in the two Quality Council residual defects fixed after the 7.6/10
re-eval so they can never regress:
(1) CSV text-column parity leak: csvCell must map non-finite numbers in
    text fields (t, kind, endpoint, name, initiator, protocol, detail) to
    empty cells, matching the nulls buildReport emits in JSON;
(2) Desktop badge letter-stacking: .np-badge and .np-kv dd must wrap at
    word bounds (overflow-wrap: break-word, word-break: normal), never
    per-character (overflow-wrap: anywhere).

Stdlib only. Run: python3 netpulse/tests/test_tester_residual_r3.py
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


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    check("sections-balanced", html.count("<section") == html.count("</section>") == 6,
          "tab shell must stay 6 open / 6 close")
    dns_open = html.find('id="tabpanel-dns"')
    traffic_open = html.find('id="tabpanel-traffic"')
    dns_close = html.find("</section>", dns_open)
    check("dns-closed-before-traffic", 0 < dns_open < dns_close < traffic_open,
          "Traffic panel must stay a sibling of the DNS panel")

    css = (ROOT / "css" / "netpulse.css").read_text(encoding="utf-8")
    check("tabs-flex-wrap", ".np-tabs" in css and "flex-wrap" in css,
          "tablist must wrap")
    badge_block = ""
    m = re.search(r"\.np-badge\s*\{([^}]*)\}", css)
    if m:
        badge_block = m.group(1)
    check("badge-word-bounds",
          "overflow-wrap: break-word" in badge_block and "word-break: normal" in badge_block,
          "badge must wrap at word bounds, got: %s" % badge_block.strip()[:120])
    check("badge-no-anywhere", "anywhere" not in badge_block,
          "badge must never fragment per character")
    dd_block = ""
    m2 = re.search(r"\.np-kv dd\s*\{([^}]*)\}", css)
    if m2:
        dd_block = m2.group(1)
    check("kv-dd-word-bounds",
          "overflow-wrap: break-word" in dd_block and "anywhere" not in dd_block,
          "kv dd must wrap at word bounds, got: %s" % dd_block.strip()[:120])

    md = (ROOT / "docs" / "index.md").read_text(encoding="utf-8")
    steps = re.findall(r"^\s*(\d+)\.", md, re.M)
    check("docs-steps-sequential", [int(s) for s in steps] == list(range(1, len(steps) + 1)),
          "steps=%s" % steps)

    node = shutil.which("node")
    if node is None:
        FAILURES.append("node required but not found")
    else:
        harness = ROOT / ".tmp-tester-residual-r3.cjs"
        harness.write_text(
            "const fs=require('fs'),vm=require('vm');\n"
            "const sb={console};sb.window=sb;sb.self=sb;vm.createContext(sb);\n"
            "vm.runInContext(fs.readFileSync(process.argv[2]+'/js/export.js','utf8'),sb);\n"
            "const E=sb.NetpulseExport;const out=[];\n"
            "out.push(((E.csvCell(NaN)===''&&E.csvCell(Infinity)===''&&E.csvCell(-Infinity)==='')?'PASS':'FAIL')+' text-parity-guard');\n"
            "const pc=E.probesToCsv([{t:NaN,kind:Infinity,endpoint:'e',summary:{attempts:1,median:NaN}}]);\n"
            "out.push(((!/NaN/.test(pc)&&!/Infinity/.test(pc))?'PASS':'FAIL')+' probes-text-parity');\n"
            "const tc=E.trafficToCsv([{name:NaN,initiator:Infinity,durationMs:NaN,protocol:'h2'}]);\n"
            "out.push(((!/NaN/.test(tc)&&!/Infinity/.test(tc))?'PASS':'FAIL')+' traffic-text-parity');\n"
            "const ec=E.eventsToCsv([{t:NaN,type:Infinity,detail:'d'}]);\n"
            "out.push(((!/NaN/.test(ec)&&!/Infinity/.test(ec))?'PASS':'FAIL')+' events-text-parity');\n"
            "const jr=E.buildReport({history:[{t:NaN,kind:'k',summary:{attempts:1}}]});\n"
            "out.push(((jr.probeRuns.length===1&&jr.probeRuns[0].t===null?'PASS':'FAIL'))+' json-null-parity');\n"
            "out.push(((E.csvCell('=1+1')[0]===\"'\"&&E.csvCell('@x')[0]===\"'\"?'PASS':'FAIL'))+' formula-prefix');\n"
            "const bad=E.stampFilename('s','garbage-date-xyz');\n"
            "out.push(((!/NaN/i.test(bad))?'PASS':'FAIL')+' stamp-fallback');\n"
            "console.log(out.join('\\n'));\n",
            encoding="utf-8")
        try:
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
        print("TESTER RESIDUAL R3: %d FAILING" % len(FAILURES))
        for f in FAILURES:
            print("FAIL " + f)
        return 1
    print("TESTER RESIDUAL R3: ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
