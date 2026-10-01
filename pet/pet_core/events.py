"""Time-based living moments (stdlib only, no GUI imports).

The event bus makes pets feel alive rather than reactive: a morning
greeting when the day starts, a drowsy line late at night, idle antics
when nobody has interacted for a while, affection milestones, and a
post-meal contentment note. All moments are data-driven per character
(antic intervals come from the trait tables) and fully deterministic
given the same seed plus the same poll sequence.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from . import traits as traits_mod
from .personality import Personality

EVENT_KINDS = ("morning", "night", "idle_antic", "milestone", "content")

# Hours are local wall-clock 0..24. Windows wrap midnight.
MORNING_START = 6.0
MORNING_END = 10.0
NIGHT_START = 22.0
NIGHT_END = 2.0

# Post-meal contentment stays deliverable this long after notify_fed.
CONTENT_WINDOW_SEC = 60.0

# Milestone fires crossing upward; re-arms once affection drops below.
MILESTONE_AT = 80.0
MILESTONE_REARM_BELOW = 70.0


def _clean_hour(value: object) -> float | None:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if number != number:
        return None
    return number % 24.0


def _clean_moment(value: object) -> float | None:
    try:
        moment = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if moment != moment:
        return None
    return moment


def _in_window(hour: float, start: float, end: float) -> bool:
    if start <= end:
        return start <= hour < end
    return hour >= start or hour < end


@dataclass
class LifeEvent:
    kind: str  # one of EVENT_KINDS
    text: str
    mood: str


class LifeEvents:
    """Seeded time-based moment emitter with per-character pacing.

    The caller drives three methods: notify_interaction() on any user
    contact (resets the idle clock), notify_fed() after feeding (arms
    the contentment note), and poll() on every tick with the current
    state snapshot. poll() returns zero or more LifeEvents; each text
    is drawn from the active character voice.
    """

    def __init__(self, character_id: str = "pip", name: str = "Pip",
                 seed: int | None = None,
                 personality: Personality | None = None) -> None:
        self._rng = random.Random(seed)
        self._personality = personality or Personality(
            name=name, seed=seed, character_id=character_id)
        self._character_id = traits_mod.normalize_id(character_id)
        self._last_seen_morning: bool | None = None
        self._last_seen_night: bool | None = None
        self._last_interaction: float | None = None
        self._last_antic: float | None = None
        self._milestone_armed = True
        self._fed_at: float | None = None
        self._content_delivered = True

    @property
    def character_id(self) -> str:
        return self._character_id

    def set_character(self, character_id: object) -> str:
        self._character_id = traits_mod.normalize_id(character_id)
        self._personality.set_character(self._character_id)
        return self._character_id

    def set_name(self, name: object) -> str:
        return self._personality.set_name(name)

    def _antic_interval(self) -> float:
        try:
            return float(traits_mod.interaction_for(
                self._character_id)["antic_interval_sec"])
        except (KeyError, TypeError, ValueError):
            return 90.0

    def notify_interaction(self, now: object = None) -> None:
        """Record user contact (any gesture, menu action, or chat line)."""
        import time

        moment = _clean_moment(time.monotonic() if now is None else now)
        if moment is None:
            return
        self._last_interaction = moment

    def notify_fed(self, now: object = None) -> None:
        """Arm the post-meal contentment note."""
        import time

        moment = _clean_moment(time.monotonic() if now is None else now)
        if moment is None:
            return
        self._fed_at = moment
        self._content_delivered = False
        self._last_interaction = moment

    def poll(self, mood: str = "curious", hunger: float = 20.0,
             energy: float = 80.0, affection: float = 60.0,
             activity: str = "idle", hour: object = None,
             now: object = None) -> list[LifeEvent]:
        """Collect due moments. Never raises on hostile inputs."""
        import time

        moment = _clean_moment(time.monotonic() if now is None else now)
        if moment is None:
            return []
        if self._last_interaction is None:
            self._last_interaction = moment
        if self._last_antic is None:
            self._last_antic = moment
        try:
            kind = str(activity).lower()
        except Exception:
            kind = "idle"
        try:
            love = float(affection)
        except (TypeError, ValueError):
            love = 60.0
        if love != love:
            love = 60.0

        out: list[LifeEvent] = []
        clean_hour = _clean_hour(hour)
        if clean_hour is not None:
            morning = _in_window(clean_hour, MORNING_START, MORNING_END)
            if self._last_seen_morning is None:
                # Booting inside the window still earns a greeting.
                if morning:
                    out.append(LifeEvent(
                        kind="morning",
                        text=self._personality.line_for_event("greet"),
                        mood="happy"))
                self._last_seen_morning = morning
            elif morning and not self._last_seen_morning:
                out.append(LifeEvent(
                    kind="morning",
                    text=self._personality.line_for_event("greet"),
                    mood="happy"))
                self._last_seen_morning = morning
            else:
                self._last_seen_morning = morning
            night = _in_window(clean_hour, NIGHT_START, NIGHT_END)
            if self._last_seen_night is None:
                if night:
                    out.append(LifeEvent(
                        kind="night",
                        text=self._personality.line_for("sleepy"),
                        mood="sleepy"))
                self._last_seen_night = night
            elif night and not self._last_seen_night:
                out.append(LifeEvent(
                    kind="night",
                    text=self._personality.line_for("sleepy"),
                    mood="sleepy"))
                self._last_seen_night = night
            else:
                self._last_seen_night = night

        if love >= MILESTONE_AT and self._milestone_armed:
            self._milestone_armed = False
            out.append(LifeEvent(
                kind="milestone",
                text="%s %s" % (
                    self._personality.name,
                    self._milestone_line()),
                mood="affectionate"))
        elif love < MILESTONE_REARM_BELOW:
            self._milestone_armed = True

        if (not self._content_delivered and self._fed_at is not None
                and moment - self._fed_at <= CONTENT_WINDOW_SEC
                and kind != "sleep"):
            self._content_delivered = True
            out.append(LifeEvent(
                kind="content",
                text=self._personality.line_for_event("feed"),
                mood="happy"))
        elif (self._fed_at is not None
                and moment - self._fed_at > CONTENT_WINDOW_SEC):
            self._content_delivered = True

        interval = self._antic_interval()
        if (kind in ("idle", "walk")
                and moment - self._last_interaction >= interval
                and moment - self._last_antic >= interval):
            self._last_antic = moment
            out.append(LifeEvent(
                kind="idle_antic",
                text=self._antic_text(mood),
                mood=mood if mood else "curious"))
        return out

    def _milestone_line(self) -> str:
        lines = {
            "bramble": "is doing backflips! Best friends forever!",
            "mochi": "melts extra soft. Best friends... probably... definitely.",
            "kiki": "chirps at maximum volume! Best friends! Chirp!",
            "rusty": "records friendship status: CONFIRMED. Beep.",
            "luna": "glows a little brighter. Best friends, moon-promise.",
        }
        tail = lines.get(self._character_id,
                         "loves you a whole bucketful. Best friends!")
        return tail

    def _antic_text(self, mood: str) -> str:
        valid = ("happy", "curious", "sleepy", "grumpy", "hungry",
                 "affectionate")
        if mood not in valid:
            mood = "curious"
        draw = self._personality.line_for(mood)
        openers = {
            "bramble": "Zoomies check! ",
            "mochi": "Squish break. ",
            "kiki": "Chirp! Anyway! ",
            "rusty": "Idle subroutine: ",
            "luna": "Moon-thought: ",
        }
        return "%s%s" % (openers.get(self._character_id, ""), draw)
