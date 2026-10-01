"""Needs decay and restore math (pure functions, time-delta correct)."""

from __future__ import annotations

from .state import MAX_STAT, MIN_STAT, Activity, PetState

# Rates are per second, tuned so a full cycle plays out over minutes:
# hunger 0->100 in 10 minutes, awake energy 100->0 in 15 minutes,
# sleep restores 0->100 in 5 minutes, affection 100->0 in 20 minutes.
HUNGER_RATE_PER_SEC = 100.0 / 600.0
ENERGY_DRAIN_PER_SEC = 100.0 / 900.0
ENERGY_RESTORE_PER_SEC = 100.0 / 300.0
AFFECTION_DECAY_PER_SEC = 100.0 / 1200.0

MAX_DT_SEC = 5.0


def _clamp_dt(dt: float) -> float:
    try:
        step = float(dt)
    except (TypeError, ValueError):
        return 0.0
    if step != step:  # NaN
        return 0.0
    if step < 0.0:
        return 0.0
    if step > MAX_DT_SEC:
        return MAX_DT_SEC
    return step


def tick_needs(state: PetState, dt: float) -> PetState:
    """Advance hunger/energy/affection by dt seconds (mutates, returns state)."""
    step = _clamp_dt(dt)
    if step <= 0.0:
        return state
    state.hunger = min(MAX_STAT, state.hunger + HUNGER_RATE_PER_SEC * step)
    if state.activity == Activity.SLEEP:
        state.energy = min(MAX_STAT, state.energy + ENERGY_RESTORE_PER_SEC * step)
    else:
        state.energy = max(MIN_STAT, state.energy - ENERGY_DRAIN_PER_SEC * step)
        state.time_awake_sec += step
    state.affection = max(MIN_STAT, state.affection - AFFECTION_DECAY_PER_SEC * step)
    return state


def feed(state: PetState, amount: float = 35.0) -> float:
    """Restore hunger by amount (hunger 0 = full). Returns hunger restored."""
    try:
        qty = float(amount)
    except (TypeError, ValueError):
        qty = 0.0
    if qty <= 0.0:
        return 0.0
    before = state.hunger
    state.hunger = max(MIN_STAT, state.hunger - qty)
    # A good meal is mildly tiring and mildly endearing.
    state.energy = max(MIN_STAT, state.energy - 2.0)
    state.affection = min(MAX_STAT, state.affection + 4.0)
    return before - state.hunger


def add_affection(state: PetState, amount: float = 8.0) -> float:
    """Raise affection by amount (stroking). Returns affection gained."""
    try:
        qty = float(amount)
    except (TypeError, ValueError):
        qty = 0.0
    if qty <= 0.0:
        return 0.0
    before = state.affection
    state.affection = min(MAX_STAT, state.affection + qty)
    return state.affection - before
