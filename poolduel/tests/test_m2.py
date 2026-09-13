import tempfile
import unittest

from poolduel.harness import m2 as m2_mod
from poolduel.harness import schema as schema_mod
from poolduel.harness.adapters import (OdysseyAdapter, PgAgroalAdapter,
                                       PgBouncerAdapter, PgCatAdapter,
                                       PgPoolAdapter)
from poolduel.harness.cells import get_cell
from poolduel.harness.cli import m2_direct_cell, m2_plan


def adapter_for(arm):
    return {"pgagroal": PgAgroalAdapter(),
            "pgbouncer": PgBouncerAdapter(),
            "pgpool": PgPoolAdapter(),
            "odyssey": OdysseyAdapter(),
            "pgcat": PgCatAdapter()}[arm]


class M2TableTest(unittest.TestCase):
    def test_row_count_and_ids_unique(self):
        ids = m2_mod.m2_cell_ids()
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(ids), 52)

    def test_all_ratios_valid(self):
        m2_mod.validate_m2_ratios()

    def test_every_chunk_under_cap(self):
        self.assertEqual(m2_mod.check_m2_chunk_budgets(), {})

    def test_chunks_cover_all_rows_exactly_once(self):
        seen = []
        for name in m2_mod.M2_CHUNKS:
            seen.extend(m2_mod.M2_CHUNKS[name])
        self.assertEqual(sorted(seen), sorted(m2_mod.m2_cell_ids()))

    def test_every_chunk_carries_direct(self):
        for name in m2_mod.M2_CHUNKS:
            arms = m2_mod.m2_chunk_arms(name)
            self.assertIn("direct", arms)

    def test_max_two_workloads_per_new_arm(self):
        # test-matrix cap: within each M2 block, each new arm is measured
        # on at most 2 workloads. The W/P twin blocks are the sanctioned
        # extras (one twin geometry per arm per twin type, M2-wl row).
        groups = {}
        for (cid, geom, arm, variant) in m2_mod.M2_ROWS:
            block = cid.split("-")[1][0]  # S, T, I, W, P
            key = (block, arm, tuple(sorted(variant.items())))
            groups.setdefault(key, set()).add(geom)
        for key, geoms in groups.items():
            self.assertLessEqual(
                len(geoms), 2, "arm %s exceeds 2-workload cap: %s"
                % (key, sorted(geoms)))


class M2VariantConfigTest(unittest.TestCase):
    def test_m1_backcompat_byte_markers(self):
        cell = get_cell("M1-2")
        self.assertIn("pipeline = transaction",
                      PgAgroalAdapter().config_text(cell))
        self.assertIn("ev_backend = auto",
                      PgAgroalAdapter().config_text(cell))
        self.assertIn("pool_mode = transaction",
                      PgBouncerAdapter().config_text(cell))
        self.assertIn("so_reuseport = 0",
                      PgBouncerAdapter().config_text(cell))
        self.assertIn('pool "transaction"',
                      OdysseyAdapter().config_text(cell))
        self.assertIn("workers 1", OdysseyAdapter().config_text(cell))
        self.assertIn('pool_mode = "transaction"',
                      PgCatAdapter().config_text(cell))
        self.assertIn("worker_threads = 5",
                      PgCatAdapter().config_text(cell))
        self.assertIn("num_init_children = 100",
                      PgPoolAdapter().config_text(cell))

    def test_session_arms(self):
        s1 = m2_mod.m2_cell("M2-S1")
        self.assertIn("pipeline = session",
                      PgAgroalAdapter().config_text(s1))
        # Session admission parity with PgBouncer query_wait_timeout=120s
        # (M2-S1 artifact: FATAL pool full on the old 30s blocking).
        self.assertIn("blocking_timeout = 120s",
                      PgAgroalAdapter().config_text(s1))
        s5 = m2_mod.m2_cell("M2-S5")
        self.assertIn("pool_mode = session",
                      PgBouncerAdapter().config_text(s5))

    def test_statement_arms(self):
        t1 = m2_mod.m2_cell("M2-T1")
        self.assertIn("pool_mode = statement",
                      PgBouncerAdapter().config_text(t1))
        t3 = m2_mod.m2_cell("M2-T3")
        text = OdysseyAdapter().config_text(t3)
        self.assertIn('pool "statement"', text)
        self.assertIn("PROVISIONAL", text)

    def test_io_axes(self):
        i1 = m2_mod.m2_cell("M2-I1")
        self.assertIn("ev_backend = io_uring",
                      PgAgroalAdapter().config_text(i1))
        i3 = m2_mod.m2_cell("M2-I3")
        self.assertIn("ev_backend = epoll",
                      PgAgroalAdapter().config_text(i3))
        i5 = m2_mod.m2_cell("M2-I5")
        text = PgBouncerAdapter().config_text(i5)
        self.assertIn("so_reuseport = 1", text)
        self.assertEqual(PgBouncerAdapter().instances(i5), 2)
        i7 = m2_mod.m2_cell("M2-I7")
        self.assertIn("workers 2", OdysseyAdapter().config_text(i7))
        i9 = m2_mod.m2_cell("M2-I9")
        self.assertIn("workers 4", OdysseyAdapter().config_text(i9))
        i11 = m2_mod.m2_cell("M2-I11")
        self.assertIn("worker_threads = 1",
                      PgCatAdapter().config_text(i11))
        i13 = m2_mod.m2_cell("M2-I13")
        ad = PgPoolAdapter()
        self.assertEqual((ad.num_children(i13), ad.max_pool(i13)), (100, 1))
        i15 = m2_mod.m2_cell("M2-I15")
        self.assertEqual((ad.num_children(i15), ad.max_pool(i15)), (200, 1))

    def test_pgpool_forbidden_corner_substituted(self):
        ad = PgPoolAdapter()
        cell = {"cell_id": "X", "clients": 200, "pool_size": 10,
                "variant": {"num_init_children": 200, "max_pool": 4}}
        self.assertEqual(ad.max_pool(cell), 1)
        self.assertLessEqual(ad.effective_backends(cell), 300)

    def test_invalid_variants_rejected(self):
        with self.assertRaises(ValueError):
            PgAgroalAdapter().pipeline({"pool_size": 10,
                                        "variant": {"pipeline": "auto"}})
        with self.assertRaises(ValueError):
            PgBouncerAdapter().pool_mode({"pool_size": 10,
                                          "variant": {"pool_mode": "auto"}})
        with self.assertRaises(ValueError):
            OdysseyAdapter().workers({"pool_size": 10,
                                      "variant": {"workers": 8}})
        with self.assertRaises(ValueError):
            PgCatAdapter().pool_mode({"pool_size": 10,
                                      "variant": {"pool_mode": "statement"}})
        with self.assertRaises(ValueError):
            PgPoolAdapter().num_children(
                {"clients": 100, "pool_size": 10,
                 "variant": {"num_init_children": 32}})

    def test_no_adapter_timeout_attributes(self):
        for cls in (PgAgroalAdapter, PgBouncerAdapter, PgPoolAdapter,
                    OdysseyAdapter, PgCatAdapter):
            for attr in ("timeout", "warmup", "retries", "retry"):
                self.assertNotIn(attr, cls.__dict__)

    def test_setup_writes_files_for_variants(self):
        with tempfile.TemporaryDirectory() as tmp:
            for cid in ("M2-S1", "M2-T1", "M2-I1", "M2-I7",
                        "M2-I11", "M2-I13", "M2-P4"):
                cell = m2_mod.m2_cell(cid)
                ad = adapter_for(cell["arm"])
                work = tmp + "/" + cid
                ad.setup(work, cell)
                self.assertTrue(ad.config_text(cell))


class M2PlanTest(unittest.TestCase):
    def test_plan_pairs_arm_with_direct(self):
        cells = [m2_mod.m2_cell("M2-S1")]
        plan = m2_plan(cells, repeats_per_cell=2)
        self.assertEqual(
            [(c["cell_id"], a, r) for (c, a, r) in plan],
            [("M2-S1", "pgagroal", 1), ("M2-S1", "direct", 1),
             ("M2-S1", "pgagroal", 2), ("M2-S1", "direct", 2)])

    def test_direct_cell_ignores_variant(self):
        row = m2_mod.m2_cell("M2-I7")
        direct = m2_direct_cell(row)
        self.assertEqual(direct["arm"], "direct")
        self.assertEqual(direct["variant"], {})
        self.assertEqual(direct["clients"], row["clients"])

    def test_na_rows_validate_with_nulls(self):
        self.assertEqual(len(m2_mod.M2_NA_ROWS), 7)
        for (cid, geom, arm, _reason) in m2_mod.M2_NA_ROWS:
            self.assertIn(arm, ("pgagroal", "pgbouncer", "pgpool",
                                "odyssey", "pgcat"))

    def test_records_carry_no_variant_field(self):
        # build_record must never leak the harness-internal variant/geometry
        # keys into the normative JSON schema (extra fields forbidden).
        from poolduel.harness.runner import build_record
        cell = m2_mod.m2_cell("M2-S1")
        ad = PgAgroalAdapter()
        measurement = {"status": "measured", "tps": 1000.0,
                       "latency_avg_ms": 4.0, "latency_stddev_ms": 1.0,
                       "p50_ms": 3.8, "p90_ms": 6.0, "p99_ms": 9.0,
                       "p999_ms": 15.0, "failed": 0, "skipped": 0,
                       "exit_code": 0, "stdout_path": "a",
                       "txn_path": "b", "agg_path": "c"}
        rec = build_record(cell, "pgagroal", ad.config_text(cell),
                           measurement, "PG 17", None, 4, 1, 43)
        self.assertEqual(schema_mod.validate_cell(rec), [])
        self.assertNotIn("variant", rec)
        self.assertNotIn("geometry", rec)
        self.assertNotIn("arm", rec)


if __name__ == "__main__":
    unittest.main()
