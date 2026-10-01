"""Headless window controller (no GUI imports allowed here).

Holds every decision the tkinter shell needs: speech-bubble timing,
click versus drag versus double-click classification, the right-click
menu model, carry (drag) sessions, pose blending across activity
changes, and window settings (alpha, scale, always-on-top). The
tkinter shell in window.py renders this state; unit tests drive it
without any display.
"""

from __future__ import annotations

import time

from ..pet_core import needs as needs_mod
from ..pet_core import traits as traits_mod
from ..pet_core.brain import Brain
from ..pet_core.converse import Converser
from ..pet_core.events import LifeEvents
from ..pet_core.personality import mood_for
from ..pet_core.state import Activity
from . import platform as platform_mod
from . import settings as settings_mod
from .interact import (
    CATCHES_TO_FINISH,
    ROUTINE_HOLD_SEC,
    STROKE_COMBO_AT,
    STROKE_COMBO_EVERY,
    BallGame,
    MunchSession,
    SleepSchedule,
    StrokeTracker,
)
from .sprite import Pose, blend, normalize_character, pose_for

CLICK_MAX_SEC = 0.4
DOUBLE_CLICK_MAX_SEC = 0.45
DRAG_MIN_PX = 6.0
BUBBLE_DEFAULT_SEC = 4.0
POSE_BLEND_SEC = 0.35


class Bubble:
    """Timed speech-bubble model: show text, auto-hide after a delay."""

    def __init__(self) -> None:
        self.text: str = ""
        self.visible: bool = False
        self._until: float = 0.0

    def show(self, text: str, duration: float = BUBBLE_DEFAULT_SEC,
             now: float | None = None) -> None:
        cleaned = str(text or "").strip()
        if not cleaned:
            return
        try:
            length = float(duration)
        except (TypeError, ValueError):
            length = BUBBLE_DEFAULT_SEC
        if length != length or length <= 0.0:
            length = BUBBLE_DEFAULT_SEC
        moment = time.monotonic() if now is None else float(now)
        self.text = cleaned[:280]
        self.visible = True
        self._until = moment + length

    def hide(self) -> None:
        self.text = ""
        self.visible = False
        self._until = 0.0

    def tick(self, now: float | None = None) -> bool:
        """Refresh visibility against the clock. Returns visible."""
        if not self.visible:
            return False
        moment = time.monotonic() if now is None else float(now)
        if moment >= self._until:
            self.hide()
            return False
        return True


class ClickTracker:
    """Classify a press/move/release gesture without any toolkit.

    Returns one of "click", "double-click", "drag", or None (a press
    that moved a little but released too slowly to count as a click).
    """

    def __init__(self) -> None:
        self._pressed = False
        self._start_x = 0.0
        self._start_y = 0.0
        self._start_t = 0.0
        self._moved = False
        self._last_click_t: float | None = None

    def press(self, x: float, y: float, t: float) -> None:
        self._pressed = True
        self._start_x = float(x)
        self._start_y = float(y)
        self._start_t = float(t)
        self._moved = False

    def move(self, x: float, y: float) -> bool:
        """Record pointer motion. Returns True once this is a drag."""
        if not self._pressed:
            return False
        dist = max(abs(float(x) - self._start_x), abs(float(y) - self._start_y))
        if dist >= DRAG_MIN_PX:
            self._moved = True
        return self._moved

    def release(self, x: float, y: float, t: float) -> str | None:
        if not self._pressed:
            return None
        self._pressed = False
        self.move(x, y)
        moment = float(t)
        if self._moved:
            return "drag"
        if moment - self._start_t > CLICK_MAX_SEC:
            return None
        if (self._last_click_t is not None
                and moment - self._last_click_t <= DOUBLE_CLICK_MAX_SEC):
            self._last_click_t = None
            return "double-click"
        self._last_click_t = moment
        return "click"

    def cancel(self) -> None:
        self._pressed = False
        self._moved = False


def menu_model(activity: object, schedule_on: bool = True) -> list[tuple[str, str]]:
    """Right-click menu model: (action id, label) pairs, no toolkit."""
    name = getattr(activity, "value", activity)
    text = str(name).lower()
    sleep_label = "Wake up" if text == "sleep" else "Send to sleep"
    sleep_action = "wake" if text == "sleep" else "sleep"
    routine_label = "Sleep schedule: on" if schedule_on else "Sleep schedule: off"
    return [
        ("feed", "Feed"),
        ("play", "Play"),
        (sleep_action, sleep_label),
        ("routine", routine_label),
        ("settings", "Settings..."),
        ("about", "About"),
        ("quit", "Quit"),
    ]


class CarrySession:
    """Tracks a pick-up-and-carry drag (movement suspends while held)."""

    def __init__(self) -> None:
        self.active = False
        self.offset_x = 0.0
        self.offset_y = 0.0

    def start(self, offset_x: float, offset_y: float) -> None:
        self.active = True
        self.offset_x = float(offset_x)
        self.offset_y = float(offset_y)

    def stop(self) -> None:
        self.active = False
        self.offset_x = 0.0
        self.offset_y = 0.0


class WindowController:
    """Owns a Brain plus bubble, menu, carry, and pose-blend state."""

    def __init__(self, brain: Brain | None = None, seed: int | None = None,
                 alpha: float = 1.0, scale: float = 1.0,
                 topmost: bool = True, clock: object = None,
                 settings: settings_mod.AppSettings | None = None) -> None:
        self.brain = brain or Brain(seed=seed)
        self.settings = settings or settings_mod.AppSettings()
        if settings is not None:
            alpha = self.settings.alpha
            scale = self.settings.scale
            topmost = self.settings.topmost
        self.bubble = Bubble()
        self.clicks = ClickTracker()
        self.carry = CarrySession()
        self.strokes = StrokeTracker()
        self.munch = MunchSession()
        self.game = BallGame(seed=seed)
        self.routine = SleepSchedule()
        self.talker = Converser(
            character_id=getattr(self.brain.state, "character_id", "pip"),
            name=self.brain.state.name, seed=seed)
        self.moments = LifeEvents(
            character_id=getattr(self.brain.state, "character_id", "pip"),
            name=self.brain.state.name, seed=seed)
        self._apply_settings_to_layers()
        # clock() returns the wall-clock hour 0..24 for the sleep
        # schedule, or None to disable schedule checks (headless/tests).
        self.clock = clock
        self.alpha = platform_mod.clamp_alpha(alpha)
        self.scale = platform_mod.clamp_scale(scale)
        self.topmost = bool(topmost)
        self.phase = 0.0
        self._shown_activity = self._activity_name()
        self._blend_t = 1.0
        self._blend_from: Pose | None = None
        self._previous_activity = self._shown_activity
        self._routine_hold_until = 0.0

    def _apply_settings_to_layers(self) -> None:
        """Sync behavior toggles into the brain and the sleep routine."""
        self.brain.allow_walk = bool(self.settings.wander)
        self.brain.allow_play = bool(self.settings.play_invites)
        self.routine.set_enabled(self.settings.sleep_schedule)
        self.routine.bedtime = self.settings.bedtime % 24.0
        self.routine.wake = self.settings.wake % 24.0

    def apply_settings(self, new: settings_mod.AppSettings) -> str:
        """Adopt new settings and push them into every layer."""
        if not isinstance(new, settings_mod.AppSettings):
            raise ValueError("apply_settings needs an AppSettings")
        self.settings = new
        self._apply_settings_to_layers()
        self.alpha = platform_mod.clamp_alpha(new.alpha)
        self.scale = platform_mod.clamp_scale(new.scale)
        self.topmost = bool(new.topmost)
        return "Settings applied."

    def _say(self, text: str, duration: float = BUBBLE_DEFAULT_SEC,
            now: float | None = None) -> None:
        """Show bubble speech unless the dialogue toggle is off."""
        if not self.settings.dialogue:
            return
        self.bubble.show(text, duration=duration, now=now)

    def _activity_name(self, now: float | None = None) -> str:
        if self.carry.active:
            return "carried"
        if self.munch.is_active(now):
            return "munch"
        return self.brain.state.activity.value

    def _now(self, now: object) -> float:
        if now is None:
            return time.monotonic()
        try:
            moment = float(now)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return time.monotonic()
        if moment != moment:
            return time.monotonic()
        return moment

    def _hour(self) -> float | None:
        if self.clock is None:
            return None
        try:
            hour = float(self.clock())  # type: ignore[operator]
        except (TypeError, ValueError):
            return None
        if hour != hour:
            return None
        return hour % 24.0

    def tick(self, dt: float, now: object = None) -> None:
        """Advance animation phase, the behavior brain, and play state."""
        try:
            step = float(dt)
        except (TypeError, ValueError):
            step = 0.0
        if step != step or step < 0.0:
            step = 0.0
        moment = self._now(now)
        self.phase = (self.phase + step * 4.0) % (2.0 * 3.141592653589793)
        if step > 0.0 and self._blend_t < 1.0:
            self._blend_t = min(1.0, self._blend_t + step / POSE_BLEND_SEC)
        if step <= 0.0:
            return
        if not self.carry.active:
            for event in self.brain.tick(min(step, 1.0)):
                if event.kind in ("activity", "wake"):
                    self._note_activity_change(moment)
                if event.text:
                    self._say(event.text)
        else:
            # While carried the pet still gets hungry and tired, but it
            # does not wander or change activities mid-air.
            step = min(step, 1.0)
            needs_mod.tick_needs(self.brain.state, step)
            self.brain.state.tick_count += 1
            self.brain.state.mood = mood_for(self.brain.state)
        self._tick_game(step, moment)
        self._tick_routine(moment)
        self._tick_moments(moment)

    def _tick_moments(self, moment: float) -> None:
        """Poll the living-moments bus and voice due moments."""
        state = self.brain.state
        try:
            self.talker.set_name(state.name)
            self.moments.set_name(state.name)
        except Exception:
            pass
        for happened in self.moments.poll(
                mood=state.mood, hunger=state.hunger, energy=state.energy,
                affection=state.affection,
                activity=self._activity_name(moment),
                hour=self._hour(), now=moment):
            if happened.text:
                self._say(happened.text)

    def _tick_game(self, step: float, moment: float) -> None:
        if not self.game.active:
            return
        if self.brain.state.activity == Activity.SLEEP:
            self.game.stop()
            self._say(self.brain.personality.line_for("sleepy"))
            return
        for outcome in self.game.tick(step, moment):
            if outcome == "catch":
                gain = traits_mod.interaction_for(
                    getattr(self.brain.state, "character_id",
                            "pip"))["catch_gain"]
                gained = needs_mod.add_affection(self.brain.state, gain)
                self.brain.state.mood = mood_for(self.brain.state)
                if gained > 0.0:
                    self._say(
                        self.brain.personality.line_for_event("catch"))
            elif outcome == "finish":
                self._say(
                    "%s caught the ball %d time%s! %s" % (
                        self.brain.state.name, self.game.catches,
                        "" if self.game.catches == 1 else "s",
                        self.brain.personality.line_for_event("play")))

    def _tick_routine(self, moment: float) -> None:
        hour = self._hour()
        if hour is None or self.carry.active:
            return
        state = self.brain.state
        want_asleep = self.routine.should_be_asleep(hour)
        is_asleep = state.activity == Activity.SLEEP
        if want_asleep == is_asleep:
            return
        if moment < self._routine_hold_until:
            # A recent manual sleep/wake wins for a grace period so the
            # schedule never reverts the user's choice on the next tick.
            return
        if want_asleep:
            event = self.brain.send_to_sleep()
            self._note_activity_change(moment)
            self._say(event.text)
        else:
            event = self.brain.wake()
            self._note_activity_change(moment)
            self._say(event.text)

    def _note_activity_change(self, now: float | None = None) -> None:
        current = self._activity_name(now)
        if current != self._shown_activity:
            self._previous_activity = self._shown_activity
            self._shown_activity = current
            self._blend_t = 0.0

    def current_pose(self, now: object = None) -> Pose:
        """Blended sprite pose for the current animation phase."""
        moment: float | None
        try:
            moment = self._now(now) if now is not None else None
        except Exception:
            moment = None
        current = self._activity_name(moment)
        if current != self._shown_activity:
            self._note_activity_change(moment)
        character = normalize_character(
            getattr(self.brain.state, "character_id", "pip"))
        fresh = pose_for(self._shown_activity, self.phase, character)
        if self._blend_from is not None:
            if self._blend_t >= 1.0:
                self._blend_from = None
                return fresh
            return blend(self._blend_from, fresh, self._blend_t)
        if self._blend_t >= 1.0:
            return fresh
        older = pose_for(self._previous_activity, self.phase, character)
        return blend(older, fresh, self._blend_t)

    def _interaction_mods(self) -> dict:
        """Per-character stroke/catch/munch/ball modifiers (data, not branches)."""
        try:
            return traits_mod.interaction_for(
                getattr(self.brain.state, "character_id", "pip"))
        except Exception:
            return traits_mod.interaction_for("pip")

    def talk(self, text: object, now: object = None) -> str:
        """Answer a typed line out loud in the speech bubble.

        Runs the offline conversation heart with the live needs context
        and returns the reply shown (empty string when dialogue is off).
        """
        state = self.brain.state
        moment = self._now(now)
        self.talker.set_character(
            getattr(state, "character_id", "pip"))
        self.talker.set_name(state.name)
        reply, _hint = self.talker.reply(
            text, mood=state.mood, hunger=state.hunger,
            energy=state.energy, hour=self._hour())
        self.moments.notify_interaction(moment)
        self._say(reply, now=now)
        return reply if self.settings.dialogue else ""

    def switch_character(self, character_id: object,
                         now: object = None) -> tuple[str, str | None]:
        """Hot-swap the active character and re-render on the next frame.

        Persists nothing itself (the shell/CLI saves); returns the
        (bubble text, catalog notice) so callers can surface fallbacks.
        """
        from ..pet_core import catalog as catalog_mod

        old_character = normalize_character(
            getattr(self.brain.state, "character_id", "pip"))
        old_pose = pose_for(self._shown_activity, self.phase, old_character)
        record, notice = catalog_mod.get(character_id)
        event = self.brain.set_character(record["id"])
        self.talker.set_character(record["id"])
        self.talker.set_name(self.brain.state.name)
        self.moments.set_character(record["id"])
        self.moments.set_name(self.brain.state.name)
        self._blend_from = old_pose
        self._blend_t = 0.0
        self._previous_activity = self._shown_activity
        self._say(event.text)
        return event.text, notice

    def handle_gesture(self, gesture: str | None, now: object = None) -> str | None:
        """React to a classified gesture. Returns the bubble text shown."""
        state = self.brain.state
        if gesture == "click":
            # A gentle click is a stroke: a small affection nudge plus
            # chat, escalating to a full purring celebration on streaks.
            # The nudge size is a per-character trait (Mochi melts
            # faster, Rusty barely notices).
            moment = self._now(now)
            streak = self.strokes.register(moment)
            self.moments.notify_interaction(moment)
            needs_mod.add_affection(
                state, self._interaction_mods()["stroke_gain"])
            state.mood = mood_for(state)
            if (streak >= STROKE_COMBO_AT
                    and (streak - STROKE_COMBO_AT) % STROKE_COMBO_EVERY == 0):
                event = self.brain.stroke()
                self._say(event.text)
                return event.text
            text = self.brain.personality.line_for(state.mood)
            if streak > 1:
                text = "%s (warm x%d)" % (text, streak)
            self._say(text)
            return text
        if gesture == "double-click":
            event = self.brain.poke()
            self.strokes.reset()
            self.moments.notify_interaction(self._now(now))
            self._note_activity_change(self._now(now))
            self._say(event.text)
            return event.text
        if gesture == "drag":
            return None
        return None

    def drop(self) -> str:
        """End a carry session with a relieved line in the bubble."""
        self.carry.stop()
        self._note_activity_change()
        state = self.brain.state
        text = self.brain.personality.line_for(state.mood)
        self._say(text)
        return text

    def run_menu_action(self, action: str, now: object = None) -> tuple[str | None, bool]:
        """Run a menu action. Returns (bubble text or about text, quit flag).

        The about entry returns multi-line app info instead of bubble
        text; the shell shows it in a dialog. Quit returns (None, True).
        """
        moment = self._now(now)
        if action == "feed":
            event = self.brain.feed_pet()
            try:
                self.munch.duration = max(
                    0.5, float(self._interaction_mods()["munch_sec"]))
            except (TypeError, ValueError):
                pass
            self.munch.start(moment)
            self.moments.notify_fed(moment)
            self._note_activity_change(moment)
            self._say(event.text)
            return (event.text, False)
        if action == "play":
            event = self.brain.invite_play()
            self._note_activity_change(moment)
            if event.activity == Activity.PLAY:
                self.game.set_catch_radius(
                    self._interaction_mods()["catch_radius_mult"])
                self.game.start(moment)
            self.moments.notify_interaction(moment)
            self._say(event.text)
            return (event.text, False)
        if action == "sleep":
            event = self.brain.send_to_sleep()
            self._routine_hold_until = moment + ROUTINE_HOLD_SEC
            self.moments.notify_interaction(moment)
            self._note_activity_change(moment)
            self._say(event.text)
            return (event.text, False)
        if action == "wake":
            event = self.brain.wake()
            self._routine_hold_until = moment + ROUTINE_HOLD_SEC
            self.moments.notify_interaction(moment)
            self._note_activity_change(moment)
            self._say(event.text)
            return (event.text, False)
        if action == "routine":
            enabled = self.routine.set_enabled(not self.routine.enabled)
            self.settings.sleep_schedule = enabled
            self.moments.notify_interaction(moment)
            text = self.routine.describe()
            if enabled:
                text = "%s %s" % (text, self.brain.personality.line_for("sleepy"))
            self._say(text)
            return (text, False)
        if action == "about":
            return (self.about_text(), False)
        if action == "settings":
            # The tkinter shell intercepts this action and opens the
            # settings dialog; headless callers get the live summary
            # instead so the action always answers with real state.
            text = self.settings.describe()
            self._say(text)
            return (text, False)
        if action == "quit":
            return (None, True)
        return (None, False)

    def about_text(self) -> str:
        state = self.brain.state
        return (
            "Desktop Pet %s\n"
            "%s the companion (mood: %s, activity: %s)\n"
            "Energy %.0f, hunger %.0f, affection %.0f.\n"
            "Single click chats, double click pokes, drag to carry. "
            "Right click opens this menu." % (
                _app_version(), state.name, state.mood,
                state.activity.value, state.energy, state.hunger,
                state.affection)
        )

    def set_alpha(self, value: float) -> float:
        self.alpha = platform_mod.clamp_alpha(value)
        return self.alpha

    def set_scale(self, value: float) -> float:
        self.scale = platform_mod.clamp_scale(value)
        return self.scale

    def set_topmost(self, value: bool) -> bool:
        self.topmost = bool(value)
        return self.topmost

    def menu(self) -> list[tuple[str, str]]:
        return menu_model(self.brain.state.activity, self.routine.enabled)

    def ball_shape(self, box: float = 160.0) -> dict | None:
        """Ball primitive for the shell to paint, or None when idle."""
        if not self.game.active:
            return None
        return self.game.ball_shape(box)

    def activity_label(self) -> str:
        state = self.brain.state
        if self.carry.active:
            return "%s (carried)" % state.name
        if self.game.active:
            return "%s (%s, %s) ball %d/%d" % (
                state.name, state.activity.value, state.mood,
                self.game.score, CATCHES_TO_FINISH)
        return "%s (%s, %s)" % (state.name, state.activity.value, state.mood)

    def about_hint(self) -> str:
        state = self.brain.state
        return "%s: click to chat, double click to poke, right click for menu." % (
            state.name)


def _app_version() -> str:
    try:
        from .. import __version__ as version
    except Exception:
        return "0.0.0"
    return str(version)


def activity_of(state: object) -> str:
    """Helper for the shell: activity name of a core state."""
    activity = getattr(state, "activity", Activity.IDLE)
    name = getattr(activity, "value", activity)
    return str(name).lower()
