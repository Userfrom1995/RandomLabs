"""Per-OS capability probe for the companion window (stdlib only).

No GUI imports at module top: every function degrades to an honest
answer on headless systems, and the window shows an in-app note where
the platform denies a capability instead of failing silently.
"""

from __future__ import annotations

import importlib.util
import os
import sys

MIN_ALPHA = 0.3
MAX_ALPHA = 1.0
MIN_SCALE = 0.5
MAX_SCALE = 3.0
BASE_BOX_PX = 160
BUBBLE_HEIGHT_PX = 64


def platform_id() -> str:
    """Return one of windows, macos, linux, or unknown."""
    if sys.platform == "win32":
        return "windows"
    if sys.platform == "darwin":
        return "macos"
    if sys.platform.startswith("linux"):
        return "linux"
    return "unknown"


def tk_available() -> bool:
    """True when tkinter imports cleanly (display is probed separately)."""
    try:
        return importlib.util.find_spec("tkinter") is not None
    except Exception:
        return False


def has_display() -> bool:
    """Best-effort display check without opening a window."""
    plat = platform_id()
    if plat in ("windows", "macos"):
        return True
    if plat == "linux":
        return bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))
    return bool(os.environ.get("DISPLAY"))


def capabilities() -> dict:
    """Probe window capabilities; never raises, never touches the GUI."""
    plat = platform_id()
    tk = tk_available()
    display = has_display()
    can_show = tk and display
    # Alpha blending works on all three families through tkinter's
    # -alpha attribute; per-pixel transparentcolor is Windows-only, so
    # the window uses -alpha everywhere and reports honestly here.
    return {
        "platform": plat,
        "tkinter": tk,
        "display": display,
        "can_show_window": can_show,
        "topmost": can_show,
        "alpha": can_show,
        "per_pixel_transparency": can_show and plat == "windows",
        "notifications": "in-bubble notices (no OS service dependency)",
    }


def honest_note() -> str | None:
    """Human-readable note when the window cannot open, else None."""
    caps = capabilities()
    if caps["can_show_window"]:
        return None
    if not caps["tkinter"]:
        return ("No window today: tkinter is missing. "
                "Install the Python tkinter package for your OS, "
                "or use 'python -m pet run' for the headless companion.")
    if not caps["display"]:
        return ("No window today: no display found. "
                "Set DISPLAY (or Wayland) first, "
                "or use 'python -m pet run' for the headless companion.")
    return "No window today on this platform. Try 'python -m pet run'."


def clamp_alpha(value: object) -> float:
    """Clamp a transparency value to the supported 0.3..1.0 range."""
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return MAX_ALPHA
    if number != number:  # NaN
        return MAX_ALPHA
    if number < MIN_ALPHA:
        return MIN_ALPHA
    if number > MAX_ALPHA:
        return MAX_ALPHA
    return number


def clamp_scale(value: object) -> float:
    """Clamp a DPI/user scale factor to the supported 0.5..3.0 range."""
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 1.0
    if number != number:  # NaN
        return 1.0
    if number < MIN_SCALE:
        return MIN_SCALE
    if number > MAX_SCALE:
        return MAX_SCALE
    return number


def probe_tk_scaling(root: object) -> float:
    """Read the display scaling factor from a tkinter root, else 1.0."""
    try:
        raw = root.tk.call("tk", "scaling")
        number = float(raw)
    except Exception:
        return 1.0
    if number != number or number <= 0.0:
        return 1.0
    # tk scaling is pixels per point divided by 72dpi baseline; normalize
    # around the common 1.0 default and clamp to a sane range.
    return clamp_scale(number / 1.3333333333) if number > 2.0 else clamp_scale(number)


def window_size(scale: float) -> tuple[int, int]:
    """Pixel size of the companion window for a scale factor."""
    factor = clamp_scale(scale)
    box = int(round(BASE_BOX_PX * factor))
    return (box, box + int(round(BUBBLE_HEIGHT_PX * factor)))
