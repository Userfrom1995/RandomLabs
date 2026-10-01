"""Tester eval-repair regression: Evaluator 8.3/10 blocks (Refs #504).

Locks in the five surgical fixes the Quality Council required after the
first approve-test: v2 unknown-id notice, characters-list corrupt notice,
exact walk-speed table, full voice-override distinctness, and docs coverage
for the characters CLI. Every case verified live against the real entrypoint.
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


class TestV2UnknownIdNotice(unittest.TestCase):
    def test_v2_unknown_character_id_emits_notice(self):
        from pet.pet_core import persistence as persist_mod
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump({"schema_version": 2, "name": "X",
                           "activity": "idle",
                           "character_id": "ZzzUnknown"}, handle)
            state, notice = persist_mod.load(path)
            self.assertEqual(state.character_id, "pip")
            self.assertTrue(notice and "unknown character" in notice,
                            "v2 unknown id must warn, got %r" % (notice,))
            self.assertIn("ZzzUnknown", notice)

    def test_v2_nonstr_character_id_emits_notice(self):
        from pet.pet_core import persistence as persist_mod
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump({"schema_version": 2, "name": "X",
                           "activity": "idle", "character_id": 42}, handle)
            state, notice = persist_mod.load(path)
            self.assertEqual(state.character_id, "pip")
            self.assertTrue(notice and "unknown character" in notice)

    def test_list_surfaces_v2_unknown_notice(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump({"schema_version": 2, "name": "X",
                           "activity": "idle",
                           "character_id": "ZzzUnknown"}, handle)
            proc = run_pet("characters", "list", "--save", path)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("unknown character", proc.stdout)
            self.assertNotIn("Traceback", proc.stdout + proc.stderr)


class TestListCorruptNotice(unittest.TestCase):
    def test_list_surfaces_corrupt_notice_and_writes_bak(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pet.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("{not json!!!")
            proc = run_pet("characters", "list", "--save", path)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("corrupt", proc.stdout)
            self.assertTrue(os.path.exists(path + ".bak"),
                            "corrupt save must leave a .bak backup")
            self.assertNotIn("Traceback", proc.stdout + proc.stderr)


class TestExactSpeedsAndVoices(unittest.TestCase):
    def test_walk_speeds_are_exact_table_values(self):
        from pet.pet_core import traits as traits_mod
        expected = {"pip": 36.0, "bramble": 57.6, "mochi": 18.0,
                    "kiki": 50.4, "rusty": 32.4, "luna": 39.6}
        for cid, speed in expected.items():
            self.assertAlmostEqual(traits_mod.walk_speed_for(cid), speed,
                                   msg="%s walk speed" % cid)

    def test_every_override_pool_differs_from_shared(self):
        from pet.pet_core.personality import (CHARACTER_VOICES, EVENT_LINES,
                                              MOOD_LINES)
        shared = {}
        for key in MOOD_LINES:
            shared["mood:" + key] = set(MOOD_LINES[key])
        for key in EVENT_LINES:
            shared["event:" + key] = set(EVENT_LINES[key])
        for cid in ("bramble", "mochi", "kiki", "rusty", "luna"):
            overrides = CHARACTER_VOICES[cid]
            self.assertTrue(overrides)
            for key, own in sorted(overrides.items()):
                self.assertIn(key, shared)
                self.assertGreaterEqual(len(own), 3)
                self.assertNotEqual(set(own), shared[key],
                                    "%s %s must differ from Pip" % (cid, key))


class TestCharactersDocs(unittest.TestCase):
    def test_docs_cover_characters_cli(self):
        docs = os.path.join(ROOT, "pet", "docs", "index.md")
        with open(docs, encoding="utf-8") as handle:
            text = handle.read()
        self.assertIn("characters", text,
                      "docs/index.md must document the characters CLI")
        for token in ("list", "show", "switch"):
            self.assertIn(token, text,
                          "docs/index.md must document %r" % token)
        # The command reference must carry a characters entry with all
        # three subcommands in one place (e.g. "characters (list|show|switch)").
        ref_start = text.find("## Command reference")
        ref = text[ref_start:] if ref_start >= 0 else text
        self.assertIn("characters", ref)
        char_lines = [ln for ln in ref.splitlines() if "character" in ln]
        self.assertTrue(char_lines, "command reference needs a characters line")
        blob = " ".join(char_lines)
        for token in ("list", "show", "switch"):
            self.assertIn(token, blob)

    def test_readme_layout_covers_catalog_and_traits(self):
        readme = os.path.join(ROOT, "pet", "README.md")
        with open(readme, encoding="utf-8") as handle:
            text = handle.read()
        for token in ("catalog.py", "traits.py", "characters"):
            self.assertIn(token, text,
                          "README must mention %r" % token)


if __name__ == "__main__":
    unittest.main()
