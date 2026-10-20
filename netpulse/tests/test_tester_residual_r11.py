#!/usr/bin/env python3
"""Tester round-11 regression suite for the #714 curate fixes.

Locks the two public-surface contracts this PR restores:

1. Netpulse key-value grids keep a bounded label column so long labels
   ("Round-trip time (ms, estimate)") can never starve the value column
   and fragment a short value like "not exposed" mid-word. The value track
   keeps `minmax(0, 1fr)` and the 480 px single-column override stays.
2. The archive catalog names the project "Redline Rush", matching its
   README title, HTML title, and h1, while the `rush/` link is unchanged.

Stdlib only. Run: python3 netpulse/tests/test_tester_residual_r11.py
"""
import re
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


def top_level_blocks(selector):
    """Bodies of every top-level selector rule (media/supports children excluded).

    Returns the blocks in source order so callers can pin the LAST one: a
    later cascade override of a pinned rule must never slip past the suite.
    """
    blocks = []
    for match in re.finditer(selector + r"\s*\{", css):
        before = css[:match.start()]
        if before.count("{") != before.count("}"):
            continue
        end = css.find("}", match.end())
        if end != -1:
            blocks.append(css[match.end():end])
    return blocks


# 1. Netpulse kv grid: bounded label column, non-starving value track.
kv_blocks = top_level_blocks(r"\.np-kv")
check("r11-kv-block-found", len(kv_blocks) >= 1, repr(len(kv_blocks)))
kv_body = kv_blocks[-1] if kv_blocks else ""
cols = re.search(r"grid-template-columns:\s*([^;]+);", kv_body)
check("r11-kv-columns-found", cols is not None, kv_body[:200])
col_spec = cols.group(1).strip() if cols else ""
check("r11-kv-label-bounded-40pct",
      re.fullmatch(r"minmax\(\s*140px\s*,\s*40%\s*\)\s+minmax\(\s*0\s*,\s*1fr\s*\)",
                   col_spec) is not None, col_spec)
check("r11-kv-label-no-auto", "auto" not in col_spec, col_spec)

# The dd must stay display:contents so dt/.np-val/.np-badge are grid items.
dd_blocks = top_level_blocks(r"\.np-kv dd")
check("r11-dd-block-found", len(dd_blocks) >= 1, repr(len(dd_blocks)))
dd_body = dd_blocks[-1] if dd_blocks else ""
check("r11-dd-display-contents", "display: contents" in dd_body, dd_body[:200])

# 2. Short values keep the word-bound contract (never rebuilt onto anywhere).
val_blocks = top_level_blocks(r"\.np-kv dd > \.np-val")
check("r11-val-block-found", len(val_blocks) >= 1, repr(len(val_blocks)))
val_body = val_blocks[-1] if val_blocks else ""
check("r11-val-word-bounded",
      "overflow-wrap: break-word" in val_body
      and "word-break: normal" in val_body
      and "anywhere" not in val_body, val_body[:200])
check("r11-val-shrinkable",
      "min-width: 0" in val_body and "max-width: 100%" in val_body,
      val_body[:200])

# 3. The mobile single-column override still applies below 481 px.
media = re.search(r"@media\s*\(max-width:\s*480px\)\s*\{(.*?)\n\}", css, re.S)
check("r11-mobile-media-found", media is not None)
media_body = media.group(1) if media else ""
check("r11-mobile-kv-single-column",
      re.search(r"\.np-kv\s*\{[^}]*grid-template-columns:\s*1fr;", media_body) is not None,
      media_body[:300])

# Print keeps the same bounded two-column grid (no divergent print override).
print_media = re.search(r"@media\s+print\s*\{(.*?)\n\}", css, re.S)
check("r11-print-media-found", print_media is not None)
print_body = print_media.group(1) if print_media else ""
check("r11-print-kv-not-overridden", ".np-kv" not in print_body, print_body[:200])

# 4. Archive catalog uses the shipped project name and keeps the link.
archive = (ROOT / "archive/README.md").read_text()
rows = [l for l in archive.splitlines() if "[rush/](rush/)" in l]
check("r11-archive-row-unique", len(rows) == 1, repr(rows))
row = rows[0] if rows else ""
check("r11-archive-row-name", "**Redline Rush**" in row, row)
check("r11-archive-no-stale-rush-name", "**Rush**" not in row, row)

rush_readme = (ROOT / "archive/rush/README.md").read_text()
first = rush_readme.splitlines()[0].strip() if rush_readme.strip() else ""
check("r11-rush-readme-title", first == "# Redline Rush", first)

rush_html = (ROOT / "archive/rush/index.html").read_text()
title = re.search(r"<title>(.*?)</title>", rush_html, re.S)
check("r11-rush-html-title",
      title is not None and title.group(1).strip().startswith("Redline Rush"),
      title.group(1).strip() if title else "missing")
h1 = re.search(r"<h1>(.*?)</h1>", rush_html, re.S)
h1_text = re.sub(r"<[^>]+>", "", h1.group(1)).replace("&nbsp;", " ").strip() if h1 else ""
check("r11-rush-html-h1", h1_text == "Redline Rush", repr(h1_text))

check("r11-rush-dir-present", (ROOT / "archive/rush").is_dir())
check("r11-rush-index-present", (ROOT / "archive/rush/index.html").is_file())

print("TESTER RESIDUAL R11: " + ("ALL PASS" if not FAILURES else "%d FAILING" % len(FAILURES)))
raise SystemExit(1 if FAILURES else 0)
