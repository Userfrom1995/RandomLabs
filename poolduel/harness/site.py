"""Poolduel M11b static-site generator: bundles in, pre-rendered page facts out.

Reads the committed ``results/m1/medians.json`` +
``results/m2/medians.json`` + ``results/m9/medians.json`` +
``results/report.json`` (with the M10 ``statistics`` leg) and writes
``results/sitemeta.json``: the single machine-readable source for every
pre-rendered number on the master report (executive headline cards,
flagship baseline rows, M2 block rows, M9 leg summary, iso slices,
flatness verdicts). ``--apply`` splices the generated HTML into
``poolduel/index.html`` between ``SITE:<name>:begin/end`` markers, so
the page reads correctly with JavaScript disabled and carries zero
``pending`` cells as content. The drift test
(``tests/test_m11b_site.py``) fails when the page disagrees with this
file or this file disagrees with the bundles.

No hand-typed numbers anywhere downstream: the generator counts the
bundles, never the other way round. Claim titles come from
``statistics.CLAIM_CELLS`` (the registered wording); plain-words
workload titles derive from the ``M1_CELLS`` geometry.

Stdlib only. No interactive prompts; everything via flags.
"""

import argparse
import copy
import hashlib
import json
import os
import re
import sys

MEASURED = "measured"
TIMEOUT = "timeout/inconclusive"
NA = "N/A (unsupported)"

ARMS = ["direct", "pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat"]

M2_BLOCKS = [
    ("M2-S", "Session pooling"),
    ("M2-T", "Statement pooling"),
    ("M2-I", "I/O backends"),
    ("M2-W", "Workload twins"),
    ("M2-P", "Prepared-statement twins"),
]


def _sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _num(value):
    return value if isinstance(value, (int, float)) else None


def fmt_int(value):
    """Thousand-separated integer for TPS figures (never raw floats)."""
    value = _num(value)
    if value is None:
        return "-"
    return "{:,d}".format(int(round(value)))


def fmt_band(tps):
    """Median [min-max] band for a tps dict, or None when unmeasured."""
    if not isinstance(tps, dict):
        return None
    median = _num(tps.get("median"))
    if median is None:
        return None
    lo = _num(tps.get("min"))
    hi = _num(tps.get("max"))
    if lo is None or hi is None:
        return fmt_int(median)
    return "%s [%s-%s]" % (fmt_int(median), fmt_int(lo), fmt_int(hi))


def fmt_ms(stat):
    """Median milliseconds with one decimal, or '-' when unmeasured."""
    if not isinstance(stat, dict):
        return "-"
    median = _num(stat.get("median"))
    if median is None:
        return "-"
    return "%.1f ms" % median


def fmt_ci(lo, hi):
    lo, hi = _num(lo), _num(hi)
    if lo is None or hi is None:
        return "CI n/a"
    return "95%% CI [%s, %s]" % (fmt_int(lo), fmt_int(hi))


def plain_title(cell):
    """Plain-words workload title derived from cell geometry (no jargon)."""
    workload = cell.get("workload", "?")
    clients = cell.get("clients", "?")
    pool = cell.get("pool_size", "?")
    words = {
        "select-only": "Read-heavy (SELECT-only)",
        "tpcb-like": "Read-write (TPC-B-like)",
        "simple-update": "Write-heavy (simple UPDATE)",
    }.get(workload, str(workload))
    bits = ["%s, %s clients / %s pooled" % (words, clients, pool)]
    if cell.get("protocol") == "prepared":
        bits.append("server-side prepares")
    if cell.get("churn"):
        bits.append("reconnect-per-transaction churn")
    if cell.get("flagship"):
        bits.append("flagship")
    return "; ".join(bits)


def _entry_map(entries):
    out = {}
    for entry in entries or []:
        if isinstance(entry, dict) and "cell_id" in entry:
            out[(entry.get("cell_id"), entry.get("pooler"))] = entry
    return out


def build_executive_cards(bundle):
    """Verified-only headline cards from the M10 statistics re-derivation.

    Titles come from ``statistics.CLAIM_CELLS`` (registered wording in
    claims.md). A surviving win renders ``verified`` with its effect +
    CI; anything else renders ``inconclusive`` with the kill reason, per
    the claims.md kill rule. Returns (cards, headlines_count, family).
    """
    from poolduel.harness import statistics as stats_mod
    stats = (bundle or {}).get("statistics", {}) or {}
    claims = stats.get("claims", []) or []
    by_id = {}
    for item in claims:
        if isinstance(item, dict) and "claim" in item:
            by_id[item["claim"]] = item
    titles = {spec["claim"]: spec["title"] for spec in stats_mod.CLAIM_CELLS}
    arms = {spec["claim"]: (spec["cell_a"], spec["arm_a"],
                            spec["cell_b"], spec["arm_b"])
            for spec in stats_mod.CLAIM_CELLS}
    cards = []
    for cid in sorted(titles):
        item = by_id.get(cid, {})
        verdict = item.get("verdict", "inconclusive")
        ci = item.get("ci") or [None, None]
        effect = _num(item.get("effect"))
        killed_by = item.get("killed_by")
        ca, aa, cb, ab = arms[cid]
        if verdict in ("A faster", "B faster") and killed_by is None:
            badge = "verified"
            detail = "Verdict %s: paired effect %s tps, %s " \
                "(excludes zero, Holm-gated headline)" % (
                    verdict,
                    fmt_int(effect) if effect is not None else "?",
                    fmt_ci(ci[0], ci[1]))
        else:
            badge = "inconclusive"
            reason = killed_by or "no decisive CI"
            detail = "No verified winner (%s); ships as inconclusive, " \
                "never as a win" % reason
        cards.append({
            "claim": cid,
            "title": titles[cid],
            "badge": badge,
            "verdict": verdict,
            "detail": detail,
            "arms": "%s %s vs %s %s" % (aa, ca, ab, cb),
        })
    family = stats.get("family_size", stats.get("family", 0))
    headlines = stats.get("headlines", 0)
    headline_count = (len(headlines) if isinstance(headlines, list)
                      else int(headlines or 0))
    return cards, headline_count, family


def build_flagship(m1_entries, bundle):
    """Seven M1 head-to-head rows with best-arm badges.

    Uses the committed ``best`` leg for the head arm and the raw median
    entries for every arm, so each row shows throughput beside tail
    latency for all six arms with no pending cells.
    """
    from poolduel.harness.cells import M1_CELLS
    by_arm = _entry_map(m1_entries)
    best = ((bundle or {}).get("best", {}) or {})
    rows = []
    for cell in M1_CELLS:
        cid = cell["cell_id"]
        info = best.get(cid, {}) or {}
        ranked = info.get("ranked", []) or []
        head = ranked[0] if ranked else None
        arms = []
        for arm in ARMS:
            entry = by_arm.get((cid, arm), {})
            status = entry.get("status", "missing")
            tps = entry.get("tps") if isinstance(entry, dict) else None
            p99 = entry.get("p99_ms") if isinstance(entry, dict) else None
            n = None
            if isinstance(tps, dict) and _num(tps.get("n")) is not None:
                n = int(tps["n"])
            arms.append({
                "pooler": arm,
                "status": status,
                "tps_band": fmt_band(tps),
                "tps_median": _num(tps.get("median")) if isinstance(
                    tps, dict) else None,
                "p99": fmt_ms(p99),
                "n": n,
                "badge": "Best in class" if head and head.get("pooler")
                == arm and status == MEASURED else "",
            })
        head_name = head.get("pooler") if head else None
        if head_name is None:
            measured = [a for a in arms if a["status"] == MEASURED
                        and a["tps_median"] is not None]
            if measured:
                head_name = max(measured,
                                key=lambda a: a["tps_median"])["pooler"]
        rows.append({
            "cell_id": cid,
            "title": plain_title(cell),
            "geometry": "%s clients / %s pooled, %ss measured" % (
                cell["clients"], cell["pool_size"], cell["duration_s"]),
            "head": head_name,
            "arms": arms,
        })
    return rows


def build_m2_blocks(bundle):
    """Per-cell best rows for the five M2 blocks (never pending)."""
    best = ((bundle or {}).get("best", {}) or {})
    blocks = []
    for prefix, label in M2_BLOCKS:
        cells = sorted([c for c in best if c.startswith(prefix)],
                       key=lambda s: [int(p) if p.isdigit() else p
                                      for p in re.split(r"(\d+)", s)])
        rows = []
        for cid in cells:
            info = best[cid] or {}
            ranked = info.get("ranked", []) or []
            head = ranked[0] if ranked else None
            na = info.get("na", []) or []
            if head is not None:
                tps = head.get("tps") if isinstance(head, dict) else None
                p99 = head.get("p99_ms") if isinstance(head, dict) else None
                rows.append({
                    "cell_id": cid,
                    "head": head.get("pooler"),
                    "verdict": head.get("verdict", ""),
                    "tps_band": fmt_band(tps),
                    "p99": fmt_ms(p99),
                    "na_arms": sorted({n.get("pooler") for n in na
                                       if isinstance(n, dict)}),
                })
            else:
                rows.append({
                    "cell_id": cid,
                    "head": None,
                    "verdict": "no measured arms",
                    "tps_band": None,
                    "p99": "-",
                    "na_arms": sorted({n.get("pooler") for n in na
                                       if isinstance(n, dict)}),
                })
        blocks.append({"prefix": prefix, "label": label, "rows": rows})
    return blocks


def build_m9_leg(m9_entries, bundle):
    """Powered-resweep summary: counts plus the statistics family it feeds."""
    total = len(m9_entries or [])
    measured = sum(1 for e in (m9_entries or [])
                   if isinstance(e, dict) and e.get("status") == MEASURED)
    timeout = sum(1 for e in (m9_entries or [])
                  if isinstance(e, dict) and e.get("status") == TIMEOUT)
    na = sum(1 for e in (m9_entries or [])
             if isinstance(e, dict) and e.get("status") == NA)
    stats = (bundle or {}).get("statistics", {}) or {}
    raw_headlines = stats.get("headlines", 0)
    headline_count = (len(raw_headlines) if isinstance(raw_headlines, list)
                      else int(raw_headlines or 0))
    return {
        "total": total,
        "measured": measured,
        "timeout": timeout,
        "na": na,
        "family": stats.get("family_size", stats.get("family", 0)),
        "headlines": headline_count,
        "method": "flagship n>=10 / standard n>=7, >=3 paired seeds; "
                  "paired 95% bootstrap CIs with Holm correction",
    }


def build_iso_flat(bundle):
    """Pre-rendered iso slices (matched only) and flatness verdicts."""
    regions = []
    for region in ((bundle or {}).get("iso_regions", []) or []):
        if not isinstance(region, dict) or not region.get("matched"):
            continue
        regions.append({
            "label": "%s, %s clients / %s pooled, %ss%s" % (
                region.get("workload"), region.get("clients"),
                region.get("pool_size"), region.get("duration_s"),
                " churn" if region.get("churn") else ""),
            "cells": list(region.get("matched_cells", [])),
        })
    flat = []
    for pooler in sorted(((bundle or {}).get("flatness", {}) or {})):
        info = (bundle or {})["flatness"][pooler] or {}
        peak = info.get("peak") or {}
        trough = info.get("trough") or {}
        spread = _num(info.get("spread"))
        flat.append({
            "pooler": pooler,
            "configs": info.get("configs_measured", 0),
            "spread_pct": round(100.0 * spread, 1)
            if spread is not None else None,
            "verdict": info.get("verdict", ""),
            "peak": "%s @ %s tps" % (
                peak.get("cell_id", "?"),
                fmt_int(peak.get("tps_median"))),
            "trough": "%s @ %s tps" % (
                trough.get("cell_id", "?"),
                fmt_int(trough.get("tps_median"))),
        })
    return regions, flat


def build_soak_leg(soak_entries):
    """Long-horizon stability rows, one per (cell, duration tier).

    Soak is a stability estimand, not a head-to-head: no best arm,
    no verdicts, no headlines. Each row lists every arm's throughput
    band with its status, so a flat leak/tail figure reads beside a
    collapsing one. Tiers stay separate rows (a 30-min tier never
    pools with a 60-min tier).
    """
    from poolduel.harness.soak import SOAK_DURATIONS, SOAK_GEOMETRIES
    nick = {cid: label for (cid, _shape, label) in SOAK_GEOMETRIES}
    by_tier = {}
    for entry in soak_entries or []:
        if not isinstance(entry, dict):
            continue
        key = (entry.get("cell_id"), entry.get("duration_s"))
        by_tier.setdefault(key, {})[entry.get("pooler")] = entry
    rows = []
    for (cid, duration) in sorted(
            by_tier, key=lambda k: (k[0] or "",
                                    k[1] if k[1] is not None else -1)):
        arms = []
        for arm in ARMS:
            entry = by_tier[(cid, duration)].get(arm, {})
            status = entry.get("status", "missing")
            tps = entry.get("tps") if isinstance(entry, dict) else None
            arms.append({
                "pooler": arm,
                "status": status,
                "tps_band": fmt_band(tps),
            })
        minutes = (duration // 60) if isinstance(duration, int) else "?"
        rows.append({
            "cell_id": cid,
            "duration_s": duration,
            "title": "%s, %s-min tier" % (cid, minutes),
            "geometry": nick.get(cid, ""),
            "arms": arms,
        })
    measured = sum(1 for e in (soak_entries or [])
                   if isinstance(e, dict) and e.get("status") == MEASURED)
    timeout = sum(1 for e in (soak_entries or [])
                  if isinstance(e, dict) and e.get("status") == TIMEOUT)
    spec_total = (len(SOAK_GEOMETRIES) * len(SOAK_DURATIONS) * len(ARMS))
    return {
        "total": spec_total,
        "present": len(soak_entries or []),
        "measured": measured,
        "timeout": timeout,
        "missing": spec_total - len(soak_entries or []),
        "rows": rows,
        "method": "30/60-min measured windows, 60 s warmup, 3 paired "
                  "repeats per (cell, arm, tier); drift evidence in "
                  "raw resources_pre/post/drift",
    }


def build_sitemeta(m1_entries, m2_entries, m9_entries, bundle,
                   soak_entries=None):
    """Assemble the full pre-render bundle (all inputs already loaded)."""
    cards, headline_count, family = build_executive_cards(bundle)
    regions, flat = build_iso_flat(bundle)
    m1_measured = sum(1 for e in (m1_entries or [])
                      if isinstance(e, dict) and e.get("status") == MEASURED)
    m2_total = len(m2_entries or [])
    m2_na = sum(1 for e in (m2_entries or [])
                if isinstance(e, dict) and e.get("status") == NA)
    return {
        "executive_cards": cards,
        "headline_count": headline_count,
        "family": family,
        "flagship": build_flagship(m1_entries, bundle),
        "m2_blocks": build_m2_blocks(bundle),
        "m9_leg": build_m9_leg(m9_entries, bundle),
        "soak_leg": build_soak_leg(soak_entries),
        "iso_regions": regions,
        "flatness": flat,
        "counts": {
            "m1_total": len(m1_entries or []),
            "m1_measured": m1_measured,
            "m2_total": m2_total,
            "m2_na": m2_na,
            "soak_total": len(soak_entries or []),
        },
    }


def _esc(text):
    return (str(text).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def render_cards_html(cards):
    parts = ['<div class="cards">']
    for card in cards:
        cls = "card ok" if card["badge"] == "verified" else "card warn"
        parts.append(
            '<div class="%s"><span class="pill %s">%s</span>'
            "<strong>Claim %s: %s</strong><br>"
            '<span class="note">%s</span><br>'
            '<span class="note">%s</span></div>' % (
                cls, "ok" if card["badge"] == "verified" else "pend",
                _esc(card["badge"]), card["claim"], _esc(card["title"]),
                _esc(card["detail"]), _esc(card["arms"])))
    parts.append("</div>")
    return "\n".join(parts)


def render_flagship_html(rows):
    parts = [
        '<div class="viewtoggle" role="group" aria-label="Columns">'
        '<button data-view="tps" class="on">Throughput</button>'
        '<button data-view="lat">Latency</button>'
        '<button data-view="all" class="on">All telemetry</button></div>',
        '<table id="results-m1"><tr><th>Workload</th>'
        '<th>Best arm</th>'
        '<th data-col="tps">Throughput tps (median [min-max])</th>'
        '<th data-col="lat">Tail latency p99</th>'
        '<th data-col="all">All arms (tps band; n; status)</th></tr>',
    ]
    for row in rows:
        arms = row["arms"]
        best_cell = []
        for arm in arms:
            if arm["status"] == MEASURED and arm["tps_band"]:
                cell = "%s: %s (n=%s)" % (
                    arm["pooler"], arm["tps_band"],
                    arm["n"] if arm["n"] is not None else "?")
            elif arm["status"] == NA:
                cell = "%s: N/A (unsupported)" % arm["pooler"]
            else:
                cell = "%s: timeout/inconclusive" % arm["pooler"]
            if arm["badge"]:
                cell += " [Best in class]"
            best_cell.append(_esc(cell))
        head = row["head"] or "no measured arms"
        head_arm = next((a for a in arms if a["pooler"] == row["head"]), None)
        tps = head_arm["tps_band"] if head_arm else "-"
        p99 = head_arm["p99"] if head_arm else "-"
        parts.append(
            "<tr><td><strong>%s</strong><br><span class='note'>%s; %s"
            "</span></td><td>%s</td>"
            '<td data-col="tps">%s</td><td data-col="lat">%s</td>'
            '<td data-col="all" class="note">%s</td></tr>' % (
                _esc(row["cell_id"]), _esc(row["title"]),
                _esc(row["geometry"]), _esc(head),
                _esc(tps or "-"), _esc(p99),
                "<br>".join(best_cell)))
    parts.append("</table>")
    return "\n".join(parts)


def render_m2_html(blocks):
    parts = []
    for block in blocks:
        parts.append("<h3>%s block (%s)</h3>" % (
            _esc(block["label"]), _esc(block["prefix"])))
        parts.append('<table><tr><th>Cell</th><th>Best arm</th>'
                     '<th>Throughput tps (median [min-max])</th>'
                     '<th>Tail latency p99</th><th>N/A arms</th></tr>')
        for row in block["rows"]:
            na = ", ".join(row["na_arms"]) if row["na_arms"] else "-"
            verdict = row["verdict"]
            head = row["head"] or "no measured arms"
            if verdict and verdict != "best":
                head += " (%s)" % verdict
            parts.append("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td>"
                         '<td class="na">%s</td></tr>' % (
                             _esc(row["cell_id"]), _esc(head),
                             _esc(row["tps_band"] or "-"), _esc(row["p99"]),
                             _esc(na)))
        parts.append("</table>")
    return "\n".join(parts)


def render_iso_flat_html(regions, flat):
    parts = []
    if regions:
        for region in regions:
            parts.append("<p class='note'><code>%s</code> matched cells: %s"
                         "</p>" % (_esc(region["label"]),
                                    _esc(", ".join(region["cells"]))))
    else:
        parts.append("<p class='note'>No matched iso-region slices in "
                     "this bundle.</p>")
    parts.append('<table><tr><th>Pooler</th><th>Configs</th><th>Spread</th>'
                 '<th>Verdict</th><th>Peak</th><th>Trough</th></tr>')
    for entry in flat:
        spread = ("%.1f%%" % entry["spread_pct"]
                  if entry["spread_pct"] is not None else "-")
        parts.append("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td>"
                     "<td>%s</td><td>%s</td></tr>" % (
                         _esc(entry["pooler"]), entry["configs"],
                         spread, _esc(entry["verdict"]),
                         _esc(entry["peak"]), _esc(entry["trough"])))
    parts.append("</table>")
    return "\n".join(parts)


def render_m9_html(leg):
    return (
        "<p>Powered resweep: <strong>%s measured</strong> of %s cells "
        "(%s timeout/inconclusive, %s unsupported with nulls). "
        "Statistics family %s with %s Holm-gated headlines. "
        "Method: %s. Full matrix: "
        '<a href="results/m9/matrix.csv">results/m9/matrix.csv</a>.</p>' % (
            leg["measured"], leg["total"], leg["timeout"], leg["na"],
            leg["family"], leg["headlines"], _esc(leg["method"])))


def render_soak_html(leg):
    parts = [
        "<p>Long-horizon stability: <strong>%s measured</strong> of %s "
        "spec tier-cells (%s present, %s timeout/inconclusive, %s "
        "not yet measured). No best arm, no verdicts: soak figures "
        "read as stability beside collapse. "
        "Method: %s. Full matrix: "
        '<a href="results/m10-soak/matrix.csv">results/m10-soak/'
        "matrix.csv</a>.</p>" % (
            leg["measured"], leg["total"], leg["present"],
            leg["timeout"], leg["missing"],
            _esc(leg["method"])),
    ]
    if not leg["rows"]:
        parts.append("<p class='note'>No soak tiers measured yet.</p>")
        return "\n".join(parts)
    parts.append(
        "<p>Stability figures (tps per tier per arm with min-max "
        "bands plus p99 tails, beside harness RSS/FD drift panels; "
        "absent tiers mark re-dispatch-owned, never zero-filled):</p>")
    for cell in ("M10-S1", "M10-S2", "M10-S3"):
        parts.append(
            '<div class="echart" data-page="comparison" '
            'data-chart="soak-%s"></div>' % cell)
        parts.append(
            '<div class="echart" data-page="comparison" '
            'data-chart="soak-%s-drift"></div>' % cell)
    parts.append('<table><tr><th>Tier cell</th><th>Geometry</th>'
                 '<th>Arms (tps median [min-max]; status)</th></tr>')
    for row in leg["rows"]:
        cells = []
        for arm in row["arms"]:
            if arm["status"] == MEASURED and arm["tps_band"]:
                cells.append("%s: %s" % (arm["pooler"], arm["tps_band"]))
            elif arm["status"] == TIMEOUT:
                cells.append("%s: timeout/inconclusive" % arm["pooler"])
            elif arm["status"] == "missing":
                cells.append("%s: tier not in git (re-dispatch owned "
                             "by Maintainer)" % arm["pooler"])
            else:
                cells.append("%s: %s" % (arm["pooler"], arm["status"]))
        parts.append("<tr><td><strong>%s</strong></td><td>%s</td>"
                     '<td class="note">%s</td></tr>' % (
                         _esc(row["title"]), _esc(row["geometry"]),
                         "<br>".join(_esc(c) for c in cells)))
    parts.append("</table>")
    return "\n".join(parts)


SECTIONS = ("exec", "flagship", "m2", "m9", "soak", "isoflat")


def render_all(meta):
    return {
        "exec": render_cards_html(meta["executive_cards"]),
        "flagship": render_flagship_html(meta["flagship"]),
        "m2": render_m2_html(meta["m2_blocks"]),
        "m9": render_m9_html(meta["m9_leg"]),
        "soak": render_soak_html(meta["soak_leg"]),
        "isoflat": render_iso_flat_html(meta["iso_regions"],
                                        meta["flatness"]),
    }


def apply_to_index(index_path, rendered):
    """Splice generated HTML into SITE markers (fails loudly if absent)."""
    with open(index_path) as handle:
        text = handle.read()
    for name, html in rendered.items():
        begin = "<!-- SITE:%s:begin -->" % name
        end = "<!-- SITE:%s:end -->" % name
        if begin not in text or end not in text:
            raise ValueError("index.html lacks markers for %s" % name)
        pattern = re.compile(re.escape(begin) + r".*?" + re.escape(end),
                             re.DOTALL)
        text = pattern.sub(begin + "\n" + html + "\n" + end, text)
    with open(index_path, "w") as handle:
        handle.write(text)


def _load(path):
    with open(path) as handle:
        return json.load(handle)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m1", required=True)
    parser.add_argument("--m2", required=True)
    parser.add_argument("--m9", required=True)
    parser.add_argument("--soak",
                        default="poolduel/results/m10-soak/medians.json",
                        help="M10 soak medians (tier-labeled); missing "
                             "file renders the honestly-empty soak "
                             "section instead of failing")
    parser.add_argument("--report", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--apply", default=None,
                        help="index.html path to splice rendered HTML into")
    args = parser.parse_args(argv)
    m1 = _load(args.m1)
    m2 = _load(args.m2)
    m9 = _load(args.m9)
    try:
        with open(args.soak) as handle:
            soak = json.load(handle)
    except (OSError, ValueError):
        soak = []
    bundle = _load(args.report)
    meta = build_sitemeta(m1, m2, m9, bundle, soak_entries=soak)
    meta["sources"] = {
        "m1/medians.json": _sha256_file(args.m1),
        "m2/medians.json": _sha256_file(args.m2),
        "m9/medians.json": _sha256_file(args.m9),
        "m10-soak/medians.json": (
            _sha256_file(args.soak)
            if os.path.exists(args.soak) else "absent"),
        "report.json": _sha256_file(args.report),
    }
    with open(args.out, "w") as handle:
        json.dump(meta, handle, indent=2, sort_keys=True)
        handle.write("\n")
    if args.apply:
        apply_to_index(args.apply, render_all(meta))
    kinds = (len(meta["executive_cards"]), len(meta["flagship"]),
             sum(len(b["rows"]) for b in meta["m2_blocks"]),
             len(meta["soak_leg"]["rows"]))
    print("poolduel site: %d cards, %d flagship rows, %d m2 rows, "
          "%d soak rows -> %s"
          % (kinds[0], kinds[1], kinds[2], kinds[3], args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
