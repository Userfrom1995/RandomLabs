"""Interaction play layer (no GUI imports allowed here).

Headless models for the pet's play interactions: gentle stroke streaks,
the feed munch session, the ball-toss mini-game, and the bedtime sleep
schedule. The tkinter shell renders this state; unit tests drive it
without any display. All clocks are injectable so tests stay
deterministic; bad timestamps fail closed to "no time passed".
"""

from __future__ import annotations

import random
import time

STROKE_MIN_GAP_SEC = 0.25
STROKE_MAX_GAP_SEC = 2.5
STROKE_COMBO_AT = 4
STROKE_COMBO_EVERY = 3
STROKE_NUDGE = 2.0

MUNCH_SEC = 3.0

BALL_GRAVITY = 2.4
BALL_FLOOR_Y = 0.90
BALL_MIN_X = 0.06
BALL_MAX_X = 0.94
BALL_CATCH_RADIUS = 0.09
BALL_CATCH_ZONE_Y = 0.70
BALL_PET_SPEED = 1.6
BALL_MAX_DT_SEC = 0.5
GAME_SEC = 30.0
CATCHES_TO_FINISH = 5

ROUTINE_HOLD_SEC = 120.0
DEFAULT_BEDTIME_HOUR = 22.0
DEFAULT_WAKE_HOUR = 7.0


def _clean_moment(value: object) -> float | None:
    """Parse a timestamp, returning None when it is unusable."""
    try:
        moment = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if moment != moment:  # NaN
        return None
    return moment


def _clean_step(value: object, cap: float) -> float:
    try:
        step = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0
    if step != step or step < 0.0:
        return 0.0
    return min(step, cap)


def _clean_hour(value: object, fallback: float) -> float:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return fallback
    if number != number:
        return fallback
    return number % 24.0


def wall_hour() -> float | None:
    """Current local wall-clock hour 0..24, or None when unreadable."""
    try:
        now = time.localtime()
        return (float(now.tm_hour) + float(now.tm_min) / 60.0) % 24.0
    except Exception:
        return None


class StrokeTracker:
    """Counts gentle repeat strokes (slow click passes) into streaks.

    Passes closer than STROKE_MIN_GAP_SEC are debounced away as
    accidental double-fires; a gap wider than STROKE_MAX_GAP_SEC ends
    the streak and the next pass starts a fresh one at 1.
    """

    def __init__(self) -> None:
        self.streak = 0
        self.best = 0
        self._last: float | None = None

    def register(self, now: object = None) -> int:
        """Record one gentle pass. Returns the current streak."""
        moment = _clean_moment(time.monotonic() if now is None else now)
        if moment is None:
            return self.streak
        if self._last is None:
            self.streak = 1
        else:
            gap = moment - self._last
            if gap < 0.0:
                # Clock jumped backwards: restart rather than rewarding.
                self.streak = 1
            elif gap < STROKE_MIN_GAP_SEC:
                return self.streak
            elif gap <= STROKE_MAX_GAP_SEC:
                self.streak += 1
            else:
                self.streak = 1
        self._last = moment
        self.best = max(self.best, self.streak)
        return self.streak

    def reset(self) -> None:
        self.streak = 0
        self._last = None


class MunchSession:
    """Short munch animation window opened by feeding the pet."""

    def __init__(self, duration: float = MUNCH_SEC) -> None:
        try:
            length = float(duration)
        except (TypeError, ValueError):
            length = MUNCH_SEC
        if length != length or length <= 0.0:
            length = MUNCH_SEC
        self.duration = length
        self._until: float | None = None

    def start(self, now: object = None) -> None:
        moment = _clean_moment(time.monotonic() if now is None else now)
        if moment is None:
            return
        self._until = moment + self.duration

    def is_active(self, now: object = None) -> bool:
        if self._until is None:
            return False
        moment = _clean_moment(time.monotonic() if now is None else now)
        if moment is None:
            return True
        if moment >= self._until:
            self._until = None
            return False
        return True


class BallGame:
    """Ball-toss mini-game in unit-box coordinates (0..1 both axes).

    A seeded ball bounces under gravity while the pet marker eases
    toward it; a catch scores when the pet meets the ball low on the
    canvas. The game ends after CATCHES_TO_FINISH catches or GAME_SEC
    seconds, whichever comes first. Same seed plus same tick sequence
    replays the same game exactly.
    """

    def __init__(self, seed: int | None = None) -> None:
        self._seed = seed
        self._rng = random.Random(seed)
        self.active = False
        self.score = 0
        self.catches = 0
        self.throws = 0
        self.ball_x = 0.5
        self.ball_y = 0.3
        self.ball_vx = 0.0
        self.ball_vy = 0.0
        self.pet_x = 0.5
        self._started_at: float | None = None

    def start(self, now: object = None) -> bool:
        """Open a new game and toss the first ball. Returns active."""
        moment = _clean_moment(time.monotonic() if now is None else now)
        if moment is None:
            return False
        self._rng = random.Random(self._seed)
        self.active = True
        self.score = 0
        self.catches = 0
        self.throws = 0
        self.pet_x = 0.5
        self._started_at = moment
        self.toss(moment)
        return True

    def stop(self) -> None:
        self.active = False

    def elapsed(self, now: object = None) -> float:
        if not self.active or self._started_at is None:
            return 0.0
        moment = _clean_moment(time.monotonic() if now is None else now)
        if moment is None:
            return 0.0
        return max(0.0, moment - self._started_at)

    def toss(self, now: object = None) -> None:
        """Throw the ball up again from a low point with a random arc."""
        if not self.active:
            return
        direction = 1.0 if self._rng.random() < 0.5 else -1.0
        self.ball_x = 0.5 + self._rng.uniform(-0.25, 0.25)
        self.ball_y = 0.55
        self.ball_vx = direction * (0.30 + self._rng.random() * 0.55)
        self.ball_vy = -(0.85 + self._rng.random() * 0.55)
        self.throws += 1

    def tick(self, dt: object = 0.1, now: object = None) -> list[str]:
        """Advance physics. Returns zero or more of catch/finish."""
        if not self.active:
            return []
        step = _clean_step(dt, BALL_MAX_DT_SEC)
        events: list[str] = []
        if step <= 0.0:
            return events
        moment = _clean_moment(time.monotonic() if now is None else now)
        if moment is None:
            return events

        self.ball_vy += BALL_GRAVITY * step
        self.ball_x += self.ball_vx * step
        self.ball_y += self.ball_vy * step
        if self.ball_x < BALL_MIN_X:
            self.ball_x = BALL_MIN_X
            self.ball_vx = abs(self.ball_vx) * 0.7
        elif self.ball_x > BALL_MAX_X:
            self.ball_x = BALL_MAX_X
            self.ball_vx = -abs(self.ball_vx) * 0.7
        if self.ball_y > BALL_FLOOR_Y:
            self.ball_y = BALL_FLOOR_Y
            self.ball_vy = -abs(self.ball_vy) * 0.62
            self.ball_vx *= 0.98
            if abs(self.ball_vy) < 0.15:
                # Settled bounce: toss again so the rally never dies.
                self.toss(moment)

        # The pet marker chases the ball horizontally, capped at top speed.
        gap = self.ball_x - self.pet_x
        stride = max(-BALL_PET_SPEED * step, min(BALL_PET_SPEED * step, gap))
        self.pet_x += stride

        if (self.ball_y >= BALL_CATCH_ZONE_Y
                and abs(self.pet_x - self.ball_x) <= BALL_CATCH_RADIUS):
            self.catches += 1
            self.score += 1
            events.append("catch")
            if self.catches >= CATCHES_TO_FINISH:
                self.active = False
                events.append("finish")
                return events
            self.toss(moment)

        if moment - (self._started_at or moment) >= GAME_SEC:
            self.active = False
            events.append("finish")
        return events

    def ball_shape(self, box: float = 160.0) -> dict:
        """Ball primitive in a box x box canvas (matches draw_on)."""
        try:
            size = float(box)
        except (TypeError, ValueError):
            size = 160.0
        if size != size or size <= 0.0:
            size = 160.0
        radius = 7.0 * size / 160.0
        cx = max(0.0, min(1.0, self.ball_x)) * size
        cy = max(0.0, min(1.0, self.ball_y)) * size
        return {
            "kind": "circle",
            "coords": [cx - radius, cy - radius, cx + radius, cy + radius],
            "fill": "#7aa2f7",
        }


class SleepSchedule:
    """Bedtime routine: asleep between bedtime and wake hour.

    Overnight windows wrap midnight (22:00 to 7:00 means h >= 22 or
    h < 7). A zero-length window (bedtime equals wake) never forces
    sleep. Hours are wrapped into 0..24 so bad inputs fail closed.
    """

    def __init__(self, enabled: bool = True,
                 bedtime: object = DEFAULT_BEDTIME_HOUR,
                 wake: object = DEFAULT_WAKE_HOUR) -> None:
        self.enabled = bool(enabled)
        self.bedtime = _clean_hour(bedtime, DEFAULT_BEDTIME_HOUR)
        self.wake = _clean_hour(wake, DEFAULT_WAKE_HOUR)

    def set_enabled(self, value: bool) -> bool:
        self.enabled = bool(value)
        return self.enabled

    def should_be_asleep(self, hour: object) -> bool:
        """True when the given wall-clock hour falls in the sleep window."""
        if not self.enabled:
            return False
        try:
            current = float(hour)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return False
        if current != current:
            return False
        current = current % 24.0
        if self.bedtime == self.wake:
            return False
        if self.bedtime < self.wake:
            return self.bedtime <= current < self.wake
        return current >= self.bedtime or current < self.wake

    def describe(self) -> str:
        state = "on" if self.enabled else "off"

        def clock(hour: float) -> str:
            return "%02d:%02d" % (int(hour) % 24, int(round((hour % 1.0) * 60.0)) % 60)

        return "Sleep schedule %s (bedtime %s, up at %s)." % (
            state, clock(self.bedtime), clock(self.wake))
