"""System-tray abstraction for the desktop pet (stdlib only, GUI-free).

One contract, ordered backends, honest fallback:

1. ``pystray`` backend - used only when the optional ``pystray`` package
   is already installed (a packaging extra, never a hard dependency and
   never imported at module top; probed with ``importlib.util``).
2. Native best-effort shims - Windows ``Shell_NotifyIcon`` via ctypes,
   macOS Cocoa best-effort, Linux SNI / ``notify-send`` best-effort.
   These report availability without opening any icon, so headless
   systems degrade instead of raising.
3. Stdlib mini-controller - always available. There is no fake tray
   icon: the companion window itself (or the speech bubble) acts as the
   controller, and every denied path renders the shared honest note.

The tkinter shell owns the real icon wiring; this module holds every
decision so unit tests drive it without a display.
"""

from __future__ import annotations

import importlib.util

BACKEND_PYSTRAY = "pystray"
BACKEND_NATIVE = "native"
BACKEND_MINI = "mini-controller"

_BACKEND_ORDER = (BACKEND_PYSTRAY, BACKEND_NATIVE, BACKEND_MINI)


def pystray_available(_finder: object = None) -> bool:
    """True when the optional ``pystray`` extra is installed."""
    find = _finder or importlib.util.find_spec
    try:
        return find("pystray") is not None
    except Exception:
        return False


def native_backend_note(platform: str) -> tuple[bool, str]:
    """Best-effort native tray note for a platform id.

    Returns (possible, note). ``possible`` is True where the OS ships a
    tray path the shell can attempt (Windows notify icon, macOS menu
    extras, Linux status-notifier); headless or unknown platforms
    report False with an honest note. Never touches the GUI.
    """
    name = str(platform or "unknown").strip().lower()
    if name == "windows":
        return (True, "Windows notify icon via Shell_NotifyIcon (ctypes shim).")
    if name == "macos":
        return (True, "macOS menu-bar icon, best-effort (no bundled tray service).")
    if name == "linux":
        return (True, "Linux status-notifier icon, best-effort "
                "(needs a tray host, else the mini-controller).")
    return (False, "no native tray path on platform %r; "
            "the mini-controller stays in charge." % (name,))


def pick_backend(platform: str, _finder: object = None) -> tuple[str, str]:
    """Pick the first usable backend for a platform.

    Returns (backend, note). ``pystray`` wins when installed, else the
    native shim where the platform offers one, else the stdlib
    mini-controller which is always available.
    """
    if pystray_available(_finder):
        return (BACKEND_PYSTRAY, "tray via the installed pystray extra.")
    possible, native_note = native_backend_note(platform)
    if possible:
        return (BACKEND_NATIVE, native_note)
    return (BACKEND_MINI, "no tray host here; "
            "the mini-controller (companion window) stays in charge.")


def probe(platform: str | None = None,
          _finder: object = None) -> dict:
    """Describe tray support without opening anything. Never raises."""
    from . import platform as platform_mod

    plat = platform or platform_mod.platform_id()
    backend, note = pick_backend(plat, _finder)
    display = platform_mod.has_display()
    return {
        "platform": plat,
        "backend": backend,
        "note": note,
        "display": display,
        "can_show_icon": display and backend in (BACKEND_PYSTRAY,
                                                 BACKEND_NATIVE),
        "mini_controller": True,
    }


def honest_note(platform: str | None = None,
                _finder: object = None) -> str | None:
    """Human-readable note when no real icon can show, else None."""
    info = probe(platform, _finder)
    if info["can_show_icon"]:
        return None
    if not info["display"]:
        return ("No tray icon today: no display found. "
                "The companion window doubles as the controller; "
                "use 'python -m pet service status' to check the background pet.")
    return ("No tray host answered (%s). The companion window doubles "
            "as the controller." % info["note"])


class TrayController:
    """Headless tray state: visibility, tooltip, menu, action routing.

    The tkinter shell forwards real icon events here; tests drive the
    same API with no display. ``on_action`` maps menu action ids to
    zero-argument callables returning bubble text (or None).
    """

    def __init__(self, platform: str | None = None,
                 _finder: object = None) -> None:
        from . import platform as platform_mod

        self.platform = platform or platform_mod.platform_id()
        self._finder = _finder
        self.backend, self.backend_note = pick_backend(self.platform,
                                                       _finder)
        self.visible = False
        self.tooltip = "Desktop Pet"
        self._menu: list[tuple[str, str]] = []
        self.on_action: dict[str, object] = {}

    def default_menu(self) -> list[tuple[str, str]]:
        """Menu model shared with the window right-click menu."""
        from .controller import menu_model

        return menu_model("idle", True)

    def set_menu(self, items: list[tuple[str, str]]) -> list[tuple[str, str]]:
        """Adopt menu items; bad entries are dropped, never stored."""
        kept: list[tuple[str, str]] = []
        for entry in items or []:
            try:
                action, label = entry
            except (TypeError, ValueError):
                continue
            action_text = str(action or "").strip()
            label_text = str(label or "").strip()
            if not action_text or not label_text:
                continue
            kept.append((action_text, label_text[:80]))
        self._menu = kept
        return list(self._menu)

    def menu(self) -> list[tuple[str, str]]:
        return list(self._menu)

    def set_tooltip(self, text: object) -> str:
        """Adopt a tooltip; empty input keeps the previous one."""
        cleaned = str(text or "").strip()
        if cleaned:
            self.tooltip = cleaned[:120]
        return self.tooltip

    def show(self) -> tuple[bool, str]:
        """Mark the icon shown. Returns (ok, note)."""
        info = probe(self.platform, getattr(self, "_finder", None))
        if not info["can_show_icon"]:
            self.visible = False
            note = honest_note(self.platform, getattr(self, "_finder", None))
            return (False, note or "tray unavailable; mini-controller active.")
        self.visible = True
        return (True, "tray icon shown (%s)." % self.backend)

    def hide(self) -> tuple[bool, str]:
        """Mark the icon hidden. Always succeeds."""
        self.visible = False
        return (True, "tray icon hidden; the window stays reachable.")

    def handle_action(self, action: object) -> tuple[str | None, bool]:
        """Route a tray menu action through the registered handler.

        Returns (text, quit_flag). Unknown actions answer (None, False)
        instead of raising; a handler exception is reported as text.
        """
        key = str(action or "").strip()
        if not key:
            return (None, False)
        handler = self.on_action.get(key)
        if handler is None:
            return (None, False)
        try:
            result = handler()  # type: ignore[operator]
        except Exception as exc:
            return ("tray action %r did not answer (%s)" % (key, exc), False)
        if isinstance(result, tuple) and len(result) == 2:
            return result
        if isinstance(result, bool):
            return (None, result)
        if result is None:
            return (None, False)
        return (str(result), False)

    def describe(self) -> str:
        return ("tray backend: %s (%s) visible: %s tooltip: %s items: %d" % (
            self.backend, self.backend_note, self.visible,
            self.tooltip, len(self._menu)))
