"""Needs math tests: exact decay/restore fixtures plus dt edge cases."""

import unittest

from pet.pet_core import needs as needs_mod
from pet.pet_core.state import Activity, PetState


class TestNeeds(unittest.TestCase):
    def test_hunger_decay_exact(self):
        st = PetState(hunger=20.0)
        needs_mod.tick_needs(st, 5.0)
        self.assertAlmostEqual(st.hunger, 20.0 + needs_mod.HUNGER_RATE_PER_SEC * 5.0)

    def test_dt_clamped_to_5s(self):
        st = PetState(hunger=10.0)
        needs_mod.tick_needs(st, 600.0)
        self.assertAlmostEqual(
            st.hunger, 10.0 + needs_mod.HUNGER_RATE_PER_SEC * 5.0)

    def test_zero_and_negative_dt_are_noops(self):
        st = PetState(hunger=10.0, energy=90.0, affection=90.0)
        before = st.to_dict()
        needs_mod.tick_needs(st, 0.0)
        needs_mod.tick_needs(st, -3.0)
        self.assertEqual(st.to_dict(), before)

    def test_sleep_restores_energy(self):
        st = PetState(activity=Activity.SLEEP, energy=10.0)
        needs_mod.tick_needs(st, 5.0)
        self.assertAlmostEqual(
            st.energy, 10.0 + needs_mod.ENERGY_RESTORE_PER_SEC * 5.0)

    def test_awake_drains_energy(self):
        st = PetState(activity=Activity.IDLE, energy=90.0)
        needs_mod.tick_needs(st, 5.0)
        self.assertAlmostEqual(
            st.energy, 90.0 - needs_mod.ENERGY_DRAIN_PER_SEC * 5.0)

    def test_feed_restores(self):
        st = PetState(hunger=80.0)
        restored = needs_mod.feed(st, 35.0)
        self.assertAlmostEqual(restored, 35.0)
        self.assertAlmostEqual(st.hunger, 45.0)

    def test_feed_clamps_at_full(self):
        st = PetState(hunger=5.0)
        restored = needs_mod.feed(st, 35.0)
        self.assertAlmostEqual(restored, 5.0)
        self.assertEqual(st.hunger, 0.0)

    def test_feed_rejects_nonpositive(self):
        st = PetState(hunger=50.0)
        self.assertEqual(needs_mod.feed(st, 0.0), 0.0)
        self.assertEqual(needs_mod.feed(st, -4.0), 0.0)
        self.assertEqual(st.hunger, 50.0)

    def test_affection_decay_and_stroke(self):
        st = PetState(affection=50.0)
        needs_mod.tick_needs(st, 5.0)
        decayed = 50.0 - needs_mod.AFFECTION_DECAY_PER_SEC * 5.0
        self.assertAlmostEqual(st.affection, decayed)
        gained = needs_mod.add_affection(st, 8.0)
        self.assertAlmostEqual(gained, 8.0)
        self.assertAlmostEqual(st.affection, decayed + 8.0)


if __name__ == "__main__":
    unittest.main()
