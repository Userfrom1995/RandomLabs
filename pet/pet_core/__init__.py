"""Headless companion brain shared by every frontend (stdlib only).

This package must never import tkinter, pygame, numpy, or any OS shell
module. It holds pure state, needs math, personality lines, persistence,
and the behavior tick machine. The GUI in pet_app (a later layer) is a
thin renderer over this API.
"""

from .state import Activity, PetState, SCHEMA_VERSION, KNOWN_CHARACTERS
from .needs import (
    AFFECTION_DECAY_PER_SEC,
    ENERGY_DRAIN_PER_SEC,
    ENERGY_RESTORE_PER_SEC,
    HUNGER_RATE_PER_SEC,
    add_affection,
    feed,
    tick_needs,
)
from .personality import DEFAULT_NAME, EVENT_KEYS, MOODS, Personality, mood_for
from .persistence import backup_path_for, default_save_path, load, save
from .brain import Brain, BrainEvent, EVENT_KINDS
from . import traits as _traits_mod
from . import catalog as _catalog_mod
from .personality import CHARACTER_VOICES

__all__ = [
    "Activity",
    "PetState",
    "SCHEMA_VERSION",
    "AFFECTION_DECAY_PER_SEC",
    "ENERGY_DRAIN_PER_SEC",
    "ENERGY_RESTORE_PER_SEC",
    "HUNGER_RATE_PER_SEC",
    "add_affection",
    "feed",
    "tick_needs",
    "DEFAULT_NAME",
    "EVENT_KEYS",
    "MOODS",
    "Personality",
    "mood_for",
    "backup_path_for",
    "default_save_path",
    "load",
    "save",
    "Brain",
    "BrainEvent",
    "EVENT_KINDS",
    "KNOWN_CHARACTERS",
    "CHARACTER_VOICES",
]
