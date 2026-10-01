"""Per-character trait parameters (stdlib only, no GUI imports).

Every stat difference between characters is data in this table, never a
branch in the brain. Pip is the balanced baseline whose rates exactly
match the original needs.py constants; every other character scales from
there so the 10 Hz tick contract and seeded determinism are unchanged.
"""

from __future__ import annotations

from . import needs as _needs

BASE_RATES = {
    "hunger_rate": _needs.HUNGER_RATE_PER_SEC,
    "energy_drain": _needs.ENERGY_DRAIN_PER_SEC,
    "energy_restore": _needs.ENERGY_RESTORE_PER_SEC,
    "affection_decay": _needs.AFFECTION_DECAY_PER_SEC,
}

BASE_WALK_SPEED = 36.0

# Numeric trait record per character id. Fields:
#   hunger_rate / energy_drain / energy_restore / affection_decay:
#       absolute per-second rates (same units as needs.py constants).
#   walk_speed: px/sec while walking (base 36.0).
#   play_bonus: additive per-tick PLAY weight applied in the brain
#       transition table (before normalisation).
#   sleep_bonus: additive per-tick SLEEP weight.
#   react_bonus: additive per-tick REACT weight.
TRAITS: dict[str, dict[str, float]] = {
    "pip": {
        "hunger_rate": _needs.HUNGER_RATE_PER_SEC,
        "energy_drain": _needs.ENERGY_DRAIN_PER_SEC,
        "energy_restore": _needs.ENERGY_RESTORE_PER_SEC,
        "affection_decay": _needs.AFFECTION_DECAY_PER_SEC,
        "walk_speed": 36.0,
        "play_bonus": 0.0,
        "sleep_bonus": 0.0,
        "react_bonus": 0.0,
    },
    "bramble": {
        "hunger_rate": _needs.HUNGER_RATE_PER_SEC * 1.25,
        "energy_drain": _needs.ENERGY_DRAIN_PER_SEC * 1.15,
        "energy_restore": _needs.ENERGY_RESTORE_PER_SEC * 1.0,
        "affection_decay": _needs.AFFECTION_DECAY_PER_SEC * 1.4,
        "walk_speed": 36.0 * 1.6,
        "play_bonus": 0.08,
        "sleep_bonus": -0.01,
        "react_bonus": 0.02,
    },
    "mochi": {
        "hunger_rate": _needs.HUNGER_RATE_PER_SEC * 0.8,
        "energy_drain": _needs.ENERGY_DRAIN_PER_SEC * 0.7,
        "energy_restore": _needs.ENERGY_RESTORE_PER_SEC * 1.2,
        "affection_decay": _needs.AFFECTION_DECAY_PER_SEC * 0.6,
        "walk_speed": 36.0 * 0.5,
        "play_bonus": -0.02,
        "sleep_bonus": 0.05,
        "react_bonus": -0.005,
    },
    "kiki": {
        "hunger_rate": _needs.HUNGER_RATE_PER_SEC * 1.1,
        "energy_drain": _needs.ENERGY_DRAIN_PER_SEC * 1.2,
        "energy_restore": _needs.ENERGY_RESTORE_PER_SEC * 1.0,
        "affection_decay": _needs.AFFECTION_DECAY_PER_SEC * 1.1,
        "walk_speed": 36.0 * 1.4,
        "play_bonus": 0.05,
        "sleep_bonus": -0.015,
        "react_bonus": 0.03,
    },
    "rusty": {
        "hunger_rate": _needs.HUNGER_RATE_PER_SEC * 0.5,
        "energy_drain": _needs.ENERGY_DRAIN_PER_SEC * 0.9,
        "energy_restore": _needs.ENERGY_RESTORE_PER_SEC * 0.9,
        "affection_decay": _needs.AFFECTION_DECAY_PER_SEC * 0.8,
        "walk_speed": 36.0 * 0.9,
        "play_bonus": -0.02,
        "sleep_bonus": 0.0,
        "react_bonus": -0.005,
    },
    "luna": {
        "hunger_rate": _needs.HUNGER_RATE_PER_SEC * 1.0,
        "energy_drain": _needs.ENERGY_DRAIN_PER_SEC * 1.0,
        "energy_restore": _needs.ENERGY_RESTORE_PER_SEC * 1.1,
        "affection_decay": _needs.AFFECTION_DECAY_PER_SEC * 0.9,
        "walk_speed": 36.0 * 1.1,
        "play_bonus": 0.02,
        "sleep_bonus": 0.02,
        "react_bonus": 0.01,
    },
}

FALLBACK_ID = "pip"


def known_ids() -> tuple[str, ...]:
    """Return the built-in character ids in registry order."""
    return tuple(TRAITS)


def normalize_id(character_id: object) -> str:
    """Map any value to a known trait id, falling back to Pip."""
    if isinstance(character_id, str) and character_id.strip().lower() in TRAITS:
        return character_id.strip().lower()
    return FALLBACK_ID


def rates_for(character_id: object) -> dict[str, float]:
    """Return a copy of the numeric trait record for a character id."""
    return dict(TRAITS[normalize_id(character_id)])


def walk_speed_for(character_id: object) -> float:
    """Return the walk speed px/sec for a character id."""
    return float(TRAITS[normalize_id(character_id)]["walk_speed"])
