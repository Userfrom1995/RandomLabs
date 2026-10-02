"""Headless tests for the creator-pack framework plus installer scripts.

Covers pack validation (good and hostile packs), install/list/show/
remove round trips, catalog merging with trait/voice/converse
activation, switch persistence for pack characters, and the
fail-closed installer recipes.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

from pet.pet_core import packs as packs_mod


EXAMPLE = os.path.join("pet", "packs", "examples", "sunny-pack")


def _write_pack(root, slug="test-pack", characters=None):
    os.makedirs(os.path.join(root, "characters"), exist_ok=True)
    manifest = {
        "slug": slug,
        "name": "Test Pack",
        "version": "1.0.0",
        "author": "tests",
        "description": "fixture",
    }
    with open(os.path.join(root, "pack.json"), "w",
              encoding="utf-8") as handle:
        json.dump(manifest, handle)
    if characters is None:
        characters = [_character("tess", body_plan="blob")]
    for record in characters:
        with open(os.path.join(root, "characters",
                               record["id"] + ".json"),
                  "w", encoding="utf-8") as handle:
            json.dump(record, handle)
    return root


def _character(cid, body_plan="blob", **over):
    record = {
        "id": cid,
        "name": cid.title(),
        "species": "testling",
        "body_plan": body_plan,
        "tagline": "a test friend",
        "signature": "Tess waves a test flag.",
        "palette": {"body": "#112233", "belly": "#FFEEDD",
                    "accent": "#445566"},
        "traits": {
            "hunger_rate": 0.15,
            "energy_drain": 0.10,
            "energy_restore": 0.33,
            "affection_decay": 0.08,
            "walk_speed": 40.0,
            "play_bonus": 0.01,
            "sleep_bonus": 0.0,
            "react_bonus": 0.0,
        },
        "dialogue": {
            "mood:happy": ["one %s" % cid, "two %s" % cid,
                           "three %s" % cid, "four %s" % cid],
            "event:greet": ["hi one", "hi two", "hi three"],
        },
    }
    record.update(over)
    return record


class PackTestBase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="pet-pack-test-")
        self.old_env = os.environ.get("DESKTOP_PET_DATA_DIR")
        os.environ["DESKTOP_PET_DATA_DIR"] = self.tmp
        packs_mod.clear_cache()
        from pet.pet_core import traits as traits_mod
        from pet.pet_core import personality as personality_mod
        from pet.pet_core import converse as converse_mod
        from pet.pet_core import state as state_mod
        self._saved = (
            dict(traits_mod.EXTRA_TRAITS),
            dict(personality_mod.EXTRA_VOICES),
            dict(converse_mod.EXTRA_REPLIES),
            set(state_mod.EXTRA_CHARACTERS),
        )

    def tearDown(self):
        from pet.pet_core import traits as traits_mod
        from pet.pet_core import personality as personality_mod
        from pet.pet_core import converse as converse_mod
        from pet.pet_core import state as state_mod
        traits_mod.EXTRA_TRAITS.clear()
        traits_mod.EXTRA_TRAITS.update(self._saved[0])
        personality_mod.EXTRA_VOICES.clear()
        personality_mod.EXTRA_VOICES.update(self._saved[1])
        converse_mod.EXTRA_REPLIES.clear()
        converse_mod.EXTRA_REPLIES.update(self._saved[2])
        state_mod.EXTRA_CHARACTERS.clear()
        state_mod.EXTRA_CHARACTERS.update(self._saved[3])
        packs_mod.clear_cache()
        if self.old_env is None:
            os.environ.pop("DESKTOP_PET_DATA_DIR", None)
        else:
            os.environ["DESKTOP_PET_DATA_DIR"] = self.old_env
        shutil.rmtree(self.tmp, ignore_errors=True)


class TestPackValidation(PackTestBase):
    def test_example_pack_validates(self):
        manifest, characters = packs_mod.validate(EXAMPLE)
        self.assertEqual(manifest["slug"], "sunny-pack")
        self.assertEqual({c["id"] for c in characters}, {"sunny", "ember"})

    def test_missing_manifest_rejected(self):
        empty = os.path.join(self.tmp, "empty-pack")
        os.makedirs(empty)
        with self.assertRaises(ValueError):
            packs_mod.validate(empty)

    def test_bad_slug_rejected(self):
        src = _write_pack(os.path.join(self.tmp, "src"))
        with open(os.path.join(src, "pack.json"), "w",
                  encoding="utf-8") as handle:
            json.dump({"slug": "Bad Slug!", "name": "x",
                       "version": "1.0.0"}, handle)
        with self.assertRaises(ValueError):
            packs_mod.validate(src)

    def test_bad_semver_rejected(self):
        src = _write_pack(os.path.join(self.tmp, "src"))
        with open(os.path.join(src, "pack.json"), "w",
                  encoding="utf-8") as handle:
            json.dump({"slug": "ok-pack", "name": "x",
                       "version": "soon"}, handle)
        with self.assertRaises(ValueError):
            packs_mod.validate(src)

    def test_engine_future_rejected(self):
        src = _write_pack(os.path.join(self.tmp, "src"))
        with open(os.path.join(src, "pack.json"), "w",
                  encoding="utf-8") as handle:
            json.dump({"slug": "ok-pack", "name": "x", "version": "1.0.0",
                       "engine_min": "99.0.0"}, handle)
        with self.assertRaises(ValueError):
            packs_mod.validate(src)

    def test_bad_body_plan_rejected(self):
        src = _write_pack(
            os.path.join(self.tmp, "src"),
            characters=[_character("tess", body_plan="dragon")])
        with self.assertRaises(ValueError):
            packs_mod.validate(src)

    def test_bad_palette_rejected(self):
        bad = _character("tess")
        bad["palette"] = {"body": "red", "belly": "#FFEEDD",
                          "accent": "#445566"}
        src = _write_pack(os.path.join(self.tmp, "src"), characters=[bad])
        with self.assertRaises(ValueError):
            packs_mod.validate(src)

    def test_thin_dialogue_pool_rejected(self):
        bad = _character("tess")
        bad["dialogue"] = {"mood:happy": ["only one"]}
        src = _write_pack(os.path.join(self.tmp, "src"), characters=[bad])
        with self.assertRaises(ValueError):
            packs_mod.validate(src)

    def test_unknown_dialogue_key_rejected(self):
        bad = _character("tess")
        bad["dialogue"] = {"mood:ecstatic": ["a", "b", "c"]}
        src = _write_pack(os.path.join(self.tmp, "src"), characters=[bad])
        with self.assertRaises(ValueError):
            packs_mod.validate(src)

    def test_out_of_range_trait_rejected(self):
        bad = _character("tess")
        bad["traits"] = dict(bad["traits"])
        bad["traits"]["walk_speed"] = 500.0
        src = _write_pack(os.path.join(self.tmp, "src"), characters=[bad])
        with self.assertRaises(ValueError):
            packs_mod.validate(src)

    def test_non_json_file_rejected(self):
        src = _write_pack(os.path.join(self.tmp, "src"))
        with open(os.path.join(src, "notes.txt"), "w") as handle:
            handle.write("not json")
        with self.assertRaises(ValueError):
            packs_mod.validate(src)

    def test_zip_traversal_rejected(self):
        evil = os.path.join(self.tmp, "evil.zip")
        with zipfile.ZipFile(evil, "w") as archive:
            archive.writestr("../../escape.json", "{}")
            archive.writestr("pack.json", json.dumps(
                {"slug": "evil", "name": "e", "version": "1.0.0"}))
        with self.assertRaises(ValueError):
            packs_mod.validate(evil)

    def test_install_rejects_invalid_pack(self):
        ok, note = packs_mod.install(os.path.join(self.tmp, "missing"))
        self.assertFalse(ok)
        self.assertIn("invalid pack", note)


class TestPackLifecycle(PackTestBase):
    def test_install_list_show_remove_round_trip(self):
        src = _write_pack(os.path.join(self.tmp, "src"))
        ok, _note = packs_mod.install(src)
        self.assertTrue(ok)
        packs = packs_mod.list_installed()
        self.assertEqual([p["slug"] for p in packs], ["test-pack"])
        detail, note = packs_mod.show("test-pack")
        self.assertIsNotNone(detail)
        self.assertIn("Test Pack", note)
        self.assertEqual(detail["characters"], ["tess"])
        ok, _note = packs_mod.remove("test-pack")
        self.assertTrue(ok)
        self.assertEqual(packs_mod.list_installed(), [])
        ok, _note = packs_mod.remove("test-pack")
        self.assertFalse(ok)

    def test_install_from_zip(self):
        src = _write_pack(os.path.join(self.tmp, "src"))
        archive = os.path.join(self.tmp, "pack.zip")
        with zipfile.ZipFile(archive, "w",
                             compression=zipfile.ZIP_DEFLATED) as bundle:
            for dirpath, _dirs, files in os.walk(src):
                for name in files:
                    full = os.path.join(dirpath, name)
                    bundle.write(full, os.path.relpath(full, src))
        ok, _note = packs_mod.install(archive)
        self.assertTrue(ok)
        self.assertEqual(
            [p["slug"] for p in packs_mod.list_installed()], ["test-pack"])

    def test_corrupt_pack_moved_aside_with_notice(self):
        src = _write_pack(os.path.join(self.tmp, "src"))
        ok, _note = packs_mod.install(src)
        self.assertTrue(ok)
        target = os.path.join(packs_mod.packs_dir(), "test-pack")
        with open(os.path.join(target, "characters", "tess.json"),
                  "w") as handle:
            handle.write("{broken json")
        packs_mod.clear_cache()
        records, notices = packs_mod.load_installed()
        self.assertEqual(records, {})
        self.assertTrue(any("moved aside" in n for n in notices))
        self.assertTrue(os.path.isdir(target + ".broken"))

    def test_builtin_slug_collision_skipped(self):
        pip_clone = _character("pip")
        src = _write_pack(os.path.join(self.tmp, "src"),
                          slug="clone-pack", characters=[pip_clone])
        ok, _note = packs_mod.install(src)
        self.assertTrue(ok)
        records, notices = packs_mod.load_installed()
        self.assertNotIn("pip-clone", records)
        self.assertTrue(any("collides" in n for n in notices))
        from pet.pet_core import catalog as catalog_mod
        record, _notice = catalog_mod.get("pip")
        self.assertEqual(record["species"], "blob-cat")


class TestPackActivation(PackTestBase):
    def _install_example(self):
        ok, note = packs_mod.install(EXAMPLE)
        self.assertTrue(ok, note)

    def test_catalog_lists_pack_characters(self):
        self._install_example()
        from pet.pet_core import catalog as catalog_mod
        ids = [r["id"] for r in catalog_mod.list_characters()]
        self.assertIn("sunny", ids)
        self.assertIn("ember", ids)
        record, notice = catalog_mod.get("sunny")
        self.assertIsNone(notice)
        self.assertEqual(record["body_plan"], "blob")

    def test_traits_voices_converse_activate(self):
        self._install_example()
        from pet.pet_core import catalog as catalog_mod
        catalog_mod.get("sunny")
        from pet.pet_core import traits as traits_mod
        self.assertAlmostEqual(traits_mod.walk_speed_for("sunny"), 42.0)
        from pet.pet_core.personality import Personality
        first = Personality(name="T", seed=7, character_id="sunny")
        second = Personality(name="T", seed=7, character_id="sunny")
        self.assertIn("Sunny", first.line_for("happy")
                      + second.line_for("happy")
                      + first.line_for("happy"))
        from pet.pet_core.converse import Converser
        talker = Converser(character_id="sunny", seed=5)
        reply, _hint = talker.reply("tell me a joke")
        self.assertIn("Sunny", reply)

    def test_switch_persists_pack_character(self):
        self._install_example()
        from pet.pet_core.persistence import load, save
        from pet.pet_core.state import PetState
        packs_mod.clear_cache()
        from pet.pet_core import catalog as catalog_mod
        catalog_mod.get("sunny")
        state = PetState(character_id="sunny")
        self.assertEqual(state.character_id, "sunny")
        path = os.path.join(self.tmp, "pet.json")
        save(state, path)
        packs_mod.clear_cache()
        from pet.pet_core import packs as packs_again
        packs_again.ensure_active()
        clone, notice = load(path)
        self.assertIsNone(notice)
        self.assertEqual(clone.character_id, "sunny")

    def test_sprite_renders_pack_character(self):
        self._install_example()
        from pet.pet_app.sprite import pose_for, shapes
        pose = pose_for("idle", 0.35, "sunny")
        drawing = shapes(pose, size=96, character_id="sunny")
        self.assertTrue(len(drawing) > 4)
        pip_pose = pose_for("idle", 0.35, "pip")
        pip_drawing = shapes(pip_pose, size=96, character_id="pip")
        sunny_fills = {d.get("fill") for d in drawing}
        pip_fills = {d.get("fill") for d in pip_drawing}
        self.assertNotEqual(sunny_fills, pip_fills)

    def test_settings_character_round_trip(self):
        self._install_example()
        from pet.pet_app import settings as settings_mod
        made = settings_mod.AppSettings(character_id="ember")
        self.assertEqual(made.character_id, "ember")
        path = os.path.join(self.tmp, "settings.json")
        settings_mod.save_settings(made, path)
        back, notice = settings_mod.load_settings(path)
        self.assertIsNone(notice)
        self.assertEqual(back.character_id, "ember")
        self.assertEqual(
            settings_mod.parse_setting_value("character_id", " Sunny "), "sunny")
        unknown = settings_mod.AppSettings(character_id="starship")
        self.assertEqual(unknown.character_id, "pip")


class TestInstallerScripts(unittest.TestCase):
    ROOT = os.path.join("pet", "packaging")

    def _read(self, name):
        with open(os.path.join(self.ROOT, name), "r",
                  encoding="utf-8") as handle:
            return handle.read()

    def test_shell_scripts_are_fail_closed(self):
        for name in ("build-macos.sh", "build-linux.sh",
                     "install.sh", "uninstall.sh"):
            text = self._read(name)
            self.assertIn("set -euo pipefail", text,
                          "%s must fail closed" % name)
        for name in ("build-macos.sh", "build-linux.sh", "install.sh"):
            text = self._read(name)
            self.assertIn("selftest", text,
                          "%s must gate on selftest" % name)

    def test_powershell_scripts_stop_on_error(self):
        for name in ("install.ps1", "uninstall.ps1"):
            text = self._read(name)
            self.assertIn('$ErrorActionPreference = "Stop"', text,
                          "%s must stop on error" % name)

    def test_inno_setup_declares_app_and_cleanup(self):
        text = self._read("desktop-pet.iss")
        self.assertIn("desktop-pet.exe", text)
        self.assertIn("startup", text.lower())
        self.assertIn("Uninstall", text)

    def test_linux_recipe_declares_deb_and_desktop(self):
        text = self._read("build-linux.sh")
        self.assertIn("dpkg-deb", text)
        self.assertIn(".desktop", text)
        self.assertIn("AppImage", text)
        self.assertIn("SHA256", text)

    def test_macos_recipe_declares_pkg_and_dmg(self):
        text = self._read("build-macos.sh")
        self.assertIn("pkgbuild", text)
        self.assertIn("hdiutil", text)
        self.assertIn("LaunchAgent", text)
        self.assertIn("SHA256", text)

    def test_install_rejects_unknown_flags(self):
        proc = subprocess.run(
            ["sh", os.path.join(self.ROOT, "install.sh"), "--bogus"],
            capture_output=True, text=True, timeout=60)
        self.assertNotEqual(proc.returncode, 0)
        proc = subprocess.run(
            ["sh", os.path.join(self.ROOT, "uninstall.sh"), "--bogus"],
            capture_output=True, text=True, timeout=60)
        self.assertNotEqual(proc.returncode, 0)

    def test_schema_json_is_valid_json(self):
        with open(os.path.join("pet", "packs", "schema.json"),
                  "r", encoding="utf-8") as handle:
            schema = json.load(handle)
        self.assertIn("definitions", schema)
        self.assertIn("character", schema["definitions"])


if __name__ == "__main__":
    unittest.main()
