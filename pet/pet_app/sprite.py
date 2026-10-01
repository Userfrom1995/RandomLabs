"""Procedural sprite pose engine (no GUI imports allowed here).

Every pose is a pure function of (activity, phase): the same inputs
always yield the same Pose, so headless tests and the Pages showcase
can mirror this math exactly. Rendering happens in two steps:

1. ``pose_for(activity, phase)`` returns eased body parameters.
2. ``shapes(pose, size)`` returns a list of primitive shape dicts in a
   ``size`` x ``size`` box (oval, circle, polygon, arc, line, text).
3. ``draw_on(canvas, drawing, ...)`` (tkinter only) paints them.

The Pages hub mirrors ``pose_for`` plus ``shapes`` in JS canvas, so keep
the math plain cosine/sine blends with no Python-only tricks.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

CANVAS_BOX = 160.0

VALID_ACTIVITIES = ("idle", "walk", "play", "sleep", "react", "carried")


@dataclass
class Pose:
    """Eased body parameters. All fields are unitless unless noted."""

    squash_x: float = 1.0  # horizontal body scale (1 is neutral)
    squash_y: float = 1.0  # vertical body scale (1 is neutral)
    eye_open: float = 1.0  # 0 closed, 1 wide open
    pupil_dx: float = 0.0  # pupil offset in body radii (-1 to 1)
    pupil_dy: float = 0.0  # pupil offset in body radii (-1 to 1)
    ear_tilt: float = 0.0  # ear lean in radians (-0.5 to 0.5)
    tail_angle: float = 0.4  # tail sway in radians
    hop: float = 0.0  # vertical jump offset in body radii (up is positive)
    blush: float = 0.0  # 0 none, 1 full blush
    mouth: str = "smile"  # one of: smile, open, sleep, oh
    breath: float = 0.0  # breathing phase helper (-1 to 1)


def _clamp(value: float, low: float, high: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return low
    if number != number:  # NaN
        return low
    if number < low:
        return low
    if number > high:
        return high
    return number


def _smootherstep(edge0: float, edge1: float, value: float) -> float:
    """6th-order smooth blend between 0 and 1 (Ken Perlin's improvement)."""
    if edge0 == edge1:
        return 0.0
    t = _clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def blend(pose_a: Pose, pose_b: Pose, t: float) -> Pose:
    """Eased interpolation between two poses (t clamped to 0..1)."""
    mix = _smootherstep(0.0, 1.0, t)
    mouth = pose_b.mouth if mix >= 0.5 else pose_a.mouth
    return Pose(
        squash_x=pose_a.squash_x + (pose_b.squash_x - pose_a.squash_x) * mix,
        squash_y=pose_a.squash_y + (pose_b.squash_y - pose_a.squash_y) * mix,
        eye_open=pose_a.eye_open + (pose_b.eye_open - pose_a.eye_open) * mix,
        pupil_dx=pose_a.pupil_dx + (pose_b.pupil_dx - pose_a.pupil_dx) * mix,
        pupil_dy=pose_a.pupil_dy + (pose_b.pupil_dy - pose_a.pupil_dy) * mix,
        ear_tilt=pose_a.ear_tilt + (pose_b.ear_tilt - pose_a.ear_tilt) * mix,
        tail_angle=pose_a.tail_angle + (pose_b.tail_angle - pose_a.tail_angle) * mix,
        hop=pose_a.hop + (pose_b.hop - pose_a.hop) * mix,
        blush=pose_a.blush + (pose_b.blush - pose_a.blush) * mix,
        mouth=mouth,
        breath=pose_a.breath + (pose_b.breath - pose_a.breath) * mix,
    )


def _normalize_activity(activity: object) -> str:
    name = getattr(activity, "value", activity)
    text = str(name).lower()
    if text in VALID_ACTIVITIES:
        return text
    return "idle"


def _normalize_phase(phase: object) -> float:
    try:
        number = float(phase)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0
    if number != number:  # NaN
        return 0.0
    return number % (2.0 * math.pi)


def pose_for(activity: object, phase: object = 0.0) -> Pose:
    """Return the eased pose for an activity at an animation phase.

    Phase is in radians and wraps every 2*pi. Unknown activities fall
    back to idle; unparsable phases fall back to 0.
    """
    name = _normalize_activity(activity)
    wave = _normalize_phase(phase)
    breath = math.cos(wave)
    sway = math.sin(wave)

    if name == "idle":
        blink = 1.0
        if (wave % (2.0 * math.pi)) > 5.6:
            blink = max(0.05, 1.0 - (wave - 5.6) * 2.5)
        return Pose(
            squash_x=1.0 + 0.02 * breath,
            squash_y=1.0 - 0.025 * breath,
            eye_open=blink,
            pupil_dx=0.15 * sway,
            ear_tilt=0.05 * sway,
            tail_angle=0.4 + 0.25 * sway,
            blush=0.25,
            mouth="smile",
            breath=breath,
        )
    if name == "walk":
        bob = abs(math.sin(wave * 2.0))
        return Pose(
            squash_x=1.0 - 0.03 * bob,
            squash_y=1.0 + 0.04 * bob,
            eye_open=1.0,
            pupil_dx=0.45,
            ear_tilt=0.12,
            tail_angle=0.4 + 0.55 * sway,
            hop=0.10 * bob,
            blush=0.15,
            mouth="smile",
            breath=breath,
        )
    if name == "play":
        jump = max(0.0, math.sin(wave * 2.0))
        return Pose(
            squash_x=1.0 - 0.06 * jump,
            squash_y=1.0 + 0.10 * jump,
            eye_open=1.0,
            pupil_dx=0.2 * sway,
            pupil_dy=-0.2 * jump,
            ear_tilt=-0.15,
            tail_angle=0.4 + 0.8 * sway,
            hop=0.35 * jump,
            blush=0.8,
            mouth="open",
            breath=breath,
        )
    if name == "sleep":
        drift = math.sin(wave * 0.5)
        return Pose(
            squash_x=1.0 + 0.06 * breath,
            squash_y=0.82 - 0.03 * breath,
            eye_open=0.0,
            ear_tilt=0.25,
            tail_angle=0.1 + 0.1 * drift,
            blush=0.35,
            mouth="sleep",
            breath=breath,
        )
    if name == "react":
        startle = max(0.0, math.cos(wave * 3.0))
        return Pose(
            squash_x=1.0 - 0.10 * startle,
            squash_y=1.0 + 0.12 * startle,
            eye_open=1.0,
            pupil_dx=0.0,
            pupil_dy=-0.1,
            ear_tilt=-0.3 * startle,
            tail_angle=1.1,
            hop=0.12 * startle,
            blush=0.6,
            mouth="oh",
            breath=breath,
        )
    # carried: dangling pose while the user holds the pet.
    return Pose(
        squash_x=1.0 + 0.02 * breath,
        squash_y=1.12,
        eye_open=1.0,
        pupil_dy=0.25,
        ear_tilt=0.1 * sway,
        tail_angle=0.0 + 0.15 * sway,
        hop=0.0,
        blush=0.5,
        mouth="smile",
        breath=breath,
    )


def shapes(pose: Pose, size: float = CANVAS_BOX) -> list[dict]:
    """Return canvas primitives for a pose in a size x size box.

    Coordinates scale linearly with size, so DPI and user scale stay
    crisp: shape EI at size S times k equals shape EI at size S*k.
    """
    try:
        box = float(size)
    except (TypeError, ValueError):
        box = CANVAS_BOX
    if box != box or box <= 0.0:  # NaN or non-positive
        box = CANVAS_BOX
    unit = box / CANVAS_BOX
    cx = box / 2.0
    body_r = 52.0 * unit
    squash_x = _clamp(pose.squash_x, 0.5, 1.6)
    squash_y = _clamp(pose.squash_y, 0.5, 1.6)
    rx = body_r * squash_x
    ry = body_r * squash_y
    hop_px = _clamp(pose.hop, -1.0, 1.5) * body_r
    cy = box * 0.58 - hop_px
    eye_open = _clamp(pose.eye_open, 0.0, 1.0)
    ear_tilt = _clamp(pose.ear_tilt, -0.6, 0.6)
    tail_angle = _clamp(pose.tail_angle, -1.5, 1.5)
    blush = _clamp(pose.blush, 0.0, 1.0)
    pupil_dx = _clamp(pose.pupil_dx, -1.0, 1.0)
    pupil_dy = _clamp(pose.pupil_dy, -1.0, 1.0)

    out: list[dict] = []
    # Tail (line from body edge outward).
    tail_len = 44.0 * unit
    tail_x0 = cx + rx * 0.85
    tail_y0 = cy + ry * 0.35
    tail_x1 = tail_x0 + math.cos(tail_angle) * tail_len
    tail_y1 = tail_y0 - math.sin(tail_angle) * tail_len - 12.0 * unit
    out.append({
        "kind": "line", "coords": [tail_x0, tail_y0, tail_x1, tail_y1],
        "fill": "#e8b64c", "width": 9.0 * unit,
    })
    out.append({
        "kind": "circle", "coords": [tail_x1 - 6.0 * unit, tail_y1 - 6.0 * unit,
                                    tail_x1 + 6.0 * unit, tail_y1 + 6.0 * unit],
        "fill": "#f6d789",
    })
    # Ears (triangles, tilted).
    ear = 26.0 * unit
    tilt_px = ear_tilt * 30.0 * unit
    out.append({
        "kind": "polygon",
        "coords": [cx - rx * 0.62 + tilt_px, cy - ry * 0.72,
                   cx - rx * 0.30 + tilt_px, cy - ry * 1.28,
                   cx - rx * 0.10 + tilt_px, cy - ry * 0.66],
        "fill": "#f2a65a",
    })
    out.append({
        "kind": "polygon",
        "coords": [cx + rx * 0.62 + tilt_px, cy - ry * 0.72,
                   cx + rx * 0.30 + tilt_px, cy - ry * 1.28,
                   cx + rx * 0.10 + tilt_px, cy - ry * 0.66],
        "fill": "#f2a65a",
    })
    # Body.
    out.append({
        "kind": "oval",
        "coords": [cx - rx, cy - ry, cx + rx, cy + ry],
        "fill": "#f6c453",
    })
    # Belly patch.
    out.append({
        "kind": "oval",
        "coords": [cx - rx * 0.45, cy - ry * 0.1, cx + rx * 0.45, cy + ry * 0.72],
        "fill": "#fde9b8",
    })
    # Eyes.
    eye_dx = rx * 0.34
    eye_y = cy - ry * 0.18
    eye_rx = 9.0 * unit
    eye_ry = max(1.2 * unit, 10.0 * unit * eye_open)
    for side in (-1.0, 1.0):
        ex = cx + side * eye_dx
        out.append({
            "kind": "oval",
            "coords": [ex - eye_rx, eye_y - eye_ry, ex + eye_rx, eye_y + eye_ry],
            "fill": "#23232b",
        })
        if eye_open > 0.4:
            sparkle = 2.5 * unit
            out.append({
                "kind": "circle",
                "coords": [ex - sparkle, eye_y - eye_ry * 0.5 - sparkle,
                           ex + sparkle, eye_y - eye_ry * 0.5 + sparkle],
                "fill": "#ffffff",
            })
            out.append({
                "kind": "circle",
                "coords": [ex + pupil_dx * 4.0 * unit - 3.5 * unit,
                           eye_y + pupil_dy * 4.0 * unit - 3.5 * unit,
                           ex + pupil_dx * 4.0 * unit + 3.5 * unit,
                           eye_y + pupil_dy * 4.0 * unit + 3.5 * unit],
                "fill": "#23232b",
            })
    # Blush.
    if blush > 0.02:
        blush_r = (4.0 + 5.0 * blush) * unit
        for side in (-1.0, 1.0):
            bx = cx + side * rx * 0.58
            by = cy + ry * 0.22
            out.append({
                "kind": "circle",
                "coords": [bx - blush_r, by - blush_r, bx + blush_r, by + blush_r],
                "fill": "#f1948a",
            })
    # Mouth.
    mouth_y = cy + ry * 0.38
    if pose.mouth == "open":
        out.append({
            "kind": "oval",
            "coords": [cx - 8.0 * unit, mouth_y - 6.0 * unit,
                       cx + 8.0 * unit, mouth_y + 9.0 * unit],
            "fill": "#7b3f2a",
        })
    elif pose.mouth == "oh":
        out.append({
            "kind": "oval",
            "coords": [cx - 6.0 * unit, mouth_y - 8.0 * unit,
                       cx + 6.0 * unit, mouth_y + 8.0 * unit],
            "fill": "#7b3f2a",
        })
    elif pose.mouth == "sleep":
        out.append({
            "kind": "line",
            "coords": [cx - 10.0 * unit, mouth_y, cx + 10.0 * unit, mouth_y],
            "fill": "#7b3f2a", "width": 2.5 * unit,
        })
    else:
        out.append({
            "kind": "arc",
            "coords": [cx - 12.0 * unit, mouth_y - 8.0 * unit,
                       cx + 12.0 * unit, mouth_y + 8.0 * unit],
            "fill": "#7b3f2a", "width": 2.5 * unit,
        })
    # Sleep Z markers float above the head.
    if pose.mouth == "sleep":
        for dx, dy, font in ((34.0, -62.0, 16), (48.0, -84.0, 22)):
            out.append({
                "kind": "text",
                "coords": [cx + dx * unit, cy + dy * unit],
                "text": "z", "font_size": font, "fill": "#7aa2f7",
            })
    return out


def draw_on(canvas: object, drawing: list[dict], dx: float = 0.0,
            dy: float = 0.0) -> None:
    """Paint a shape list onto a tkinter canvas (tkinter only here).

    The import stays inside this function so the pose math above remains
    import-safe on headless systems and in unit tests.
    """
    for item in drawing:
        kind = item.get("kind")
        coords = [float(c) for c in item.get("coords", [])]
        shifted: list[float] = []
        for i, value in enumerate(coords):
            shifted.append(value + (dx if i % 2 == 0 else dy))
        if kind == "oval":
            canvas.create_oval(*shifted, fill=item.get("fill", ""), outline="")
        elif kind == "circle":
            canvas.create_oval(*shifted, fill=item.get("fill", ""), outline="")
        elif kind == "polygon":
            canvas.create_polygon(*shifted, fill=item.get("fill", ""), outline="")
        elif kind == "arc":
            canvas.create_arc(*shifted, start=200, extent=140,
                              style="arc", outline=item.get("fill", ""),
                              width=item.get("width", 2.0))
        elif kind == "line":
            canvas.create_line(*shifted, fill=item.get("fill", ""),
                               width=item.get("width", 2.0), capstyle="round")
        elif kind == "text":
            canvas.create_text(shifted[0], shifted[1], text=item.get("text", ""),
                               fill=item.get("fill", ""),
                               font=("Helvetica", item.get("font_size", 14), "bold"))
