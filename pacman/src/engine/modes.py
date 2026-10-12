"""Extra game modes: rule modifiers over the classic simulation.

Every mode is a complete, honestly different ruleset, not a reskin:
  classic       - the standard arcade loop (lives, levels, fright, fruit).
  time-attack   - 120 seconds on a refilling maze; most points wins.
  sprint        - one life, no fright, clear the maze against the clock for
                  a par-time bonus.
  fright-frenzy - 4x fright windows with slower ghosts: hunt, do not hide.

Modifiers here are pure functions of the mode name so the engine, HUD, CLI,
and docs all agree. Unknown mode names raise ValueError at construction.
"""

MODES = ("classic", "time-attack", "sprint", "fright-frenzy")

TIME_ATTACK_S = 120.0
SPRINT_PAR_S = 300.0
SPRINT_LIVES = 1


def check(mode):
    if mode not in MODES:
        raise ValueError("unknown mode: %r (want %s)" % (mode, "/".join(MODES)))
    return mode


def describe(mode):
    check(mode)
    return {
        "classic": "classic: lives, levels, fright, fruit",
        "time-attack": "time-attack: %ds on a refilling maze, most points wins" % int(TIME_ATTACK_S),
        "sprint": "sprint: one life, no fright, clear fast for a par bonus",
        "fright-frenzy": "fright-frenzy: 4x fright windows, slower ghosts, hunt",
    }[mode]


def fright_multiplier(mode):
    check(mode)
    return 4.0 if mode == "fright-frenzy" else 1.0


def ghost_speed_multiplier(mode):
    check(mode)
    if mode == "sprint":
        return 1.05
    if mode == "time-attack":
        return 0.95
    if mode == "fright-frenzy":
        return 0.90
    return 1.0


def player_speed_multiplier(mode):
    check(mode)
    return 1.03 if mode == "fright-frenzy" else 1.0


def has_fright(mode):
    """Sprint energizers score points but never frighten (a real handicap)."""
    check(mode)
    return mode != "sprint"


def starting_lives(mode):
    from engine import tuning
    check(mode)
    return SPRINT_LIVES if mode == "sprint" else tuning.START_LIVES


def refills_maze(mode):
    """Time attack refills the maze on clear instead of advancing levels."""
    check(mode)
    return mode == "time-attack"


def sprint_bonus(elapsed_s):
    """Par-time clear bonus for sprint (10 points per second under par)."""
    return max(0, int(SPRINT_PAR_S - elapsed_s)) * 10
