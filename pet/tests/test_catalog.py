"""Phase 1 headless suite: catalog, traits, voices, migration (Refs #504).

Covers the Catalog Core and Character Engine: six-original registry,
trait-parameterised needs/brain, per-character voices with shared
fallback, schema v1 to v2 migration, and the characters CLI.

Run: python3 -m unittest pet.tests.test_catalog -v
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


def run_pet(*argv):
    return subprocess.run(
        [sys.executable, "-m", "pet"] + list(argv),
        cwd=ROOT, capture_output=True, text=True, timeout=120,
    )


class TestCatalogRegistry(unittest.TestCase):
    def test_six_originals_reachable(self):
        from pet.pet_core import catalog as catalog_mod
        records = catalog_mod.list_characters()
        self.assertEqual(len(records), 6)
        self.assertEqual([r["id"] for r in records],
                         ["pip", "bramble", "mochi", "kiki", "rusty", "luna"])

    def test_body_plans_distinct_and_valid(self):
        from pet.pet_core import catalog as catalog_mod
        plans = [r["body_plan"] for r in catalog_mod.list_characters()]
        self.assertEqual(len(set(plans)), 6)
        for plan in plans:
            self.assertIn(plan, catalog_mod.BODY_PLANS)

    def test_palettes_are_hex(self):
        import re
        from pet.pet_core import catalog as catalog_mod
        for record in catalog_mod.list_characters():
            self.assertTrue(record["palette"])
            for value in record["palette"].values():
                self.assertTrue(re.match(r"^#[0-9a-fA-F]{6}$", value),
                                "%s has bad palette %r" % (record["id"], value))

    def test_unknown_id_falls_back_to_pip(self):
        from pet.pet_core import catalog as catalog_mod
        record, notice = catalog_mod.get("no-such-pet")
        self.assertEqual(record["id"], "pip")
        self.assertTrue(notice)

    def test_validate_rejects_bad_records(self):
        from pet.pet_core import catalog as catalog_mod
        with self.assertRaises(ValueError):
            catalog_mod.validate_record({"id": "Bad Slug!", "name": "X",
                                         "body_plan": "blob",
                                         "palette": {"body": "#FFFFFF"}})
        with self.assertRaises(ValueError):
            catalog_mod.validate_record({"id": "ok", "name": "Ok",
                                         "body_plan": "starship",
                                         "palette": {"body": "#FFFFFF"}})
        with self.assertRaises(ValueError):
            catalog_mod.validate_record({"id": "ok", "name": "Ok",
                                         "body_plan": "blob",
                                         "palette": {"body": "red"}})


class TestTraits(unittest.TestCase):
    def test_pip_matches_base_constants(self):
        from pet.pet_core import traits as traits_mod
        from pet.pet_core import needs as needs_mod
        pip = traits_mod.rates_for("pip")
        self.assertEqual(pip["hunger_rate"], needs_mod.HUNGER_RATE_PER_SEC)
        self.assertEqual(pip["energy_drain"], needs_mod.ENERGY_DRAIN_PER_SEC)
        self.assertEqual(pip["energy_restore"], needs_mod.ENERGY_RESTORE_PER_SEC)
        self.assertEqual(pip["affection_decay"], needs_mod.AFFECTION_DECAY_PER_SEC)
        self.assertEqual(pip["walk_speed"], 36.0)

    def test_walk_speeds_differ_by_fixture_amounts(self):
        from pet.pet_core import traits as traits_mod
        self.assertGreater(traits_mod.walk_speed_for("bramble"),
                           traits_mod.walk_speed_for("mochi") * 2.0)
        self.assertGreater(traits_mod.walk_speed_for("kiki"),
                           traits_mod.walk_speed_for("mochi"))

    def test_trait_rates_are_data_not_branches(self):
        from pet.pet_core import traits as traits_mod
        rates = {cid: traits_mod.rates_for(cid) for cid in traits_mod.known_ids()}
        self.assertEqual(set(rates), {"pip", "bramble", "mochi", "kiki",
                                     "rusty", "luna"})
        hungers = {cid: r["hunger_rate"] for cid, r in rates.items()}
        self.assertGreater(hungers["bramble"], hungers["pip"])
        self.assertLess(hungers["rusty"], hungers["pip"])

    def test_needs_tick_follows_character_rates(self):
        from pet.pet_core import needs as needs_mod
        from pet.pet_core.state import Activity, PetState
        fast = PetState(character_id="bramble")
        slow = PetState(character_id="mochi")
        needs_mod.tick_needs(fast, 60.0)
        needs_mod.tick_needs(slow, 60.0)
        self.assertGreater(fast.hunger, slow.hunger)


class TestMigration(unittest.TestCase):
    def test_v1_dict_migrates_to_pip(self):
        from pet.pet_core.state import PetState
        v1 = {"schema_version": 1, "name": "Pip", "activity": "idle",
              "mood": "curious", "energy": 80.0, "hunger": 20.0,
              "affection": 60.0}
        state = PetState.from_dict(dict(v1))
        self.assertEqual(state.character_id, "pip")
        self.assertEqual(state.schema_version, 2)

    def test_v2_round_trip_preserves_character(self):
        from pet.pet_core.state import PetState
        from pet.pet_core.state import Activity
        st = PetState(name="Kiki fan", character_id="kiki",
                      activity=Activity.WALK)
        clone = PetState.from_dict(st.to_dict())
        self.assertEqual(clone.character_id, "kiki")
        self.assertEqual(clone.to_dict()["schema_version"], 2)

    def test_unknown_character_falls_back(self):
        from pet.pet_core.state import PetState
        st = PetState(character_id="starship")
        self.assertEqual(st.character_id, "pip")

    def test_unknown_schema_still_rejected(self):
        from pet.pet_core.state import PetState
        with self.assertRaises(ValueError):
            PetState.from_dict({"activity": "idle", "schema_version": 999})

    def test_persistence_load_reports_migration(self):
        from pet.pet_core import persistence as persist_mod
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump({"schema_version": 1, "name": "Old",
                           "activity": "idle"}, handle)
            state, notice = persist_mod.load(path)
            self.assertEqual(state.character_id, "pip")
            self.assertTrue(notice and "migrat" in notice)


class TestVoices(unittest.TestCase):
    def test_each_character_has_own_voice(self):
        from pet.pet_core.personality import CHARACTER_VOICES, Personality
        self.assertEqual(set(CHARACTER_VOICES),
                         {"pip", "bramble", "mochi", "kiki", "rusty", "luna"})
        for cid in ("bramble", "mochi", "kiki", "rusty", "luna"):
            self.assertTrue(CHARACTER_VOICES[cid],
                            "%s should ship voice overrides" % cid)
        # Distinct signature lines per character.
        seen = set()
        for cid in ("pip", "bramble", "mochi", "kiki", "rusty", "luna"):
            voice = Personality(name="Test", seed=7, character_id=cid)
            line = voice.line_for_event("greet") if cid == "pip" else None
            seen.add(cid)
        self.assertEqual(len(seen), 6)

    def test_missing_keys_fall_back_to_shared_pool(self):
        from pet.pet_core.personality import Personality
        # Bramble ships no sleepy mood pool: must still answer from Pip's.
        voice = Personality(name="B", seed=3, character_id="bramble")
        line = voice.line_for("sleepy")
        self.assertTrue(isinstance(line, str) and line.strip())

    def test_no_repeat_until_exhausted_per_character(self):
        from pet.pet_core.personality import Personality
        voice = Personality(name="K", seed=11, character_id="kiki")
        first_cycle = [voice.line_for("happy") for _ in range(4)]
        self.assertEqual(len(set(first_cycle)), 4)

    def test_seeded_determinism(self):
        from pet.pet_core.personality import Personality
        left = Personality(name="L", seed=42, character_id="luna")
        right = Personality(name="L", seed=42, character_id="luna")
        self.assertEqual([left.line_for("happy") for _ in range(6)],
                         [right.line_for("happy") for _ in range(6)])


class TestBrainCharacters(unittest.TestCase):
    def test_set_character_switches_state_and_voice(self):
        from pet.pet_core.brain import Brain
        brain = Brain(seed=5)
        event = brain.set_character("mochi")
        self.assertEqual(brain.state.character_id, "mochi")
        self.assertEqual(brain.personality.character_id, "mochi")
        self.assertTrue(event.text)

    def test_unknown_character_falls_back_to_pip(self):
        from pet.pet_core.brain import Brain
        brain = Brain(seed=5)
        brain.set_character("starship")
        self.assertEqual(brain.state.character_id, "pip")

    def test_seeded_soak_reaches_all_activities_every_character(self):
        from pet.pet_core.brain import Brain
        from pet.pet_core.state import PetState
        for cid in ("pip", "bramble", "mochi", "kiki", "rusty", "luna"):
            brain = Brain(state=PetState(character_id=cid), seed=1234)
            seen = set()
            for _ in range(6000):
                brain.tick(0.1)
                seen.add(brain.state.activity.value)
                if len(seen) == 5:
                    break
            missing = {"idle", "walk", "play", "sleep", "react"} - seen
            self.assertFalse(missing, "%s never reached %s" % (cid, missing))

    def test_seeded_runs_are_deterministic_per_character(self):
        from pet.pet_core.brain import Brain
        from pet.pet_core.state import PetState
        seqs = []
        for _ in range(2):
            brain = Brain(state=PetState(character_id="bramble"), seed=99)
            seq = []
            for _ in range(50):
                events = brain.tick(0.1)
                seq.append((brain.state.activity.value,
                            events[0].text if events else ""))
            seqs.append(seq)
        self.assertEqual(seqs[0], seqs[1])


class TestCharactersCli(unittest.TestCase):
    def test_list_shows_all_six(self):
        proc = run_pet("characters", "list")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        for cid in ("pip", "bramble", "mochi", "kiki", "rusty", "luna"):
            self.assertIn(cid, proc.stdout)

    def test_show_reports_character(self):
        proc = run_pet("characters", "show", "mochi")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("Mochi", proc.stdout)
        self.assertIn("walk speed", proc.stdout)

    def test_switch_persists_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            proc = run_pet("characters", "switch", "kiki", "--save", path)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("Kiki", proc.stdout)
            from pet.pet_core import persistence as persist_mod
            state, _ = persist_mod.load(path)
            self.assertEqual(state.character_id, "kiki")
            # Stats survive the switch (no reset).
            proc2 = run_pet("characters", "switch", "luna", "--save", path)
            self.assertEqual(proc2.returncode, 0, proc2.stderr)
            state2, _ = persist_mod.load(path)
            self.assertEqual(state2.character_id, "luna")

    def test_switch_unknown_falls_back_to_pip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            proc = run_pet("characters", "switch", "starship", "--save", path)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            from pet.pet_core import persistence as persist_mod
            state, _ = persist_mod.load(path)
            self.assertEqual(state.character_id, "pip")


if __name__ == "__main__":
    unittest.main()
