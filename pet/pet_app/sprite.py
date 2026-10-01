"""Parametric sprite cast engine (no GUI imports allowed here).

Every pose is a pure function of (character, activity, phase): the same
inputs always yield the same Pose, so headless tests and the Pages
showcase can mirror this math exactly. Rendering happens in three steps:

1. ``pose_for(activity, phase, character_id)`` returns eased body
   parameters (a character-first call ``pose_for(character, activity,
   phase)`` is accepted too and means the same thing).
2. ``shapes(pose, size, character_id)`` returns a list of primitive
   shape dicts in a ``size`` x ``size`` box (oval, circle, polygon, arc,
   line, text), dispatched by the character's body plan and palette.
3. ``draw_on(canvas, drawing, ...)`` (tkinter only) paints them.

The Pages hub mirrors ``pose_for`` plus ``shapes`` in JS canvas, so keep
the math plain cosine/sine blends with no Python-only tricks.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

CANVAS_BOX = 160.0

VALID_ACTIVITIES = ("idle", "walk", "play", "sleep", "react", "carried",
                    "munch")

BODY_PLANS = ("blob", "quadruped", "slime", "avian", "robot", "winged")

#: Launch cast in registry order. Used when the catalog module is not
#: importable (headless embedding); otherwise the catalog is the source
#: of truth and this only resolves the body plan / palette fallback.
CHARACTER_IDS = ("pip", "bramble", "mochi", "kiki", "rusty", "luna")

_FALLBACK_PLANS = {
    "pip": "blob",
    "bramble": "quadruped",
    "mochi": "slime",
    "kiki": "avian",
    "rusty": "robot",
    "luna": "winged",
}

#: Catalog palettes mirrored locally so rendering never crashes when the
#: catalog module cannot be imported. Keys: body / belly / accent.
_FALLBACK_PALETTES = {
    "pip": {"body": "#7FB5D5", "belly": "#F2E8CF", "accent": "#E07A5F"},
    "bramble": {"body": "#D98E4A", "belly": "#FAF0DC", "accent": "#8C3B1B"},
    "mochi": {"body": "#A8D5BA", "belly": "#EFF7E8", "accent": "#5B8C5A"},
    "kiki": {"body": "#F4D35E", "belly": "#FFF8E1", "accent": "#38618C"},
    "rusty": {"body": "#9AA0A6", "belly": "#3C4043", "accent": "#F2B705"},
    "luna": {"body": "#7B6FD0", "belly": "#E6E1FF", "accent": "#F2E394"},
}

FALLBACK_ID = "pip"


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


def normalize_character(character_id: object) -> str:
    """Map any value to a known character id, falling back to Pip."""
    if isinstance(character_id, str):
        slug = character_id.strip().lower()
        if slug in CHARACTER_IDS:
            return slug
    try:
        from ..pet_core import catalog as _catalog
        return _catalog.normalize_id(character_id)
    except Exception:
        return FALLBACK_ID


def body_plan_for(character_id: object) -> str:
    """Return the body plan for a character id (unknown falls back to Pip)."""
    slug = normalize_character(character_id)
    try:
        from ..pet_core import catalog as _catalog
        record, _ = _catalog.get(slug)
        plan = record.get("body_plan")
        if plan in BODY_PLANS:
            return plan
    except Exception:
        pass
    return _FALLBACK_PLANS.get(slug, "blob")


def palette_for(character_id: object) -> dict[str, str]:
    """Return a copy of the palette for a character id."""
    slug = normalize_character(character_id)
    try:
        from ..pet_core import catalog as _catalog
        record, _ = _catalog.get(slug)
        palette = record.get("palette")
        if isinstance(palette, dict) and all(palette.get(k) for k in ("body", "belly", "accent")):
            return {str(k): str(v) for k, v in palette.items()}
    except Exception:
        pass
    return dict(_FALLBACK_PALETTES.get(slug, _FALLBACK_PALETTES["pip"]))


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


def _base_pose(name: str, wave: float, breath: float, sway: float) -> Pose:
    """Shared activity keyframes (identical for every character)."""
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
    if name == "munch":
        chomp = max(0.0, math.sin(wave * 4.0))
        return Pose(
            squash_x=1.0 + 0.05 * chomp,
            squash_y=1.0 - 0.04 * chomp,
            eye_open=0.75,
            pupil_dy=0.15,
            ear_tilt=0.08 * sway,
            tail_angle=0.5 + 0.3 * sway,
            hop=0.03 * chomp,
            blush=0.85,
            mouth="open" if chomp > 0.4 else "smile",
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


def _apply_style(pose: Pose, character_id: str, sway: float) -> Pose:
    """Layer per-character motion style over the shared keyframes.

    Pip is the identity: its pose is returned untouched so the baseline
    cast member keeps the exact shipped motion. Every other character
    scales amplitudes the way its temperament suggests (Bramble jumps
    higher, Mochi barely leaves the floor, Kiki darts its gaze, Rusty
    moves stiffly, Luna hovers).

    The input pose is never mutated: callers may reuse or cache base
    poses, so every branch works on a copy.
    """
    import dataclasses
    if character_id == "pip":
        return dataclasses.replace(pose)
    pose = dataclasses.replace(pose)
    if character_id == "bramble":
        pose.hop *= 1.5
        pose.tail_angle = 0.4 + (pose.tail_angle - 0.4) * 1.4
        pose.squash_x += (pose.squash_x - 1.0) * 0.4
        pose.squash_y += (pose.squash_y - 1.0) * 0.4
        pose.blush = min(1.0, pose.blush + 0.1)
        return pose
    if character_id == "mochi":
        pose.hop *= 0.4
        pose.tail_angle = 0.4 + (pose.tail_angle - 0.4) * 0.4
        pose.squash_x += 0.05
        pose.squash_y -= 0.05
        pose.ear_tilt *= 0.5
        return pose
    if character_id == "kiki":
        pose.pupil_dx *= 1.5
        pose.hop *= 1.2
        pose.tail_angle = 0.4 + (pose.tail_angle - 0.4) * 1.2
        pose.ear_tilt *= 1.5
        return pose
    if character_id == "rusty":
        # Stiff servos: damp squash toward neutral, keep the gaze fixed.
        pose.squash_x = 1.0 + (pose.squash_x - 1.0) * 0.5
        pose.squash_y = 1.0 + (pose.squash_y - 1.0) * 0.5
        pose.hop *= 0.6
        pose.pupil_dx *= 0.3
        pose.ear_tilt *= 0.3
        return pose
    if character_id == "luna":
        pose.hop += 0.05
        pose.tail_angle = 0.4 + (pose.tail_angle - 0.4) * 1.3
        pose.blush = min(1.0, pose.blush + 0.05)
        pose.ear_tilt += 0.05 * sway
        return pose
    return pose


def _resolve_args(activity: object, phase: object,
                  character_id: object) -> tuple[object, object, str]:
    """Accept both (activity, phase, character) and (character, activity, phase).

    The blueprint contract reads ``pose_for(character_id, activity,
    phase)``; the shipped call sites read ``pose_for(activity, phase)``.
    When the first argument is a known character slug and the second is
    a known activity name, treat the call as character-first so both
    spellings work without breaking old callers.
    """
    first = str(getattr(activity, "value", activity)).strip().lower()
    try:
        second_text = str(getattr(phase, "value", phase)).strip().lower()
    except Exception:
        second_text = ""
    if first in CHARACTER_IDS and second_text in VALID_ACTIVITIES:
        if isinstance(character_id, bool):
            return activity, phase, normalize_character(character_id)
        try:
            float(character_id)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            # Two-argument character-first spelling: phase defaults to 0.
            return phase, 0.0, first
        return phase, character_id, first
    return activity, phase, normalize_character(character_id)


def pose_for(activity: object, phase: object = 0.0,
             character_id: object = "pip") -> Pose:
    """Return the eased pose for a character, activity, and phase.

    Phase is in radians and wraps every 2*pi. Unknown activities fall
    back to idle; unparsable phases fall back to 0; unknown characters
    fall back to Pip. A character-first call ``pose_for(character,
    activity, phase)`` is accepted and means the same thing: the phase
    may be a number or a numeric string, and ``pose_for(character,
    activity)`` defaults the phase to 0. Surrounding whitespace on
    character and activity names is ignored.
    """
    activity, phase, slug = _resolve_args(activity, phase, character_id)
    name = _normalize_activity(activity)
    wave = _normalize_phase(phase)
    breath = math.cos(wave)
    sway = math.sin(wave)
    pose = _base_pose(name, wave, breath, sway)
    return _apply_style(pose, slug, sway)


def _draw_tail(out: list[dict], cx: float, cy: float, rx: float, ry: float,
               tail_angle: float, unit: float, palette: dict[str, str],
               bushy: bool = False) -> None:
    tail_len = (52.0 if bushy else 44.0) * unit
    tail_x0 = cx + rx * 0.85
    tail_y0 = cy + ry * 0.35
    tail_x1 = tail_x0 + math.cos(tail_angle) * tail_len
    tail_y1 = tail_y0 - math.sin(tail_angle) * tail_len - 12.0 * unit
    out.append({
        "kind": "line", "coords": [tail_x0, tail_y0, tail_x1, tail_y1],
        "fill": palette["body"], "width": (12.0 if bushy else 9.0) * unit,
    })
    tip = 8.0 * unit if bushy else 6.0 * unit
    out.append({
        "kind": "circle", "coords": [tail_x1 - tip, tail_y1 - tip,
                                    tail_x1 + tip, tail_y1 + tip],
        "fill": palette["accent"],
    })


def _draw_ears(out: list[dict], cx: float, cy: float, rx: float, ry: float,
               ear_tilt: float, unit: float, palette: dict[str, str],
               tall: bool = False) -> None:
    ear = (34.0 if tall else 26.0) * unit
    tilt_px = ear_tilt * 30.0 * unit
    out.append({
        "kind": "polygon",
        "coords": [cx - rx * 0.62 + tilt_px, cy - ry * 0.72,
                   cx - rx * 0.30 + tilt_px, cy - ry * 1.28 - (ear - 26.0 * unit),
                   cx - rx * 0.10 + tilt_px, cy - ry * 0.66],
        "fill": palette["accent"],
    })
    out.append({
        "kind": "polygon",
        "coords": [cx + rx * 0.62 + tilt_px, cy - ry * 0.72,
                   cx + rx * 0.30 + tilt_px, cy - ry * 1.28 - (ear - 26.0 * unit),
                   cx + rx * 0.10 + tilt_px, cy - ry * 0.66],
        "fill": palette["accent"],
    })


def _draw_eyes(out: list[dict], cx: float, cy: float, rx: float, ry: float,
               eye_open: float, pupil_dx: float, pupil_dy: float,
               unit: float, visor: str | None = None) -> None:
    eye_dx = rx * 0.34
    eye_y = cy - ry * 0.18
    eye_rx = 9.0 * unit
    eye_ry = max(1.2 * unit, 10.0 * unit * eye_open)
    if visor is not None:
        out.append({
            "kind": "oval",
            "coords": [cx - eye_dx - eye_rx - 5.0 * unit, eye_y - eye_ry - 5.0 * unit,
                       cx + eye_dx + eye_rx + 5.0 * unit, eye_y + eye_ry + 5.0 * unit],
            "fill": visor,
        })
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


def _draw_blush(out: list[dict], cx: float, cy: float, rx: float, ry: float,
                blush: float, unit: float) -> None:
    if blush <= 0.02:
        return
    blush_r = (4.0 + 5.0 * blush) * unit
    for side in (-1.0, 1.0):
        bx = cx + side * rx * 0.58
        by = cy + ry * 0.22
        out.append({
            "kind": "circle",
            "coords": [bx - blush_r, by - blush_r, bx + blush_r, by + blush_r],
            "fill": "#f1948a",
        })


def _draw_mouth(out: list[dict], cx: float, mouth_y: float, mouth: str,
                unit: float) -> None:
    if mouth == "open":
        out.append({
            "kind": "oval",
            "coords": [cx - 8.0 * unit, mouth_y - 6.0 * unit,
                       cx + 8.0 * unit, mouth_y + 9.0 * unit],
            "fill": "#7b3f2a",
        })
    elif mouth == "oh":
        out.append({
            "kind": "oval",
            "coords": [cx - 6.0 * unit, mouth_y - 8.0 * unit,
                       cx + 6.0 * unit, mouth_y + 8.0 * unit],
            "fill": "#7b3f2a",
        })
    elif mouth == "sleep":
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


def _draw_sleep_markers(out: list[dict], cx: float, cy: float, mouth: str,
                        unit: float) -> None:
    if mouth != "sleep":
        return
    for dx, dy, font in ((34.0, -62.0, 16), (48.0, -84.0, 22)):
        out.append({
            "kind": "text",
            "coords": [cx + dx * unit, cy + dy * unit],
            "text": "z", "font_size": font, "fill": "#7aa2f7",
        })


def shapes(pose: Pose, size: float = CANVAS_BOX,
           character_id: object = "pip") -> list[dict]:
    """Return canvas primitives for a pose in a size x size box.

    Coordinates scale linearly with size, so DPI and user scale stay
    crisp: shape EI at size S times k equals shape EI at size S*k.
    Geometry is dispatched by the character's body plan and painted
    with its catalog palette; unknown characters render as Pip.
    """
    try:
        box = float(size)
    except (TypeError, ValueError):
        box = CANVAS_BOX
    if box != box or not math.isfinite(box) or box <= 0.0:
        box = CANVAS_BOX
    slug = normalize_character(character_id)
    plan = body_plan_for(slug)
    palette = palette_for(slug)
    unit = box / CANVAS_BOX
    cx = box / 2.0
    body_r = 52.0 * unit
    squash_x = _clamp(pose.squash_x, 0.5, 1.6)
    squash_y = _clamp(pose.squash_y, 0.5, 1.6)
    # Quadrupeds read longer than they read tall; slimes puddle out.
    stretch = 1.15 if plan == "quadruped" else (1.08 if plan == "slime" else 1.0)
    flatten = 0.94 if plan in ("quadruped", "slime") else 1.0
    rx = body_r * squash_x * stretch
    ry = body_r * squash_y * flatten
    hop_px = _clamp(pose.hop, -1.0, 1.5) * body_r
    cy = box * 0.58 - hop_px
    eye_open = _clamp(pose.eye_open, 0.0, 1.0)
    ear_tilt = _clamp(pose.ear_tilt, -0.6, 0.6)
    tail_angle = _clamp(pose.tail_angle, -1.5, 1.5)
    blush = _clamp(pose.blush, 0.0, 1.0)
    pupil_dx = _clamp(pose.pupil_dx, -1.0, 1.0)
    pupil_dy = _clamp(pose.pupil_dy, -1.0, 1.0)

    out: list[dict] = []
    if plan == "quadruped":
        # Four stub legs under an elongated fox body.
        for fx in (-0.55, -0.2, 0.2, 0.55):
            out.append({
                "kind": "oval",
                "coords": [cx + fx * rx - 7.0 * unit, cy + ry * 0.55,
                           cx + fx * rx + 7.0 * unit, cy + ry * 0.95],
                "fill": palette["body"],
            })
    if plan == "slime":
        # Puddle the slime sits in (staging only, part of the sprite).
        out.append({
            "kind": "oval",
            "coords": [cx - rx * 1.15, cy + ry * 0.62,
                       cx + rx * 1.15, cy + ry * 1.02],
            "fill": palette["belly"],
        })
    if plan == "robot":
        # Antenna mast with an accent tip light.
        mast_top = cy - ry * 1.28 - 10.0 * unit
        out.append({
            "kind": "line",
            "coords": [cx, cy - ry * 1.0, cx, mast_top],
            "fill": palette["belly"], "width": 4.0 * unit,
        })
        out.append({
            "kind": "circle",
            "coords": [cx - 5.0 * unit, mast_top - 5.0 * unit,
                       cx + 5.0 * unit, mast_top + 5.0 * unit],
            "fill": palette["accent"],
        })
    if plan == "avian":
        # Thin legs under the sparrow body.
        for side in (-1.0, 1.0):
            out.append({
                "kind": "line",
                "coords": [cx + side * rx * 0.3, cy + ry * 0.7,
                           cx + side * rx * 0.3, cy + ry * 1.05],
                "fill": palette["accent"], "width": 3.0 * unit,
            })
    if plan in ("blob", "quadruped", "slime", "avian"):
        _draw_tail(out, cx, cy, rx, ry, tail_angle, unit, palette,
                   bushy=(plan == "quadruped"))
    if plan == "winged":
        # Two broad moth-dragon wings flapping with the tail channel.
        flap = (tail_angle - 0.4) * 14.0 * unit
        for side in (-1.0, 1.0):
            out.append({
                "kind": "polygon",
                "coords": [cx + side * rx * 0.5, cy - ry * 0.5,
                           cx + side * (rx * 1.35), cy - ry * 1.15 - flap,
                           cx + side * rx * 0.9, cy + ry * 0.25],
                "fill": palette["body"],
            })
            out.append({
                "kind": "polygon",
                "coords": [cx + side * rx * 0.6, cy - ry * 0.4,
                           cx + side * (rx * 1.1), cy - ry * 0.9 - flap,
                           cx + side * rx * 0.85, cy + ry * 0.1],
                "fill": palette["accent"],
            })
        # Curling tail under the wings.
        _draw_tail(out, cx, cy, rx, ry, tail_angle, unit, palette)
    if plan == "avian":
        # Folded wing on the body side, fanning with sway.
        fan = (tail_angle - 0.4) * 10.0 * unit
        out.append({
            "kind": "polygon",
            "coords": [cx - rx * 0.7, cy - ry * 0.2,
                       cx - rx * 1.05, cy + ry * 0.15 + fan,
                       cx - rx * 0.55, cy + ry * 0.45],
            "fill": palette["accent"],
        })
    if plan in ("blob", "quadruped"):
        _draw_ears(out, cx, cy, rx, ry, ear_tilt, unit, palette,
                   tall=(plan == "quadruped"))
    if plan == "avian":
        # Crest feathers on the crown.
        for i, dx in enumerate((-10.0, 0.0, 10.0)):
            out.append({
                "kind": "line",
                "coords": [cx + dx * unit, cy - ry * 1.0,
                           cx + (dx + ear_tilt * 30.0 + (i - 1) * 4.0) * unit,
                           cy - ry * 1.0 - 12.0 * unit],
                "fill": palette["accent"], "width": 3.5 * unit,
            })
    if plan == "winged":
        # Moth antennae nubs.
        for side in (-1.0, 1.0):
            out.append({
                "kind": "line",
                "coords": [cx + side * rx * 0.25, cy - ry * 0.95,
                           cx + side * rx * 0.4, cy - ry * 1.2],
                "fill": palette["accent"], "width": 3.0 * unit,
            })
    if plan == "robot":
        # Side bolts instead of ears.
        for side in (-1.0, 1.0):
            out.append({
                "kind": "circle",
                "coords": [cx + side * rx * 1.02 - 5.0 * unit, cy - 5.0 * unit,
                           cx + side * rx * 1.02 + 5.0 * unit, cy + 5.0 * unit],
                "fill": palette["accent"],
            })
    # Body.
    out.append({
        "kind": "oval",
        "coords": [cx - rx, cy - ry, cx + rx, cy + ry],
        "fill": palette["body"],
    })
    # Belly patch.
    out.append({
        "kind": "oval",
        "coords": [cx - rx * 0.45, cy - ry * 0.1, cx + rx * 0.45, cy + ry * 0.72],
        "fill": palette["belly"],
    })
    if plan == "slime":
        # Glossy highlight on the dome.
        out.append({
            "kind": "circle",
            "coords": [cx - rx * 0.55, cy - ry * 0.75,
                       cx - rx * 0.15, cy - ry * 0.35],
            "fill": "#ffffff",
        })
    if plan == "robot":
        # Chest status light breathing with the pose breath channel.
        glow = 4.0 * unit + max(0.0, _clamp(pose.breath, -1.0, 1.0)) * 2.0 * unit
        out.append({
            "kind": "circle",
            "coords": [cx - glow, cy + ry * 0.35 - glow,
                       cx + glow, cy + ry * 0.35 + glow],
            "fill": palette["accent"],
        })
        # Panel seams across the chassis.
        out.append({
            "kind": "line",
            "coords": [cx - rx * 0.8, cy - ry * 0.55, cx + rx * 0.8, cy - ry * 0.55],
            "fill": palette["belly"], "width": 2.0 * unit,
        })
    if plan == "avian":
        # Beak over the belly patch top.
        out.append({
            "kind": "polygon",
            "coords": [cx - 7.0 * unit, cy + ry * 0.12,
                       cx + 7.0 * unit, cy + ry * 0.12,
                       cx, cy + ry * 0.3],
            "fill": palette["accent"],
        })
    if plan == "winged":
        # Crescent moon mark on the forehead.
        out.append({
            "kind": "arc",
            "coords": [cx - 8.0 * unit, cy - ry * 0.62,
                       cx + 8.0 * unit, cy - ry * 0.30],
            "fill": palette["accent"], "width": 2.5 * unit,
        })
    _draw_eyes(out, cx, cy, rx, ry, eye_open, pupil_dx, pupil_dy, unit,
               visor="#3C4043" if plan == "robot" else None)
    _draw_blush(out, cx, cy, rx, ry, blush, unit)
    _draw_mouth(out, cx, cy + ry * 0.38, pose.mouth, unit)
    _draw_sleep_markers(out, cx, cy, pose.mouth, unit)
    return out


def render_character(character_id: object, activity: object,
                     phase: object = 0.0, size: float = CANVAS_BOX) -> list[dict]:
    """Convenience: pose plus shapes for a character in one call."""
    slug = normalize_character(character_id)
    return shapes(pose_for(activity, phase, slug), size=size,
                  character_id=slug)


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
