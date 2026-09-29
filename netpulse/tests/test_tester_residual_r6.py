#!/usr/bin/env python3
"""Tester round-6 regression suite for Netpulse Final PR #495 (Refs #489).

Locks the desktop badge-LEGIBILITY contract discovered by live visual
inspection: source badges must render at natural width (zero clipped
pixels), not merely as one-line ellipsis pills.

Background: the flex-crush rounds left `.np-badge` as `flex: none` +
`white-space: nowrap` + `text-overflow: ellipsis` + `max-width: 100%`
inside a flex `.np-kv dd`. Live measurement in real Chromium at 1280px
(three-column Overview) proved the `dd` itself is squeezed by the
`minmax(140px, auto) 1fr` grid (dd widths 56-146px), so pills render as
"NET...", "DEVI..." with 141-178px of clipped source text:

  "Network Information API": needs 197px, gets 56px (clip 141px)
  "Browser online state":    needs 174px, gets 146px (clip 28px)
  "Device hint - not network state": needs 248px, gets 70px (clip 178px)

Badges carry no `title` fallback (netpulse/js/ui.js `badge()` sets
textContent only), so the clipped source is unrecoverable by the user
and the product's headline promise ("every number carries a source
badge") fails on the default desktop view. Mobile 390px is unaffected
(single column, pills fit).

Required contract: the badge must sit on its own full-width row of the
kv grid (e.g. `display: contents` on the `dd` plus
`grid-column: 1 / -1` on the badge), keeping nowrap/ellipsis/max-width
as ultimate overflow safety, zero `anywhere` fragmentation in the badge
path, and tablist flex-wrap plus grid min-width hardening intact.

Experimentally verified in /tmp against a copy of this tree (candidate
C): all Overview badges at natural width, zero clipped pixels, zero
h-scroll at 1280px and 390px.

Stdlib only. Run: python3 netpulse/tests/test_tester_residual_r6.py
"""
import re
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
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    m = re.search(r"\.np-badge\s*\{([^}]*)\}", css)
    badge = m.group(1) if m else ""
    dd = re.search(r"\.np-kv dd\s*\{([^}]*)\}", css)
    dd_block = dd.group(1) if dd else ""

    # 1. Badge escapes the squeezed flex line onto its own full row.
    #    display:contents on dd + grid-column span on the badge is the
    #    verified mechanism; any equivalent full-row placement passes
    #    if it names both halves explicitly.
    dd_contents = "display: contents" in dd_block or "display:contents" in dd_block
    badge_spans = "grid-column" in badge and "-1" in badge
    check("r6-badge-full-row",
          dd_contents and badge_spans,
          "badge must sit on its own full kv-grid row "
          "(dd display:contents + badge grid-column: 1 / -1); "
          "flex:none alone leaves pills clipped to 56-70px at 1280px")

    # 2. Prior hardening retained: one-line pill, ellipsis as ultimate
    #    safety only, never per-character fragmentation.
    check("r6-badge-one-line",
          "white-space: nowrap" in badge
          and "text-overflow: ellipsis" in badge
          and "max-width: 100%" in badge,
          "nowrap + ellipsis + max-width safety required")
    check("r6-badge-no-anywhere", "anywhere" not in badge,
          "no per-character fragmentation in badge path")

    # 3. Surrounding hardening intact.
    check("r6-tablist-wraps",
          re.search(r"\.np-tabs\s*\{([^}]*)\}", css) is not None
          and "flex-wrap" in re.search(r"\.np-tabs\s*\{([^}]*)\}", css).group(1),
          ".np-tabs must keep flex-wrap")
    check("r6-grid-hardened", "min-width: 0" in css or "min-width:0" in css,
          "grid/panel min-width hardening must stay")

    # 4. Shell structure guard (regression anchor for the section fix).
    check("r6-sections-balanced",
          len(re.findall(r"<section", html)) == 6
          and len(re.findall(r"</section>", html)) == 6,
          "6 open / 6 close required")
    dns_close = html.find('id="tabpanel-dns"')
    traffic_open = html.find('id="tabpanel-traffic"')
    between = html[dns_close:traffic_open] if 0 <= dns_close < traffic_open else ""
    check("r6-dns-closed-before-traffic", "</section>" in between,
          "Traffic panel must not nest inside DNS panel")

    print("TESTER RESIDUAL R6: %s" % ("ALL PASS" if not FAILURES else "FAILURES %d" % len(FAILURES)))
    return 1 if FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
