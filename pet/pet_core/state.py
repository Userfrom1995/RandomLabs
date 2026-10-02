"""Core state model for the desktop pet (no GUI imports allowed here)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum

SCHEMA_VERSION = 2

MIN_STAT = 0.0
MAX_STAT = 100.0

KNOWN_CHARACTERS = ("pip", "bramble", "mochi", "kiki", "rusty", "luna")

EXTRA_CHARACTERS: set[str] = set()


def register_extra_character(character_id: str) -> str:
    """Register a third-party character slug so saves keep it (pack path)."""
    slug = str(character_id or "").strip().lower()
    EXTRA_CHARACTERS.add(slug)
    return slug


def is_known_character(character_id: object) -> bool:
    if isinstance(character_id, str):
        slug = character_id.strip().lower()
        return slug in KNOWN_CHARACTERS or slug in EXTRA_CHARACTERS
    return False


class Activity(str, Enum):
    """Behavior activities driven by the brain tick machine."""

    IDLE = "idle"
    WALK = "walk"
    PLAY = "play"
    SLEEP = "sleep"
    REACT = "react"


VALID_MOODS = (
    "happy",
    "curious",
    "sleepy",
    "grumpy",
    "hungry",
    "affectionate",
)


def clamp_stat(value: float) -> float:
    """Clamp a 0-100 stat to range (accepts ints, rejects NaN by mapping to 0)."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    if number != number:  # NaN
        return 0.0
    if number < MIN_STAT:
        return MIN_STAT
    if number > MAX_STAT:
        return MAX_STAT
    return number


@dataclass
class PetState:
    """Full serializable snapshot of the companion.

    hunger: 0 means full, 100 means starving.
    energy: 0 means exhausted, 100 means fully rested.
    affection: 0 means neglected, 100 means adored.
    x, y: position in screen points relative to the spawn corner, used
        by renderers (headless walk updates these so the GUI just draws).
    """

    name: str = "Pip"
    character_id: str = "pip"
    activity: Activity = Activity.IDLE
    mood: str = "curious"
    energy: float = 80.0
    hunger: float = 20.0
    affection: float = 60.0
    x: float = 0.0
    y: float = 0.0
    tick_count: int = 0
    time_awake_sec: float = 0.0
    react_ticks_left: int = 0
    schema_version: int = SCHEMA_VERSION

    def __post_init__(self) -> None:
        if not isinstance(self.name, str) or not self.name.strip():
            self.name = "Pip"
        else:
            self.name = self.name.strip()[:24]
        if not isinstance(self.character_id, str):
            self.character_id = "pip"
        else:
            slug = self.character_id.strip().lower()
            self.character_id = slug if is_known_character(slug) else "pip"
        if isinstance(self.activity, str):
            try:
                self.activity = Activity(self.activity)
            except ValueError:
                self.activity = Activity.IDLE
        if self.mood not in VALID_MOODS:
            self.mood = "curious"
        self.energy = clamp_stat(self.energy)
        self.hunger = clamp_stat(self.hunger)
        self.affection = clamp_stat(self.affection)
        self.x = float(self.x) if isinstance(self.x, (int, float)) else 0.0
        self.y = float(self.y) if isinstance(self.y, (int, float)) else 0.0
        self.tick_count = max(0, int(self.tick_count))
        self.time_awake_sec = max(0.0, float(self.time_awake_sec or 0.0))
        self.react_ticks_left = max(0, int(self.react_ticks_left or 0))

    def to_dict(self) -> dict:
        data = asdict(self)
        data["activity"] = self.activity.value
        data["schema_version"] = SCHEMA_VERSION
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "PetState":
        """Build a state from parsed JSON, validating and clamping.

        Accepts schema v1 (no character_id, migrates to Pip) and v2.
        Raises ValueError on wrong types or unknown schema versions so
        the persistence layer can fail closed to defaults with a backup.
        Unknown character ids fall back to Pip (never a traceback).
        """
        if not isinstance(data, dict):
            raise ValueError("save data must be a JSON object")
        version = data.get("schema_version", 1)
        if version not in (1, 2):
            raise ValueError("unsupported schema version: %r" % (version,))
        name = data.get("name", "Pip")
        if not isinstance(name, str):
            raise ValueError("name must be a string")
        activity = data.get("activity", Activity.IDLE.value)
        if isinstance(activity, Activity):
            activity = activity.value
        if activity not in {a.value for a in Activity}:
            raise ValueError("unknown activity: %r" % (activity,))
        mood = data.get("mood", "curious")
        if mood not in VALID_MOODS:
            raise ValueError("unknown mood: %r" % (mood,))
        state = cls(
            name=name,
            character_id=data.get("character_id", "pip"),
            activity=Activity(activity),
            mood=mood,
            energy=clamp_stat(data.get("energy", 80.0)),
            hunger=clamp_stat(data.get("hunger", 20.0)),
            affection=clamp_stat(data.get("affection", 60.0)),
            x=data.get("x", 0.0),
            y=data.get("y", 0.0),
            tick_count=data.get("tick_count", 0),
            time_awake_sec=data.get("time_awake_sec", 0.0),
            react_ticks_left=data.get("react_ticks_left", 0),
        )
        return state
