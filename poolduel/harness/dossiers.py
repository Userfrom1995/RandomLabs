"""Poolduel M11c dossier generator: bundles in, pre-rendered dossiers out.

Reads the committed ``results/m1/medians.json`` +
``results/m2/medians.json`` + ``results/m9/medians.json`` +
``results/report.json`` plus the per-repeat raw records under
``results/{m1,m2,m9}/raw/`` and writes ``results/dossiermeta.json``:
the single machine-readable source for every pre-rendered number on
the six per-pooler dossiers (``poolduel/<slug>/``). ``--apply``
splices the generated HTML into each dossier page between
``DOSSIER:<name>:begin/end`` markers, so every dossier reads
correctly with JavaScript disabled and carries zero ``loading``
cells as content. The drift test (``tests/test_m11c_dossiers.py``)
fails when a page disagrees with this file or this file disagrees
with the bundles.

Per-dossier content contract (identical template across all six;
template sameness is the neutrality guarantee):

- pin line: contender version from ``report.json`` pooler_versions
  plus the shared PG 17 backend label.
- lifecycle line: short prose connection path per contender, cited
  against its ``docs/configs/`` page (docs, never numbers).
- config table: every M1 + M2 + M9 row for this contender with
  measured tps median [min-max] plus p99, or ``N/A (unsupported)``
  or ``timeout/inconclusive`` with nulls, never zeros. M1/M2 load
  and settings cells reuse the page's own static markup (parsed,
  never re-typed); M9 rows are generated from median geometry with
  an explicit pointer at ``results/m9/matrix.csv`` for the exact
  variant. Soak rows render both duration tiers per cell with
  tier-suffixed labels; tiers never in git render as absent rows
  carrying the re-dispatch label (never zero-filled, never
  interpolated). The flatness peak cell is tagged ``[peak]``.
- flatness / verdict / N-A blocks: same derivation as the live JS
  they replace (ranked verdicts from the ``best`` leg, named peak
  and trough, derived-sentence verdicts, never free prose).
- resources block: median cpu time plus peak RSS aggregated over
  this contender's measured raw records, with the iron record
  (CPU model, kernel, nproc) and auth/dataset posture labels;
  honest ``pending`` note only when no raw record carries them.

No hand-typed numbers anywhere downstream: the generator counts
the bundles, never the other way round. Formatting helpers are
shared with ``harness/site.py``.

Stdlib only. No interactive prompts; everything via flags.
"""

import argparse
import glob
import html as htmlmod
import json
import os
import re
import sys

from poolduel.harness import site as sitemod

MEASURED = sitemod.MEASURED
TIMEOUT = "timeout/inconclusive"
NA = "N/A (unsupported)"

DOSSIERS = ["pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat",
            "supavisor"]

DOCS_FILE = {"pgpool": "pgpool-II.md"}
DISPLAY = {"pgpool": "pgpool-II"}


def slug_docs(slug):
    return DOCS_FILE.get(slug, slug + ".md")


def slug_display(slug):
    return DISPLAY.get(slug, slug)


LIFECYCLE = {
    "pgagroal": "client -&gt; pgagroal pipeline (transaction/session/"
    "performance) -&gt; PostgreSQL backend; config in "
    "<a href=\"../docs/configs/pgagroal.md\">docs/configs/pgagroal.md</a>",
    "pgbouncer": "client -&gt; PgBouncer pool (transaction/session/"
    "statement) -&gt; PostgreSQL backend; config in "
    "<a href=\"../docs/configs/pgbouncer.md\">docs/configs/pgbouncer.md</a>",
    "pgpool": "client -&gt; pgpool-II children with connection pool "
    "-&gt; PostgreSQL backend; config in "
    "<a href=\"../docs/configs/pgpool-II.md\">docs/configs/pgpool-II.md</a>",
    "odyssey": "client -&gt; Odyssey workers with routes and storage "
    "-&gt; PostgreSQL backend; config in "
    "<a href=\"../docs/configs/odyssey.md\">docs/configs/odyssey.md</a>",
    "pgcat": "client -&gt; pgcat pools with shards -&gt; PostgreSQL "
    "backend; config in "
    "<a href=\"../docs/configs/pgcat.md\">docs/configs/pgcat.md</a>",
    "supavisor": "client -&gt; Supavisor tenant pool (transaction/session, "
    "native protocol) -&gt; PostgreSQL backend; config in "
    "<a href=\"../docs/configs/supavisor.md\">docs/configs/supavisor.md</a>",
}

MARKERS = ("pin", "lifecycle", "config", "flat", "verdict", "na",
           "resources")


def natural_key(cell_id):
    return [int(p) if p.isdigit() else p
            for p in re.split(r"(\d+)", str(cell_id))]


def leg_of(cell_id):
    if str(cell_id).startswith("M10-S"):
        return "soak"
    if str(cell_id).startswith("M9-"):
        return "M9"
    if str(cell_id).startswith("M2-"):
        return "M2"
    return "M1"


def load_label(entry):
    """Short load label from median geometry (mirrors page markup)."""
    workload = entry.get("workload", "?")
    clients = entry.get("clients", "?")
    pool = entry.get("pool_size", "?")
    protocol = entry.get("protocol", "simple")
    bits = "%s, %sc/%sp, %s" % (workload, clients, pool, protocol)
    if entry.get("churn"):
        bits += ", churn (-C)"
    if entry.get("scale", 10) != 10:
        bits += ", scale %s" % entry.get("scale")
    if str(entry.get("cell_id", "")).startswith("M10-S"):
        duration = entry.get("duration_s")
        tier = ("%d-min tier" % (duration // 60)
                if isinstance(duration, int) else "tiered soak")
        bits += ", %s" % tier
    return bits


def parse_settings(page_text):
    """Parse the page's own static rows into {cell: (load, settings, docs)}.

    M1/M2 load and settings cells are page-owned static markup written
    from the harness adapters; the generator reuses them verbatim so
    nothing is re-typed and nothing can drift.
    """
    out = {}
    pattern = re.compile(
        r'<tr data-cell="([^"]+)" data-pooler="[^"]+"[^>]*>'
        r'<td>[^<]*</td><td>([^<]*)</td><td(?: class="na")?>'
        r'(.*?)</td>'
        r'<td><a href="([^"]+)">.*?</a></td>.*?</tr>',
        re.DOTALL)
    for match in pattern.finditer(page_text or ""):
        out[match.group(1)] = (
            htmlmod.unescape(match.group(2)),
            htmlmod.unescape(match.group(3)),
            htmlmod.unescape(match.group(4)))
    return out


def m9_settings(entry, slug):
    return ("M9 resweep, scale %s; exact variant in "
            '<a href="../results/m9/matrix.csv">results/m9/matrix.csv</a>'
            % entry.get("scale", 10))


def soak_settings(entry, slug):
    duration = entry.get("duration_s")
    tier = ("%d-min tier" % (duration // 60)
            if isinstance(duration, int) else "tiered soak")
    return ("M10 soak %s; drift evidence in raw "
            "resources_pre/post/drift, exact rows in "
            '<a href="../results/m10-soak/matrix.csv">results/m10-soak/'
            "matrix.csv</a>" % tier)


def collect_raw(rawdirs):
    """Per-pooler evidence from raw records (never raises on gaps)."""
    stats = {}
    for rawdir in rawdirs or []:
        for path in glob.glob(os.path.join(rawdir, "*.json")):
            try:
                with open(path) as handle:
                    rec = json.load(handle)
            except (OSError, ValueError):
                continue
            if not isinstance(rec, dict):
                continue
            pooler = rec.get("pooler")
            if pooler not in DOSSIERS:
                continue
            slot = stats.setdefault(pooler, {
                "cpu": [], "rss": [], "iron": [], "auth": set(),
                "dataset": set(), "pgdiv": 0, "pgok": 0, "n": 0})
            slot["n"] += 1
            if rec.get("status") != MEASURED:
                continue
            res = rec.get("resources") or {}
            cpu = sitemod._num(res.get("cpu_time_s"))
            rss = sitemod._num(res.get("peak_rss_kb"))
            if cpu is not None:
                slot["cpu"].append(cpu)
            if rss is not None:
                slot["rss"].append(rss)
            iso = rec.get("isolation") or {}
            if isinstance(iso, dict) and iso.get("cpu_model"):
                slot["iron"].append((
                    iso.get("cpu_model"), iso.get("kernel"),
                    iso.get("nproc"), iso.get("pgbench_j")))
            auth = rec.get("auth_posture")
            if auth:
                slot["auth"].add(str(auth))
            dataset = rec.get("dataset") or {}
            policy = dataset.get("policy") if isinstance(dataset,
                                                         dict) else None
            if policy:
                slot["dataset"].add(str(policy))
            status = rec.get("pg_config_status")
            if status == "enforced":
                slot["pgok"] += 1
            elif status == "disclosed":
                slot["pgdisclosed"] = slot.get("pgdisclosed", 0) + 1
            elif status:
                slot["pgdiv"] += 1
    return stats


def _median(values):
    if not values:
        return None
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[mid]
    return 0.5 * (ordered[mid - 1] + ordered[mid])


def leg_counts(entries, pooler):
    """Raw per-leg status counts for one pooler (no dedupe).

    These describe the committed bundles exactly (the Tester
    regression suite pins the M2 shape); the rendered table shows
    the max-repeats winner per cell instead.
    """
    counts = {}
    for leg, leg_entries in entries.items():
        mine = [e for e in (leg_entries or [])
                if isinstance(e, dict) and e.get("pooler") == pooler]
        counts[leg] = {
            "total": len(mine),
            "measured": sum(1 for e in mine
                            if e.get("status") == MEASURED),
            "timeout": sum(1 for e in mine
                           if e.get("status") == TIMEOUT),
            "na": sum(1 for e in mine if e.get("status") == NA),
        }
    return counts


def verdict_counts(pooler, bundle):
    best = ((bundle or {}).get("best", {}) or {})
    wins = inconc = lose = na_n = timeout_n = 0
    for info in best.values():
        if not isinstance(info, dict):
            continue
        mine = next((r for r in (info.get("ranked") or [])
                     if isinstance(r, dict) and r.get("pooler") == pooler),
                    None)
        if mine is not None:
            verdict = mine.get("verdict", "")
            if verdict == "best":
                wins += 1
            elif "inconclusive" in str(verdict):
                inconc += 1
            else:
                lose += 1
        for item in (info.get("na") or []):
            if isinstance(item, dict) and item.get("pooler") == pooler:
                if item.get("status") == NA:
                    na_n += 1
                else:
                    timeout_n += 1
    return {"cells": len(best), "wins": wins, "inconclusive": inconc,
            "lose": lose, "na": na_n, "timeout": timeout_n}


def _entry_n(entry):
    tps = entry.get("tps") if isinstance(entry, dict) else None
    if isinstance(tps, dict):
        return sitemod._num(tps.get("n")) or 0
    return 0


def dedupe_entries(m1, m2, m9, soak=None):
    """One row per (cell_id, duration_s, pooler).

    The powered resweep re-ran M1/M2 cells under their original ids
    with more repeats, so the same (cell, pooler) appears in several
    legs. Keep the entry with the most repeats (powered evidence
    wins); ties prefer the later leg. The duration sits in the key
    so the two soak tiers of one arm stay separate rows instead of
    collapsing (M1/M2/M9 are duration-uniform per cell, so their
    rows are unchanged). Never show the same tier-cell twice.
    """
    tagged = ([(e, "M1") for e in (m1 or [])] +
              [(e, "M2") for e in (m2 or [])] +
              [(e, "M9") for e in (m9 or [])] +
              [(e, "soak") for e in (soak or [])])
    order = {"M1": 0, "M2": 1, "M9": 2, "soak": 3}
    best = {}
    for entry, leg in tagged:
        if not isinstance(entry, dict):
            continue
        key = (entry.get("cell_id"), entry.get("duration_s"),
               entry.get("pooler"))
        rank = (_entry_n(entry), order[leg])
        if key not in best or rank >= best[key][1]:
            best[key] = (entry, rank)
    return [entry for entry, _rank in best.values()]


def build_dossier(pooler, m1, m2, m9, bundle, raw_stats, settings,
                  soak=None):
    from poolduel.harness.soak import (SOAK_ABSENT_LABEL, soak_absent,
                                       soak_cell)
    entries = [e for e in dedupe_entries(m1, m2, m9, soak)
               if isinstance(e, dict) and e.get("pooler") == pooler]
    flat = ((bundle or {}).get("flatness", {}) or {}).get(pooler) or {}
    peak_cell = ((flat.get("peak") or {}).get("cell_id")
                 if isinstance(flat, dict) else None)
    rows = []
    for entry in sorted(entries, key=lambda e: (leg_of(e.get("cell_id")),
                                                natural_key(
                                                    e.get("cell_id")))):
        cid = entry.get("cell_id")
        status = entry.get("status", "missing")
        tps = entry.get("tps") if isinstance(entry, dict) else None
        p99 = entry.get("p99_ms") if isinstance(entry, dict) else None
        n = None
        if isinstance(tps, dict) and sitemod._num(tps.get("n")) is not None:
            n = int(tps["n"])
        known = settings.get(cid)
        if leg_of(cid) == "soak":
            # Soak rows are always entry-derived (never the page's
            # static markup): two tiers share one cell id, so a
            # static lookup keyed by cell alone would smear one
            # tier's label onto the other on re-apply. Pure
            # functions of the entry, hence idempotent.
            load = load_label(entry)
            setting_html = soak_settings(entry, pooler)
            docs_href = "../docs/configs/%s" % slug_docs(pooler)
        elif known is not None:
            load, setting_html, docs_href = known
        else:
            load = load_label(entry)
            setting_html = m9_settings(entry, pooler)
            docs_href = "../docs/configs/%s" % slug_docs(pooler)
        rows.append({
            "cell_id": cid,
            "leg": leg_of(cid),
            "load": load,
            "settings": setting_html,
            "docs": docs_href,
            "status": status,
            "tps_band": sitemod.fmt_band(tps),
            "tps_median": (sitemod._num(tps.get("median"))
                           if isinstance(tps, dict) else None),
            "p99": sitemod.fmt_ms(p99),
            "n": n,
            "peak": bool(peak_cell and cid == peak_cell
                         and status == MEASURED),
            "duration_s": (entry.get("duration_s")
                           if isinstance(entry.get("duration_s"),
                                         int) else None),
        })
    # Absent soak tiers: one row per spec triple never in git, with
    # tier-suffixed labels derived from the soak geometry (never
    # hand-typed). They disappear with no code change when the
    # Maintainer-owned re-dispatch lands.
    for (cid, arm, duration) in soak_absent(soak):
        if arm != pooler:
            continue
        try:
            synth = soak_cell(cid, duration)
        except (KeyError, ValueError):
            continue
        rows.append({
            "cell_id": cid,
            "leg": "soak",
            "load": load_label(synth),
            "settings": soak_settings(synth, pooler),
            "docs": "../docs/configs/%s" % slug_docs(pooler),
            "status": SOAK_ABSENT_LABEL,
            "tps_band": None,
            "tps_median": None,
            "p99": sitemod.fmt_ms(None),
            "n": None,
            "peak": False,
            "duration_s": int(duration),
        })
    rows.sort(key=lambda r: (r["leg"], natural_key(r["cell_id"]),
                             r["duration_s"]
                             if isinstance(r["duration_s"], int)
                             else -1))
    counts = {}
    for leg in ("M1", "M2", "M9", "soak"):
        leg_rows = [r for r in rows if r["leg"] == leg]
        counts[leg] = {
            "total": len(leg_rows),
            "measured": sum(1 for r in leg_rows
                            if r["status"] == MEASURED),
            "timeout": sum(1 for r in leg_rows
                           if r["status"] == TIMEOUT),
            "na": sum(1 for r in leg_rows if r["status"] == NA),
        }
    legs = leg_counts({"M1": m1, "M2": m2, "M9": m9, "soak": soak},
                      pooler)
    spread = sitemod._num(flat.get("spread"))
    raw = raw_stats.get(pooler, {}) if raw_stats else {}
    iron = None
    if raw.get("iron"):
        top = max(set(raw["iron"]), key=raw["iron"].count)
        iron = {"cpu_model": top[0], "kernel": top[1], "nproc": top[2],
                "pgbench_j": top[3]}
    dossier = {
        "pooler": pooler,
        "display": slug_display(pooler),
        "pin": ((bundle or {}).get("pooler_versions", {}) or {}).get(
            pooler),
        "pg": (bundle or {}).get("pg_version", "PG 17"),
        "rows": rows,
        "counts": counts,
        "legs": legs,
        "flatness": {
            "configs": flat.get("configs_measured", 0),
            "spread_pct": (round(100.0 * spread, 1)
                           if spread is not None else None),
            "verdict": flat.get("verdict", ""),
            "peak": flat.get("peak") or {},
            "trough": flat.get("trough") or {},
        },
        "verdicts": verdict_counts(pooler, bundle),
        "resources": {
            "cpu_median_s": _median(raw.get("cpu", [])),
            "rss_median_kb": _median(raw.get("rss", [])),
            "samples": len(raw.get("cpu", [])),
            "iron": iron,
            "auth": sorted(raw.get("auth", set())) if raw else [],
            "dataset": sorted(raw.get("dataset", set())) if raw else [],
            "pg_enforced": raw.get("pgok", 0) if raw else 0,
            "pg_disclosed": raw.get("pgdisclosed", 0) if raw else 0,
            "pg_other": raw.get("pgdiv", 0) if raw else 0,
        },
    }
    return dossier


def _esc(text):
    return sitemod._esc(text)


def render_pin(dossier):
    pin = dossier["pin"] or "unrecorded (smoke gate pending)"
    return ("<p>Pinned version: <strong>%s</strong> on shared %s backend; "
            "tracks issue #302.</p>"
            % (_esc(pin), _esc(dossier["pg"])))


def render_lifecycle(pooler):
    return "<p class=\"note\">Connection path: %s.</p>" % LIFECYCLE[pooler]


def render_config(dossier):
    from poolduel.harness.soak import SOAK_ABSENT_LABEL
    legs = dossier["legs"]
    m1, m2, m9 = legs["M1"], legs["M2"], legs["M9"]
    soak = legs.get("soak", {"total": 0, "measured": 0, "timeout": 0,
                             "na": 0})
    missing = sum(1 for r in dossier["rows"]
                  if r["status"] == SOAK_ABSENT_LABEL)
    parts = [
        '<div class="viewtoggle" role="group" aria-label="Rows">'
        '<button data-filter="all" class="on">All</button>'
        '<button data-filter="measured">Measured</button>'
        '<button data-filter="na">N/A</button>'
        '<button data-filter="timeout">Timeout</button></div>',
        '<p class="note">Every %s config with its results in full: '
        "M1 %d rows plus %d M2 rows (%d measured + %d "
        "timeout/inconclusive) plus %d N/A rows; "
        "M9 %d rows (%d measured + %d timeout/inconclusive) "
        "plus %d N/A rows; "
        "M10 soak %d tier-rows (%d measured + %d "
        "timeout/inconclusive) plus %d absent tier-rows "
        "(re-dispatch owned by Maintainer). Table shows the "
        "max-repeats evidence per "
        "tier-cell; full history in the matrix.csv files. "
        "Peak config tagged.</p>"
        % (_esc(dossier["display"]), m1["total"],
           m2["total"], m2["measured"], m2["timeout"], m2["na"],
           m9["total"], m9["measured"], m9["timeout"], m9["na"],
           soak["total"], soak["measured"], soak["timeout"], missing),
        '<table data-config-results data-pooler="%s">'
        "<tr><th>Cell</th><th>Load</th><th>Non-default settings</th>"
        "<th>Docs</th><th>tps median [min-max]</th><th>Tail latency</th>"
        "<th>Status</th></tr>" % _esc(dossier["pooler"]),
    ]
    for row in dossier["rows"]:
        if row["status"] == MEASURED and row["tps_band"]:
            tps = row["tps_band"] + (" PEAK" if row["peak"] else "")
            tps_cls, status_cls = "live-tps ok", "live-status ok"
        elif row["status"] == NA:
            tps = "N/A (unsupported)"
            tps_cls, status_cls = "live-tps", "live-status na"
        elif row["status"] == TIMEOUT:
            tps = "timeout/inconclusive"
            tps_cls, status_cls = "live-tps", "live-status na"
        elif row["status"] == SOAK_ABSENT_LABEL:
            tps = SOAK_ABSENT_LABEL
            tps_cls, status_cls = "live-tps", "live-status"
        else:
            tps = row["status"]
            tps_cls, status_cls = "live-tps", "live-status"
        fkey = ("measured" if row["status"] == MEASURED
                else "na" if row["status"] == NA
                else "timeout" if row["status"] == TIMEOUT
                else "missing")
        dur = ((' data-duration="%d"' % row["duration_s"])
               if isinstance(row.get("duration_s"), int) else "")
        parts.append(
            '<tr data-cell="%s" data-pooler="%s" data-status="%s"%s>'
            "<td>%s</td><td>%s</td><td>%s</td>"
            '<td><a href="%s">%s</a></td>'
            '<td class="%s">%s</td><td>p99 %s, n=%s</td>'
            '<td class="%s">%s</td></tr>' % (
                _esc(row["cell_id"]), _esc(dossier["pooler"]), fkey,
                dur,
                _esc(row["cell_id"]), _esc(row["load"]), row["settings"],
                _esc(row["docs"]),
                _esc(row["docs"].split("/")[-1]),
                tps_cls, _esc(tps), _esc(row["p99"]),
                row["n"] if row["n"] is not None else "?",
                status_cls, _esc(row["status"])))
    parts.append("</table>")
    parts.append(
        "<p>Full verbatim configs: "
        '<a href="../docs/configs/%s">docs/configs/%s</a>. Audit: '
        '<a href="../docs/fairness-audit.md">docs/fairness-audit.md</a>.</p>'
        % (slug_docs(dossier["pooler"]), slug_docs(dossier["pooler"])))
    return "\n".join(parts)


def render_flat(dossier):
    flat = dossier["flatness"]
    spread = ("%.1f%%" % flat["spread_pct"]
              if flat["spread_pct"] is not None else "-")
    peak = flat["peak"] or {}
    trough = flat["trough"] or {}
    peak_txt = ("%s @ %s tps (%s)" % (
        peak.get("cell_id", "?"),
        sitemod.fmt_int(peak.get("tps_median")),
        peak.get("workload", "?")) if peak else "-")
    trough_txt = ("%s @ %s tps (%s)" % (
        trough.get("cell_id", "?"),
        sitemod.fmt_int(trough.get("tps_median")),
        trough.get("workload", "?")) if trough else "-")
    return (
        '<table><tr><th>Configs measured</th><th>Spread</th>'
        "<th>Verdict</th><th>Peak cell</th><th>Trough cell</th></tr>"
        "<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>"
        "</table>" % (flat["configs"], spread, _esc(flat["verdict"] or "-"),
                      _esc(peak_txt), _esc(trough_txt)))


def render_verdict(dossier):
    verdicts = dossier["verdicts"]
    ranked = (verdicts["wins"] + verdicts["inconclusive"] +
              verdicts["lose"] + verdicts["na"] + verdicts["timeout"])
    rest = verdicts["cells"] - ranked
    return (
        "<p>Across %d ranked cells (%d with %s participating), %s is "
        "best in %d, inconclusive in %d, loses in %d; N/A "
        "(unsupported) in %d cells, timeout/inconclusive in %d cells; "
        "not ranked in %d cells. (Derived from report.json ranked "
        "verdicts.)</p>"
        % (verdicts["cells"], ranked, _esc(dossier["pooler"]),
           _esc(dossier["pooler"]), verdicts["wins"],
           verdicts["inconclusive"], verdicts["lose"], verdicts["na"],
           verdicts["timeout"], rest))


def render_na(dossier):
    from poolduel.harness.soak import SOAK_ABSENT_LABEL
    # Absent soak tiers live in the config table with their
    # re-dispatch label; this table keeps its N/A + timeout
    # findings contract.
    rows = [r for r in dossier["rows"]
            if r["status"] != MEASURED
            and r["status"] != SOAK_ABSENT_LABEL]
    if not rows:
        return ("<p class=\"note\">No N/A or timeout cells: every config "
                "measured.</p>")
    parts = ["<table><tr><th>Cell</th><th>Status</th>"
             "<th>tps median</th></tr>"]
    for row in rows:
        median = (sitemod.fmt_int(row["tps_median"])
                  if row["tps_median"] is not None else "-")
        parts.append("<tr><td>%s</td><td>%s</td><td>%s</td></tr>" % (
            _esc(row["cell_id"]), _esc(row["status"]), median))
    parts.append("</table>")
    return "\n".join(parts)


def render_resources(dossier):
    res = dossier["resources"]
    if not res["samples"]:
        return ("<p class=\"note\">Resource telemetry: no measured raw "
                "record for %s carries cpu/RSS fields yet; mechanism "
                "evidence lands with the soak sweep (M10).</p>"
                % _esc(dossier["pooler"]))
    bits = ["<table><tr><th>Signal</th><th>Median over measured raw"
            "</th></tr>"]
    bits.append("<tr><td>pgbench CPU time</td><td>%.2f s (n=%d)</td></tr>"
                % (res["cpu_median_s"] or 0.0, res["samples"]))
    bits.append("<tr><td>pgbench peak RSS</td><td>%s KB</td></tr>"
                % sitemod.fmt_int(res["rss_median_kb"]))
    iron = res["iron"] or {}
    bits.append("<tr><td>Iron</td><td>%s, kernel %s, %s CPUs, "
                "pgbench -j %s</td></tr>" % (
                    _esc(iron.get("cpu_model", "?")),
                    _esc(iron.get("kernel", "?")),
                    _esc(iron.get("nproc", "?")),
                    _esc(iron.get("pgbench_j", "?"))))
    bits.append("<tr><td>PG config status</td><td>%d enforced, %d "
                "disclosed, %d other</td></tr>" % (
                    res["pg_enforced"],
                    res.get("pg_disclosed", 0) if isinstance(res, dict)
                    else 0, res["pg_other"]))
    bits.append("</table>")
    if res["auth"]:
        bits.append("<p class=\"note\">Auth posture: %s.</p>"
                    % _esc("; ".join(res["auth"])))
    if res["dataset"]:
        bits.append("<p class=\"note\">Dataset: %s.</p>"
                    % _esc("; ".join(res["dataset"])))
    return "\n".join(bits)


def render_all(dossier):
    return {
        "pin": render_pin(dossier),
        "lifecycle": render_lifecycle(dossier["pooler"]),
        "config": render_config(dossier),
        "flat": render_flat(dossier),
        "verdict": render_verdict(dossier),
        "na": render_na(dossier),
        "resources": render_resources(dossier),
    }


def build_all(m1, m2, m9, bundle, raw_stats, settings_by_pooler,
              soak=None):
    return {pooler: build_dossier(pooler, m1, m2, m9, bundle, raw_stats,
                                 settings_by_pooler.get(pooler, {}),
                                 soak=soak)
            for pooler in DOSSIERS}


def apply_to_page(page_path, rendered):
    with open(page_path) as handle:
        text = handle.read()
    for name, html in rendered.items():
        begin = "<!-- DOSSIER:%s:begin -->" % name
        end = "<!-- DOSSIER:%s:end -->" % name
        if begin not in text or end not in text:
            raise ValueError("%s lacks markers for %s" % (page_path,
                                                          name))
        pattern = re.compile(re.escape(begin) + r".*?" + re.escape(end),
                             re.DOTALL)
        text = pattern.sub(begin + "\n" + html + "\n" + end, text)
    with open(page_path, "w") as handle:
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
                        help="M10 soak medians; missing file renders "
                             "dossiers without soak rows instead of "
                             "failing")
    parser.add_argument("--report", required=True)
    parser.add_argument("--rawdirs", required=True,
                        help="comma-separated raw record directories")
    parser.add_argument("--pages", required=True,
                        help="poolduel directory holding <slug>/index.html")
    parser.add_argument("--out", required=True)
    parser.add_argument("--apply", action="store_true",
                        help="splice rendered HTML into dossier pages")
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
    raw_stats = collect_raw([p for p in args.rawdirs.split(",") if p])
    settings = {}
    for pooler in DOSSIERS:
        page = os.path.join(args.pages, pooler, "index.html")
        try:
            with open(page) as handle:
                settings[pooler] = parse_settings(handle.read())
        except OSError:
            settings[pooler] = {}
    meta = {"dossiers": build_all(m1, m2, m9, bundle, raw_stats,
                                 settings, soak=soak)}
    meta["sources"] = {
        "m1/medians.json": sitemod._sha256_file(args.m1),
        "m2/medians.json": sitemod._sha256_file(args.m2),
        "m9/medians.json": sitemod._sha256_file(args.m9),
        "m10-soak/medians.json": (
            sitemod._sha256_file(args.soak)
            if os.path.exists(args.soak) else "absent"),
        "report.json": sitemod._sha256_file(args.report),
    }
    with open(args.out, "w") as handle:
        json.dump(meta, handle, indent=2, sort_keys=True)
        handle.write("\n")
    if args.apply:
        for pooler, dossier in meta["dossiers"].items():
            apply_to_page(os.path.join(args.pages, pooler, "index.html"),
                          render_all(dossier))
    total = sum(len(d["rows"]) for d in meta["dossiers"].values())
    print("poolduel dossiers: %d poolers, %d rows -> %s"
          % (len(meta["dossiers"]), total, args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
