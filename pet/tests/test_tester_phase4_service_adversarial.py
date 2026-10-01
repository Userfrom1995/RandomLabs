"""Tester Phase 4 (always-on shell) live adversarial suite, Refs #504.

Pins the shipped `python -m pet service|tray` entrypoints at the CLI
level with isolated DESKTOP_PET_DATA_DIR temp dirs: real daemon
start/status/stop lifecycle, SIGTERM graceful save-and-exit, stale and
corrupt PID lock handling, log tail clamping, unknown-character switch
fallback, tray fail-closed behavior without a display, and
clamp_to_screen hostile geometry. Every test drives the real CLI or the
real module entrypoint; nothing here uses the in-process fake seams from
test_service_tray.py.

Run: python3 -m unittest pet.tests.test_tester_phase4_service_adversarial -v
"""

import os
import signal
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


def run_pet(*argv, data_dir=None):
    env = dict(os.environ)
    if data_dir is not None:
        env["DESKTOP_PET_DATA_DIR"] = data_dir
    return subprocess.run(
        [sys.executable, "-m", "pet"] + list(argv),
        cwd=ROOT, capture_output=True, text=True, env=env, timeout=120,
    )


def read_pid(data_dir):
    with open(os.path.join(data_dir, "service.pid"),
              encoding="utf-8") as handle:
        return int(handle.read().strip().split()[0])


def pid_alive(pid):
    try:
        os.kill(int(pid), 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


class TestServiceDaemonLifecycle(unittest.TestCase):
    def test_real_daemon_start_status_stop(self):
        with tempfile.TemporaryDirectory() as data:
            proc = run_pet("service", "start", data_dir=data)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("running", proc.stdout)
            pid = read_pid(data)
            self.assertTrue(pid > 0)
            try:
                status = run_pet("service", "status", data_dir=data)
                self.assertEqual(status.returncode, 0, status.stderr)
                self.assertIn("running", status.stdout)
                self.assertIn(str(pid), status.stdout)
                # Second start must report already-running, never fork again.
                again = run_pet("service", "start", data_dir=data)
                self.assertEqual(again.returncode, 0, again.stderr)
                self.assertIn("already running", again.stdout)
                self.assertEqual(read_pid(data), pid)
            finally:
                stopped = run_pet("service", "stop", data_dir=data)
                self.assertEqual(stopped.returncode, 0, stopped.stderr)
                self.assertIn("stopped", stopped.stdout)
            # The child must actually be gone after stop.
            deadline = time.time() + 10.0
            while pid_alive(pid) and time.time() < deadline:
                time.sleep(0.2)
            self.assertFalse(pid_alive(pid), "daemon pid %d lingered" % pid)
            status = run_pet("service", "status", data_dir=data)
            self.assertEqual(status.returncode, 0, status.stderr)
            self.assertIn("stopped", status.stdout)

    def test_sigterm_saves_and_exits_gracefully(self):
        with tempfile.TemporaryDirectory() as data:
            proc = run_pet("service", "start", data_dir=data)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            pid = read_pid(data)
            try:
                time.sleep(2)
                os.kill(pid, signal.SIGTERM)
                deadline = time.time() + 10.0
                while pid_alive(pid) and time.time() < deadline:
                    time.sleep(0.2)
                self.assertFalse(pid_alive(pid),
                                 "daemon ignored SIGTERM")
                # Graceful exit writes the shared save and a stop line.
                self.assertTrue(os.path.exists(
                    os.path.join(data, "pet.json")),
                    "SIGTERM exit must persist the shared save")
                with open(os.path.join(data, "service.log"),
                          encoding="utf-8") as handle:
                    log = handle.read()
                self.assertIn("service loop stopped", log)
            finally:
                run_pet("service", "stop", data_dir=data)

    def test_stop_when_never_started_is_clean(self):
        with tempfile.TemporaryDirectory() as data:
            proc = run_pet("service", "stop", data_dir=data)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("not running", proc.stdout)


class TestServiceLockHostility(unittest.TestCase):
    def test_corrupt_pid_reads_stopped_not_crash(self):
        with tempfile.TemporaryDirectory() as data:
            with open(os.path.join(data, "service.pid"), "w",
                      encoding="utf-8") as handle:
                handle.write("not-a-pid\n")
            status = run_pet("service", "status", data_dir=data)
            self.assertEqual(status.returncode, 0, status.stderr)
            self.assertIn("stopped", status.stdout)

    def test_stale_lock_reclaimed_on_stop(self):
        with tempfile.TemporaryDirectory() as data:
            with open(os.path.join(data, "service.pid"), "w",
                      encoding="utf-8") as handle:
                handle.write("999991\n")
            proc = run_pet("service", "stop", data_dir=data)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("stale", proc.stdout)

    def test_stale_lock_reclaimed_on_start(self):
        with tempfile.TemporaryDirectory() as data:
            with open(os.path.join(data, "service.pid"), "w",
                      encoding="utf-8") as handle:
                handle.write("999992\n")
            proc = run_pet("service", "start", data_dir=data)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("running", proc.stdout)
            try:
                self.assertNotEqual(read_pid(data), 999992)
            finally:
                run_pet("service", "stop", data_dir=data)


class TestServiceLogsAndSwitch(unittest.TestCase):
    def test_logs_before_start_fails_closed(self):
        with tempfile.TemporaryDirectory() as data:
            proc = run_pet("service", "logs", data_dir=data)
            self.assertNotEqual(proc.returncode, 0)
            combined = proc.stdout + proc.stderr
            self.assertIn("no service log yet", combined)

    def test_logs_clamp_huge_line_count(self):
        from pet.pet_app import service as service_mod
        with tempfile.TemporaryDirectory() as data:
            service_mod.run_loop(max_ticks=10, save_every=2, data=data)
            ok, text = service_mod.logs(lines=99999, data=data)
            self.assertTrue(ok)
            self.assertLessEqual(len(text.splitlines()), 500)
            self.assertIn("service loop", text)

    def test_run_loop_persists_shared_save(self):
        from pet.pet_app import service as service_mod
        with tempfile.TemporaryDirectory() as data:
            code = service_mod.run_loop(max_ticks=15, save_every=5,
                                        data=data)
            self.assertEqual(code, 0)
            self.assertTrue(os.path.exists(
                os.path.join(data, "pet.json")))

    def test_switch_unknown_character_falls_back(self):
        with tempfile.TemporaryDirectory() as data:
            proc = run_pet("service", "switch", "nope-not-real",
                           data_dir=data)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertIn("pip", proc.stdout.lower())

    def test_switch_needs_character_id(self):
        proc = run_pet("service", "switch")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("character id", proc.stderr)

    def test_show_hide_routing_hints(self):
        show = run_pet("service", "show")
        self.assertEqual(show.returncode, 0, show.stderr)
        self.assertIn("gui", show.stdout)
        hide = run_pet("service", "hide")
        self.assertEqual(hide.returncode, 0, hide.stderr)
        self.assertIn("service", hide.stdout)


class TestTrayLive(unittest.TestCase):
    def test_tray_status_describes_backend(self):
        proc = run_pet("tray", "status")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("tray backend", proc.stdout)

    def test_tray_hide_always_succeeds(self):
        proc = run_pet("tray", "hide")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("hidden", proc.stdout)

    def test_tray_show_fails_closed_or_shows(self):
        proc = run_pet("tray", "show")
        combined = proc.stdout + proc.stderr
        if proc.returncode == 0:
            self.assertIn("shown", combined)
        else:
            self.assertTrue(combined.strip())

    def test_controller_headless_fail_closed(self):
        from pet.pet_app import tray as tray_mod
        tray = tray_mod.TrayController(platform="unknown-os")
        ok, note = tray.show()
        self.assertFalse(ok)
        self.assertTrue(note)
        self.assertFalse(tray.visible)
        ok, _note = tray.hide()
        self.assertTrue(ok)

    def test_controller_bad_handler_reports_text(self):
        from pet.pet_app import tray as tray_mod
        tray = tray_mod.TrayController(platform="linux")

        def _boom():
            raise RuntimeError("stuck menu")

        tray.on_action["bad"] = _boom
        text, quit_flag = tray.handle_action("bad")
        self.assertIn("did not answer", text)
        self.assertFalse(quit_flag)
        self.assertEqual(tray.handle_action("nope"), (None, False))


class TestWindowClampHostile(unittest.TestCase):
    def test_overflow_pins_to_far_edge(self):
        from pet.pet_app.window import clamp_to_screen
        self.assertEqual(clamp_to_screen(2000, 900, 160, 224, 1280, 800),
                         (1120, 576))

    def test_oversized_window_pins_to_origin(self):
        from pet.pet_app.window import clamp_to_screen
        self.assertEqual(clamp_to_screen(50, 50, 2000, 2000, 1280, 800),
                         (0, 0))

    def test_zero_screen_leaves_origin(self):
        from pet.pet_app.window import clamp_to_screen
        self.assertEqual(clamp_to_screen(30, 40, 160, 224, 0, 0), (30, 40))

    def test_negative_screen_never_raises(self):
        from pet.pet_app.window import clamp_to_screen
        x, y = clamp_to_screen(-10, -10, 160, 224, -800, -600)
        self.assertIsInstance(x, int)
        self.assertIsInstance(y, int)


if __name__ == "__main__":
    unittest.main()
