"""M3 report engine tests: aggregation, comparisons, CSV, CLI.

All fixtures are synthetic records built in-test (never claimed as
measured results); they exercise the math the Pages report publishes.
"""

import csv
import io
import json
import os
import tempfile
import unittest

from poolduel.harness import report


def make_rec(cell_id, pooler, repeat, tps=None, p99=None,
             status="measured", workload="select-only", clients=100,
             pool_size=10, protocol="simple", churn=False,
             duration_s=60, warmup_s=30, seed=42):
    rec = {
        "cell_id": cell_id,
        "workload": workload,
        "pooler": pooler,
        "pooler_version": "test",
        "pooler_config": "# test config for %s" % pooler,
        "pg_version": "PG 17 (test)",
        "pg_config": {"shared_buffers": "512MB",
                      "max_connections": 300,
                      "synchronous_commit": "on", "fsync": "on"},
        "scale": 10,
        "clients": clients,
        "pool_size": pool_size,
        "threads": 4,
        "protocol": protocol,
        "churn": churn,
        "duration_s": duration_s,
        "warmup_s": warmup_s,
        "repeat": repeat,
        "seed": seed + repeat,
        "tps": tps,
        "latency_avg_ms": 1.0 if tps else None,
        "latency_stddev_ms": 0.1 if tps else None,
        "p50_ms": 0.5 if tps else None,
        "p90_ms": 0.8 if tps else None,
        "p99_ms": p99,
        "p999_ms": (p99 * 1.5) if p99 else None,
        "failed": 0,
        "skipped": 0,
        "exit_code": 0 if status == "measured" else None,
        "status": status,
        "artifacts": {"stdout": None, "txnlog": None, "agglog": None},
    }
    return rec


def trio(cell_id, pooler, tps_vals, p99_vals, **kw):
    return [make_rec(cell_id, pooler, r + 1, tps=tps_vals[r],
                     p99=p99_vals[r], **kw)
            for r in range(3)]


class AggregateTest(unittest.TestCase):
    def test_median_band_cv_and_n(self):
        recs = trio("M1-1", "pgbouncer", [1000.0, 1100.0, 1200.0],
                    [2.0, 2.1, 2.2])
        med = report.aggregate(recs)
        self.assertEqual(len(med), 1)
        entry = med[0]
        self.assertEqual(entry["tps"]["median"], 1100.0)
        self.assertEqual(entry["tps"]["min"], 1000.0)
        self.assertEqual(entry["tps"]["max"], 1200.0)
        self.assertEqual(entry["tps"]["n"], 3)
        self.assertGreater(entry["tps"]["cv"], 0.0)
        # runner.write_medians-compatible shape plus context
        self.assertEqual(entry["cell_id"], "M1-1")
        self.assertEqual(entry["pooler"], "pgbouncer")
        self.assertEqual(entry["workload"], "select-only")
        self.assertEqual(entry["clients"], 100)
        self.assertFalse(entry["context_mixed"])

    def test_mixed_status_collapses_to_inconclusive(self):
        recs = trio("M1-1", "pgbouncer", [1000.0, 1100.0, 1200.0],
                    [2.0, 2.1, 2.2])
        recs[2]["status"] = "measured"
        bad = make_rec("M1-1", "pgbouncer", 4, status="timeout/inconclusive")
        med = report.aggregate(recs + [bad])
        self.assertEqual(med[0]["status"], "timeout/inconclusive")
        for metric in report.METRIC_KEYS:
            self.assertIsNone(med[0][metric]["median"],
                              metric)

    def test_mixed_context_flagged_not_failed(self):
        recs = trio("M1-1", "pgbouncer", [1000.0, 1100.0, 1200.0],
                    [2.0, 2.1, 2.2])
        recs[1]["clients"] = 200
        med = report.aggregate(recs)
        self.assertTrue(med[0]["context_mixed"])
        self.assertEqual(med[0]["tps"]["n"], 3)

    def test_sane_percentiles_not_quarantined(self):
        recs = trio("M1-1", "pgbouncer", [1000.0, 1100.0, 1200.0],
                    [2.0, 2.1, 2.2])
        med = report.aggregate(recs)
        self.assertFalse(med[0]["p_quarantined"])
        self.assertEqual(med[0]["p99_ms"]["median"], 2.1)

    def test_aggregate_sum_contamination_quarantined(self):
        # Direct M1-1 shape: lat_avg ~4ms with p50 ~250000ms (a SUM read
        # as a latency). p-summaries null out, tps survives, flag set.
        recs = trio("M1-1", "direct", [24000.0, 25405.0, 25509.0],
                    [249908.0, 249934.0, 249947.0])
        for rec in recs:
            rec["latency_avg_ms"] = 3.93
            rec["p50_ms"] = 249895.0
            rec["p90_ms"] = 249926.0
            rec["p999_ms"] = 249935.0
        med = report.aggregate(recs)
        self.assertTrue(med[0]["p_quarantined"])
        for metric in ("p50_ms", "p90_ms", "p99_ms", "p999_ms"):
            self.assertIsNone(med[0][metric]["median"], metric)
        self.assertEqual(med[0]["tps"]["median"], 25405.0)
        self.assertEqual(med[0]["status"], "measured")

    def test_zero_p50_quarantined(self):
        recs = trio("M1-5", "pgagroal", [480.0, 482.0, 490.0],
                    [5.0, 5.1, 5.2])
        for rec in recs:
            rec["latency_avg_ms"] = 200.0
            rec["p50_ms"] = 0.0
            rec["p90_ms"] = 0.0
            rec["p999_ms"] = 0.0
        med = report.aggregate(recs)
        self.assertTrue(med[0]["p_quarantined"])
        self.assertIsNone(med[0]["p99_ms"]["median"])

    def test_quarantined_gate_falls_back_to_tps(self):
        # Binding gate with quarantined p99 decides on tps bands alone.
        recs = (trio("M1-1", "direct", [24000.0, 24100.0, 24200.0],
                     [249900.0, 249910.0, 249920.0]) +
                trio("M1-1", "pgbouncer", [17000.0, 17100.0, 17200.0],
                     [249900.0, 249910.0, 249920.0]))
        for rec in recs:
            rec["latency_avg_ms"] = 4.0
            rec["p50_ms"] = 249895.0
            rec["p90_ms"] = 249900.0
            rec["p999_ms"] = 249930.0
        best = report.per_cell_best(report.aggregate(recs))
        ranked = best["M1-1"]["ranked"]
        self.assertEqual(ranked[0]["pooler"], "direct")
        self.assertEqual(ranked[0]["verdict"], "best")
        self.assertIn("A faster", ranked[1]["verdict"])


class LoadRawTest(unittest.TestCase):
    def test_loads_valid_skips_sidecars_reports_bad(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, "raw")
            os.makedirs(raw)
            rec = make_rec("M1-1", "direct", 1, tps=900.0, p99=2.5)
            with open(os.path.join(raw, "M1-1-direct-r1.json"), "w") as f:
                json.dump(rec, f)
            with open(os.path.join(raw, "manifest.json"), "w") as f:
                json.dump({"completed": []}, f)
            with open(os.path.join(raw, "summary.json"), "w") as f:
                json.dump({}, f)
            broken = dict(rec)
            broken["tps"] = 0  # N/A-style zero in measured row: invalid
            with open(os.path.join(raw, "M1-1-pgbouncer-r1.json"), "w") as f:
                json.dump(broken, f)
            recs, errors = report.load_raw([raw])
            self.assertEqual(len(recs), 1)
            self.assertEqual(len(errors), 1)
            self.assertIn("schema", errors[0])

    def test_empty_dir_is_an_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, "raw")
            os.makedirs(raw)
            recs, errors = report.load_raw([raw])
            self.assertEqual(recs, [])
            self.assertEqual(len(errors), 1)


class BestTest(unittest.TestCase):
    def test_clear_winner_gets_best_verdict(self):
        recs = (trio("M1-1", "pgbouncer", [2000.0, 2100.0, 2200.0],
                     [1.0, 1.1, 1.2])
                + trio("M1-1", "pgcat", [1000.0, 1100.0, 1200.0],
                       [2.0, 2.1, 2.2]))
        best = report.per_cell_best(report.aggregate(recs))
        ranked = best["M1-1"]["ranked"]
        self.assertEqual(ranked[0]["pooler"], "pgbouncer")
        self.assertEqual(ranked[0]["verdict"], "best")
        self.assertIn("A faster", ranked[1]["verdict"])
        self.assertEqual(best["M1-1"]["na"], [])

    def test_overlapping_bands_are_inconclusive(self):
        recs = (trio("M1-1", "pgbouncer", [1000.0, 1100.0, 1200.0],
                     [2.0, 2.1, 2.2])
                + trio("M1-1", "pgcat", [1050.0, 1100.0, 1150.0],
                       [2.0, 2.1, 2.2]))
        best = report.per_cell_best(report.aggregate(recs))
        verdicts = [r["verdict"] for r in best["M1-1"]["ranked"]]
        self.assertTrue(any("inconclusive" in v for v in verdicts))

    def test_na_listed_never_ranked_never_zero(self):
        recs = (trio("M2-T1", "pgbouncer", [1500.0, 1600.0, 1700.0],
                     [1.5, 1.6, 1.7])
                + [make_rec("M2-T1", "pgcat", 1,
                            status="N/A (unsupported)")])
        best = report.per_cell_best(report.aggregate(recs))
        self.assertEqual(len(best["M2-T1"]["ranked"]), 1)
        self.assertEqual(best["M2-T1"]["na"],
                         [{"pooler": "pgcat",
                           "status": "N/A (unsupported)"}])
        for row in best["M2-T1"]["ranked"]:
            self.assertNotEqual(row["tps"]["median"], 0)


class PairwiseIsoFlatnessTest(unittest.TestCase):
    def test_pairwise_verdicts_cover_every_pair(self):
        recs = (trio("M1-1", "direct",
                     [900.0, 950.0, 1000.0], [2.4, 2.5, 2.6])
                + trio("M1-1", "pgbouncer", [2000.0, 2100.0, 2200.0],
                       [1.0, 1.1, 1.2])
                + trio("M1-1", "pgcat", [1000.0, 1100.0, 1200.0],
                       [2.0, 2.1, 2.2]))
        pairs = report.pairwise(report.aggregate(recs))["M1-1"]
        self.assertEqual(len(pairs), 3)  # 3 arms -> 3 pairs
        self.assertTrue(all("verdict" in p for p in pairs))

    def test_iso_region_matches_shared_geometry(self):
        recs = (trio("M1-1", "pgbouncer", [2000.0, 2100.0, 2200.0],
                     [1.0, 1.1, 1.2])
                + trio("M2-S5", "pgbouncer", [1900.0, 2000.0, 2100.0],
                       [1.1, 1.2, 1.3]))
        regions = report.iso_regions(report.aggregate(recs))
        matched = [r for r in regions if r["matched"]]
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["matched_cells"], ["M1-1", "M2-S5"])
        self.assertEqual(matched[0]["clients"], 100)

    def test_iso_region_distinguishes_protocol(self):
        recs = (trio("M1-2", "pgbouncer", [800.0, 850.0, 900.0],
                     [3.0, 3.1, 3.2], workload="tpcb-like",
                     clients=50, protocol="simple")
                + trio("M1-3", "pgbouncer", [700.0, 750.0, 800.0],
                       [3.4, 3.5, 3.6], workload="tpcb-like",
                       clients=50, protocol="prepared"))
        regions = report.iso_regions(report.aggregate(recs))
        self.assertEqual(len(regions), 2)
        self.assertFalse(any(r["matched"] for r in regions))

    def test_flatness_flat_peaky_single_point(self):
        flat_recs = []
        for i, cell in enumerate(["C1", "C2", "C3"]):
            flat_recs += trio(cell, "pgbouncer",
                              [1000.0 + i * 10, 1010.0 + i * 10,
                               1020.0 + i * 10],
                              [2.0, 2.1, 2.2])
        peaky_recs = (trio("C1", "pgcat", [500.0, 510.0, 520.0],
                           [4.0, 4.1, 4.2])
                      + trio("C2", "pgcat", [2000.0, 2100.0, 2200.0],
                             [1.0, 1.1, 1.2]))
        single = trio("C1", "odyssey", [900.0, 950.0, 1000.0],
                      [2.4, 2.5, 2.6])
        flat = report.flatness(report.aggregate(flat_recs + peaky_recs
                                                + single))
        self.assertEqual(flat["pgbouncer"]["verdict"], "flat")
        self.assertEqual(flat["pgcat"]["verdict"], "peaky")
        self.assertGreater(flat["pgcat"]["spread"], 0.15)
        self.assertEqual(flat["odyssey"]["verdict"], "single-point")
        self.assertEqual(flat["pgcat"]["peak"]["cell_id"], "C2")


class CsvBundleTest(unittest.TestCase):
    def test_csv_has_every_cell_and_empty_na(self):
        recs = (trio("M1-1", "pgbouncer", [2000.0, 2100.0, 2200.0],
                     [1.0, 1.1, 1.2])
                + [make_rec("M1-1", "pgcat", 1,
                            status="N/A (unsupported)")])
        text = report.matrix_csv(report.aggregate(recs))
        rows = list(csv.DictReader(io.StringIO(text)))
        self.assertEqual(len(rows), 2)
        na = [r for r in rows if r["pooler"] == "pgcat"][0]
        self.assertEqual(na["status"], "N/A (unsupported)")
        self.assertEqual(na["tps_median"], "")
        self.assertNotIn("0", na["tps_median"])
        measured = [r for r in rows if r["pooler"] == "pgbouncer"][0]
        self.assertEqual(float(measured["tps_median"]), 2100.0)

    def test_bundle_counts_and_files(self):
        recs = (trio("M1-1", "pgbouncer", [2000.0, 2100.0, 2200.0],
                     [1.0, 1.1, 1.2])
                + [make_rec("M2-T1", "pgcat", 1,
                            status="N/A (unsupported)")])
        med = report.aggregate(recs)
        m1 = [e for e in med if e["cell_id"].startswith("M1")]
        m2 = [e for e in med if e["cell_id"].startswith("M2")]
        bundle = report.build_bundle(m1, m2)
        self.assertEqual(bundle["measured"], 1)
        self.assertEqual(bundle["na"], 1)
        self.assertIn("M1-1", bundle["best"])
        with tempfile.TemporaryDirectory() as tmp:
            report.write_outputs(m1, m2, tmp)
            for path in ("m1/medians.json", "m1/matrix.csv",
                         "m2/medians.json", "m2/matrix.csv",
                         "report.json"):
                self.assertTrue(os.path.exists(os.path.join(tmp, path)),
                                path)


class CliTest(unittest.TestCase):
    def test_cli_needs_a_matrix_dir(self):
        with self.assertRaises(SystemExit):
            report.main([])

    def test_cli_fails_loudly_on_empty_results(self):
        with tempfile.TemporaryDirectory() as tmp:
            empty = os.path.join(tmp, "empty")
            os.makedirs(os.path.join(empty, "raw"))
            rc = report.main(["--m1-dir", empty, "--out",
                              os.path.join(tmp, "out")])
            self.assertEqual(rc, 1)

    def test_cli_builds_outputs_from_fixtures(self):
        with tempfile.TemporaryDirectory() as tmp:
            m1 = os.path.join(tmp, "m1res")
            os.makedirs(os.path.join(m1, "raw"))
            for rec in trio("M1-1", "direct", [900.0, 950.0, 1000.0],
                            [2.4, 2.5, 2.6]):
                path = os.path.join(
                    m1, "raw", "M1-1-direct-r%d.json" % rec["repeat"])
                with open(path, "w") as f:
                    json.dump(rec, f)
            out = os.path.join(tmp, "out")
            rc = report.main(["--m1-dir", m1, "--out", out])
            self.assertEqual(rc, 0)
            with open(os.path.join(out, "m1", "medians.json")) as f:
                med = json.load(f)
            self.assertEqual(med[0]["tps"]["median"], 950.0)


if __name__ == "__main__":
    unittest.main()
