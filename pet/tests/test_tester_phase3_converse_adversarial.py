"""Tester adversarial suite for Phase 3 conversation heart (issue #504).

Covers the shipped entrypoint live (python -m pet talk / converse / run),
offline intent word-boundary traps, seeded determinism, no-repeat bags,
stat-aware answers, per-character voices, and the living-moments bus
(morning boot greeting, night greeting, milestone arm/rearm, contentment
window plus sleep suppression, idle-antic pacing, hostile never-raises).

Run: python3 -m unittest pet.tests.test_tester_phase3_converse_adversarial -v
"""

import os
import subprocess
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


def run_cli(*argv):
    return subprocess.run(
        [sys.executable, "-m", "pet", *argv],
        cwd=ROOT, capture_output=True, text=True, timeout=120)


class TestTalkCLI(unittest.TestCase):
    def test_talk_greeting_seed_deterministic(self):
        first = run_cli("talk", "hello there", "--seed", "7", "--no-save")
        second = run_cli("talk", "hello there", "--seed", "7", "--no-save")
        self.assertEqual(first.returncode, 0)
        self.assertEqual(first.stdout, second.stdout)
        self.assertIn("Pip:", first.stdout)

    def test_converse_alias_matches_talk(self):
        a = run_cli("talk", "tell me a joke", "--seed", "7", "--no-save")
        b = run_cli("converse", "tell me a joke", "--seed", "7", "--no-save")
        self.assertEqual(a.returncode, 0)
        self.assertEqual(a.stdout, b.stdout)

    def test_talk_empty_text_is_usage_error(self):
        proc = run_cli("talk", "", "--no-save")
        self.assertEqual(proc.returncode, 2)

    def test_talk_missing_text_is_usage_error(self):
        proc = run_cli("talk", "--no-save")
        self.assertEqual(proc.returncode, 2)

    def test_talk_unknown_text_deflects_never_silent(self):
        proc = run_cli("talk", "asdkfjalskdf xyz", "--seed", "7",
                       "--no-save")
        self.assertEqual(proc.returncode, 0)
        body = proc.stdout.split(":", 1)[1]
        self.assertTrue(body.strip())

    def test_talk_word_boundary_trap_no_false_hi(self):
        proc = run_cli("converse", "this is great", "--seed", "7",
                       "--no-save")
        self.assertEqual(proc.returncode, 0)
        # "this"/"great" must not route to the greeting pool.
        self.assertNotIn("saved you a spot", proc.stdout)
        self.assertNotIn("Good to see you", proc.stdout)

    def test_talk_character_voice_bramble(self):
        proc = run_cli("talk", "throw the ball", "--character", "bramble",
                       "--seed", "7", "--no-save")
        self.assertEqual(proc.returncode, 0)
        self.assertIn("Pip:", proc.stdout)

    def test_run_headless_still_green(self):
        proc = run_cli("run", "--ticks", "50", "--seed", "7", "--no-save")
        self.assertEqual(proc.returncode, 0)
        self.assertIn("done after 50 ticks", proc.stdout)


class TestIntentTraps(unittest.TestCase):
    def test_this_great_never_match(self):
        from pet.pet_core.converse import parse_intent
        self.assertIsNone(parse_intent("this is great"))
        self.assertIsNone(parse_intent("breathe together"))

    def test_ordering_hunger_beats_mood_sleep_beats_energy(self):
        from pet.pet_core.converse import parse_intent
        self.assertEqual(parse_intent("hi there"), "greeting")
        self.assertEqual(parse_intent("are you hungry?"), "hunger")
        self.assertEqual(parse_intent("take a nap"), "sleep")
        self.assertEqual(parse_intent("I am sleepy"), "energy")

    def test_hostile_parse_never_raises(self):
        from pet.pet_core.converse import parse_intent
        for bad in (None, "", "   ", 123, [], {}, float("nan")):
            self.assertIsNone(parse_intent(bad))


class TestConverserEngine(unittest.TestCase):
    def test_seeded_replay_identical(self):
        from pet.pet_core.converse import Converser
        first = Converser(character_id="luna", name="Luna", seed=42)
        second = Converser(character_id="luna", name="Luna", seed=42)
        for line in ("hello", "tell me a joke", "i love you",
                     "are you hungry", "what time is it"):
            self.assertEqual(first.reply(line), second.reply(line))

    def test_no_repeat_bag_cycles_full_pool(self):
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="pip", name="Pip", seed=1)
        seen = [talker.reply("hi")[0] for _ in range(4)]
        self.assertEqual(len(set(seen)), 4)

    def test_per_character_bags_do_not_leak(self):
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="pip", name="Pip", seed=9)
        talker.reply("hi")
        talker.set_character("bramble")
        reply, _ = talker.reply("hi")
        self.assertIn("Bramble", reply)

    def test_stat_aware_hunger_energy(self):
        from pet.pet_core.converse import Converser
        talker = Converser(seed=5)
        starved, _ = talker.reply("are you hungry", hunger=90.0)
        full, _ = talker.reply("are you hungry", hunger=5.0)
        self.assertNotEqual(starved, full)
        tired, _ = talker.reply("are you tired", energy=5.0)
        wired, _ = talker.reply("are you tired", energy=95.0)
        self.assertNotEqual(tired, wired)

    def test_unknown_character_falls_back_to_pip(self):
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="nope", name="Pip", seed=1)
        self.assertEqual(talker.character_id, "pip")
        reply, _ = talker.reply("hello")
        self.assertTrue(reply)

    def test_hostile_reply_never_raises(self):
        from pet.pet_core.converse import Converser
        talker = Converser(seed=1)
        for bad in (None, "", "   ", 123, [], {}, float("nan")):
            reply, _hint = talker.reply(bad)
            self.assertTrue(isinstance(reply, str) and reply.strip())


class TestLivingMoments(unittest.TestCase):
    def test_morning_boot_greeting_and_no_double_fire(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="pip", name="P", seed=1)
        first = bus.poll(hour=7.0, now=1000.0)
        self.assertTrue(any(e.kind == "morning" for e in first))
        second = bus.poll(hour=8.0, now=1010.0)
        self.assertFalse(any(e.kind == "morning" for e in second))

    def test_night_boot_greeting(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="luna", name="L", seed=2)
        found = bus.poll(hour=23.0, now=2000.0)
        self.assertTrue(any(e.kind == "night" for e in found))

    def test_milestone_fires_once_then_rearms(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(seed=3)
        self.assertTrue(any(e.kind == "milestone"
                            for e in bus.poll(affection=85.0, now=3000.0)))
        self.assertFalse(any(e.kind == "milestone"
                             for e in bus.poll(affection=85.0, now=3001.0)))
        bus.poll(affection=50.0, now=3002.0)
        self.assertTrue(any(e.kind == "milestone"
                            for e in bus.poll(affection=85.0, now=3003.0)))

    def test_content_window_and_sleep_suppression(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(seed=4)
        bus.notify_fed(now=4000.0)
        self.assertTrue(any(e.kind == "content" for e in
                            bus.poll(activity="idle", now=4010.0)))
        bus2 = LifeEvents(seed=4)
        bus2.notify_fed(now=4000.0)
        self.assertFalse(any(e.kind == "content" for e in
                             bus2.poll(activity="sleep", now=4010.0)))

    def test_idle_antic_paces_per_character(self):
        from pet.pet_core import traits as traits_mod
        from pet.pet_core.events import LifeEvents
        fast = LifeEvents(character_id="bramble", seed=6)
        slow = LifeEvents(character_id="mochi", seed=6)
        fast_interval = float(traits_mod.interaction_for(
            "bramble")["antic_interval_sec"])
        slow_interval = float(traits_mod.interaction_for(
            "mochi")["antic_interval_sec"])
        self.assertLessEqual(fast_interval, slow_interval)
        fast.notify_interaction(now=0.0)
        slow.notify_interaction(now=0.0)
        fast.poll(activity="idle", now=0.0)
        slow.poll(activity="idle", now=0.0)
        probe = fast_interval + 1.0
        self.assertTrue(any(e.kind == "idle_antic" for e in
                            fast.poll(activity="idle", now=probe)))
        if probe < slow_interval:
            self.assertFalse(any(e.kind == "idle_antic" for e in
                                 slow.poll(activity="idle", now=probe)))

    def test_hostile_poll_never_raises(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(seed=7)
        self.assertEqual(bus.poll(hour="xx", now=float("nan")), [])
        self.assertIsInstance(
            bus.poll(hour=None, now=5000.0, affection="xx",
                     activity=None, mood=None, hunger="xx",
                     energy=float("nan")), list)


if __name__ == "__main__":
    unittest.main()
