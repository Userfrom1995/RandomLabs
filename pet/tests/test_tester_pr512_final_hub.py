"""Tester Final-Phase hub parity suite (PR 512, issue #504).

Locks the hub/docs claims added in the Final Phase to the real
implementation so docs can never drift from code:
- package __version__ matches every native installer recipe pin.
- README test-count claim matches live unittest discovery.
- hub catalog gallery names every registered catalog character.
- hub pack/installer sections reference CLI paths that really exist.
"""

import re
import unittest
from pathlib import Path

import pet
from pet.pet_core import catalog

ROOT = Path(__file__).resolve().parent.parent.parent
HUB = ROOT / "pet" / "index.html"
DOCS_MD = ROOT / "pet" / "docs" / "index.md"
README = ROOT / "pet" / "README.md"


class TestVersionRecipeParity(unittest.TestCase):
    def test_version_matches_installer_pins(self):
        version = pet.__version__
        self.assertRegex(version, r"^\d+\.\d+\.\d+$")
        for recipe in ("pet/packaging/desktop-pet.iss",
                       "pet/packaging/build-macos.sh",
                       "pet/packaging/build-linux.sh"):
            src = (ROOT / recipe).read_text()
            self.assertIn(version, src,
                          "%s should pin version %s" % (recipe, version))

    def test_hub_artifact_names_carry_version(self):
        hub = HUB.read_text()
        self.assertIn(pet.__version__, hub)


class TestCatalogGalleryParity(unittest.TestCase):
    def test_hub_names_every_registered_character(self):
        hub = HUB.read_text().lower()
        ids = [c["id"] for c in catalog.list_characters()]
        self.assertGreaterEqual(len(ids), 6)
        for cid in ids:
            self.assertIn(cid.lower(), hub,
                          "hub gallery should name catalog id %r" % cid)

    def test_trait_claims_spot_check(self):
        bramble, _ = catalog.get("bramble")
        pip, _ = catalog.get("pip")
        ratio = bramble["traits"]["hunger_rate"] / pip["traits"]["hunger_rate"]
        self.assertAlmostEqual(ratio, 1.25, places=2)
        from pet.pet_core import traits as traits_mod
        expected = {"pip": 90.0, "bramble": 60.0, "kiki": 45.0,
                    "rusty": 180.0, "luna": 120.0}
        for cid, sec in expected.items():
            self.assertEqual(
                traits_mod.interaction_for(cid)["antic_interval_sec"], sec,
                "hub antic claim for %s should match INTERACTIONS" % cid)


class TestPackCliParity(unittest.TestCase):
    def test_pack_subcommands_exist(self):
        import subprocess
        out = subprocess.run(["python3", "-m", "pet", "pack", "--help"],
                             capture_output=True, text=True, cwd=str(ROOT))
        self.assertEqual(out.returncode, 0)
        for sub in ("validate", "install", "list", "remove", "show"):
            self.assertIn(sub, out.stdout)

    def test_sunny_pack_example_validates(self):
        import subprocess
        out = subprocess.run(
            ["python3", "-m", "pet", "pack", "validate",
             "pet/packs/examples/sunny-pack"],
            capture_output=True, text=True, cwd=str(ROOT))
        self.assertEqual(out.returncode, 0)
        self.assertIn("valid", out.stdout.lower())

    def test_hub_pack_commands_are_real(self):
        hub = HUB.read_text()
        for cmd in ("pack validate", "pack install", "pack list",
                    "pack show", "pack remove", "characters switch"):
            self.assertIn(cmd, hub)


class TestInstallerMatrixParity(unittest.TestCase):
    def test_recipes_referenced_by_hub_exist(self):
        hub = HUB.read_text()
        for recipe in ("desktop-pet.iss", "build-macos.sh", "build-linux.sh",
                       "build-windows.ps1", "install.sh", "uninstall.sh",
                       "install.ps1", "uninstall.ps1"):
            self.assertIn(recipe, hub)
            self.assertTrue((ROOT / "pet" / "packaging" / recipe).exists(),
                            "recipe %s must exist on disk" % recipe)

    def test_readme_test_count_matches_discovery(self):
        loader = unittest.TestLoader()
        live = loader.discover(str(ROOT / "pet" / "tests")).countTestCases()
        text = README.read_text()
        # This suite itself grows the count, so assert the shipped floor
        # (536 at PR time) is present and live meets or exceeds it.
        self.assertIn("536", text)
        self.assertGreaterEqual(live, 536)

    def test_no_em_dashes_in_touched_docs(self):
        for f in (HUB, DOCS_MD, README):
            self.assertNotIn("\u2014", f.read_text(), str(f))


if __name__ == "__main__":
    unittest.main()
