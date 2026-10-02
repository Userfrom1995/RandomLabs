"""Tester-authored adversarial regression suite for Phase 5 (issue #504).

Locks in the 10 Reviewer blocking findings fixed on PR #511 so they can
never regress: slug traversal, zip-slip variants, corrupt-zip install,
identity preservation, service tick guard, installer honesty/shebangs,
and Inno OutputDir. Headless and hermetic (tmp DATA_DIR per test).
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile

from pet.pet_core import packs as packs_mod

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _find_bash():
    """Locate a real script-capable bash, or return None.

    On Windows ``bash`` on PATH often resolves to the WSL stub at
    ``<SystemRoot>\\System32\\bash.exe`` (a WSL launcher, not a shell
    that can run ``bash -n script.sh``), while the real shell ships
    with Git for Windows. Prefer any non-System32 bash, then the
    well-known Git install locations; return None when only the stub
    (or nothing) exists so callers skip instead of testing the stub.
    """
    import shutil

    probes = []
    if os.name == "nt":
        probes.extend([
            r"C:\Program Files\Git\bin\bash.exe",
            r"C:\Program Files (x86)\Git\bin\bash.exe",
        ])
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        if directory:
            name = "bash.exe" if os.name == "nt" else "bash"
            probes.append(os.path.join(directory, name))
    system_root = os.path.normcase(
        os.path.abspath(os.environ.get("SystemRoot", r"C:\Windows")))
    real, fallback = [], []
    for probe in probes:
        if not os.path.isfile(probe):
            continue
        if (os.name == "nt" and os.path.normcase(
                os.path.abspath(probe)).startswith(system_root)):
            fallback.append(probe)
        else:
            real.append(probe)
    if real:
        return real[0]
    if fallback:
        return None
    found = shutil.which("bash")
    if found and os.name == "nt" and os.path.normcase(
            os.path.abspath(found)).startswith(system_root):
        return None
    return found


def _require_bash(test):
    """Return a bash path or skip the calling test when only the WSL stub exists."""
    bash = _find_bash()
    if bash is None:
        test.skipTest("no script-capable bash found "
                      "(only the Windows WSL stub or nothing on PATH)")
    return bash


def _pack_root(root, slug="t5-pack"):
    os.makedirs(os.path.join(root, "characters"), exist_ok=True)
    with open(os.path.join(root, "pack.json"), "w",
              encoding="utf-8") as handle:
        json.dump({"slug": slug, "name": "T5", "version": "1.0.0",
                   "author": "t", "description": "fixture"}, handle)
    char = {
        "id": "t5bud", "name": "T5 Bud", "species": "testling",
        "body_plan": "blob", "tagline": "t", "signature": "T5 waves.",
        "palette": {"body": "#112233", "belly": "#FFEEDD",
                    "accent": "#445566"},
        "traits": {"hunger_rate": 0.15, "energy_drain": 0.10,
                   "energy_restore": 0.33, "affection_decay": 0.08,
                   "walk_speed": 40.0, "play_bonus": 0.01,
                   "sleep_bonus": 0.0, "react_bonus": 0.0},
        "dialogue": {"mood:happy": ["a1", "a2", "a3", "a4"],
                     "event:greet": ["h1", "h2", "h3"]},
    }
    with open(os.path.join(root, "characters", "t5bud.json"), "w",
              encoding="utf-8") as handle:
        json.dump(char, handle)
    return root


class _Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="pet-t5-")
        self.old = os.environ.get("DESKTOP_PET_DATA_DIR")
        os.environ["DESKTOP_PET_DATA_DIR"] = self.tmp
        packs_mod.clear_cache()

    def tearDown(self):
        packs_mod.clear_cache()
        if self.old is None:
            os.environ.pop("DESKTOP_PET_DATA_DIR", None)
        else:
            os.environ["DESKTOP_PET_DATA_DIR"] = self.old
        import shutil
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _zip(self, tag, entries):
        path = os.path.join(self.tmp, "zs-%s.zip" % tag)
        man = {"slug": "evil", "name": "e", "version": "1.0.0"}
        with zipfile.ZipFile(path, "w") as archive:
            for name, body in entries.items():
                archive.writestr(name, body)
            archive.writestr("pack.json", json.dumps(man))
        return path


class TestSlugTraversal(_Base):
    def test_remove_traversal_fails_closed(self):
        sentinel = os.path.join(self.tmp, "sentinel.txt")
        with open(sentinel, "w") as handle:
            handle.write("user data")
        for slug in ("../", "..", "../../etc", "", "BAD SLUG!"):
            ok, note = packs_mod.remove(slug)
            self.assertFalse(ok, slug)
            self.assertIn("invalid pack slug", note, slug)
        self.assertTrue(os.path.isfile(sentinel))

    def test_show_traversal_fails_closed(self):
        for slug in ("../", "../../etc", "a/b"):
            detail, note = packs_mod.show(slug)
            self.assertIsNone(detail, slug)
            self.assertIn("invalid pack slug", note, slug)


class TestZipSlip(_Base):
    ENTRIES = ["../escape.json", "..\\escape.json", "/abs.json",
               "C:/evil.json", "C:\\evil.json",
               "characters/../../escape.json"]

    def test_all_escape_forms_rejected(self):
        for i, entry in enumerate(self.ENTRIES):
            path = self._zip("e%d" % i, {entry: "{}"})
            with self.assertRaises(ValueError, msg=entry):
                packs_mod.validate(path)

    def test_install_never_writes_outside(self):
        for i, entry in enumerate(self.ENTRIES):
            path = self._zip("w%d" % i, {entry: "{}"})
            ok, _note = packs_mod.install(path)
            self.assertFalse(ok, entry)
        self.assertEqual(packs_mod.list_installed(), [])


class TestCorruptZip(_Base):
    def test_install_corrupt_zip_returns_false_no_raise(self):
        bad = os.path.join(self.tmp, "corrupt.zip")
        with open(bad, "wb") as handle:
            handle.write(b"not a zip at all")
        try:
            ok, note = packs_mod.install(bad)
        except zipfile.BadZipFile:
            self.fail("install() raised BadZipFile instead of failing closed")
        self.assertFalse(ok)
        self.assertIn("invalid pack", note)

    def test_validate_corrupt_zip_raises_value_not_crash(self):
        bad = os.path.join(self.tmp, "corrupt2.zip")
        with open(bad, "wb") as handle:
            handle.write(b"\x00\x01\x02 garbage")
        with self.assertRaises((ValueError, zipfile.BadZipFile)):
            packs_mod.validate(bad)

    def test_cli_validate_corrupt_zip_rc1(self):
        bad = os.path.join(self.tmp, "corrupt3.zip")
        with open(bad, "wb") as handle:
            handle.write(b"nope")
        env = dict(os.environ, DESKTOP_PET_DATA_DIR=self.tmp)
        proc = subprocess.run(
            [sys.executable, "-m", "pet", "pack", "validate", bad],
            capture_output=True, text=True, timeout=60, cwd=REPO, env=env)
        self.assertEqual(proc.returncode, 1)
        self.assertNotIn("Traceback", proc.stdout + proc.stderr)

    def test_cli_install_corrupt_zip_rc1(self):
        bad = os.path.join(self.tmp, "corrupt4.zip")
        with open(bad, "wb") as handle:
            handle.write(b"nope")
        env = dict(os.environ, DESKTOP_PET_DATA_DIR=self.tmp)
        proc = subprocess.run(
            [sys.executable, "-m", "pet", "pack", "install", bad],
            capture_output=True, text=True, timeout=60, cwd=REPO, env=env)
        self.assertEqual(proc.returncode, 1)
        self.assertNotIn("Traceback", proc.stdout + proc.stderr)


class TestIdentityPreserved(_Base):
    def test_cli_switch_typo_preserves_save(self):
        env = dict(os.environ, DESKTOP_PET_DATA_DIR=self.tmp)
        proc = subprocess.run(
            [sys.executable, "-m", "pet", "characters", "switch", "luna"],
            capture_output=True, text=True, timeout=60, cwd=REPO, env=env)
        self.assertEqual(proc.returncode, 0)
        proc = subprocess.run(
            [sys.executable, "-m", "pet", "characters", "switch",
             "starship-nope"],
            capture_output=True, text=True, timeout=60, cwd=REPO, env=env)
        self.assertEqual(proc.returncode, 0)
        with open(os.path.join(self.tmp, "pet.json"),
                  encoding="utf-8") as handle:
            saved = json.load(handle)
        self.assertEqual(saved["character_id"], "luna")


class TestServiceTick(_Base):
    def test_bad_and_out_of_range_tick_run_at_default(self):
        from pet.pet_app import service as service_mod
        service_mod.run_loop(tick_sec="abc", max_ticks=2)
        service_mod.run_loop(tick_sec="1000", max_ticks=2)
        service_mod.run_loop(tick_sec="-5", max_ticks=2)


class TestInstallerHonesty(unittest.TestCase):
    def _read(self, name):
        path = os.path.join(REPO, "pet", "packaging", name)
        with open(path, encoding="utf-8") as handle:
            return handle.read()

    def test_shell_shebangs_are_bash(self):
        for name in ("build-linux.sh", "build-macos.sh",
                     "install.sh", "uninstall.sh"):
            first = self._read(name).splitlines()[0]
            self.assertIn("bash", first, name)

    def test_shell_scripts_syntax_ok(self):
        bash = _require_bash(self)
        for name in ("build-linux.sh", "build-macos.sh",
                     "install.sh", "uninstall.sh"):
            proc = subprocess.run(
                [bash, "-n", os.path.join(REPO, "pet", "packaging", name)],
                capture_output=True, text=True, timeout=60)
            self.assertEqual(proc.returncode, 0, name)

    def test_macos_pkg_does_not_claim_launchagent_install(self):
        text = self._read("build-macos.sh")
        self.assertNotIn("loads the LaunchAgent", text)

    def test_inno_output_dir_is_dist(self):
        self.assertIn("OutputDir=", self._read("desktop-pet.iss"))

    def test_install_scripts_reject_unknown_flags(self):
        bash = _require_bash(self)
        for name in ("install.sh", "uninstall.sh"):
            proc = subprocess.run(
                [bash, os.path.join(REPO, "pet", "packaging", name),
                 "--bogus"],
                capture_output=True, text=True, timeout=60)
            self.assertNotEqual(proc.returncode, 0, name)


if __name__ == "__main__":
    unittest.main()
