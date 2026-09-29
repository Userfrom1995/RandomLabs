#!/usr/bin/env python3
"""Tester round-10 regression suite for Netpulse Final PR #495 (Refs #489).

Locks the live-verified state of the current head: six balanced sections
with DNS closed before Traffic, full-row source badges at natural width
(flex:none + nowrap/ellipsis/max-width, zero `anywhere` in badge path),
independent np-val word-bound wrapping, hostile export parity on shipped
js/export.js (csvCell non-finite guard, string-only formula prefix,
invalid-date stamp fallback, junk-row drop with signal kept), six-tab
copy, sequential docs steps, six wired Reports buttons, and zero
external CDN scripts.

Stdlib only. Run: python3 netpulse/tests/test_tester_residual_r10.py
"""
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FAILURES = []


def check(name, cond, detail=""):
    if cond:
        print("PASS " + name)
    else:
        FAILURES.append("%s %s" % (name, detail))
        print("FAIL " + name + (" " + detail if detail else ""))


css = (ROOT / "netpulse/css/netpulse.css").read_text()
html = (ROOT / "netpulse/index.html").read_text()
ui = (ROOT / "netpulse/js/ui.js").read_text()
app = (ROOT / "netpulse/js/app.js").read_text()
export_src = (ROOT / "netpulse/js/export.js").read_text()

# 1. Shell structure: 6 sections balanced, DNS closed before Traffic.
check("r10-six-sections-balanced",
      html.count("<section") == 6 and html.count("</section>") == 6,
      "%d open / %d close" % (html.count("<section"), html.count("</section>")))
dsec = html.find('<section id="tabpanel-dns"')
tsec = html.find('<section id="tabpanel-traffic"')
seg = html[dsec:tsec] if dsec != -1 and tsec != -1 else ""
check("r10-dns-closed-before-traffic",
      dsec != -1 and tsec != -1 and "</section>" in seg)

# 2. Badge contract: full-row, nowrap+ellipsis, flex:none, no anywhere.
badge = re.search(r"\.np-badge\s*\{([^}]*)\}", css, re.S)
check("r10-badge-block-found", badge is not None)
body = badge.group(1) if badge else ""
check("r10-badge-no-anywhere", "anywhere" not in body, body[:200])
check("r10-badge-nowrap-ellipsis",
      "white-space: nowrap" in body and "text-overflow: ellipsis" in body
      and "max-width: 100%" in body and "flex: none" in body, body[:200])
check("r10-badge-full-row", "grid-column" in body and "1 / -1" in body, body[:200])

# 3. np-val independent wrap (word bounds, no anywhere).
val = re.search(r"\.np-kv dd > \.np-val\s*\{([^}]*)\}", css, re.S)
check("r10-val-block-found", val is not None)
vbody = val.group(1) if val else ""
check("r10-val-word-bounds",
      "overflow-wrap: break-word" in vbody and "word-break: normal" in vbody
      and "anywhere" not in vbody, vbody[:200])
check("r10-ui-val-wrapper", 'el("span", "np-val"' in ui or '"np-val"' in ui)
check("r10-ui-badge-title", "b.title = source" in ui)
check("r10-ui-badge-textcontent", "b.textContent = source" in ui)

# 4. Tablist wrap + grid hardening intact.
check("r10-tablist-wrap", "flex-wrap: wrap" in css)
check("r10-grid-hardening", ".np-grid > *" in css and "min-width: 0" in css)

# 5. Hostile export probe on the shipped file.
def node_probe():
    if shutil.which("node") is None:
        return None
    js = (
        "const fs=require('fs'),vm=require('vm');"
        "const src=fs.readFileSync('netpulse/js/export.js','utf8');"
        "const sb={console};sb.window=sb;vm.createContext(sb);"
        "vm.runInContext(src+';globalThis.__E=NetpulseExport;',sb);"
        "const E=sb.__E;const out={};"
        "out.cellNaN=E.csvCell(NaN);out.cellInf=E.csvCell(Infinity);"
        "out.negNum=E.csvCell(-5);out.negStr=E.csvCell('-5');"
        "const p=E.probesToCsv([{t:NaN,kind:Infinity,endpoint:'x',summary:{}}]);"
        "out.parity=(p.includes('NaN')||p.includes('Infinity'))?'LEAK':'CLEAN';"
        "out.formula=E.csvCell('=1+1');"
        "const st=E.stampFilename('s','garbage-date');"
        "out.stamp=st.includes('NaN')?'LEAK':'CLEAN';"
        "const r0=E.buildReport({history:[{}],trafficRows:[{}]});"
        "out.junk=(r0.probeRuns.length===0&&r0.transfers.length===0)?'DROPPED':'KEPT';"
        "const r1=E.buildReport({history:[{t:'x',kind:'k',summary:{attempts:1}}]});"
        "out.signal=r1.probeRuns.length;"
        "const t=E.trafficToCsv([{name:NaN,initiator:Infinity,durationMs:NaN}]);"
        "out.tpar=(t.includes('NaN')||t.includes('Infinity'))?'LEAK':'CLEAN';"
        "const ev=E.eventsToCsv([{t:NaN,type:'x',detail:Infinity}]);"
        "out.epar=(ev.includes('NaN')||ev.includes('Infinity'))?'LEAK':'CLEAN';"
        "console.log(JSON.stringify(out));"
    )
    r = subprocess.run(["node", "-e", js], capture_output=True, text=True,
                       timeout=30, cwd=str(ROOT))
    if r.returncode != 0:
        return None
    import json
    try:
        return json.loads(r.stdout.strip().splitlines()[-1])
    except Exception:
        return None


probe = node_probe()
check("r10-node-probe-ran", probe is not None)
if probe is not None:
    check("r10-csvcell-nan-empty", probe.get("cellNaN") == "", repr(probe.get("cellNaN")))
    check("r10-csvcell-inf-empty", probe.get("cellInf") == "", repr(probe.get("cellInf")))
    check("r10-negnum-untouched", probe.get("negNum") == "-5", repr(probe.get("negNum")))
    check("r10-negstr-prefixed", probe.get("negStr") == "'-5", repr(probe.get("negStr")))
    check("r10-probe-parity-clean", probe.get("parity") == "CLEAN", probe.get("parity"))
    check("r10-traffic-parity-clean", probe.get("tpar") == "CLEAN", probe.get("tpar"))
    check("r10-events-parity-clean", probe.get("epar") == "CLEAN", probe.get("epar"))
    check("r10-formula-prefixed", probe.get("formula") == "'=1+1", repr(probe.get("formula")))
    check("r10-stamp-fallback", probe.get("stamp") == "CLEAN", probe.get("stamp"))
    check("r10-junk-dropped", probe.get("junk") == "DROPPED", probe.get("junk"))
    check("r10-signal-kept", probe.get("signal") == 1, repr(probe.get("signal")))

# 6. Docs + copy + reports wiring + hygiene.
check("r10-export-no-innerhtml", "innerHTML" not in export_src)
check("r10-app-innerhtml-clears-only",
      all(l.strip().endswith('= "";') for l in app.splitlines() if "innerHTML" in l))
check("r10-six-tab-copy", "six tab" in (ROOT / "netpulse/README.md").read_text().lower())
steps = [l.strip() for l in (ROOT / "netpulse/docs/index.md").read_text().splitlines()
         if re.match(r"\s*\d+\.\s", l)]
nums = [int(re.match(r"\s*(\d+)\.", l).group(1)) for l in steps]
check("r10-docs-steps-sequential", nums == sorted(nums) and len(set(nums)) == len(nums),
      repr(nums[-4:]) if nums else "no steps")
for bid in ("btn-export-json", "btn-export-probes", "btn-export-traffic",
            "btn-export-events", "btn-report-print", "btn-report-clear"):
    check("r10-btn-" + bid, bid in html and bid in app, bid)
check("r10-zero-cdn-scripts", len(re.findall(r'<script[^>]+src="http', html)) == 0)
check("r10-no-em-dashes", "\u2014" not in css and "\u2014" not in export_src)
check("r10-selftest-text-parity", "export-text-parity" in app)
check("r10-repro-executable", (ROOT / "netpulse/repro.sh").stat().st_mode & 0o111 != 0)

print("TESTER RESIDUAL R10: " + ("ALL PASS" if not FAILURES else "%d FAILING" % len(FAILURES)))
raise SystemExit(1 if FAILURES else 0)
