"""Tester adversarial regression: service switch never clobbers on bad ids.

Refs #504. Complements test_peros_linux_service_switch.py with hostile
inputs (empty id, path traversal) and a valid-switch control, all run
live through the shipped `python -m pet` entrypoint with isolated
DESKTOP_PET_DATA_DIR dirs.

Run: python3 -m unittest pet.tests.test_tester_service_switch_adversarial -v
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


def run_pet(*argv, data_dir=None):
    env = dict(os.environ)
    if data_dir is not None:
        env["DESKTOP_PET_DATA_DIR"] = data_dir
    return subprocess.run(
        [sys.executable, "-m", "pet"] + list(argv),
        cwd=ROOT, capture_output=True, text=True, env=env, timeout=120,
    )


def saved_character_id(data_dir):
    with open(os.path.join(data_dir, "pet.json"),
              encoding="utf-8") as handle:
        return json.load(handle)["character_id"]


class TestServiceSwitchAdversarial(unittest.TestCase):
    def test_valid_switch_still_works(self):
        with tempfile.TemporaryDirectory() as data:
            run_pet("characters", "switch", "kiki", data_dir=data)
            proc = run_pet("service", "switch", "pip", data_dir=data)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertEqual(saved_character_id(data), "pip")
            self.assertIn("pip", (proc.stdout + proc.stderr).lower())

    def test_empty_id_preserves_identity(self):
        with tempfile.TemporaryDirectory() as data:
            run_pet("characters", "switch", "kiki", data_dir=data)
            bad = run_pet("service", "switch", "", data_dir=data)
            combined = (bad.stdout + bad.stderr).lower()
            self.assertIn("unknown character", combined)
            self.assertEqual(saved_character_id(data), "kiki")

    def test_path_traversal_id_preserves_identity(self):
        with tempfile.TemporaryDirectory() as data:
            run_pet("characters", "switch", "kiki", data_dir=data)
            bad = run_pet("service", "switch", "../pip", data_dir=data)
            combined = (bad.stdout + bad.stderr).lower()
            self.assertIn("unknown character", combined)
            self.assertEqual(saved_character_id(data), "kiki")
            self.assertNotIn("traceback", combined)


if __name__ == "__main__":
    unittest.main()
