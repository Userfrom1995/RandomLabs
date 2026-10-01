"""Window and behavior settings (no GUI imports allowed here).

AppSettings is the persisted user configuration for the on-screen
companion: behavior toggles, the bedtime routine window, transparency,
always-on-top, and window scale. Storage mirrors pet_core persistence:
atomic JSON write plus rename, corrupt-file fail-closed to defaults
with a .bak backup. All validation clamps safe ranges and raises
ValueError on wrongly typed toggles so a damaged file never silently
applies half a configuration.
"""

from __future__ import annotations

import json
import os
import tempfile

from . import platform as platform_mod

SETTINGS_FILENAME = "settings.json"
SETTINGS_SCHEMA_VERSION = 1

DEFAULT_BEDTIME_HOUR = 22.0
DEFAULT_WAKE_HOUR = 7.0


def _clean_bool(value: object, field: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and value in (0, 1):
        return bool(value)
    raise ValueError("%s must be true or false, got %r" % (field, value))


def _clean_hour(value: object, fallback: float) -> float:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return fallback
    if number != number:  # NaN
        return fallback
    return number % 24.0


class AppSettings:
    """Persisted companion configuration with validated fields."""

    def __init__(
        self,
        wander: object = True,
        play_invites: object = True,
        sleep_schedule: object = True,
        dialogue: object = True,
        topmost: object = True,
        alpha: object = 1.0,
        scale: object = 1.0,
        bedtime: object = DEFAULT_BEDTIME_HOUR,
        wake: object = DEFAULT_WAKE_HOUR,
    ) -> None:
        self.wander = _clean_bool(wander, "wander")
        self.play_invites = _clean_bool(play_invites, "play_invites")
        self.sleep_schedule = _clean_bool(sleep_schedule, "sleep_schedule")
        self.dialogue = _clean_bool(dialogue, "dialogue")
        self.topmost = _clean_bool(topmost, "topmost")
        self.alpha = platform_mod.clamp_alpha(alpha)
        self.scale = platform_mod.clamp_scale(scale)
        self.bedtime = _clean_hour(bedtime, DEFAULT_BEDTIME_HOUR)
        self.wake = _clean_hour(wake, DEFAULT_WAKE_HOUR)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, AppSettings):
            return NotImplemented
        return self.to_dict() == other.to_dict()

    def __repr__(self) -> str:
        return "AppSettings(%r)" % (self.to_dict(),)

    def to_dict(self) -> dict:
        return {
            "schema_version": SETTINGS_SCHEMA_VERSION,
            "wander": self.wander,
            "play_invites": self.play_invites,
            "sleep_schedule": self.sleep_schedule,
            "dialogue": self.dialogue,
            "topmost": self.topmost,
            "alpha": self.alpha,
            "scale": self.scale,
            "bedtime": self.bedtime,
            "wake": self.wake,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "AppSettings":
        """Build settings from parsed JSON, validating toggle types.

        Raises ValueError on unknown schema versions or wrongly typed
        toggles so the loader can fail closed to defaults with a backup.
        Unknown keys are ignored for forward compatibility; numeric
        fields clamp instead of raising.
        """
        if not isinstance(data, dict):
            raise ValueError("settings data must be a JSON object")
        version = data.get("schema_version", SETTINGS_SCHEMA_VERSION)
        if version != SETTINGS_SCHEMA_VERSION:
            raise ValueError("unsupported settings version: %r" % (version,))
        return cls(
            wander=data.get("wander", True),
            play_invites=data.get("play_invites", True),
            sleep_schedule=data.get("sleep_schedule", True),
            dialogue=data.get("dialogue", True),
            topmost=data.get("topmost", True),
            alpha=data.get("alpha", 1.0),
            scale=data.get("scale", 1.0),
            bedtime=data.get("bedtime", DEFAULT_BEDTIME_HOUR),
            wake=data.get("wake", DEFAULT_WAKE_HOUR),
        )

    def describe(self) -> str:
        """One screen of human-readable settings for the CLI and dialog."""
        lines = [
            "wander=%s" % ("on" if self.wander else "off"),
            "play_invites=%s" % ("on" if self.play_invites else "off"),
            "sleep_schedule=%s" % ("on" if self.sleep_schedule else "off"),
            "dialogue=%s" % ("on" if self.dialogue else "off"),
            "topmost=%s" % ("on" if self.topmost else "off"),
            "alpha=%.2f" % self.alpha,
            "scale=%.2f" % self.scale,
            "bedtime=%02d:%02d" % _clock_parts(self.bedtime),
            "wake=%02d:%02d" % _clock_parts(self.wake),
        ]
        return "\n".join(lines)


def _clock_parts(hour: float) -> tuple[int, int]:
    total = int(round((hour % 24.0) * 60.0)) % (24 * 60)
    return (total // 60, total % 60)


def format_clock(hour: float) -> str:
    """Format a 0..24 hour as HH:MM for the dialog and CLI."""
    parts = _clock_parts(float(hour) % 24.0)
    return "%02d:%02d" % parts


def parse_clock(raw: str) -> float:
    """Parse HH:MM (24 h) or a bare hour into a 0..24 hour value.

    Raises ValueError on anything unparsable or out of range.
    """
    text = str(raw or "").strip()
    if not text:
        raise ValueError("time must look like HH:MM, got %r" % (raw,))
    if ":" in text:
        pieces = text.split(":")
        if len(pieces) != 2:
            raise ValueError("time must look like HH:MM, got %r" % (raw,))
        try:
            hour = int(pieces[0].strip())
            minute = int(pieces[1].strip())
        except (TypeError, ValueError):
            raise ValueError("time must look like HH:MM, got %r" % (raw,))
    else:
        try:
            hour = int(text)
        except (TypeError, ValueError):
            raise ValueError("time must look like HH:MM, got %r" % (raw,))
        minute = 0
    if not 0 <= hour <= 23:
        raise ValueError("hour must be 0..23, got %r" % (raw,))
    if not 0 <= minute <= 59:
        raise ValueError("minute must be 0..59, got %r" % (raw,))
    return (float(hour) + float(minute) / 60.0) % 24.0


SETTABLE_FIELDS = (
    "wander",
    "play_invites",
    "sleep_schedule",
    "dialogue",
    "topmost",
    "alpha",
    "scale",
    "bedtime",
    "wake",
)


def parse_setting_value(field: str, raw: str) -> object:
    """Parse a CLI `field=value` string into a typed setting value.

    Raises ValueError on unknown fields or unparsable values.
    """
    if field not in SETTABLE_FIELDS:
        raise ValueError("unknown setting %r (one of: %s)" % (
            field, ", ".join(SETTABLE_FIELDS)))
    if field in ("wander", "play_invites", "sleep_schedule",
                 "dialogue", "topmost"):
        text = raw.strip().lower()
        if text in ("1", "true", "yes", "on"):
            return True
        if text in ("0", "false", "no", "off"):
            return False
        raise ValueError("%s must be on/off or true/false, got %r" % (
            field, raw))
    try:
        return float(raw)
    except (TypeError, ValueError):
        raise ValueError("%s must be a number, got %r" % (field, raw))


def with_field(settings: AppSettings, field: str, value: object) -> AppSettings:
    """Return a copy of settings with one field replaced (validated)."""
    if field not in SETTABLE_FIELDS:
        raise ValueError("unknown setting %r" % (field,))
    data = settings.to_dict()
    data[field] = value
    return AppSettings.from_dict(data)


def default_settings_path(data_dir: str | None = None) -> str:
    """Settings file path (override dir for tests via DESKTOP_PET_DATA_DIR)."""
    if data_dir is None:
        override = os.environ.get("DESKTOP_PET_DATA_DIR")
        if override:
            data_dir = override
        else:
            from ..pet_core.persistence import default_dir
            data_dir = default_dir()
    return os.path.join(data_dir, SETTINGS_FILENAME)


def backup_path_for(path: str) -> str:
    return path + ".bak"


def save_settings(settings: AppSettings, path: str | None = None) -> str:
    """Atomically write settings JSON (tmp file plus rename)."""
    target = path or default_settings_path()
    parent = os.path.dirname(os.path.abspath(target))
    os.makedirs(parent, exist_ok=True)
    payload = json.dumps(settings.to_dict(), indent=2, sort_keys=True)
    fd, tmp = tempfile.mkstemp(prefix=".settings-", suffix=".tmp", dir=parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
        os.replace(tmp, target)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    return target


def load_settings(path: str | None = None) -> tuple[AppSettings, str | None]:
    """Load settings, failing closed to defaults.

    Returns (settings, notice). notice is None on a clean load,
    otherwise a short human-readable explanation.
    """
    target = path or default_settings_path()
    if not os.path.exists(target):
        return AppSettings(), "no settings file yet, using defaults"
    try:
        with open(target, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        settings = AppSettings.from_dict(data)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        backup = backup_path_for(target)
        try:
            with open(target, "rb") as src, open(backup, "wb") as dst:
                dst.write(src.read())
            note = ("settings file was corrupt (%s); "
                    "backed up and restored defaults" % type(exc).__name__)
        except OSError:
            note = ("settings file was corrupt (%s); "
                    "restored defaults" % type(exc).__name__)
        return AppSettings(), note
    return settings, None
