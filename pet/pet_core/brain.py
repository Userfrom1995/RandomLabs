"""Behavior brain: tick state machine over needs plus personality.

Runs at 10 Hz nominal (dt around 0.1 s). Each tick is O(1): advance
needs, update mood, drift position while walking, then roll at most one
activity transition and emit at most one event. All randomness flows
through a seeded RNG so headless tests are deterministic.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

from . import needs as needs_mod
from . import traits as traits_mod
from .personality import Personality, mood_for
from .state import Activity, PetState

EVENT_KINDS = (
    "dialogue",
    "activity",
    "poke",
    "feed",
    "stroke",
    "play",
    "sleep",
    "wake",
    "rename",
)

TICK_HZ = 10
MAX_DT_SEC = 1.0
WALK_SPEED_PX_PER_SEC = 36.0

# Base per-tick transition weights out of each activity. Rows sum to 1.
_BASE_TABLE: dict[Activity, dict[Activity, float]] = {
    Activity.IDLE: {
        Activity.IDLE: 0.82,
        Activity.WALK: 0.10,
        Activity.PLAY: 0.04,
        Activity.SLEEP: 0.03,
        Activity.REACT: 0.01,
    },
    Activity.WALK: {
        Activity.WALK: 0.80,
        Activity.IDLE: 0.14,
        Activity.PLAY: 0.04,
        Activity.SLEEP: 0.01,
        Activity.REACT: 0.01,
    },
    Activity.PLAY: {
        Activity.PLAY: 0.78,
        Activity.IDLE: 0.16,
        Activity.WALK: 0.04,
        Activity.SLEEP: 0.01,
        Activity.REACT: 0.01,
    },
    Activity.SLEEP: {
        Activity.SLEEP: 0.97,
        Activity.IDLE: 0.03,
        Activity.WALK: 0.0,
        Activity.PLAY: 0.0,
        Activity.REACT: 0.0,
    },
    Activity.REACT: {
        Activity.REACT: 0.45,
        Activity.IDLE: 0.45,
        Activity.WALK: 0.05,
        Activity.PLAY: 0.03,
        Activity.SLEEP: 0.02,
    },
}

# Long sleeps restore through needs.tick_needs; the brain wakes the pet
# once rested unless it is genuinely night-owl tired again.
WAKE_ENERGY = 90.0
# REACT never lingers: hard cap in ticks before forcing IDLE/WALK.
REACT_MAX_TICKS = 30


@dataclass
class BrainEvent:
    kind: str  # one of EVENT_KINDS
    text: str
    mood: str
    activity: Activity

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "text": self.text,
            "mood": self.mood,
            "activity": self.activity.value,
        }


class Brain:
    """Owns a PetState plus Personality and advances both."""

    def __init__(
        self,
        state: PetState | None = None,
        personality: Personality | None = None,
        seed: int | None = None,
        allow_walk: bool = True,
        allow_play: bool = True,
    ) -> None:
        self.state = state or PetState()
        # A default personality inherits the brain seed so seeded runs are
        # fully deterministic (an explicitly passed personality keeps its
        # own stream). The voice follows the state's character id.
        self.personality = personality or Personality(
            name=self.state.name, seed=seed,
            character_id=getattr(self.state, "character_id", "pip"))
        # Keep the two names in sync at construction.
        if self.state.name != self.personality.name and state is not None:
            self.personality.set_name(self.state.name)
        elif state is None:
            self.state.name = self.personality.name
        if personality is not None:
            self.personality.set_character(
                getattr(self.state, "character_id", "pip"))
        self._rng = random.Random(seed)
        self._wander_angle = self._rng.uniform(0.0, 2.0 * math.pi)
        # Behavior toggles from the settings layer: when wander or play
        # invites are off, spontaneous transitions into WALK or PLAY are
        # gated out (manual menu actions bypass the table and still work).
        self.allow_walk = bool(allow_walk)
        self.allow_play = bool(allow_play)

    def _weights(self) -> dict[Activity, float]:
        """Copy the base row for the current activity, modulated by needs.

        Character trait bonuses apply as additive weights before
        normalisation, so personality is parameters, never branches.
        """
        row = dict(_BASE_TABLE[self.state.activity])
        st = self.state
        char = traits_mod.normalize_id(getattr(st, "character_id", "pip"))
        bonus = traits_mod.rates_for(char)
        # Pip bonuses are 0.0, so this stays parameters-never-branches.
        row[Activity.PLAY] = row.get(Activity.PLAY, 0.0) + bonus["play_bonus"]
        row[Activity.SLEEP] = row.get(Activity.SLEEP, 0.0) + bonus["sleep_bonus"]
        row[Activity.REACT] = row.get(Activity.REACT, 0.0) + bonus["react_bonus"]
        for key in (Activity.PLAY, Activity.SLEEP, Activity.REACT):
            if row[key] < 0.0:
                row[key] = 0.0
        if st.activity != Activity.SLEEP:
            if st.energy <= 20.0:
                row[Activity.SLEEP] = row.get(Activity.SLEEP, 0.0) + 0.30
            elif st.energy <= 40.0:
                row[Activity.SLEEP] = row.get(Activity.SLEEP, 0.0) + 0.10
            if st.hunger >= 75.0:
                row[Activity.REACT] = row.get(Activity.REACT, 0.0) + 0.12
            if st.affection <= 30.0:
                row[Activity.PLAY] = row.get(Activity.PLAY, 0.0) + 0.10
            if st.time_awake_sec > 60.0 and st.activity == Activity.IDLE:
                row[Activity.WALK] = row.get(Activity.WALK, 0.0) + 0.05
        # Settings gates apply after needs modulation so a low-affection
        # bonus can never re-open a disabled PLAY transition.
        if not self.allow_walk:
            row[Activity.WALK] = 0.0
        if not self.allow_play:
            row[Activity.PLAY] = 0.0
        total = sum(row.values())
        if total <= 0.0:
            return {Activity.IDLE: 1.0}
        return {key: val / total for key, val in row.items()}

    def _roll_transition(self) -> Activity:
        weights = self._weights()
        pick = self._rng.random()
        cumulative = 0.0
        # Stable order keeps seeded runs reproducible across interpreters.
        for activity in (Activity.IDLE, Activity.WALK, Activity.PLAY,
                         Activity.SLEEP, Activity.REACT):
            cumulative += weights.get(activity, 0.0)
            if pick < cumulative:
                return activity
        return Activity.IDLE

    def _enter(self, activity: Activity) -> BrainEvent | None:
        st = self.state
        if activity == st.activity:
            return None
        st.activity = activity
        if activity == Activity.REACT:
            st.react_ticks_left = self._rng.randint(10, REACT_MAX_TICKS)
        elif activity == Activity.SLEEP:
            st.time_awake_sec = 0.0
        text = self.personality.line_for(st.mood)
        return BrainEvent(kind="activity", text=text, mood=st.mood,
                          activity=st.activity)

    def tick(self, dt: float = 0.1) -> list[BrainEvent]:
        """Advance the brain by dt seconds. Returns zero or one events."""
        try:
            step = float(dt)
        except (TypeError, ValueError):
            step = 0.0
        if step != step or step < 0.0:  # NaN or negative
            step = 0.0
        step = min(step, MAX_DT_SEC)

        st = self.state
        needs_mod.tick_needs(st, step)
        st.tick_count += 1
        st.mood = mood_for(st)

        if step <= 0.0:
            # No time passed: record the tick but roll no transitions.
            return []

        if st.activity == Activity.WALK and step > 0.0:
            # Gentle random walk: mostly straight with occasional turns.
            # Speed comes from the active character trait record.
            if self._rng.random() < 0.06:
                self._wander_angle += self._rng.uniform(-1.2, 1.2)
            speed = traits_mod.walk_speed_for(
                getattr(st, "character_id", "pip"))
            st.x += math.cos(self._wander_angle) * speed * step
            st.y += math.sin(self._wander_angle) * speed * 0.4 * step

        events: list[BrainEvent] = []
        if st.activity == Activity.SLEEP:
            if st.energy >= WAKE_ENERGY:
                st.activity = Activity.IDLE
                st.time_awake_sec = 0.0
                events.append(BrainEvent(
                    kind="wake",
                    text=self.personality.line_for_event("wake"),
                    mood=st.mood, activity=st.activity))
            return events

        if st.activity == Activity.REACT:
            st.react_ticks_left -= 1
            if st.react_ticks_left <= 0:
                st.activity = Activity.IDLE
                st.react_ticks_left = 0
                return events

        nxt = self._roll_transition()
        entered = self._enter(nxt)
        if entered is not None:
            events.append(entered)
        return events

    # -- Interaction API (the GUI and tests drive behavior through these) --

    def _sync_name(self) -> None:
        self.state.name = self.personality.name

    def poke(self) -> BrainEvent:
        st = self.state
        st.activity = Activity.REACT
        st.react_ticks_left = self._rng.randint(10, REACT_MAX_TICKS)
        st.affection = max(0.0, st.affection - 2.0)
        st.mood = mood_for(st)
        return BrainEvent(kind="poke",
                          text=self.personality.line_for_event("poke"),
                          mood=st.mood, activity=st.activity)

    def feed_pet(self, amount: float = 35.0) -> BrainEvent:
        st = self.state
        try:
            base = float(amount)
        except (TypeError, ValueError):
            base = 0.0
        if base != base:
            base = 0.0
        mult = traits_mod.interaction_for(
            getattr(st, "character_id", "pip"))["feed_mult"]
        restored = needs_mod.feed(st, base * mult)
        st.mood = mood_for(st)
        text = self.personality.line_for_event("feed")
        if restored <= 0.0:
            text = "%s is already full. %s" % (st.name, text)
        return BrainEvent(kind="feed", text=text, mood=st.mood,
                          activity=st.activity)

    def stroke(self) -> BrainEvent:
        st = self.state
        full_gain = traits_mod.interaction_for(
            getattr(st, "character_id", "pip"))["stroke_full_gain"]
        gained = needs_mod.add_affection(st, full_gain)
        st.mood = mood_for(st)
        if st.activity == Activity.SLEEP:
            text = "%s purrs in dreams." % st.name
        elif gained <= 0.0:
            text = "%s is basking in attention." % st.name
        else:
            text = self.personality.line_for("affectionate")
        return BrainEvent(kind="stroke", text=text, mood=st.mood,
                          activity=st.activity)

    def invite_play(self) -> BrainEvent:
        st = self.state
        if st.activity == Activity.SLEEP:
            return BrainEvent(kind="play",
                              text="%s is asleep. Let them rest." % st.name,
                              mood=st.mood, activity=st.activity)
        st.activity = Activity.PLAY
        st.energy = max(0.0, st.energy - 3.0)
        st.affection = min(100.0, st.affection + 6.0)
        st.mood = mood_for(st)
        return BrainEvent(kind="play",
                          text=self.personality.line_for_event("play"),
                          mood=st.mood, activity=st.activity)

    def send_to_sleep(self) -> BrainEvent:
        st = self.state
        st.activity = Activity.SLEEP
        st.mood = mood_for(st)
        return BrainEvent(kind="sleep",
                          text=self.personality.line_for_event("sleep"),
                          mood=st.mood, activity=st.activity)

    def wake(self) -> BrainEvent:
        st = self.state
        if st.activity != Activity.SLEEP:
            return BrainEvent(kind="wake", text="%s is already awake." % st.name,
                              mood=st.mood, activity=st.activity)
        st.activity = Activity.IDLE
        st.time_awake_sec = 0.0
        st.mood = mood_for(st)
        return BrainEvent(kind="wake",
                          text=self.personality.line_for_event("wake"),
                          mood=st.mood, activity=st.activity)

    def rename(self, name: str) -> BrainEvent:
        final = self.personality.set_name(name)
        self._sync_name()
        st = self.state
        return BrainEvent(kind="rename",
                          text="From now on, call me %s!" % final,
                          mood=st.mood, activity=st.activity)

    def set_character(self, character_id: str) -> BrainEvent:
        """Switch the active character (unknown ids fall back to Pip)."""
        normalized = traits_mod.normalize_id(character_id)
        st = self.state
        st.character_id = normalized
        self.personality.set_character(normalized)
        st.mood = mood_for(st)
        return BrainEvent(kind="rename",
                          text="%s bounds in! Say hi to %s!" % (
                              st.name, normalized.title()),
                          mood=st.mood, activity=st.activity)
