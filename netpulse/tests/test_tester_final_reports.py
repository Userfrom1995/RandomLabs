#!/usr/bin/env python3
"""Tester final-phase regression suite for Netpulse Reports/Export (PR #495, Refs #489).

Locks in the three Reviewer findings fixed on this PR so they can never
regress: (1) Traffic panel is a sibling of the DNS panel, never nested;
(2) docs verification steps run 7,8,9,10 with consistent indent;
(3) CSV builders serialize NaN/Infinity as empty cells, matching the
JSON nulls from buildReport. Also asserts all six Reports buttons exist
in markup and are wired to real handlers in js/app.js.

Stdlib only. Run: python3 netpulse/tests/test_tester_final_reports.py
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES = []


def fail(msg):
    FAILURES.append(msg)


def check(name, cond, detail=""):
    if cond:
        print("PASS " + name)
    else:
        fail("%s %s" % (name, detail))
        print("FAIL " + name + (" " + detail if detail else ""))


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    opens = html.count("<section")
    closes = html.count("</section>")
    check("sections-balanced", opens == closes == 6,
          "opens=%d closes=%d" % (opens, closes))

    dns_open = html.find('id="tabpanel-dns"')
    traffic_open = html.find('id="tabpanel-traffic"')
    check("panels-ordered", 0 <= dns_open < traffic_open, "dns/traffic offsets")
    between = html[dns_open:traffic_open]
    check("dns-closed-before-traffic", between.count("</section>") == 1,
          "closes-between=%d" % between.count("</section>"))

    # Traffic panel must not be a DOM descendant of the DNS panel:
    # exactly one section closes between, and the traffic open tag
    # follows that close (not a nested div).
    tail = between.rsplit("</section>", 1)[-1]
    check("traffic-is-sibling", "<section" in tail, "no section open after dns close")

    for btn in ("btn-export-json", "btn-export-probes", "btn-export-traffic",
                "btn-export-events", "btn-report-print", "btn-report-clear"):
        check("markup-" + btn, ('id="%s"' % btn) in html, "missing button")

    app = (ROOT / "js/app.js").read_text(encoding="utf-8")
    for btn in ("btn-export-json", "btn-export-probes", "btn-export-traffic",
                "btn-export-events", "btn-report-print", "btn-report-clear"):
        check("wired-" + btn, ('getElementById("%s")' % btn) in app, "unwired")

    docs = (ROOT / "docs/index.md").read_text(encoding="utf-8")
    steps = re.findall(r"^(\s*)(\d+)\.\s", docs, re.M)
    nums = [int(n) for _, n in steps]
    check("docs-steps-sequence", nums == sorted(nums) and len(nums) == len(set(nums)),
          "steps=%s" % nums)
    tail_steps = nums[-4:]
    check("docs-steps-7-10", tail_steps == [7, 8, 9, 10], "tail=%s" % tail_steps)

    node = shutil.which("node")
    if node is None:
        fail("node required but not found")
    else:
        harness = ROOT / ".tmp-tester-final-harness.cjs"
        harness.write_text(
            "const fs=require('fs'),vm=require('vm');\n"
            "const sb={console};sb.window=sb;sb.self=sb;vm.createContext(sb);\n"
            "vm.runInContext(fs.readFileSync(process.argv[2]+'/js/export.js','utf8'),sb);\n"
            "const E=sb.NetpulseExport;\n"
            "const out=[];\n"
            "const pc=E.probesToCsv([{t:'t',kind:'latency',endpoint:'e',"
            "summary:{attempts:1,median:NaN,p95:Infinity,min:1,max:2,jitter:NaN},"
            "throughputKBps:NaN,totalBytes:Infinity,payloadBytes:5}]);\n"
            "out.push((/NaN|Infinity/.test(pc)?'FAIL':'PASS')+' csv-probe-nonfinite');\n"
            "const tc=E.trafficToCsv([{name:'u',initiator:'x',durationMs:NaN,"
            "startMs:Infinity,transferBytes:NaN,encodedBytes:1,decodedBytes:2,"
            "protocol:'h2',sizesHidden:false}]);\n"
            "out.push((/NaN|Infinity/.test(tc)?'FAIL':'PASS')+' csv-traffic-nonfinite');\n"
            "const jr=E.buildReport({history:[{kind:'latency',"
            "summary:{attempts:1,median:NaN}}],"
            "trafficRows:[{name:'u',durationMs:NaN}]});\n"
            "out.push(((jr.probeRuns[0].medianMs===null&&jr.transfers[0].durationMs===null)?'PASS':'FAIL')+' json-nonfinite-null');\n"
            "console.log(out.join('\\n'));\n",
            encoding="utf-8")
        try:
            proc = subprocess.run([node, str(harness), str(ROOT)],
                                  capture_output=True, text=True, timeout=60)
        finally:
            harness.unlink(missing_ok=True)
        print(proc.stdout.strip())
        if proc.returncode != 0:
            fail("node harness exit %d: %s" % (proc.returncode, proc.stderr[-300:]))
        for line in proc.stdout.splitlines():
            if line.startswith("FAIL"):
                fail("harness: " + line)
            if line.startswith("PASS"):
                print(line.replace("PASS ", "PASS harness-"))

    for f in ("export.js", "app.js"):
        src = (ROOT / "js" / f).read_text(encoding="utf-8")
        hits = re.findall(r"innerHTML\s*=\s*(['\"])(.*?)\1", src)
        check(f + "-no-innerhtml-injection",
              all(body == "" for _, body in hits),
              "non-empty innerHTML assignments=%s" % [b for _, b in hits if b != ""])

    if FAILURES:
        print("TESTER FINAL REPORTS: %d FAILING" % len(FAILURES))
        for f in FAILURES:
            print("FAIL " + f)
        return 1
    print("TESTER FINAL REPORTS: ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
