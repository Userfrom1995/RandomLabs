"""Brain tests: event API, transition coverage, determinism, O(1) ticks."""

import unittest

from pet.pet_core.brain import Brain
from pet.pet_core.personality import Personality
from pet.pet_core.state import Activity, PetState


class TestBrain(unittest.TestCase):
    def test_reaches_every_activity_seeded(self):
        brain = Brain(seed=1234)
        seen = set()
        for _ in range(4000):
            brain.tick(0.1)
            seen.add(brain.state.activity)
            if len(seen) == 5:
                break
        self.assertEqual(seen, set(Activity))

    def test_tick_emits_at_most_one_event(self):
        brain = Brain(seed=42)
        for _ in range(500):
            events = brain.tick(0.1)
            self.assertLessEqual(len(events), 1)

    def test_seeded_runs_match(self):
        first, second = Brain(seed=99), Brain(seed=99)
        for _ in range(200):
            ev1 = [e.to_dict() for e in first.tick(0.1)]
            ev2 = [e.to_dict() for e in second.tick(0.1)]
            self.assertEqual(ev1, ev2)
        self.assertEqual(first.state.to_dict(), second.state.to_dict())

    def test_bad_dt_is_safe(self):
        brain = Brain(seed=1)
        self.assertEqual(brain.tick(-1.0), [])
        self.assertEqual(brain.tick(float("nan")), [])

    def test_poke_triggers_react(self):
        brain = Brain(seed=1)
        event = brain.poke()
        self.assertEqual(event.kind, "poke")
        self.assertEqual(brain.state.activity, Activity.REACT)
        self.assertNotIn("{name}", event.text)
        self.assertTrue(event.text)

    def test_react_is_transient(self):
        brain = Brain(seed=1)
        brain.poke()
        for _ in range(200):
            brain.tick(0.1)
        self.assertNotEqual(brain.state.activity, Activity.REACT)

    def test_feed_restores_hunger(self):
        brain = Brain(seed=1)
        brain.state.hunger = 80.0
        event = brain.feed_pet(35.0)
        self.assertEqual(event.kind, "feed")
        self.assertAlmostEqual(brain.state.hunger, 45.0)

    def test_stroke_raises_affection(self):
        brain = Brain(seed=1)
        brain.state.affection = 40.0
        event = brain.stroke()
        self.assertEqual(event.kind, "stroke")
        self.assertAlmostEqual(brain.state.affection, 48.0)

    def test_play_and_sleep_cycle(self):
        brain = Brain(seed=1)
        play = brain.invite_play()
        self.assertEqual(play.kind, "play")
        self.assertEqual(brain.state.activity, Activity.PLAY)
        sleep = brain.send_to_sleep()
        self.assertEqual(brain.state.activity, Activity.SLEEP)
        self.assertEqual(sleep.kind, "sleep")
        wake = brain.wake()
        self.assertEqual(brain.state.activity, Activity.IDLE)
        self.assertEqual(wake.kind, "wake")

    def test_sleep_restores_then_auto_wakes(self):
        brain = Brain(seed=1)
        brain.state.energy = 5.0
        brain.send_to_sleep()
        for _ in range(4000):
            brain.tick(0.1)
            if brain.state.activity != Activity.SLEEP:
                break
        self.assertNotEqual(brain.state.activity, Activity.SLEEP)
        self.assertGreaterEqual(brain.state.energy, 89.0)

    def test_tired_pet_seeks_sleep(self):
        sleeps = 0
        for seed in range(6):
            brain = Brain(seed=seed)
            brain.state.energy = 5.0
            for _ in range(300):
                brain.tick(0.1)
                if brain.state.activity == Activity.SLEEP:
                    sleeps += 1
                    break
        self.assertGreaterEqual(sleeps, 4)

    def test_rename_syncs_state_and_personality(self):
        brain = Brain(seed=1)
        event = brain.rename("Mochi")
        self.assertEqual(event.kind, "rename")
        self.assertEqual(brain.state.name, "Mochi")
        self.assertEqual(brain.personality.name, "Mochi")
        self.assertIn("Mochi", event.text)

    def test_walk_moves_position(self):
        brain = Brain(seed=1)
        brain.state.activity = Activity.WALK
        x0, y0 = brain.state.x, brain.state.y
        for _ in range(50):
            brain.tick(0.1)
        self.assertNotEqual((brain.state.x, brain.state.y), (x0, y0))

    def test_state_tick_count_advances(self):
        brain = Brain(seed=1)
        for _ in range(10):
            brain.tick(0.1)
        self.assertEqual(brain.state.tick_count, 10)


if __name__ == "__main__":
    unittest.main()
