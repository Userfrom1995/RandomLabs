"""Persistence tests: round-trip, atomic write, corrupt recovery, backup."""

import json
import os
import tempfile
import unittest

from pet.pet_core import persistence
from pet.pet_core.state import Activity, PetState


class TestPersistence(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = os.path.join(self.tmp.name, "pet.json")

    def test_round_trip(self):
        st = PetState(name="Mochi", activity=Activity.WALK, energy=33.0)
        persistence.save(st, self.path)
        loaded, notice = persistence.load(self.path)
        self.assertIsNone(notice)
        self.assertEqual(loaded.to_dict(), st.to_dict())

    def test_missing_file_returns_defaults(self):
        loaded, notice = persistence.load(self.path)
        self.assertEqual(loaded.to_dict(), PetState().to_dict())
        self.assertIsNotNone(notice)

    def test_corrupt_file_backs_up_and_resets(self):
        with open(self.path, "w", encoding="utf-8") as handle:
            handle.write("{not valid json!!!")
        loaded, notice = persistence.load(self.path)
        self.assertEqual(loaded.to_dict(), PetState().to_dict())
        self.assertIsNotNone(notice)
        self.assertTrue(os.path.exists(self.path + ".bak"))
        with open(self.path + ".bak", encoding="utf-8") as handle:
            self.assertEqual(handle.read(), "{not valid json!!!")

    def test_wrong_schema_backs_up_and_resets(self):
        with open(self.path, "w", encoding="utf-8") as handle:
            json.dump({"schema_version": 999, "activity": "idle"}, handle)
        loaded, notice = persistence.load(self.path)
        self.assertEqual(loaded.to_dict(), PetState().to_dict())
        self.assertIsNotNone(notice)
        self.assertTrue(os.path.exists(self.path + ".bak"))

    def test_env_override_dir(self):
        custom = os.path.join(self.tmp.name, "custom-dir")
        old = os.environ.get("DESKTOP_PET_DATA_DIR")
        os.environ["DESKTOP_PET_DATA_DIR"] = custom
        self.addCleanup(lambda: os.environ.__setitem__(
            "DESKTOP_PET_DATA_DIR", old) if old is not None
            else os.environ.pop("DESKTOP_PET_DATA_DIR", None))
        target = persistence.default_save_path()
        self.assertTrue(target.startswith(custom))


if __name__ == "__main__":
    unittest.main()
