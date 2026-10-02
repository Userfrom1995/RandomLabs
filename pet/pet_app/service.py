"""Background service for the desktop pet (stdlib only, GUI-free).

The service owns the always-on mode: a single-instance background loop
ticks the headless behavior brain at 10 Hz with debounced atomic saves,
so the pet stays alive with no window open. The companion window
attaches to the same save dir, so service and GUI never fork state.

Lifecycle (all functions fail closed with ``(ok, note)`` / notes and
never raise):

- ``start()``   spawn a detached ``python -m pet service loop`` child,
  record its PID in ``service.pid`` under the user-data dir.
- ``stop()``    terminate the recorded PID, reclaim stale locks.
- ``status()``  report the live PID plus active character and uptime.
- ``logs()``    tail the service log file.
- ``run_loop()`` the daemon child itself: ticks the brain headlessly.

Single-instance safety comes from the PID file plus a live-process
check (``os.kill(pid, 0)`` on POSIX, ``ctypes`` handle probe on
Windows); a stale file from a dead process is reclaimed with a notice
instead of blocking the next start. All OS calls sit behind injectable
seams (``_spawn``, ``_is_alive``, ``_kill``) so tests drive the
lifecycle with fakes and no real processes.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time

PID_FILENAME = "service.pid"
LOG_FILENAME = "service.log"
TICK_HZ = 10.0
SAVE_EVERY_TICKS = 300


def data_dir() -> str:
    """User-data dir shared with saves (override with DESKTOP_PET_DATA_DIR)."""
    from ..pet_core.persistence import default_dir

    return default_dir()


def pid_path(data: str | None = None) -> str:
    return os.path.join(data or data_dir(), PID_FILENAME)


def log_path(data: str | None = None) -> str:
    return os.path.join(data or data_dir(), LOG_FILENAME)


def _read_pid(data: str | None = None) -> int | None:
    try:
        with open(pid_path(data), "r", encoding="utf-8") as handle:
            text = handle.read().strip().split()[0]
        number = int(text)
    except (OSError, ValueError, IndexError):
        return None
    if number <= 0:
        return None
    return number


def _write_pid(pid: int, data: str | None = None) -> None:
    target = pid_path(data)
    os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
    tmp = target + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        handle.write("%d\nstarted %d\n" % (int(pid), int(time.time())))
    os.replace(tmp, target)


def _clear_pid(data: str | None = None) -> None:
    try:
        os.unlink(pid_path(data))
    except OSError:
        pass


def _is_alive(pid: int) -> bool:
    """True when a process id is currently running. Never raises."""
    try:
        number = int(pid)
    except (TypeError, ValueError):
        return False
    if number <= 0:
        return False
    if sys.platform == "win32":
        try:
            import ctypes

            handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, number)
            if not handle:
                return False
            try:
                code = ctypes.c_ulong()
                ok = ctypes.windll.kernel32.GetExitCodeProcess(
                    handle, ctypes.byref(code))
                # STILL_ACTIVE (259) means the process is alive.
                return bool(ok) and int(code.value) == 259
            finally:
                ctypes.windll.kernel32.CloseHandle(handle)
        except Exception:
            return False
    try:
        os.kill(number, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except Exception:
        return False
    return True


def _terminate_process(pid: int) -> bool:
    """Best-effort process stop. Returns True when the pid is gone."""
    try:
        number = int(pid)
    except (TypeError, ValueError):
        return False
    if sys.platform == "win32":
        try:
            import ctypes

            handle = ctypes.windll.kernel32.OpenProcess(1, False, number)
            if not handle:
                return not _is_alive(number)
            try:
                ctypes.windll.kernel32.TerminateProcess(handle, 0)
            finally:
                ctypes.windll.kernel32.CloseHandle(handle)
        except Exception:
            return False
        deadline = time.time() + 5.0
        while time.time() < deadline:
            if not _is_alive(number):
                return True
            time.sleep(0.1)
        return not _is_alive(number)
    try:
        os.kill(number, signal.SIGTERM)
    except ProcessLookupError:
        return True
    except PermissionError:
        return False
    except Exception:
        return False
    deadline = time.time() + 5.0
    while time.time() < deadline:
        if not _is_alive(number):
            return True
        time.sleep(0.1)
    try:
        os.kill(number, signal.SIGKILL)
    except Exception:
        pass
    time.sleep(0.2)
    return not _is_alive(number)


def _spawn_detached(data: str | None = None) -> int | None:
    """Spawn ``python -m pet service loop`` detached. Returns pid or None."""
    cmd = [sys.executable or "python3", "-m", "pet", "service", "loop"]
    log = log_path(data)
    os.makedirs(os.path.dirname(os.path.abspath(log)), exist_ok=True)
    try:
        outfile = open(log, "a", encoding="utf-8")
    except OSError:
        return None
    try:
        if sys.platform == "win32":
            flags = getattr(subprocess, "DETACHED_PROCESS", 0x8) | getattr(
                subprocess, "CREATE_NEW_PROCESS_GROUP", 0x200)
            proc = subprocess.Popen(
                cmd, stdout=outfile, stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL, creationflags=flags,
                close_fds=True)
        else:
            proc = subprocess.Popen(
                cmd, stdout=outfile, stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL, start_new_session=True,
                close_fds=True)
        return int(proc.pid)
    except Exception:
        return None
    finally:
        try:
            outfile.close()
        except Exception:
            pass


def is_running(data: str | None = None,
               _alive: object = None) -> tuple[bool, int | None]:
    """Check the recorded service process. Returns (alive, pid)."""
    alive = _alive or _is_alive
    pid = _read_pid(data)
    if pid is None:
        return (False, None)
    try:
        running = bool(alive(pid))  # type: ignore[operator]
    except Exception:
        return (False, pid)
    return (running, pid)


def start(detach: bool = True, data: str | None = None,
          _alive: object = None, _spawn: object = None) -> tuple[bool, str]:
    """Start the background service. Returns (ok, note)."""
    alive = _alive or _is_alive
    running, pid = is_running(data, alive)
    if running:
        return (True, "the background pet is already running (pid %d)." % pid)
    stale = _read_pid(data)
    spawn = _spawn or _spawn_detached
    try:
        if detach:
            try:
                child = spawn(data)  # type: ignore[operator]
            except TypeError:
                child = spawn()  # type: ignore[operator]
        else:
            child = None
    except Exception as exc:
        return (False, "the background service did not start (%s)." % exc)
    if detach:
        if child is None:
            return (False, "the background service did not start "
                    "(could not spawn the daemon; see the log).")
        try:
            _write_pid(int(child), data)
        except (OSError, TypeError, ValueError) as exc:
            return (False, "the service spawned (pid %s) but the pid file "
                    "could not be written (%s)." % (child, exc))
        if stale is not None and stale != int(child):
            return (True, "reclaimed a stale lock (pid %d was gone); "
                    "the background pet is now running (pid %d)."
                    % (stale, int(child)))
        return (True, "the background pet is now running (pid %d). "
                "Open the window any time; it shares the same save."
                % int(child))
    # Foreground mode (used by the daemon child itself and by tests):
    # record this process and run the loop inline.
    try:
        _write_pid(os.getpid(), data)
    except OSError as exc:
        return (False, "could not record the service pid (%s)." % exc)
    return (True, "service recorded (pid %d); running in the foreground."
            % os.getpid())


def stop(data: str | None = None, _alive: object = None,
         _kill: object = None) -> tuple[bool, str]:
    """Stop the background service. Returns (ok, note)."""
    alive = _alive or _is_alive
    kill = _kill or _terminate_process
    running, pid = is_running(data, alive)
    if not running:
        if pid is not None:
            _clear_pid(data)
            return (True, "reclaimed a stale lock (pid %d was already gone); "
                    "the background pet is stopped." % pid)
        _clear_pid(data)
        return (True, "the background pet is not running.")
    assert pid is not None
    try:
        gone = bool(kill(pid))  # type: ignore[operator]
    except Exception as exc:
        return (False, "the background pet (pid %d) did not stop (%s)."
                % (pid, exc))
    if gone:
        _clear_pid(data)
        return (True, "the background pet (pid %d) has stopped." % pid)
    return (False, "the background pet (pid %d) would not stop; "
            "it may need ending by hand." % pid)


def status(data: str | None = None, _alive: object = None) -> tuple[bool, str]:
    """Report service state. Returns (running, note)."""
    alive = _alive or _is_alive
    running, pid = is_running(data, alive)
    if running:
        extra = _status_detail(data)
        return (True, "the background pet is running (pid %d)%s."
                % (pid, extra))
    if pid is not None:
        return (False, "the background pet is stopped "
                "(stale lock for pid %d; start again to reclaim it)." % pid)
    return (False, "the background pet is stopped.")


def _status_detail(data: str | None = None) -> str:
    """Append active character and uptime to a running status line."""
    detail = ""
    try:
        from ..pet_core.packs import ensure_active as _ensure_packs
        _ensure_packs(data)
    except Exception:
        pass
    try:
        from ..pet_core.persistence import default_save_path, load

        save_target = default_save_path()
        if data is not None:
            save_target = os.path.join(data, "pet.json")
        state, _notice = load(save_target)
        detail += "; %s the %s" % (state.name, state.character_id)
    except Exception:
        pass
    try:
        born = os.path.getmtime(pid_path(data))
        uptime = max(0, int(time.time() - born))
        if uptime >= 3600:
            detail += "; up %dh%dm" % (uptime // 3600, (uptime % 3600) // 60)
        elif uptime >= 60:
            detail += "; up %dm%ds" % (uptime // 60, uptime % 60)
        else:
            detail += "; up %ds" % uptime
    except OSError:
        pass
    return detail


def logs(lines: int = 30, data: str | None = None) -> tuple[bool, str]:
    """Tail the service log. Returns (ok, text)."""
    try:
        count = int(lines)
    except (TypeError, ValueError):
        count = 30
    count = max(1, min(count, 500))
    target = log_path(data)
    try:
        from collections import deque

        with open(target, "r", encoding="utf-8") as handle:
            tail = [line.rstrip("\n") for line in deque(handle, maxlen=count)]
    except FileNotFoundError:
        return (False, "no service log yet; start the service first.")
    except OSError as exc:
        return (False, "could not read the service log (%s)." % exc)
    if not tail:
        return (True, "(service log is empty)")
    return (True, "\n".join(tail))


def run_loop(max_ticks: int | None = None, save_every: int = SAVE_EVERY_TICKS,
              data: str | None = None, tick_sec: float = TICK_HZ) -> int:
    """Run the background brain loop. Returns a process exit code.

    Ticks the headless brain at 10 Hz with debounced atomic saves and
    appends lifecycle lines to the service log. ``max_ticks`` caps the
    loop for tests; ``None`` runs until the process is stopped.
    """
    from ..pet_core.brain import Brain
    from ..pet_core.persistence import default_save_path, load, save
    from ..pet_core.personality import Personality

    try:
        from ..pet_core.packs import ensure_active as _ensure_packs
        _ensure_packs(data)
    except Exception:
        pass
    if tick_sec is None or not 0.05 <= float(tick_sec) <= 60.0:
        tick_hz = TICK_HZ
    else:
        tick_hz = float(tick_sec)
    try:
        cap = None if max_ticks is None else max(1, int(max_ticks))
    except (TypeError, ValueError):
        cap = None
    try:
        every = max(1, int(save_every))
    except (TypeError, ValueError):
        every = SAVE_EVERY_TICKS
    save_target = default_save_path()
    if data is not None:
        save_target = os.path.join(data, "pet.json")
    try:
        state, _notice = load(save_target)
    except Exception:
        from ..pet_core.state import PetState

        state, _notice = PetState(), "save file was corrupt; started fresh"
    personality = Personality(name=state.name, seed=None,
                              character_id=state.character_id)
    brain = Brain(state=state, personality=personality)
    _append_log("service loop started (%s the %s)" % (
        state.name, state.character_id), data)
    halt: list[bool] = []

    def _on_term(_signum: object, _frame: object) -> None:
        halt.append(True)

    try:
        signal.signal(signal.SIGTERM, _on_term)  # type: ignore[arg-type]
    except Exception:
        pass
    ticks = 0
    try:
        while (cap is None or ticks < cap) and not halt:
            brain.tick(1.0 / TICK_HZ)
            ticks += 1
            if ticks % every == 0:
                try:
                    save(brain.state, save_target)
                except OSError:
                    pass
            if cap is None:
                time.sleep(1.0 / tick_hz)
    except KeyboardInterrupt:
        pass
    try:
        save(brain.state, save_target)
    except OSError:
        pass
    _append_log("service loop stopped after %d ticks" % ticks, data)
    return 0


def _append_log(line: str, data: str | None = None) -> None:
    target = log_path(data)
    try:
        os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
        with open(target, "a", encoding="utf-8") as handle:
            handle.write("%s %s\n" % (
                time.strftime("%Y-%m-%d %H:%M:%S"), str(line)[:400]))
    except OSError:
        pass


def show_window(data: str | None = None) -> tuple[bool, str]:
    """Routing hint: open the window against the shared save dir."""
    _ = data
    return (True, "open the window with 'python -m pet gui'; "
            "it shares the service save, so nothing is lost.")


def hide_window() -> tuple[bool, str]:
    """Routing hint: the window closes but the service keeps ticking."""
    return (True, "close the window; the background service keeps "
            "the pet alive (check with 'python -m pet service status').")


def switch_character(character_id: object,
                     data: str | None = None) -> tuple[bool, str]:
    """Switch the shared-save character so service and window agree."""
    from ..pet_core import catalog as catalog_mod
    from ..pet_core.persistence import default_save_path, load, save

    record, notice = catalog_mod.get(character_id)
    save_target = default_save_path()
    if data is not None:
        save_target = os.path.join(data, "pet.json")
    try:
        state, load_notice = load(save_target)
    except Exception:
        from ..pet_core.state import PetState

        state, load_notice = PetState(), "save file was corrupt; started fresh"
    if load_notice and "starting fresh" not in load_notice \
            and "migrated" not in load_notice:
        pass
    state.character_id = record["id"]
    try:
        save(state, save_target)
    except OSError as exc:
        return (False, "could not save the character (%s)." % exc)
    text = "switched the shared pet to %s (%s)." % (record["name"],
                                                    record["id"])
    if notice:
        text = "%s %s" % (notice, text)
    return (True, text)
