#!/usr/bin/env python3
"""Tester round-8 regression suite for Netpulse Final PR #495 (Refs #489).

Locks the state verified live on the current head: source badges on
their own full-width kv-grid row at natural width (dd display:contents,
badge grid-column 1/-1, flex:none + nowrap/ellipsis/max-width safety,
title fallback in ui.js badge()), hostile export parity on the shipped
js/export.js (csvCell non-finite guard, formula prefix, stamp fallback,
junk-row drop), shell structure (6 sections balanced), and docs/copy.

Stdlib only. Run: python3 netpulse/tests/test_tester_residual_r8.py
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
    js = (
        "global.window=global;"
        "eval(require('fs').readFileSync('netpulse/js/export.js','utf8'));"
        "const E=global.NetpulseExport;"
        "const out={};"
        "out.cellNaN=E.csvCell(NaN);out.cellInf=E.csvCell(Infinity);"
        "const p=E.probesToCsv([{t:NaN,kind:Infinity}]);"
        "out.parity=(p.includes('NaN')||p.includes('Infinity'))?'LEAK':'CLEAN';"
        "out.formula=E.csvCell('=1+1');"
        "const st=E.stampFilename('s','garbage-date');"
        "out.stamp=st.includes('NaN')?'LEAK':'CLEAN';"
        "const r0=E.buildReport({history:[{}],trafficRows:[{}]});"
        "out.junk=(r0.probeRuns.length===0&&r0.transfers.length===0)?'DROPPED':'KEPT';"
        "const r1=E.buildReport({history:[{t:'x',kind:'k'}]});"
        "out.signal=r1.probeRuns.length;"
        "const t=E.trafficToCsv([{name:NaN,initiator:Infinity,durationMs:NaN}]);"
        "out.tpar=(t.includes('NaN')||t.includes('Infinity'))?'LEAK':'CLEAN';"
        "console.log(JSON.stringify(out));"
    )
    r = subprocess.run(["node", "-e", js], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        return None
    import json
    try:
        return json.loads(r.stdout.strip().splitlines()[-1])
    except Exception:
        return None


def main():
    css = (ROOT / "css" / "netpulse.css").read_text()
    ui = (ROOT / "js" / "ui.js").read_text()
    html = (ROOT / "index.html").read_text()
    readme = (ROOT / "README.md").read_text()

    badge = re.search(r"\.np-badge\s*\{([^}]*)\}", css, re.S)
    body = badge.group(1) if badge else ""
    check("r8-badge-full-row", "grid-column" in body and "1 / -1" in body)
    check("r8-badge-no-crush", re.search(r"flex\s*:\s*none", body) is not None)
    check("r8-badge-nowrap-ellipsis",
          "white-space" in body and "nowrap" in body and "text-overflow" in body)
    check("r8-badge-no-anywhere", "anywhere" not in body)
    dd = re.search(r"\.np-kv\s+dd\s*\{([^}]*)\}", css, re.S)
    check("r8-dd-display-contents",
          dd is not None and "display" in dd.group(1) and "contents" in dd.group(1))
    check("r8-badge-title-fallback", "b.title" in ui or ".title" in ui)
    check("r8-tabs-flex-wrap", "flex-wrap" in css)
    check("r8-sections-balanced",
          html.count("<section") == 6 and html.count("</section>") == 6)
    dns = html.find('id="tabpanel-dns"')
    tra = html.find('id="tabpanel-traffic"')
    check("r8-dns-closed-before-traffic",
          dns != -1 and tra != -1 and dns < tra and
          html.find("</section>", dns) != -1 and
          html.find("</section>", dns) < tra)
    check("r8-readme-six-tabs", "six tab" in readme.lower())

    probe = node_probe()
    if probe is None:
        check("r8-node-probe-ran", False, "node probe failed")
    else:
        check("r8-cell-nonfinite-empty",
              probe.get("cellNaN") == "" and probe.get("cellInf") == "")
        check("r8-probe-text-parity", probe.get("parity") == "CLEAN")
        check("r8-traffic-text-parity", probe.get("tpar") == "CLEAN")
        check("r8-formula-prefixed",
              isinstance(probe.get("formula"), str) and probe["formula"].startswith("'=1+1"))
        check("r8-stamp-no-nan", probe.get("stamp") == "CLEAN")
        check("r8-junk-dropped", probe.get("junk") == "DROPPED")
        check("r8-signal-kept", probe.get("signal") == 1)

    print("TESTER RESIDUAL R8: " + ("ALL PASS" if not FAILURES else "FAIL %d" % len(FAILURES)))
    return 1 if FAILURES else 0


if __name__ == "__main__":
    raise SystemExit(main())
