"""Single home for every authored gameplay number.

Clean-room rule: all tables below are originals written for this project from
behavioral descriptions of the arcade genre (pellet maze, four ghosts, power
pellets, fruit bonuses, escalating levels). They are tuned for feel, not
copied from any existing game. Provenance is noted per table.

Conventions:
  - Speeds are in tiles per second at 100 percent.
  - Level index is 1-based; curves clamp at their last entry.
  - Durations are in seconds.
"""

SIM_HZ = 120
STEP = 1.0 / SIM_HZ

# Base cruise speed of the player on level 1. Feels brisk on a 28-wide maze
# while staying controllable at 120 Hz simulation.
PLAYER_BASE_SPEED = 8.5

# Fractional player speed per level (index 0 -> level 1). Ramps gently, then
# holds: endless levels stay hard but fair.
PLAYER_SPEED_CURVE = (1.00, 1.03, 1.06, 1.09, 1.12, 1.14, 1.16, 1.18, 1.20)

# Ghost cruise as a fraction of current player speed. Slightly slower than
# the player in open corridors so skilled cornering escapes; tunnel and
# fright modifiers apply on top.
GHOST_SPEED_FRACTION = 0.96
GHOST_TUNNEL_FRACTION = 0.55
PLAYER_TUNNEL_FRACTION = 0.95
FRIGHT_PLAYER_FRACTION = 1.04
FRIGHT_GHOST_FRACTION = 0.62

# Scatter/chase wave clock: (scatter_seconds, chase_seconds) pairs. Authored
# from scratch: long opening scatter so the player can clear the bottom,
# then increasingly aggressive waves. The final wave holds chase.
WAVE_SCHEDULE = (
    (7.0, 20.0),
    (7.0, 20.0),
    (5.0, 20.0),
    (5.0, 20.0),
    (3.0, 25.0),
    (3.0, 25.0),
    (1.0, 1.0e9),
)
# Higher levels shorten the early scatter phases (seconds shaved per level,
# floored at 1.0 s). Index 0 -> level 1 (no shave).
WAVE_SCATTER_SHAVE_PER_LEVEL = 1.0

# Fright (powered) duration per level in seconds. Long early, then a steep
# falloff so late levels reward routing over button-pressing.
FRIGHT_DURATION_CURVE = (6.0, 5.0, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0)
FRIGHT_FLASH_THRESHOLD = 1.5  # last seconds render as flashing warning

# Ghost-chain bonus for eating ghosts on one power pellet.
GHOST_CHAIN_SCORE = (200, 400, 800, 1600)

DOT_SCORE = 10
ENERGIZER_SCORE = 50
EXTRA_LIFE_AT = 10000

# Fruit: (level_first_seen, points). Original tier list; values rise with
# depth to reward survival. Spawned under the ghost house, expires after
# FRUIT_LIFETIME_S unless eaten.
FRUIT_TIERS = (
    (1, 100),
    (2, 300),
    (3, 500),
    (4, 700),
    (5, 1000),
    (7, 1500),
    (9, 2000),
    (11, 3000),
    (13, 5000),
)
FRUIT_SPAWN_DOTS_EATEN = (70, 170)  # appear after this many dots per level
FRUIT_LIFETIME_S = 9.5

# Ghost-house exit: dots the player must eat before each ghost walks out.
# (Level 1 values; higher levels scale down to a floor.)
HOUSE_DOT_COUNTERS = (0, 7, 17, 32)
HOUSE_COUNTER_MIN = (0, 0, 0, 0)
HOUSE_IDLE_TIMEOUT_S = 4.0  # no dot eaten -> release next ghost anyway

# Elroy stages: remaining-dots thresholds that enrage the leader ghost.
# (dots_left, speed_bonus_fraction, wave_skip)
ELROY_STAGES = (
    (20, 0.03, False),
    (10, 0.06, True),
)

START_LIVES = 3
DEATH_SEQUENCE_S = 1.4
LEVEL_CLEAR_SEQUENCE_S = 2.0
TURN_WINDOW_TILES = 0.35  # buffered-turn cornering assist window


def _clamped(curve, level):
    """Pick curve[level-1], holding the last entry for deep levels."""
    if level < 1:
        raise ValueError("level must be >= 1")
    return curve[min(level, len(curve)) - 1]


def player_speed(level):
    return PLAYER_BASE_SPEED * _clamped(PLAYER_SPEED_CURVE, level)


def fright_duration(level):
    return _clamped(FRIGHT_DURATION_CURVE, level)


def fruit_points(level):
    """Points for the fruit tier active at this level."""
    points = FRUIT_TIERS[0][1]
    for first_seen, value in FRUIT_TIERS:
        if level >= first_seen:
            points = value
    return points


def wave_schedule(level):
    """Wave clock for a level: list of (scatter_s, chase_s)."""
    shave = (level - 1) * WAVE_SCATTER_SHAVE_PER_LEVEL
    out = []
    for scatter, chase in WAVE_SCHEDULE:
        out.append((max(1.0, scatter - shave), chase))
    return out


def house_counters(level):
    """Per-ghost dot counters, easing to the floor on deep levels."""
    ease = max(0, 5 - level)
    return tuple(max(lo, base - ease) for base, lo in zip(HOUSE_DOT_COUNTERS, HOUSE_COUNTER_MIN))


def level_summary(level):
    """One row of the endless difficulty ramp (for HUD, CLI, and docs)."""
    if level < 1:
        raise ValueError("level must be >= 1")
    return {
        "level": int(level),
        "player_speed": round(player_speed(level), 3),
        "fright_s": fright_duration(level),
        "fruit": fruit_points(level),
        "house": house_counters(level),
        "waves": wave_schedule(level),
    }
