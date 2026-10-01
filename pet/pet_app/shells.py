"""Per-OS shell dispatcher (no GUI imports allowed here).

Routes startup and notification requests to the shell matching the
current platform. Every function fails closed with an honest note and
never raises, so the companion always has something truthful to show.
"""

from __future__ import annotations

from . import platform as platform_mod
from . import shell_linux as linux_shell
from . import shell_macos as macos_shell
from . import shell_win as win_shell


def current_shell_name(platform: str | None = None) -> str:
    """Shell key for this platform: windows, macos, linux, or unknown."""
    plat = platform if platform is not None else platform_mod.platform_id()
    if plat in ("windows", "macos", "linux"):
        return plat
    return "unknown"


def _shell(platform: str | None = None):
    name = current_shell_name(platform)
    if name == "windows":
        return win_shell
    if name == "macos":
        return macos_shell
    if name == "linux":
        return linux_shell
    return None


def set_startup(enabled: bool,
                platform: str | None = None) -> tuple[bool, str]:
    """Enable or disable launch at login on this platform."""
    shell = _shell(platform)
    if shell is None:
        return (False, "startup shortcuts are not supported on this "
                "platform; the pet must be started by hand.")
    try:
        return shell.set_startup(bool(enabled))
    except Exception as exc:
        return (False, "startup could not be updated (%s)" % exc)


def is_startup_enabled(platform: str | None = None) -> bool:
    """True when launch at login is currently enabled."""
    shell = _shell(platform)
    if shell is None:
        return False
    try:
        return bool(shell.is_startup_enabled())
    except Exception:
        return False


def notify(title: str, message: str,
           platform: str | None = None) -> tuple[bool, str]:
    """Best-effort OS notification, else an honest in-bubble fallback note."""
    shell = _shell(platform)
    if shell is None:
        return (False, "this platform has no notification path; "
                "the pet shows notices in its speech bubble instead.")
    try:
        return shell.notify(title, message)
    except Exception as exc:
        return (False, "the notification service errored (%s); "
                "the pet shows notices in its speech bubble "
                "instead." % exc)


def platform_notes(platform: str | None = None) -> str:
    """Human-readable per-OS integration notes for the settings dialog."""
    shell = _shell(platform)
    if shell is None:
        return ("This platform exposes no startup or notification "
                "integration; the pet runs headless-safe with in-bubble "
                "notices.")
    try:
        return shell.platform_notes()
    except Exception:
        return "Platform integration details are unavailable here."
