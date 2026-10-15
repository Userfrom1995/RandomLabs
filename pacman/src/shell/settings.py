"""In-game settings model: pure option metadata plus read/write helpers.

Options are identified by stable string ids (OPTIONS, in paint order):
theme, mode, level, scale, effects, reduced_flash. A settings state is
any namespace object with attributes theme (str), mode (str), level
(int 1..32), scale_mode (str), effects (bool), reduced_flash (bool) -
e.g. the shell app state.
String-facing helpers (get/set/cycle) map the two bools to "on"/"off";
snapshot()/apply_snapshot() use the raw bool dict form shared with
config-file load. Pure data/logic: no I/O, fully headless-testable.
"""

OPTIONS = ("theme", "mode", "level", "scale", "effects", "reduced_flash")

ON_OFF = ("on", "off")
SCALE_CHOICES = ("auto", "classic", "wide", "full")
LEVEL_MIN = 1
LEVEL_MAX = 32
LEVEL_CHOICES = tuple(str(n) for n in range(LEVEL_MIN, LEVEL_MAX + 1))

_DESCRIBE = {
    "theme": "theme: color palette",
    "mode": "mode: ruleset",
    "level": "level: starting maze (win advances to the next)",
    "scale": "scale: magnification",
    "effects": "effects: extra visuals",
    "reduced_flash": "reduced flash: steady glyphs",
}

_LABEL = {
    "theme": "theme",
    "mode": "mode",
    "level": "level",
    "scale": "scale",
    "effects": "effects",
    "reduced_flash": "reduced flash",
}

_ATTRS = {
    "theme": "theme",
    "mode": "mode",
    "level": "level",
    "scale": "scale_mode",
    "effects": "effects",
    "reduced_flash": "reduced_flash",
}


def _require_option(option):
    if option not in OPTIONS:
        raise ValueError("unknown settings option: %r" % (option,))


def choices(option):
    """Tuple of allowed string values for an option id."""
    _require_option(option)
    if option == "theme":
        from render import themes
        return tuple(sorted(themes.THEMES))
    if option == "mode":
        from engine import modes
        return tuple(sorted(modes.MODES))
    if option == "scale":
        return tuple(SCALE_CHOICES)
    if option == "level":
        return tuple(LEVEL_CHOICES)
    return tuple(ON_OFF)


def _bool_to_str(value):
    return "on" if value else "off"


def _parse_on_off(value):
    if isinstance(value, bool):
        return _bool_to_str(value)
    if isinstance(value, str) and value.strip().lower() in ON_OFF:
        return value.strip().lower()
    raise ValueError("want 'on' or 'off', got %r" % (value,))


def _parse_level(value):
    """Coerce a level to int >= 1. Raises ValueError otherwise.

    The settings screen cycles 1..32 (LEVEL_CHOICES); higher endless-
    ramp levels set via --level or the config file still read, display,
    and snapshot honestly, and cycling from one restarts at an end.
    """
    try:
        text = str(value).strip()
    except Exception:
        raise ValueError("want level >= %d, got %r" % (LEVEL_MIN, value))
    try:
        number = int(text)
    except (TypeError, ValueError):
        raise ValueError("want level >= %d, got %r" % (LEVEL_MIN, value))
    if number < LEVEL_MIN:
        raise ValueError("want level >= %d, got %r" % (LEVEL_MIN, value))
    return number


def get(state, option):
    """Read the current string value of an option from a state namespace."""
    _require_option(option)
    attr = _ATTRS[option]
    if option in ("effects", "reduced_flash"):
        return _bool_to_str(bool(getattr(state, attr)))
    if option == "level":
        return str(_parse_level(getattr(state, attr)))
    return str(getattr(state, attr))


def set_value(state, option, value):
    """Validate via the real check() fns and write through; return str."""
    _require_option(option)
    if option == "theme":
        from render import themes
        if not isinstance(value, str):
            raise ValueError("want theme name, got %r" % (value,))
        themes.check(value)
        state.theme = value
        return value
    if option == "mode":
        from engine import modes
        if not isinstance(value, str):
            raise ValueError("want mode name, got %r" % (value,))
        modes.check(value)
        state.mode = value
        return value
    if option == "scale":
        from render import scale as scale_mod
        if not isinstance(value, str):
            raise ValueError("want scale mode, got %r" % (value,))
        scale_mod.check(value)
        state.scale_mode = value
        return value
    if option == "level":
        picked = _parse_level(value)
        state.level = picked
        return str(picked)
    normalized = _parse_on_off(value)
    if option == "effects":
        state.effects = (normalized == "on")
    else:
        state.reduced_flash = (normalized == "on")
    return normalized


def cycle(state, option, delta):
    """Step to the next/previous choice with wraparound; return new str."""
    _require_option(option)
    try:
        step = int(delta)
    except (TypeError, ValueError):
        raise ValueError("delta must be an int, got %r" % (delta,))
    allowed = choices(option)
    current = get(state, option)
    try:
        index = list(allowed).index(current)
    except ValueError:
        # Hand-mutated state outside the legal set: restart from an end
        # so cycling still lands on a legal choice deterministically.
        picked = allowed[0] if step >= 0 else allowed[-1]
        return set_value(state, option, picked)
    new_value = allowed[(index + step) % len(allowed)]
    return set_value(state, option, new_value)


def describe(option):
    """Short human line describing an option id."""
    _require_option(option)
    return _DESCRIBE[option]


def note(option):
    """Honesty note for an option id ('' when none applies)."""
    _require_option(option)
    if option == "mode":
        return "applies to next run"
    if option == "level":
        return "applies to next run (above 32 use --level)"
    return ""


def row_label(state, option):
    """Paint-ready row, e.g. 'theme: neon'."""
    _require_option(option)
    return "%s: %s" % (_LABEL[option], get(state, option))


def snapshot(state):
    """Raw dict {theme, mode, level, scale, effects, reduced_flash}."""
    return {
        "theme": str(state.theme),
        "mode": str(state.mode),
        "level": int(state.level),
        "scale": str(state.scale_mode),
        "effects": bool(state.effects),
        "reduced_flash": bool(state.reduced_flash),
    }


def apply_snapshot(state, snap):
    """Validate every key first, then apply; return snapshot(state).

    All six values are checked before any write lands, so a bad
    snapshot leaves the live state untouched.
    """
    if not isinstance(snap, dict):
        raise ValueError("snapshot must be a dict, got %r" % (snap,))
    for key in ("theme", "mode", "level", "scale", "effects", "reduced_flash"):
        if key not in snap:
            raise ValueError("snapshot missing key: %r" % (key,))
    from render import themes as themes_mod
    from engine import modes as modes_mod
    from render import scale as scale_mod
    if not isinstance(snap["theme"], str):
        raise ValueError("want theme name, got %r" % (snap["theme"],))
    themes_mod.check(snap["theme"])
    if not isinstance(snap["mode"], str):
        raise ValueError("want mode name, got %r" % (snap["mode"],))
    modes_mod.check(snap["mode"])
    _parse_level(snap["level"])
    if not isinstance(snap["scale"], str):
        raise ValueError("want scale mode, got %r" % (snap["scale"],))
    scale_mod.check(snap["scale"])
    _parse_on_off(snap["effects"])
    _parse_on_off(snap["reduced_flash"])
    set_value(state, "theme", snap["theme"])
    set_value(state, "mode", snap["mode"])
    set_value(state, "level", snap["level"])
    set_value(state, "scale", snap["scale"])
    set_value(state, "effects", snap["effects"])
    set_value(state, "reduced_flash", snap["reduced_flash"])
    return snapshot(state)
