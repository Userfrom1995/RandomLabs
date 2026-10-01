"""Linux startup and notification shell (stdlib only, never raises).

Startup uses an XDG autostart .desktop file (works across GNOME, KDE,
and other freedesktop environments). Notifications try `notify-send`
best-effort and otherwise fail closed to an honest note so the
companion renders in-bubble notices instead.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys

AUTOSTART_FILENAME = "desktop-pet.desktop"


def autostart_dir(config_home: str | None = None) -> str:
    if config_home is None:
        config_home = (os.environ.get("XDG_CONFIG_HOME")
                       or os.path.join(os.path.expanduser("~"), ".config"))
    return os.path.join(config_home, "autostart")


def autostart_path(config_home: str | None = None) -> str:
    return os.path.join(autostart_dir(config_home), AUTOSTART_FILENAME)


def _exec_line() -> str:
    exe = sys.executable or "python3"
    return "%s -m pet gui" % exe


def _desktop_entry() -> str:
    return (
        "[Desktop Entry]\n"
        "Type=Application\n"
        "Name=Desktop Pet\n"
        "Comment=Cross-platform interactive desktop companion\n"
        "Exec=%s\n"
        "X-GNOME-Autostart-enabled=true\n" % _exec_line()
    )


def set_startup(enabled: bool,
                config_home: str | None = None) -> tuple[bool, str]:
    """Enable or disable launch at login. Returns (ok, note)."""
    target = autostart_path(config_home)
    try:
        if enabled:
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "w", encoding="utf-8") as handle:
                handle.write(_desktop_entry())
            return (True, "Desktop Pet will start when you log in.")
        try:
            os.unlink(target)
        except FileNotFoundError:
            pass
        return (True, "Desktop Pet will no longer start at login.")
    except OSError as exc:
        return (False, "could not update the autostart entry (%s)" % exc)


def is_startup_enabled(config_home: str | None = None) -> bool:
    """True when the autostart .desktop file exists and is non-empty."""
    try:
        return os.path.getsize(autostart_path(config_home)) > 0
    except OSError:
        return False


def _notify_send() -> str | None:
    try:
        return shutil.which("notify-send")
    except Exception:
        return None


def notify(title: str, message: str, _runner: object = None) -> tuple[bool, str]:
    """Best-effort desktop notification via notify-send."""
    heading = str(title or "Desktop Pet")[:120]
    body = str(message or "")[:400]
    if not body.strip():
        return (False, "nothing to notify: the message is empty.")
    exe = _notify_send()
    if exe is None:
        return (False, "notify-send is unavailable; the pet shows "
                "notices in its speech bubble instead.")
    run = _runner or subprocess.run
    try:
        proc = run([exe, heading, body], capture_output=True,
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
    return ("Startup uses an XDG autostart .desktop file. "
            "Notifications try notify-send, else the pet bubble.")
