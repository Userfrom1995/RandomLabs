"""Persistent player config: binds, theme, flash, audio, fps, mode, name.

Stored as JSON at ``$XDG_CONFIG_HOME/pacman-terminal/config.json``
(``~/.config`` fallback), overridable with ``PACMAN_CONFIG_FILE``. Every
value is validated on load: unknown themes/modes, out-of-range fps, bad
audio names, and illegal key chars fall back to defaults field by field,
so a hand-edited file can never break the game.
"""

import json
import os

ENV_OVERRIDE = "PACMAN_CONFIG_FILE"
AUDIO_CHOICES = ("auto", "null", "bell", "synth")

DEFAULTS = {
    "binds": {},
    "theme": "classic",
    "reduced_flash": False,
    "audio": "auto",
    "fps": 30,
    "mode": "classic",
    "level": 1,
    "name": "ACE",
    "scale": "auto",
    "effects": True,
    "version": 2,
}

SCALE_CHOICES = ("auto", "classic", "wide", "full")


def default_path():
    if ENV_OVERRIDE in os.environ and os.environ[ENV_OVERRIDE]:
        return os.environ[ENV_OVERRIDE]
    base = os.environ.get("XDG_CONFIG_HOME") or os.path.join(
        os.path.expanduser("~"), ".config")
    return os.path.join(base, "pacman-terminal", "config.json")


def _clean_binds(raw):
    from shell.input import ACTIONS, Keymap
    if not isinstance(raw, dict):
        return {}
    cleaned = {}
    for action, chars in raw.items():
        if action not in ACTIONS:
            continue
        if isinstance(chars, str):
            chars = [chars]
        if not isinstance(chars, list):
            continue
        try:
            Keymap._check_chars(action, [c for c in chars if isinstance(c, str)])
        except ValueError:
            continue
        cleaned[action] = [c for c in chars if isinstance(c, str)]
    # Reject duplicate chars across actions, like Keymap does.
    seen = set()
    for action in list(cleaned):
        kept = []
        for ch in cleaned[action]:
            if ch not in seen:
                seen.add(ch)
                kept.append(ch)
        if kept:
            cleaned[action] = kept
        else:
            del cleaned[action]
    return cleaned


class Config:
    """Validated settings dict with JSON persistence."""

    def __init__(self, path=None, values=None):
        self.path = path or default_path()
        self.values = dict(DEFAULTS)
        if values is not None:
            self.update(values)
        else:
            self.load()

    def load(self):
        try:
            with open(self.path, "r", encoding="utf-8") as handle:
                raw = json.load(handle)
        except (OSError, ValueError):
            return False
        if isinstance(raw, dict):
            self.update(raw)
            return True
        return False

    def update(self, raw):
        from engine import modes
        from render import scale as scale_mod
        from render import themes
        from shell.scores import clean_name
        if not isinstance(raw, dict):
            return
        if "binds" in raw:
            self.values["binds"] = _clean_binds(raw["binds"])
        if "theme" in raw:
            try:
                self.values["theme"] = themes.check(str(raw["theme"]))
            except ValueError:
                self.values["theme"] = DEFAULTS["theme"]
        if "reduced_flash" in raw:
            self.values["reduced_flash"] = bool(raw["reduced_flash"])
        if "audio" in raw:
            audio = str(raw["audio"]).strip().lower()
            self.values["audio"] = audio if audio in AUDIO_CHOICES else DEFAULTS["audio"]
        if "fps" in raw:
            try:
                fps = int(raw["fps"])
            except (TypeError, ValueError):
                fps = DEFAULTS["fps"]
            self.values["fps"] = min(240, max(1, fps))
        if "mode" in raw:
            try:
                self.values["mode"] = modes.check(str(raw["mode"]))
            except ValueError:
                self.values["mode"] = DEFAULTS["mode"]
        if "name" in raw:
            self.values["name"] = clean_name(raw["name"])
        if "level" in raw:
            try:
                number = int(str(raw["level"]).strip())
            except (TypeError, ValueError):
                number = DEFAULTS["level"]
            self.values["level"] = max(1, number)
        if "scale" in raw:
            mode = str(raw["scale"]).strip().lower()
            self.values["scale"] = mode if mode in SCALE_CHOICES else DEFAULTS["scale"]
        if "effects" in raw:
            self.values["effects"] = bool(raw["effects"])
        if "version" in raw:
            try:
                self.values["version"] = max(1, int(raw["version"]))
            except (TypeError, ValueError):
                self.values["version"] = DEFAULTS["version"]

    def save(self):
        try:
            parent = os.path.dirname(self.path)
            if parent:
                os.makedirs(parent, exist_ok=True)
            with open(self.path, "w", encoding="utf-8") as handle:
                json.dump(self.values, handle, indent=2)
            return True
        except OSError:
            return False
