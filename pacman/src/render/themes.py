"""Visual themes: named original palettes over the scene painter.

Classic is the shipped look; neon and amber are original alternates drawn
from scratch for this project. A theme is a plain dict of RGB roles, so
the scene painter, docs, and tests all read the same source. Unknown names
raise ValueError. Reduced-flash handling lives in scene.paint (it forces
steady glyphs), never here.
"""

THEMES = ("classic", "neon", "amber")

_CLASSIC = {
    "wall_fg": (33, 33, 222),
    "wall_bg": (0, 0, 0),
    "corridor_bg": (0, 0, 0),
    "dot": (255, 184, 174),
    "player": (255, 255, 0),
    "text": (255, 255, 255),
    "dim": (150, 150, 150),
    "fright": (33, 33, 255),
    "flash": (255, 255, 255),
    "eyes": (255, 255, 255),
    "fruit": (255, 80, 80),
    "ghosts": ((255, 0, 0), (255, 184, 255), (0, 255, 255), (255, 184, 82)),
}

_NEON = {
    "wall_fg": (0, 229, 255),
    "wall_bg": (8, 0, 24),
    "corridor_bg": (8, 0, 24),
    "dot": (255, 255, 150),
    "player": (128, 255, 0),
    "text": (224, 255, 255),
    "dim": (110, 160, 190),
    "fright": (120, 40, 255),
    "flash": (255, 255, 255),
    "eyes": (255, 255, 255),
    "fruit": (255, 45, 150),
    "ghosts": ((255, 45, 85), (255, 150, 255), (0, 255, 200), (255, 200, 40)),
}

_AMBER = {
    "wall_fg": (255, 176, 0),
    "wall_bg": (26, 13, 0),
    "corridor_bg": (26, 13, 0),
    "dot": (255, 214, 140),
    "player": (80, 255, 80),
    "text": (255, 200, 120),
    "dim": (170, 120, 60),
    "fright": (60, 120, 255),
    "flash": (255, 246, 220),
    "eyes": (255, 246, 220),
    "fruit": (255, 90, 40),
    "ghosts": ((255, 60, 30), (255, 200, 200), (120, 255, 170), (255, 220, 90)),
}

_PALETTES = {"classic": _CLASSIC, "neon": _NEON, "amber": _AMBER}


def check(name):
    if name not in THEMES:
        raise ValueError("unknown theme: %r (want %s)" % (name, "/".join(THEMES)))
    return name


def get(name="classic"):
    """Return a copy of the palette dict for a theme name."""
    check(name)
    palette = dict(_PALETTES[name])
    palette["ghosts"] = tuple(palette["ghosts"])
    return palette


def describe():
    lines = []
    for name in THEMES:
        palette = _PALETTES[name]
        lines.append("%-7s wall=%s player=%s fruit=%s" % (
            name, palette["wall_fg"], palette["player"], palette["fruit"]))
    return "\n".join(lines)
