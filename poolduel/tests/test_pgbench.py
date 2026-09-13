import unittest

from poolduel.harness import pgbench


SAMPLE = """\
pgbench (17.1)
starting vacuum...end.
transaction type: <builtin: TPC-B (sort of)>
scaling factor: 10
query mode: simple
number of clients: 50
number of threads: 4
duration: 60 s
number of transactions actually processed: 60000
latency average = 4.050 ms
latency stddev = 1.200 ms
tps = 1234.567 (without initial connection time)
number of failed transactions: 3
"""


class ParseTest(unittest.TestCase):
    def test_tps_and_latency(self):
        p = pgbench.parse_stdout(SAMPLE)
        self.assertAlmostEqual(p["tps"], 1234.567)
        self.assertAlmostEqual(p["latency_avg_ms"], 4.05)
        self.assertEqual(p["failed"], 3)
        self.assertEqual(p["processed"], 60000)

    def test_missing_tps_raises(self):
        with self.assertRaises(ValueError):
            pgbench.parse_stdout("no numbers here\n")

    def test_churn_including_line_parses(self):
        # pgbench -C prints "(including reconnection times)" instead of
        # "(without initial connection time)": M1-6 style churn output.
        text = ("pgbench (17.11)\n"
                "number of transactions actually processed: 1000\n"
                "latency average = 2.175 ms\n"
                "tps = 934.482484 (including reconnection times)\n")
        p = pgbench.parse_stdout(text)
        self.assertAlmostEqual(p["tps"], 934.482484)

    def test_excluding_preferred_over_including(self):
        text = ("tps = 100.0 (including connections establishing)\n"
                "tps = 200.0 (excluding connections establishing)\n")
        p = pgbench.parse_stdout(text)
        self.assertAlmostEqual(p["tps"], 200.0)

    def test_failed_ratio(self):
        self.assertFalse(pgbench.failed_ratio_exceeds(
            {"failed": 3, "processed": 60000}))
        self.assertTrue(pgbench.failed_ratio_exceeds(
            {"failed": 700, "processed": 60000}))

    def test_argv_identical_except_port(self):
        from poolduel.harness.cells import get_cell
        cell = get_cell("M1-2")
        a = pgbench.build_argv(cell, "127.0.0.1", 6433, "benchdb",
                               "benchuser", 4, log_prefix="x", seed=42)
        b = pgbench.build_argv(cell, "127.0.0.1", 5432, "benchdb",
                               "benchuser", 4, log_prefix="x", seed=42)
        self.assertNotEqual(a, b)
        norm = lambda argv: [t for t in argv if not t.startswith("643")
                             and t != "5432"]
        self.assertEqual(norm(a), norm(b))
        self.assertIn("-b", a)
        self.assertIn("tpcb-like", a)

    def test_workload_flags(self):
        from poolduel.harness.cells import get_cell
        self.assertIn("-S", pgbench.workload_flags(get_cell("M1-1")))
        self.assertIn("-N", pgbench.workload_flags(get_cell("M1-5")))
        prep = pgbench.workload_flags(get_cell("M1-3"))
        self.assertEqual(prep.count("prepared"), 1)
        churn = pgbench.workload_flags(get_cell("M1-6"))
        self.assertIn("-C", churn)

    def test_txn_log_percentiles(self):
        import tempfile, os
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            for i in range(1, 101):
                f.write("0 %d %d 0 0 0\n" % (i, i * 1000))
            path = f.name
        try:
            pct = pgbench.parse_txn_log(path)
            self.assertEqual(pct["samples"], 100)
            self.assertLess(pct["p50_ms"], pct["p99_ms"])
            self.assertAlmostEqual(pct["p50_ms"], 50.5, delta=1.0)
        finally:
            os.unlink(path)

    def test_txn_log_skips_aggregate_lines(self):
        # --aggregate-interval files carry "interval_start num_tx
        # latency_sum ..." lines whose field 2 is a SUM, not a latency.
        # They must never parse as percentiles (the M4 p99 poisoning).
        import tempfile, os
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            f.write("1789283935 171558 8306085 563575247 16 3026 "
                    "0 0 0 0 0 0 0 0 0\n")
            f.write("1789283940 214060 9826157 527904365 16 2797 "
                    "0 0 0 0 0 0 0 0 0\n")
            for i in range(1, 11):
                f.write("0 %d %d 0 1789283940 100\n" % (i, i * 1000))
            path = f.name
        try:
            pct = pgbench.parse_txn_log(path)
            self.assertEqual(pct["samples"], 10)
            self.assertAlmostEqual(pct["p50_ms"], 5.5, delta=1.0)
            self.assertLess((pct["p99_ms"] or 0), 1000.0)
        finally:
            os.unlink(path)

    def test_txn_logs_merge_workers(self):
        import tempfile, os
        paths = []
        try:
            for worker in range(3):
                with tempfile.NamedTemporaryFile("w", delete=False) as f:
                    for i in range(1, 11):
                        f.write("%d %d %d 0 1789283940 100\n"
                                % (worker, i, i * 1000))
                    paths.append(f.name)
            pct = pgbench.parse_txn_logs(paths)
            self.assertEqual(pct["samples"], 30)
        finally:
            for path in paths:
                os.unlink(path)

    def test_build_argv_has_no_aggregate_interval_by_default(self):
        from poolduel.harness.cells import get_cell
        cell = get_cell("M1-2")
        argv = pgbench.build_argv(cell, "127.0.0.1", 6433, "benchdb",
                                  "benchuser", 4, log_prefix="x", seed=42)
        self.assertIn("-l", argv)
        self.assertFalse([a for a in argv
                          if a.startswith("--aggregate-interval")])
        argv2 = pgbench.build_argv(cell, "127.0.0.1", 6433, "benchdb",
                                   "benchuser", 4, log_prefix="x", seed=42,
                                   agg_interval_s=10)
        self.assertIn("--aggregate-interval=10", argv2)

    def test_prepared_error_detect(self):
        self.assertTrue(pgbench.has_prepared_statement_error(
            'ERROR: prepared statement "x" does not exist (SQLSTATE 26000)'))
        self.assertFalse(pgbench.has_prepared_statement_error("all ok"))


if __name__ == "__main__":
    unittest.main()
