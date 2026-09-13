"""Poolduel M4 Tier-1 deterministic gate (blocking merge, no vision needed).

- template sameness: identical 7-section id set on all five pooler pages
- shared-color consistency: each pooler maps to its palette hex on every page
- N/A markers present with zero gap-fill (explicit N/A points; nulls, no 0)
- zero hand values: committed options deep-equal a fresh charts.py run
- loader passes node --check; SVG renderer pinned in the loader source
- option values spot-check against bundle medians (SVG coordinates encode them)
- offline-clean: no CDN references anywhere under poolduel/
- chart furniture: yAxis min 0, dataZoom, legend toggles, saveAsImage export

Refs #302.
"""

import json
import os
import re
import subprocess
import unittest
from html.parser import HTMLParser

from poolduel.harness import charts as charts_mod

ROOT = os.path.join(os.path.dirname(__file__), "..")
SECTION_IDS = ["s-header", "s-charts", "s-flatness", "s-config",
               "s-verdict", "s-na", "s-repro"]


class _DivIdParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.section_ids = []
        self.hosts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "div" and attrs.get("class") == "section":
            self.section_ids.append(attrs.get("id"))
        if tag == "div" and "echart" in (attrs.get("class") or ""):
            self.hosts.append((attrs.get("data-page"),
                               attrs.get("data-chart")))


def _read(path):
    with open(os.path.join(ROOT, path)) as f:
        return f.read()


def _load_json(path):
    with open(os.path.join(ROOT, path)) as f:
        return json.load(f)


class TemplateSamenessTest(unittest.TestCase):
    def test_five_pages_share_identical_section_ids(self):
        for slug in charts_mod.PAGE_POOLERS:
            html = _read("%s/index.html" % slug)
            parser = _DivIdParser()
            parser.feed(html)
            self.assertEqual(parser.section_ids, SECTION_IDS,
                             "template drift in poolduel/%s/" % slug)

    def test_section_order_fixed(self):
        html = _read("pgagroal/index.html")
        positions = [html.index('id="%s"' % sid) for sid in SECTION_IDS]
        self.assertEqual(positions, sorted(positions))

    def test_nav_runs_both_ways(self):
        for slug in charts_mod.PAGE_POOLERS:
            html = _read("%s/index.html" % slug)
            self.assertIn('href="../"', html)
            others = [s for s in charts_mod.PAGE_POOLERS if s != slug]
            for other in others[:1]:
                pass
            # prev/next links cover two distinct siblings
            links = re.findall(r'href="\.\./([a-z]+)/"', html)
            self.assertGreaterEqual(len(set(links)), 2,
                                    "prev/next nav incomplete in %s" % slug)

    def test_hosts_match_generated_charts(self):
        for slug in charts_mod.PAGE_POOLERS:
            html = _read("%s/index.html" % slug)
            parser = _DivIdParser()
            parser.feed(html)
            options = _load_json("results/charts/%s.json" % slug)
            for page, chart in parser.hosts:
                self.assertIn(chart, options,
                              "%s host without generated option" % chart)


class PaletteConsistencyTest(unittest.TestCase):
    def test_each_pooler_maps_to_hex_on_every_page(self):
        pages = ["comparison"] + list(charts_mod.PAGE_POOLERS)
        for page in pages:
            options = _load_json("results/charts/%s.json" % page)
            blob = json.dumps(options)
            if page == "comparison":
                for pooler, hexcode in charts_mod.PALETTE.items():
                    self.assertIn(hexcode, blob,
                                  "%s color missing on comparison" % pooler)
            else:
                self.assertIn(charts_mod.PALETTE[page], blob,
                              "own color missing on %s" % page)

    def test_na_marker_color_present_where_na_exists(self):
        options = _load_json("results/charts/comparison.json")
        blob = json.dumps(options)
        self.assertIn(charts_mod.NA_COLOR, blob)


class NaMarkerTest(unittest.TestCase):
    def test_na_points_explicit_and_never_zero_filled(self):
        m1 = _load_json("results/m1/medians.json")
        m2 = _load_json("results/m2/medians.json")
        na_cells = {(e["cell_id"], e["pooler"]) for e in m1 + m2
                    if e["status"] == "N/A (unsupported)"}
        self.assertTrue(na_cells, "fixture bundles lost their N/A rows")
        options = _load_json("results/charts/comparison.json")
        blob = json.dumps(options)
        self.assertIn("N/A (unsupported)", blob)
        # every bar series: N/A cells are null, never 0
        for charts in options.values():
            for series in charts.get("series", []):
                if series.get("type") != "bar":
                    continue
                for point in series.get("data", []):
                    value = (point.get("value") if isinstance(point, dict)
                             else point)
                    self.assertNotEqual(value, 0,
                                        "zero-filled bar point (gap-fill)")

    def test_timeout_points_explicit(self):
        options = _load_json("results/charts/comparison.json")
        self.assertIn("timeout/inconclusive", json.dumps(options))


class ZeroHandValuesTest(unittest.TestCase):
    def test_committed_options_deep_equal_fresh_run(self):
        m1 = _load_json("results/m1/medians.json")
        m2 = _load_json("results/m2/medians.json")
        bundle = _load_json("results/report.json")
        fresh = charts_mod.build_options(m1, m2, bundle)
        for page, charts in fresh.items():
            committed = _load_json("results/charts/%s.json" % page)
            self.assertEqual(committed, charts,
                             "hand values in results/charts/%s.json" % page)

    def test_manifest_shas_match_inputs(self):
        manifest = _load_json("results/charts/manifest.json")
        import hashlib

        def sha(path):
            digest = hashlib.sha256()
            with open(os.path.join(ROOT, path), "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    digest.update(chunk)
            return digest.hexdigest()

        sources = manifest["sources"]
        self.assertEqual(
            sources,
            {"m1/medians.json": sha("results/m1/medians.json"),
             "m2/medians.json": sha("results/m2/medians.json"),
             "report.json": sha("results/report.json")})
        self.assertEqual(len(manifest["pages"]), 6)


class OptionEncodesMediansTest(unittest.TestCase):
    def test_bar_values_equal_bundle_medians(self):
        m1 = _load_json("results/m1/medians.json")
        options = _load_json("results/charts/comparison.json")
        by_key = {(e["cell_id"], e["pooler"]): e for e in m1}
        m1_best = options["m1-best"]
        x_labels = m1_best["xAxis"]["data"]
        for series in m1_best["series"]:
            if series.get("type") != "bar":
                continue
            name = series["name"]
            pooler = next(p for p, d in charts_mod.DISPLAY.items()
                          if d == name)
            for i, point in enumerate(series["data"]):
                entry = by_key.get((x_labels[i], pooler))
                if entry is None or entry["status"] != "measured":
                    self.assertIsNone(point)
                else:
                    self.assertEqual(point, entry["tps"]["median"])

    def test_bands_match_min_max(self):
        m1 = _load_json("results/m1/medians.json")
        options = _load_json("results/charts/comparison.json")
        by_key = {(e["cell_id"], e["pooler"]): e for e in m1}
        m1_best = options["m1-best"]
        x_labels = m1_best["xAxis"]["data"]
        by_name = {s["name"]: s for s in m1_best["series"]}
        for pooler, display in charts_mod.DISPLAY.items():
            mins = by_name[display + " min"]["data"]
            maxs = by_name[display + " max"]["data"]
            for i, cell in enumerate(x_labels):
                entry = by_key.get((cell, pooler))
                if entry is None or entry["status"] != "measured":
                    self.assertIsNone(mins[i])
                    self.assertIsNone(maxs[i])
                else:
                    self.assertEqual(mins[i], entry["tps"]["min"])
                    self.assertEqual(maxs[i], entry["tps"]["max"])


class FurnitureTest(unittest.TestCase):
    def test_axes_start_at_zero_with_zoom_toggles_export(self):
        for page in ["comparison"] + list(charts_mod.PAGE_POOLERS):
            options = _load_json("results/charts/%s.json" % page)
            for chart_id, opt in options.items():
                if chart_id.endswith("-log"):
                    self.assertEqual(opt["yAxis"]["type"], "log",
                                     "%s/%s is not a log twin"
                                     % (page, chart_id))
                    continue
                self.assertEqual(opt["yAxis"]["min"], 0,
                                 "%s/%s truncates its axis" % (page, chart_id))
                self.assertTrue(opt["dataZoom"], "%s/%s lacks zoom"
                                % (page, chart_id))
                self.assertIn("legend", opt)
                self.assertEqual(opt["legend"].get("type"), "scroll",
                                 "%s/%s legend does not scroll"
                                 % (page, chart_id))
                self.assertIn("saveAsImage",
                              json.dumps(opt.get("toolbox", {})),
                              "%s/%s lacks PNG export" % (page, chart_id))

    def test_loader_uses_svg_renderer_only(self):
        loader = _read("assets/poolduel-charts.js")
        self.assertIn('renderer: "svg"', loader.replace("'", '"'))
        self.assertNotIn("canvas", loader.lower())

    def test_loader_passes_node_check(self):
        proc = subprocess.run(
            ["node", "--check",
             os.path.join(ROOT, "assets/poolduel-charts.js")],
            capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)


class ReadabilityRegressionTest(unittest.TestCase):
    """Owner review (2026-09-13) readability gates, all deterministic."""

    def test_x_labels_sort_numerically(self):
        options = _load_json("results/charts/comparison.json")
        labels = options["m2-io"]["xAxis"]["data"]
        self.assertEqual(labels, sorted(labels, key=charts_mod._natural))
        self.assertLess(labels.index("M2-I2"), labels.index("M2-I10"),
                        "lexicographic zigzag: I10 before I2")

    def test_log_twins_mirror_linear_values(self):
        options = _load_json("results/charts/comparison.json")
        for chart_id in ("m1-best", "m2-session", "m2-statement", "m2-io",
                         "m2-workloads", "m2-prepared"):
            linear = options[chart_id]
            twin = options[chart_id + "-log"]
            self.assertEqual(twin["yAxis"]["type"], "log")
            self.assertEqual(twin["xAxis"]["data"], linear["xAxis"]["data"])
            # y=0 N/A/timeout markers are undefined on a log axis, so the
            # twin is bar/line-only; markers live on the linear chart.
            for series in twin["series"]:
                self.assertNotEqual(series.get("type"), "scatter",
                                    "%s log twin carries a scatter series"
                                    % chart_id)
            expected = [s for s in linear["series"]
                        if s.get("type") != "scatter"]
            self.assertEqual(len(twin["series"]), len(expected),
                             "%s log twin dropped a data series" % chart_id)
            for lseries, tseries in zip(expected, twin["series"]):
                self.assertEqual(lseries["name"], tseries["name"])
                self.assertEqual(tseries["data"], lseries["data"])
            self.assertIn("markers shown on the linear chart",
                          twin["title"]["subtext"])

    def test_own_page_log_twins_carry_no_scatter(self):
        for pooler in charts_mod.PAGE_POOLERS:
            options = _load_json("results/charts/%s.json" % pooler)
            for chart_id in ("own-m1", "own-m2"):
                twin = options[chart_id + "-log"]
                self.assertEqual(twin["yAxis"]["type"], "log")
                for series in twin["series"]:
                    self.assertNotEqual(series.get("type"), "scatter",
                                        "%s/%s log twin carries a scatter "
                                        "series" % (pooler, chart_id))

    def test_markers_lift_off_baseline_with_labels(self):
        options = _load_json("results/charts/comparison.json")
        found = False
        for charts in options.values():
            for series in charts.get("series", []):
                if series.get("type") != "scatter":
                    continue
                found = True
                self.assertEqual(series.get("symbolOffset"), [0, -14])
                self.assertTrue((series.get("label") or {}).get("show"))
                for point in series["data"]:
                    self.assertEqual(point[1], 0)
        self.assertTrue(found, "no marker series generated")

    def test_all_none_poolers_dropped_with_subtitle_note(self):
        options = _load_json("results/charts/comparison.json")
        stmt = options["m2-statement"]
        names = [s["name"] for s in stmt["series"]]
        self.assertNotIn("pgagroal", names)
        self.assertNotIn("pgpool-II", names)
        self.assertNotIn("pgcat", names)
        self.assertIn("No measured cells", stmt["title"]["subtext"])

    def test_iso_prefers_cross_matrix_slice(self):
        bundle = _load_json("results/report.json")
        cross = [r for r in bundle["iso_regions"] if r["matched"]
                 and any(c.startswith("M1-") for c in r["matched_cells"])
                 and any(c.startswith("M2-") for c in r["matched_cells"])]
        options = _load_json("results/charts/comparison.json")
        if cross:
            iso = options["iso-overlay"]
            self.assertIn("cross-matrix", iso["title"]["subtext"])
        else:
            self.assertNotIn("iso-overlay", options)

    def test_flatness_names_carry_workloads(self):
        options = _load_json("results/charts/comparison.json")
        data = options["flatness"]["series"][0]["data"]
        for point in data:
            if point["value"] is None:
                continue
            self.assertIn("trough", point["name"])
            self.assertRegex(point["name"], r"\(.+\)")

    def test_subtitles_carry_peak_and_context(self):
        options = _load_json("results/charts/comparison.json")
        subtext = options["m1-best"]["title"]["subtext"]
        self.assertIn("peak", subtext)
        self.assertIn("warmup", subtext.lower())
        self.assertIn("scale 10", subtext)


class OfflineCleanTest(unittest.TestCase):
    CDN = ("cdn.jsdelivr", "unpkg.com", "cdnjs", "googleapis",
           "jsdelivr.net/fastly", "http://", "https://cdn")

    def test_no_cdn_references_under_poolduel(self):
        checked = 0
        for dirpath, _, filenames in os.walk(ROOT):
            for filename in filenames:
                if not filename.endswith((".html", ".js")):
                    continue
                if "vendor" in dirpath:
                    continue
                path = os.path.join(dirpath, filename)
                with open(path) as f:
                    content = f.read()
                for marker in self.CDN:
                    if marker in ("http://", "https://cdn"):
                        hits = [line for line in content.splitlines()
                                if ("src=\"http" in line
                                    or "src='http" in line)]
                        self.assertEqual(hits, [],
                                         "CDN script in %s" % path)
                    else:
                        self.assertNotIn(marker, content,
                                         "CDN marker in %s" % path)
                checked += 1
        self.assertGreater(checked, 5)

    def test_vendor_pin_present(self):
        self.assertTrue(os.path.isfile(os.path.join(
            ROOT, "vendor/echarts-5.5.1/dist/echarts.min.js")))
        self.assertTrue(os.path.isfile(os.path.join(
            ROOT, "vendor/VERSION")))


if __name__ == "__main__":
    unittest.main()
