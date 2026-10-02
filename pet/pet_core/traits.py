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

# Per-character interaction modifiers (data, never branches). Fields:
#   stroke_gain: affection per gentle click (controller streak nudge).
#   stroke_full_gain: affection for a full stroke celebration (brain).
#   catch_gain: affection per ball catch (controller rally reward).
#   catch_radius_mult: multiplier on the ball catch radius (Bramble's
#       eager leap scores faster, Mochi's slow wobble scores slower).
#   munch_sec: feed munch animation length (Mochi purrs longer).
#   feed_mult: multiplier on fed hunger restoration (Rusty runs on oil,
#       snacks barely register; Mochi savours every crumb).
#   antic_interval_sec: idle seconds before the event bus improvises an
#       antic (Kiki chatters constantly, Rusty rarely volunteers).
# Pip values exactly match the shipped interaction constants.
INTERACTIONS: dict[str, dict[str, float]] = {
    "pip": {
        "stroke_gain": 2.0,
        "stroke_full_gain": 8.0,
        "catch_gain": 3.0,
        "catch_radius_mult": 1.0,
        "munch_sec": 3.0,
        "feed_mult": 1.0,
        "antic_interval_sec": 90.0,
    },
    "bramble": {
        "stroke_gain": 2.5,
        "stroke_full_gain": 9.0,
        "catch_gain": 4.0,
        "catch_radius_mult": 1.3,
        "munch_sec": 2.5,
        "feed_mult": 1.0,
        "antic_interval_sec": 60.0,
    },
    "mochi": {
        "stroke_gain": 3.0,
        "stroke_full_gain": 10.0,
        "catch_gain": 3.5,
        "catch_radius_mult": 0.85,
        "munch_sec": 4.5,
        "feed_mult": 1.25,
        "antic_interval_sec": 150.0,
    },
    "kiki": {
        "stroke_gain": 2.0,
        "stroke_full_gain": 8.0,
        "catch_gain": 3.0,
        "catch_radius_mult": 1.1,
        "munch_sec": 2.5,
        "feed_mult": 1.0,
        "antic_interval_sec": 45.0,
    },
    "rusty": {
        "stroke_gain": 1.0,
        "stroke_full_gain": 6.0,
        "catch_gain": 1.5,
        "catch_radius_mult": 1.0,
        "munch_sec": 3.0,
        "feed_mult": 0.8,
        "antic_interval_sec": 180.0,
    },
    "luna": {
        "stroke_gain": 2.0,
        "stroke_full_gain": 8.0,
        "catch_gain": 2.5,
        "catch_radius_mult": 1.0,
        "munch_sec": 3.5,
        "feed_mult": 1.1,
        "antic_interval_sec": 120.0,
    },
}


def known_ids() -> tuple[str, ...]:
    """Return the built-in character ids in registry order."""
    return tuple(TRAITS)


EXTRA_TRAITS: dict[str, dict[str, float]] = {}
EXTRA_INTERACTIONS: dict[str, dict[str, float]] = {}


def register_extra_traits(character_id: str, rates: dict,
                           interactions: dict | None = None) -> str:
    """Register a third-party trait record (pack activation path).

    Rates go through the pack validator so side registries cannot
    bypass the pool minimums and numeric bounds. Raises ValueError
    on invalid input. Returns the normalized slug. Unknown ids
    still fall back to Pip until registered here.
    """
    from . import packs as packs_mod

    cleaned = packs_mod.validate_traits(rates)
    slug = str(character_id or "").strip().lower()
    EXTRA_TRAITS[slug] = dict(cleaned)
    if interactions is not None:
        EXTRA_INTERACTIONS[slug] = dict(interactions)
    return slug


def normalize_id(character_id: object) -> str:
    """Map any value to a known trait id, falling back to Pip."""
    if isinstance(character_id, str):
        slug = character_id.strip().lower()
        if slug in TRAITS or slug in EXTRA_TRAITS:
            return slug
    return FALLBACK_ID


def rates_for(character_id: object) -> dict[str, float]:
    """Return a copy of the numeric trait record for a character id."""
    slug = normalize_id(character_id)
    if slug in EXTRA_TRAITS:
        merged = dict(TRAITS[FALLBACK_ID])
        merged.update(EXTRA_TRAITS[slug])
        return merged
    return dict(TRAITS[slug])


def walk_speed_for(character_id: object) -> float:
    """Return the walk speed px/sec for a character id."""
    return float(rates_for(character_id)["walk_speed"])


def interaction_for(character_id: object) -> dict[str, float]:
    """Return a copy of the interaction-modifier record for a character."""
    slug = normalize_id(character_id)
    if slug in EXTRA_INTERACTIONS:
        return dict(EXTRA_INTERACTIONS[slug])
    if slug in EXTRA_TRAITS:
        return dict(INTERACTIONS[FALLBACK_ID])
    return dict(INTERACTIONS[slug])
