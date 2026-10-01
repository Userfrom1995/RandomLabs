"""Personality tests: seeded determinism, no-repeat bags, rename, moods."""

import unittest

from pet.pet_core.personality import (
    EVENT_KEYS,
    MOODS,
    Personality,
    mood_for,
)
from pet.pet_core.state import Activity, PetState


def _state(**kwargs) -> PetState:
    base = dict(energy=80.0, hunger=20.0, affection=60.0)
    base.update(kwargs)
    return PetState(**base)


class TestPersonality(unittest.TestCase):
    def test_mood_priority(self):
        self.assertEqual(mood_for(_state(hunger=90.0)), "hungry")
        self.assertEqual(mood_for(_state(energy=5.0)), "sleepy")
        self.assertEqual(mood_for(_state(affection=95.0)), "affectionate")
        self.assertEqual(mood_for(_state(affection=5.0)), "grumpy")
        self.assertEqual(mood_for(_state(energy=80.0, affection=70.0)), "happy")
        self.assertEqual(mood_for(_state(energy=50.0, affection=50.0)), "curious")

    def test_hunger_beats_sleepy(self):
        self.assertEqual(mood_for(_state(hunger=90.0, energy=5.0)), "hungry")

    def test_seeded_runs_match(self):
        first = Personality(seed=7)
        second = Personality(seed=7)
        self.assertEqual([first.line_for("happy") for _ in range(6)],
                         [second.line_for("happy") for _ in range(6)])

    def test_no_repeat_until_exhausted(self):
        pop = Personality(seed=3)
        seen: set[str] = set()
        # Happy pool has 5 lines; first 5 draws must all differ.
        first_five = [pop.line_for("happy") for _ in range(5)]
        self.assertEqual(len(set(first_five)), 5)
        seen.update(first_five)
        # Sixth draw reshuffles; it must still be a known pool line.
        sixth = pop.line_for("happy")
        self.assertIn(sixth, seen)

    def test_name_insertion(self):
        pop = Personality(name="Mochi", seed=1)
        lines = {pop.line_for_event("poke") for _ in range(3)}
        self.assertTrue(all("{name}" not in line for line in lines))
        self.assertTrue(any("Mochi" in line for line in lines))

    def test_rename_support(self):
        pop = Personality(seed=1)
        self.assertEqual(pop.set_name("  Mochi  "), "Mochi")
        self.assertEqual(pop.set_name(""), "Pip")
        self.assertEqual(pop.set_name("   "), "Pip")

    def test_unknown_keys_fall_back(self):
        pop = Personality(seed=1)
        self.assertIsInstance(pop.line_for("mystery"), str)
        self.assertIsInstance(pop.line_for_event("mystery"), str)

    def test_pool_coverage(self):
        pop = Personality(seed=1)
        sizes = pop.pool_sizes()
        for mood in MOODS:
            self.assertGreaterEqual(sizes[mood], 3)
        for event in EVENT_KEYS:
            self.assertGreaterEqual(sizes["event:" + event], 3)


if __name__ == "__main__":
    unittest.main()
