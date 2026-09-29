"""Tester residual R9: lock the independent value/badge wrapping contract.

Newest HEAD state (fixer 3004ee13/421727b0/68982028): kv values render
inside a dedicated `span.np-val` wrapper so long device-context strings
(e.g. the 160-char user-agent slice) wrap independently, while source
badges keep the one-line full-row contract (flex:none, nowrap, ellipsis,
max-width, zero `anywhere` in the badge path) with a title fallback.
"""
import re
import subprocess

PASS = []
FAIL = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else " -- " + detail))


css = open("netpulse/css/netpulse.css").read()
ui = open("netpulse/js/ui.js").read()

badge = re.search(r"\.np-badge\s*\{([^}]*)\}", css, re.S)
check("r9-badge-block-found", badge is not None)
body = badge.group(1) if badge else ""
check("r9-badge-no-anywhere", "anywhere" not in body, body[:200])
check("r9-badge-nowrap-ellipsis",
      "white-space: nowrap" in body and "text-overflow: ellipsis" in body
      and "max-width: 100%" in body and "flex: none" in body)
check("r9-badge-full-row", "grid-column" in body and "1 / -1" in body)

val = re.search(r"\.np-kv dd > \.np-val\s*\{([^}]*)\}", css, re.S)
check("r9-val-block-found", val is not None)
vbody = val.group(1) if val else ""
check("r9-val-wraps-independently",
      "overflow-wrap: break-word" in vbody and "word-break: normal" in vbody
      and "max-width: 100%" in vbody and "anywhere" not in vbody,
      vbody[:200])

check("r9-ui-val-wrapper", 'el("span", "np-val"' in ui)
check("r9-ui-badge-title", "b.title = source" in ui)
check("r9-ui-badge-textcontent", "b.textContent = source" in ui)

node_probe = r"""
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('netpulse/js/export.js','utf8');
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(src+';globalThis.__E=NetpulseExport;',sb);
const E=sb.__E; const out=[];
function ok(n,c){ out.push((c?'PASS':'FAIL')+' '+n); }
ok('r9-formula-string-neg-prefixed', E.csvCell('-5')==="'-5");
ok('r9-formula-number-neg-untouched', E.csvCell(-5)==='-5');
ok('r9-formula-number-neg-float', E.csvCell(-3.2)==='-3.2');
ok('r9-text-nan-empty', E.csvCell(NaN)==='');
console.log(out.join('\n'));
if(out.some(l=>l.startsWith('FAIL'))) process.exit(1);
"""
p = subprocess.run(["node", "-e", node_probe],
                   capture_output=True, text=True, cwd=".")
print(p.stdout.strip())
check("r9-node-formula-scalar-guard", p.returncode == 0,
      (p.stdout + p.stderr)[-500:])

html = open("netpulse/index.html").read()
check("r9-six-sections-balanced",
      html.count("<section") == 6 and html.count("</section>") == 6)
dns_open = html.find('<section id="tabpanel-dns"')
traffic_open = html.find('<section id="tabpanel-traffic"')
seg = html[dns_open:traffic_open] if dns_open != -1 and traffic_open != -1 else ""
check("r9-dns-closed-before-traffic",
      dns_open != -1 and traffic_open != -1 and "</section>" in seg)

print("TESTER RESIDUAL R9: " + ("ALL PASS" if not FAIL else f"{len(FAIL)} FAILING"))
raise SystemExit(1 if FAIL else 0)
