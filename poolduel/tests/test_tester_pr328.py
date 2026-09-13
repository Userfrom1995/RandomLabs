"""Tester hostile regression suite for PR #328 (M9 resweep, Refs #302).

Locks in the 5 blocking fixes from the review round plus hostile
probes the builder's 43 M9 tests do not cover: E1 posture scoping
(direct None vs every pooler arm labeled), exact 7-arm / 103-chunk /
2203-run / 78.08h budget parity, seed derivation from M9_SEEDS,
reps-shard honor on supa/m2 namespaces, 60-min cap headroom,
curve float rejection, wide-base seed distinctness, and E1 dry-run
arm coverage. Stdlib unittest only. Never touches production code.
"""

import unittest

from poolduel.harness import m9 as M
from poolduel.harness.runner import e1_auth_posture


class E1PostureScopingTest(unittest.TestCase):
    def test_direct_never_labeled(self):
        cell = {"variant": {"auth_mode": "equalized"}}
        self.assertIsNone(e1_auth_posture(cell, "direct"))

    def test_all_pooler_arms_labeled(self):
        cell = {"variant": {"auth_mode": "equalized"}}
        for arm in M.M9_ARMS:
            if arm == "direct":
                continue
            label = e1_auth_posture(cell, arm)
            self.assertIsNotNone(label, arm)
            self.assertIn("equalized", label, arm)

    def test_non_equalized_cells_unlabeled(self):
        for cell in ({}, {"variant": {}}, {"variant": {"auth_mode": "x"}}):
            for arm in M.M9_ARMS:
                self.assertIsNone(e1_auth_posture(cell, arm),
                                  (cell, arm))


class BudgetParityTest(unittest.TestCase):
    def test_seven_arms_exact(self):
        self.assertEqual(len(M.M9_ARMS), 7)
        self.assertIn("direct", M.M9_ARMS)
        self.assertIn("supavisor", M.M9_ARMS)
        self.assertIn("pgagroal", M.M9_ARMS)

    def test_no_eight_arm_prose(self):
        import inspect
        src = inspect.getsource(M)
        self.assertNotIn("8 arms", src)
        self.assertNotIn("all 8", src)

    def test_exact_matrix_totals(self):
        tot = M.m9_total_budget()
        self.assertEqual(tot["chunks"], 103)
        self.assertEqual(tot["arm_runs"], 2203)
        self.assertAlmostEqual(tot["measured_hours"], 78.08, places=2)

    def test_r01_and_e_block_math(self):
        self.assertAlmostEqual(M.m9_chunk_budget_minutes("m9r01"), 42.0)
        e_total = sum(M.m9_chunk_budget_minutes(c) for c in M.M9_CHUNKS
                      if c.startswith("m9e"))
        self.assertAlmostEqual(e_total, 98.0)

    def test_all_chunks_under_cap(self):
        over = M.check_m9_chunk_budgets(60.0)
        self.assertEqual(over, {})
        self.assertLessEqual(max(M.m9_chunk_budget_minutes(c)
                                 for c in M.M9_CHUNKS), 56.0)

    def test_k_block_direct_only(self):
        self.assertEqual(M.m9_chunk_arms("m9k01"), ["direct"])


class SeedDerivationTest(unittest.TestCase):
    def test_offsets_derive_from_constant(self):
        d1 = M.M9_SEEDS[1] - M.M9_SEEDS[0]
        d2 = M.M9_SEEDS[2] - M.M9_SEEDS[0]
        base = 777
        self.assertEqual(M.m9_seed_for(1, base), base)
        self.assertEqual(M.m9_seed_for(2, base), base + d1)
        self.assertEqual(M.m9_seed_for(3, base), base + d2)
        self.assertEqual(M.m9_seed_for(4, base),
                         base + M.M9_SEED_STRIDE)

    def test_distinct_wide_bases(self):
        for base in (1, 42, 10 ** 6):
            seeds = [M.m9_seed_for(r, base) for r in range(1, 21)]
            self.assertEqual(len(set(seeds)), 20, base)

    def test_rejects_nonpositive(self):
        with self.assertRaises(ValueError):
            M.m9_seed_for(0)


class ShardHonorTest(unittest.TestCase):
    def test_supa_honors_reps_shard(self):
        eid = M.m9_supa_ids()[0]
        cell, arms, reps = M.m9_entry_cells(("supa", eid, [1, 2], None))
        self.assertEqual(list(reps), [1, 2])
        self.assertEqual(list(arms), ["supavisor", "direct"])

    def test_m2_namespace_honors_reps_shard(self):
        from poolduel.harness.m2 import M2_ROWS
        eid = M2_ROWS[0][0]
        cell, arms, reps = M.m9_entry_cells(("m2", eid, [3], None))
        self.assertEqual(list(reps), [3])

    def test_curve_rejects_float(self):
        with self.assertRaises((KeyError, ValueError, TypeError)):
            M.m9_curve_cell(30.5)


if __name__ == "__main__":
    unittest.main()
