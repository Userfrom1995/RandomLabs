"""Visual themes: named original palettes over the scene painter.

Classic is the shipped look; neon, amber, midnight, forest, and ember are
original alternates drawn from scratch for this project. A theme is a plain
dict of RGB roles plus wall_style and chrome scalars, so the scene painter,
docs, and tests all read the same source. Unknown names raise ValueError.
Reduced-flash handling lives in scene.paint (it forces steady glyphs),
never here.
"""

THEMES = ("classic", "neon", "amber", "midnight", "forest", "ember")

WALL_STYLES = ("ascii", "double", "round")
CHROMES = ("flat", "dots", "grid")

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
    "wall_style": "ascii",
    "chrome": "flat",
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
    "wall_style": "double",
    "chrome": "dots",
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
    "wall_style": "round",
    "chrome": "flat",
}

_MIDNIGHT = {
    "wall_fg": (150, 200, 255),
    "wall_bg": (4, 8, 24),
    "corridor_bg": (4, 8, 24),
    "dot": (200, 220, 255),
    "player": (255, 210, 40),
    "text": (200, 220, 255),
    "dim": (100, 130, 180),
    "fright": (140, 60, 255),
    "flash": (255, 255, 255),
    "eyes": (255, 255, 255),
    "fruit": (255, 60, 220),
    "ghosts": ((255, 80, 120), (200, 150, 255), (100, 220, 255), (255, 200, 90)),
    "wall_style": "double",
    "chrome": "grid",
}

_FOREST = {
    "wall_fg": (120, 180, 80),
    "wall_bg": (6, 20, 10),
    "corridor_bg": (6, 20, 10),
    "dot": (220, 230, 170),
    "player": (255, 176, 0),
    "text": (210, 240, 200),
    "dim": (110, 150, 100),
    "fright": (60, 120, 255),
    "flash": (255, 255, 255),
    "eyes": (255, 255, 255),
    "fruit": (255, 70, 60),
    "ghosts": ((255, 90, 60), (255, 200, 220), (110, 255, 190), (240, 230, 120)),
    "wall_style": "ascii",
    "chrome": "dots",
}

_EMBER = {
    "wall_fg": (255, 120, 30),
    "wall_bg": (24, 8, 6),
    "corridor_bg": (24, 8, 6),
    "dot": (255, 200, 150),
    "player": (255, 246, 220),
    "text": (255, 210, 170),
    "dim": (170, 110, 80),
    "fright": (80, 140, 255),
    "flash": (255, 255, 255),
    "eyes": (255, 255, 255),
    "fruit": (150, 255, 60),
    "ghosts": ((255, 70, 40), (255, 190, 210), (130, 255, 180), (255, 215, 100)),
    "wall_style": "round",
    "chrome": "grid",
}

_PALETTES = {"classic": _CLASSIC, "neon": _NEON, "amber": _AMBER,
             "midnight": _MIDNIGHT, "forest": _FOREST, "ember": _EMBER}


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
        lines.append("%-8s wall=%s player=%s fruit=%s style=%s chrome=%s" % (
            name, palette["wall_fg"], palette["player"], palette["fruit"],
            palette["wall_style"], palette["chrome"]))
    return "\n".join(lines)
