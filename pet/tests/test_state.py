"""State model tests: defaults, clamping, JSON round-trip, rejection."""

import unittest

from pet.pet_core.state import Activity, PetState


class TestState(unittest.TestCase):
    def test_defaults(self):
        st = PetState()
        self.assertEqual(st.name, "Pip")
        self.assertEqual(st.activity, Activity.IDLE)
        self.assertEqual(st.schema_version, 1)

    def test_clamps_stats(self):
        st = PetState(energy=999.0, hunger=-5.0, affection=50.0)
        self.assertEqual(st.energy, 100.0)
        self.assertEqual(st.hunger, 0.0)

    def test_blank_name_falls_back(self):
        self.assertEqual(PetState(name="   ").name, "Pip")

    def test_round_trip(self):
        st = PetState(name="Mochi", activity=Activity.WALK, energy=33.5,
                      hunger=44.0, affection=55.0, x=10.0, y=-4.0,
                      tick_count=77, time_awake_sec=12.5)
        clone = PetState.from_dict(st.to_dict())
        self.assertEqual(clone.to_dict(), st.to_dict())

    def test_rejects_unknown_activity(self):
        with self.assertRaises(ValueError):
            PetState.from_dict({"activity": "fly", "schema_version": 1})

    def test_rejects_unknown_schema(self):
        with self.assertRaises(ValueError):
            PetState.from_dict({"activity": "idle", "schema_version": 999})

    def test_rejects_non_dict(self):
        with self.assertRaises(ValueError):
            PetState.from_dict([1, 2, 3])


if __name__ == "__main__":
    unittest.main()
