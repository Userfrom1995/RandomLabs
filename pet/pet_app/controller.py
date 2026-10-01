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
from ..pet_core.brain import Brain
from ..pet_core.personality import mood_for
from ..pet_core.state import Activity
from . import platform as platform_mod
from .sprite import Pose, blend, pose_for

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


def menu_model(activity: object) -> list[tuple[str, str]]:
    """Right-click menu model: (action id, label) pairs, no toolkit."""
    name = getattr(activity, "value", activity)
    text = str(name).lower()
    sleep_label = "Wake up" if text == "sleep" else "Send to sleep"
    sleep_action = "wake" if text == "sleep" else "sleep"
    return [
        ("feed", "Feed"),
        ("play", "Play"),
        (sleep_action, sleep_label),
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
                 topmost: bool = True) -> None:
        self.brain = brain or Brain(seed=seed)
        self.bubble = Bubble()
        self.clicks = ClickTracker()
        self.carry = CarrySession()
        self.alpha = platform_mod.clamp_alpha(alpha)
        self.scale = platform_mod.clamp_scale(scale)
        self.topmost = bool(topmost)
        self.phase = 0.0
        self._shown_activity = self._activity_name()
        self._blend_t = 1.0
        self._previous_activity = self._shown_activity

    def _activity_name(self) -> str:
        if self.carry.active:
            return "carried"
        return self.brain.state.activity.value

    def tick(self, dt: float) -> None:
        """Advance animation phase and the behavior brain (10 Hz ticks)."""
        try:
            step = float(dt)
        except (TypeError, ValueError):
            step = 0.0
        if step != step or step < 0.0:
            step = 0.0
        self.phase = (self.phase + step * 4.0) % (2.0 * 3.141592653589793)
        if step > 0.0 and self._blend_t < 1.0:
            self._blend_t = min(1.0, self._blend_t + step / POSE_BLEND_SEC)
        if step <= 0.0:
            return
        if not self.carry.active:
            for event in self.brain.tick(min(step, 1.0)):
                if event.kind in ("activity", "wake"):
                    self._note_activity_change()
                if event.text:
                    self.bubble.show(event.text)
        else:
            # While carried the pet still gets hungry and tired, but it
            # does not wander or change activities mid-air.
            step = min(step, 1.0)
            needs_mod.tick_needs(self.brain.state, step)
            self.brain.state.tick_count += 1
            self.brain.state.mood = mood_for(self.brain.state)

    def _note_activity_change(self) -> None:
        current = self._activity_name()
        if current != self._shown_activity:
            self._previous_activity = self._shown_activity
            self._shown_activity = current
            self._blend_t = 0.0

    def current_pose(self) -> Pose:
        """Blended sprite pose for the current animation phase."""
        current = self._activity_name()
        if current != self._shown_activity:
            self._note_activity_change()
        fresh = pose_for(self._shown_activity, self.phase)
        if self._blend_t >= 1.0:
            return fresh
        older = pose_for(self._previous_activity, self.phase)
        return blend(older, fresh, self._blend_t)

    def handle_gesture(self, gesture: str | None) -> str | None:
        """React to a classified gesture. Returns the bubble text shown."""
        state = self.brain.state
        if gesture == "click":
            text = self.brain.personality.line_for(state.mood)
            self.bubble.show(text)
            return text
        if gesture == "double-click":
            event = self.brain.poke()
            self._note_activity_change()
            self.bubble.show(event.text)
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
        self.bubble.show(text)
        return text

    def run_menu_action(self, action: str) -> tuple[str | None, bool]:
        """Run a menu action. Returns (bubble text or about text, quit flag).

        The about entry returns multi-line app info instead of bubble
        text; the shell shows it in a dialog. Quit returns (None, True).
        """
        if action == "feed":
            event = self.brain.feed_pet()
            self.bubble.show(event.text)
            return (event.text, False)
        if action == "play":
            event = self.brain.invite_play()
            self._note_activity_change()
            self.bubble.show(event.text)
            return (event.text, False)
        if action == "sleep":
            event = self.brain.send_to_sleep()
            self._note_activity_change()
            self.bubble.show(event.text)
            return (event.text, False)
        if action == "wake":
            event = self.brain.wake()
            self._note_activity_change()
            self.bubble.show(event.text)
            return (event.text, False)
        if action == "about":
            return (self.about_text(), False)
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
        return menu_model(self.brain.state.activity)

    def activity_label(self) -> str:
        state = self.brain.state
        if self.carry.active:
            return "%s (carried)" % state.name
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
