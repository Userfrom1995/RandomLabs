"""Tester adversarial regression suite for the desktop pet behavior brain.

Covers hostile paths verified live on PR #499 (Phase 1): full-state
seeded determinism (activity plus energy plus position), zero-dt ticks
advancing the counter without rolling transitions, hostile dt values
(NaN, negative, huge, wrong types) failing closed, corrupt save files
producing a .bak backup and healing on the next save, CLI rejecting bad
--ticks/--dt with exit 2, rename clamping (blank/long), negative feed
as a no-op, and the sleep/wake-on-rest cycle.
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

from pet.pet_core import persistence as persistence_mod
from pet.pet_core.brain import Brain
from pet.pet_core.state import Activity, PetState

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


def _run_brain(seed, ticks=200, dt=0.1):
    brain = Brain(seed=seed)
    for _ in range(ticks):
        brain.tick(dt)
    state = brain.state
    return (state.activity.value, round(state.energy, 4),
            round(state.hunger, 4), round(state.x, 4),
            round(state.y, 4), state.tick_count)


class TestTesterAdversarial(unittest.TestCase):
    def test_full_state_determinism_across_seeds(self):
        for seed in (7, 42, 1234):
            self.assertEqual(_run_brain(seed), _run_brain(seed))

    def test_zero_dt_advances_counter_without_transition(self):
        brain = Brain(seed=1)
        brain.state.activity = Activity.IDLE
        count0 = brain.state.tick_count
        for _ in range(50):
            events = brain.tick(0.0)
            self.assertEqual(events, [])
            self.assertEqual(brain.state.activity, Activity.IDLE)
        self.assertEqual(brain.state.tick_count, count0 + 50)

    def test_hostile_dt_values_fail_closed(self):
        brain = Brain(seed=3)
        for bad in (float("nan"), -5.0, 9999.0, "junk", None):
            events = brain.tick(bad)
            self.assertEqual(events, [])
        self.assertIn(brain.state.mood, ("happy", "curious", "sleepy",
                                         "grumpy", "hungry", "affectionate"))

    def test_corrupt_save_backs_up_and_heals_on_save(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("{not valid json!!!")
            state, notice = persistence_mod.load(path)
            self.assertIsNotNone(notice)
            self.assertIn("corrupt", notice)
            self.assertTrue(os.path.exists(path + ".bak"))
            with open(path + ".bak", "r", encoding="utf-8") as handle:
                self.assertIn("not valid json", handle.read())
            persistence_mod.save(state, path)
            back, clean = persistence_mod.load(path)
            self.assertIsNone(clean)
            self.assertEqual(back.to_dict(), state.to_dict())

    def test_cli_rejects_bad_ticks_and_dt(self):
        cases = [
            ["run", "--ticks", "0"],
            ["run", "--ticks", "-5"],
            ["run", "--ticks", "10", "--dt", "99"],
        ]
        for argv in cases:
            with tempfile.TemporaryDirectory() as tmp:
                env = dict(os.environ)
                env["DESKTOP_PET_DATA_DIR"] = tmp
                proc = subprocess.run(
                    [sys.executable, "-m", "pet"] + argv,
                    cwd=ROOT, capture_output=True, text=True,
                    env=env, timeout=60)
            self.assertEqual(proc.returncode, 2, argv)

    def test_cli_run_is_deterministic_with_seed(self):
        outputs = []
        for _ in range(2):
            with tempfile.TemporaryDirectory() as tmp:
                env = dict(os.environ)
                env["DESKTOP_PET_DATA_DIR"] = tmp
                proc = subprocess.run(
                    [sys.executable, "-m", "pet", "run",
                     "--ticks", "100", "--seed", "7", "--no-save"],
                    cwd=ROOT, capture_output=True, text=True,
                    env=env, timeout=60)
            self.assertEqual(proc.returncode, 0)
            outputs.append(proc.stdout)
        self.assertEqual(outputs[0], outputs[1])

    def test_rename_clamps_blank_and_long_names(self):
        brain = Brain(seed=9)
        brain.rename("   ")
        self.assertTrue(brain.state.name.strip())
        brain.rename("x" * 500)
        self.assertLessEqual(len(brain.state.name), 24)

    def test_negative_feed_is_noop_and_sleep_wakes_on_rest(self):
        brain = Brain(seed=9)
        hunger0 = brain.state.hunger
        brain.feed_pet(-10.0)
        self.assertAlmostEqual(brain.state.hunger, hunger0)
        brain.send_to_sleep()
        self.assertEqual(brain.state.activity, Activity.SLEEP)
        brain.state.energy = 95.0
        events = brain.tick(0.1)
        self.assertEqual(brain.state.activity, Activity.IDLE)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].kind, "wake")

    def test_react_never_lingers(self):
        brain = Brain(seed=9)
        brain.poke()
        self.assertEqual(brain.state.activity, Activity.REACT)
        for _ in range(120):
            brain.tick(0.1)
        self.assertNotEqual(brain.state.activity, Activity.REACT)

    def test_state_json_round_trip(self):
        original = PetState(name="RoundTrip", energy=33.3, hunger=77.7,
                            affection=11.1, x=5.5, y=-2.5,
                            activity=Activity.WALK)
        data = json.loads(json.dumps(original.to_dict()))
        back = PetState.from_dict(data)
        self.assertEqual(back.to_dict(), original.to_dict())


if __name__ == "__main__":
    unittest.main()
