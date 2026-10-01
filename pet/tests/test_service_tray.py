"""Headless tests for the always-on shell: tray plus background service.

Everything here runs with fakes and temp dirs: no display, no real
processes, no toolkit. Real per-OS window/tray/service passes belong
to the per-OS testers on native runners.
"""

import os
import tempfile
import unittest

from pet.pet_app import service as service_mod
from pet.pet_app import shells as shells_mod
from pet.pet_app import tray as tray_mod
from pet.pet_app.window import clamp_to_screen


def _no_pystray(_name):
    return None


def _yes_pystray(name):
    if name == "pystray":
        return object()
    return None


class TestTrayBackends(unittest.TestCase):
    def test_pystray_wins_when_installed(self):
        backend, _note = tray_mod.pick_backend("linux", _finder=_yes_pystray)
        self.assertEqual(backend, tray_mod.BACKEND_PYSTRAY)

    def test_native_shim_without_pystray(self):
        backend, _note = tray_mod.pick_backend("windows",
                                               _finder=_no_pystray)
        self.assertEqual(backend, tray_mod.BACKEND_NATIVE)

    def test_unknown_platform_falls_to_mini_controller(self):
        backend, note = tray_mod.pick_backend("plan9", _finder=_no_pystray)
        self.assertEqual(backend, tray_mod.BACKEND_MINI)
        self.assertIn("mini-controller", note)

    def test_probe_never_raises(self):
        info = tray_mod.probe("linux", _finder=_no_pystray)
        self.assertIn("backend", info)
        self.assertIn("can_show_icon", info)
        self.assertTrue(info["mini_controller"])

    def test_honest_note_none_when_icon_can_show(self):
        # With a display and a native-capable platform there is an icon
        # path, so no honest note is owed. Force the display on via env.
        old = os.environ.get("DISPLAY")
        os.environ["DISPLAY"] = ":9"
        try:
            note = tray_mod.honest_note("linux", _finder=_no_pystray)
        finally:
            if old is None:
                del os.environ["DISPLAY"]
            else:
                os.environ["DISPLAY"] = old
        self.assertIsNone(note)


class TestTrayController(unittest.TestCase):
    def test_tooltip_defaults_and_updates(self):
        tray = tray_mod.TrayController(platform="linux",
                                       _finder=_no_pystray)
        self.assertEqual(tray.tooltip, "Desktop Pet")
        self.assertEqual(tray.set_tooltip("  Bramble  "), "Bramble")
        self.assertEqual(tray.set_tooltip("   "), "Bramble")

    def test_menu_drops_bad_entries(self):
        tray = tray_mod.TrayController(platform="linux",
                                       _finder=_no_pystray)
        kept = tray.set_menu([("feed", "Feed"), ("", "Nope"),
                              ("quit", ""), "junk",
                              ("about", "About")])
        self.assertEqual(kept, [("feed", "Feed"), ("about", "About")])

    def test_show_fails_closed_without_display(self):
        tray = tray_mod.TrayController(platform="unknown-os",
                                       _finder=_no_pystray)
        ok, note = tray.show()
        self.assertFalse(ok)
        self.assertTrue(note)
        self.assertFalse(tray.visible)

    def test_hide_always_succeeds(self):
        tray = tray_mod.TrayController(platform="linux",
                                       _finder=_no_pystray)
        ok, _note = tray.hide()
        self.assertTrue(ok)
        self.assertFalse(tray.visible)

    def test_handle_action_routes_and_quit_flag(self):
        tray = tray_mod.TrayController(platform="linux",
                                       _finder=_no_pystray)
        tray.on_action["quit"] = lambda: (None, True)
        tray.on_action["feed"] = lambda: "fed"
        text, quit_flag = tray.handle_action("feed")
        self.assertEqual(text, "fed")
        self.assertFalse(quit_flag)
        _text, quit_flag = tray.handle_action("quit")
        self.assertTrue(quit_flag)

    def test_handle_action_unknown_and_broken(self):
        tray = tray_mod.TrayController(platform="linux",
                                       _finder=_no_pystray)
        self.assertEqual(tray.handle_action("nope"), (None, False))
        self.assertEqual(tray.handle_action(""), (None, False))

        def _boom():
            raise RuntimeError("stuck menu")

        tray.on_action["bad"] = _boom
        text, quit_flag = tray.handle_action("bad")
        self.assertIn("did not answer", text)
        self.assertFalse(quit_flag)

    def test_describe_mentions_backend(self):
        tray = tray_mod.TrayController(platform="linux",
                                       _finder=_no_pystray)
        self.assertIn(tray.backend, tray.describe())


class FakeProcTable:
    """In-memory pid table backing fake alive/spawn/terminate seams."""

    def __init__(self):
        self.live = set()
        self.next_pid = 5000

    def alive(self, pid):
        return int(pid) in self.live

    def spawn(self):
        self.next_pid += 1
        self.live.add(self.next_pid)
        return self.next_pid

    def spawn_fails(self):
        return None

    def terminate(self, pid):
        self.live.discard(int(pid))
        return int(pid) not in self.live


class TestBackgroundService(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.data = self.tmp.name
        self.procs = FakeProcTable()

    def tearDown(self):
        self.tmp.cleanup()

    def _start(self, **kwargs):
        kwargs.setdefault("_alive", self.procs.alive)
        kwargs.setdefault("_spawn", self.procs.spawn)
        return service_mod.start(data=self.data, **kwargs)

    def test_start_stop_status_round_trip(self):
        ok, note = self._start()
        self.assertTrue(ok)
        self.assertIn("running", note)
        running, pid = service_mod.is_running(self.data,
                                              _alive=self.procs.alive)
        self.assertTrue(running)
        self.assertIsNotNone(pid)
        running, note = service_mod.status(self.data,
                                           _alive=self.procs.alive)
        self.assertTrue(running)
        self.assertIn("running", note)
        ok, note = service_mod.stop(self.data, _alive=self.procs.alive,
                                    _kill=self.procs.terminate)
        self.assertTrue(ok)
        self.assertIn("stopped", note)
        running, _pid = service_mod.is_running(self.data,
                                               _alive=self.procs.alive)
        self.assertFalse(running)

    def test_double_start_reports_already_running(self):
        ok, _note = self._start()
        self.assertTrue(ok)
        ok, note = self._start()
        self.assertTrue(ok)
        self.assertIn("already running", note)

    def test_stale_lock_reclaimed_on_start(self):
        with open(service_mod.pid_path(self.data), "w",
                  encoding="utf-8") as handle:
            handle.write("999991\n")
        ok, note = self._start()
        self.assertTrue(ok)
        self.assertIn("stale", note)

    def test_stale_lock_reclaimed_on_stop(self):
        with open(service_mod.pid_path(self.data), "w",
                  encoding="utf-8") as handle:
            handle.write("999992\n")
        ok, note = service_mod.stop(self.data, _alive=self.procs.alive,
                                    _kill=self.procs.terminate)
        self.assertTrue(ok)
        self.assertIn("stale", note)

    def test_stop_when_never_started(self):
        ok, note = service_mod.stop(self.data, _alive=self.procs.alive,
                                    _kill=self.procs.terminate)
        self.assertTrue(ok)
        self.assertIn("not running", note)

    def test_spawn_failure_fails_closed(self):
        ok, note = service_mod.start(data=self.data,
                                     _alive=self.procs.alive,
                                     _spawn=self.procs.spawn_fails)
        self.assertFalse(ok)
        self.assertIn("did not start", note)

    def test_corrupt_pid_file_reads_stopped(self):
        with open(service_mod.pid_path(self.data), "w",
                  encoding="utf-8") as handle:
            handle.write("not-a-pid\n")
        running, pid = service_mod.is_running(self.data,
                                              _alive=self.procs.alive)
        self.assertFalse(running)
        self.assertIsNone(pid)

    def test_logs_empty_then_after_loop(self):
        ok, text = service_mod.logs(data=self.data)
        self.assertFalse(ok)
        code = service_mod.run_loop(max_ticks=20, save_every=5,
                                    data=self.data)
        self.assertEqual(code, 0)
        ok, text = service_mod.logs(data=self.data)
        self.assertTrue(ok)
        self.assertIn("service loop", text)

    def test_run_loop_persists_save(self):
        service_mod.run_loop(max_ticks=30, save_every=5, data=self.data)
        self.assertTrue(os.path.exists(os.path.join(self.data, "pet.json")))

    def test_switch_character_persists_shared_save(self):
        ok, note = service_mod.switch_character("bramble", data=self.data)
        self.assertTrue(ok)
        self.assertIn("bramble", note)
        ok, note = service_mod.switch_character("nope-not-real",
                                                data=self.data)
        self.assertTrue(ok)
        self.assertIn("pip", note.lower())

    def test_show_hide_routing_hints(self):
        ok, note = service_mod.show_window(self.data)
        self.assertTrue(ok)
        self.assertIn("gui", note)
        ok, note = service_mod.hide_window()
        self.assertTrue(ok)
        self.assertIn("service", note)


class TestServiceAutostart(unittest.TestCase):
    def test_service_entrypoints_point_at_service(self):
        from pet.pet_app import shell_linux as linux_shell
        from pet.pet_app import shell_macos as macos_shell
        from pet.pet_app import shell_win as win_shell

        self.assertIn("service start", win_shell.service_command())
        self.assertIn("service start", linux_shell.service_command())
        self.assertIn("service", " ".join(
            macos_shell.service_command()))

    def test_gui_entrypoints_unchanged(self):
        from pet.pet_app import shell_linux as linux_shell
        from pet.pet_app import shell_win as win_shell

        self.assertIn("-m pet gui", win_shell._command())
        self.assertIn("-m pet gui", linux_shell._exec_line())

    def test_service_mode_writes_service_entry(self):
        with tempfile.TemporaryDirectory() as home:
            from pet.pet_app import shell_linux as linux_shell

            ok, _note = linux_shell.set_startup(True, config_home=home,
                                                service=True)
            self.assertTrue(ok)
            with open(linux_shell.autostart_path(home), "r",
                      encoding="utf-8") as handle:
                body = handle.read()
            self.assertIn("service start", body)
            ok, _note = linux_shell.set_startup(False, config_home=home,
                                                service=True)
            self.assertTrue(ok)
            self.assertFalse(linux_shell.is_startup_enabled(
                config_home=home))

    def test_dispatcher_entrypoint_string(self):
        entry = shells_mod.service_entrypoint("linux")
        self.assertIn("service start", entry)
        self.assertIn("service start", shells_mod.service_entrypoint(
            "mystery-os"))


class TestWindowClamp(unittest.TestCase):
    def test_inside_stays_put(self):
        self.assertEqual(clamp_to_screen(100, 100, 160, 224, 1280, 800),
                         (100, 100))

    def test_negative_pins_to_zero(self):
        self.assertEqual(clamp_to_screen(-50, -20, 160, 224, 1280, 800),
                         (0, 0))

    def test_overflow_pins_to_far_edge(self):
        self.assertEqual(clamp_to_screen(2000, 900, 160, 224, 1280, 800),
                         (1120, 576))

    def test_oversized_window_pins_to_origin(self):
        self.assertEqual(clamp_to_screen(50, 50, 2000, 2000, 1280, 800),
                         (0, 0))

    def test_zero_screen_leaves_origin(self):
        self.assertEqual(clamp_to_screen(30, 40, 160, 224, 0, 0), (30, 40))

    def test_garbage_input_returns_ints(self):
        x, y = clamp_to_screen(10, 20, 160, 224, 1280, 800)
        self.assertIsInstance(x, int)
        self.assertIsInstance(y, int)


if __name__ == "__main__":
    unittest.main()
