"""M10 report wiring: --m9-dir aggregation plus statistics rebuild.

Covers ``report.build_statistics`` / ``build_bundle`` / ``write_outputs``
with the M9 leg attached: family gating, claim re-derivation, bundle
backward compatibility (m1/m2-only shape unchanged), and determinism.
Synthetic data only; tiny bootstrap budgets for speed.
"""

import json
import os
import tempfile
import unittest

from poolduel.harness import report


def make_rec(cell, pooler, repeat, tps, p99=20.0, seed=42,
             status="measured"):
    return {
        "cell_id": cell,
        "workload": "tpcb",
        "pooler": pooler,
        "pooler_version": "test",
        "pooler_config": "# test config for %s" % pooler,
        "pg_version": "PG 17 (test)",
        "pg_config": {"shared_buffers": "512MB",
                      "max_connections": 300,
                      "synchronous_commit": "on", "fsync": "on"},
        "scale": 10,
        "clients": 50,
        "pool_size": 10,
        "threads": 4,
        "protocol": "simple",
        "churn": False,
        "duration_s": 60,
        "warmup_s": 30,
        "repeat": repeat,
        "seed": seed + repeat,
        "tps": tps,
        "latency_avg_ms": 4.0 if tps else None,
        "latency_stddev_ms": 0.1 if tps else None,
        "p50_ms": 3.9 if tps else None,
        "p90_ms": 5.0 if tps else None,
        "p99_ms": p99,
        "p999_ms": (p99 * 1.5) if p99 else None,
        "failed": 0,
        "skipped": 0,
        "exit_code": 0 if status == "measured" else None,
        "status": status,
        "artifacts": {"stdout": None, "txnlog": None, "agglog": None},
    }


def arm_rows(cell, pooler, tps_vals, seed=42):
    return [make_rec(cell, pooler, i + 1, v, seed=seed)
            for i, v in enumerate(tps_vals)]


class StatisticsBuildTest(unittest.TestCase):
    def test_family_decisive_and_determinism(self):
        recs = (arm_rows("M9-R1", "direct", [100.0] * 7)
                + arm_rows("M9-R1", "pgbouncer", [200.0] * 7))
        med = report.aggregate(recs)
        s1 = report.build_statistics(med, recs, b=200, seed=7)
        s2 = report.build_statistics(med, recs, b=200, seed=7)
        self.assertEqual(s1, s2)
        self.assertEqual(s1["family_size"], 1)
        fam = s1["family"][0]
        self.assertEqual(fam["cell_id"], "M9-R1")
        # head arm is the best median (pgbouncer), so A is pgbouncer
        self.assertEqual(fam["a"], "pgbouncer")
        self.assertEqual(fam["b"], "direct")
        self.assertEqual(fam["verdict"], "A faster")
        self.assertTrue(fam["headline"])
        self.assertEqual(s1["method"]["bootstrap_b"], 200)
        self.assertEqual(s1["method"]["bootstrap_seed"], 7)

    def test_single_arm_cell_has_empty_family(self):
        recs = arm_rows("M9-R2", "direct", [100.0] * 7)
        med = report.aggregate(recs)
        stats = report.build_statistics(med, recs, b=200, seed=7)
        self.assertEqual(stats["family"], [])
        self.assertEqual(stats["headlines"], 0)

    def test_claims_section_present_with_kill_shape(self):
        recs = (arm_rows("M9-R1", "direct", [100.0] * 7)
                + arm_rows("M9-R1", "pgbouncer", [200.0] * 7))
        med = report.aggregate(recs)
        stats = report.build_statistics(med, recs, b=200, seed=7)
        self.assertEqual(len(stats["claims"]), 5)
        for claim in stats["claims"]:
            for key in ("claim", "effect", "ci", "verdict", "killed_by"):
                self.assertIn(key, claim)
            if claim["killed_by"] is not None:
                self.assertEqual(claim["verdict"], "inconclusive")


class BundleCompatTest(unittest.TestCase):
    def test_m1_m2_only_bundle_unchanged(self):
        recs = arm_rows("M1-1", "direct", [100.0, 101.0, 102.0])
        med = report.aggregate(recs)
        bundle = report.build_bundle(med, [])
        self.assertNotIn("m9_cells", bundle)
        self.assertNotIn("statistics", bundle)
        self.assertIn("best", bundle)
        self.assertIn("pairwise", bundle)

    def test_m9_bundle_adds_keys(self):
        recs = (arm_rows("M9-R1", "direct", [100.0] * 7)
                + arm_rows("M9-R1", "pgbouncer", [200.0] * 7))
        med = report.aggregate(recs)
        stats = report.build_statistics(med, recs, b=200, seed=7)
        bundle = report.build_bundle([], [], m9_medians=med,
                                      statistics=stats)
        self.assertEqual(bundle["m9_cells"], ["M9-R1"])
        self.assertEqual(bundle["m9_measured"], 2)
        self.assertIn("statistics", bundle)

    def test_write_outputs_m9_files(self):
        recs = (arm_rows("M9-R1", "direct", [100.0] * 7)
                + arm_rows("M9-R1", "pgbouncer", [200.0] * 7))
        med = report.aggregate(recs)
        stats = report.build_statistics(med, recs, b=200, seed=7)
        with tempfile.TemporaryDirectory() as tmp:
            bundle = report.write_outputs([], [], tmp, m9_medians=med,
                                          statistics=stats)
            for path in ("m9/medians.json", "m9/matrix.csv",
                         "report.json"):
                self.assertTrue(os.path.exists(os.path.join(tmp, path)),
                                path)
            on_disk = json.load(open(os.path.join(tmp, "report.json")))
            self.assertEqual(on_disk["statistics"]["family_size"], 1)
            self.assertEqual(bundle["statistics"]["family_size"], 1)

    def test_cli_m9_dir_end_to_end(self):
        recs = (arm_rows("M9-R1", "direct", [100.0] * 7)
                + arm_rows("M9-R1", "pgbouncer", [200.0] * 7))
        with tempfile.TemporaryDirectory() as raw:
            os.makedirs(os.path.join(raw, "raw"))
            for i, rec in enumerate(recs):
                with open(os.path.join(raw, "raw", "r%d.json" % i),
                          "w") as f:
                    json.dump(rec, f)
            with tempfile.TemporaryDirectory() as out:
                rc = report.main(["--m9-dir", raw, "--bootstrap-b", "200",
                                  "--bootstrap-seed", "7", "--out", out])
                self.assertEqual(rc, 0)
                bundle = json.load(open(os.path.join(out, "report.json")))
                self.assertIn("statistics", bundle)
                self.assertEqual(bundle["m9_cells"], ["M9-R1"])


if __name__ == "__main__":
    unittest.main()
