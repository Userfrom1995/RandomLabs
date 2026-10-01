"""Personality and dialogue pools (offline line pool, seeded, no repeats).

The persona is a curated set of line pools keyed by mood and by event.
Each pool cycles with no-repeat-until-exhausted: lines are drawn from a
shuffled bag, and the bag is only reshuffled once every line has been
used. A seed makes the sequence deterministic for tests.
"""

from __future__ import annotations

import random

from .state import PetState

DEFAULT_NAME = "Pip"

MOODS = (
    "happy",
    "curious",
    "sleepy",
    "grumpy",
    "hungry",
    "affectionate",
)

EVENT_KEYS = ("poke", "feed", "play", "wake", "sleep", "greet")

MOOD_LINES: dict[str, list[str]] = {
    "happy": [
        "What a good day to be a blob, {name} thinks.",
        "Spinning in a tiny circle of joy!",
        "The sun is out and so is {name}.",
        "Humming a square little tune.",
        "Everything smells like adventure today.",
    ],
    "curious": [
        "What is that over there? No, really.",
        "Sniffing the pixels. For science.",
        "{name} wonders what is behind that window.",
        "Ooh, a cursor. Suspicious. Fascinating.",
        "Poking the universe to see if it pokes back.",
    ],
    "sleepy": [
        "Eyelids at half mast...",
        "Just five more minutes, {name} mumbles.",
        "Yawning a tiny triangle yawn.",
        "The floor looks very nap-shaped.",
        "Blinking... slowly... slowly...",
    ],
    "grumpy": [
        "Hmph. {name} did not ask to be perceived.",
        "The tail flicks. Once. Sharply.",
        "Somebody needs a snack and it is {name}.",
        "Grumble grumble. Tiny thunder.",
        "Personal space, please.",
    ],
    "hungry": [
        "Tummy making hollow cave sounds.",
        "Is that... a crumb? {name} hopes.",
        "A snack would fix everything, probably.",
        "Staring at the food corner. Willing it.",
        "Hungry enough to eat a whole pixel.",
    ],
    "affectionate": [
        "Leaning into the cursor. Warm.",
        "{name} loves you a whole bucketful.",
        "Purring at a frequency only hearts hear.",
        "Stay a while? {name} likes you here.",
        "Nuzzling the edge of the screen.",
    ],
}

EVENT_LINES: dict[str, list[str]] = {
    "poke": [
        "Eep! {name} was not ready!",
        "Hey! Careful with the blob!",
        "Startled! Tail: maximum floof.",
    ],
    "feed": [
        "Nom nom nom. Thank you!",
        "Crunch crunch. {name} feels loved.",
        "Munching happily. More, maybe?",
    ],
    "play": [
        "Ball! BALL! {name} is READY!",
        "Zoomies engaged!",
        "Throw it again! Again!",
    ],
    "wake": [
        "Waking up... booting cuteness...",
        "{name} is UP. Mostly. What did I miss?",
        "Stretching every limb at once.",
    ],
    "sleep": [
        "Curling up. Goodnight...",
        "{name} drifts off. Zzz.",
        "Powering down the wiggles.",
    ],
    "greet": [
        "Oh! You are here! Hi!",
        "{name} was just thinking about you.",
        "Welcome back! {name} saved you a spot.",
    ],
}


def mood_for(state: PetState) -> str:
    """Derive the display mood from current needs (pure function)."""
    if state.hunger >= 75.0:
        return "hungry"
    if state.energy <= 20.0:
        return "sleepy"
    if state.affection >= 80.0:
        return "affectionate"
    if state.affection <= 25.0:
        return "grumpy"
    if state.energy >= 60.0 and state.affection >= 50.0:
        return "happy"
    return "curious"


class Personality:
    """Seeded dialogue picker with per-key no-repeat bags."""

    def __init__(self, name: str = DEFAULT_NAME, seed: int | None = None) -> None:
        self._rng = random.Random(seed)
        self._bags: dict[str, list[str]] = {}
        self.set_name(name)

    @property
    def name(self) -> str:
        return self._name

    def set_name(self, name: str) -> str:
        """Rename the pet (trims, falls back to default). Returns final name."""
        if not isinstance(name, str) or not name.strip():
            self._name = DEFAULT_NAME
        else:
            self._name = name.strip()[:24]
        return self._name

    def _refill(self, key: str, pool: list[str]) -> None:
        bag = list(pool)
        self._rng.shuffle(bag)
        self._bags[key] = bag

    def _draw(self, key: str, pool: list[str]) -> str:
        bag = self._bags.get(key)
        if not bag:
            self._refill(key, pool)
            bag = self._bags[key]
        line = bag.pop()
        return line.replace("{name}", self._name)

    def line_for(self, mood: str) -> str:
        """Draw a mood line (unknown moods fall back to curious)."""
        if mood not in MOOD_LINES:
            mood = "curious"
        return self._draw("mood:" + mood, MOOD_LINES[mood])

    def line_for_event(self, event: str) -> str:
        """Draw an event line (unknown events fall back to greet)."""
        if event not in EVENT_LINES:
            event = "greet"
        return self._draw("event:" + event, EVENT_LINES[event])

    def pool_sizes(self) -> dict[str, int]:
        """Report pool sizes (useful for tests and the selftest gate)."""
        sizes = {m: len(MOOD_LINES[m]) for m in MOODS}
        sizes.update({"event:" + e: len(EVENT_LINES[e]) for e in EVENT_KEYS})
        return sizes
