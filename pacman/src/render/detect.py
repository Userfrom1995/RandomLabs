"""Capability detection draft: override beats env heuristic beats Unicode.

Priority (deterministic, fully headless-testable):
  1. Explicit override (CLI flag): must name a known backend.
  2. PACMAN_RENDERER environment variable (same vocabulary).
  3. Live environment heuristic: Kitty when KITTY_WINDOW_ID is set or
     TERM_PROGRAM reports kitty/ghostty/wezterm-with-graphics; Sixel when
     the terminal advertises sixel support. Image backends additionally
     require Pillow (import probe); without it they fall through.
  4. Safe default: unicode, which always plays.

The 100 ms live-query probe (DA1/DECRQM) needs a real tty and lands with
the terminal loop; until then detection never blocks and never guesses an
image backend it cannot prove.
"""

KNOWN = ("kitty", "sixel", "unicode")


def _pillow_present():
    try:
        import PIL  # noqa: F401
        return True
    except ImportError:
        return False


def detect_renderer(override=None, env=None, pillow=None):
    """Pick a renderer name. Raises ValueError on an unknown override."""
    if override is not None:
        name = str(override).strip().lower()
        if name not in KNOWN:
            raise ValueError("unknown renderer: %r (want kitty/sixel/unicode)" % (override,))
        if name != "unicode" and not (pillow if pillow is not None else _pillow_present()):
            return "unicode"  # honest degrade: image path unavailable
        return name

    env = {} if env is None else dict(env)
    var = str(env.get("PACMAN_RENDERER", "")).strip().lower()
    if var:
        return detect_renderer(override=var, env={}, pillow=pillow)

    have_images = pillow if pillow is not None else _pillow_present()
    term = str(env.get("TERM", "")).lower()
    term_program = str(env.get("TERM_PROGRAM", "")).lower()

    if have_images:
        if env.get("KITTY_WINDOW_ID") or term_program in ("kitty", "ghostty"):
            return "kitty"
        if "sixel" in term or env.get("SIXEL_SUPPORT") == "1":
            return "sixel"
        if term_program in ("wezterm", "contour", "konsole") and env.get("IMAGE_SUPPORT") == "1":
            return "sixel"
    return "unicode"
