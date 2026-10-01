"""Atomic JSON persistence with corrupt-file fail-closed recovery."""

from __future__ import annotations

import json
import os
import sys
import tempfile

from .state import PetState

APP_DIR_WINDOWS = "DesktopPet"
APP_DIR_MACOS = "DesktopPet"
APP_DIR_LINUX = "desktop-pet"
SAVE_FILENAME = "pet.json"


def default_dir() -> str:
    """Platform user-data dir (override with DESKTOP_PET_DATA_DIR)."""
    override = os.environ.get("DESKTOP_PET_DATA_DIR")
    if override:
        return override
    if sys.platform == "win32":
        base = os.environ.get("APPDATA") or os.path.expanduser("~")
        return os.path.join(base, APP_DIR_WINDOWS)
    if sys.platform == "darwin":
        return os.path.join(
            os.path.expanduser("~"), "Library", "Application Support", APP_DIR_MACOS
        )
    base = os.environ.get("XDG_DATA_HOME") or os.path.join(
        os.path.expanduser("~"), ".local", "share"
    )
    return os.path.join(base, APP_DIR_LINUX)


def default_save_path() -> str:
    return os.path.join(default_dir(), SAVE_FILENAME)


def backup_path_for(path: str) -> str:
    return path + ".bak"


def save(state: PetState, path: str | None = None) -> str:
    """Atomically write state JSON (tmp file plus rename). Returns path used."""
    target = path or default_save_path()
    parent = os.path.dirname(os.path.abspath(target))
    os.makedirs(parent, exist_ok=True)
    payload = json.dumps(state.to_dict(), indent=2, sort_keys=True)
    fd, tmp = tempfile.mkstemp(prefix=".pet-", suffix=".tmp", dir=parent)
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


def load(path: str | None = None) -> tuple[PetState, str | None]:
    """Load state, failing closed to defaults.

    Returns (state, notice). notice is None on a clean load, otherwise a
    short human-readable explanation (missing file, backup written).
    """
    target = path or default_save_path()
    if not os.path.exists(target):
        return PetState(), "no save file yet, starting fresh"
    try:
        with open(target, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        state = PetState.from_dict(data)
        if isinstance(data, dict) and data.get("schema_version", 1) == 1:
            return state, "migrated save schema v1 to v2 (character: %s)" % state.character_id
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        backup = backup_path_for(target)
        try:
            with open(target, "rb") as src, open(backup, "wb") as dst:
                dst.write(src.read())
            note = "save file was corrupt (%s); backed up and started fresh" % type(
                exc
            ).__name__
        except OSError:
            note = "save file was corrupt (%s); started fresh" % type(exc).__name__
        return PetState(), note
    # Sync the live pet name into a fresh-state default only; the brain
    # owns renaming from here.
    return state, None
