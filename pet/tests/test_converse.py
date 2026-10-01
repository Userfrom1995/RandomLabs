"""Headless tests for the offline conversation heart (converse.py).

Covers intent routing (including word-boundary traps like this/hi and
great/eat), per-character voice overrides with shared fallback,
deterministic seeded replies, stat-aware answers, deflection on unknown
input, hostile-input safety, and the talk/converse CLI path.

Run: python3 -m unittest pet.tests.test_converse -v
"""

import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


class TestIntentRouting(unittest.TestCase):
    def test_every_documented_intent_routes(self):
        from pet.pet_core.converse import parse_intent
        cases = {
            "hello there": "greeting",
            "what is your name?": "name",
            "how are you?": "mood",
            "are you hungry?": "hunger",
            "go to sleep": "sleep",
            "take a nap": "sleep",
            "are you sleepy?": "energy",
            "I love you": "affection",
            "tell me a joke": "joke",
            "I am sad": "comfort",
            "please feed you?": "feed",
            "wake up!": "wake",
            "play with me": "play",
            "what time is it?": "time",
            "help me": "help",
        }
        for text, want in cases.items():
            self.assertEqual(parse_intent(text), want, repr(text))

    def test_word_boundaries_reject_substring_traps(self):
        from pet.pet_core.converse import parse_intent
        for text in ("look at this", "you are great", "while you were out",
                     "what are you doing?", "a snap of cold"):
            self.assertIsNone(parse_intent(text), repr(text))

    def test_ordering_tiebreaks(self):
        from pet.pet_core.converse import parse_intent
        # Hunger beats the generic mood probe on shared "are you" phrasing.
        self.assertEqual(parse_intent("are you hungry?"), "hunger")
        # Sleep phrases beat energy drowsiness words.
        self.assertEqual(parse_intent("go to sleep now"), "sleep")
        # "let's play" normalises through the apostrophe.
        self.assertEqual(parse_intent("let's play"), "play")

    def test_hostile_inputs_parse_to_none(self):
        from pet.pet_core.converse import parse_intent
        for bad in ("", "   ", None, 123, 4.5, ["hi"], float("nan")):
            self.assertIsNone(parse_intent(bad))


class TestVoicesAndDeterminism(unittest.TestCase):
    def test_character_overrides_differ_from_shared(self):
        from pet.pet_core.converse import Converser
        rusty = Converser(character_id="rusty", name="R", seed=5)
        pip = Converser(character_id="pip", name="R", seed=5)
        rusty_joke, _ = rusty.reply("tell me a joke")
        pip_joke, _ = pip.reply("tell me a joke")
        self.assertNotEqual(rusty_joke, pip_joke)
        self.assertIn("Beep", rusty_joke)

    def test_missing_override_falls_back_to_shared(self):
        from pet.pet_core.converse import Converser
        # Luna ships no joke override, so she tells the shared joke pool.
        luna = Converser(character_id="luna", name="L", seed=5)
        pip = Converser(character_id="pip", name="L", seed=5)
        self.assertEqual(luna.reply("tell me a joke")[0],
                         pip.reply("tell me a joke")[0])

    def test_same_seed_replays_same_conversation(self):
        from pet.pet_core.converse import Converser

        def run():
            talker = Converser(character_id="kiki", name="K", seed=11)
            return [talker.reply(t)[0] for t in
                    ("hello", "tell me a joke", "how are you?",
                     "blorple wibble", "tell me a joke")]

        self.assertEqual(run(), run())

    def test_no_repeat_until_exhausted_per_character(self):
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="bramble", name="B", seed=2)
        seen = {talker.reply("tell me a joke")[0] for _ in range(3)}
        # Bramble ships exactly 3 joke lines: one full cycle, no repeats.
        self.assertEqual(len(seen), 3)

    def test_unknown_character_falls_back_to_pip(self):
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="nope", name="N", seed=1)
        self.assertEqual(talker.character_id, "pip")

    def test_stat_aware_answers(self):
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="pip", name="P", seed=1)
        starving, _ = talker.reply("are you hungry?", hunger=90.0)
        full, _ = talker.reply("are you hungry?", hunger=5.0)
        self.assertNotEqual(starving, full)
        self.assertIn("hungry", starving.lower())
        tired, _ = talker.reply("how tired are you?", energy=5.0)
        rested, _ = talker.reply("how tired are you?", energy=95.0)
        self.assertNotEqual(tired, rested)
        morning, _ = talker.reply("what time is it?", hour=8.5)
        night, _ = talker.reply("what time is it?", hour=23.5)
        self.assertIn("08:30", morning)
        self.assertIn("23:30", night)
        self.assertIn("morning", morning)
        self.assertIn("night", night)
        timeless, _ = talker.reply("what time is it?", hour=None)
        self.assertTrue(timeless)

    def test_mood_answer_reflects_live_mood(self):
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="pip", name="P", seed=1)
        sleepy, hint = talker.reply("how are you?", mood="sleepy")
        self.assertIn("sleepy", sleepy.lower())
        self.assertIsNone(hint)
        grumpy, _ = talker.reply("how are you?", mood="grumpy")
        self.assertNotEqual(sleepy, grumpy)

    def test_deflection_never_silent(self):
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="mochi", name="M", seed=4)
        for text in ("blorple wibble", "quantum xyzzy 123"):
            reply, hint = talker.reply(text)
            self.assertTrue(reply.strip())
            self.assertNotIn("{name}", reply)
            self.assertEqual(hint, "curious")

    def test_hostile_replies_fail_closed(self):
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="pip", name="P", seed=1)
        for bad in ("", "   ", None, 123, ["hi"], float("nan")):
            try:
                reply, _hint = talker.reply(bad)
            except Exception as exc:  # pragma: no cover
                self.fail("reply raised on %r: %r" % (bad, exc))
            self.assertTrue(reply.strip())
        # Hostile stats never leak into output either.
        reply, _ = talker.reply("how are you?", mood="zzz",
                                hunger="junk", energy=float("nan"))
        self.assertTrue(reply.strip())
        self.assertNotIn("{", reply)

    def test_no_unfilled_slots_in_any_pool(self):
        from pet.pet_core.converse import (
            CHARACTER_REPLIES, Converser, INTENT_IDS, SHARED_REPLIES)
        for intent in INTENT_IDS:
            self.assertTrue(SHARED_REPLIES[intent],
                            "shared pool %s is empty" % intent)
            for line in SHARED_REPLIES[intent]:
                self.assertNotIn("  ", line)
        for char, voice in CHARACTER_REPLIES.items():
            for intent, pool in voice.items():
                self.assertIn(intent, INTENT_IDS,
                              "%s overrides unknown intent %s" % (char, intent))
                self.assertGreaterEqual(
                    len(pool), 3,
                    "%s:%s pool too small for bag cycling" % (char, intent))


class TestControllerTalkWiring(unittest.TestCase):
    def make(self, character="pip", seed=7):
        from pet.pet_app.controller import WindowController
        from pet.pet_core.brain import Brain
        app = WindowController(brain=Brain(seed=seed))
        if character != "pip":
            app.switch_character(character)
        return app

    def test_talk_answers_in_bubble(self):
        app = self.make()
        reply = app.talk("tell me a joke", now=100.0)
        self.assertTrue(reply)
        self.assertEqual(app.bubble.text, reply)

    def test_talk_uses_live_character_voice(self):
        app = self.make(character="rusty")
        reply = app.talk("tell me a joke", now=100.0)
        self.assertIn("Beep", reply)

    def test_talk_follows_hot_swap(self):
        app = self.make()
        before = app.talk("tell me a joke", now=100.0)
        app.switch_character("rusty")
        after = app.talk("tell me a joke", now=101.0)
        self.assertNotEqual(before, after)
        self.assertIn("Beep", after)

    def test_talk_hostile_is_gentle_prompt(self):
        app = self.make()
        for bad in ("", None, 123):
            reply = app.talk(bad, now=100.0)
            self.assertTrue(reply)

    def test_talk_respects_dialogue_toggle(self):
        from pet.pet_app import settings as settings_mod
        app = self.make()
        app.apply_settings(settings_mod.with_field(
            app.settings, "dialogue", False))
        self.assertEqual(app.talk("hello", now=100.0), "")
        self.assertFalse(app.bubble.visible)


class TestTalkCli(unittest.TestCase):
    def run_cli(self, *argv):
        with tempfile.TemporaryDirectory() as tmp:
            env = dict(os.environ)
            env["DESKTOP_PET_DATA_DIR"] = tmp
            proc = subprocess.run(
                [sys.executable, "-m", "pet"] + list(argv),
                cwd=ROOT, capture_output=True, text=True,
                env=env, timeout=60)
            return proc

    def test_talk_answers(self):
        proc = self.run_cli("talk", "tell me a joke", "--seed", "5")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn(":", proc.stdout)
        self.assertGreater(len(proc.stdout.strip()), 10)

    def test_talk_alias_converse(self):
        proc = self.run_cli("converse", "hello", "--seed", "5")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertTrue(proc.stdout.strip())

    def test_talk_deterministic_with_seed(self):
        first = self.run_cli("talk", "hello", "--seed", "9").stdout
        second = self.run_cli("talk", "hello", "--seed", "9").stdout
        self.assertEqual(first, second)

    def test_talk_character_flag(self):
        proc = self.run_cli("talk", "tell me a joke", "--character",
                            "rusty", "--seed", "5")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("Beep", proc.stdout)

    def test_talk_needs_words(self):
        proc = self.run_cli("talk")
        self.assertEqual(proc.returncode, 2)

    def test_talk_blank_is_usage_error(self):
        proc = self.run_cli("talk", "   ")
        self.assertEqual(proc.returncode, 2)


if __name__ == "__main__":
    unittest.main()
