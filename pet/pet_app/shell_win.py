"""Windows startup and notification shell (stdlib only, never raises).

Startup uses the per-user Registry Run key (no admin rights needed).
Notifications are intentionally in-bubble: Windows toast integration
would need third-party packages, so this shell says so honestly and
the companion renders notices in its speech bubble instead.
"""

from __future__ import annotations

import sys

RUN_VALUE_NAME = "DesktopPet"


def _command() -> str:
    exe = sys.executable or "python"
    return '"%s" -m pet gui' % exe


def _winreg():
    try:
        import winreg  # type: ignore[import]
    except Exception:
        return None
    return winreg


def _key_path() -> str:
    return r"Software\Microsoft\Windows\CurrentVersion\Run"


def set_startup(enabled: bool, _winreg: object = "auto") -> tuple[bool, str]:
    """Enable or disable launch at login. Returns (ok, note)."""
    winreg = _winreg if _winreg != "auto" else _winreg_module()
    if winreg is None:
        return (False, "startup is only available on Windows "
                "(this system has no Registry service)")
    try:
        if enabled:
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER,
                                  _key_path()) as key:
                winreg.SetValueEx(key, RUN_VALUE_NAME, 0,
                                  winreg.REG_SZ, _command())
            return (True, "Desktop Pet will start when you sign in.")
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, _key_path(),
                                0, winreg.KEY_SET_VALUE) as key:
                try:
                    winreg.DeleteValue(key, RUN_VALUE_NAME)
                except FileNotFoundError:
                    pass
        except FileNotFoundError:
            pass
        return (True, "Desktop Pet will no longer start at sign-in.")
    except OSError as exc:
        return (False, "could not update the Run key (%s)" % exc)


def is_startup_enabled(_winreg: object = "auto") -> bool:
    """True when the Run key holds a Desktop Pet entry."""
    winreg = _winreg if _winreg != "auto" else _winreg_module()
    if winreg is None:
        return False
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, _key_path(),
                            0, winreg.KEY_READ) as key:
            value, _kind = winreg.QueryValueEx(key, RUN_VALUE_NAME)
        return bool(value)
    except (OSError, ValueError):
        return False


def notify(title: str, message: str) -> tuple[bool, str]:
    """Windows has no bundled toast path: fail closed to in-bubble."""
    _ = (title, message)
    return (False, "Windows toasts are not bundled; the pet shows "
            "notices in its speech bubble instead.")


def platform_notes() -> str:
    return ("Startup uses the per-user Registry Run key. "
            "Notifications appear in the pet bubble (no toast service).")


def _winreg_module():
    return _winreg()
