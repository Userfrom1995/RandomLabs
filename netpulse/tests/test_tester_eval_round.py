#!/usr/bin/env python3
"""Tester eval-round regression suite for Netpulse Final PR #495 (Refs #489).

Locks in the Quality Council code findings fixed after eval rejection
(7.0/10): badge/tablist wrap CSS, stampFilename invalid-date fallback,
CSV formula neutralization, text() non-finite null, fully-null junk row
drop, six-tab copy, and repro.sh packaging.

Stdlib only. Run: python3 netpulse/tests/test_tester_eval_round.py
"""
import os
import re
import shutil
import stat
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
    css = (ROOT / "css" / "netpulse.css").read_text(encoding="utf-8")
    check("css-tabs-wrap", "flex-wrap" in css and ".np-tabs" in css,
          "tablist must wrap")
    m_badge = re.search(r"\.np-badge\s*\{([^}]*)\}", css)
    badge_block = m_badge.group(1) if m_badge else ""
    check("css-badge-wrap",
          "white-space: nowrap" in badge_block
          and "text-overflow: ellipsis" in badge_block
          and "anywhere" not in badge_block,
          "badge must stay one-line with ellipsis, never per-character")
    check("css-grid-minwidth", "min-width: 0" in css,
          "grid/panel need min-width:0 hardening")

    md = (ROOT / "README.md").read_text(encoding="utf-8")
    check("copy-six-tabs", "six tab" in md.lower(), "README must say six tabs")
    check("copy-no-five-tabs",
          "five tab layout" not in md.lower(), "stale five-tab copy")

    repro = ROOT / "repro.sh"
    check("repro-exists", repro.exists(), "missing repro.sh")
    if repro.exists():
        mode = repro.stat().st_mode
        check("repro-executable", bool(mode & stat.S_IXUSR), "not executable")
        body = repro.read_text(encoding="utf-8")
        check("repro-runs-suites",
              "test_export_report.py" in body and "node --check" in body,
              "repro must run node check plus suites")

    node = shutil.which("node")
    if node is None:
        FAILURES.append("node required but not found")
    else:
        harness = ROOT / ".tmp-tester-eval-harness.cjs"
        harness.write_text(
            "const fs=require('fs'),vm=require('vm');\n"
            "const sb={console};sb.window=sb;sb.self=sb;vm.createContext(sb);\n"
            "vm.runInContext(fs.readFileSync(process.argv[2]+'/js/export.js','utf8'),sb);\n"
            "const E=sb.NetpulseExport;const out=[];\n"
            "out.push(((E.csvCell('=1+1')[0]===\"'\"&&E.csvCell('@x')[0]===\"'\"&&E.csvCell('+2')[0]===\"'\"&&E.csvCell('-3')[0]===\"'\")?'PASS':'FAIL')+' formula-prefix');\n"
            "const bad=E.stampFilename('s','garbage-date-xyz');\n"
            "out.push(((!/NaN/i.test(bad)&&/^netpulse-s-\\d{8}-\\d{6}$/.test(bad))?'PASS':'FAIL')+' stamp-fallback:'+bad);\n"
            "const good=E.stampFilename('s',new Date('2026-01-02T03:04:05Z'));\n"
            "out.push(((good==='netpulse-s-20260102-030405')?'PASS':'FAIL')+' stamp-valid:'+good);\n"
            "const jr=E.buildReport({history:[{},{kind:'latency',summary:{attempts:1,median:5}}],trafficRows:[{},{name:'u',durationMs:3}]});\n"
            "out.push((((jr.probeRuns.length===1&&jr.transfers.length===1))?'PASS':'FAIL')+' junk-rows:'+jr.probeRuns.length+'/'+jr.transfers.length);\n"
            "const tx=E.buildReport({history:[{kind:'k',summary:{attempts:1,median:NaN}}]});\n"
            "out.push(((tx.probeRuns.length===0||tx.probeRuns[0].medianMs===null)?'PASS':'FAIL')+' text-nonfinite');\n"
            "out.push(((E.isDownloadSupported({})===false&&E.download({},'f','t','x')===false)?'PASS':'FAIL')+' download-closed');\n"
            "const mal=E.buildReport({history:[null,'x',42],trafficRows:[null]});\n"
            "out.push((((mal.probeRuns.length===0&&mal.transfers.length===0))?'PASS':'FAIL')+' malformed-dropped');\n"
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
            if line.startswith("PASS"):
                print(line.replace("PASS ", "PASS harness-", 1))

    if FAILURES:
        print("TESTER EVAL ROUND: %d FAILING" % len(FAILURES))
        for f in FAILURES:
            print("FAIL " + f)
        return 1
    print("TESTER EVAL ROUND: ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
