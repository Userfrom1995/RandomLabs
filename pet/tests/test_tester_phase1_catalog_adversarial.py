"""Tester Phase 1 adversarial regression: catalog core hostile paths (Refs #504).

Drives the real shipped entrypoint (`python -m pet characters ...`,
`python -m pet run ...`) plus fail-closed persistence, migration, and
voice-resolution invariants. Every assertion was verified live before
commit; hostile inputs must fall back to Pip with a notice, never a
traceback.
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


class TestCatalogHostileFallback(unittest.TestCase):
    def test_case_and_whitespace_normalize_without_notice(self):
        from pet.pet_core import catalog as catalog_mod
        for raw, expect in (("  BRAMBLE ", "bramble"), ("MoChI", "mochi"),
                            ("pip\n", "pip"), ("  KIKI  ", "kiki")):
            record, notice = catalog_mod.get(raw)
            self.assertEqual(record["id"], expect)
            self.assertIsNone(notice, "known id %r should be silent" % (raw,))

    def test_empty_nonstr_unknown_fall_back_with_notice(self):
        from pet.pet_core import catalog as catalog_mod
        for bad in ("", "   ", None, 123, "starship", "no-such-pet"):
            record, notice = catalog_mod.get(bad)
            self.assertEqual(record["id"], "pip")
            self.assertTrue(notice, "id %r must warn" % (bad,))

    def test_builtin_wins_pack_collision(self):
        from pet.pet_core import catalog as catalog_mod
        extra = {"pip": {"id": "pip", "name": "Evil",
                         "body_plan": "blob",
                         "palette": {"body": "#FFFFFF"}}}
        record, _ = catalog_mod.get("pip", extra=extra)
        self.assertEqual(record["name"], "Pip")
        listed = catalog_mod.list_characters(extra=extra)
        self.assertEqual(len(listed), 6)

    def test_invalid_pack_record_falls_back_with_notice(self):
        from pet.pet_core import catalog as catalog_mod
        extra = {"mypet": {"id": "mypet", "name": "X",
                           "body_plan": "starship",
                           "palette": {"body": "#FFFFFF"}}}
        record, notice = catalog_mod.get("mypet", extra=extra)
        self.assertEqual(record["id"], "pip")
        self.assertTrue(notice and "invalid" in notice)

    def test_traits_normalize_nonstr_falls_back(self):
        from pet.pet_core import traits as traits_mod
        self.assertEqual(traits_mod.normalize_id(None), "pip")
        self.assertEqual(traits_mod.normalize_id(42), "pip")
        self.assertEqual(traits_mod.rates_for(None)["walk_speed"], 36.0)


class TestSwitchCliHostile(unittest.TestCase):
    def test_switch_unknown_prints_notice_and_persists_pip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            proc = run_pet("characters", "switch", "starship",
                           "--save", path)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("unknown character", proc.stdout)
            self.assertIn("Pip", proc.stdout)
            with open(path, encoding="utf-8") as handle:
                self.assertEqual(json.load(handle)["character_id"], "pip")

    def test_switch_case_insensitive_persists(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            proc = run_pet("characters", "switch", "  KIKI  ",
                           "--save", path)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(path, encoding="utf-8") as handle:
                self.assertEqual(json.load(handle)["character_id"], "kiki")

    def test_switch_preserves_stats_no_reset(self):
        from pet.pet_core import persistence as persist_mod
        from pet.pet_core.state import PetState
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            state = PetState(character_id="pip", hunger=61.5, energy=33.0)
            persist_mod.save(state, path)
            proc = run_pet("characters", "switch", "luna", "--save", path)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            state2, _ = persist_mod.load(path)
            self.assertEqual(state2.character_id, "luna")
            self.assertAlmostEqual(state2.hunger, 61.5, places=5)
            self.assertAlmostEqual(state2.energy, 33.0, places=5)

    def test_show_unknown_prints_notice_not_traceback(self):
        proc = run_pet("characters", "show", "starship")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("unknown character", proc.stdout)
        self.assertIn("Pip", proc.stdout)
        self.assertNotIn("Traceback", proc.stdout + proc.stderr)


class TestPersistenceAndMigrationHostile(unittest.TestCase):
    def test_corrupt_save_fails_closed_with_backup(self):
        from pet.pet_core import persistence as persist_mod
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("{not json!!!")
            state, notice = persist_mod.load(path)
            self.assertEqual(state.character_id, "pip")
            self.assertTrue(notice and "corrupt" in notice)
            self.assertTrue(os.path.exists(path + ".bak"))

    def test_v1_migration_notice_names_character(self):
        from pet.pet_core import persistence as persist_mod
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump({"schema_version": 1, "name": "Old",
                           "activity": "idle"}, handle)
            state, notice = persist_mod.load(path)
            self.assertEqual(state.character_id, "pip")
            self.assertEqual(state.schema_version, 2)
            self.assertTrue(notice and "pip" in notice)

    def test_run_headless_happy_path_per_character(self):
        # Real entrypoint: headless brain run must exit 0 for a
        # non-default character save without touching the real profile.
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            sw = run_pet("characters", "switch", "bramble", "--save", path)
            self.assertEqual(sw.returncode, 0, sw.stderr)
            proc = run_pet("run", "--ticks", "30", "--seed", "7",
                           "--save", path)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("done after 30 ticks", proc.stdout)


class TestVoiceResolutionReal(unittest.TestCase):
    def test_pool_sizes_match_active_voice_pools(self):
        from pet.pet_core.personality import Personality
        voice = Personality(name="T", seed=1, character_id="bramble")
        sizes = voice.pool_sizes()
        self.assertEqual(sizes["happy"],
                         len(voice._pool_for("mood", "happy")))
        self.assertEqual(sizes["happy"], 4)
        pip = Personality(name="T", seed=1, character_id="pip")
        self.assertEqual(pip.pool_sizes()["happy"], 5)

    def test_missing_voice_key_falls_back_and_renders(self):
        from pet.pet_core.personality import Personality
        voice = Personality(name="B", seed=3, character_id="bramble")
        line = voice.line_for("sleepy")
        self.assertTrue(isinstance(line, str) and line.strip())

    def test_seeded_sequences_deterministic_per_character(self):
        from pet.pet_core.personality import Personality
        for cid in ("pip", "bramble", "mochi", "kiki", "rusty", "luna"):
            left = Personality(name="L", seed=42, character_id=cid)
            right = Personality(name="L", seed=42, character_id=cid)
            self.assertEqual([left.line_for("happy") for _ in range(6)],
                             [right.line_for("happy") for _ in range(6)])


if __name__ == "__main__":
    unittest.main()
