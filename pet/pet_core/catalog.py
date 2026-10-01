"""Character catalog registry (stdlib only, no GUI imports).

Built-in cast of six originals plus a merge hook for third-party
creator packs: built-ins always win on slug collision, with a
notice, and unknown ids fall back to Pip with a notice, never a
traceback. Every record is plain data so the sprite engine, voices, and
docs can all render the same source of truth.
"""

from __future__ import annotations

import re

from . import traits as traits_mod

BODY_PLANS = ("blob", "quadruped", "slime", "avian", "robot", "winged")

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
_HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

CHARACTERS: dict[str, dict] = {
    "pip": {
        "id": "pip",
        "name": "Pip",
        "species": "blob-cat",
        "body_plan": "blob",
        "tagline": "The balanced baseline. Curious, warm, up for anything.",
        "temperament": "balanced",
        "palette": {"body": "#7FB5D5", "belly": "#F2E8CF", "accent": "#E07A5F"},
        "signature": "Sniffing the pixels. For science.",
    },
    "bramble": {
        "id": "bramble",
        "name": "Bramble",
        "species": "fox",
        "body_plan": "quadruped",
        "tagline": "Playful and fast, affection-hungry, always mid-zoomies.",
        "temperament": "playful",
        "palette": {"body": "#D98E4A", "belly": "#FAF0DC", "accent": "#8C3B1B"},
        "signature": "Ball! BALL! Bramble is READY!",
    },
    "mochi": {
        "id": "mochi",
        "name": "Mochi",
        "species": "slime",
        "body_plan": "slime",
        "tagline": "Sleepy and slow, cuddle-positive, purrs longer.",
        "temperament": "sleepy",
        "palette": {"body": "#A8D5BA", "belly": "#EFF7E8", "accent": "#5B8C5A"},
        "signature": "Mochi melts into a warm puddle.",
    },
    "kiki": {
        "id": "kiki",
        "name": "Kiki",
        "species": "sparrow",
        "body_plan": "avian",
        "tagline": "Curious darting walker, chatters at everything.",
        "temperament": "curious",
        "palette": {"body": "#F4D35E", "belly": "#FFF8E1", "accent": "#38618C"},
        "signature": "Ooh, a cursor. Suspicious. Fascinating.",
    },
    "rusty": {
        "id": "rusty",
        "name": "Rusty",
        "species": "robot",
        "body_plan": "robot",
        "tagline": "Literal, grumpy-cute, poke-tolerant. Beep.",
        "temperament": "grumpy-cute",
        "palette": {"body": "#9AA0A6", "belly": "#3C4043", "accent": "#F2B705"},
        "signature": "Booting cuteness... Rusty is UP. Mostly.",
    },
    "luna": {
        "id": "luna",
        "name": "Luna",
        "species": "moth-dragon",
        "body_plan": "winged",
        "tagline": "Nocturnal drifter, night antics, moonlit naps.",
        "temperament": "nocturnal",
        "palette": {"body": "#7B6FD0", "belly": "#E6E1FF", "accent": "#F2E394"},
        "signature": "Luna drifts off under a paper moon. Zzz.",
    },
}

FALLBACK_ID = "pip"


def _record(character_id: str) -> dict:
    base = dict(CHARACTERS[character_id])
    base["palette"] = dict(CHARACTERS[character_id]["palette"])
    base["traits"] = traits_mod.rates_for(character_id)
    return base


def normalize_id(character_id: object) -> str:
    """Map any value to a known catalog id, falling back to Pip."""
    if isinstance(character_id, str):
        slug = character_id.strip().lower()
        if slug in CHARACTERS:
            return slug
    return FALLBACK_ID


def get(character_id: object,
        extra: dict[str, dict] | None = None) -> tuple[dict, str | None]:
    """Return (record, notice) for an id, merging optional pack entries.

    Built-ins win on slug collision (notice explains). Unknown ids fall
    back to Pip with a notice, never a traceback.
    """
    if isinstance(character_id, str):
        slug = character_id.strip().lower()
    else:
        slug = ""
    if slug in CHARACTERS:
        return _record(slug), None
    if extra and slug and slug in extra:
        try:
            validate_record(extra[slug])
            rec = dict(extra[slug])
            rec.setdefault("species", rec.get("name", slug))
            rec.setdefault("tagline", "")
            rec.setdefault("signature", "")
            rec.setdefault("traits", traits_mod.rates_for(FALLBACK_ID))
            return rec, None
        except ValueError as exc:
            return _record(FALLBACK_ID), (
                "pack character %r invalid (%s); using Pip" % (slug, exc))
    return _record(FALLBACK_ID), (
        "unknown character %r; using Pip" % (character_id,))


def list_characters(extra: dict[str, dict] | None = None) -> list[dict]:
    """List built-in records merged with optional pack records by slug."""
    records = [_record(cid) for cid in CHARACTERS]
    if extra:
        for slug in sorted(extra):
            if slug in CHARACTERS:
                continue
            try:
                validate_record(extra[slug])
            except ValueError:
                continue
            rec = dict(extra[slug])
            rec.setdefault("species", rec.get("name", slug))
            rec.setdefault("tagline", "")
            rec.setdefault("signature", "")
            rec.setdefault("traits", traits_mod.rates_for(FALLBACK_ID))
            records.append(rec)
    return records


def validate_record(record: object) -> None:
    """Validate a catalog record (built-in or third-party). Raises ValueError."""
    if not isinstance(record, dict):
        raise ValueError("record must be an object")
    slug = record.get("id", "")
    if not isinstance(slug, str) or not _SLUG_RE.match(slug.strip().lower()):
        raise ValueError("id must be a lowercase slug")
    name = record.get("name", "")
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 24:
        raise ValueError("name must be 1..24 characters")
    if record.get("body_plan") not in BODY_PLANS:
        raise ValueError("body_plan must be one of %s" % ("/".join(BODY_PLANS),))
    palette = record.get("palette")
    if not isinstance(palette, dict) or not palette:
        raise ValueError("palette must be a non-empty object")
    for key, value in palette.items():
        if not isinstance(value, str) or not _HEX_RE.match(value):
            raise ValueError("palette %r must be #RRGGBB" % (key,))
    for key in ("tagline", "signature"):
        if key in record and not isinstance(record[key], str):
            raise ValueError("%s must be a string" % key)
