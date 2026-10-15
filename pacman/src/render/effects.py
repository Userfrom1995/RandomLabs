"""Tick-driven visual effects: animation frames from game counters.

Every helper here is pure (no I/O) and never raises on sane input, so
the scene composer can call them every frame with live counters:
game.tick_count for loops, game.state_t with tuning.DEATH_SEQUENCE_S
or tuning.LEVEL_CLEAR_SEQUENCE_S for one-shot sequences, and the
fright flags for ghost styling.

Design notes:
- Periods are in game ticks (120 Hz simulation), so mouth_open period
  16 is about 0.13 s and energizer period 36 (3 frames x 12) is 0.3 s.
- Glyphs stay single-column so placements agree across backends.
- reduced_flash collapses blinking variants to their steady form for
  photosensitive players; the composer passes it straight through.
- wall_tint_tick is intentionally trivial: it returns the tick during
  a level-clear celebration and None otherwise, and the composer maps
  None to the palette wall color else to RAINBOW[tick // 10 % 6].
"""

PLAYER_OPEN = {"left": "<", "right": ">", "up": "^", "down": "v"}
CLOSED_GLYPH = "o"

ENERGIZER_FRAMES = ("O", "o", "*")

DEATH_GLYPHS = ("x", "*", "+", " ")

RAINBOW = (
    (255, 0, 0),
    (255, 165, 0),
    (255, 255, 0),
    (0, 255, 0),
    (0, 128, 255),
    (178, 102, 255),
)

# Fruit sparkle phases keyed by (tick // 16) % 4. Each phase holds 1-2
# neighbor offsets around the fruit tile; all stay within Chebyshev
# distance 2 and none is the origin, so sparkles ring the fruit.
_SPARKLE_PHASES = (
    ((1, 0), (-1, 0)),
    ((0, 1),),
    ((1, 1), (-1, -1)),
    ((0, -1), (2, 0)),
)


def _coerce_tick(tick):
    """Coerce a tick counter to int (0 on garbage). Never raises."""
    try:
        return int(tick)
    except (TypeError, ValueError):
        return 0


def mouth_open(tick):
    """True when the player mouth is open. Period 16: open 10, closed 6."""
    t = _coerce_tick(tick)
    return (t % 16) < 10


def player_glyph(direction, tick):
    """Player glyph: open arrow for the heading, else CLOSED_GLYPH.

    Unknown directions fall back to "<" when open.
    """
    try:
        glyph = PLAYER_OPEN.get(direction, "<")
    except Exception:
        glyph = "<"
    if mouth_open(tick):
        return glyph
    return CLOSED_GLYPH


def energizer_glyph(tick, reduced_flash=False):
    """Energizer frame: reduced_flash pins "O", else cycle 3 frames.

    The cycle advances one frame per 12 ticks: (tick // 12) % 3.
    """
    if reduced_flash:
        return "O"
    t = _coerce_tick(tick)
    try:
        return ENERGIZER_FRAMES[(t // 12) % 3]
    except Exception:
        return "O"


def fruit_glyph(tick):
    """Fruit glyph: "F" on even 12-tick windows, else "f" (case pulse)."""
    t = _coerce_tick(tick)
    return "F" if ((t // 12) % 2 == 0) else "f"


def sparkle_offsets(tick):
    """Neighbor offsets ringing the fruit tile for this tick.

    Cycles 4 phases from tick // 16. Returns a tuple of (dx, dy)
    tuples, always within Chebyshev distance 2, never (0, 0).
    """
    t = _coerce_tick(tick)
    try:
        return _SPARKLE_PHASES[(t // 16) % 4]
    except Exception:
        return _SPARKLE_PHASES[0]


def death_frame(state_t, duration):
    """Death animation frame 0..3 from elapsed time over duration.

    Maps the state_t / duration fraction to 0..3 (matching
    DEATH_GLYPHS): int(fraction * 4) clamped. Negative elapsed
    coerces to 0, and non-positive durations yield 0.
    """
    try:
        d = float(duration)
    except (TypeError, ValueError):
        return 0
    if not (d > 0):
        return 0
    try:
        t = float(state_t)
    except (TypeError, ValueError):
        return 0
    if not (t > 0):
        return 0
    frame = int((t / d) * 4)
    if frame < 0:
        return 0
    if frame > 3:
        return 3
    return frame


def fright_glyph(tick, flashing):
    """Frightened ghost glyph: "0" on flashing odd windows, else "O"."""
    t = _coerce_tick(tick)
    try:
        phase = (t // 8) % 2
    except Exception:
        phase = 0
    if flashing and phase:
        return "0"
    return "O"


def wall_tint_tick(tick, clearing):
    """Rainbow source for clearing celebrations: tick or None.

    Returns the coerced tick when clearing is truthy, else None. The
    composer maps None to the palette wall color, else to
    RAINBOW[tick // 10 % 6].
    """
    if not clearing:
        return None
    return _coerce_tick(tick)


def ghost_shimmer(tick):
    """True on even 8-tick windows, for fright shimmer styling."""
    t = _coerce_tick(tick)
    return (t // 8) % 2 == 0
