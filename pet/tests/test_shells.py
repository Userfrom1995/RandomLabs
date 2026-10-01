"""Headless tests for the per-OS startup/notification shells."""

import os
import plistlib
import tempfile
import unittest

from pet.pet_app import shell_linux as linux_shell
from pet.pet_app import shell_macos as macos_shell
from pet.pet_app import shell_win as win_shell
from pet.pet_app import shells as shells_mod


class FakeWinKey:
    def __init__(self, store, path):
        self._store = store
        self._path = path

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class FakeWinreg:
    HKEY_CURRENT_USER = "HKCU"
    KEY_SET_VALUE = 1
    KEY_READ = 2
    REG_SZ = 3

    def __init__(self, present=True):
        self.store = {}
        self.present = present

    def CreateKey(self, _root, path):
        return FakeWinKey(self.store, path)

    def OpenKey(self, _root, path, _reserved=0, _access=0):
        if path not in self.store:
            raise FileNotFoundError(path)
        return FakeWinKey(self.store, path)

    def SetValueEx(self, key, name, _reserved, _kind, value):
        self.store[key._path] = {name: value}

    def DeleteValue(self, key, name):
        try:
            del self.store[key._path][name]
        except KeyError:
            raise FileNotFoundError(name)

    def QueryValueEx(self, key, name):
        try:
            return (self.store[key._path][name], self.REG_SZ)
        except KeyError:
            raise FileNotFoundError(name)


class TestWindowsShell(unittest.TestCase):
    def test_honest_without_registry(self):
        ok, note = win_shell.set_startup(True, _winreg=None)
        self.assertFalse(ok)
        self.assertIn("Windows", note)
        self.assertFalse(win_shell.is_startup_enabled(_winreg=None))

    def test_round_trip_with_fake_registry(self):
        fake = FakeWinreg()
        ok, _note = win_shell.set_startup(True, _winreg=fake)
        self.assertTrue(ok)
        self.assertTrue(win_shell.is_startup_enabled(_winreg=fake))
        ok, _note = win_shell.set_startup(False, _winreg=fake)
        self.assertTrue(ok)
        self.assertFalse(win_shell.is_startup_enabled(_winreg=fake))

    def test_command_points_at_pet_gui(self):
        fake = FakeWinreg()
        win_shell.set_startup(True, _winreg=fake)
        stored = fake.store[win_shell._key_path()][win_shell.RUN_VALUE_NAME]
        self.assertIn("-m pet gui", stored)

    def test_notify_is_honest_fallback(self):
        ok, note = win_shell.notify("Hi", "there")
        self.assertFalse(ok)
        self.assertIn("bubble", note)

    def test_notes_mention_registry(self):
        self.assertIn("Registry", win_shell.platform_notes())


class TestMacosShell(unittest.TestCase):
    def test_round_trip(self):
        with tempfile.TemporaryDirectory() as home:
            ok, _note = macos_shell.set_startup(True, home=home)
            self.assertTrue(ok)
            self.assertTrue(macos_shell.is_startup_enabled(home=home))
            with open(macos_shell.agent_path(home), "rb") as handle:
                data = plistlib.load(handle)
            self.assertTrue(data["RunAtLoad"])
            self.assertIn("-m", data["ProgramArguments"])
            ok, _note = macos_shell.set_startup(False, home=home)
            self.assertTrue(ok)
            self.assertFalse(macos_shell.is_startup_enabled(home=home))

    def test_disable_missing_is_ok(self):
        with tempfile.TemporaryDirectory() as home:
            ok, _note = macos_shell.set_startup(False, home=home)
            self.assertTrue(ok)

    def test_corrupt_plist_reads_disabled(self):
        with tempfile.TemporaryDirectory() as home:
            os.makedirs(macos_shell.agent_dir(home), exist_ok=True)
            with open(macos_shell.agent_path(home), "w") as handle:
                handle.write("not a plist")
            self.assertFalse(macos_shell.is_startup_enabled(home=home))

    def test_notify_without_osascript_is_honest(self):
        real_which = macos_shell._osascript
        macos_shell._osascript = lambda: None
        try:
            ok, note = macos_shell.notify("Hi", "there")
        finally:
            macos_shell._osascript = real_which
        self.assertFalse(ok)
        self.assertIn("bubble", note)

    def test_notify_empty_message_refused(self):
        ok, note = macos_shell.notify("Hi", "   ")
        self.assertFalse(ok)
        self.assertIn("empty", note)

    def test_notify_success_path(self):
        real_which = macos_shell._osascript
        macos_shell._osascript = lambda: "/usr/bin/osascript"
        calls = []

        class Proc:
            returncode = 0

        def fake_run(argv, **kwargs):
            calls.append(argv)
            return Proc()
        try:
            ok, _note = macos_shell.notify("Hi", "there", _runner=fake_run)
        finally:
            macos_shell._osascript = real_which
        self.assertTrue(ok)
        self.assertTrue(calls[0][0].endswith("osascript"))


class TestLinuxShell(unittest.TestCase):
    def test_round_trip(self):
        with tempfile.TemporaryDirectory() as config:
            ok, _note = linux_shell.set_startup(True, config_home=config)
            self.assertTrue(ok)
            self.assertTrue(linux_shell.is_startup_enabled(config_home=config))
            with open(linux_shell.autostart_path(config), encoding="utf-8") as handle:
                text = handle.read()
            self.assertIn("[Desktop Entry]", text)
            self.assertIn("-m pet gui", text)
            ok, _note = linux_shell.set_startup(False, config_home=config)
            self.assertTrue(ok)
            self.assertFalse(linux_shell.is_startup_enabled(config_home=config))

    def test_disable_missing_is_ok(self):
        with tempfile.TemporaryDirectory() as config:
            ok, _note = linux_shell.set_startup(False, config_home=config)
            self.assertTrue(ok)

    def test_notify_without_binary_is_honest(self):
        real_which = linux_shell._notify_send
        linux_shell._notify_send = lambda: None
        try:
            ok, note = linux_shell.notify("Hi", "there")
        finally:
            linux_shell._notify_send = real_which
        self.assertFalse(ok)
        self.assertIn("bubble", note)

    def test_notify_refused_returncode_is_honest(self):
        real_which = linux_shell._notify_send
        linux_shell._notify_send = lambda: "/usr/bin/notify-send"

        class Proc:
            returncode = 1

        try:
            ok, note = linux_shell.notify("Hi", "there",
                                          _runner=lambda *a, **k: Proc())
        finally:
            linux_shell._notify_send = real_which
        self.assertFalse(ok)
        self.assertIn("bubble", note)


class TestDispatcher(unittest.TestCase):
    def test_unknown_platform_fails_closed(self):
        ok, note = shells_mod.set_startup(True, platform="plan9")
        self.assertFalse(ok)
        self.assertTrue(note)
        self.assertFalse(shells_mod.is_startup_enabled(platform="plan9"))
        ok, note = shells_mod.notify("Hi", "there", platform="plan9")
        self.assertFalse(ok)
        self.assertIn("bubble", note)
        self.assertIn("no startup", shells_mod.platform_notes(
            platform="plan9").lower())

    def test_current_shell_name(self):
        self.assertEqual(shells_mod.current_shell_name("windows"), "windows")
        self.assertEqual(shells_mod.current_shell_name("macos"), "macos")
        self.assertEqual(shells_mod.current_shell_name("linux"), "linux")
        self.assertEqual(shells_mod.current_shell_name("plan9"), "unknown")

    def test_linux_round_trip_through_dispatcher(self):
        with tempfile.TemporaryDirectory() as config:
            real_path = linux_shell.autostart_path
            linux_shell.autostart_path = lambda _c=None: os.path.join(
                config, "desktop-pet.desktop")
            real_dir = linux_shell.autostart_dir
            linux_shell.autostart_dir = lambda _c=None: config
            try:
                ok, _note = shells_mod.set_startup(True, platform="linux")
                self.assertTrue(ok)
            finally:
                linux_shell.autostart_path = real_path
                linux_shell.autostart_dir = real_dir

    def test_never_raises(self):
        for func in (lambda: shells_mod.set_startup(True, platform="plan9"),
                     lambda: shells_mod.is_startup_enabled(platform="plan9"),
                     lambda: shells_mod.notify("t", "m", platform="plan9"),
                     lambda: shells_mod.platform_notes(platform="plan9")):
            func()


if __name__ == "__main__":
    unittest.main()
