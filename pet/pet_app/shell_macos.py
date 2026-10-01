"""macOS startup and notification shell (stdlib only, never raises).

Startup uses a per-user LaunchAgent plist (no admin rights needed).
Notifications try `osascript` best-effort and otherwise fail closed to
an honest note so the companion renders in-bubble notices instead.
"""

from __future__ import annotations

import os
import plistlib
import shutil
import subprocess
import sys

AGENT_LABEL = "com.desktoppet.pet"
AGENT_FILENAME = AGENT_LABEL + ".plist"


def agent_dir(home: str | None = None) -> str:
    base = home or os.path.expanduser("~")
    return os.path.join(base, "Library", "LaunchAgents")


def agent_path(home: str | None = None) -> str:
    return os.path.join(agent_dir(home), AGENT_FILENAME)


def _program_arguments() -> list[str]:
    exe = sys.executable or "python3"
    return [exe, "-m", "pet", "gui"]


def set_startup(enabled: bool, home: str | None = None) -> tuple[bool, str]:
    """Enable or disable launch at login. Returns (ok, note)."""
    target = agent_path(home)
    try:
        if enabled:
            os.makedirs(os.path.dirname(target), exist_ok=True)
            payload = {
                "Label": AGENT_LABEL,
                "ProgramArguments": _program_arguments(),
                "RunAtLoad": True,
            }
            with open(target, "wb") as handle:
                plistlib.dump(payload, handle)
            return (True, "Desktop Pet will start when you log in.")
        try:
            os.unlink(target)
        except FileNotFoundError:
            pass
        return (True, "Desktop Pet will no longer start at login.")
    except OSError as exc:
        return (False, "could not update the LaunchAgent (%s)" % exc)


def is_startup_enabled(home: str | None = None) -> bool:
    """True when the LaunchAgent plist exists and parses."""
    try:
        with open(agent_path(home), "rb") as handle:
            data = plistlib.load(handle)
        return bool(data.get("RunAtLoad", False))
    except (OSError, ValueError, plistlib.InvalidFileException):
        return False
    except Exception:
        return False


def _osascript() -> str | None:
    try:
        return shutil.which("osascript")
    except Exception:
        return None


def notify(title: str, message: str, _runner: object = None) -> tuple[bool, str]:
    """Best-effort Notification Center post via osascript."""
    heading = str(title or "Desktop Pet").replace('"', "'")[:120]
    body = str(message or "").replace('"', "'")[:400]
    if not body.strip():
        return (False, "nothing to notify: the message is empty.")
    exe = _osascript()
    if exe is None:
        return (False, "osascript is unavailable; the pet shows "
                "notices in its speech bubble instead.")
    script = 'display notification "%s" with title "%s"' % (body, heading)
    run = _runner or subprocess.run
    try:
        proc = run([exe, "-e", script], capture_output=True,
                   text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return (False, "the notification service did not answer; "
                "the pet shows notices in its speech bubble instead.")
    except Exception:
        return (False, "the notification service did not answer; "
                "the pet shows notices in its speech bubble instead.")
    if getattr(proc, "returncode", 1) != 0:
        return (False, "the notification service refused the note; "
                "the pet shows notices in its speech bubble instead.")
    return (True, "notification posted.")


def platform_notes() -> str:
    return ("Startup uses a per-user LaunchAgent plist. "
            "Notifications try osascript, else the pet bubble.")
