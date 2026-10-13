"""Poolduel M4 chart generator: bundles in, ECharts option JSON out.

Reads the committed ``results/m1/medians.json`` + ``results/m2/medians.json``
+ ``results/report.json`` and writes one ECharts option file per page under
``results/charts/`` plus a ``manifest.json`` with the source SHAs.

Every number in the emitted options comes from the input bundles; no
hand-typed chart values exist anywhere (Tier-1 ``test_charts`` re-runs this
module on fixtures and deep-equals the committed JSON shape).

Conventions (owner-ordered, blueprint-pinned):
- ECharts 5.5.1 vendored at ``poolduel/vendor/``; pages render with the SVG
  renderer only via ``poolduel/assets/poolduel-charts.js``.
- Shared palette, one color per pooler on every page (Okabe-Ito-derived,
  pairwise distinguishable on the dark report background; direct is grey,
  N/A is white, timeout is yellow).
- Linear charts are zero-based (no truncated axes); a zoomed view is only
  ever offered through dataZoom on top of the full-range axis. Wide-range
  charts additionally ship a ``-log`` companion (log-scaled twin of the
  same data, labeled as such) so small arms stay readable.
- N/A and timeout cells are explicit marker points lifted off the baseline
  (symbolOffset, never y>0 values), never gap-filled with zeros and never
  interpolated.
- Min-max bands are ``line`` series named ``"<pooler> min"`` /
  ``"<pooler> max"`` (JSON-serializable error bands; ``custom`` series
  would need a JS renderItem function that cannot live in JSON), drawn
  dotted and translucent so they never collide with the bars.
- Series with zero measured points in a comparison chart are dropped from
  that chart (never an empty legend entry); the subtitle names them.
  Per-pooler pages always keep the owner's own series.
- Every figure carries markers, axis tooltips with exact values plus cell
  id, dataZoom + scroll legend toggles, and ``toolbox.saveAsImage`` PNG
  export. Rich tooltips (n, CV, p99, verdict, config link) are attached at
  render time by the shared loader from the same committed bundles.
- Every figure subtitle carries its peak, cell count, warmup, dataset, and
  hardware note on-figure, so silent scale changes are impossible.

Stdlib only. No interactive prompts; everything via flags.
"""

import argparse
import copy
import hashlib
import json
import os
import re
import sys

PALETTE = {
    "pgagroal": "#0072B2",
    "pgbouncer": "#56B4E9",
    "pgpool": "#E69F00",
    "odyssey": "#009E73",
    "pgcat": "#CC79A7",
    "direct": "#999999",
}

NA_COLOR = "#FFFFFF"
TIMEOUT_COLOR = "#F0E442"

DISPLAY = {
    "direct": "direct",
    "pgagroal": "pgagroal",
    "pgbouncer": "PgBouncer",
    "pgpool": "pgpool-II",
    "odyssey": "Odyssey",
    "pgcat": "pgcat",
}

# Fixed pooler rotation used for series order, page order, and prev/next
# nav on the per-pooler pages.
POOLERS = ["direct", "pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat"]
PAGE_POOLERS = ["pgagroal", "pgbouncer", "pgpool", "odyssey", "pgcat"]

TEXT_COLOR = "#E6EDF3"
GRID_BG = "#161B22"

# On-figure measurement context (same values as test-matrix.md section 5
# and methodology.md; a constant here, never per-chart hand values).
FIGURE_CONTEXT = ("30s warmup discarded; scale 10; PG 17 (PGDG); "
                  "ubuntu-24.04 CI runners")


def _median(entry):
    tps = (entry or {}).get("tps") or {}
    return tps.get("median")


def _band(entry):
    tps = (entry or {}).get("tps") or {}
    return tps.get("min"), tps.get("max")


def _natural(cell_id):
    """Natural sort key: M2-I10 sorts after M2-I2, not after M2-I1."""
    return [int(part) if part.isdigit() else part
            for part in re.split(r"(\d+)", cell_id or "")]


def _base_option(title, subtitle, x_labels, y_name="tps (transactions/s)"):
    return {
        "backgroundColor": "transparent",
        "textStyle": {"color": TEXT_COLOR},
        "title": {"text": title, "subtext": subtitle,
                  "left": "center", "textStyle": {"color": TEXT_COLOR}},
        "tooltip": {"trigger": "axis",
                    "axisPointer": {"type": "shadow"}},
        "legend": {"type": "scroll", "top": 56, "textStyle": {"color": TEXT_COLOR}},
        "toolbox": {"feature": {"saveAsImage": {"title": "Save PNG"}}},
        "dataZoom": [{"type": "slider", "bottom": 8},
                     {"type": "inside"}],
        "grid": {"left": "8%", "right": "6%", "top": "30%", "bottom": "24%",
                 "containLabel": True},
        "xAxis": {"type": "category", "data": list(x_labels),
                  "name": "cell",
                  "axisLabel": {"color": TEXT_COLOR, "rotate": 30}},
        "yAxis": {"type": "value", "min": 0, "name": y_name,
                  "axisLabel": {"color": TEXT_COLOR}},
        "series": [],
    }


def _log_y_axis(y_name="tps (transactions/s, log scale)"):
    return {"type": "log", "name": y_name,
            "axisLabel": {"color": TEXT_COLOR}}


def _context_subtitle(entries):
    """On-figure peak + n + fixed measurement context (no silent scales)."""
    measured = [(_median(e), e.get("cell_id"), e.get("pooler"))
                for e in entries or [] if e.get("status") == "measured"
                and _median(e) is not None]
    if not measured:
        head = "no measured cells"
    else:
        peak = max(measured, key=lambda t: t[0])
        head = ("peak %.1f tps (%s %s); %d measured cells; "
                % (peak[0], peak[1], peak[2], len(measured)))
    return head + FIGURE_CONTEXT


def _bar_series(pooler, medians, na_idx, timeout_idx):
    """Bar series of medians; null where the cell is N/A or timeout.

    ``na_idx``/``timeout_idx`` are x positions covered by the explicit
    marker series so the gap is never mistaken for zero.
    """
    _ = (na_idx, timeout_idx)
    return {
        "name": DISPLAY[pooler],
        "type": "bar",
        "itemStyle": {"color": PALETTE[pooler]},
        "emphasis": {"focus": "series"},
        "data": list(medians),
    }


def _band_series(pooler, mins, maxs):
    color = PALETTE[pooler]
    return [
        {"name": DISPLAY[pooler] + " min", "type": "line",
         "symbol": "emptyCircle", "showSymbol": True, "symbolSize": 6,
         "lineStyle": {"type": "dotted", "color": color, "width": 1,
                       "opacity": 0.55},
         "itemStyle": {"color": color, "opacity": 0.55},
         "data": list(mins)},
        {"name": DISPLAY[pooler] + " max", "type": "line",
         "symbol": "emptyCircle", "showSymbol": True, "symbolSize": 6,
         "lineStyle": {"type": "dotted", "color": color, "width": 1,
                       "opacity": 0.55},
         "itemStyle": {"color": color, "opacity": 0.55},
         "data": list(maxs)},
    ]


def _marker_series(name, positions, color, symbol):
    # Glyphs float above the baseline (symbolOffset) with labels, so a
    # marker can never read as a zero bar; the data value stays y=0.
    return {
        "name": name,
        "type": "scatter",
        "symbol": symbol,
        "symbolSize": 14,
        "symbolOffset": [0, -14],
        "itemStyle": {"color": color},
        "label": {"show": True, "formatter": name, "color": color,
                  "position": "top"},
        "data": [[pos, 0] for pos in positions],
    }


def _index_maps(entries):
    """Map (cell_id, pooler) -> entry for fast lookup."""
    return {(e["cell_id"], e["pooler"]): e for e in entries}


def _pooler_columns(by_key, cells, pooler):
    """Median/min/max columns plus N/A and timeout x-positions."""
    meds, mins, maxs, na_pos, timeout_pos = [], [], [], [], []
    for i, cell in enumerate(cells):
        entry = by_key.get((cell, pooler))
        if entry is None:
            meds.append(None)
            mins.append(None)
            maxs.append(None)
        elif entry.get("status") == "measured":
            meds.append(_median(entry))
            lo, hi = _band(entry)
            mins.append(lo)
            maxs.append(hi)
        elif entry.get("status") == "N/A (unsupported)":
            meds.append(None)
            mins.append(None)
            maxs.append(None)
            na_pos.append(i)
        else:
            meds.append(None)
            mins.append(None)
            maxs.append(None)
            timeout_pos.append(i)
    return meds, mins, maxs, na_pos, timeout_pos


def _series_for_chart(by_key, cells, poolers, keep_empty=False):
    """Bar+band series for a chart; drops all-None poolers unless kept."""
    series = []
    na_pos, timeout_pos = [], []
    dropped = []
    for pooler in poolers:
        meds, mins, maxs, npos, tpos = _pooler_columns(by_key, cells, pooler)
        na_pos.extend(npos)
        timeout_pos.extend(tpos)
        if not keep_empty and all(v is None for v in meds):
            dropped.append(DISPLAY[pooler])
            continue
        series.append(_bar_series(pooler, meds, npos, tpos))
        series.extend(_band_series(pooler, mins, maxs))
    if na_pos:
        series.append(
            _marker_series("N/A (unsupported)", sorted(set(na_pos)),
                           NA_COLOR, "diamond"))
    if timeout_pos:
        series.append(
            _marker_series("timeout/inconclusive", sorted(set(timeout_pos)),
                           TIMEOUT_COLOR, "triangle"))
    return series, dropped


def _with_log_companion(charts, chart_id, opt, cells, by_key):
    """Attach a log-scaled twin of a range chart under ``<id>-log``."""
    if opt is None:
        return
    twin = copy.deepcopy(opt)
    twin["yAxis"] = _log_y_axis()
    # Scatter N/A/timeout markers sit at y=0, which is undefined on a
    # log axis (ECharts drops them silently). Keep the twin bar-only so
    # the "same data" claim stays honest; markers live on the linear.
    twin["series"] = [s for s in twin["series"]
                      if s.get("type") != "scatter"]
    twin["title"] = dict(twin.get("title", {}),
                         text=twin.get("title", {}).get("text", "") +
                         " (log scale)")
    twin["title"]["subtext"] = ("log-scaled twin of the same data "
                                "(N/A/timeout markers shown on the "
                                "linear chart); " +
                                twin.get("title", {}).get("subtext", ""))
    charts[chart_id + "-log"] = twin


def comparison_m1_chart(m1_entries):
    cells = sorted({e["cell_id"] for e in m1_entries}, key=_natural)
    by_key = _index_maps(m1_entries)
    opt = _base_option(
        "M1 best-vs-best per workload",
        "median tps with min-max bands; N/A and timeout cells marked, never zero-filled. " +
        _context_subtitle(m1_entries), [])
    opt["xAxis"]["data"] = list(cells)
    series, dropped = _series_for_chart(by_key, cells, POOLERS)
    if dropped:
        opt["title"]["subtext"] += " No measured cells: %s." % ", ".join(dropped)
    opt["series"] = series
    return opt


def _m2_block_chart(m2_entries, prefix, title):
    cells = sorted({e["cell_id"] for e in m2_entries
                    if e["cell_id"].startswith(prefix)}, key=_natural)
    if not cells:
        return None
    by_key = _index_maps(m2_entries)
    block = [e for e in m2_entries if e["cell_id"].startswith(prefix)]
    opt = _base_option(title, "median tps with min-max bands; prefix " + prefix +
                       ". " + _context_subtitle(block), [])
    opt["xAxis"]["data"] = list(cells)
    series, dropped = _series_for_chart(by_key, cells, POOLERS)
    if dropped:
        opt["title"]["subtext"] += " No measured cells: %s." % ", ".join(dropped)
    opt["series"] = series
    return opt


def flatness_chart(bundle):
    flat = (bundle or {}).get("flatness") or {}
    poolers = sorted(flat.keys())
    peaks = [((flat[p] or {}).get("peak") or {}).get("tps_median")
             for p in poolers]
    opt = _base_option(
        "Surface flatness: peak tps per pooler",
        "Peak minus trough over peak across each pooler's own measured "
        "configs (mixed workloads: trough workload named per bar). "
        "Spread verdicts live in the table. " + FIGURE_CONTEXT, [])
    opt["xAxis"]["data"] = [DISPLAY.get(p, p) for p in poolers]
    data = []
    for p, v in zip(poolers, peaks):
        peak = (flat.get(p) or {}).get("peak") or {}
        trough = (flat.get(p) or {}).get("trough") or {}
        name = ("%s peak %s (%s) trough %s (%s)"
                % (DISPLAY.get(p, p), peak.get("cell_id"),
                   peak.get("workload"), trough.get("cell_id"),
                   trough.get("workload")))
        data.append({"value": v, "name": name,
                     "itemStyle": {"color": PALETTE.get(p, "#58A6FF")}})
    opt["series"].append({
        "name": "peak tps",
        "type": "bar",
        "itemStyle": {"color": {"type": "linear", "x": 0, "y": 0,
                                "x2": 0, "y2": 1,
                                "colorStops": [
                                    {"offset": 0, "color": "#58A6FF"},
                                    {"offset": 1, "color": "#1F6FEB"}]}},
        "label": {"show": True, "position": "top", "color": TEXT_COLOR},
        "data": data,
    })
    return opt


def _is_m1(cell_id):
    return (cell_id or "").startswith("M1-")


def iso_overlay_chart(bundle):
    regions = (bundle or {}).get("iso_regions") or []
    matched = [r for r in regions if r.get("matched")]
    if not matched:
        return None
    # True shared slices first: regions spanning both M1 and M2 cells on
    # the same iso_key (cross-matrix iso). M2-only slices are a fallback
    # and say so in the title; no matched slice at all means cut (None).
    cross = [r for r in matched
             if any(_is_m1(c) for c in r.get("matched_cells", []))
             and any(not _is_m1(c) for c in r.get("matched_cells", []))]
    pool = cross if cross else matched
    # Deepest slice: most rows, tie-break on first sorted key.
    region = max(pool, key=lambda r: (len(r.get("rows", [])), 0))
    rows = sorted(region.get("rows", []),
                  key=lambda r: (_natural(r["cell_id"]), r["pooler"]))
    labels = ["%s %s" % (r["cell_id"], r["pooler"]) for r in rows]
    values = [((r.get("tps") or {}).get("median")) for r in rows]
    colors = [PALETTE.get(r["pooler"], "#58A6FF") for r in rows]
    scope = ("cross-matrix M1+M2 shared geometry"
             if cross else "M2-only shared geometry (no cross-matrix "
             "matched slice on this bundle)")
    title = ("Iso-region overlay: %s c=%s pool=%s T=%s %s%s"
             % (region.get("workload"), region.get("clients"),
                region.get("pool_size"), region.get("duration_s"),
                region.get("protocol"),
                " churn" if region.get("churn") else ""))
    opt = _base_option(title, scope + "; matched cells: "
                       + ", ".join(region.get("matched_cells", [])) +
                       ". " + FIGURE_CONTEXT, [])
    opt["xAxis"]["data"] = labels
    opt["xAxis"]["axisLabel"] = {"color": TEXT_COLOR, "rotate": 30}
    opt["series"].append({
        "name": "median tps",
        "type": "bar",
        "label": {"show": True, "position": "top", "color": TEXT_COLOR},
        "data": [{"value": v, "itemStyle": {"color": c}}
                 for v, c in zip(values, colors)],
    })
    return opt


def pooler_page_charts(pooler, m1_entries, m2_entries):
    """Own-surface charts for one pooler page: own-m1 + own-m2."""
    m1_cells = sorted({e["cell_id"] for e in m1_entries}, key=_natural)
    by_key = _index_maps(m1_entries + m2_entries)
    m2_cells = sorted({e["cell_id"] for e in m2_entries
                       if (e["cell_id"], pooler) in by_key}, key=_natural)
    charts = {}
    for chart_id, cells in (("own-m1", m1_cells), ("own-m2", m2_cells)):
        entries = [by_key.get((cell, pooler)) for cell in cells]
        entries = [e for e in entries if e is not None]
        opt = _base_option(
            DISPLAY[pooler] + " " + ("M1" if chart_id == "own-m1" else "M2")
            + " own surface",
            "median tps with min-max bands; N/A and timeout cells marked. " +
            _context_subtitle(entries), [])
        opt["xAxis"]["data"] = list(cells)
        series, _ = _series_for_chart(by_key, cells, [pooler],
                                      keep_empty=True)
        opt["series"] = series
        charts[chart_id] = opt
        twin = copy.deepcopy(opt)
        twin["yAxis"] = _log_y_axis()
        # Same y=0-marker rule as _with_log_companion: bars only on log.
        twin["series"] = [s for s in twin["series"]
                          if s.get("type") != "scatter"]
        twin["title"] = dict(twin.get("title", {}),
                             text=twin.get("title", {}).get("text", "") +
                             " (log scale)")
        twin["title"]["subtext"] = ("log-scaled twin of the same data "
                                    "(N/A/timeout markers shown on the "
                                    "linear chart); " +
                                    twin.get("title", {}).get(
                                        "subtext", ""))
        charts[chart_id + "-log"] = twin
    return charts


# Soak stability figure context (M13a): 60 s warmup (not the 30 s
# short-cell value), scale 10, same iron. A constant here, never
# per-chart hand values.
SOAK_FIGURE_CONTEXT = ("60 s warmup; scale 10; PG 17 (PGDG); "
                       "ubuntu-24.04 CI runners")

# Absent-tier marker style: grey rounded squares, distinct from the
# white N/A diamonds and the yellow timeout triangles.
ABSENT_COLOR = "#6E7681"


def _soak_tier_labels():
    """Numeric tier order: 1800 s before 3600 s, never lexicographic."""
    return ["30-min tier (1800 s)", "60-min tier (3600 s)"]


def _soak_subtitle(cell_id, entries, absent_count):
    measured = [(_median(e), e.get("pooler")) for e in entries or []
                if e.get("status") == "measured"
                and _median(e) is not None]
    if not measured:
        head = "no measured tiers"
    else:
        peak = max(measured, key=lambda t: t[0])
        head = ("peak %.1f tps (%s); %d measured tiers; "
                % (peak[0], peak[1], len(measured)))
    absent = ("; %d absent tiers %s" % (
        absent_count, "(re-dispatch owned by Maintainer)")
        if absent_count else "; all tiers present")
    return head + absent + ". " + SOAK_FIGURE_CONTEXT


def _soak_marker_series(name, positions, color, symbol, point_label=None):
    # Same off-baseline contract as _marker_series (y=0 values with
    # symbolOffset, never bars), but the on-point label stays short
    # ("absent") while the series name carries the full honest text
    # for the legend and axis tooltips.
    return {
        "name": name,
        "type": "scatter",
        "symbol": symbol,
        "symbolSize": 14,
        "symbolOffset": [0, -14],
        "itemStyle": {"color": color},
        "label": {"show": True,
                  "formatter": point_label or name,
                  "color": color, "position": "top"},
        "data": [[pos, 0] for pos in positions],
    }


def _p99_median(entry):
    stat = (entry or {}).get("p99_ms") or {}
    return stat.get("median")


def soak_tps_chart(cell_id, soak_medians, absent):
    """Tps + tail per arm across the two duration tiers of one cell.

    Bars are tps medians with min-max band lines; the dotted line per
    arm is the p99 median on the right axis (null where quarantined,
    timeout, or absent, so the line breaks instead of interpolating).
    Absent (cell, arm, tier) triples are off-baseline markers,
    distinct from timeout/inconclusive findings. Every value traces
    to ``soak_medians``; no hand values.
    """
    from poolduel.harness.soak import (SOAK_ABSENT_LABEL, SOAK_ARMS,
                                       SOAK_DURATIONS)
    tiers = list(SOAK_DURATIONS)
    by_key = {(e.get("cell_id"), e.get("duration_s"), e.get("pooler")): e
              for e in (soak_medians or []) if isinstance(e, dict)}
    labels = _soak_tier_labels()
    entries = [by_key.get((cell_id, d, a))
               for d in tiers for a in SOAK_ARMS]
    entries = [e for e in entries if e is not None]
    cell_absent = [t for t in (absent or []) if t[0] == cell_id]
    opt = _base_option(
        "Soak stability %s: tps per tier per arm" % cell_id,
        "median tps with min-max bands; dotted lines are p99 latency "
        "(right axis), null where quarantined or unmeasured. " +
        _soak_subtitle(cell_id, entries, len(cell_absent)), labels)
    opt["xAxis"]["name"] = "duration tier"
    opt["yAxis"] = [
        {"type": "value", "min": 0, "name": "tps (transactions/s)",
         "axisLabel": {"color": TEXT_COLOR}},
        {"type": "value", "name": "p99 latency (ms)",
         "axisLabel": {"color": TEXT_COLOR}},
    ]
    absent_pos, timeout_pos = [], []
    for arm in SOAK_ARMS:
        meds, mins, maxs, p99s = [], [], [], []
        for i, duration in enumerate(tiers):
            entry = by_key.get((cell_id, duration, arm))
            if entry is None or (cell_id, arm, duration) in (
                    set(cell_absent)):
                meds.append(None)
                mins.append(None)
                maxs.append(None)
                p99s.append(None)
                if (cell_id, arm, duration) in set(cell_absent):
                    absent_pos.append(i)
            elif entry.get("status") == "measured":
                meds.append(_median(entry))
                lo, hi = _band(entry)
                mins.append(lo)
                maxs.append(hi)
                p99s.append(_p99_median(entry))
            else:
                meds.append(None)
                mins.append(None)
                maxs.append(None)
                p99s.append(None)
                timeout_pos.append(i)
        # Fixed six-arm spec: every arm keeps its series (absent tiers
        # are markers, never silent gaps), so the legend always reads
        # the full incumbent set.
        opt["series"].append(_bar_series(arm, meds, [], []))
        opt["series"].extend(_band_series(arm, mins, maxs))
        opt["series"].append({
            "name": DISPLAY[arm] + " p99",
            "type": "line",
            "yAxisIndex": 1,
            "symbol": "emptyCircle",
            "showSymbol": True,
            "symbolSize": 6,
            "lineStyle": {"type": "dotted", "color": PALETTE[arm],
                          "width": 1, "opacity": 0.8},
            "itemStyle": {"color": PALETTE[arm], "opacity": 0.8},
            "data": list(p99s),
        })
    if absent_pos:
        opt["series"].append(
            _soak_marker_series(SOAK_ABSENT_LABEL,
                                sorted(set(absent_pos)),
                                ABSENT_COLOR, "roundRect", "absent"))
    if timeout_pos:
        opt["series"].append(
            _marker_series("timeout/inconclusive",
                           sorted(set(timeout_pos)),
                           TIMEOUT_COLOR, "triangle"))
    return opt


def _finite(value):
    try:
        if isinstance(value, bool):
            return None
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number or number in (float("inf"), float("-inf")):
        return None
    return number


def _median_of(values):
    # No third-party or stdlib-name imports here: poolduel/harness/
    # ships its own statistics.py, which shadows the stdlib module
    # when the gate runs in script mode (repro.sh invokes
    # poolduel/harness/check.py directly, prepending that dir to
    # sys.path). Plain sorted-middle math is shadowing-immune.
    clean = sorted(v for v in (_finite(v) for v in values)
                   if v is not None)
    if not clean:
        return None
    mid = len(clean) // 2
    if len(clean) % 2 == 1:
        return float(clean[mid])
    return float((clean[mid - 1] + clean[mid]) / 2.0)


def soak_drift_from_raw(raw_records):
    """Median pre/post resource drift per (cell, duration, pooler).

    Reads the committed raw ``resources_drift`` fields (harness-process
    rusage sampled before/after each measured run): median RSS delta
    in KB and FD-count delta across the repeats of each tier-group.
    Pure bundle math: missing or non-finite inputs degrade to None
    (n/a, never zero); never raises on hostile shapes.
    """
    grouped = {}
    for rec in raw_records or []:
        if not isinstance(rec, dict):
            continue
        try:
            key = (rec.get("cell_id"), int(rec.get("duration_s")),
                   rec.get("pooler"))
        except (TypeError, ValueError):
            continue
        drift = rec.get("resources_drift")
        if not isinstance(drift, dict):
            drift = {}
        bucket = grouped.setdefault(key, {"rss": [], "fd": [],
                                          "rows": 0})
        bucket["rows"] += 1
        rss = _finite(drift.get("rss_delta_kb"))
        if rss is not None:
            bucket["rss"].append(rss)
        fd = _finite(drift.get("fd_delta"))
        if fd is not None:
            bucket["fd"].append(fd)
    out = {}
    for key, bucket in grouped.items():
        out[key] = {
            "rss_delta_kb": _median_of(bucket["rss"]),
            "fd_delta": _median_of(bucket["fd"]),
            "n": bucket["rows"],
        }
    return out


def soak_drift_chart(cell_id, drift, absent):
    """Pre/post resource drift per arm across the two tiers of one cell.

    RSS-delta bars (left axis) plus FD-delta dotted lines (right
    axis), both in the shared arm palette. Harness-process rusage is
    a run-validity signal, not pooler-process leak sampling (future
    work, never claimed here). Tiers with no raw evidence mark
    ``n/a (not recorded)``; tiers never in git carry the absent
    marker instead. Every value traces to committed raw drift
    fields; no hand values.
    """
    from poolduel.harness.soak import (SOAK_ABSENT_LABEL, SOAK_ARMS,
                                       SOAK_DURATIONS)
    tiers = list(SOAK_DURATIONS)
    labels = _soak_tier_labels()
    cell_absent = set(t for t in (absent or []) if t[0] == cell_id)
    opt = _base_option(
        "Soak drift %s: harness RSS/FD change per tier per arm"
        % cell_id,
        "median pre/post drift across repeats; harness-process "
        "rusage (run-validity signal, not pooler-process sampling); "
        "nulls mark n/a, never zero. " + SOAK_FIGURE_CONTEXT, labels)
    opt["xAxis"]["name"] = "duration tier"
    opt["yAxis"] = [
        {"type": "value", "name": "RSS delta (KB)",
         "axisLabel": {"color": TEXT_COLOR}},
        {"type": "value", "name": "FD-count delta",
         "axisLabel": {"color": TEXT_COLOR}},
    ]
    absent_pos, na_pos = [], []
    for arm in SOAK_ARMS:
        rss, fds = [], []
        for i, duration in enumerate(tiers):
            if (cell_id, arm, duration) in cell_absent:
                rss.append(None)
                fds.append(None)
                absent_pos.append(i)
                continue
            point = (drift or {}).get((cell_id, duration, arm))
            if point is None or (point.get("rss_delta_kb") is None
                                 and point.get("fd_delta") is None):
                rss.append(None)
                fds.append(None)
                na_pos.append(i)
            else:
                rss.append(point.get("rss_delta_kb"))
                fds.append(point.get("fd_delta"))
        opt["series"].append({
            "name": DISPLAY[arm] + " RSS delta",
            "type": "bar",
            "itemStyle": {"color": PALETTE[arm]},
            "emphasis": {"focus": "series"},
            "data": list(rss),
        })
        opt["series"].append({
            "name": DISPLAY[arm] + " FD delta",
            "type": "line",
            "yAxisIndex": 1,
            "symbol": "emptyCircle",
            "showSymbol": True,
            "symbolSize": 6,
            "lineStyle": {"type": "dotted", "color": PALETTE[arm],
                          "width": 1, "opacity": 0.8},
            "itemStyle": {"color": PALETTE[arm], "opacity": 0.8},
            "data": list(fds),
        })
    if absent_pos:
        opt["series"].append(
            _soak_marker_series(SOAK_ABSENT_LABEL,
                                sorted(set(absent_pos)),
                                ABSENT_COLOR, "roundRect", "absent"))
    if na_pos:
        opt["series"].append(
            _soak_marker_series("n/a (not recorded)",
                                sorted(set(na_pos)),
                                NA_COLOR, "diamond"))
    return opt


def build_soak_charts(soak_medians, raw_records=None):
    """Return {chart_id: option} for the six soak stability figures.

    Two figures per soak cell (tps + drift); absent triples derive
    from ``soak_absent`` (spec minus present, never hand-typed) so
    the marks disappear with no code change when the re-dispatch
    lands. Soak figures never enter the statistics family,
    headlines, or claims (stability estimand, n=3).
    """
    from poolduel.harness.soak import (SOAK_CELL_IDS, soak_absent)
    cells = [c for c in SOAK_CELL_IDS
             if any(isinstance(e, dict) and e.get("cell_id") == c
                    for e in (soak_medians or []))]
    if not cells:
        return {}
    absent = soak_absent(soak_medians)
    drift = soak_drift_from_raw(raw_records)
    charts = {}
    for cell_id in cells:
        charts["soak-" + cell_id] = soak_tps_chart(
            cell_id, soak_medians, absent)
        charts["soak-" + cell_id + "-drift"] = soak_drift_chart(
            cell_id, drift, absent)
    return charts


def build_options(m1_entries, m2_entries, bundle, soak_medians=None,
                  soak_raw=None):
    """Return {page: {chart_id: option}} for all six pages.

    Soak stability figures ride on the comparison page when
    ``soak_medians`` are passed (M13a); older callers that pass only
    (m1, m2, bundle) get the M4 shape unchanged.
    """
    """Return {page: {chart_id: option}} for all six pages."""
    for entry in list(m1_entries or []) + list(m2_entries or []):
        if not isinstance(entry, dict) or "cell_id" not in entry \
                or "pooler" not in entry:
            raise ValueError(
                "charts: entry missing cell_id/pooler, refusing to plot")
    pages = {}
    comparison = {"m1-best": comparison_m1_chart(m1_entries or [])}
    _with_log_companion(comparison, "m1-best", comparison["m1-best"],
                        sorted({e["cell_id"] for e in (m1_entries or [])},
                               key=_natural),
                        _index_maps(m1_entries or []))
    for prefix, chart_id, title in (
            ("M2-S", "m2-session", "M2 session block heads"),
            ("M2-T", "m2-statement", "M2 statement block heads"),
            ("M2-I", "m2-io", "M2 I/O block heads"),
            ("M2-W", "m2-workloads", "M2 workload twins"),
            ("M2-P", "m2-prepared", "M2 prepared twins")):
        chart = _m2_block_chart(m2_entries or [], prefix, title)
        if chart is not None:
            comparison[chart_id] = chart
            _with_log_companion(
                comparison, chart_id, chart,
                sorted({e["cell_id"] for e in (m2_entries or [])
                        if e["cell_id"].startswith(prefix)}, key=_natural),
                _index_maps(m2_entries or []))
    comparison["flatness"] = flatness_chart(bundle)
    iso = iso_overlay_chart(bundle)
    if iso is not None:
        comparison["iso-overlay"] = iso
    for chart_id, opt in sorted(
            build_soak_charts(soak_medians, soak_raw).items()):
        comparison[chart_id] = opt
    pages["comparison"] = comparison
    for pooler in PAGE_POOLERS:
        pages[pooler] = pooler_page_charts(pooler, m1_entries or [],
                                           m2_entries or [])
    return pages


def _sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_parser():
    p = argparse.ArgumentParser(
        description="Poolduel M4 chart builder: bundles in, "
                    "ECharts option JSON out.")
    p.add_argument("--m1", default="poolduel/results/m1/medians.json")
    p.add_argument("--m2", default="poolduel/results/m2/medians.json")
    p.add_argument("--report", default="poolduel/results/report.json")
    p.add_argument("--soak",
                   default="poolduel/results/m10-soak/medians.json",
                   help="M10 soak medians (tier-labeled); missing file "
                        "cuts the soak figures instead of failing")
    p.add_argument("--soak-raw",
                   default="poolduel/results/m10-soak/raw",
                   help="M10 soak raw dir (resources_drift fields); "
                        "missing dir marks drift n/a, never zero")
    p.add_argument("--out", default="poolduel/results/charts")
    return p


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    missing = [p for p in (args.m1, args.m2, args.report)
               if not os.path.isfile(p)]
    if missing:
        for path in missing:
            print("poolduel charts FAILED: missing input %s "
                  "(run repro.sh --report first; not inventing numbers)"
                  % path, file=sys.stderr)
        return 1
    try:
        with open(args.m1) as f:
            m1_entries = json.load(f)
        with open(args.m2) as f:
            m2_entries = json.load(f)
        with open(args.report) as f:
            bundle = json.load(f)
    except (ValueError, OSError) as exc:
        print("poolduel charts FAILED: unreadable input (%s)" % exc,
              file=sys.stderr)
        return 1
    if not isinstance(m1_entries, list) or not m1_entries:
        print("poolduel charts FAILED: %s has no median entries" % args.m1,
              file=sys.stderr)
        return 1
    if not isinstance(m2_entries, list) or not m2_entries:
        print("poolduel charts FAILED: %s has no median entries" % args.m2,
              file=sys.stderr)
        return 1
    try:
        with open(args.soak) as f:
            soak_medians = json.load(f)
    except (ValueError, OSError):
        soak_medians = []
    soak_raw = []
    if os.path.isdir(args.soak_raw):
        import glob
        for path in sorted(glob.glob(
                os.path.join(args.soak_raw, "*.json"))):
            try:
                with open(path) as f:
                    soak_raw.append(json.load(f))
            except (ValueError, OSError):
                continue
    try:
        pages = build_options(m1_entries, m2_entries, bundle,
                              soak_medians=soak_medians,
                              soak_raw=soak_raw)
    except ValueError as exc:
        print("poolduel charts FAILED: %s" % exc, file=sys.stderr)
        return 1
    os.makedirs(args.out, exist_ok=True)
    manifest = {"sources": {}, "pages": {}}
    for label, src in (("m1/medians.json", args.m1),
                       ("m2/medians.json", args.m2),
                       ("report.json", args.report)):
        manifest["sources"][label] = _sha256_file(src)
    if os.path.isfile(args.soak):
        manifest["sources"]["m10-soak/medians.json"] = _sha256_file(
            args.soak)
    else:
        manifest["sources"]["m10-soak/medians.json"] = "absent"
    manifest["sources"]["m10-soak/raw_files"] = len(soak_raw)
    for page, charts in sorted(pages.items()):
        path = os.path.join(args.out, page + ".json")
        with open(path, "w") as f:
            json.dump(charts, f, indent=2, sort_keys=True)
        manifest["pages"][page] = {
            "file": page + ".json",
            "charts": sorted(charts.keys()),
            "sha256": _sha256_file(path),
        }
    with open(os.path.join(args.out, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
    print("poolduel charts: %d pages (%s) -> %s; soak figures %d "
          "(%d medians, %d raw records)"
          % (len(pages), ", ".join(sorted(pages)), args.out,
             sum(1 for charts in pages.values() for c in charts
                 if str(c).startswith("soak-")),
             len(soak_medians), len(soak_raw)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
