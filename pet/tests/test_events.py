"""Headless tests for living moments (events.py) and interaction modifiers.

Covers the morning/night greetings (including boot-inside-window),
idle antics with per-character pacing, affection milestones with
re-arm, post-meal contentment delivery, seeded determinism,
hostile-input safety, the trait modifier table (Pip matches shipped
constants exactly), and controller wiring (stroke/catch/munch/radius).

Run: python3 -m unittest pet.tests.test_events -v
"""

import unittest


class TestMorningAndNight(unittest.TestCase):
    def test_morning_greeting_on_window_entry(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="pip", name="P", seed=1)
        self.assertEqual(bus.poll(hour=5.0, now=100.0), [])
        moments = bus.poll(hour=7.0, now=101.0)
        self.assertEqual([m.kind for m in moments], ["morning"])
        self.assertTrue(moments[0].text)
        # Still morning: no repeat greeting.
        self.assertEqual(
            [m.kind for m in bus.poll(hour=8.0, now=102.0)], [])
        # Leaving and re-entering re-arms.
        bus.poll(hour=12.0, now=103.0)
        self.assertEqual(
            [m.kind for m in bus.poll(hour=7.5, now=104.0)], ["morning"])

    def test_boot_inside_morning_still_greets(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="pip", name="P", seed=1)
        moments = bus.poll(hour=8.0, now=100.0)
        self.assertEqual([m.kind for m in moments], ["morning"])

    def test_night_drowsiness_on_entry(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="luna", name="L", seed=1)
        self.assertEqual(bus.poll(hour=20.0, now=100.0), [])
        moments = bus.poll(hour=23.0, now=101.0)
        self.assertEqual([m.kind for m in moments], ["night"])
        self.assertEqual(moments[0].mood, "sleepy")
        # Overnight wrap still counts as night (no double fire).
        self.assertEqual(
            [m.kind for m in bus.poll(hour=1.0, now=102.0)], [])

    def test_no_clock_means_no_daypart_moments(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="pip", name="P", seed=1)
        for bad_hour in (None, "junk", float("nan")):
            self.assertEqual(bus.poll(hour=bad_hour, now=100.0), [])


class TestIdleAntics(unittest.TestCase):
    def test_antics_paced_per_character(self):
        from pet.pet_core.events import LifeEvents
        kiki = LifeEvents(character_id="kiki", name="K", seed=3)
        rusty = LifeEvents(character_id="rusty", name="R", seed=3)
        # 60 s of silence: Kiki (45 s interval) improvises, Rusty
        # (180 s interval) stays quiet.
        kiki.poll(hour=12.0, now=100.0)
        rusty.poll(hour=12.0, now=100.0)
        kiki_kinds = [m.kind for m in kiki.poll(hour=12.0, now=160.0)]
        rusty_kinds = [m.kind for m in rusty.poll(hour=12.0, now=160.0)]
        self.assertIn("idle_antic", kiki_kinds)
        self.assertNotIn("idle_antic", rusty_kinds)

    def test_interaction_resets_idle_clock(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="kiki", name="K", seed=3)
        bus.poll(hour=12.0, now=100.0)
        bus.notify_interaction(150.0)
        self.assertNotIn("idle_antic", [
            m.kind for m in bus.poll(hour=12.0, now=160.0)])
        self.assertIn("idle_antic", [
            m.kind for m in bus.poll(hour=12.0, now=300.0)])

    def test_antic_carries_character_opener(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="bramble", name="B", seed=3)
        bus.poll(hour=12.0, now=100.0)
        moments = bus.poll(hour=12.0, now=300.0)
        antics = [m for m in moments if m.kind == "idle_antic"]
        self.assertEqual(len(antics), 1)
        self.assertTrue(antics[0].text.startswith("Zoomies check! "))

    def test_no_antics_while_sleeping_or_playing(self):
        from pet.pet_core.events import LifeEvents
        for activity in ("sleep", "play", "react", "munch", "carried"):
            bus = LifeEvents(character_id="kiki", name="K", seed=3)
            bus.poll(hour=12.0, now=100.0, activity=activity)
            kinds = [m.kind for m in bus.poll(
                hour=12.0, now=1000.0, activity=activity)]
            self.assertNotIn("idle_antic", kinds, activity)


class TestMilestonesAndContentment(unittest.TestCase):
    def test_milestone_fires_once_per_crossing(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="bramble", name="B", seed=1)
        first = bus.poll(affection=85.0, hour=12.0, now=100.0)
        self.assertEqual([m.kind for m in first], ["milestone"])
        self.assertIn("B", first[0].text)
        self.assertEqual(bus.poll(affection=90.0, hour=12.0, now=101.0),
                         [])
        # Dropping below re-arm fires again on the next crossing.
        bus.poll(affection=60.0, hour=12.0, now=102.0)
        refired = bus.poll(affection=85.0, hour=12.0, now=103.0)
        self.assertEqual([m.kind for m in refired], ["milestone"])

    def test_milestone_voice_differs_per_character(self):
        from pet.pet_core.events import LifeEvents
        texts = set()
        for char in ("pip", "bramble", "mochi", "kiki", "rusty", "luna"):
            bus = LifeEvents(character_id=char, name="N", seed=1)
            moments = bus.poll(affection=95.0, hour=12.0, now=100.0)
            self.assertEqual(len(moments), 1)
            texts.add(moments[0].text)
        self.assertEqual(len(texts), 6)

    def test_contentment_after_meal(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="pip", name="P", seed=1)
        bus.notify_fed(100.0)
        moments = bus.poll(affection=60.0, hour=12.0, now=120.0)
        self.assertEqual([m.kind for m in moments], ["content"])
        # Delivered once, and expires past the window.
        self.assertEqual(bus.poll(affection=60.0, hour=12.0, now=130.0),
                         [])
        bus.notify_fed(1000.0)
        self.assertEqual(
            bus.poll(affection=60.0, hour=12.0, now=1061.0,
                     activity="idle"), [])

    def test_no_content_while_asleep(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="pip", name="P", seed=1)
        bus.notify_fed(100.0)
        self.assertEqual(
            bus.poll(affection=60.0, hour=12.0, now=110.0,
                     activity="sleep"), [])

    def test_determinism(self):
        from pet.pet_core.events import LifeEvents

        def run():
            bus = LifeEvents(character_id="kiki", name="K", seed=8)
            out = []
            for step in range(20):
                out.extend((m.kind, m.text) for m in bus.poll(
                    affection=50.0 + step * 2.0, hour=7.0 + step * 0.5,
                    now=100.0 + step * 30.0))
            return out

        self.assertEqual(run(), run())

    def test_hostile_inputs_never_raise(self):
        from pet.pet_core.events import LifeEvents
        bus = LifeEvents(character_id="pip", name="P", seed=1)
        for bad in ({"hour": "junk", "now": 100.0},
                    {"hour": 12.0, "now": float("nan")},
                    {"hour": None, "now": "junk"},
                    {"hour": 12.0, "now": -5.0,
                     "affection": "lots", "activity": None}):
            try:
                bus.poll(mood="curious", hunger=20.0, energy=80.0,
                         affection=bad.get("affection", 60.0),
                         activity=bad.get("activity", "idle"),
                         hour=bad["hour"], now=bad["now"])
            except Exception as exc:  # pragma: no cover
                self.fail("poll raised: %r" % (exc,))
        for bad_now in (float("nan"), "junk", None.__class__):
            try:
                bus.notify_interaction(bad_now)
                bus.notify_fed(bad_now)
            except Exception as exc:  # pragma: no cover
                self.fail("notify raised: %r" % (exc,))
        self.assertEqual(bus.set_character("nope"), "pip")
        self.assertEqual(bus.character_id, "pip")


class TestInteractionModifiers(unittest.TestCase):
    def test_pip_matches_shipped_constants(self):
        from pet.pet_app.interact import (
            BALL_CATCH_RADIUS, MUNCH_SEC, STROKE_NUDGE)
        from pet.pet_core import traits as traits_mod
        pip = traits_mod.interaction_for("pip")
        self.assertEqual(pip["stroke_gain"], STROKE_NUDGE)
        self.assertEqual(pip["stroke_full_gain"], 8.0)
        self.assertEqual(pip["catch_gain"], 3.0)
        self.assertEqual(pip["catch_radius_mult"], 1.0)
        self.assertEqual(pip["munch_sec"], MUNCH_SEC)
        self.assertEqual(pip["feed_mult"], 1.0)

    def test_every_character_has_full_modifier_record(self):
        from pet.pet_core import traits as traits_mod
        keys = ("stroke_gain", "stroke_full_gain", "catch_gain",
                "catch_radius_mult", "munch_sec", "feed_mult",
                "antic_interval_sec")
        for char in ("pip", "bramble", "mochi", "kiki", "rusty", "luna"):
            record = traits_mod.interaction_for(char)
            for key in keys:
                self.assertIn(key, record, "%s misses %s" % (char, key))
                self.assertTrue(record[key] > 0.0 or key == "feed_mult",
                                "%s:%s not positive" % (char, key))
        self.assertEqual(traits_mod.interaction_for("nope"),
                         traits_mod.interaction_for("pip"))

    def test_characters_differ_where_advertised(self):
        from pet.pet_core import traits as traits_mod
        mods = {c: traits_mod.interaction_for(c) for c in
                ("pip", "bramble", "mochi", "kiki", "rusty", "luna")}
        # Mochi purrs longer, Bramble scores a wider catch, Rusty snacks
        # barely register, Kiki chatters fastest.
        self.assertGreater(mods["mochi"]["munch_sec"], mods["pip"]["munch_sec"])
        self.assertGreater(mods["bramble"]["catch_radius_mult"],
                           mods["pip"]["catch_radius_mult"])
        self.assertLess(mods["rusty"]["feed_mult"], mods["pip"]["feed_mult"])
        self.assertLess(mods["kiki"]["antic_interval_sec"],
                       mods["pip"]["antic_interval_sec"])

    def test_brain_uses_modifiers(self):
        from pet.pet_core.brain import Brain
        from pet.pet_core.state import PetState
        mochi = Brain(state=PetState(character_id="mochi"), seed=1)
        mochi.state.affection = 40.0
        mochi.stroke()
        self.assertAlmostEqual(mochi.state.affection, 50.0)
        mochi.state.hunger = 80.0
        mochi.feed_pet(20.0)
        # 20 * 1.25 feed multiplier restores 25.
        self.assertAlmostEqual(mochi.state.hunger, 55.0)
        rusty = Brain(state=PetState(character_id="rusty"), seed=1)
        rusty.state.hunger = 80.0
        rusty.feed_pet(20.0)
        self.assertAlmostEqual(rusty.state.hunger, 64.0)

    def test_controller_wiring(self):
        from pet.pet_app.controller import WindowController
        from pet.pet_app.interact import BALL_CATCH_RADIUS
        from pet.pet_core.brain import Brain
        app = WindowController(brain=Brain(seed=7))
        app.switch_character("mochi")
        before = app.brain.state.affection
        app.handle_gesture("click", now=100.0)
        self.assertAlmostEqual(app.brain.state.affection, before + 3.0)
        app.run_menu_action("feed", now=200.0)
        self.assertAlmostEqual(app.munch.duration, 4.5)
        app.run_menu_action("play", now=300.0)
        self.assertAlmostEqual(app.game.catch_radius,
                               BALL_CATCH_RADIUS * 0.85)
        pip_app = WindowController(brain=Brain(seed=7))
        pip_app.run_menu_action("play", now=300.0)
        self.assertAlmostEqual(pip_app.game.catch_radius, BALL_CATCH_RADIUS)

    def test_ball_radius_setter_fails_closed(self):
        from pet.pet_app.interact import BALL_CATCH_RADIUS, BallGame
        game = BallGame(seed=1)
        for bad in ("junk", -2.0, float("nan"), None, 0.0):
            game.set_catch_radius(bad)
            self.assertAlmostEqual(game.catch_radius, BALL_CATCH_RADIUS)
        game.set_catch_radius(1.3)
        self.assertAlmostEqual(game.catch_radius, BALL_CATCH_RADIUS * 1.3)
        game.set_catch_radius(99.0)  # clamped to 2x for fair rallies
        self.assertAlmostEqual(game.catch_radius, BALL_CATCH_RADIUS * 2.0)

    def test_controller_moments_wire_into_tick(self):
        from pet.pet_app.controller import WindowController
        from pet.pet_core.brain import Brain
        app = WindowController(brain=Brain(seed=7),
                               clock=lambda: 8.0)
        app.tick(0.1, now=100.0)
        # Booting mid-morning voices the greeting through the bubble.
        self.assertTrue(app.bubble.visible)
        self.assertTrue(app.bubble.text)


if __name__ == "__main__":
    unittest.main()
